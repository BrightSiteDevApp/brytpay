document.addEventListener('DOMContentLoaded', async () => {
    // 1. Session Check
    const { data: { session }, error: sessionErr } = await window.db.auth.getSession();
    if (!session || sessionErr) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    
    // UI Elements
    const stateLoading = document.getElementById('state-loading');
    const stateUnregistered = document.getElementById('state-unregistered');
    const stateActive = document.getElementById('state-active');
    
    const btnTriggerBasic = document.getElementById('btn-trigger-basic');
    const btnTriggerKyc = document.getElementById('btn-trigger-kyc');
    
    // Inline upgrade and subtle Request More button
    const btnUpgradeKycInline = document.getElementById('btn-upgrade-kyc-inline');
    const btnRequestMore = document.getElementById('btn-request-more');
    const requestMoreWrapper = document.getElementById('request-more-wrapper');
    
    const kycModal = document.getElementById('kyc-modal');
    const kycForm = document.getElementById('kyc-form');
    const modalError = document.getElementById('modal-error');
    const btnSubmitKyc = document.getElementById('btn-submit-kyc');

    // 2. Custom BrytPay Toast Notification
    window.showToast = function(message, type = 'success') {
        const toast = document.getElementById('bryt-toast');
        const toastText = document.getElementById('toast-text');
        const iconWrap = document.getElementById('toast-icon-wrap');
        
        if (!toast || !toastText || !iconWrap) return;

        toast.className = `bryt-toast toast-${type}`;
        iconWrap.textContent = '';
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "14"); 
        svg.setAttribute("height", "14");
        svg.setAttribute("viewBox", "0 0 24 24"); 
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor"); 
        svg.setAttribute("stroke-width", "3");

        if (type === 'success') {
            const poly = document.createElementNS(svgNS, "polyline");
            poly.setAttribute("points", "20 6 9 17 4 12");
            svg.appendChild(poly);
        } else {
            const l1 = document.createElementNS(svgNS, "line");
            l1.setAttribute("x1", "18"); l1.setAttribute("y1", "6"); l1.setAttribute("x2", "6"); l1.setAttribute("y2", "18");
            const l2 = document.createElementNS(svgNS, "line");
            l2.setAttribute("x1", "6"); l2.setAttribute("y1", "6"); l2.setAttribute("x2", "18"); l2.setAttribute("y2", "18");
            svg.appendChild(l1); 
            svg.appendChild(l2);
        }
        iconWrap.appendChild(svg);
        toastText.textContent = message; 
        toast.classList.add('show');
        
        setTimeout(() => toast.classList.remove('show'), 4000);
    };

    // 3. Initial Data Load
    await Promise.all([loadWalletBalance(user.id), loadAccountState(user.id)]);

    // 4. Realtime Wallet Sync
    window.db.channel(`wallet-balance-sync-${user.id}`).on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => {
            if (payload.new && typeof payload.new.balance !== 'undefined') {
                renderBalance(payload.new.balance);
                window.showToast('Wallet balance updated!', 'success');
            }
        }).subscribe();

    async function loadWalletBalance(userId) {
        const { data: wallet } = await window.db.from('wallets').select('balance').eq('user_id', userId).single();
        if (wallet && wallet.balance !== null) renderBalance(wallet.balance);
    }
    
    function renderBalance(val) { 
        const balanceEl = document.getElementById('user-balance');
        if(balanceEl) {
            balanceEl.textContent = `₦${parseFloat(val).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`; 
        }
    }

    // 5. Render Virtual Account State
    async function loadAccountState(userId) {
        try {
            const { data: profile } = await window.db
                .from('profiles')
                .select('palmpay_account_number, moniepoint_account_number, psb9_account_number, payvessel_palmpay_account_number, virtual_account_name')
                .eq('id', userId)
                .single();
                
            if(stateLoading) stateLoading.style.display = 'none';

            const hasAnyAccount = profile && (profile.palmpay_account_number || profile.moniepoint_account_number || profile.psb9_account_number || profile.payvessel_palmpay_account_number);

            if (hasAnyAccount) {
                // Apply dynamic user name to Topify accounts
                const userDynName = profile.virtual_account_name || user.email;
                const topifyNameEl = document.getElementById('acc-name-topify');
                const moniepointNameEl = document.getElementById('acc-name-moniepoint');
                
                if(topifyNameEl) topifyNameEl.textContent = userDynName;
                if(moniepointNameEl) moniepointNameEl.textContent = userDynName;

                // Show/Hide specific bank cards
                toggleAccountCard('palmpay-card-1', profile.palmpay_account_number);
                toggleAccountCard('palmpay-card-2', profile.payvessel_palmpay_account_number);
                toggleAccountCard('moniepoint-card', profile.moniepoint_account_number);
                
                const hasPsb9 = profile.psb9_account_number;
                toggleAccountCard('psb9-card', hasPsb9);

                const isVerified = profile.palmpay_account_number || profile.moniepoint_account_number || profile.payvessel_palmpay_account_number;
                const hasPayvessel = profile.payvessel_palmpay_account_number;

                // Adjust 9PSB limits, badges, and inline upgrade box
                const psb9Badge = document.getElementById('psb9-badge');
                const psb9LimitText = document.getElementById('psb9-limit-text');
                const inlineUpgradeBox = document.getElementById('inline-upgrade-box');

                if (hasPsb9) {
                    if (isVerified) { 
                        if(psb9Badge) { psb9Badge.className = 'account-tag tag-active'; psb9Badge.innerHTML = '<i class="fas fa-check-circle"></i> Verified'; }
                        if(psb9LimitText) psb9LimitText.style.display = 'none'; 
                        if(inlineUpgradeBox) inlineUpgradeBox.style.display = 'none'; 
                    } else { 
                        if(psb9Badge) { psb9Badge.className = 'account-tag tag-basic'; psb9Badge.textContent = '₦30,000 Limit'; }
                        if(psb9LimitText) psb9LimitText.style.display = 'block'; 
                        if(inlineUpgradeBox) inlineUpgradeBox.style.display = 'block'; 
                    }
                }

                // Show "Need more virtual accounts?" ONLY to verified users who are missing Payvessel
                if (requestMoreWrapper) {
                    requestMoreWrapper.style.display = (isVerified && !hasPayvessel) ? 'block' : 'none';
                }

                if(stateUnregistered) stateUnregistered.style.display = 'none';
                if(stateActive) stateActive.style.display = 'block';
            } else {
                if(stateActive) stateActive.style.display = 'none';
                if(stateUnregistered) stateUnregistered.style.display = 'block';
            }
        } catch (err) {
            console.error(err);
            if(stateLoading) stateLoading.style.display = 'none';
            if(stateUnregistered) stateUnregistered.style.display = 'block';
        }
    }

    function toggleAccountCard(cardId, accNumber) {
        const card = document.getElementById(cardId);
        if (!card) return;
        if (accNumber) { 
            card.style.display = 'block'; 
            card.querySelector('.account-num').textContent = accNumber; 
        } else { 
            card.style.display = 'none'; 
        }
    }

    // 6. Modals & Actions
    const openModal = () => { 
        if(modalError) modalError.style.display = 'none'; 
        if(kycModal) kycModal.style.display = 'flex'; 
    };
    
    if (btnTriggerKyc) btnTriggerKyc.onclick = openModal;
    if (btnUpgradeKycInline) btnUpgradeKycInline.onclick = openModal;
    if (btnRequestMore) btnRequestMore.onclick = openModal;
    
    const modalCloseBtn = document.getElementById('modal-close');
    if(modalCloseBtn) {
        modalCloseBtn.onclick = () => { kycModal.style.display = 'none'; };
    }

    // Basic Account Action
    if (btnTriggerBasic) {
        btnTriggerBasic.onclick = async () => {
            btnTriggerBasic.disabled = true;
            const originalText = btnTriggerBasic.innerHTML;
            btnTriggerBasic.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

            try {
                const { data: { session: freshSession } } = await window.db.auth.getSession();
                const response = await fetch(`${window.db.supabaseUrl}/functions/v1/reserve-virtual-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freshSession.access_token}` },
                    body: JSON.stringify({ action: 'reserve_basic' })
                });

                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Failed to generate basic account.');

                window.showToast('9PSB Basic Account generated!', 'success');
                
                if(stateUnregistered) stateUnregistered.style.display = 'none';
                if(stateLoading) stateLoading.style.display = 'block';
                
                await loadAccountState(user.id);
            } catch (err) {
                window.showToast(err.message, 'error');
                btnTriggerBasic.disabled = false;
                btnTriggerBasic.innerHTML = originalText;
            }
        };
    }

    // Verified KYC Action
    if (kycForm) {
        kycForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(modalError) modalError.style.display = 'none';

            const docType = document.getElementById('doc-type').value;
            const docNumber = document.getElementById('doc-number').value.trim();
            const phoneNumber = document.getElementById('user-phone').value.trim();

            const isDocValid = /^\d{11}$/.test(docNumber);
            const isPhoneValid = /^\d{11}$/.test(phoneNumber);

            if (!isDocValid) {
                if(modalError) { modalError.textContent = 'Identity number must be exactly 11 digits.'; modalError.style.display = 'block'; }
                return;
            }

            if (!isPhoneValid) {
                if(modalError) { modalError.textContent = 'Phone number must be exactly 11 digits.'; modalError.style.display = 'block'; }
                return;
            }

            btnSubmitKyc.disabled = true;
            btnSubmitKyc.textContent = 'Provisioning Accounts...';

            try {
                const { data: { session: freshSession } } = await window.db.auth.getSession();
                
                // If they are upgrading or requesting more, we call reserve_all to ensure they get Payvessel
                const response = await fetch(`${window.db.supabaseUrl}/functions/v1/reserve-virtual-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freshSession.access_token}` },
                    body: JSON.stringify({
                        action: 'reserve_all',
                        identityType: docType,
                        identityNumber: docNumber,
                        phoneNumber: phoneNumber,
                        fullName: user.user_metadata?.full_name || 'BRYT Pay User'
                    })
                });

                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Failed to provision accounts.');

                if(kycModal) kycModal.style.display = 'none';
                if(stateUnregistered) stateUnregistered.style.display = 'none';
                if(stateActive) stateActive.style.display = 'none';
                if(stateLoading) stateLoading.style.display = 'block';
                
                await loadAccountState(user.id);
                window.showToast('Virtual accounts generated successfully!', 'success');
            } catch (err) {
                if(modalError) {
                    modalError.textContent = err.message;
                    modalError.style.display = 'block';
                }
                btnSubmitKyc.disabled = false;
                btnSubmitKyc.textContent = 'Provision Accounts';
            }
        });
    }
});

// Clipboard function made global
window.copyAccountNumber = function(elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    
    const accNumber = el.textContent.trim();
    if (!accNumber || accNumber === 'Unavailable' || accNumber === 'Not Activated' || accNumber === '0000000000') return;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(accNumber).then(() => { 
            window.showToast(`Copied ${accNumber} to clipboard!`, 'success'); 
        });
    } else {
        const temp = document.createElement('textarea'); 
        temp.value = accNumber;
        document.body.appendChild(temp); 
        temp.select(); 
        document.execCommand('copy'); 
        document.body.removeChild(temp);
        window.showToast(`Copied ${accNumber} to clipboard!`, 'success');
    }
}