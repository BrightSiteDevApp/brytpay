document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let currentBalance = 0;
    let selectedService = '';
    let selectedPrice = 0;
    let isReprint = false;

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
    const modalTitle = document.getElementById('modal-service-title');
    const modalPayAmt = document.getElementById('modal-pay-amt');
    const reprintGroup = document.getElementById('reprint-group');
    const reprintTypeSelect = document.getElementById('reprint-type');
    const jambForm = document.getElementById('jamb-form');
    
    const fullNameInput = document.getElementById('full-name');
    const jambRegInput = document.getElementById('jamb-reg');
    const jambYearInput = document.getElementById('jamb-year');
    const whatsappInput = document.getElementById('whatsapp');
    const emailInput = document.getElementById('email');
    const btnCancel = document.getElementById('modal-cancel');
    const btnSubmit = document.getElementById('modal-submit');

    // 🚀 Multi-Step Logic
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

    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedService = card.getAttribute('data-service');
            selectedPrice = parseFloat(card.getAttribute('data-price'));
            isReprint = card.getAttribute('data-type') === 'reprint';

            modalTitle.textContent = selectedService;
            modalPayAmt.textContent = `₦${selectedPrice.toLocaleString()}`;
            
            if (isReprint) {
                reprintGroup.style.display = 'block';
                reprintTypeSelect.required = true;
            } else {
                reprintGroup.style.display = 'none';
                reprintTypeSelect.required = false;
            }

            jambForm.reset();
            goToStep(1); // 🚀 Ensure it always opens on Phase 1
            serviceModal.style.display = 'flex';
        });
    });

    btnCancel.addEventListener('click', () => {
        serviceModal.style.display = 'none';
    });

    jambForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const jambReg = jambRegInput.value.trim().toUpperCase();
        const jambYear = jambYearInput.value.trim();
        const whatsapp = whatsappInput.value.trim();
        const email = emailInput.value.trim();
        
        const finalServiceName = isReprint ? `Reprint: ${reprintTypeSelect.value}` : selectedService;

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

            serviceModal.style.display = 'none';
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