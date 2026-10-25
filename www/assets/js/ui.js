// ==========================================
// 🛑 1. THE INSTANT GUARD (Runs before page loads)
// ==========================================
(function globalSecurityGuard() {
    const isUnlocked = sessionStorage.getItem('bryt_unlocked') === 'true';
    const currentPath = window.location.pathname.toLowerCase();
    const isIndexPage = currentPath.endsWith('/dashboard/') || currentPath.endsWith('/dashboard/index.html');
    
    // If locked and trying to access any page other than the index, bounce instantly.
    if (!isUnlocked && !isIndexPage) {
        window.location.replace('/dashboard/index.html');
    }
})();

// ==========================================
// 🛑 2. THE CACHE & BACKGROUND BUSTERS
// ==========================================
// Catches BFCache (Back-Forward Cache) loading
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const isUnlocked = sessionStorage.getItem('bryt_unlocked') === 'true';
        const currentPath = window.location.pathname.toLowerCase();
        const isIndexPage = currentPath.endsWith('/dashboard/') || currentPath.endsWith('/dashboard/index.html');
        
        if (!isUnlocked && !isIndexPage) {
            window.location.replace('/dashboard/index.html');
        }
    }
});

// Catches users minimizing the app and opening it again
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const isUnlocked = sessionStorage.getItem('bryt_unlocked') === 'true';
        const currentPath = window.location.pathname.toLowerCase();
        const isIndexPage = currentPath.endsWith('/dashboard/') || currentPath.endsWith('/dashboard/index.html');
        
        if (!isUnlocked && !isIndexPage) {
            window.location.replace('/dashboard/index.html');
        }
    }
});

