document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }
    const user = session.user;

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

    // --- TABS LOGIC ---
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

    // =========================================================
    // 🚀 DYNAMIC 5% PROFIT CALCULATOR
    // =========================================================
    let autoExamType = 'waec';
    let autoExamLogo = 'waec-logo.png';
    
    const API_COSTS = { 'waec': 5454.00, 'neco': 2090.90, 'nabteb': 959.50 };

    const selectWrapper = document.getElementById('custom-select-wrapper');
    const selectTrigger = document.getElementById('custom-select-trigger');
    const selectText = document.getElementById('custom-select-text');
    const optionsList = document.getElementById('custom-options-list');
    const hiddenQtyInput = document.getElementById('exam-quantity');

    function renderQtyDropdown() {
        optionsList.textContent = '';
        
        // Add 5% and Round Up (Mirrors the backend math perfectly)
        const unitPrice = Math.ceil(API_COSTS[autoExamType] * 1.05);

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

    // =========================================================
    // 🎨 CUSTOM PIN IMAGE GENERATOR
    // =========================================================
    window.downloadReceipt = async function(examType, pinsText) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const pinLines = pinsText.split('\n').filter(l => l.trim() !== '');
        
        canvas.width = 600;
        canvas.height = 200 + (pinLines.length * 80);
        
        // Base Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Header Rectangle
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, 120);
        ctx.fillStyle = '#1D5ED0';
        ctx.fillRect(0, 118, canvas.width, 4); // Blue accent line

        // Helper to load images safely
        const loadImg = (src) => new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });

        const brytLogo = await loadImg('../../assets/img/brytpay-logo.png');
        const examLogo = await loadImg(`../../assets/img/${examType.toLowerCase()}-logo.png`);

        if (brytLogo) ctx.drawImage(brytLogo, 30, 30, 120, 60); 
        // Force the exam logo to maintain a neat square aspect ratio
        if (examLogo) ctx.drawImage(examLogo, canvas.width - 110, 20, 80, 80); 

        // Title text
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${examType.toUpperCase()} Result Checker`, canvas.width / 2, 75);

        // PIN Section
        let y = 180;
        pinLines.forEach(line => {
            // Draw a soft grey box behind each PIN
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(40, y - 30, canvas.width - 80, 50);
            
            // Draw the actual PIN text
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(line, canvas.width / 2, y);
            y += 70;
        });

        // Footer Text
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Get instant PINs and VTU services at brytpay.name.ng', canvas.width / 2, canvas.height - 30);

        // Trigger the download automatically
        const link = document.createElement('a');
        link.download = `BRYT_${examType.toUpperCase()}_PIN.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // =========================================================
    // 🚀 EXECUTE AUTOMATIC VENDING
    // =========================================================
    document.getElementById('auto-exam-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const qty = hiddenQtyInput.value;
        const totalAmount = parseFloat(hiddenQtyInput.dataset.total);
        
        if (!qty) {
            showToast("Please select a quantity.", "error");
            return;
        }

        const { data: currentWallet } = await window.db.from('wallets').select('balance').eq('user_id', user.id).single();
        if (currentWallet && parseFloat(currentWallet.balance) < totalAmount) {
            showToast(`Insufficient balance. You need ₦${totalAmount.toLocaleString()} to purchase ${qty} PIN(s).`, "error");
            return;
        }

        const submitBtn = document.getElementById('auto-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing Payment...';

        try {
            const { data: resData, error } = await window.db.functions.invoke('vend-exam-swift', {
                body: { exam_type: autoExamType, quantity: qty }
            });

            if (error) throw new Error(error.message);
            if (resData && resData.success === false) throw new Error(resData.message);

            // Escaping the pins text specifically for the onclick handler
            const safePins = resData.pins.replace(/"/g, '&quot;').replace(/\n/g, '\\n');

            // Hide form and show the generated PINs with the Download Button!
            document.getElementById('auto-exam-form').innerHTML = `
                <div style="text-align: center; padding: 24px 0;">
                    <div style="width: 56px; height: 56px; background: #dcfce7; border-radius: 50%; color: #16a34a; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h3 style="color: #0f172a; margin-bottom: 8px;">Purchase Successful!</h3>
                    <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 24px;">Here are your result checker details:</p>
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-family: monospace; font-size: 0.9rem; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin-bottom: 24px;">${resData.pins}</div>
                    
                    <div style="display: flex; gap: 12px; flex-direction: column;">
                        <button onclick="downloadReceipt('${autoExamType}', '${safePins}')" class="btn-secondary" style="width: 100%; padding: 14px; border: 2px solid #1D5ED0; color: #1D5ED0; background: #ffffff; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download PIN Card
                        </button>
                        <button onclick="window.location.reload()" class="btn-primary" style="width: 100%; padding: 14px;">Buy Another PIN</button>
                    </div>
                </div>
            `;
            
            showToast(resData.message, "success");

        } catch (err) {
            showToast(err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Pay Securely';
        }
    });

    // --- MANUAL ORDER SECTION (Unchanged) ---
    let manualExam = 'WAEC';
    let manualPrice = 6000;
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
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0284c7;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
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
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999); 

        try {
            const successful = document.execCommand('copy');
            if (successful) successUI();
            else showToast("Your browser blocked copying. Please copy manually.", "error");
        } catch (err) {
            showToast("Copy failed on this device.", "error");
        }
        document.body.removeChild(textArea);
    });
    
    document.getElementById('whatsapp-btn').addEventListener('click', () => {
        const encodedMessage = encodeURIComponent(`Hello, I have made a payment of ₦${manualPrice.toLocaleString('en-NG')} to your Fidelity Bank account for a ${manualExam} PIN. Kindly verify and provide the PIN.`);
        window.open(`https://wa.me/2349153375488?text=${encodedMessage}`, '_blank');
    });
});