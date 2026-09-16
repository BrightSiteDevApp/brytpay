document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
        alert("Invalid Checkout Link.");
        window.location.href = '/dashboard/';
        return;
    }

    // 1. Force Authentication
    const { data: { session }, error: authError } = await window.db.auth.getSession();
    
    if (!session) {
        // 🚀 FIX: Safely encode the URL and stop execution
        const targetUrl = encodeURIComponent(`/dashboard/checkout/?session_id=${sessionId}`);
        window.location.href = `/auth/login.html?redirect=${targetUrl}`;
        return; 
    }

    const user = session.user;
    let checkoutAmount = 0;
    let returnUrl = ''; 

    function showToast(message, type = 'success') {
        const toast = document.getElementById('bryt-toast');
        const toastText = document.getElementById('toast-text');
        const iconWrap = document.getElementById('toast-icon-wrap');
        
        toast.className = `bryt-toast toast-${type}`;
        iconWrap.innerHTML = type === 'success' 
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        
        toastText.textContent = message; 
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // 2. Fetch Session Details (Protected by RLS)
    async function loadSession() {
        const { data, error } = await window.db
            .from('payment_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error || !data) {
            alert("Checkout session not found or expired.");
            window.location.href = '/dashboard/';
            return;
        }

        if (data.status !== 'pending') {
            alert(`This session is already ${data.status}.`);
            window.location.href = data.return_url || '/dashboard/';
            return;
        }

        checkoutAmount = parseFloat(data.amount);
        returnUrl = data.return_url;

        document.getElementById('checkout-app').textContent = data.application.replace('_', ' ');
        document.getElementById('checkout-service').textContent = data.service.replace('_', ' ');
       // Replace lines 44-53 in checkout.js with this:
document.getElementById('checkout-amount').textContent = `₦${checkoutAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

// 🚀 NEW: Dynamic Partner UI Rendering
if (data.application === 'BRYT_DGM') {
    document.getElementById('checkout-logo').src = '../../assets/img/brytpay-logo.png'; 
    document.getElementById('checkout-app').textContent = 'BRYT Digital Market';
    document.getElementById('checkout-service').textContent = data.service.replace('_', ' ');
} else if (data.application === 'bryt_cbt') {
    document.getElementById('checkout-logo').src = '../../assets/img/brytcbtsim-logo.png'; 
    document.getElementById('checkout-app').textContent = 'BRYT CBT SIM';
    
    if (data.service === 'premium_access') {
        document.getElementById('checkout-service').textContent = 'Premium Upgrade';
    } else if (data.service === 'qbank_access') {
        document.getElementById('checkout-service').textContent = 'Question Bank Vault Unlock';
    }
} else {
    document.getElementById('checkout-app').textContent = data.application;
    document.getElementById('checkout-service').textContent = data.service;
}

await loadWallet();
    }

    // 3. Fetch Wallet Balance & Verify Funds
    async function loadWallet() {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        const balance = data ? parseFloat(data.balance) : 0;
        
        document.getElementById('wallet-balance').textContent = `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        
        const payBtn = document.getElementById('pay-btn');
        if (balance < checkoutAmount) {
            document.getElementById('insufficient-warning').style.display = 'block';
            payBtn.textContent = 'Fund Wallet to Continue';
            payBtn.addEventListener('click', () => { 
                const targetUrl = encodeURIComponent(`/dashboard/checkout/?session_id=${sessionId}`);
                window.location.href = `/dashboard/fund/?redirect=${targetUrl}`; 
            });
        } else {
            payBtn.addEventListener('click', processPayment);
        }

        // Reveal UI
        document.getElementById('loading-ui').style.display = 'none';
        document.getElementById('checkout-ui').style.display = 'block';
    }

    // 4. Execute Payment
    async function processPayment() {
        const btn = document.getElementById('pay-btn');
        btn.disabled = true;
        btn.innerHTML = 'Processing Securely...';

        try {
            const { data, error } = await window.db.functions.invoke('process-external-checkout', {
                body: { session_id: sessionId }
            });

            if (error) throw new Error(error.message);
            if (data && !data.success) throw new Error(data.message);

            showToast("Payment Successful! Redirecting...", "success");
            btn.innerHTML = 'Redirecting to App...';

            setTimeout(() => {
                window.location.href = data.return_url || returnUrl;
            }, 2500);

        } catch (err) {
            showToast(err.message, "error");
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-lock" style="margin-right: 8px;"></i> Pay Securely';
        }
    }

    await loadSession();
});