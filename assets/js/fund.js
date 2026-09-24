// ⚠️ IMPORTANT: REPLACE THESE WITH YOUR ACTUAL PUBLIC KEYS BEFORE TESTING ⚠️
const PAYSTACK_PUBLIC_KEY = 'pk_live_f1ca0bad0d6913267fb525e6c58cd2c447a1ae29'; 
const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK-2e665ef580f11b88b55d792725bf75c4-X'; 
const YOUR_SUPABASE_PROJECT_URL = 'https://yivxlmjaiczsnxakumof.supabase.co'; 

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await window.db.auth.getSession();
    if (!session) return window.location.href = '/auth/login.html'; 

    const user = session.user;
    const amountInput = document.getElementById('amount');
    const fundForm = document.getElementById('fund-form');
    const payBtn = document.getElementById('pay-btn');

    let selectedGateway = 'PAYSTACK'; 

    const { data: walletData } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
    if (walletData) {
        document.getElementById('user-balance').textContent = `₦${parseFloat(walletData.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }

    document.querySelectorAll('.gateway-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.gateway-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedGateway = card.getAttribute('data-gateway');
        });
    });

    document.querySelectorAll('.preset-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            amountInput.value = btn.getAttribute('data-amount');
            updateSummary();
        });
    });

    amountInput.addEventListener('input', updateSummary);

    // 🚀 FIXED: Removed all manual fee calculations
    function updateSummary() {
        const base = parseFloat(amountInput.value) || 0;
        document.getElementById('summary-total').textContent = `₦${base.toLocaleString('en-NG')}`;
        payBtn.innerHTML = `Pay ₦${base.toLocaleString('en-NG')} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`;
    }

    fundForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const base = parseFloat(amountInput.value);
        if (isNaN(base) || base < 100) return alert('Please enter a valid amount (Minimum ₦100).');

        const reference = `BRYT_FUND_${user.id}_${Date.now()}`;

        if (selectedGateway === 'PAYSTACK') {
            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: base * 100, // Paystack requires kobo
                currency: 'NGN',
                ref: reference,
                callback: function(res) {
                    verifyPaymentSecurely(res.reference, 'PAYSTACK');
                },
                onClose: function() { }
            });
            handler.openIframe();
        } 
        else if (selectedGateway === 'FLUTTERWAVE') {
            FlutterwaveCheckout({
                public_key: FLUTTERWAVE_PUBLIC_KEY,
                tx_ref: reference,
                amount: base,
                currency: 'NGN',
                customer: { email: user.email, name: 'BRYT Pay User' },
                customizations: { title: 'BRYT Pay', description: 'Wallet Funding' },
                callback: function(data) {
                    verifyPaymentSecurely(data.tx_ref || data.transaction_id || reference, 'FLUTTERWAVE');
                },
                onclose: function() { }
            });
        }
    });

    async function verifyPaymentSecurely(ref, provider) {
        const overlay = document.getElementById('success-overlay');
        const statusText = document.getElementById('overlay-status');
        const checkCircle = document.getElementById('check-icon');
        const loadSvg = document.getElementById('loading-svg');
        const successSvg = document.getElementById('success-svg');

        overlay.classList.add('active'); 

        try {
            const { data: { session: freshSession } } = await window.db.auth.getSession();
            if (!freshSession) throw new Error("Session expired. Please log in again.");

            const response = await fetch(`${YOUR_SUPABASE_PROJECT_URL}/functions/v1/fund-wallet-verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${freshSession.access_token}`
                },
                body: JSON.stringify({ reference: ref, provider: provider })
            });

            const result = await response.json();

            if (result.success) {
                checkCircle.style.background = '#10b981';
                loadSvg.style.display = 'none';
                successSvg.style.display = 'block';

                if (result.message && result.message.includes('Webhook')) {
                    statusText.innerHTML = `Transfer Captured! 🚀<br><span style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Your wallet was already funded in the background with ₦${result.credited_amount.toLocaleString()}.</span><br><br>Redirecting in <span id="countdown" style="color:#1D5ED0;">3</span>...`;
                } else {
                    statusText.innerHTML = `Payment Successful!<br><span style="color: #64748b; font-size: 0.9rem; font-weight: 500;">₦${result.credited_amount.toLocaleString()} has been credited to your wallet.</span><br><br>Redirecting in <span id="countdown" style="color:#1D5ED0;">3</span>...`;
                }

                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect');
                const targetPath = redirectUrl ? decodeURIComponent(redirectUrl) : '/dashboard/';

                let seconds = 3;
                const interval = setInterval(() => {
                    seconds--;
                    document.getElementById('countdown').innerText = seconds;
                    if (seconds <= 0) {
                        clearInterval(interval);
                        window.location.href = targetPath;
                    }
                }, 1000);

            } else {
                checkCircle.style.background = '#ef4444';
                loadSvg.style.display = 'none';
                successSvg.style.display = 'block';
                successSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />'; 
                
                statusText.innerText = `Verification Failed: ${result.message}`;
                setTimeout(() => { overlay.classList.remove('active'); window.location.reload(); }, 4000);
            }
        } catch (err) {
            statusText.innerText = err.message || 'Network error during verification.';
            setTimeout(() => { overlay.classList.remove('active'); window.location.reload(); }, 4000);
        }
    }
});