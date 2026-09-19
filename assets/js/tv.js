document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let selectedNetwork = 'dstv';
    let selectedLogo = 'dstv-logo.png';
    let verifiedCustomerName = null;

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

    // 🚀 EXACT PLAN IDs WITH 2% PROFIT MARGIN APPLIED (Cost x 1.02)
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
        ],
        'showmax': [] // Handled via unavailable state
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

    const confirmModal = document.getElementById('confirm-modal');

    const { data: walletData } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
    if (walletData) {
        document.getElementById('user-balance').textContent = `₦${parseFloat(walletData.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }

    selectTrigger.addEventListener('click', () => {
        if (selectedNetwork === 'showmax') {
            showToast("Showmax subscriptions are currently unavailable.", "error");
            return;
        }
        selectWrapper.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) selectWrapper.classList.remove('open');
    });

    function renderDropdownOptions() {
        optionsList.textContent = '';
        const currentPlans = tvPlans[selectedNetwork] || [];

        hiddenPlanInput.value = '';

        if (selectedNetwork === 'showmax') {
            selectText.textContent = 'Service Currently Unavailable';
            selectText.style.opacity = '0.5';
            smartcardInput.disabled = true;
            verifyBtn.disabled = true;
            submitBtn.disabled = true;
            nameBox.style.display = 'block';
            nameBox.style.background = '#fef2f2';
            nameBox.style.borderColor = '#fecaca';
            nameBox.style.color = '#b91c1c';
            nameBox.textContent = '⚠️ Showmax is currently undergoing maintenance and is not available right now.';
            return;
        }

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
            });
            optionsList.appendChild(opt);
        });

        resetVerification();
    }
    renderDropdownOptions();

    function resetVerification() {
        verifiedCustomerName = null;
        nameBox.style.display = 'none';
        nameBox.style.background = '#f0fdf4';
        nameBox.style.borderColor = '#bbf7d0';
        nameBox.style.color = '#166534';
        nameBox.textContent = '';
        
        inputLabel.textContent = "Smartcard / IUC Number";
        smartcardInput.placeholder = "e.g. 1029384756";
        verifyBtn.style.display = 'inline-flex';
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
        if (selectedNetwork === 'showmax') {
            return showToast("Showmax is currently unavailable.", "error");
        }

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
            nameBox.textContent = `✓ Account: ${verifiedCustomerName}`;
            nameBox.style.display = 'block';
            submitBtn.disabled = false;
            verifyBtn.textContent = 'Verified';
            showToast("Account Verified Successfully", "success");

        } catch (err) {
            showToast(err.message, "error");
            verifyBtn.textContent = 'Verify';
            verifyBtn.disabled = false;
        }
    });

    document.getElementById('tv-form').addEventListener('submit', (e) => {
        e.preventDefault();

        if (selectedNetwork === 'showmax') {
            return showToast("Showmax is currently unavailable.", "error");
        }

        if (!verifiedCustomerName) return showToast("Please verify the Account first.", "error");
        if (!hiddenPlanInput.value) return showToast("Please select a package.", "error");

        const [plan_code, priceStr, label] = hiddenPlanInput.value.split('|');

        document.getElementById('modal-network-logo').src = `../../assets/img/${selectedLogo}`;
        document.getElementById('modal-name').textContent = verifiedCustomerName;
        document.getElementById('modal-plan').textContent = label;
        document.getElementById('modal-amount').textContent = `₦${parseFloat(priceStr).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        
        confirmModal.style.display = 'flex';
    });

    document.getElementById('modal-cancel').addEventListener('click', () => confirmModal.style.display = 'none');

    document.getElementById('modal-confirm').addEventListener('click', async () => {
        const [plan_code, priceStr, label] = hiddenPlanInput.value.split('|');
        const btn = document.getElementById('modal-confirm');
        btn.disabled = true; 
        document.getElementById('modal-cancel').disabled = true;
        btn.textContent = 'Processing...';

        try {
            const { data: resData, error } = await window.db.functions.invoke('vend-tv-swift', {
                body: { 
                    network: selectedNetwork, 
                    smartcard: smartcardInput.value.trim(), 
                    plan_id: parseInt(plan_code)
                }
            });

            if (error) throw new Error(error.message);
            if (resData && !resData.success) throw new Error(resData.message);

            showToast(resData.message || `Success! TV Subscription activated.`, "success");
            confirmModal.style.display = 'none';
            setTimeout(() => window.location.reload(), 2500);

        } catch (err) {
            showToast(err.message, "error");
            btn.disabled = false; 
            document.getElementById('modal-cancel').disabled = false;
            btn.textContent = 'Pay Securely';
            confirmModal.style.display = 'none';
        }
    });
});