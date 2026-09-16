document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    
    let selectedNetwork = 'mtn';
    let selectedType = 'sme-data';
    let selectedLogo = 'mtn-logo.png';

    // XSS-Safe Toast Notification using textContent
    function showToast(message, type = 'success') {
        const toast = document.getElementById('bryt-toast');
        const toastText = document.getElementById('toast-text');
        const iconWrap = document.getElementById('toast-icon-wrap');
        
        toast.className = `bryt-toast toast-${type}`;
        
        iconWrap.textContent = '';
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "14");
        svg.setAttribute("height", "14");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "3");

        if (type === 'success') {
            const poly = document.createElementNS(svgNS, "polyline");
            poly.setAttribute("points", "20 6 9 17 4 12");
            svg.appendChild(poly);
        } else {
            const l1 = document.createElementNS(svgNS, "line");
            l1.setAttribute("x1", "18"); l1.setAttribute("y1", "6"); l1.setAttribute("x2", "6"); l1.setAttribute("y2", "18");
            const l2 = document.createElementNS(svgNS, "line");
            l2.setAttribute("x1", "6"); l2.setAttribute("y1", "6"); l2.setAttribute("x2", "18"); l2.setAttribute("y2", "18");
            svg.appendChild(l1); svg.appendChild(l2);
        }
        iconWrap.appendChild(svg);
        
        toastText.textContent = message; // Safe against XSS
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // EXACT 5% MARGIN PLANS CATALOG
    const curatedCheapPlans = {
        'mtn_sme-data': [
            { code: '1gb', price: 574,  label: 'MTN 1GB SME (30 Days)' },
            { code: '2gb', price: 1002, label: 'MTN 2GB SME (30 Days)' },
            { code: '3gb', price: 1392, label: 'MTN 3GB SME (30 Days)' },
            { code: '5gb', price: 1670, label: 'MTN 5GB SME (30 Days)' }
        ],
        'mtn_shared-data': [
            { code: '1gb_1day',   price: 273,  label: 'MTN 1GB CG (1 Day)' },
            { code: '2.5gb_1day', price: 646,  label: 'MTN 2.5GB CG (1 Day)' },
            { code: '500mb',      price: 263,  label: 'MTN 500MB CG (7 Days)', type: 'cg-data' },
            { code: '1gb',        price: 420,  label: 'MTN 1GB CG (7 Days)', type: 'cg-data' },
            { code: '2gb',        price: 840,  label: 'MTN 2GB CG (7 Days)', type: 'cg-data' },
            { code: '3gb',        price: 1050, label: 'MTN 3GB CG (7 Days)', type: 'cg-data' },
            { code: '5gb_14days', price: 1336, label: 'MTN 5GB CG (14 Days)' },
            { code: '10gb_30days',price: 2560, label: 'MTN 10GB CG (30 Days)' }
        ],
        'airtel_dd-data': [
            { code: '499.91',  price: 512,  label: 'Airtel 1GB Awoof (1 Day)' },
            { code: '599.91',  price: 615,  label: 'Airtel 1.5GB Awoof (2 Days)' },
            { code: '749.91',  price: 768,  label: 'Airtel 2GB Awoof (2 Days)' },
            { code: '999.91',  price: 1024, label: 'Airtel 3GB Awoof (2 Days)' },
            { code: '1499.91', price: 1536, label: 'Airtel 5GB Awoof (2 Days)' }
        ],
        'glo_sme-data': [
            { code: '1gb', price: 368,  label: 'Glo 1GB SME (7 Days)' },
            { code: '3gb', price: 1102, label: 'Glo 3GB SME (7 Days)' },
            { code: '5gb', price: 1837, label: 'Glo 5GB SME (7 Days)' }
        ],
        'glo_cg-data': [
            { code: '200mb', price: 147,  label: 'Glo 200MB CG (14 Days)' },
            { code: '500mb', price: 242,  label: 'Glo 500MB CG (30 Days)' },
            { code: '1gb',   price: 462,  label: 'Glo 1GB CG (30 Days)' },
            { code: '2gb',   price: 924,  label: 'Glo 2GB CG (30 Days)' },
            { code: '3gb',   price: 1386, label: 'Glo 3GB CG (30 Days)' },
            { code: '5gb',   price: 2310, label: 'Glo 5GB CG (30 Days)' },
            { code: '10gb',  price: 4620, label: 'Glo 10GB CG (30 Days)' }
        ],
        '9mobile_cg-data': [
            { code: '500mb', price: 200,  label: '9mobile 500MB (30 Days)' },
            { code: '1gb',   price: 389,  label: '9mobile 1GB (30 Days)' },
            { code: '2gb',   price: 777,  label: '9mobile 2GB (30 Days)' },
            { code: '3gb',   price: 1166, label: '9mobile 3GB (30 Days)' },
            { code: '5gb',   price: 1943, label: '9mobile 5GB (30 Days)' },
            { code: '10gb',  price: 3885, label: '9mobile 10GB (30 Days)' }
        ]
    };

    const phoneInput = document.getElementById('phone');
    const hiddenPlanInput = document.getElementById('data-plan');
    const selectWrapper = document.getElementById('custom-select-wrapper');
    const selectTrigger = document.getElementById('custom-select-trigger');
    const selectText = document.getElementById('custom-select-text');
    const optionsList = document.getElementById('custom-options-list');
    
    const confirmModal = document.getElementById('confirm-modal');
    const modalPlan = document.getElementById('modal-plan');
    const modalPhone = document.getElementById('modal-phone');
    const modalAmount = document.getElementById('modal-amount');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalLogo = document.getElementById('modal-network-logo');

    // Fetch Wallet Balance
    const { data: walletData } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
    if (walletData) {
        document.getElementById('user-balance').textContent = `₦${parseFloat(walletData.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }

    // Dropdown UI Handlers
    selectTrigger.addEventListener('click', () => selectWrapper.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) selectWrapper.classList.remove('open');
    });

    function renderDropdownOptions() {
        optionsList.textContent = '';
        const combinedKey = `${selectedNetwork}_${selectedType}`;
        const currentPlans = curatedCheapPlans[combinedKey] || [];

        if (currentPlans.length === 0) {
            selectText.textContent = 'No plans available for this category';
            selectText.style.opacity = '0.6';
            hiddenPlanInput.value = '';
            return;
        }

        selectText.textContent = 'Select a data plan...';
        selectText.style.opacity = '0.6';
        hiddenPlanInput.value = '';

        currentPlans.forEach(plan => {
            const finalType = plan.type || selectedType;
            const formattedPrice = `₦${plan.price.toLocaleString('en-NG')}`;
            
            const opt = document.createElement('div');
            opt.className = 'custom-option';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = plan.label;
            const priceStrong = document.createElement('strong');
            priceStrong.textContent = formattedPrice;

            opt.appendChild(nameSpan);
            opt.appendChild(priceStrong);

            opt.dataset.value = `${plan.code}|${plan.price}|${selectedNetwork}|${finalType}|${plan.label}`;
            
            opt.addEventListener('click', () => {
                hiddenPlanInput.value = opt.dataset.value;
                selectText.textContent = `${plan.label} — ${formattedPrice}`;
                selectText.style.opacity = '1';
                selectWrapper.classList.remove('open');
            });
            
            optionsList.appendChild(opt);
        });
    }
    renderDropdownOptions();

    // Network Selector Buttons
    document.querySelectorAll('.network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.network-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            selectedNetwork = btn.getAttribute('data-network');
            selectedType = btn.getAttribute('data-type');
            selectedLogo = btn.getAttribute('data-logo');
            
            renderDropdownOptions();
        });
    });

    // Form Submission
    document.getElementById('data-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = phoneInput.value.trim();

        if (!hiddenPlanInput.value) {
            showToast("Please select a data plan.", "error");
            return;
        }

        const [plan_code, priceStr, network, data_type, label] = hiddenPlanInput.value.split('|');

        if (phone.length !== 11 || !/^[0-9]+$/.test(phone)) {
            showToast("Please enter a valid 11-digit phone number.", "error");
            return;
        }

        modalLogo.src = `../../assets/img/${selectedLogo}`;
        modalPlan.textContent = label;
        modalPhone.textContent = phone;
        modalAmount.textContent = `₦${parseFloat(priceStr).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        confirmModal.style.display = 'flex';
    });

    modalCancel.addEventListener('click', () => confirmModal.style.display = 'none');

    // Secure Payment Execution
    modalConfirm.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        const [plan_code, priceStr, network, data_type] = hiddenPlanInput.value.split('|');

        modalConfirm.disabled = true;
        modalCancel.disabled = true;
        modalConfirm.textContent = 'Processing...';

        try {
            // Note: We DO NOT send `amount` from client. Server enforces the price.
            const { data: resData, error } = await window.db.functions.invoke('vend-data-swift', {
                body: {
                    network: network,
                    data_type: data_type,
                    plan_code: plan_code,
                    phone: phone
                }
            });

            if (error) throw new Error(error.message);
            if (resData && resData.success === false) throw new Error(resData.message);

            showToast(resData.message || `Success! Data sent to ${phone}.`, "success");
            confirmModal.style.display = 'none';
            setTimeout(() => window.location.reload(), 2500);

        } catch (err) {
            showToast(err.message, "error");
            modalConfirm.disabled = false;
            modalCancel.disabled = false;
            modalConfirm.textContent = 'Pay Securely';
            confirmModal.style.display = 'none';
        }
    });
});