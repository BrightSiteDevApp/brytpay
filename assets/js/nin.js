document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let currentBalance = 0;
    
    // Pricing Data Model
    const PRICING = {
        'NIN_NUMBER': { 'Information Slip': 400, 'Regular Slip': 500, 'Standard Slip': 600, 'Premium Slip': 800 },
        'PHONE_NUMBER': { 'Information Slip': 500, 'Regular Slip': 600, 'Standard Slip': 700, 'Premium Slip': 1000 }
    };

    let activeType = 'NIN_NUMBER'; // Default
    let selectedService = '';
    let selectedPrice = 0;

    // Elements
    const userBalanceEl = document.getElementById('user-balance');
    const serviceModal = document.getElementById('service-modal');
    const labelIdentifier = document.getElementById('label-identifier');
    const inputIdentifier = document.getElementById('nin-identifier');
    
    // Load Balance
    async function loadBalance() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            userBalanceEl.textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }
    }
    await loadBalance();

    // Handle Tab Switching & Dynamic Pricing
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

    // Handle Card Clicks (Open Modal)
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedService = card.getAttribute('data-service');
            selectedPrice = PRICING[activeType][selectedService];
            
            document.getElementById('modal-service-title').textContent = selectedService;
            document.getElementById('modal-service-desc').textContent = card.getAttribute('data-desc');
            document.getElementById('modal-slip-preview').src = `../../assets/img/${card.getAttribute('data-img')}`;
            document.getElementById('modal-pay-amt').textContent = `₦${selectedPrice.toLocaleString()}`;
            
            document.getElementById('nin-form').reset();
            serviceModal.style.display = 'flex';
        });
    });

    document.getElementById('modal-cancel').addEventListener('click', () => serviceModal.style.display = 'none');

    // Submit Order
    document.getElementById('nin-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('full-name').value.trim();
        const identifierValue = inputIdentifier.value.trim();
        const whatsapp = document.getElementById('whatsapp').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (currentBalance < selectedPrice) {
            alert(`Insufficient balance. You need at least ₦${selectedPrice.toLocaleString()} to process this request.`);
            return;
        }

        const btnSubmit = document.getElementById('modal-submit');
        const btnCancel = document.getElementById('modal-cancel');
        
        btnSubmit.disabled = true; btnCancel.disabled = true;
        btnSubmit.textContent = 'Processing...';

        try {
            // Call the NIN RPC Function
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

            // Success UI
            serviceModal.style.display = 'none';
            document.getElementById('service-selection-view').style.display = 'none';
            document.querySelector('.info-notice-box').style.display = 'none';
            document.querySelector('.tab-container').style.display = 'none';
            
            document.getElementById('success-ref').textContent = data.order_reference;
            document.getElementById('success-service').textContent = selectedService;
            document.getElementById('success-candidate').textContent = fullName;
            document.getElementById('nin-success-card').style.display = 'block';

            await loadBalance(); 

        } catch (err) {
            alert(`Order could not be completed: ${err.message || 'Server error'}`);
        } finally {
            btnSubmit.disabled = false; btnCancel.disabled = false;
            btnSubmit.innerHTML = `Pay ₦${selectedPrice.toLocaleString()}`;
        }
    });
});