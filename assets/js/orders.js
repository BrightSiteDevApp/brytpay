document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let allTransactions = [];

    // View Elements
    const categoriesView = document.getElementById('categories-view');
    const listView = document.getElementById('orders-list-view');
    const btnBack = document.getElementById('btn-back-categories');
    const listTitle = document.getElementById('dynamic-list-title');
    const listContainer = document.getElementById('dynamic-tx-container');

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
        if (raw.includes('mtn')) logoFile = 'mtn-logo.png';
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

        if (logoFile) return `<div class="tx-brand"><img src="../../assets/img/${logoFile}" alt="Logo" onerror="this.parentElement.innerHTML='💼'"></div>`;

        if (isCreditTx(tx)) return `<div class="tx-brand" style="background: #ecfdf5; color: #10b981; border-color: #bbf7d0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>`;
        return `<div class="tx-brand" style="background: #f1f5f9; color: #64748b;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>`;
    };

    const determineCategory = (tx) => {
        const s = (tx.service_type || '').toLowerCase();
        const p = (tx.provider || tx.recipient || '').toLowerCase();
        const t = (tx.type || '').toLowerCase();
        const ref = (tx.reference || '').toUpperCase();

        if (t === 'credit' || s.includes('fund') || s.includes('deposit') || p.includes('paystack') || p.includes('flutterwave')) return 'funding';
        if (s.includes('certificate')) return 'certificates';
        if (s.includes('education') || s.includes('waec') || s.includes('neco') || s.includes('nabteb') || t.includes('education')) return 'education';
        if (ref.startsWith('JMB_') || t === 'jamb_order' || s.includes('jamb') || s.includes('admission')) return 'jamb';
        if (ref.startsWith('NIN_') || t === 'nin_order' || s.includes('nin') || s.includes('slip')) return 'nin';
        if (s.includes('airtime') || t.includes('airtime')) return 'airtime';
        if (s.includes('data') || t.includes('data')) return 'data';
        if (s.includes('tv') || p.includes('dstv') || p.includes('gotv') || p.includes('startimes')) return 'tv';
        
        return 'other';
    };

    // 🚀 NEW: Animate Counter Function
    const animateValue = (element, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing function to slow down at the end
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            element.innerHTML = Math.floor(easeOutQuart * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                element.innerHTML = end; // Ensure it ends exactly on the number
            }
        };
        window.requestAnimationFrame(step);
    };

    async function fetchOrders() {
        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error || !data) return;
        allTransactions = data;

        const counts = { education: 0, certificates: 0, jamb: 0, airtime: 0, data: 0, nin: 0, tv: 0, funding: 0 };
        
        allTransactions.forEach(tx => {
            const cat = determineCategory(tx);
            if (counts[cat] !== undefined) counts[cat]++;
        });

        // 🚀 THE FIX: Pass counts to animation function instead of setting immediately
        Object.keys(counts).forEach(cat => {
            const el = document.getElementById(`count-${cat}`);
            if (el && counts[cat] > 0) {
                // Animate from 0 to the target count over 800 milliseconds
                animateValue(el, 0, counts[cat], 800);
            } else if (el) {
                el.textContent = 0;
            }
        });
    }

    fetchOrders();

    function renderList(categoryCode, categoryName) {
        listTitle.textContent = categoryName;
        listContainer.innerHTML = '';

        const filtered = allTransactions.filter(tx => determineCategory(tx) === categoryCode);

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.9rem; font-weight: 600;">No ${categoryName} transactions found.</div>`;
            return;
        }

        filtered.forEach(tx => {
            const date = new Date(tx.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            const brandLogo = getTransactionIcon(tx);
            const serviceName = getCleanTitle(tx);
            
            const isCredit = categoryCode === 'funding' || (tx.status || '').toLowerCase() === 'refunded';
            const sign = isCredit ? '+' : '-';
            const amountColor = isCredit ? '#10b981' : '#0f172a';
            
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

            let targetUrl = `/dashboard/receipt/?id=${tx.id}`; 
            const sharedRef = tx.reference || tx.external_reference;

            if (categoryCode === 'jamb') {
                targetUrl = `/dashboard/jamb/order-details.html?ref=${sharedRef}`;
            } else if (categoryCode === 'nin') {
                targetUrl = `/dashboard/nin/order-details.html?ref=${sharedRef}`;
            } else if (categoryCode === 'certificates') {
                targetUrl = `/dashboard/exam-certs/order-details.html?ref=${sharedRef}`;
            }

            listContainer.innerHTML += `
                <a href="${targetUrl}" class="tx-row">
                    <div class="tx-left">
                        ${brandLogo}
                        <div class="tx-info">
                            <div class="tx-title">${serviceName}</div>
                            <div class="tx-date">${date} • Ref: ${formatRef(tx.reference || tx.external_reference)}</div>
                        </div>
                    </div>
                    <div class="tx-right">
                        <div class="tx-amount" style="color: ${amountColor};">
                            ${sign}₦${formatCurrency(parseFloat(tx.amount))}
                        </div>
                        <span class="tx-status" style="${statusStyle}">${displayStatus}</span>
                    </div>
                </a>
            `;
        });
    }

    // View Switching
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const catCode = card.getAttribute('data-category');
            const catName = card.querySelector('.cat-title').textContent;
            
            categoriesView.style.display = 'none';
            listView.style.display = 'block';
            window.scrollTo(0, 0); 
            
            renderList(catCode, catName);
        });
    });

    btnBack.addEventListener('click', () => {
        listView.style.display = 'none';
        categoriesView.style.display = 'block';
    });
});