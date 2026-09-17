document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error: sessionError } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = '/auth/login.html'; 
        return;
    }
    
    const user = session.user;
    let currentBalance = 0;

    const hour = new Date().getHours();
    const greetingTime = document.getElementById('greeting-time');
    if (greetingTime) {
        if (hour < 12) greetingTime.textContent = 'Good morning,';
        else if (hour < 18) greetingTime.textContent = 'Good afternoon,';
        else greetingTime.textContent = 'Good evening,';
    }

    async function loadProfile() {
        const { data } = await window.db.from('profiles').select('full_name').eq('id', user.id).single();
        const greetingEl = document.getElementById('user-greeting');
        if (greetingEl) {
            greetingEl.textContent = (data && data.full_name) ? data.full_name.split(' ')[0] : "User";
        }
    }

    async function loadWallet() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            updateBalanceUI(isBalanceHidden);
        }
    }

    function formatCurrency(amount) {
        return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

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

    // 🚀 BULLETPROOF TITLE EXTRACTOR (Fixed CheapDataHub Bug)
    const getCleanTitle = (tx) => {
        if (isCreditTx(tx)) return 'WALLET FUNDING';

        const txType = (tx.type || '').toLowerCase();
        const srvType = (tx.service_type || '').toLowerCase();
        const provider = (tx.provider || tx.network_or_operator || '').toUpperCase();
        const notes = (tx.admin_notes || '').toLowerCase();
        const ref = (tx.reference || tx.external_reference || '').toUpperCase();

        if (srvType.includes('education') || srvType.includes('waec') || srvType.includes('neco') || srvType.includes('nabteb') || txType.includes('education')) {
            let examName = provider;
            if (!examName || examName === 'SELF' || examName.includes('VTPASS') || examName.includes('CHEAPDATAHUB')) {
                if (notes.includes('waec')) examName = 'WAEC';
                else if (notes.includes('neco')) examName = 'NECO';
                else if (notes.includes('nabteb')) examName = 'NABTEB';
                else examName = 'EXAM';
            }
            return `${examName} PIN PURCHASE`;
        }

        if (ref.startsWith('JMB_') || txType === 'jamb_order' || srvType.includes('jamb') || srvType.includes('admission')) {
            return tx.service_type ? tx.service_type.toUpperCase() : 'JAMB SERVICE';
        }
        if (ref.startsWith('NIN_') || txType === 'nin_order' || srvType.includes('nin') || srvType.includes('slip')) {
            return tx.service_type ? tx.service_type.toUpperCase() : 'NIN SERVICE';
        }

        if (srvType.includes('airtime') || txType.includes('airtime')) {
            let net = srvType.replace(/airtime/gi, '').trim().toUpperCase();
            if (!net || net === 'SELF') net = (tx.network_or_operator || '').toUpperCase();
            if (!net && !provider.includes('CHEAPDATAHUB') && !provider.includes('VTPASS')) net = provider;
            return net ? `${net} AIRTIME` : 'AIRTIME TOP-UP';
        }
        if (srvType.includes('data') || txType.includes('data')) {
            let net = srvType.replace(/data/gi, '').replace(/-/g, ' ').trim().toUpperCase();
            if (!net || net === 'SELF') net = (tx.network_or_operator || '').toUpperCase();
            if (!net && !provider.includes('CHEAPDATAHUB') && !provider.includes('VTPASS')) net = provider;
            return net ? `${net} DATA BUNDLE` : 'DATA BUNDLE';
        }

        let clean = (tx.service_type || tx.recipient || 'PAYMENT').replace(/vtpass/gi, '').replace(/external_checkout/gi, '').replace(/[:\-_]/g, ' ').trim().toUpperCase();
        if (clean === 'SELF') clean = (tx.provider || 'PAYMENT').toUpperCase();
        return clean;
    };

    const getTransactionIcon = (tx) => {
        const raw = `${tx.type || ''} ${tx.service_type || ''} ${tx.recipient || ''} ${tx.provider || ''} ${tx.admin_notes || ''} ${tx.reference || ''}`.toLowerCase();

        let logoFile = null;
        if (raw.includes('cbt')) logoFile = 'brytcbtsim-logo.png';
        else if (raw.includes('dgm')) logoFile = 'brytdgm-logo.png';
        else if (raw.includes('mtn')) logoFile = 'mtn-logo.png';
        else if (raw.includes('airtel')) logoFile = 'airtel-logo.png';
        else if (raw.includes('glo')) logoFile = 'glo-logo.png';
        else if (raw.includes('9mobile') || raw.includes('etisalat')) logoFile = '9mob-logo.png';
        else if (raw.includes('dstv')) logoFile = 'dstv-logo.png';
        else if (raw.includes('gotv')) logoFile = 'gotv-logo.png';
        else if (raw.includes('jmb_') || raw.includes('jamb') || raw.includes('admission') || raw.includes('result')) logoFile = 'jamb-logo.png';
        else if (raw.includes('nin_') || raw.includes('nin') || raw.includes('slip')) logoFile = 'nimc-logo.png';
        else if (raw.includes('waec')) logoFile = 'waec-logo.png';
        else if (raw.includes('neco')) logoFile = 'neco-logo.png';
        else if (raw.includes('nabteb')) logoFile = 'nabteb-logo.png';

        if (logoFile) {
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
            const isCredit = isCreditTx(tx) || (tx.status || '').toLowerCase() === 'refunded';

            const st = (tx.status || '').toLowerCase();
            let displayStatus = 'Successful';
            let statusStyle = 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;';

            if (st === 'pending' || st === 'processing') {
                displayStatus = 'Pending';
                statusStyle = 'background: #fef9c3; color: #a16207; border: 1px solid #fef08a;';
            } else if (st === 'failed' || st === 'reversed' || st === 'cancelled') {
                displayStatus = 'Failed';
                statusStyle = 'background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;';
            } else if (st === 'refunded') {
                displayStatus = 'Refunded'; 
                statusStyle = 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;'; 
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