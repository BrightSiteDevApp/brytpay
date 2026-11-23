document.addEventListener('DOMContentLoaded', async () => {
    const CLAIM_ENDPOINT = 'https://yivxlmjaiczsnxakumof.supabase.co/functions/v1/claim-giveaway';

    const viewLoading = document.getElementById('view-loading');
    const viewClaim = document.getElementById('view-claim');
    const viewSuccess = document.getElementById('view-success');
    const viewUnavailable = document.getElementById('view-unavailable');

    const senderNameEl = document.getElementById('sender-name');
    const claimForm = document.getElementById('claim-form');
    const phoneInput = document.getElementById('claim-phone');
    const carrierBadge = document.getElementById('claim-carrier');
    const btnClaim = document.getElementById('btn-claim');
    const btnClaimText = document.getElementById('btn-claim-text');
    const statusBanner = document.getElementById('claim-status-banner');
    const honeypotInput = document.getElementById('hp-website');

    let currentCode = '';
    let claimToken = '';
    let giveawayAmount = 0;
    let tokenIssuedAt = 0;

    function showView(target) {
        [viewLoading, viewClaim, viewSuccess, viewUnavailable].forEach(v => v.classList.remove('active'));
        target.classList.add('active');
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('bryt-toast');
        const toastText = document.getElementById('toast-text');
        const iconWrap = document.getElementById('toast-icon-wrap');
        if (!toast || !toastText || !iconWrap) return;

        toast.className = `bryt-toast toast-${type}`;
        iconWrap.innerHTML = type === 'success'
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        toastText.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4500);
    }

    function showBanner(message, kind = 'error') {
        statusBanner.textContent = message;
        statusBanner.className = `status-banner ${kind}`;
    }

    function clearBanner() {
        statusBanner.textContent = '';
        statusBanner.className = 'status-banner';
    }

    function showUnavailable(title, desc) {
        document.getElementById('unavail-title').textContent = title;
        document.getElementById('unavail-desc').textContent = desc;
        showView(viewUnavailable);
    }

    // Persistent device identifier for 1-claim-per-device enforcement
    function getOrCreateDeviceId() {
        const key = 'bryt_share_device_id';
        let id = localStorage.getItem(key);
        if (!id || id.length < 16) {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                id = window.crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
            } else {
                const arr = new Uint8Array(20);
                window.crypto.getRandomValues(arr);
                id = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
            }
            try { localStorage.setItem(key, id); } catch (_) {}
        }
        return id;
    }

    // Standard Nigerian prefix detection (matches backend)
    const PREFIX_5 = { '07025': 'MTN', '07026': 'MTN' };
    const PREFIX_4 = {
        '0703': 'MTN', '0704': 'MTN', '0706': 'MTN', '0707': 'MTN',
        '0803': 'MTN', '0806': 'MTN', '0810': 'MTN', '0813': 'MTN',
        '0814': 'MTN', '0816': 'MTN', '0903': 'MTN', '0906': 'MTN',
        '0913': 'MTN', '0916': 'MTN',
        '0705': 'GLO', '0805': 'GLO', '0807': 'GLO', '0811': 'GLO',
        '0815': 'GLO', '0905': 'GLO', '0915': 'GLO',
        '0701': 'AIRTEL', '0708': 'AIRTEL', '0802': 'AIRTEL', '0808': 'AIRTEL',
        '0812': 'AIRTEL', '0901': 'AIRTEL', '0902': 'AIRTEL', '0904': 'AIRTEL',
        '0907': 'AIRTEL', '0911': 'AIRTEL', '0912': 'AIRTEL',
        '0809': '9MOBILE', '0817': '9MOBILE', '0818': '9MOBILE',
        '0908': '9MOBILE', '0909': '9MOBILE'
    };

    function detectNetwork(phone) {
        if (phone.length >= 5 && PREFIX_5[phone.slice(0, 5)]) return PREFIX_5[phone.slice(0, 5)];
        if (phone.length >= 4 && PREFIX_4[phone.slice(0, 4)]) return PREFIX_4[phone.slice(0, 4)];
        return null;
    }

    phoneInput.addEventListener('input', () => {
        phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 11);
        clearBanner();
        const net = detectNetwork(phoneInput.value);
        if (net) {
            carrierBadge.textContent = net;
            carrierBadge.classList.add('active');
        } else {
            carrierBadge.classList.remove('active');
        }
    });

    // Extract giveaway code from /share/XXXXXXXX (also supports ?code=XXXXXXXX)
    function extractCode() {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const shareIdx = pathParts.indexOf('share');
        if (shareIdx !== -1 && pathParts[shareIdx + 1] && pathParts[shareIdx + 1] !== 'index.html') {
            return pathParts[shareIdx + 1].trim();
        }
        const params = new URLSearchParams(window.location.search);
        return (params.get('code') || '').trim();
    }

    currentCode = extractCode();
    if (!/^[A-Za-z0-9]{6,12}$/.test(currentCode)) {
        showUnavailable('Invalid Link', 'This airtime giveaway link is invalid or incomplete.');
        return;
    }

    // Fetch public giveaway details + signed claim token
    async function loadGiveawayInfo() {
        try {
            const res = await fetch(CLAIM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'info', code: currentCode })
            });
            const data = await res.json();

            if (!data || !data.success || !data.giveaway) {
                showUnavailable('Giveaway Not Found', data?.message || 'This airtime giveaway link does not exist.');
                return;
            }

            const g = data.giveaway;
            giveawayAmount = Number(g.amount_per_claim);
            document.title = `₦${giveawayAmount.toLocaleString('en-NG')} Airtime Gift from ${g.sender_name} — BRYT Pay`;

            if (g.status === 'completed') {
                showUnavailable('All Slots Claimed!', `All ₦${giveawayAmount.toLocaleString('en-NG')} airtime gifts from ${g.sender_name} have been claimed.`);
                return;
            }
            if (g.status === 'paused') {
                showUnavailable('Giveaway Paused', `${g.sender_name} has temporarily paused this giveaway. Check back soon.`);
                return;
            }
            if (g.status === 'expired') {
                showUnavailable('Link Expired', 'This giveaway link has expired (links stay active for 7 days).');
                return;
            }
            if (g.status === 'cancelled' || g.status === 'unavailable') {
                showUnavailable('Giveaway Unavailable', 'This airtime giveaway is no longer available.');
                return;
            }

            claimToken = data.claim_token || '';
            tokenIssuedAt = Date.now();

            senderNameEl.textContent = g.sender_name.toUpperCase();
            btnClaimText.textContent = `Get ₦${giveawayAmount.toLocaleString('en-NG')} Airtime`;
            showView(viewClaim);
        } catch (err) {
            showUnavailable('Connection Error', 'Could not load this giveaway right now. Please check your network and refresh.');
        }
    }

    await loadGiveawayInfo();

    // Handle Airtime Claim Submit
    claimForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearBanner();

        const phone = phoneInput.value.trim();
        const detected = detectNetwork(phone);

        if (!/^0[789][01]\d{8}$/.test(phone) || !detected) {
            showBanner('Enter a valid 11-digit Nigerian phone number (MTN, Glo, Airtel, or 9mobile).', 'error');
            return;
        }

        btnClaim.disabled = true;
        btnClaim.innerHTML = `<span class="btn-spinner"></span><span>Sending ₦${giveawayAmount.toLocaleString('en-NG')}...</span>`;

        try {
            // Smooth UX: if a real user pasted & clicked under 1.6s, wait the tiny remainder so they never hit the bot-speed guard
            const elapsed = Date.now() - tokenIssuedAt;
            if (elapsed < 1650) {
                await new Promise(resolve => setTimeout(resolve, 1650 - elapsed));
            }

            const res = await fetch(CLAIM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'claim',
                    code: currentCode,
                    phone,
                    claim_token: claimToken,
                    device_id: getOrCreateDeviceId(),
                    website: honeypotInput ? honeypotInput.value : ''
                })
            });

            const data = await res.json();

            if (!data || !data.success) {
                const code = data?.error_code || '';
                const msg = data?.message || 'Could not claim airtime right now.';

                if (code === 'COMPLETED') {
                    showUnavailable('All Slots Claimed!', msg);
                    return;
                }
                if (code === 'EXPIRED' || code === 'CANCELLED' || code === 'PAUSED') {
                    showUnavailable('Giveaway Unavailable', msg);
                    return;
                }

                const bannerKind = code === 'GIFTER_WALLET_LOW' ? 'warning' : 'error';
                showBanner(msg, bannerKind);
                showToast(msg, 'error');

                btnClaim.disabled = false;
                btnClaim.innerHTML = `<span>Get ₦${giveawayAmount.toLocaleString('en-NG')} Airtime</span>`;
                return;
            }

            // Populate success view
            const d = data.data || {};
            document.getElementById('success-message').textContent = data.message || 'Your airtime gift has been delivered!';
            document.getElementById('rec-amount').textContent = `₦${Number(d.amount || giveawayAmount).toLocaleString('en-NG')}`;
            document.getElementById('rec-network').textContent = d.network || detected;
            document.getElementById('rec-phone').textContent = d.phone || phone;
            document.getElementById('rec-sender').textContent = (d.sender_name || senderNameEl.textContent).toUpperCase();

            showView(viewSuccess);
            showToast('Airtime delivered successfully!', 'success');
        } catch (err) {
            showBanner('Network error. Please check your connection and try again.', 'error');
            btnClaim.disabled = false;
            btnClaim.innerHTML = `<span>Get ₦${giveawayAmount.toLocaleString('en-NG')} Airtime</span>`;
        }
    });
});