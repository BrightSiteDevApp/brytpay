document.addEventListener('DOMContentLoaded', async () => {
    // 1. Route Protection
    const { data: { session }, error: sessionError } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = '/auth/login.html'; 
        return;
    }
    
    const user = session.user;
    let currentBalance = 0;

    // 2. Set Dynamic Time Greeting
    const hour = new Date().getHours();
    const greetingTime = document.getElementById('greeting-time');
    if (greetingTime) {
        if (hour < 12) greetingTime.textContent = 'Good morning,';
        else if (hour < 18) greetingTime.textContent = 'Good afternoon,';
        else greetingTime.textContent = 'Good evening,';
    }

    // 3. Fetch Profile Name
    async function loadProfile() {
        const { data } = await window.db.from('profiles').select('full_name').eq('id', user.id).single();
        const greetingEl = document.getElementById('user-greeting');
        if (greetingEl) {
            greetingEl.textContent = (data && data.full_name) ? data.full_name.split(' ')[0] : "User";
        }
    }

    // 4. Fetch Wallet Balance
    async function loadWallet() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            updateBalanceUI(isBalanceHidden);
        }
    }

    // 5. Format Currency securely
    function formatCurrency(amount) {
        return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // 6. Handle Balance Visibility Toggle
    let isBalanceHidden = false;
    const toggleBtn = document.getElementById('toggle-balance');
    const balanceAmount = document.getElementById('balance-amount');
    const balanceCurrency = document.getElementById('balance-currency');

    function updateBalanceUI(hidden) {
        if (!balanceAmount) return;
        if (hidden) {
            balanceAmount.textContent = '••••••••';
            if (balanceCurrency) balanceCurrency.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = 'Show';
        } else {
            balanceAmount.textContent = formatCurrency(currentBalance);
            if (balanceCurrency) balanceCurrency.style.display = 'inline';
            if (toggleBtn) toggleBtn.textContent = 'Hide';
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isBalanceHidden = !isBalanceHidden;
            updateBalanceUI(isBalanceHidden);
        });
    }

    const isCreditTx = (tx) => {
        const s = (tx.service_type || '').toLowerCase();
        const p = (tx.provider || tx.recipient || '').toLowerCase();
        const t = (tx.type || '').toLowerCase();

        return t === 'credit' || 
               s.includes('fund') || s.includes('deposit') || s.includes('topup') ||
               p.includes('paystack') || p.includes('flutterwave') || p.includes('topup');
    };

    const formatRef = (ref) => {
        if (!ref) return 'N/A';
        if (ref.length > 18) return `${ref.slice(0, 7)}...${ref.slice(-6)}`;
        return ref;
    };

    const getCleanTitle = (tx) => {
        if (isCreditTx(tx)) return 'WALLET FUNDING';
        const raw = `${tx.service_type || ''} ${tx.recipient || ''} ${tx.provider || ''}`.toUpperCase();

        if (raw.includes('CBT') || raw.includes('BRYT_CBT')) return 'BRYT CBT SIM PAYMENT';
        if (raw.includes('DGM') || raw.includes('BRYT_DGM')) return 'BRYT DGM PAYMENT';
        if (raw.includes('JAMB')) return 'JAMB SERVICE';
        if (raw.includes('WAEC') || raw.includes('NECO') || raw.includes('NABTEB')) return 'EXAM PIN PURCHASE';
        if (raw.includes('AIRTIME')) {
            const net = (tx.network_or_operator || tx.provider || '').replace(/vtpass/gi, '').trim().toUpperCase();
            return net ? `${net} AIRTIME` : 'AIRTIME TOPUP';
        }
        if (raw.includes('DATA')) {
            const net = (tx.network_or_operator || tx.provider || '').replace(/vtpass/gi, '').replace('-sme', ' SME').trim().toUpperCase();
            return net ? `${net} DATA` : 'DATA BUNDLE';
        }

        let clean = (tx.recipient || tx.service_type || 'PAYMENT')
            .replace(/vtpass/gi, '')
            .replace(/external_checkout/gi, '')
            .replace(/[:\-_]/g, ' ')
            .trim()
            .toUpperCase();

        return clean || 'PAYMENT';
    };

    const getTransactionIcon = (tx) => {
        const raw = `${tx.service_type || ''} ${tx.recipient || ''} ${tx.provider || ''}`.toLowerCase();

        let logoFile = null;
        if (raw.includes('cbt')) logoFile = 'brytcbtsim-logo.png';
        else if (raw.includes('dgm')) logoFile = 'brytdgm-logo.png';
        else if (raw.includes('mtn')) logoFile = 'mtn-logo.png';
        else if (raw.includes('airtel')) logoFile = 'airtel-logo.png';
        else if (raw.includes('glo')) logoFile = 'glo-logo.png';
        else if (raw.includes('9mobile')) logoFile = '9mob-logo.png';
        else if (raw.includes('dstv')) logoFile = 'dstv-logo.png';
        else if (raw.includes('gotv')) logoFile = 'gotv-logo.png';
        else if (raw.includes('jamb')) logoFile = 'jamb-logo.png';
        else if (raw.includes('waec')) logoFile = 'waec-logo.png';

        if (logoFile) {
            // Note: Dashboard is in /dashboard/index.html, so logo path is ../assets/img/
            return `<div class="tx-brand" style="width: 36px; height: 36px; border-radius: 50%; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; padding: 4px;"><img src="../assets/img/${logoFile}" alt="Logo" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML='💼'"></div>`;
        }

        if (isCreditTx(tx)) {
            return `<div class="tx-brand" style="width: 36px; height: 36px; border-radius: 50%; background: #ecfdf5; color: #10b981; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>`;
        }

        return `<div class="tx-brand" style="width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>`;
    };

    // 7. Load Recent Transactions on Dashboard
    async function loadTransactions() {
        const container = document.getElementById('transactions-container');
        if (!container) return; 

        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5); 

        if (error || !data || data.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.85rem;">No recent activity found.</div>';
            return;
        }

        container.innerHTML = ''; 
        
        data.forEach(tx => {
            const date = new Date(tx.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            const brandLogo = getTransactionIcon(tx);
            const serviceName = getCleanTitle(tx);
            const isCredit = isCreditTx(tx);

            const st = (tx.status || '').toLowerCase();
            let displayStatus = 'Successful';
            let statusStyle = 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;';

            if (st === 'pending' || st === 'processing') {
                displayStatus = 'Pending';
                statusStyle = 'background: #fef9c3; color: #a16207; border: 1px solid #fef08a;';
            } else if (st === 'failed' || st === 'reversed' || st === 'cancelled') {
                displayStatus = 'Failed';
                statusStyle = 'background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;';
            }

            const sign = isCredit ? '+' : '-';
            const amountColor = isCredit ? '#10b981' : '#0B1220';

            container.innerHTML += `
                <div class="tx-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; gap: 10px; cursor: pointer;" onclick="window.location.href='/dashboard/receipt/?id=${tx.id}'">
                    <div class="tx-left" style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        ${brandLogo}
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-weight: 700; font-size: 0.82rem; color: #0B1220; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${serviceName}</div>
                            <div style="font-size: 0.68rem; color: #64748b; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 3px;">${date} · Ref: ${formatRef(tx.reference || tx.external_reference)}</div>
                        </div>
                    </div>
                    <div class="tx-right" style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <div style="font-weight: 800; font-size: 0.9rem; color: ${amountColor}; letter-spacing: -0.3px; white-space: nowrap;">${sign}₦${formatCurrency(parseFloat(tx.amount))}</div>
                        <span style="display: inline-block; font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; text-transform: capitalize; ${statusStyle}">${displayStatus}</span>
                    </div>
                </div>
            `;
        });
    }
    // 8. Secure Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            logoutBtn.textContent = 'Logging out...';
            await window.db.auth.signOut();
            window.location.href = '/auth/login.html'; 
        });
    }

    loadProfile();
    loadWallet();
    loadTransactions();
});