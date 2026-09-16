document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let selectedNetwork = 'mtn';
    let selectedLogo = 'mtn-logo.png';

    // XSS-Safe Toast Notification
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

    const userBalanceEl = document.getElementById('user-balance');
    const phoneInput = document.getElementById('phone');
    const amountInput = document.getElementById('amount');
    const airtimeForm = document.getElementById('airtime-form');

    const confirmModal = document.getElementById('confirm-modal');
    const modalNetwork = document.getElementById('modal-network');
    const modalPhone = document.getElementById('modal-phone');
    const modalAmount = document.getElementById('modal-amount');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalLogo = document.getElementById('modal-network-logo');
    // 🚀 MAGICAL AUTO-NETWORK SELECTOR
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
                // Find the first button that matches this network and click it!
                const targetBtn = document.querySelector(`.network-btn[data-network="${detectedNetwork}"]`);
                if (targetBtn && !targetBtn.classList.contains('active')) {
                    targetBtn.click();
                }
            }
        }
    });


    async function fetchBalance() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            userBalanceEl.textContent = `₦${parseFloat(data.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }
    }
    await fetchBalance();

    // Network Selector Chips
    document.querySelectorAll('.network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.network-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedNetwork = btn.getAttribute('data-network');
            selectedLogo = btn.getAttribute('data-logo');
        });
    });

    // Amount Presets
    document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            amountInput.value = chip.getAttribute('data-amt');
        });
    });

    // Form Submit
    airtimeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = phoneInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (phone.length !== 11 || !/^[0-9]+$/.test(phone)) {
            showToast('Please enter a valid 11-digit phone number.', 'error');
            return;
        }

        if (isNaN(amount) || amount < 100) {
            showToast('Minimum airtime purchase is ₦100.', 'error');
            return;
        }

        modalLogo.src = `../../assets/img/${selectedLogo}`;
        modalNetwork.textContent = `${selectedNetwork.toUpperCase()} Airtime`;
        modalPhone.textContent = phone;
        modalAmount.textContent = `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        confirmModal.style.display = 'flex';
    });

    modalCancel.addEventListener('click', () => confirmModal.style.display = 'none');

    // Execute Purchase
    modalConfirm.addEventListener('click', async () => {
        modalConfirm.disabled = true;
        modalCancel.disabled = true;
        modalConfirm.textContent = 'Processing...';

        const phone = phoneInput.value.trim();
        const amount = parseFloat(amountInput.value);

        try {
            const { data, error } = await window.db.functions.invoke('vend-airtime-swift', {
                body: {
                    network: selectedNetwork,
                    phone: phone,
                    amount: amount
                }
            });

            if (error) throw new Error(error.message);
            if (data && data.success === false) throw new Error(data.message);

            showToast(data.message || `Success! ₦${amount} Airtime sent to ${phone}.`, 'success');
            confirmModal.style.display = 'none';
            setTimeout(() => window.location.reload(), 2500);

        } catch (err) {
            showToast(err.message, 'error');
            modalConfirm.disabled = false;
            modalCancel.disabled = false;
            modalConfirm.textContent = 'Pay Securely';
            confirmModal.style.display = 'none';
        }
    });
});