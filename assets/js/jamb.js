document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let currentBalance = 0;
    let selectedService = '';
    let selectedPrice = 0;
    let isReprint = false;

    // Elements
    const userBalanceEl = document.getElementById('user-balance');
    const serviceModal = document.getElementById('service-modal');
    const modalTitle = document.getElementById('modal-service-title');
    const modalPayAmt = document.getElementById('modal-pay-amt');
    const reprintGroup = document.getElementById('reprint-group');
    const reprintTypeSelect = document.getElementById('reprint-type');
    const jambForm = document.getElementById('jamb-form');
    
    // Input Fields
    const fullNameInput = document.getElementById('full-name');
    const jambRegInput = document.getElementById('jamb-reg');
    const jambYearInput = document.getElementById('jamb-year');
    const whatsappInput = document.getElementById('whatsapp');
    const emailInput = document.getElementById('email');
    const btnCancel = document.getElementById('modal-cancel');
    const btnSubmit = document.getElementById('modal-submit');

    // Load Balance
    async function loadBalance() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            userBalanceEl.textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }
    }
    await loadBalance();

    // Handle Card Clicks
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedService = card.getAttribute('data-service');
            selectedPrice = parseFloat(card.getAttribute('data-price'));
            isReprint = card.getAttribute('data-type') === 'reprint';

            // Setup Modal UI
            modalTitle.textContent = selectedService;
            modalPayAmt.textContent = `₦${selectedPrice.toLocaleString()}`;
            
            if (isReprint) {
                reprintGroup.style.display = 'block';
                reprintTypeSelect.required = true;
            } else {
                reprintGroup.style.display = 'none';
                reprintTypeSelect.required = false;
            }

            // Clear previous inputs
            jambForm.reset();
            serviceModal.style.display = 'flex';
        });
    });

    // Close Modal
    btnCancel.addEventListener('click', () => {
        serviceModal.style.display = 'none';
    });

    // Submit Order
    jambForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const jambReg = jambRegInput.value.trim().toUpperCase();
        const jambYear = jambYearInput.value.trim();
        const whatsapp = whatsappInput.value.trim();
        const email = emailInput.value.trim();
        
        // Format the final service name (If reprint, append the dropdown selection)
        const finalServiceName = isReprint ? `Reprint: ${reprintTypeSelect.value}` : selectedService;

        if (whatsapp.length !== 11 || !/^\d+$/.test(whatsapp)) {
            alert('Please enter a valid 11-digit phone number.');
            return;
        }

        if (currentBalance < selectedPrice) {
            alert(`Insufficient balance. You need at least ₦${selectedPrice.toLocaleString()} to process this request.`);
            return;
        }

        btnSubmit.disabled = true;
        btnCancel.disabled = true;
        btnSubmit.textContent = 'Processing...';

        try {
            // Call the Upgraded RPC
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

            // Success UI Transition
            serviceModal.style.display = 'none';
            document.getElementById('service-selection-view').style.display = 'none';
            
            document.getElementById('success-ref').textContent = data.order_reference;
            document.getElementById('success-service').textContent = finalServiceName;
            document.getElementById('success-candidate').textContent = fullName;
            document.getElementById('jamb-success-card').style.display = 'block';

            await loadBalance(); // Refresh balance visually

        } catch (err) {
            alert(`Order could not be completed: ${err.message || 'Server error'}`);
        } finally {
            btnSubmit.disabled = false;
            btnCancel.disabled = false;
            btnSubmit.innerHTML = `Pay ₦${selectedPrice.toLocaleString()}`;
        }
    });
});