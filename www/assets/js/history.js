document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let allTransactions = [];
    const container = document.getElementById('history-container');
    const searchInput = document.getElementById('tx-search');

    // Filter States
    let currentFilter = 'all';
    let currentSearch = '';

    // 🚀 SMART ROUTING
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/account/')) {
            backBtn.href = '/dashboard/account/index.html';
        } else {
            backBtn.href = '/dashboard/index.html';
        }
    }

    const formatCurrency = (amount) => parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const isCreditTx = (tx) => {
        const s = (tx.service_type || '').toLowerCase();
        const p = (tx.provider || tx.recipient || '').toLowerCase();
        const t = (tx.type || '').toLowerCase();
        const isMetadataCredit = tx.metadata && tx.metadata.transaction_type === 'credit';
        return isMetadataCredit || t === 'credit' || s.includes('fund') || s.includes('deposit') || p.includes('paystack') || p.includes('flutterwave') || p.includes('payvessel');
    };

    const formatRef = (ref) => {
        if (!ref) return 'N/A';
        return ref.length > 18 ? `${ref.slice(0, 7)}...${ref.slice(-6)}` : ref;
    };

    const getCleanTitle = (tx) => {
        if (isCreditTx(tx)) return 'WALLET FUNDING';
        const txType = (tx.type || '').toLowerCase();
        const srvType = (tx.service_type || '').toLowerCase();
        const provider = (tx.provider || tx.network_or_operator || '').toUpperCase();
        const notes = (tx.admin_notes || '').toLowerCase();
        const ref = (tx.reference || tx.external_reference || '').toUpperCase();

        if (srvType.includes('certificate')) return srvType.toUpperCase();
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
        else if (raw.includes('startimes')) logoFile = 'startimes-logo.png'; 
        else if (raw.includes('jmb_') || raw.includes('jamb') || raw.includes('admission') || raw.includes('result')) logoFile = 'jamb-logo.png';
        else if (raw.includes('nin_') || raw.includes('nin') || raw.includes('slip')) logoFile = 'nimc-logo.png';
        else if (raw.includes('waec')) logoFile = 'waec-logo.png';
        else if (raw.includes('neco')) logoFile = 'neco-logo.png';
        else if (raw.includes('nabteb')) logoFile = 'nabteb-logo.png';

        if (logoFile) return `<div class="tx-brand" style="background: #ffffff; border: 1px solid var(--border-light);"><img src="../../assets/img/${logoFile}" alt="Logo" onerror="this.parentElement.innerHTML='💼'"></div>`;
        if (isCreditTx(tx)) return `<div class="tx-brand" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>`;
        
        return `<div class="tx-brand" style="background: var(--bg-color); color: #64748b; border: 1px solid var(--border-light);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>`;
    };

    const renderTransactions = () => {
        container.innerHTML = '';

        const filteredTx = allTransactions.filter(tx => {
            // 1. Check Search Match
            const cleanTitle = getCleanTitle(tx).toLowerCase();
            const ref = (tx.reference || tx.external_reference || '').toLowerCase();
            const isSearchMatch = currentSearch === '' || cleanTitle.includes(currentSearch) || ref.includes(currentSearch);
            
            if (!isSearchMatch) return false;

            // 2. Check Filter Match
            const st = (tx.status || '').toLowerCase();
            const isCredit = isCreditTx(tx) || st === 'refunded';

            if (currentFilter === 'all') return true;
            if (currentFilter === 'credit') return isCredit;
            if (currentFilter === 'debit') return !isCredit;
            if (currentFilter === 'airtime') return cleanTitle.includes('airtime');
            if (currentFilter === 'data') return cleanTitle.includes('data');
            if (currentFilter === 'successful') return ['successful', 'completed', 'processed', 'refunded'].includes(st);
            if (currentFilter === 'pending') return ['pending', 'processing'].includes(st);
            if (currentFilter === 'failed') return ['failed', 'reversed', 'cancelled'].includes(st);

            return true;
        });

        if (filteredTx.length === 0) {
            let msg = 'No transactions found.';
            if (currentSearch !== '') msg = `No results found for "${currentSearch}"`;
            else if (currentFilter !== 'all') msg = `No ${currentFilter} transactions found.`;
            
            container.innerHTML = `<div class="empty-state" style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 600;">${msg}</div>`;
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
            const amountColor = isCredit ? '#10b981' : 'var(--text-main)';

            container.innerHTML += `
                <div class="tx-row" onclick="window.location.href='/dashboard/receipt/index.html?id=${tx.id}'">
                    <div class="tx-left">
                        ${brandLogo}
                        <div class="tx-info">
                            <div class="tx-title">${serviceName}</div>
                            <div class="tx-date">${date} • Ref: ${formatRef(tx.reference || tx.external_reference)}</div>
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

    // Live Search Listener
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderTransactions();
    });

    // Filter Chips Listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderTransactions();
        });
    });

    const fetchHistory = async () => {
        const { data, error } = await window.db.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) return;
        allTransactions = data || [];
        renderTransactions();
    };

    fetchHistory();
});