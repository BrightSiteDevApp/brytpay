document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let selectedNetwork = 'dstv';
    let selectedLogo = 'dstv-logo.png';
    let verifiedCustomerName = null;
    let currentBalance = 0;
    let userPin = '';
    let currentPinInput = '';

    // 🚀 SMART ROUTING
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/services/')) {
            backBtn.href = '/dashboard/services/index.html';
        } else {
            backBtn.href = '/dashboard/index.html';
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('bryt-toast');
        const toastText = document.getElementById('toast-text');
        const iconWrap = document.getElementById('toast-icon-wrap');
        
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
            const l1 = document.createElementNS(svgNS, "line");
            l1.setAttribute("x1", "18"); l1.setAttribute("y1", "6"); l1.setAttribute("x2", "6"); l1.setAttribute("y2", "18");
            const l2 = document.createElementNS(svgNS, "line");
            l2.setAttribute("x1", "6"); l2.setAttribute("y1", "6"); l2.setAttribute("x2", "18"); l2.setAttribute("y2", "18");
            svg.appendChild(l1); svg.appendChild(l2);
        }
        iconWrap.appendChild(svg);
        
        toastText.textContent = message; 
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    const tvPlans = {
        'dstv': [
            { code: 3, price: 4488, label: 'DStv Padi' },
            { code: 6, price: 6120, label: 'DStv Yanga' },
            { code: 7, price: 11220, label: 'DStv Confam' },
            { code: 8, price: 19380, label: 'DStv Compact' },
            { code: 9, price: 30600, label: 'DStv Compact Plus' },
            { code: 10, price: 45390, label: 'DStv Premium' }
        ],
        'gotv': [
            { code: 4, price: 1938, label: 'GOtv Smallie - Monthly' },
            { code: 11, price: 3978, label: 'GOtv Jinja' },
            { code: 12, price: 5916, label: 'GOtv Jolli' },
            { code: 13, price: 8670, label: 'GOtv Max' },
            { code: 14, price: 11628, label: 'GOtv Supa' },
            { code: 15, price: 17136, label: 'GOtv Supa Plus' }
        ],
        'startimes': [
            { code: 5, price: 714, label: 'Nova (Antenna) - 1 Week' },
            { code: 16, price: 714, label: 'Nova (Dish) - 1 Week' },
            { code: 17, price: 2142, label: 'Nova (Antenna) - 1 Month' },
            { code: 18, price: 1428, label: 'Basic (Antenna) - 1 Week' },
            { code: 19, price: 1734, label: 'Basic (Dish) - 1 Week' },
            { code: 20, price: 4080, label: 'Basic (Antenna) - 1 Month' },
            { code: 21, price: 5202, label: 'Basic (Dish) - 1 Month' },
            { code: 22, price: 2550, label: 'Classic (Dish) - 1 Week' },
            { code: 23, price: 7548, label: 'Classic (Dish) - 1 Month' },
            { code: 25, price: 3264, label: 'Super (Antenna) - 1 Week' },
            { code: 24, price: 3366, label: 'Super (Dish) - 1 Week' },
            { code: 26, price: 9690, label: 'Super (Antenna) - 1 Month' }
        ]
    };

    const hiddenPlanInput = document.getElementById('tv-plan');
    const smartcardInput = document.getElementById('smartcard');
    const verifyBtn = document.getElementById('verify-btn');
    const nameBox = document.getElementById('customer-name-box');
    const submitBtn = document.getElementById('submit-btn');
    const inputLabel = document.getElementById('input-label');

    const selectWrapper = document.getElementById('custom-select-wrapper');
    const selectTrigger = document.getElementById('custom-select-trigger');
    const selectText = document.getElementById('custom-select-text');
    const optionsList = document.getElementById('custom-options-list');

    // PIN Bottom Sheet Elements
    const pinModal = document.getElementById('pin-modal-overlay');
    const pinDots = document.querySelectorAll('.pin-dot');
    const keypadBtns = document.querySelectorAll('.keypad-btn');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');

    const successOverlay = document.getElementById('success-overlay');

    async function loadProfileAndBalance() {
        const { data: wallet } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (wallet) {
            currentBalance = parseFloat(wallet.balance);
            document.getElementById('user-balance').textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }

        const { data: profile } = await window.db.from('profiles').select('transaction_pin').eq('id', user.id).single();
        if (profile && profile.transaction_pin) {
            userPin = profile.transaction_pin;
        }
    }
    await loadProfileAndBalance();

    selectTrigger.addEventListener('click', () => {
        selectWrapper.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) selectWrapper.classList.remove('open');
    });

    function updateButton() {
        if (hiddenPlanInput.value) {
            const [, priceStr] = hiddenPlanInput.value.split('|');
            const amt = parseFloat(priceStr);
            submitBtn.innerHTML = `Pay ₦${amt.toLocaleString('en-NG')} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
        } else {
            submitBtn.innerHTML = `Proceed <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
        }
    }

    function renderDropdownOptions() {
        optionsList.textContent = '';
        const currentPlans = tvPlans[selectedNetwork] || [];

        hiddenPlanInput.value = '';
        updateButton();

        smartcardInput.disabled = false;
        selectText.textContent = 'Select a package...';
        selectText.style.opacity = '0.6';

        currentPlans.forEach(plan => {
            const formattedPrice = `₦${plan.price.toLocaleString('en-NG')}`;
            const opt = document.createElement('div');
            opt.className = 'custom-option';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = plan.label;
            const priceStrong = document.createElement('strong');
            priceStrong.textContent = formattedPrice;

            opt.appendChild(nameSpan); 
            opt.appendChild(priceStrong);
            opt.dataset.value = `${plan.code}|${plan.price}|${plan.label}`;
            
            opt.addEventListener('click', () => {
                hiddenPlanInput.value = opt.dataset.value;
                selectText.textContent = `${plan.label} — ${formattedPrice}`;
                selectText.style.opacity = '1';
                selectWrapper.classList.remove('open');
                updateButton();
            });
            optionsList.appendChild(opt);
        });

        resetVerification();
    }
    
    renderDropdownOptions(); 

    function resetVerification() {
        verifiedCustomerName = null;
        nameBox.style.display = 'none';
        nameBox.style.background = 'rgba(34, 197, 94, 0.1)';
        nameBox.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        nameBox.style.color = '#16a34a';
        nameBox.innerHTML = '';
        
        inputLabel.textContent = "3. Smartcard / IUC Number";
        smartcardInput.placeholder = "e.g. 1029384756";
        verifyBtn.style.display = 'block';
        verifyBtn.disabled = false;
        submitBtn.disabled = true;
        verifyBtn.textContent = 'Verify';
    }

    document.querySelectorAll('.network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.network-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedNetwork = btn.getAttribute('data-network');
            selectedLogo = btn.getAttribute('data-logo');
            renderDropdownOptions();
        });
    });

    smartcardInput.addEventListener('input', resetVerification);

    verifyBtn.addEventListener('click', async () => {
        const smartcard = smartcardInput.value.trim();
        if (!smartcard) return showToast("Enter a Smartcard or IUC number", "error");

        verifyBtn.textContent = 'Wait...';
        verifyBtn.disabled = true;

        try {
            const { data: resData, error } = await window.db.functions.invoke('verify-tv-swift', {
                body: { network: selectedNetwork, smartcard: smartcard }
            });

            if (error) throw new Error(error.message);
            if (resData && !resData.success) throw new Error(resData.message);

            verifiedCustomerName = resData.customer_name;
            nameBox.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> <span><strong>Account:</strong> ${verifiedCustomerName}</span>`;
            nameBox.style.display = 'flex';
            submitBtn.disabled = false;
            verifyBtn.textContent = 'Verified';
            showToast("Account Verified Successfully", "success");

        } catch (err) {
            showToast(err.message, "error");
            verifyBtn.textContent = 'Verify';
            verifyBtn.disabled = false;
        }
    });

    // 🚀 CUSTOM PIN LOGIC
    function updatePinUI() {
        pinDots.forEach((dot, idx) => {
            if (idx < currentPinInput.length) dot.classList.add('filled');
            else dot.classList.remove('filled');
        });
        btnConfirm.disabled = currentPinInput.length !== 4;
    }

    keypadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (val === 'back') {
                currentPinInput = currentPinInput.slice(0, -1);
            } else if (val) {
                if (currentPinInput.length < 4) currentPinInput += val;
            }
            updatePinUI();
        });
    });

    document.getElementById('tv-form').addEventListener('submit', (e) => {
        e.preventDefault();

        if (!verifiedCustomerName) return showToast("Please verify the Account first.", "error");
        if (!hiddenPlanInput.value) return showToast("Please select a package.", "error");

        const [, priceStr, label] = hiddenPlanInput.value.split('|');
        const amount = parseFloat(priceStr);

        if (amount > currentBalance) {
            return showToast(`Insufficient balance. Requires ₦${amount.toLocaleString()}.`, "error");
        }

        document.getElementById('modal-network-logo').src = `../../assets/img/${selectedLogo}`;
        document.getElementById('modal-name').textContent = verifiedCustomerName;
        document.getElementById('modal-plan').textContent = label;
        document.getElementById('modal-amount').textContent = `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        
        currentPinInput = '';
        updatePinUI();
        pinModal.classList.add('active');
    });

    btnCancel.addEventListener('click', () => {
        pinModal.classList.remove('active');
        currentPinInput = '';
        updatePinUI();
    });

    btnConfirm.addEventListener('click', async () => {
        if (!userPin) return showToast('Please set your 4-digit PIN in your security settings first.', 'error');
        if (currentPinInput !== userPin) return showToast('Incorrect PIN. Try again.', 'error');

        const [plan_code] = hiddenPlanInput.value.split('|');
        btnConfirm.disabled = true; 
        btnCancel.disabled = true;
        btnConfirm.textContent = 'Processing...';

        try {
            const { data: resData, error } = await window.db.functions.invoke('vend-tv-swift', {
                body: { 
                    network: selectedNetwork, 
                    smartcard: smartcardInput.value.trim(), 
                    plan_id: parseInt(plan_code),
                    pin: currentPinInput
                }
            });

            if (error) throw new Error(error.message);
            if (resData && !resData.success) throw new Error(resData.message);

            pinModal.classList.remove('active');
            successOverlay.classList.add('active');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            showToast(err.message, "error");
            btnConfirm.disabled = false; 
            btnCancel.disabled = false;
            btnConfirm.textContent = 'Pay Now';
            pinModal.classList.remove('active');
        }
    });
});