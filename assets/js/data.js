document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let selectedNetwork = 'mtn';
    let selectedType = 'sme-data';
    let selectedLogo = 'mtn-logo.png';

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
        toastText.textContent = message; 
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // 🚀 EXACT PLAN IDs + STRICT 5% PROFIT MARGIN
    const curatedCheapPlans = {
        'mtn_sme-data': [ // The "MTN SME" button
            { code: '46', price: 599,  label: 'MTN 1GB SME (30 Days)' },
            { code: '48', price: 1208, label: 'MTN 2GB SME (30 Days)' },
            { code: '49', price: 1439, label: 'MTN 3GB SME (30 Days)' },
            { code: '50', price: 2153, label: 'MTN 5GB SME (30 Days)' }
        ],
        'mtn_shared-data': [ // The "MTN CG / SHARED" button
            { code: '44', price: 315,  label: 'MTN 500MB Data Share (30 Days)' },
            { code: '71', price: 945,  label: 'MTN 2GB Gifting (7 Days)' }
        ],
        'airtel_dd-data': [ // The "Airtel AWOOF" button
            { code: '69', price: 525,  label: 'Airtel 1.5GB Gifting (1 Day)' },
            { code: '15', price: 840,  label: 'Airtel 1GB Gifting (7 Days)' },
            { code: '17', price: 1565, label: 'Airtel 2GB Gifting (30 Days)' },
            { code: '18', price: 2058, label: 'Airtel 3GB Gifting (30 Days)' },
            { code: '52', price: 1649, label: 'Airtel 5GB Gifting (7 Days)' },
            { code: '21', price: 4274, label: 'Airtel 10GB Gifting (30 Days)' }
        ],
        'glo_sme-data': [ // The "Glo SME" button
            { code: '84', price: 263,  label: 'Glo 1GB (1 Day)' }, // 🚀 NEW GLO PLAN
            { code: '35', price: 237,  label: 'Glo 500MB CG (30 Days)' },
            { code: '36', price: 447,  label: 'Glo 1GB CG (30 Days)' },
            { code: '40', price: 893,  label: 'Glo 2GB CG (30 Days)' },
            { code: '37', price: 1365, label: 'Glo 3GB CG (30 Days)' },
            { code: '38', price: 2363, label: 'Glo 5GB CG (30 Days)' },
            { code: '39', price: 4610, label: 'Glo 10GB CG (30 Days)' }
        ],
        'glo_cg-data': [ // The "Glo CG / GIFT" button (We mirror the same list here so it is not empty)
            { code: '84', price: 263,  label: 'Glo 1GB (1 Day)' }, // 🚀 NEW GLO PLAN
            { code: '35', price: 237,  label: 'Glo 500MB CG (30 Days)' },
            { code: '36', price: 447,  label: 'Glo 1GB CG (30 Days)' },
            { code: '40', price: 893,  label: 'Glo 2GB CG (30 Days)' },
            { code: '37', price: 1365, label: 'Glo 3GB CG (30 Days)' },
            { code: '38', price: 2363, label: 'Glo 5GB CG (30 Days)' },
            { code: '39', price: 4610, label: 'Glo 10GB CG (30 Days)' }
        ],
        '9mobile_cg-data': [ // The "9mobile SME / CG" button
            { code: '91', price: 250,  label: '9mobile 500MB (30 Days)' }, 
            { code: '92', price: 450,  label: '9mobile 1GB (30 Days)' }  
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

    const networkPrefixes = {
        '0803': 'mtn', '0806': 'mtn', '0703': 'mtn', '0706': 'mtn', '0813': 'mtn', '0816': 'mtn', '0810': 'mtn', '0814': 'mtn', '0903': 'mtn', '0906': 'mtn', '0913': 'mtn', '0916': 'mtn', '0704': 'mtn', '0702': 'mtn',
        '0802': 'airtel', '0808': 'airtel', '0708': 'airtel', '0812': 'airtel', '0701': 'airtel', '0902': 'airtel', '0901': 'airtel', '0904': 'airtel', '0907': 'airtel', '0912': 'airtel', '0911': 'airtel',
        '0805': 'glo', '0807': 'glo', '0705': 'glo', '0815': 'glo', '0811': 'glo', '0905': 'glo', '0915': 'glo',
        '0809': '9mobile', '0818': '9mobile', '0817': '9mobile', '0909': '9mobile', '0908': '9mobile'
    };

    document.getElementById('phone').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length >= 4) {
            const prefix = val.substring(0, 4);
            const detectedNetwork = networkPrefixes[prefix];
            if (detectedNetwork) {
                const targetBtn = document.querySelector(`.network-btn[data-network="${detectedNetwork}"]`);
                if (targetBtn && !targetBtn.classList.contains('active')) {
                    targetBtn.click();
                }
            }
        }
    });

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
            const formattedPrice = `₦${plan.price.toLocaleString('en-NG')}`;
            const opt = document.createElement('div');
            opt.className = 'custom-option';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = plan.label;
            const priceStrong = document.createElement('strong');
            priceStrong.textContent = formattedPrice;

            opt.appendChild(nameSpan); opt.appendChild(priceStrong);
            opt.dataset.value = `${plan.code}|${plan.price}|${selectedNetwork}|${plan.label}`;
            
            opt.addEventListener('click', () => {
                hiddenPlanInput.value = opt.dataset.value;
                selectText.textContent = `${plan.label} — ${formattedPrice}`;
                selectText.style.opacity = '1';
                selectWrapper.classList.remove('open');
            });
            optionsList.appendChild(opt);
        });
    }
    
    renderDropdownOptions(); // Load default on page load

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

    document.getElementById('data-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = phoneInput.value.trim();

        if (!hiddenPlanInput.value) return showToast("Please select a data plan.", "error");

        const [plan_code, priceStr, network, label] = hiddenPlanInput.value.split('|');

        if (phone.length !== 11 || !/^[0-9]+$/.test(phone)) return showToast("Please enter a valid 11-digit phone number.", "error");

        modalLogo.src = `../../assets/img/${selectedLogo}`;
        modalPlan.textContent = label;
        modalPhone.textContent = phone;
        modalAmount.textContent = `₦${parseFloat(priceStr).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        confirmModal.style.display = 'flex';
    });

    modalCancel.addEventListener('click', () => confirmModal.style.display = 'none');

    modalConfirm.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        const [plan_code, priceStr, network] = hiddenPlanInput.value.split('|');

        modalConfirm.disabled = true; modalCancel.disabled = true;
        modalConfirm.textContent = 'Processing...';

        try {
            // Note: We ONLY send the CheapDataHub bundle ID (plan_code) to the backend.
            // The backend mathematically enforces the exact price and cannot be hacked.
            const { data: resData, error } = await window.db.functions.invoke('vend-data-swift', {
                body: { network: network, plan_code: plan_code, phone: phone }
            });

            if (error) throw new Error(error.message);
            if (resData && resData.success === false) throw new Error(resData.message);

            showToast(resData.message || `Success! Data sent to ${phone}.`, "success");
            confirmModal.style.display = 'none';
            setTimeout(() => window.location.reload(), 2500);

        } catch (err) {
            showToast(err.message, "error");
            modalConfirm.disabled = false; modalCancel.disabled = false;
            modalConfirm.textContent = 'Pay Securely';
            confirmModal.style.display = 'none';
        }
    });
});