document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error: sessionErr } = await window.db.auth.getSession();
    if (!session || sessionErr) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    const stateLoading = document.getElementById('state-loading');
    const stateActive = document.getElementById('state-active');
    const stateUnregistered = document.getElementById('state-unregistered'); // Fallback state
    const btnTriggerBasic = document.getElementById('btn-trigger-basic'); // Manual generation trigger
    
    const btnUpgradeKycInline = document.getElementById('btn-upgrade-kyc-inline');
    const kycModal = document.getElementById('kyc-modal');
    const kycForm = document.getElementById('kyc-form');
    const modalError = document.getElementById('modal-error');
    const btnSubmitKyc = document.getElementById('btn-submit-kyc');

    window.showToast = function(message, type = 'success') {
        const toast = document.getElementById('bryt-toast');
        const toastText = document.getElementById('toast-text');
        const iconWrap = document.getElementById('toast-icon-wrap');
        
        if (!toast || !toastText || !iconWrap) return;
        toast.className = `bryt-toast toast-${type}`;
        iconWrap.textContent = '';
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "14"); svg.setAttribute("height", "14");
        svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "3");

        if (type === 'success') {
            const poly = document.createElementNS(svgNS, "polyline");
            poly.setAttribute("points", "20 6 9 17 4 12"); svg.appendChild(poly);
        } else {
            const l1 = document.createElementNS(svgNS, "line"); l1.setAttribute("x1", "18"); l1.setAttribute("y1", "6"); l1.setAttribute("x2", "6"); l1.setAttribute("y2", "18");
            const l2 = document.createElementNS(svgNS, "line"); l2.setAttribute("x1", "6"); l2.setAttribute("y1", "6"); l2.setAttribute("x2", "18"); l2.setAttribute("y2", "18");
            svg.appendChild(l1); svg.appendChild(l2);
        }
        iconWrap.appendChild(svg); toastText.textContent = message; toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    };

    window.copyVirtualAccount = function(accNo) {
        if (!accNo || accNo === '0000000000') return;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(accNo).then(() => { window.showToast(`Copied ${accNo} to clipboard!`, 'success'); });
        } else {
            const temp = document.createElement('textarea'); temp.value = accNo; document.body.appendChild(temp); 
            temp.select(); document.execCommand('copy'); document.body.removeChild(temp);
            window.showToast(`Copied ${accNo} to clipboard!`, 'success');
        }
    };

    await Promise.all([loadWalletBalance(user.id), loadAccountState(user.id)]);

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
        if(balanceEl) balanceEl.textContent = `₦${parseFloat(val).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`; 
    }

    async function loadAccountState(userId) {
        try {
            const { data: profile } = await window.db.from('profiles').select('full_name, psb9_account_number, palmpay_account_number, payvessel_palmpay_account_number, moniepoint_account_number, virtual_account_name').eq('id', userId).single();
            if(stateLoading) stateLoading.style.display = 'none';

            if (profile && profile.psb9_account_number) {
                const vaContainer = document.getElementById('virtual-accounts-container');
                if (vaContainer) {
                    let cardsHtml = '';
                    const legacyTopifyName = profile.virtual_account_name || profile.full_name || 'BRYT Pay User';
                    
                    const buildCard = (bankName, accNo, displayAccName, feeText) => {
                        return `
                        <div class="va-card">
                            <div class="va-info-left">
                                <div class="va-icon-wrap">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="21" width="18" height="2"></rect><polygon points="12 3 3 9 21 9 12 3"></polygon><line x1="6" y1="12" x2="6" y2="18"></line><line x1="10" y1="12" x2="10" y2="18"></line><line x1="14" y1="12" x2="14" y2="18"></line><line x1="18" y1="12" x2="18" y2="18"></line></svg>
                                </div>
                                <div>
                                    <div class="va-bank-title">${bankName}</div>
                                    <div class="va-acc-number">${accNo}</div>
                                    <div class="va-acc-name">${displayAccName}</div>
                                    <div class="va-fee-text">${feeText}</div>
                                </div>
                            </div>
                            <button class="btn-va-copy" onclick="copyVirtualAccount('${accNo}')">Copy</button>
                        </div>`;
                    };

                    if (profile.psb9_account_number) {
                        cardsHtml += buildCard('9Payment Service Bank (9PSB)', profile.psb9_account_number, 'PAYVESSEL/BRYT Pay', 'Fixed fee: ₦50');
                    }
                    if (profile.palmpay_account_number) {
                        cardsHtml += buildCard('PalmPay', profile.palmpay_account_number, legacyTopifyName, 'Fixed fee: 1.5%');
                    }
                    if (profile.payvessel_palmpay_account_number) {
                        cardsHtml += buildCard('PalmPay', profile.payvessel_palmpay_account_number, 'BRYT Pay (Nexpay)', 'Fixed fee: 1.5%');
                    }
                    if (profile.moniepoint_account_number) {
                        cardsHtml += buildCard('Moniepoint', profile.moniepoint_account_number, legacyTopifyName, 'Fixed fee: 1.5%');
                    }

                    vaContainer.innerHTML = cardsHtml;
                }

                const isVerified = profile.palmpay_account_number || profile.payvessel_palmpay_account_number;
                const inlineUpgradeBox = document.getElementById('inline-upgrade-box');

                if (isVerified) { 
                    if(inlineUpgradeBox) inlineUpgradeBox.style.display = 'none'; 
                } else { 
                    if(inlineUpgradeBox) inlineUpgradeBox.style.display = 'block'; 
                }

                if(stateUnregistered) stateUnregistered.style.display = 'none';
                if(stateActive) stateActive.style.display = 'block';
            } else {
                // If they don't have an account, show the manual trigger fallback
                if(stateActive) stateActive.style.display = 'none';
                if(stateUnregistered) stateUnregistered.style.display = 'block';
            }
        } catch (err) {
            console.error(err);
            if(stateLoading) stateLoading.style.display = 'none';
            if(stateUnregistered) stateUnregistered.style.display = 'block';
        }
    }

    // 🚀 MANUAL GENERATION LOGIC
    if (btnTriggerBasic) {
        btnTriggerBasic.onclick = async () => {
            btnTriggerBasic.disabled = true;
            const originalText = btnTriggerBasic.innerHTML;
            btnTriggerBasic.textContent = 'Generating...';

            try {
                const { data: { session: freshSession } } = await window.db.auth.getSession();
                const response = await fetch(`${window.db.supabaseUrl}/functions/v1/reserve-virtual-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freshSession.access_token}` },
                    body: JSON.stringify({ action: 'reserve_basic' })
                });

                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Failed to generate account.');

                window.showToast('Account generated successfully!', 'success');
                
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

    if (btnUpgradeKycInline) btnUpgradeKycInline.onclick = () => { if(modalError) modalError.style.display = 'none'; if(kycModal) kycModal.style.display = 'flex'; };
    if (document.getElementById('modal-close')) document.getElementById('modal-close').onclick = () => { kycModal.style.display = 'none'; };

    if (kycForm) {
        kycForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(modalError) modalError.style.display = 'none';

            const docType = document.getElementById('doc-type').value;
            const docNumber = document.getElementById('doc-number').value.trim();

            if (!/^\d{11}$/.test(docNumber)) {
                if(modalError) { modalError.textContent = 'Identity number must be exactly 11 digits.'; modalError.style.display = 'block'; }
                return;
            }

            btnSubmitKyc.disabled = true; btnSubmitKyc.textContent = 'Provisioning Accounts...';

            try {
                const { data: { session: freshSession } } = await window.db.auth.getSession();
                const response = await fetch(`${window.db.supabaseUrl}/functions/v1/reserve-virtual-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freshSession.access_token}` },
                    body: JSON.stringify({ action: 'upgrade_and_expand', identityType: docType, identityNumber: docNumber })
                });

                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Failed to upgrade accounts.');

                if(kycModal) kycModal.style.display = 'none';
                if(stateActive) stateActive.style.display = 'none';
                if(stateLoading) stateLoading.style.display = 'block';
                
                await loadAccountState(user.id);
                window.showToast('Virtual accounts verified successfully!', 'success');
            } catch (err) {
                if(modalError) { modalError.textContent = err.message; modalError.style.display = 'block'; }
                btnSubmitKyc.disabled = false; btnSubmitKyc.textContent = 'Verify & Upgrade';
            }
        });
    }
});