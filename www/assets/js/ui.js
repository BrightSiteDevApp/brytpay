document.addEventListener('DOMContentLoaded', async () => {
    
    // Support Dropdown Logic
    const supportTrigger = document.getElementById('support-trigger');
    const supportMenu = document.getElementById('support-menu');
    if (supportTrigger && supportMenu) {
        supportTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMenuOpen = supportMenu.style.display === 'block';
            supportMenu.style.display = isMenuOpen ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!supportTrigger.contains(e.target) && !supportMenu.contains(e.target)) {
                supportMenu.style.display = 'none';
            }
        });
    }

    const { data: { session }, error: sessionError } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = '/auth/login.html'; 
        return;
    }
    
    const user = session.user;
    let currentBalance = 0;
    let userAccountId = '';
    let isBalanceHidden = localStorage.getItem('brytpay_balance_hidden') === 'true';

    async function checkUnreadNotifications() {
        const notifDot = document.getElementById('notif-dot');
        if (!notifDot) return;

        try {
            const { data, error } = await window.db
                .from('user_notifications')
                .select('id, user_id')
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .eq('is_read', false);

            if (error || !data) return;

            const localRead = JSON.parse(localStorage.getItem('bryt_read_notifs') || '[]');
            const hasUnread = data.some(notif => {
                if (notif.user_id === null) return !localRead.includes(notif.id);
                return true; 
            });

            if (hasUnread) notifDot.classList.add('active');
            else notifDot.classList.remove('active');
        } catch (err) {}
    }

    const hour = new Date().getHours();
    const greetingTime = document.getElementById('greeting-time');
    if (greetingTime) {
        if (hour < 12) greetingTime.textContent = 'Good morning,';
        else if (hour < 18) greetingTime.textContent = 'Good afternoon,';
        else greetingTime.textContent = 'Good evening,';
    }

    // ==========================================
    // 🚀 MANDATORY PIN SETUP LOGIC
    // ==========================================
    function initPinSetup() {
        const overlay = document.getElementById('pin-setup-overlay');
        const dots = document.querySelectorAll('.pin-dot');
        const keypadBtns = document.querySelectorAll('.keypad-btn');
        const saveBtn = document.getElementById('btn-save-pin');
        let currentPin = '';

        if (!overlay) return;
        overlay.classList.add('active');

        function updateDots() {
            dots.forEach((dot, idx) => {
                if (idx < currentPin.length) dot.classList.add('filled');
                else dot.classList.remove('filled');
            });
            saveBtn.disabled = currentPin.length !== 4;
        }

        keypadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-val');
                if (val === 'back') {
                    currentPin = currentPin.slice(0, -1);
                } else {
                    if (currentPin.length < 4) currentPin += val;
                }
                updateDots();
            });
        });

        saveBtn.addEventListener('click', async () => {
            if (currentPin.length !== 4) return;
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = 'Saving...';
            
            // Save PIN to Supabase Profiles Table
            const { error } = await window.db.from('profiles').update({ transaction_pin: currentPin }).eq('id', user.id);
            
            if (error) {
                alert('Connection error. Please try again.');
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Save PIN';
            } else {
                saveBtn.style.background = '#10b981';
                saveBtn.innerHTML = 'PIN Saved! ✓';
                
                // Hide overlay after success
                setTimeout(() => {
                    overlay.classList.remove('active');
                }, 1000);
            }
        });
    }

    // 🚀 LOAD PROFILE & TRIGGER PIN CHECK
    async function loadProfile() {
        // Now fetching transaction_pin from the database
        const { data } = await window.db.from('profiles').select('full_name, account_id, transaction_pin').eq('id', user.id).single();
        const greetingEl = document.getElementById('user-greeting');
        const displayIdEl = document.getElementById('display-account-id');
        
        if (data) {
            if (greetingEl) {
                greetingEl.textContent = data.full_name ? data.full_name.split(' ')[0] : "User";
                greetingEl.classList.remove('skeleton');
            }
            if (displayIdEl && data.account_id) {
                userAccountId = data.account_id;
                displayIdEl.textContent = userAccountId;
            }

            // SMART CHECK: If they don't have a PIN saved in the DB, lock the screen!
            if (!data.transaction_pin) {
                initPinSetup();
            }
        }
    }

    const copyBtn = document.getElementById('copy-id-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!userAccountId) return;
            navigator.clipboard.writeText(userAccountId).then(() => {
                const toast = document.getElementById('copy-toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            });
        });
    }

    async function loadWallet() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            updateBalanceUI(isBalanceHidden);
            
            const balanceAmount = document.getElementById('balance-amount');
            if (balanceAmount) balanceAmount.classList.remove('skeleton');
        }
    }

    function formatCurrency(amount) {
        return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const toggleBtn = document.getElementById('toggle-balance');
    const balanceAmount = document.getElementById('balance-amount');
    const balanceCurrency = document.getElementById('balance-currency');

    function updateBalanceUI(hidden) {
        if (!balanceAmount) return;
        if (hidden) {
            balanceAmount.textContent = '••••••••';
            if (balanceCurrency) balanceCurrency.style.display = 'none';
            if (toggleBtn) toggleBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        } else {
            balanceAmount.textContent = formatCurrency(currentBalance);
            if (balanceCurrency) balanceCurrency.style.display = 'inline';
            if (toggleBtn) toggleBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isBalanceHidden = !isBalanceHidden;
            localStorage.setItem('brytpay_balance_hidden', isBalanceHidden);
            updateBalanceUI(isBalanceHidden);
        });
    }

    const isCreditTx = (tx) => {
        const s = (tx.service_type || '').toLowerCase();
        const p = (tx.provider || tx.recipient || '').toLowerCase();
        const t = (tx.type || '').toLowerCase();
        
        // NEW: Check if the transaction metadata marks this as a credit
        const isMetadataCredit = tx.metadata && tx.metadata.transaction_type === 'credit';
        
        return isMetadataCredit || t === 'credit' || s.includes('fund') || s.includes('deposit') || s.includes('topup') || p.includes('paystack') || p.includes('flutterwave') || p.includes('topup');
    };

    const formatRef = (ref) => {
        if (!ref) return 'N/A';
        if (ref.length > 18) return `${ref.slice(0, 7)}...${ref.slice(-6)}`;
        return ref;
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

        if (ref.startsWith('JMB_') || txType === 'jamb_order' || srvType.includes('jamb') || srvType.includes('admission')) return tx.service_type ? tx.service_type.toUpperCase() : 'JAMB SERVICE';
        if (ref.startsWith('NIN_') || txType === 'nin_order' || srvType.includes('nin') || srvType.includes('slip')) return tx.service_type ? tx.service_type.toUpperCase() : 'NIN SERVICE';

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

        if (logoFile) return `<div class="tx-brand" style="width: 36px; height: 36px; border-radius: 12px; background: #ffffff; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; padding: 4px;"><img src="../assets/img/${logoFile}" alt="Logo" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML='💼'"></div>`;
        if (isCreditTx(tx)) return `<div class="tx-brand" style="width: 36px; height: 36px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>`;
        
        return `<div class="tx-brand" style="width: 36px; height: 36px; border-radius: 12px; background: var(--bg-color); color: #64748b; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>`;
    };

    async function loadTransactions() {
        const container = document.getElementById('transactions-container');
        if (!container) return; 

        const { data, error } = await window.db.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5); 

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
            let statusStyle = 'background: rgba(16, 185, 129, 0.1); color: #16a34a; border: 1px solid rgba(16, 185, 129, 0.2);';

            if (st === 'pending' || st === 'processing') {
                displayStatus = 'Pending';
                statusStyle = 'background: rgba(234, 179, 8, 0.1); color: #ca8a04; border: 1px solid rgba(234, 179, 8, 0.2);';
            } else if (st === 'failed' || st === 'reversed' || st === 'cancelled') {
                displayStatus = 'Failed';
                statusStyle = 'background: rgba(239, 68, 68, 0.1); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.2);';
            } else if (st === 'refunded') {
                displayStatus = 'Refunded'; 
                statusStyle = 'background: rgba(16, 185, 129, 0.1); color: #16a34a; border: 1px solid rgba(16, 185, 129, 0.2);'; 
            }

            const sign = isCredit ? '+' : '-';
            const amountColor = isCredit ? '#10b981' : 'var(--text-main)';

            container.innerHTML += `
                <div class="tx-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-light); gap: 10px; cursor: pointer;" onclick="window.location.href='/dashboard/receipt/index.html?id=${tx.id}'">
                    <div class="tx-left" style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        ${brandLogo}
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-weight: 800; font-size: 0.82rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${serviceName}</div>
                            <div style="font-size: 0.65rem; color: #64748b; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 3px;">${date} · Ref: ${formatRef(tx.reference || tx.external_reference)}</div>
                        </div>
                    </div>
                    <div class="tx-right" style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <div style="font-weight: 800; font-size: 0.88rem; color: ${amountColor}; letter-spacing: -0.3px; white-space: nowrap;">${sign}₦${formatCurrency(parseFloat(tx.amount))}</div>
                        <span style="display: inline-block; font-size: 0.62rem; font-weight: 800; padding: 3px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.4px; ${statusStyle}">${displayStatus}</span>
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

    async function managePushConsent() {
        const consentUI = document.getElementById('push-consent-ui');
        const btnAllow = document.getElementById('btn-allow-push');
        const btnDeny = document.getElementById('btn-deny-push');

        if (!consentUI) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const dismissedUntil = localStorage.getItem('bryt_push_dismissed_until');
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;
        if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

        setTimeout(() => { consentUI.classList.add('active'); }, 1500);

        btnDeny.addEventListener('click', () => {
            consentUI.classList.remove('active');
            localStorage.setItem('bryt_push_dismissed_until', (Date.now() + 172800000).toString()); 
        });

        btnAllow.addEventListener('click', async () => {
            btnAllow.textContent = "Connecting...";
            btnAllow.disabled = true;
            try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') { consentUI.classList.remove('active'); return; }
                const registration = await navigator.serviceWorker.ready;
                const VAPID_PUBLIC_KEY = "BLfbGDEa2tl28dIanGQ5KffDXg9rEuSdyI49VurFSGZyef8h1Gg3B-uf6-B6BuBZfYz1bCt0VPiybjqodHC5gKk";
                const urlBase64ToUint8Array = (base64String) => {
                    const padding = '='.repeat((4 - base64String.length % 4) % 4);
                    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                    const rawData = window.atob(base64);
                    const outputArray = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
                    return outputArray;
                };
                const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
                await window.db.from('push_subscriptions').insert({ user_id: user.id, subscription: subscription });
                btnAllow.textContent = "Connected! ✓";
                btnAllow.style.background = "#10b981";
                setTimeout(() => { consentUI.classList.remove('active'); }, 1000);
            } catch (err) {}
        });
    }

    checkUnreadNotifications();
    loadProfile();
    loadWallet();
    loadTransactions();
    managePushConsent();
});

