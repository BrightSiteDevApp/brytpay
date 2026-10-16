document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }
    
    // 🚀 SMART BACK BUTTON ROUTING
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/';
            backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Orders Hub`;
        } else {
            backBtn.href = '/dashboard/education/';
            backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Education PINs`;
        }
    }

    const container = document.getElementById('orders-container');

    // Load Transactions that contain PIN Details
    async function loadPINOrders() {
        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'successful')
            .like('admin_notes', '%PIN Details%')
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.9rem; font-weight: 600;">No Education PINs found.</div>`;
            return;
        }

        container.innerHTML = '';

        data.forEach(tx => {
            const txStr = JSON.stringify(tx).toLowerCase();
            let examType = 'waec';
            if (txStr.includes('neco')) examType = 'neco';
            if (txStr.includes('nabteb')) examType = 'nabteb';

            const dateObj = new Date(tx.created_at);
            const dateStr = dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
            
            // Format Reference
            const refClean = tx.reference || tx.external_reference || tx.id.slice(0,8).toUpperCase();

            // Link wrapper transforms the entire row into a clickable button leading to the specific ID
            container.innerHTML += `
                <a href="order-details.html?id=${tx.id}" class="tx-row">
                    <div class="tx-left">
                        <div class="tx-brand">
                            <img src="../../assets/img/${examType}-logo.png" alt="${examType.toUpperCase()}" onerror="this.src='../../assets/img/brytpay-logo.png'">
                        </div>
                        <div class="tx-info">
                            <div class="tx-title">${examType.toUpperCase()} Result Checker</div>
                            <div class="tx-date">${dateStr} • Ref: ${refClean.length > 15 ? refClean.slice(0,8)+'...' : refClean}</div>
                        </div>
                    </div>
                    <div class="tx-right">
                        <div class="tx-amount">₦${parseFloat(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                        <span class="tx-status status-successful">Completed</span>
                    </div>
                </a>
            `;
        });
    }

    await loadPINOrders();
});