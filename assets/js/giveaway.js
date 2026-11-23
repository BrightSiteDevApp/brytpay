document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) {
        window.location.href = '/auth/login.html?redirect=' + encodeURIComponent('/dashboard/giveaway/index.html');
        return;
    }

    // Smart Back Button
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        backBtn.href = referrer.includes('/dashboard/services/')
            ? '/dashboard/services/index.html'
            : '/dashboard/index.html';
    }

    const balanceEl = document.getElementById('user-balance');
    const senderInput = document.getElementById('sender-name');
    const amountInput = document.getElementById('gw-amount');
    const slotsInput = document.getElementById('gw-slots');
    const summaryTotalEl = document.getElementById('summary-total');
    const lowBalanceNote = document.getElementById('low-balance-note');
    const giveawaysList = document.getElementById('giveaways-list');

    const pinModal = document.getElementById('pin-modal-overlay');
    const pinDots = pinModal.querySelectorAll('.pin-dot');
    const keypadBtns = pinModal.querySelectorAll('.keypad-btn');
    const btnCancelPin = document.getElementById('modal-cancel');
    const btnConfirmPin = document.getElementById('modal-confirm');

    const successOverlay = document.getElementById('success-overlay');
    const cancelModal = document.getElementById('cancel-modal');

    let currentBalance = 0;
    let currentPinInput = '';
    let pendingCancelId = null;
    let lastCreatedUrl = '';

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
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function copyText(text, successMsg = 'Link copied to clipboard!') {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => showToast(successMsg, 'success'));
        } else {
            const temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showToast(successMsg, 'success');
        }
    }

    function buildWhatsAppUrl(senderName, amount, shareUrl) {
        const text = `🎁 Free ₦${Number(amount).toLocaleString('en-NG')} Airtime Giveaway from ${senderName}!\n\nTap the link below and enter your phone number to claim instantly:\n${shareUrl}`;
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    function updateSummary() {
        const amt = parseInt(amountInput.value, 10) || 0;
        const slots = parseInt(slotsInput.value, 10) || 0;
        const total = amt * slots;

        summaryTotalEl.textContent = `₦${total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        if (total > currentBalance) {
            lowBalanceNote.classList.add('show');
        } else {
            lowBalanceNote.classList.remove('show');
        }
    }

    // Preset chips for Amount
    document.querySelectorAll('.amt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.amt-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            amountInput.value = chip.getAttribute('data-amt');
            updateSummary();
        });
    });

    amountInput.addEventListener('input', () => {
        document.querySelectorAll('.amt-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-amt') === amountInput.value);
        });
        updateSummary();
    });

    // Preset chips for Slots
    document.querySelectorAll('.slot-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.slot-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            slotsInput.value = chip.getAttribute('data-slots');
            updateSummary();
        });
    });

    slotsInput.addEventListener('input', () => {
        document.querySelectorAll('.slot-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-slots') === slotsInput.value);
        });
        updateSummary();
    });

    // Load wallet balance & existing giveaways
    async function loadGiveaways() {
        try {
            const { data, error } = await window.db.functions.invoke('manage-giveaway', {
                method: 'POST',
                body: { action: 'list' }
            });

            if (error || !data || !data.success) {
                throw new Error(data?.message || error?.message || 'Could not load giveaways.');
            }

            currentBalance = parseFloat(data.wallet_balance || 0);
            balanceEl.textContent = `₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

            if (!senderInput.value && data.default_sender_name) {
                senderInput.value = data.default_sender_name;
            }

            updateSummary();
            renderGiveaways(data.giveaways || []);
        } catch (err) {
            giveawaysList.innerHTML = `<div class="giveaway-card" style="text-align:center;color:#dc2626;font-size:0.8rem;font-weight:700;">${escapeHtml(err.message)}</div>`;
        }
    }

    function renderGiveaways(list) {
        if (!list.length) {
            giveawaysList.innerHTML = `<div class="giveaway-card" style="text-align:center;color:#64748b;font-size:0.82rem;font-weight:600;padding:24px;">You haven't created any airtime giveaways yet.</div>`;
            return;
        }

        giveawaysList.innerHTML = list.map(g => {
            const effectiveStatus = (g.status === 'active' && g.is_expired) ? 'expired' : g.status;
            const pct = Math.min(100, Math.round((g.claimed_count / g.max_claims) * 100));
            const spent = g.claimed_count * Number(g.amount_per_claim);
            const totalBudget = g.max_claims * Number(g.amount_per_claim);
            const expDate = new Date(g.expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
            const canToggle = effectiveStatus === 'active' || effectiveStatus === 'paused';

            const waUrl = buildWhatsAppUrl(g.sender_name, g.amount_per_claim, g.share_url);

            return `
            <div class="giveaway-card" data-id="${escapeHtml(g.id)}">
                <div class="gw-top">
                    <div>
                        <div class="gw-title">₦${Number(g.amount_per_claim).toLocaleString('en-NG')} × ${g.max_claims} Winners</div>
                        <div class="gw-sub">From ${escapeHtml(g.sender_name)} · Expires ${expDate}</div>
                    </div>
                    <span class="gw-badge gw-${effectiveStatus}">${effectiveStatus}</span>
                </div>

                <div class="gw-progress-track">
                    <div class="gw-progress-fill" style="width: ${pct}%;"></div>
                </div>
                <div class="gw-meta">
                    <span>${g.claimed_count} / ${g.max_claims} claimed</span>
                    <span>₦${spent.toLocaleString('en-NG')} / ₦${totalBudget.toLocaleString('en-NG')}</span>
                </div>

                <div class="gw-link-box">${escapeHtml(g.share_url)}</div>

                <div class="gw-actions">
                    <button type="button" class="gw-btn gw-btn-primary js-copy-gw" data-url="${escapeHtml(g.share_url)}">Copy Link</button>
                    <a href="${waUrl}" target="_blank" class="gw-btn gw-btn-wa">WhatsApp</a>
                    ${canToggle ? `
                        <button type="button" class="gw-btn js-toggle-gw" data-id="${escapeHtml(g.id)}" data-next="${effectiveStatus === 'active' ? 'paused' : 'active'}">
                            ${effectiveStatus === 'active' ? 'Pause' : 'Resume'}
                        </button>
                        <button type="button" class="gw-btn gw-btn-danger js-cancel-gw" data-id="${escapeHtml(g.id)}">Cancel</button>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    }

    // Event delegation for giveaway card buttons
    giveawaysList.addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('.js-copy-gw');
        if (copyBtn) {
            copyText(copyBtn.getAttribute('data-url'));
            return;
        }

        const toggleBtn = e.target.closest('.js-toggle-gw');
        if (toggleBtn) {
            const id = toggleBtn.getAttribute('data-id');
            const nextStatus = toggleBtn.getAttribute('data-next');
            toggleBtn.disabled = true;
            toggleBtn.textContent = '...';
            await updateGiveawayStatus(id, nextStatus);
            return;
        }

        const cancelBtn = e.target.closest('.js-cancel-gw');
        if (cancelBtn) {
            pendingCancelId = cancelBtn.getAttribute('data-id');
            cancelModal.classList.add('active');
        }
    });

    document.getElementById('btn-keep-gw').addEventListener('click', () => {
        pendingCancelId = null;
        cancelModal.classList.remove('active');
    });

    document.getElementById('btn-confirm-cancel-gw').addEventListener('click', async () => {
        if (!pendingCancelId) return;
        const btn = document.getElementById('btn-confirm-cancel-gw');
        btn.disabled = true;
        btn.textContent = 'Cancelling...';
        await updateGiveawayStatus(pendingCancelId, 'cancelled');
        btn.disabled = false;
        btn.textContent = 'Cancel Link';
        pendingCancelId = null;
        cancelModal.classList.remove('active');
    });

    async function updateGiveawayStatus(giveawayId, newStatus) {
        try {
            const { data, error } = await window.db.functions.invoke('manage-giveaway', {
                method: 'POST',
                body: { action: 'toggle', giveaway_id: giveawayId, new_status: newStatus }
            });
            if (error || !data || !data.success) {
                throw new Error(data?.message || error?.message || 'Update failed.');
            }
            showToast(data.message, 'success');
            await loadGiveaways();
        } catch (err) {
            showToast(err.message, 'error');
            await loadGiveaways();
        }
    }

    // PIN Keypad Controls
    function updatePinUI() {
        pinDots.forEach((dot, idx) => {
            dot.classList.toggle('filled', idx < currentPinInput.length);
        });
        btnConfirmPin.disabled = currentPinInput.length !== 4;
    }

    keypadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (val === 'back') currentPinInput = currentPinInput.slice(0, -1);
            else if (val && currentPinInput.length < 4) currentPinInput += val;
            updatePinUI();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (!pinModal.classList.contains('active')) return;
        if (/^\d$/.test(e.key) && currentPinInput.length < 4) {
            currentPinInput += e.key;
            updatePinUI();
        } else if (e.key === 'Backspace') {
            currentPinInput = currentPinInput.slice(0, -1);
            updatePinUI();
        } else if (e.key === 'Enter' && currentPinInput.length === 4 && !btnConfirmPin.disabled) {
            btnConfirmPin.click();
        }
    });

    // Open PIN modal on form submit
    document.getElementById('giveaway-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const sender = senderInput.value.trim();
        const amt = parseInt(amountInput.value, 10);
        const slots = parseInt(slotsInput.value, 10);

        if (!sender) return showToast('Enter a display name.', 'error');
        if (isNaN(amt) || amt < 100) return showToast('Minimum airtime amount is ₦100.', 'error');
        if (isNaN(slots) || slots < 2 || slots > 1000) return showToast('Winners must be between 2 and 1,000.', 'error');

        document.getElementById('modal-sender').textContent = sender;
        document.getElementById('modal-per-claim').textContent = `₦${amt.toLocaleString('en-NG')}`;
        document.getElementById('modal-slots').textContent = `${slots.toLocaleString('en-NG')} people`;
        document.getElementById('modal-total').textContent = `₦${(amt * slots).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        currentPinInput = '';
        updatePinUI();
        pinModal.classList.add('active');
    });

    btnCancelPin.addEventListener('click', () => {
        pinModal.classList.remove('active');
        currentPinInput = '';
        updatePinUI();
    });

    btnConfirmPin.addEventListener('click', async () => {
        if (currentPinInput.length !== 4) return;

        const sender = senderInput.value.trim();
        const amt = parseInt(amountInput.value, 10);
        const slots = parseInt(slotsInput.value, 10);

        btnConfirmPin.disabled = true;
        btnCancelPin.disabled = true;
        btnConfirmPin.textContent = 'Creating...';

        try {
            const { data, error } = await window.db.functions.invoke('manage-giveaway', {
                method: 'POST',
                body: {
                    action: 'create',
                    sender_name: sender,
                    amount_per_claim: amt,
                    max_claims: slots,
                    pin: currentPinInput
                }
            });

            if (error) throw new Error(error.message || 'Connection error.');
            if (!data || !data.success) throw new Error(data?.message || 'Failed to create giveaway.');

            pinModal.classList.remove('active');

            const g = data.giveaway;
            lastCreatedUrl = g.share_url;

            document.getElementById('created-link-text').textContent = g.share_url;
            document.getElementById('created-desc').textContent = `₦${amt.toLocaleString('en-NG')} airtime for ${slots} people. Share the link below!`;
            document.getElementById('btn-wa-created').href = buildWhatsAppUrl(g.sender_name, amt, g.share_url);

            const fundWarn = document.getElementById('created-fund-warn');
            const fundBtn = document.getElementById('btn-fund-created');
            if (data.needs_funding) {
                fundWarn.textContent = `Heads up: You need ₦${Number(data.total_needed).toLocaleString('en-NG')} total for all ${slots} winners (current balance: ₦${Number(data.wallet_balance).toLocaleString('en-NG')}). Fund your wallet before sharing!`;
                fundWarn.classList.add('show');
                fundBtn.style.display = 'flex';
            } else {
                fundWarn.classList.remove('show');
                fundBtn.style.display = 'none';
            }

            successOverlay.classList.add('active');
            await loadGiveaways();
        } catch (err) {
            showToast(err.message, 'error');
            currentPinInput = '';
            updatePinUI();
        } finally {
            btnConfirmPin.disabled = currentPinInput.length !== 4;
            btnCancelPin.disabled = false;
            btnConfirmPin.textContent = 'Create Link';
        }
    });

    document.getElementById('btn-copy-created').addEventListener('click', () => {
        if (lastCreatedUrl) copyText(lastCreatedUrl);
    });

    document.getElementById('btn-close-success').addEventListener('click', () => {
        successOverlay.classList.remove('active');
    });

    await loadGiveaways();
});