document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let currentBalance = 0;
    let selectedProvider = '';
    const CERT_PRICE = 10000;

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
        toastText.textContent = message; toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    async function loadBalance() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            document.getElementById('user-balance').textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }
    }
    await loadBalance();

    const serviceModal = document.getElementById('service-modal');
    
    // Multi-Step Logic
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

    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('disabled')) return;
            selectedProvider = card.getAttribute('data-service');
            document.getElementById('cert-form').reset();
            goToStep(1); // Always open at phase 1
            serviceModal.style.display = 'flex';
        });
    });

    document.querySelectorAll('.btn-cancel-modal').forEach(btn => {
        btn.addEventListener('click', () => serviceModal.style.display = 'none');
    });

    document.getElementById('cert-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (currentBalance < CERT_PRICE) {
            return showToast(`Insufficient balance. You need ₦${CERT_PRICE.toLocaleString()}.`, 'error');
        }

        const btnSubmit = document.getElementById('modal-submit');
        btnSubmit.disabled = true; 
        btnSubmit.textContent = 'Processing...';

        try {
            // 🚀 Notice: We no longer send p_amount. The backend handles it securely!
            const { data, error } = await window.db.rpc('process_exam_cert_order', {
                p_customer_name: document.getElementById('cert-name').value.trim(),
                p_provider: selectedProvider,
                p_country: document.getElementById('cert-country').value,
                p_exam_year: document.getElementById('cert-year').value.trim(),
                p_exam_type: document.getElementById('cert-type').value,
                p_dob: document.getElementById('cert-dob').value, // Mandatory now
                p_candidate_no: document.getElementById('cert-candidate-no').value.trim().toUpperCase(),
                p_whatsapp: document.getElementById('cert-whatsapp').value.trim(),
                p_email: document.getElementById('cert-email').value.trim()
            });

            if (error) throw error;

            serviceModal.style.display = 'none';
            document.getElementById('service-selection-view').style.display = 'none';
            document.getElementById('cert-success-card').style.display = 'block';

            await loadBalance(); 

        } catch (err) {
            showToast(err.message || 'Server error', 'error');
            btnSubmit.disabled = false; 
            btnSubmit.innerHTML = `Pay ₦10,000`;
        }
    });
});