// ==========================================
// MAIN DOM LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    
    const splash = document.getElementById('app-splash');
    const unlockScreen = document.getElementById('app-unlock-screen');
    const splashShown = sessionStorage.getItem('bryt_dash_splash_shown');
    const isUnlocked = sessionStorage.getItem('bryt_unlocked') === 'true';

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
        window.location.replace('/auth/login.html'); 
        return;
    }
    
    const user = session.user;
    let currentBalance = 0;
    let userAccountId = '';
    let isBalanceHidden = localStorage.getItem('brytpay_balance_hidden') === 'true';
    let userPin = null;

    // Global Clipboard Toast Function
    window.showToast = function(message, type = 'success') {
        const toast = document.getElementById('bryt-toast');
        const toastText = document.getElementById('toast-text');
        const iconWrap = document.getElementById('toast-icon-wrap');
        
        if (!toast || !toastText || !iconWrap) return;

        toast.className = `bryt-toast toast-${type}`;
        iconWrap.textContent = '';
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "14"); svg.setAttribute("height", "14");
        svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "3");

        if (type === 'success') {
            const poly = document.createElementNS(svgNS, "polyline");
            poly.setAttribute("points", "20 6 9 17 4 12"); svg.appendChild(poly);
        } else {
            const l1 = document.createElementNS(svgNS, "line"); l1.setAttribute("x1", "18"); l1.setAttribute("y1", "6"); l1.setAttribute("x2", "6"); l1.setAttribute("y2", "18");
            const l2 = document.createElementNS(svgNS, "line"); l2.setAttribute("x1", "6"); l2.setAttribute("y1", "6"); l2.setAttribute("x2", "18"); l2.setAttribute("y2", "18");
            svg.appendChild(l1); svg.appendChild(l2);
        }
        iconWrap.appendChild(svg);
        toastText.textContent = message; 
        toast.classList.add('show');
        
        setTimeout(() => toast.classList.remove('show'), 4000);
    };

    window.copyVirtualAccount = function(accNo) {
        if (!accNo || accNo === '0000000000') return;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(accNo).then(() => { window.showToast(`Copied ${accNo} to clipboard!`, 'success'); });
        } else {
            const temp = document.createElement('textarea'); temp.value = accNo; document.body.appendChild(temp); 
            temp.select(); document.execCommand('copy'); document.body.removeChild(temp);
            window.showToast(`Copied ${accNo} to clipboard!`, 'success');
        }
    };

    // ==========================================
    // ⏱️ STRICT DASHBOARD SPLASH & UNLOCK ROUTING
    // ==========================================
    async function initializeAppState() {
        const { data } = await window.db.from('profiles').select('full_name, account_id, transaction_pin, psb9_account_number, palmpay_account_number, payvessel_palmpay_account_number, moniepoint_account_number, virtual_account_name').eq('id', user.id).single();
        if (data) {
            userPin = data.transaction_pin;
            
            // 1. Populate Greeting & IDs
            const greetingEl = document.getElementById('user-greeting');
            const displayIdEl = document.getElementById('display-account-id');
            const unlockAvatar = document.getElementById('unlock-avatar');
            const unlockNameEl = document.getElementById('unlock-email'); 
            
            if (greetingEl) {
                greetingEl.textContent = data.full_name ? data.full_name.split(' ')[0] : "User";
                greetingEl.classList.remove('skeleton');
            }
            if (unlockAvatar) {
                unlockAvatar.textContent = data.full_name ? data.full_name.charAt(0).toUpperCase() : "U";
            }
            if (unlockNameEl) {
                unlockNameEl.textContent = data.full_name || "User"; 
            }
            if (displayIdEl && data.account_id) {
                userAccountId = data.account_id;
                displayIdEl.textContent = userAccountId;
            }

            // 2. Populate Virtual Accounts
            const vaContainer = document.getElementById('virtual-accounts-container');
            if (vaContainer) {
                let cardsHtml = '';
                const legacyTopifyName = data.virtual_account_name || data.full_name || 'BRYT Pay User';
                
                const buildCard = (bankName, accNo, displayAccName, feeText) => {
                    return `
                    <div class="va-card">
                        <div class="va-info-left">
                            <div class="va-icon-wrap">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="21" width="18" height="2"></rect><polygon points="12 3 3 9 21 9 12 3"></polygon><line x1="6" y1="12" x2="6" y2="18"></line><line x1="10" y1="12" x2="10" y2="18"></line><line x1="14" y1="12" x2="14" y2="18"></line><line x1="18" y1="12" x2="18" y2="18"></line></svg>
                            </div>
                            <div>
                                <div class="va-bank-title">${bankName}</div>
                                <div class="va-acc-number">${accNo}</div>
                                <div class="va-acc-name">${displayAccName}</div>
                                <div class="va-fee-text">${feeText}</div>
                            </div>
                        </div>
                        <button class="btn-va-copy" onclick="copyVirtualAccount('${accNo}')">Copy</button>
                    </div>`;
                };

                if (data.psb9_account_number) {
                    cardsHtml += buildCard('9Payment Service Bank (9PSB)', data.psb9_account_number, 'PAYVESSEL/BRYT Pay', 'Fixed fee: ₦50');
                }
                if (data.palmpay_account_number) {
                    cardsHtml += buildCard('PalmPay', data.palmpay_account_number, legacyTopifyName, 'Fixed fee: 1.5%');
                }
                if (data.payvessel_palmpay_account_number) {
                    cardsHtml += buildCard('PalmPay', data.payvessel_palmpay_account_number, 'BRYT Pay (Nexpay)', 'Fixed fee: 1.5%');
                }
                if (data.moniepoint_account_number) {
                    cardsHtml += buildCard('Moniepoint', data.moniepoint_account_number, legacyTopifyName, 'Fixed fee: 1.5%');
                }

                if (cardsHtml) {
                    vaContainer.innerHTML = cardsHtml;
                } else {
                    vaContainer.style.display = 'none';
                }
            }

            // 3. Evaluate PIN Lock Status
            const currentPath = window.location.pathname.toLowerCase();
            const isIndexPage = currentPath.endsWith('/dashboard/') || currentPath.endsWith('/dashboard/index.html');

            if (!userPin) {
                sessionStorage.setItem('bryt_unlocked', 'true');
                if (!isIndexPage) {
                    window.location.replace('/dashboard/index.html');
                    return;
                }
                initPinSetup();
                dismissSplash();
            } else if (!isUnlocked) {
                if (!isIndexPage) {
                    window.location.replace('/dashboard/index.html');
                    return;
                } else {
                    if (unlockScreen) unlockScreen.style.display = 'flex';
                    initUnlockKeypad();
                    dismissSplash();

                    // ==========================================
                    // 🛑 3. THE DEEP BACK-BUTTON TRAP
                    // ==========================================
                    // We push 10 states so a rapid swipe still hits a trap layer
                    for (let i = 0; i < 10; i++) {
                        history.pushState(null, '', location.href);
                    }
                    
                    window.onpopstate = function () {
                        if (sessionStorage.getItem('bryt_unlocked') !== 'true') {
                            history.pushState(null, '', location.href);
                        }
                    };
                }
            } else {
                dismissSplash();
            }
        } else {
            dismissSplash();
        }
    }

    function dismissSplash() {
        if (splash) {
            if (splashShown === 'true') {
                splash.remove();
            } else {
                const minSplashTime = new Promise(resolve => setTimeout(resolve, 1500));
                minSplashTime.then(() => {
                    splash.classList.add('hidden');
                    sessionStorage.setItem('bryt_dash_splash_shown', 'true');
                    setTimeout(() => splash.remove(), 500); 
                });
            }
        }
    }

    // Trigger initialization immediately
    initializeAppState();

    // ==========================================
    // 🔒 UNLOCK KEYPAD LOGIC
    // ==========================================
    function initUnlockKeypad() {
        const uDots = document.querySelectorAll('.u-dot');
        const uBtns = document.querySelectorAll('.u-key');
        const uErr = document.getElementById('unlock-error');
        let enteredPin = '';

        function updateUDots() {
            uDots.forEach((dot, idx) => {
                if (idx < enteredPin.length) dot.classList.add('filled');
                else dot.classList.remove('filled');
            });
            
            if (enteredPin.length === 4) {
                verifyUnlock();
            }
        }

        function verifyUnlock() {
            if (enteredPin === userPin) {
                uErr.textContent = '';
                sessionStorage.setItem('bryt_unlocked', 'true');
                unlockScreen.style.opacity = '0';
                
                window.onpopstate = null; // Release the back-button trap
                
                setTimeout(() => { unlockScreen.remove(); }, 300);
            } else {
                uErr.textContent = 'Incorrect PIN';
                enteredPin = '';
                const display = document.querySelector('.pin-display');
                display.style.transform = 'translateX(10px)';
                setTimeout(() => display.style.transform = 'translateX(-10px)', 50);
                setTimeout(() => display.style.transform = 'translateX(10px)', 100);
                setTimeout(() => display.style.transform = 'translateX(0)', 150);
                updateUDots();
            }
        }

        uBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                uErr.textContent = ''; 
                const val = btn.getAttribute('data-val');
                if (val === 'back') {
                    enteredPin = enteredPin.slice(0, -1);
                } else {
                    if (enteredPin.length < 4) enteredPin += val;
                }
                updateUDots();
            });
        });

        const unlockLogoutBtn = document.getElementById('btn-unlock-logout');
        if (unlockLogoutBtn) {
            unlockLogoutBtn.addEventListener('click', async () => {
                unlockLogoutBtn.textContent = 'Signing out...';
                sessionStorage.clear();
                await window.db.auth.signOut();
                window.location.replace('/auth/login.html');
            });
        }
    }

    // ==========================================
    // 🔑 INLINE UNLOCK RECOVERY (FORGOT PIN)
    // ==========================================
    const btnTriggerForgot = document.getElementById('btn-trigger-forgot-pin');
    const mainView = document.getElementById('unlock-main-view');
    const recView = document.getElementById('unlock-recovery-view');
    
    if (btnTriggerForgot && mainView && recView) {
        btnTriggerForgot.addEventListener('click', () => {
            mainView.style.display = 'none';
            recView.style.display = 'block';
        });

        document.getElementById('btn-cancel-recovery').addEventListener('click', () => {
            recView.style.display = 'none';
            mainView.style.display = 'block';
            document.getElementById('unlock-recovery-step1').style.display = 'block';
            document.getElementById('unlock-recovery-step2').style.display = 'none';
            document.getElementById('unlock-recovery-desc').textContent = 'Click below to send a secure 6-digit recovery code to your registered email.';
        });

        const btnUnlockSend = document.getElementById('btn-unlock-send-otp');
        btnUnlockSend.addEventListener('click', async () => {
            btnUnlockSend.disabled = true; btnUnlockSend.textContent = 'Sending...';
            try {
                const { data, error } = await window.db.functions.invoke('reset-pin', { body: { action: 'send' } });
                if (error) throw error;
                if (data && data.error) throw new Error(data.error);
                
                document.getElementById('unlock-recovery-step1').style.display = 'none';
                document.getElementById('unlock-recovery-step2').style.display = 'block';
                document.getElementById('unlock-recovery-desc').innerHTML = '<span style="color: #10b981; font-weight: bold;">Code sent!</span> Enter the 6-digit code and your new PIN.';
            } catch (err) {
                alert(err.message || 'Error sending code.');
            }
            btnUnlockSend.disabled = false; btnUnlockSend.textContent = 'Send Recovery Code';
        });

        const btnUnlockVerify = document.getElementById('btn-unlock-verify-otp');
        btnUnlockVerify.addEventListener('click', async () => {
            const otp = document.getElementById('unlock-recovery-otp').value;
            const newPin = document.getElementById('unlock-recovery-newpin').value;
            
            if (otp.length !== 6) return alert("Please enter the 6-digit code from your email.");
            if (newPin.length !== 4) return alert("Your new PIN must be exactly 4 digits.");
            
            btnUnlockVerify.disabled = true; btnUnlockVerify.textContent = 'Verifying...';
            
            try {
                const { data, error } = await window.db.functions.invoke('reset-pin', { body: { action: 'verify', otp, newPin } });
                if (error) throw error;
                if (data && data.error) throw new Error(data.error);
                
                userPin = newPin; 
                sessionStorage.setItem('bryt_unlocked', 'true'); 
                unlockScreen.style.opacity = '0';
                window.onpopstate = null; // Release trap
                setTimeout(() => { unlockScreen.remove(); }, 300);
            } catch (err) {
                alert(err.message || 'Error verifying code.');
                btnUnlockVerify.disabled = false; btnUnlockVerify.textContent = 'Verify & Reset PIN';
            }
        });
    }

    // ==========================================
    // ⚙️ INITIALIZE PIN SETUP (FIRST TIME)
    // ==========================================
    function initPinSetup() {
        const overlay = document.getElementById('pin-setup-overlay');
        const dots = document.querySelectorAll('.pin-dot:not(.u-dot)');
        const keypadBtns = document.querySelectorAll('.keypad-btn:not(.u-key)');
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
            
            const { error } = await window.db.from('profiles').update({ transaction_pin: currentPin }).eq('id', user.id);
            
            if (error) {
                alert('Connection error. Please try again.');
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Save PIN';
            } else {
                saveBtn.style.background = '#10b981';
                saveBtn.innerHTML = 'PIN Saved! ✓';
                userPin = currentPin; 
                setTimeout(() => { overlay.classList.remove('active'); }, 1000);
            }
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

        if (srvType === 'bank_transfer') return `TRANSFER TO ${provider}`;

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
        if (raw.includes('bank_transfer') || raw.includes('transfer')) return `<div class="tx-brand" style="width: 36px; height: 36px; border-radius: 12px; background: rgba(29, 94, 208, 0.1); color: var(--bryt-primary); border: 1px solid rgba(29, 94, 208, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></div>`;

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
    loadWallet();
    loadTransactions();
    managePushConsent();
});