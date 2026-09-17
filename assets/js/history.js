document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let allTransactions = [];
    const container = document.getElementById('history-container');

    const formatCurrency = (amount) => parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const isCreditTx = (tx) => {
        const s = (tx.service_type || '').toLowerCase();
        const p = (tx.provider || tx.recipient || '').toLowerCase();
        const t = (tx.type || '').toLowerCase();
        return t === 'credit' || s.includes('fund') || s.includes('deposit') || p.includes('paystack') || p.includes('flutterwave');
    };

    const formatRef = (ref) => {
        if (!ref) return 'N/A';
        return ref.length > 18 ? `${ref.slice(0, 7)}...${ref.slice(-6)}` : ref;
    };

    // 🚀 BULLETPROOF TITLE EXTRACTOR (Uses JMB_ and NIN_ refs)
    const getCleanTitle = (tx) => {
        if (isCreditTx(tx)) return 'WALLET FUNDING';

        const txType = (tx.type || '').toLowerCase();
        const srvType = (tx.service_type || '').toLowerCase();
        const provider = (tx.provider || tx.network_or_operator || '').toUpperCase();
        const notes = (tx.admin_notes || '').toLowerCase();
        const ref = (tx.reference || tx.external_reference || '').toUpperCase();

        if (srvType.includes('education') || srvType.includes('waec') || srvType.includes('neco') || srvType.includes('nabteb') || txType.includes('education')) {
            let examName = provider;
            if (!examName || examName === 'SELF' || examName.includes('VTPASS')) {
                if (notes.includes('waec')) examName = 'WAEC';
                else if (notes.includes('neco')) examName = 'NECO';
                else if (notes.includes('nabteb')) examName = 'NABTEB';
                else examName = 'EXAM';
            }
            return `${examName} PIN PURCHASE`;
        }

        // 🚀 If reference starts with JMB_ or NIN_, it instantly knows what it is!
        if (ref.startsWith('JMB_') || txType === 'jamb_order' || srvType.includes('jamb') || srvType.includes('admission')) {
            return tx.service_type ? tx.service_type.toUpperCase() : 'JAMB SERVICE';
        }
        if (ref.startsWith('NIN_') || txType === 'nin_order' || srvType.includes('nin') || srvType.includes('slip')) {
            return tx.service_type ? tx.service_type.toUpperCase() : 'NIN SERVICE';
        }

        if (srvType.includes('airtime') || txType.includes('airtime')) {
            let net = provider.replace(/VTPASS/gi, '').trim();
            if (!net || net === 'SELF') net = (tx.network_or_operator || '').toUpperCase();
            return net ? `${net} AIRTIME` : 'AIRTIME TOP-UP';
        }
        if (srvType.includes('data') || txType.includes('data')) {
            let net = provider.replace(/VTPASS/gi, '').replace('-SME', ' SME').trim();
            if (!net || net === 'SELF') net = (tx.network_or_operator || '').toUpperCase();
            return net ? `${net} DATA BUNDLE` : 'DATA BUNDLE';
        }

        let clean = (tx.service_type || tx.recipient || 'PAYMENT').replace(/vtpass/gi, '').replace(/external_checkout/gi, '').replace(/[:\-_]/g, ' ').trim().toUpperCase();
        if (clean === 'SELF') clean = (tx.provider || 'PAYMENT').toUpperCase();
        return clean;
    };

    // 🚀 BULLETPROOF LOGO MATCHER
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

        if (logoFile) return `<div class="tx-brand"><img src="../../assets/img/${logoFile}" alt="Logo" onerror="this.parentElement.innerHTML='💼'"></div>`;

        if (isCreditTx(tx)) return `<div class="tx-brand" style="background: #ecfdf5; color: #10b981; border-color: #bbf7d0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>`;
        return `<div class="tx-brand" style="background: #f1f5f9; color: #64748b;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>`;
    };

    const renderTransactions = (filterStatus = 'all') => {
        container.innerHTML = '';

        const filteredTx = allTransactions.filter(tx => {
            if (filterStatus === 'all') return true;
            const st = (tx.status || '').toLowerCase();
            if (filterStatus === 'successful') return st === 'successful' || st === 'completed' || st === 'processed';
            if (filterStatus === 'pending') return st === 'pending' || st === 'processing';
            if (filterStatus === 'failed') return st === 'failed' || st === 'reversed' || st === 'cancelled' || st === 'refunded';
            return true;
        });

        if (filteredTx.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding: 2.5rem; text-align: center; color: #94a3b8; font-size: 0.85rem;">No ${filterStatus !== 'all' ? filterStatus : ''} transactions found.</div>`;
            return;
        }

        filteredTx.forEach(tx => {
            const date = new Date(tx.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            const brandLogo = getTransactionIcon(tx);
            const serviceName = getCleanTitle(tx);
            const isCredit = isCreditTx(tx) || (tx.status || '').toLowerCase() === 'refunded';
            
            const st = (tx.status || '').toLowerCase();
            let displayStatus = 'Successful';
            let statusClass = 'status-successful';

            if (st === 'pending' || st === 'processing') {
                displayStatus = 'Pending'; statusClass = 'status-pending';
            } else if (st === 'failed' || st === 'reversed' || st === 'cancelled') {
                displayStatus = 'Failed'; statusClass = 'status-failed';
            } else if (st === 'refunded') {
                displayStatus = 'Refunded'; statusClass = 'status-successful'; 
            }

            const sign = isCredit ? '+' : '-';
            const amountColor = isCredit ? '#10b981' : '#0B1220';

            container.innerHTML += `
                <div class="tx-row" onclick="window.location.href='/dashboard/receipt/?id=${tx.id}'">
                    <div class="tx-left">
                        ${brandLogo}
                        <div class="tx-info">
                            <div class="tx-title">${serviceName}</div>
                            <div class="tx-date">${date} · Ref: ${formatRef(tx.reference || tx.external_reference)}</div>
                        </div>
                    </div>
                    <div class="tx-right">
                        <div class="tx-amount" style="color: ${amountColor};">${sign}₦${formatCurrency(parseFloat(tx.amount))}</div>
                        <span class="tx-status ${statusClass}">${displayStatus}</span>
                    </div>
                </div>
            `;
        });
    };

    const fetchHistory = async () => {
        const { data, error } = await window.db.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) return;
        allTransactions = data || [];
        renderTransactions('all');
    };

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTransactions(e.target.getAttribute('data-filter'));
        });
    });

    fetchHistory();
});