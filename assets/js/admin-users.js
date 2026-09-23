document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const tbody = document.getElementById('admin-users-body');
    const searchInput = document.getElementById('search-users');
    const modal = document.getElementById('user-modal');
    
    let allUsers = [];
    let currentUser = null;

    // --- ACCORDION UI LOGIC ---
    window.toggleAccordion = function(id) {
        const item = document.getElementById(id);
        const isActive = item.classList.contains('active');
        
        // Close all other accordions first
        document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));
        
        // Open the clicked one if it wasn't already open
        if (!isActive) item.classList.add('active');
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    }

    function renderUsers(users) {
        tbody.innerHTML = '';
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8; font-size: 0.75rem;">No users found.</td></tr>';
            return;
        }

        users.forEach(user => {
            const tr = document.createElement('tr');
            
            // Note: Added data-label for mobile view mapping
            tr.innerHTML = `
                <td data-label="User">
                    <div class="user-col">
                        <span class="user-name">${user.full_name || 'Unregistered User'}</span>
                        <span class="user-email">${user.email}</span>
                        ${user.is_suspended ? '<span class="status-badge badge-suspended" style="margin-top:4px;">Suspended</span>' : ''}
                    </div>
                </td>
                <td data-label="Account ID"><span class="acc-id">${user.account_id || 'N/A'}</span></td>
                <td data-label="Balance"><span class="balance-text">${formatCurrency(user.wallet_balance)}</span></td>
            `;

            tr.addEventListener('click', () => {
                currentUser = user;
                document.getElementById('m-name').textContent = user.full_name || 'User Profile';
                document.getElementById('m-email').textContent = user.email;
                document.getElementById('wallet-amount').value = '';
                document.getElementById('wallet-pin').value = '';
                document.getElementById('admin-pin').value = '';
                
                // Reset Accordions (Close all)
                document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));
                
                // Configure Suspend Button
                const susBtn = document.getElementById('btn-toggle-suspend');
                susBtn.textContent = user.is_suspended ? 'Unsuspend Account' : 'Suspend Account';
                susBtn.className = user.is_suspended ? 'btn-action btn-primary' : 'btn-action btn-danger';
                
                modal.style.display = 'flex';
                
                // Fetch Recent Transactions
                loadUserTransactions(user.user_id);
            });
            tbody.appendChild(tr);
        });
    }

    async function loadUserTransactions(userId) {
        const txList = document.getElementById('tx-list');
        txList.innerHTML = '<span style="color: #64748b; font-size: 0.75rem;">Loading transactions...</span>';

        try {
            const { data, error } = await window.db.rpc('admin_get_user_transactions', { p_user_id: userId });
            if (error) throw error;

            if (!data || data.length === 0) {
                txList.innerHTML = '<span style="color: #64748b; font-size: 0.75rem;">No recent transactions.</span>';
                return;
            }

            txList.innerHTML = data.map(tx => {
                const date = new Date(tx.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
                return `
                    <div class="tx-item">
                        <div>
                            <div class="tx-name">${tx.service_type.replace('_', ' ')}</div>
                            <div class="tx-date">${date} &bull; ${tx.status}</div>
                        </div>
                        <div class="tx-amount">${formatCurrency(tx.amount)}</div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            txList.innerHTML = '<span style="color: #ef4444; font-size: 0.75rem;">Failed to load history.</span>';
        }
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = allUsers.filter(u => 
            (u.email && u.email.toLowerCase().includes(query)) || 
            (u.account_id && u.account_id.toLowerCase().includes(query)) ||
            (u.full_name && u.full_name.toLowerCase().includes(query))
        );
        renderUsers(filtered);
    });

    async function loadUsers() {
        try {
            const { data, error } = await window.db.rpc('admin_get_all_users');
            if (error) throw error;
            allUsers = data || [];
            renderUsers(allUsers);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="3" style="color: #b91c1c; text-align:center; padding: 20px; font-size: 0.75rem;">Error loading users.</td></tr>`;
        }
    }

    // --- SECURE ACTION: ADJUST WALLET ---
    document.getElementById('btn-submit-wallet').addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('wallet-amount').value);
        const actionType = document.getElementById('wallet-action').value.toLowerCase();
        const pin = document.getElementById('wallet-pin').value;

        if (!amount || amount <= 0) return alert('Enter a valid amount.');
        if (!pin) return alert('Master PIN is required.');

        document.getElementById('btn-submit-wallet').textContent = "Processing...";

        try {
            const { error } = await window.db.rpc('admin_adjust_wallet', {
                p_user_id: currentUser.user_id,
                p_amount: amount,
                p_type: actionType,
                p_pin: pin
            });

            if (error) throw error;
            
            alert('Wallet updated successfully!');
            modal.style.display = 'none';
            loadUsers();
        } catch (err) {
            alert(err.message);
        } finally {
            document.getElementById('btn-submit-wallet').textContent = "Confirm Transaction";
        }
    });

    // --- SECURE ACTION: MAKE ADMIN ---
    document.getElementById('btn-make-admin').addEventListener('click', async () => {
        const pin = document.getElementById('admin-pin').value;
        if (!pin) return alert('Master PIN is required to promote admins.');

        document.getElementById('btn-make-admin').textContent = "Verifying...";

        try {
            const { error } = await window.db.rpc('admin_promote_user', { p_email: currentUser.email, p_pin: pin });
            if (error) throw error;
            
            alert(`${currentUser.email} is now an Admin!`);
            modal.style.display = 'none';
        } catch (err) {
            alert(err.message);
        } finally {
            document.getElementById('btn-make-admin').textContent = "Grant Admin Access";
        }
    });

    // --- 🚀 NEW SECURE ACTION: SUSPEND USER ---
    document.getElementById('btn-toggle-suspend').addEventListener('click', async () => {
        try {
            // Using the secure Postgres function instead of a direct table update
            const { data: newStatus, error } = await window.db.rpc('admin_toggle_suspend', { 
                p_user_id: currentUser.user_id 
            });
            
            if (error) throw error;
            
            alert(`Account ${newStatus ? 'Suspended' : 'Unsuspended'} successfully.`);
            modal.style.display = 'none';
            loadUsers(); // Refresh the table to show the new status badge
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    });

    loadUsers();
});