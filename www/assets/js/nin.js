document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
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

    const PRICING = {
        'NIN_NUMBER': { 'Information Slip': 300, 'Regular Slip': 400, 'Standard Slip': 400, 'Premium Slip': 500 },
        'PHONE_NUMBER': { 'Information Slip': 350, 'Regular Slip': 450, 'Standard Slip': 450, 'Premium Slip': 600 }
    };

    let activeType = 'NIN_NUMBER'; 
    let selectedService = '';
    let selectedPrice = 0;

    const userBalanceEl = document.getElementById('user-balance');
    const serviceModal = document.getElementById('service-modal');
    const modalCloseTrigger = document.getElementById('modal-close-trigger');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const labelIdentifier = document.getElementById('label-identifier');
    const inputIdentifier = document.getElementById('nin-identifier');
    const successOverlay = document.getElementById('success-overlay');
    
    // 🚀 PIN KEYPAD ELEMENTS
    const pinDots = document.querySelectorAll('.pin-dot');
    const keypadBtns = document.querySelectorAll('.keypad-btn');
    const btnSubmitPin = document.getElementById('modal-submit-pin');
    
    window.goToStep = function(stepNum) {
        document.querySelectorAll('.modal-step').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.dot-nav').forEach(el => el.classList.remove('active'));
        document.getElementById(`step-${stepNum}`).classList.add('active');
        document.getElementById(`dot-${stepNum}`).classList.add('active');
        
        // Reset PIN if navigating to Step 3
        if (stepNum === 3) {
            currentPinInput = '';
            updatePinUI();
        }
    };

    window.validateAndGoToStep = function(currentStep, nextStep) {
        const stepContainer = document.getElementById(`step-${currentStep}`);
        const inputs = stepContainer.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        });

        if (currentStep === 2 && currentBalance < selectedPrice) {
            showToast(`Insufficient balance. You need at least ₦${selectedPrice.toLocaleString()} to process this request.`, 'error');
            return;
        }

        if (isValid) goToStep(nextStep);
    };
    
    async function loadProfileAndBalance() {
        const { data: wallet } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (wallet) {
            currentBalance = parseFloat(wallet.balance);
            userBalanceEl.textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }
        
        // Securely fetch transaction PIN so it can be verified smoothly in JS
        const { data: profile } = await window.db.from('profiles').select('transaction_pin').eq('id', user.id).single();
        if (profile && profile.transaction_pin) {
            userPin = profile.transaction_pin;
        }
    }
    await loadProfileAndBalance();

    const tabNin = document.getElementById('tab-nin-num');
    const tabPhone = document.getElementById('tab-phone-num');

    function updateCardPrices() {
        document.getElementById('price-info').textContent = `₦${PRICING[activeType]['Information Slip']}`;
        document.getElementById('price-reg').textContent = `₦${PRICING[activeType]['Regular Slip']}`;
        document.getElementById('price-stan').textContent = `₦${PRICING[activeType]['Standard Slip']}`;
        document.getElementById('price-pre').textContent = `₦${PRICING[activeType]['Premium Slip']}`;
    }

    tabNin.addEventListener('click', () => {
        tabNin.classList.add('active'); tabPhone.classList.remove('active');
        activeType = 'NIN_NUMBER';
        labelIdentifier.textContent = 'National Identity Number (NIN)';
        inputIdentifier.placeholder = 'Enter the 11-digit NIN';
        updateCardPrices();
    });

    tabPhone.addEventListener('click', () => {
        tabPhone.classList.add('active'); tabNin.classList.remove('active');
        activeType = 'PHONE_NUMBER';
        labelIdentifier.textContent = 'Linked Phone Number';
        inputIdentifier.placeholder = 'Enter the registered phone number';
        updateCardPrices();
    });

    function closeModal() {
        serviceModal.classList.remove('active');
        setTimeout(() => {
            serviceModal.style.display = 'none';
        }, 300); 
    }

    if (modalCloseTrigger) modalCloseTrigger.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    serviceModal.addEventListener('click', (e) => {
        if (e.target === serviceModal) closeModal();
    });

    // 🚀 CUSTOM PIN LOGIC
    function updatePinUI() {
        pinDots.forEach((dot, idx) => {
            if (idx < currentPinInput.length) dot.classList.add('filled');
            else dot.classList.remove('filled');
        });
        btnSubmitPin.disabled = currentPinInput.length !== 4;
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

    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedService = card.getAttribute('data-service');
            selectedPrice = PRICING[activeType][selectedService];
            
            document.getElementById('modal-service-title').textContent = selectedService;
            document.getElementById('modal-service-desc').textContent = card.getAttribute('data-desc');
            document.getElementById('modal-slip-preview').src = `../../assets/img/${card.getAttribute('data-img')}`;
            document.getElementById('modal-pay-amt-pin').textContent = `₦${selectedPrice.toLocaleString()}`;
            
            document.getElementById('nin-form').reset();
            goToStep(1);
            
            serviceModal.style.display = 'flex';
            setTimeout(() => serviceModal.classList.add('active'), 10);
        });
    });

    // 🚀 FINAL SUBMIT (Triggered by PIN button)
    btnSubmitPin.addEventListener('click', async () => {
        if (!userPin) return showToast('Please set your 4-digit PIN in your security settings first.', 'error');
        if (currentPinInput !== userPin) return showToast('Incorrect PIN. Try again.', 'error');

        const fullName = document.getElementById('full-name').value.trim();
        const identifierValue = inputIdentifier.value.trim();
        const whatsapp = document.getElementById('whatsapp').value.trim();
        const email = document.getElementById('email').value.trim();
        
        btnSubmitPin.disabled = true; 
        btnSubmitPin.textContent = 'Processing...';

        try {
            const { data, error } = await window.db.rpc('process_nin_order', {
                p_customer_name: fullName,
                p_identifier_type: activeType,
                p_identifier_value: identifierValue,
                p_whatsapp: whatsapp,
                p_email: email,
                p_service_type: selectedService,
                p_amount: selectedPrice
            });

            if (error) throw error;

            closeModal();
            successOverlay.classList.add('active');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            showToast(`Order could not be completed: ${err.message || 'Server error'}`, 'error');
        } finally {
            btnSubmitPin.disabled = false; 
            btnSubmitPin.innerHTML = 'Pay Now';
        }
    });
});