document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    let selectedNetwork = 'mtn';

    if (window.BRYT_BRANDS) {
        document.getElementById('logo-mtn').innerHTML = window.BRYT_BRANDS['mtn'] || 'MTN';
        document.getElementById('logo-airtel').innerHTML = window.BRYT_BRANDS['airtel'] || 'Airtel';
        document.getElementById('logo-glo').innerHTML = window.BRYT_BRANDS['glo'] || 'Glo';
        document.getElementById('logo-9mo').innerHTML = window.BRYT_BRANDS['9mobile'] || '9mo';
    }

    const denomSelect = document.getElementById('denomination');
    const qtyInput = document.getElementById('quantity');
    const calcTotalEl = document.getElementById('calc-total');
    const epinForm = document.getElementById('epin-form');
    
    const formContainer = document.getElementById('epin-form-container');
    const successView = document.getElementById('success-view');
    const printableVouchers = document.getElementById('printable-vouchers');
    
    const confirmModal = document.getElementById('confirm-modal');
    const modalNetwork = document.getElementById('modal-network');
    const modalQty = document.getElementById('modal-qty');
    const modalAmount = document.getElementById('modal-amount');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const downloadImgBtn = document.getElementById('download-img-btn');

    const fetchBalance = async () => {
        const { data } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (data) document.getElementById('user-balance').textContent = `₦${parseFloat(data.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    };
    await fetchBalance();

    const updateTotal = () => {
        const total = (parseInt(denomSelect.value) || 0) * (parseInt(qtyInput.value) || 1);
        calcTotalEl.textContent = `₦${total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    };
    denomSelect.addEventListener('change', updateTotal);
    qtyInput.addEventListener('input', updateTotal);

    document.querySelectorAll('.network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.network-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedNetwork = btn.getAttribute('data-network');
        });
    });

    epinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const qty = parseInt(qtyInput.value);
        if (qty < 1 || qty > 40) return alert("Quantity must be between 1 and 40.");

        const total = parseInt(denomSelect.value) * qty;
        modalNetwork.textContent = selectedNetwork;
        modalQty.textContent = `${qty}x ₦${denomSelect.value} PIN(s)`;
        modalAmount.textContent = `₦${total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        
        confirmModal.style.display = 'flex';
    });

    modalCancel.addEventListener('click', () => confirmModal.style.display = 'none');

    modalConfirm.addEventListener('click', async () => {
        const denom = parseInt(denomSelect.value);
        const qty = parseInt(qtyInput.value);

        modalConfirm.disabled = true;
        modalCancel.disabled = true;
        modalConfirm.textContent = 'Generating...';

        try {
            const { data: resData, error } = await window.db.functions.invoke('vend-epins', {
                body: { network: selectedNetwork, denomination: denom, quantity: qty }
            });

            // 🚀 SMART ERROR EXTRACTOR (Reveals the true backend error)
            if (error) {
                let detailedMsg = error.message;
                try {
                    const errorBody = await error.context.json();
                    if (errorBody && errorBody.message) detailedMsg = errorBody.message;
                } catch (_) {}
                throw new Error(detailedMsg);
            }

            if (resData && resData.success === false) throw new Error(resData.message);

            confirmModal.style.display = 'none';
            formContainer.style.display = 'none';
            document.getElementById('back-link').style.display = 'none';
            
            // Build the Premium Cards
            let cardsHTML = '';
            const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

            resData.pins.forEach(pinObj => {
                cardsHTML += `
                    <div class="receipt-card">
                        <div class="receipt-content-wrapper">
                            <div class="receipt-header">
                                <img src="../../assets/img/brytpay-logo.png" alt="BRYT Pay" class="receipt-logo-img">
                                <div class="receipt-title">${selectedNetwork} ₦${pinObj.amount || pinObj.Amount || denom}</div>
                            </div>
                            
                            <div class="receipt-amount-box">
                                <div class="receipt-amount-label">Recharge PIN</div>
                                <div class="receipt-amount">${pinObj.pin}</div>
                            </div>

                            <div class="receipt-details">
                                <div class="receipt-row">
                                    <div class="receipt-key">Serial Number</div>
                                    <div class="receipt-value">${pinObj.serial || pinObj.serial_number || 'N/A'}</div>
                                </div>
                                <div class="receipt-row" style="margin-top: 8px;">
                                    <div class="receipt-key">Instruction</div>
                                    <div class="receipt-value" style="font-size: 0.8rem;">${pinObj.instruction || `Dial *311*PIN#`}</div>
                                </div>
                            </div>

                            <div class="receipt-footer">
                                <p>Generated securely by BRYT Pay • ${today}</p>
                            </div>
                        </div>
                    </div>
                `;
            });

            printableVouchers.innerHTML = cardsHTML;
            successView.style.display = 'block';
            await fetchBalance();

        } catch (err) {
            // 🚀 NOW THIS WILL SHOW THE ACTUAL ERROR
            alert(`Transaction Failed: ${err.message}`);
            modalConfirm.disabled = false;
            modalCancel.disabled = false;
            modalConfirm.textContent = 'Confirm & Pay';
            confirmModal.style.display = 'none';
        }
    });

    // Handle PDF Download
    downloadPdfBtn.addEventListener('click', () => {
        downloadPdfBtn.disabled = true;
        const originalText = downloadPdfBtn.innerHTML;
        downloadPdfBtn.textContent = 'Generating PDF...';

        const element = document.getElementById('printable-vouchers');
        const opt = {
            margin:       0.5,
            filename:     `BRYT_ePINs_${Date.now()}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.innerHTML = originalText;
        });
    });

    // Handle PNG Image Download (High Quality)
    downloadImgBtn.addEventListener('click', async () => {
        downloadImgBtn.disabled = true;
        const originalText = downloadImgBtn.innerHTML;
        downloadImgBtn.textContent = 'Generating Image...';

        const element = document.getElementById('printable-vouchers');
        
        try {
            const canvas = await html2canvas(element, { scale: 3, useCORS: true });
            const link = document.createElement('a');
            link.download = `BRYT_ePINs_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            alert('Failed to generate image. Please try PDF.');
        } finally {
            downloadImgBtn.disabled = false;
            downloadImgBtn.innerHTML = originalText;
        }
    });

    document.getElementById('new-btn').addEventListener('click', () => {
        successView.style.display = 'none';
        formContainer.style.display = 'block';
        document.getElementById('back-link').style.display = 'inline-flex';
        qtyInput.value = 1;
        updateTotal();
        modalConfirm.disabled = false;
        modalCancel.disabled = false;
        modalConfirm.textContent = 'Confirm & Pay';
    });
});