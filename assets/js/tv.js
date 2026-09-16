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

   // ACCURATE 2% PRICING FROM API TIER
    const tvPlans = {
        'dstv': [
            { code: 'padi', price: 4498, label: 'DStv Padi' },
            { code: 'yanga', price: 6133, label: 'DStv Yanga' },
            { code: 'confam', price: 11243, label: 'DStv Confam' },
            { code: 'compact', price: 19418, label: 'DStv Compact' },
            { code: 'compact_plus', price: 30661, label: 'DStv Compact Plus' },
            { code: 'premium', price: 45479, label: 'DStv Premium' }
        ],
        'gotv': [
            { code: 'smallie', price: 1943, label: 'GOtv Smallie' },
            { code: 'jinja', price: 3987, label: 'GOtv Jinja' },
            { code: 'jolli', price: 5928, label: 'GOtv Jolli' },
            { code: 'max', price: 8688, label: 'GOtv Max' },
            { code: 'supa', price: 11243, label: 'GOtv Supa' }
        ],
        'startimes': [
            { code: 'nova', price: 1932, label: 'StarTimes Nova' },
            { code: 'basic', price: 3763, label: 'StarTimes Basic' },
            { code: 'smart', price: 4780, label: 'StarTimes Smart' },
            { code: 'classic', price: 5593, label: 'StarTimes Classic' },
            { code: 'super', price: 9152, label: 'StarTimes Super' }
        ],
        'showmax': [
            { code: 'mobile_only', price: 2071, label: 'Showmax Mobile Only' },
            { code: 'sports', price: 6728, label: 'Showmax Sports Mobile' },
            { code: 'full', price: 4658, label: 'Showmax Full' }
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

    const confirmModal = document.getElementById('confirm-modal');

    const { data: walletData } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
    if (walletData) {
        document.getElementById('user-balance').textContent = `₦${parseFloat(walletData.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }

    selectTrigger.addEventListener('click', () => selectWrapper.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) selectWrapper.classList.remove('open');
    });

    function renderDropdownOptions() {
        optionsList.textContent = '';
        const currentPlans = tvPlans[selectedNetwork] || [];

        selectText.textContent = 'Select a package...';
        selectText.style.opacity = '0.6';
        hiddenPlanInput.value = '';

        currentPlans.forEach(plan => {
            const formattedPrice = `₦${plan.price.toLocaleString('en-NG')}`;
            const opt = document.createElement('div');
            opt.className = 'custom-option';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = plan.label;
            const priceStrong = document.createElement('strong');
            priceStrong.textContent = formattedPrice;

            opt.appendChild(nameSpan); opt.appendChild(priceStrong);
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
        nameBox.textContent = '';
        
        // SMART BYPASS FOR SHOWMAX
        if (selectedNetwork === 'showmax') {
            inputLabel.textContent = "Registered Phone Number";
            smartcardInput.placeholder = "08012345678";
            verifyBtn.style.display = 'none'; // Hide verify button
            submitBtn.disabled = false;       // Auto-enable proceed button
            verifiedCustomerName = "Showmax User"; // Dummy name for bypass
        } else {
            inputLabel.textContent = "Smartcard / IUC Number";
            smartcardInput.placeholder = "e.g. 1029384756";
            verifyBtn.style.display = 'inline-flex';
            submitBtn.disabled = true;
            verifyBtn.textContent = 'Verify';
        }
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

    // Verify Smartcard (Only for DStv, GOtv, StarTimes)
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
        
        // Dynamic Name handling for Showmax
        if (selectedNetwork === 'showmax') {
            verifiedCustomerName = smartcardInput.value.trim();
        }

        if (!verifiedCustomerName) return showToast("Please verify the Account first.", "error");
        if (!hiddenPlanInput.value) return showToast("Please select a package.", "error");

        const [plan_code, priceStr, label] = hiddenPlanInput.value.split('|');

        document.getElementById('modal-network-logo').src = `../../assets/img/${selectedLogo}`;
        document.getElementById('modal-name').textContent = selectedNetwork === 'showmax' ? `Phone: ${verifiedCustomerName}` : verifiedCustomerName;
        document.getElementById('modal-plan').textContent = label;
        document.getElementById('modal-amount').textContent = `₦${parseFloat(priceStr).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        
        confirmModal.style.display = 'flex';
    });

    document.getElementById('modal-cancel').addEventListener('click', () => confirmModal.style.display = 'none');

    document.getElementById('modal-confirm').addEventListener('click', async () => {
        const [plan_code, priceStr, label] = hiddenPlanInput.value.split('|');
        const btn = document.getElementById('modal-confirm');
        btn.disabled = true; document.getElementById('modal-cancel').disabled = true;
        btn.textContent = 'Processing...';

        try {
            const { data: resData, error } = await window.db.functions.invoke('vend-tv-swift', {
                body: { 
                    network: selectedNetwork, 
                    smartcard: smartcardInput.value.trim(), 
                    plan_code: plan_code,
                    plan_name: label
                }
            });

            if (error) throw new Error(error.message);
            if (resData && !resData.success) throw new Error(resData.message);

            showToast(resData.message || `Success! TV Subscription activated.`, "success");
            confirmModal.style.display = 'none';
            setTimeout(() => window.location.reload(), 2500);

        } catch (err) {
            showToast(err.message, "error");
            btn.disabled = false; document.getElementById('modal-cancel').disabled = false;
            btn.textContent = 'Pay Securely';
            confirmModal.style.display = 'none';
        }
    });
});