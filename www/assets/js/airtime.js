document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let selectedNetwork = 'mtn';
    let selectedLogo = 'mtn-logo.png';
    let currentBalance = 0;
    let currentPin = '';
    
    // 🚀 BENEFICIARIES STATE
    let allBeneficiaries = [];
    let pendingDeleteId = null;
    let pendingDeleteBtn = null;

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
    const submitBtn = document.getElementById('submit-btn');
    const carrierIndicator = document.getElementById('carrier-indicator');

    // PIN Bottom Sheet Elements
    const pinModal = document.getElementById('pin-modal-overlay');
    const modalNetwork = document.getElementById('modal-network');
    const modalPhone = document.getElementById('modal-phone');
    const modalAmount = document.getElementById('modal-amount');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalLogo = document.getElementById('modal-network-logo');
    const pinDots = document.querySelectorAll('.pin-dot');
    const keypadBtns = document.querySelectorAll('.keypad-btn');
    
    // Beneficiary & Success Elements
    const successOverlay = document.getElementById('success-overlay');
    const saveBeneficiaryBox = document.getElementById('save-beneficiary-box');
    const btnSaveBeneficiary = document.getElementById('btn-save-beneficiary');
    const btnSkipSave = document.getElementById('btn-skip-save');
    const beneficiaryNameInput = document.getElementById('beneficiary-name');

    const benModalOverlay = document.getElementById('beneficiaries-modal');
    const btnOpenBeneficiaries = document.getElementById('btn-open-beneficiaries');
    const btnCloseBeneficiaries = document.getElementById('close-beneficiaries');
    const benListContainer = document.getElementById('beneficiaries-list');
    const searchBeneficiaryInput = document.getElementById('search-beneficiary');
    
    // Custom Delete Modal Elements
    const deleteModal = document.getElementById('delete-modal');
    const btnCancelDelete = document.getElementById('cancel-delete');
    const btnConfirmDelete = document.getElementById('confirm-delete');
    const deleteBenName = document.getElementById('delete-ben-name');

    const networkPrefixes = {
        '0803': 'mtn', '0806': 'mtn', '0703': 'mtn', '0706': 'mtn', '0813': 'mtn', '0816': 'mtn', '0810': 'mtn', '0814': 'mtn', '0903': 'mtn', '0906': 'mtn', '0913': 'mtn', '0916': 'mtn', '0704': 'mtn', '0702': 'mtn',
        '0802': 'airtel', '0808': 'airtel', '0708': 'airtel', '0812': 'airtel', '0701': 'airtel', '0902': 'airtel', '0901': 'airtel', '0904': 'airtel', '0907': 'airtel', '0912': 'airtel', '0911': 'airtel',
        '0805': 'glo', '0807': 'glo', '0705': 'glo', '0815': 'glo', '0811': 'glo', '0905': 'glo', '0915': 'glo',
        '0809': '9mobile', '0818': '9mobile', '0817': '9mobile', '0909': '9mobile', '0908': '9mobile'
    };

    // 🚀 FETCH BENEFICIARIES ON LOAD
    async function loadBeneficiaries() {
        try {
            const { data, error } = await window.db.from('beneficiaries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (!error && data) {
                allBeneficiaries = data;
            }
        } catch(e) {
            console.error("Failed to load beneficiaries.");
        }
    }
    
    function renderBeneficiaries(searchQuery = '') {
        benListContainer.innerHTML = '';
        
        const filtered = allBeneficiaries.filter(b => {
            const term = searchQuery.toLowerCase();
            return (b.name && b.name.toLowerCase().includes(term)) || (b.phone && b.phone.includes(term));
        });

        if (filtered.length === 0) {
            benListContainer.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 0.8rem; font-weight: 600; padding: 20px;">No contacts found.</div>`;
            return;
        }

        filtered.forEach(ben => {
            let logoFile = 'mtn-logo.png';
            if (ben.network === 'airtel') logoFile = 'airtel-logo.png';
            if (ben.network === 'glo') logoFile = 'glo-logo.png';
            if (ben.network === '9mobile') logoFile = '9mob-logo.png';

            const initial = ben.name ? ben.name.charAt(0).toUpperCase() : '#';

            const item = document.createElement('div');
            item.className = 'beneficiary-item';
            
            item.innerHTML = `
                <div class="ben-avatar">${initial}</div>
                <div class="ben-info">
                    <div class="ben-name">${ben.name}</div>
                    <div class="ben-phone">${ben.phone}</div>
                </div>
                <img src="../../assets/img/${logoFile}" class="ben-network-logo" alt="${ben.network}" style="margin-right: 4px;">
                <button class="btn-del-ben" title="Delete Contact" style="background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            
            // 🚀 HANDLE CLICK VS CUSTOM DELETE MODAL
            item.addEventListener('click', (e) => {
                
                // If they clicked the trash can button
                if (e.target.closest('.btn-del-ben')) {
                    e.stopPropagation(); // Stops it from typing the number into the input field
                    
                    pendingDeleteId = ben.id;
                    pendingDeleteBtn = e.target.closest('.btn-del-ben');
                    deleteBenName.textContent = ben.name;
                    deleteModal.classList.add('active');
                    
                    return;
                }
                
                // If they clicked the body of the item, populate the input field
                phoneInput.value = ben.phone;
                benModalOverlay.classList.remove('active');
                
                const event = new Event('input', { bubbles: true });
                phoneInput.dispatchEvent(event);
            });
            
            benListContainer.appendChild(item);
        });
    }

    // Modal Triggers
    if (btnOpenBeneficiaries) {
        btnOpenBeneficiaries.addEventListener('click', () => {
            renderBeneficiaries(); 
            benModalOverlay.classList.add('active');
        });
    }
    if (btnCloseBeneficiaries) {
        btnCloseBeneficiaries.addEventListener('click', () => {
            benModalOverlay.classList.remove('active');
        });
    }
    if (searchBeneficiaryInput) {
        searchBeneficiaryInput.addEventListener('input', (e) => {
            renderBeneficiaries(e.target.value);
        });
    }
    
    // 🚀 CUSTOM DELETE MODAL ACTIONS
    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', () => {
            deleteModal.classList.remove('active');
            pendingDeleteId = null;
            pendingDeleteBtn = null;
        });
    }
    
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (!pendingDeleteId) return;
            
            btnConfirmDelete.disabled = true;
            btnConfirmDelete.textContent = 'Deleting...';
            if (pendingDeleteBtn) pendingDeleteBtn.style.opacity = '0.5';

            const { error } = await window.db.from('beneficiaries').delete().eq('id', pendingDeleteId);
            
            if (!error) {
                allBeneficiaries = allBeneficiaries.filter(b => b.id !== pendingDeleteId);
                renderBeneficiaries(searchBeneficiaryInput.value);
                showToast('Contact removed.', 'success');
            } else {
                showToast('Failed to remove contact.', 'error');
                if (pendingDeleteBtn) pendingDeleteBtn.style.opacity = '1';
            }

            deleteModal.classList.remove('active');
            btnConfirmDelete.disabled = false;
            btnConfirmDelete.textContent = 'Delete';
            pendingDeleteId = null;
            pendingDeleteBtn = null;
        });
    }

    phoneInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length >= 4) {
            const prefix = val.substring(0, 4);
            const detectedNetwork = networkPrefixes[prefix];
            if (detectedNetwork) {
                const targetBtn = document.querySelector(`.network-btn[data-network="${detectedNetwork}"]`);
                if (targetBtn && !targetBtn.classList.contains('active')) {
                    targetBtn.click();
                }
                carrierIndicator.textContent = detectedNetwork.toUpperCase();
                carrierIndicator.classList.add('active');
                return;
            }
        }
        carrierIndicator.classList.remove('active');
    });

    async function fetchBalance() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) {
            currentBalance = parseFloat(data.balance);
            userBalanceEl.textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        }
    }
    
    await Promise.all([fetchBalance(), loadBeneficiaries()]);

    document.querySelectorAll('.network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.network-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedNetwork = btn.getAttribute('data-network');
            selectedLogo = btn.getAttribute('data-logo');

            if (carrierIndicator.classList.contains('active')) {
                carrierIndicator.textContent = selectedNetwork.toUpperCase();
            }
        });
    });

    function updateButton() {
        const amt = parseFloat(amountInput.value);
        if (amt && amt >= 100) {
            submitBtn.innerHTML = `Pay ₦${amt.toLocaleString('en-NG')} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
        } else {
            submitBtn.innerHTML = `Proceed <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
        }
    }

    amountInput.addEventListener('input', updateButton);

    document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            amountInput.value = chip.getAttribute('data-amt');
            updateButton();
        });
    });

    // 🚀 KEYPAD LOGIC
    function updatePinUI() {
        pinDots.forEach((dot, idx) => {
            if (idx < currentPin.length) dot.classList.add('filled');
            else dot.classList.remove('filled');
        });
        modalConfirm.disabled = currentPin.length !== 4;
    }

    keypadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (val === 'back') {
                currentPin = currentPin.slice(0, -1);
            } else if (val) {
                if (currentPin.length < 4) currentPin += val;
            }
            updatePinUI();
        });
    });

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

        if (amount > currentBalance) {
            showToast('Insufficient wallet balance.', 'error');
            return;
        }

        modalLogo.src = `../../assets/img/${selectedLogo}`;
        modalNetwork.textContent = `${selectedNetwork.toUpperCase()} Airtime`;
        modalPhone.textContent = phone;
        modalAmount.textContent = `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        currentPin = '';
        updatePinUI();
        pinModal.classList.add('active');
    });

    modalCancel.addEventListener('click', () => {
        pinModal.classList.remove('active');
        currentPin = '';
        updatePinUI();
    });

    modalConfirm.addEventListener('click', async () => {
        if (currentPin.length !== 4) return showToast('Enter your 4-digit PIN.', 'error');

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
                    amount: amount,
                    pin: currentPin
                }
            });

            if (error) throw new Error(error.message);
            if (data && data.success === false) throw new Error(data.message);

            pinModal.classList.remove('active');
            successOverlay.classList.add('active');
            
            // 🚀 BENEFICIARY CHECK HOOK
            const alreadySaved = allBeneficiaries.some(b => b.phone === phone);
            
            if (alreadySaved) {
                setTimeout(() => { window.location.reload(); }, 1500);
            } else {
                setTimeout(() => {
                    saveBeneficiaryBox.style.display = 'block';
                }, 1000);
            }

        } catch (err) {
            showToast(err.message, 'error');
            modalConfirm.disabled = false;
            modalCancel.disabled = false;
            modalConfirm.textContent = 'Pay Now';
            pinModal.classList.remove('active');
        }
    });

    // 🚀 SAVE BENEFICIARY BUTTON LOGIC
    btnSaveBeneficiary.addEventListener('click', async () => {
        const benName = beneficiaryNameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (!benName) {
            showToast('Please enter a name.', 'error');
            return;
        }

        btnSaveBeneficiary.disabled = true;
        btnSaveBeneficiary.textContent = 'Saving...';

        try {
            const { error } = await window.db.from('beneficiaries').insert({
                user_id: user.id,
                name: benName,
                phone: phone,
                network: selectedNetwork
            });

            if (error) throw error;
            
            showToast('Contact saved!', 'success');
            setTimeout(() => { window.location.reload(); }, 1000);
            
        } catch (err) {
            showToast('Failed to save contact.', 'error');
            btnSaveBeneficiary.disabled = false;
            btnSaveBeneficiary.textContent = 'Save Contact';
        }
    });

    btnSkipSave.addEventListener('click', () => {
        window.location.reload();
    });
});