document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }
    const user = session.user;

    // 🚀 SMART BACK BUTTON ROUTING
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
            poly.setAttribute("points", "20 6 9 17 4 12"); svg.appendChild(poly);
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

    const { data: walletData } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
    if (walletData) {
        document.getElementById('user-balance').textContent = `₦${parseFloat(walletData.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }

    const tabManual = document.getElementById('tab-manual');
    const tabAuto = document.getElementById('tab-auto');
    const manualSection = document.getElementById('manual-section');
    const autoSection = document.getElementById('auto-section');

    tabAuto.addEventListener('click', () => {
        tabAuto.classList.add('active'); tabManual.classList.remove('active');
        autoSection.style.display = 'block'; manualSection.style.display = 'none';
    });

    tabManual.addEventListener('click', () => {
        tabManual.classList.add('active'); tabAuto.classList.remove('active');
        manualSection.style.display = 'block'; autoSection.style.display = 'none';
    });

    const IS_SANDBOX = false;

    const PRICING_CONFIG = {
        'waec': { cost: IS_SANDBOX ? 3340 : 5140, margin: 0.05 },
        'neco': { cost: IS_SANDBOX ? 1135 : 2000, margin: 0.10 },
        'nabteb': { cost: IS_SANDBOX ? 820 : 820, margin: 0.15 }
    };

    let autoExamType = 'waec';
    let autoExamLogo = 'waec-logo.png';

    const selectWrapper = document.getElementById('custom-select-wrapper');
    const selectTrigger = document.getElementById('custom-select-trigger');
    const selectText = document.getElementById('custom-select-text');
    const optionsList = document.getElementById('custom-options-list');
    const hiddenQtyInput = document.getElementById('exam-quantity');

    const confirmModal = document.getElementById('confirm-modal');
    const modalNetworkLogo = document.getElementById('modal-network-logo');
    const modalPlan = document.getElementById('modal-plan');
    const modalQty = document.getElementById('modal-qty');
    const modalAmount = document.getElementById('modal-amount');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');
    
    const successOverlay = document.getElementById('success-overlay');
    const pinRevealBox = document.getElementById('pin-reveal-content');
    const liveDownloadBtn = document.getElementById('btn-download-receipt-live');

    function renderQtyDropdown() {
        optionsList.textContent = '';
        const config = PRICING_CONFIG[autoExamType];
        const unitPrice = Math.ceil(config.cost * (1 + config.margin));

        selectText.textContent = 'Select quantity...';
        selectText.style.opacity = '0.6';
        hiddenQtyInput.value = '';

        for (let i = 1; i <= 5; i++) {
            const total = unitPrice * i;
            const formattedPrice = `₦${total.toLocaleString('en-NG')}`;

            const opt = document.createElement('div');
            opt.className = 'custom-option';
            opt.innerHTML = `<span>${i} PIN${i > 1 ? 's' : ''}</span> <strong>${formattedPrice}</strong>`;
            opt.dataset.qty = i;
            opt.dataset.total = total;

            opt.addEventListener('click', () => {
                hiddenQtyInput.value = i;
                hiddenQtyInput.dataset.total = total;
                selectText.textContent = `${i} PIN${i > 1 ? 's' : ''} — ${formattedPrice}`;
                selectText.style.opacity = '1';
                selectWrapper.classList.remove('open');
            });

            optionsList.appendChild(opt);
        }
    }
    renderQtyDropdown();

    selectTrigger.addEventListener('click', () => selectWrapper.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) selectWrapper.classList.remove('open');
    });

    document.querySelectorAll('.auto-exam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.auto-exam-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            autoExamType = btn.getAttribute('data-exam');
            autoExamLogo = btn.getAttribute('data-logo');
            renderQtyDropdown();
        });
    });

    window.downloadReceipt = async function(examType, pinsText) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const pinLines = pinsText.split('\n').filter(l => l.trim() !== '');

        const scale = 3; 
        const baseWidth = 640;
        const baseHeight = 290 + (pinLines.length * 90);

        canvas.width = baseWidth * scale;
        canvas.height = baseHeight * scale;
        
        ctx.scale(scale, scale);
        ctx.textBaseline = 'middle'; 

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, baseWidth, baseHeight);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 20, baseWidth - 40, baseHeight - 40);

        ctx.fillStyle = '#1D5ED0';
        ctx.fillRect(20, 20, baseWidth - 40, 100);

        const loadImg = (src) => new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });

        const brytLogo = await loadImg('../../assets/img/brytpay-logo.png');
        const examLogo = await loadImg(`../../assets/img/${examType.toLowerCase()}-logo.png`);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${examType.toUpperCase()} RESULT CHECKER`, 45, 70);

        if (examLogo) {
            ctx.beginPath();
            ctx.arc(baseWidth - 80, 70, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.drawImage(examLogo, baseWidth - 115, 35, 70, 70); 
        }

        let y = 180;
        pinLines.forEach((line) => {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(45, y - 35, baseWidth - 90, 75);
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(45, y - 38, baseWidth - 90, 75);
            
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(line, baseWidth / 2, y);
            y += 90;
        });

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(20, baseHeight - 100, baseWidth - 40, 2);

        if (brytLogo) {
            ctx.drawImage(brytLogo, (baseWidth / 2) - 60, baseHeight - 85, 120, 50);
        } else {
            ctx.fillStyle = '#1D5ED0';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BRYT PAY', baseWidth / 2, baseHeight - 60);
        }

        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Visit brytpay.name.ng to purchase more securely', baseWidth / 2, baseHeight - 20);

        if (window.Capacitor !== undefined) {
            // NATIVE MOBILE DOWNLOAD
            const base64data = canvas.toDataURL('image/png', 1.0).split(',')[1];
            const fileName = `BRYT_${examType.toUpperCase()}_PIN.png`;
            try {
                const savedFile = await window.Capacitor.Plugins.Filesystem.writeFile({
                    path: fileName, data: base64data, directory: 'CACHE'
                });
                await window.Capacitor.Plugins.Share.share({ title: 'PIN Card', url: savedFile.uri });
            } catch (err) {
                showToast("Save failed", "error");
            }
        } else {
            // CHROME WEB DOWNLOAD
            const link = document.createElement('a');
            link.download = `BRYT_${examType.toUpperCase()}_PIN.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        }
    };

    document.getElementById('auto-exam-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const qty = hiddenQtyInput.value;
        const totalAmount = parseFloat(hiddenQtyInput.dataset.total);

        if (!qty) return showToast("Please select a quantity.", "error");

        const { data: currentWallet } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (currentWallet && parseFloat(currentWallet.balance) < totalAmount) {
            return showToast(`Insufficient balance. You need ₦${totalAmount.toLocaleString()} to purchase ${qty} PIN(s).`, "error");
        }

        modalNetworkLogo.src = `../../assets/img/${autoExamLogo}`;
        modalPlan.textContent = `${autoExamType.toUpperCase()}`;
        modalQty.textContent = `${qty} PIN${qty > 1 ? 's' : ''}`;
        modalAmount.textContent = `₦${totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        confirmModal.style.display = 'flex';
    });

    btnCancel.addEventListener('click', () => confirmModal.style.display = 'none');

    btnConfirm.addEventListener('click', async () => {
        const qty = hiddenQtyInput.value;
        
        btnConfirm.disabled = true;
        btnCancel.disabled = true;
        btnConfirm.innerHTML = 'Processing...';

        try {
            const { data: resData, error } = await window.db.functions.invoke('vend-exam-swift', {
                body: { exam_type: autoExamType, quantity: qty }
            });

            if (error) throw new Error(error.message);
            if (resData && resData.success === false) throw new Error(resData.message);

            confirmModal.style.display = 'none';
            const safePins = resData.pins.replace(/"/g, '&quot;').replace(/\n/g, '\\n');

            // 🚀 TRIGGER NEW FULLSCREEN PIN REVEAL UI
            pinRevealBox.innerHTML = resData.pins;
            
            // Re-wire the download button with the fresh pin data
            liveDownloadBtn.onclick = () => downloadReceipt(autoExamType, safePins);
            
            successOverlay.classList.add('active');

        } catch (err) {
            showToast(err.message, "error");
            btnConfirm.disabled = false;
            btnCancel.disabled = false;
            btnConfirm.innerHTML = 'Confirm & Pay';
            confirmModal.style.display = 'none';
        }
    });

    // MANUAL LOGIC
    let manualExam = 'WAEC';
    let manualPrice = 5500;
    const slipAmountEl = document.getElementById('slip-amount');

    document.querySelectorAll('.manual-exam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.manual-exam-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            manualExam = btn.getAttribute('data-exam');
            manualPrice = parseFloat(btn.getAttribute('data-price'));
            slipAmountEl.textContent = `₦${manualPrice.toLocaleString('en-NG')}`;
        });
    });

    document.getElementById('copy-btn').addEventListener('click', async () => {
        const btn = document.getElementById('copy-btn');
        const accNo = document.getElementById('acc-no').textContent.trim();
        const originalText = btn.innerHTML;

        const successUI = () => {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #0ea5e9;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(accNo);
                return successUI();
            } catch (err) {}
        }

        const textArea = document.createElement("textarea");
        textArea.value = accNo;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) successUI();
        } catch (err) {}
        document.body.removeChild(textArea);
    });

    document.getElementById('whatsapp-btn').addEventListener('click', () => {
        const encodedMessage = encodeURIComponent(`Hello, I have made a payment of ₦${manualPrice.toLocaleString('en-NG')} to your Fidelity Bank account for a ${manualExam} PIN. Kindly verify and provide the PIN.`);
        window.open(`https://wa.me/2349153375488?text=${encodedMessage}`, '_blank');
    });
});