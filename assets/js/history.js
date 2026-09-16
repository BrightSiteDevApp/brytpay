document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) {
        window.location.href = '/auth/login.html'; 
        return;
    }

    const user = session.user;
    let allTransactions = [];
    const container = document.getElementById('history-container');

    const formatCurrency = (amount) => {
        return parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const isCreditTx = (tx) => {
        const s = (tx.service_type || '').toLowerCase();
        const p = (tx.provider || tx.recipient || '').toLowerCase();
        const t = (tx.type || '').toLowerCase();

        return t === 'credit' || 
               s.includes('fund') || s.includes('deposit') || s.includes('topup') ||
               p.includes('paystack') || p.includes('flutterwave') || p.includes('topup');
    };

    // 🚀 Shorten long references so they don't break mobile layout
    const formatRef = (ref) => {
        if (!ref) return 'N/A';
        if (ref.length > 18) {
            return `${ref.slice(0, 7)}...${ref.slice(-6)}`;
        }
        return ref;
    };

    // 🚀 Clean up service names (strips VTPASS, cleans CBT & DGM)
    const getCleanTitle = (tx) => {
        if (isCreditTx(tx)) return 'WALLET FUNDING';

        const raw = `${tx.service_type || ''} ${tx.recipient || ''} ${tx.provider || ''}`.toUpperCase();

        if (raw.includes('CBT') || raw.includes('BRYT_CBT')) {
            return 'BRYT CBT SIM PAYMENT';
        }
        if (raw.includes('DGM') || raw.includes('BRYT_DGM')) {
            return 'BRYT DGM PAYMENT';
        }
        if (raw.includes('JAMB')) {
            return 'JAMB SERVICE';
        }
        if (raw.includes('WAEC') || raw.includes('NECO') || raw.includes('NABTEB')) {
            return 'EXAM PIN PURCHASE';
        }
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

    // 🚀 Dynamic Brand / Custom App Icon Generator
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
            return `<div class="tx-brand"><img src="../../assets/img/${logoFile}" alt="Logo" onerror="this.parentElement.innerHTML='💼'"></div>`;
        }

        // Wallet Funding icon
        if (isCreditTx(tx)) {
            return `<div class="tx-brand" style="background: #ecfdf5; color: #10b981; border-color: #bbf7d0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>`;
        }

        // Generic Payment icon
        return `<div class="tx-brand" style="background: #f1f5f9; color: #64748b;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>`;
    };

    const renderTransactions = (filterStatus = 'all') => {
        container.innerHTML = '';

        const filteredTx = allTransactions.filter(tx => {
            if (filterStatus === 'all') return true;
            const st = (tx.status || '').toLowerCase();
            if (filterStatus === 'successful') {
                return st === 'successful' || st === 'completed' || st === 'processed';
            }
            if (filterStatus === 'pending') {
                return st === 'pending' || st === 'processing';
            }
            if (filterStatus === 'failed') {
                return st === 'failed' || st === 'reversed' || st === 'cancelled';
            }
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
            const isCredit = isCreditTx(tx);
            
            // 🚀 Force 'Successful' label & green status for completed/processed rows
            const st = (tx.status || '').toLowerCase();
            let displayStatus = 'Successful';
            let statusClass = 'status-successful';

            if (st === 'pending' || st === 'processing') {
                displayStatus = 'Pending';
                statusClass = 'status-pending';
            } else if (st === 'failed' || st === 'reversed' || st === 'cancelled') {
                displayStatus = 'Failed';
                statusClass = 'status-failed';
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
        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            container.innerHTML = '<div class="empty-state" style="padding: 2.5rem; text-align: center; color: #ef4444; font-size: 0.85rem;">Failed to load transactions.</div>';
            return;
        }

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