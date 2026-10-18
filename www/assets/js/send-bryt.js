document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    
    // Elements
    const userBalanceEl = document.getElementById('user-balance');
    const recipientInput = document.getElementById('recipient-id');
    const inputLabel = document.getElementById('input-label');
    const nameBadge = document.getElementById('name-badge');
    const amountInput = document.getElementById('amount');
    const form = document.getElementById('send-form');
    
    const confirmModal = document.getElementById('confirm-modal');
    const modalRecipient = document.getElementById('modal-recipient');
    const modalAmount = document.getElementById('modal-amount');
    const pinInput = document.getElementById('transfer-pin');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const successOverlay = document.getElementById('success-overlay');

    let currentRecipient = null;
    let typingTimer;
    let searchMode = 'id'; // Default search mode

    const showToast = (msg, isError = false) => {
        const toast = document.getElementById('bryt-toast');
        toast.style.borderLeftColor = isError ? '#ef4444' : '#1D5ED0';
        document.getElementById('toast-text').textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
    };

    // Load Wallet Balance
    const { data: walletData } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
    if (walletData) userBalanceEl.textContent = `₦${parseFloat(walletData.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    // 1. Handle Toggle Selector
    document.querySelectorAll('.selector-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.selector-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            searchMode = e.target.getAttribute('data-mode');
            
            // Update UI based on selection
            if (searchMode === 'id') {
                inputLabel.textContent = '2. Recipient ID';
                recipientInput.placeholder = 'e.g. IQY5';
                recipientInput.type = 'text';
            } else {
                inputLabel.textContent = '2. Email Address';
                recipientInput.placeholder = 'e.g. name@email.com';
                recipientInput.type = 'email';
            }
            
            recipientInput.value = '';
            nameBadge.style.display = 'none';
            currentRecipient = null;
        });
    });

    // 2. Live Recipient Lookup Engine
    recipientInput.addEventListener('input', (e) => {
        clearTimeout(typingTimer);
        const val = e.target.value.trim();
        nameBadge.style.display = 'none';
        currentRecipient = null;

        if (val.length >= 4) {
            typingTimer = setTimeout(async () => {
                const query = window.db.from('profiles').select('id, full_name, account_id, email').neq('id', user.id);
                
                if (searchMode === 'email') query.eq('email', val.toLowerCase());
                else query.eq('account_id', val.toUpperCase());

                const { data, error } = await query.maybeSingle();

                if (data) {
                    currentRecipient = data;
                    nameBadge.textContent = `✓ ${data.full_name}`;
                    nameBadge.className = 'name-badge success';
                    nameBadge.style.display = 'inline-block';
                } else {
                    nameBadge.textContent = 'Not found';
                    nameBadge.className = 'name-badge error';
                    nameBadge.style.display = 'inline-block';
                }
            }, 500);
        }
    });

    // 3. Open Security Modal
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(amountInput.value);

        if (!currentRecipient) return showToast('Please enter a valid recipient.', true);
        if (amount > parseFloat(walletData.balance)) return showToast('Insufficient wallet balance.', true);

        modalRecipient.textContent = currentRecipient.full_name;
        modalAmount.textContent = `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        pinInput.value = '';
        confirmModal.style.display = 'flex';
    });

    cancelBtn.addEventListener('click', () => confirmModal.style.display = 'none');

    // 4. Execute Atomic Transfer (Supabase RPC)
    confirmBtn.addEventListener('click', async () => {
        const pin = pinInput.value.trim();
        if (pin.length !== 4) return showToast('Please enter your 4-digit PIN.', true);

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Sending...';

        try {
            const { data, error } = await window.db.rpc('bryt_transfer_funds', {
                sender_uuid: user.id,
                recipient_identifier: recipientInput.value.trim(),
                transfer_amount: parseFloat(amountInput.value),
                sender_pin: pin
            });

            if (error) throw new Error(error.message);
            if (data && !data.success) throw new Error(data.message);

            confirmModal.style.display = 'none';
            successOverlay.classList.add('active');
            setTimeout(() => { window.location.href = '/dashboard/index.html'; }, 2000);

        } catch (err) {
            showToast(err.message, true);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Send Money';
            confirmModal.style.display = 'none';
        }
    });
});