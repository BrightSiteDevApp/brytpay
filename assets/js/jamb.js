document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let currentBalance = 0;
    let selectedService = '';
    let selectedPrice = 0;
    let isReprint = false;

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

    const userBalanceEl = document.getElementById('user-balance');
    const serviceModal = document.getElementById('service-modal');
    const modalCloseTrigger = document.getElementById('modal-close-trigger');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalTitle = document.getElementById('modal-service-title');
    const modalPayAmt = document.getElementById('modal-pay-amt');
    
    const reprintGroup = document.getElementById('reprint-group');
    const reprintTypeInput = document.getElementById('reprint-type');
    const jambForm = document.getElementById('jamb-form');
    
    const noticeBox = document.getElementById('dynamic-service-notice');
    const noticeText = document.getElementById('dynamic-notice-text');
    
    const fullNameInput = document.getElementById('full-name');
    const jambRegInput = document.getElementById('jamb-reg');
    const jambYearInput = document.getElementById('jamb-year');
    const whatsappInput = document.getElementById('whatsapp');
    const emailInput = document.getElementById('email');
    const btnSubmit = document.getElementById('modal-submit');

    // 🚀 NEW CUSTOM SELECT LOGIC
    const reprintSelectWrapper = document.getElementById('reprint-select-wrapper');
    const reprintSelectTrigger = document.getElementById('reprint-select-trigger');
    const reprintSelectText = document.getElementById('reprint-select-text');

    if (reprintSelectTrigger) {
        reprintSelectTrigger.addEventListener('click', () => {
            reprintSelectWrapper.classList.toggle('open');
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#reprint-select-wrapper')) {
                reprintSelectWrapper.classList.remove('open');
            }
        });

        document.querySelectorAll('#reprint-options-list .custom-option').forEach(opt => {
            opt.addEventListener('click', () => {
                reprintTypeInput.value = opt.getAttribute('data-value');
                reprintSelectText.textContent = opt.textContent;
                reprintSelectText.style.opacity = '1';
                reprintSelectWrapper.classList.remove('open');
            });
        });
    }

    // UPDATED NOTICES
    const notices = {
        "Admission Letter": "Ensure you have accepted your admission before placing this service.",
        "Original Result": "Get your official JAMB Original Result (with passport photo) required for institutional clearance.",
        "JAMB Reprinting": "Reprint official JAMB documents: Exam Slips, Registration Slips, or Change of Course/Institution.",
        "Admission Status": "Check your live JAMB Admission Status. You'll receive a downloadable screenshot of your portal.",
        "O-Level Result Check": "Use this service to verify that your O-Level result is on your JAMB portal. A proof screenshot will be delivered to your app and email."
    };

    window.goToStep = function(stepNum) {
        document.querySelectorAll('.modal-step').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.dot').forEach(el => el.classList.remove('active'));
        document.getElementById(`step-${stepNum}`).classList.add('active');
        document.getElementById(`dot-${stepNum}`).classList.add('active');
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

        // Ensure custom dropdown is selected if required
        if (isReprint && !reprintTypeInput.value && currentStep === 1) {
            showToast('Please select a reprint document type.', 'error');
            isValid = false;
        }

        if (isValid) goToStep(nextStep);
    };

    async function loadBalance() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            userBalanceEl.textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }
    }
    await loadBalance();

    function closeModal() {
        serviceModal.classList.remove('active');
        setTimeout(() => {
            serviceModal.style.display = 'none';
        }, 400); 
    }

    modalCloseTrigger.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    
    serviceModal.addEventListener('click', (e) => {
        if (e.target === serviceModal) closeModal();
    });

    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedService = card.getAttribute('data-service');
            selectedPrice = parseFloat(card.getAttribute('data-price'));
            isReprint = card.getAttribute('data-type') === 'reprint';

            modalTitle.textContent = selectedService;
            modalPayAmt.textContent = `₦${selectedPrice.toLocaleString()}`;
            
            if (notices[selectedService]) {
                noticeText.textContent = notices[selectedService];
                noticeBox.style.display = 'block';
            } else {
                noticeBox.style.display = 'none';
            }

            if (isReprint) {
                reprintGroup.style.display = 'block';
                reprintTypeInput.value = '';
                reprintSelectText.textContent = 'Select a document...';
                reprintSelectText.style.opacity = '0.6';
            } else {
                reprintGroup.style.display = 'none';
                reprintTypeInput.value = 'Not Applicable'; // bypass hidden input requirement
            }

            jambForm.reset();
            goToStep(1);
            
            serviceModal.style.display = 'flex';
            setTimeout(() => serviceModal.classList.add('active'), 10);
        });
    });

    jambForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const jambReg = jambRegInput.value.trim().toUpperCase();
        const jambYear = jambYearInput.value.trim();
        const whatsapp = whatsappInput.value.trim();
        const email = emailInput.value.trim();
        
        const finalServiceName = isReprint ? `Reprint: ${reprintTypeInput.value}` : selectedService;

        if (whatsapp.length !== 11 || !/^\d+$/.test(whatsapp)) {
            showToast('Please enter a valid 11-digit phone number.', 'error');
            return;
        }

        if (currentBalance < selectedPrice) {
            showToast(`Insufficient balance. You need at least ₦${selectedPrice.toLocaleString()} to process this request.`, 'error');
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Processing...';

        try {
            const { data, error } = await window.db.rpc('process_jamb_order', {
                p_customer_name: fullName,
                p_jamb_reg: jambReg,
                p_whatsapp: whatsapp,
                p_email: email,
                p_service_type: finalServiceName,
                p_amount: selectedPrice,
                p_jamb_year: jambYear
            });

            if (error) throw error;

            closeModal();
            document.getElementById('service-selection-view').style.display = 'none';
            
            document.getElementById('success-ref').textContent = data.order_reference;
            document.getElementById('success-service').textContent = finalServiceName;
            document.getElementById('success-candidate').textContent = fullName;
            document.getElementById('jamb-success-card').style.display = 'block';

            await loadBalance(); 

        } catch (err) {
            showToast(`Order could not be completed: ${err.message || 'Server error'}`, 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `Pay ₦${selectedPrice.toLocaleString()}`;
        }
    });
});