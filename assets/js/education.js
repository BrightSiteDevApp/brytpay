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

    // --- AUTOMATIC SECTION (WAEC & NABTEB 5%) ---
    let autoExamType = 'waec';
    let autoExamLogo = 'waec-logo.png';
    
    const autoPrices = { 'waec': 5699, 'nabteb': 1003 };

    const selectWrapper = document.getElementById('custom-select-wrapper');
    const selectTrigger = document.getElementById('custom-select-trigger');
    const selectText = document.getElementById('custom-select-text');
    const optionsList = document.getElementById('custom-options-list');
    const hiddenQtyInput = document.getElementById('exam-quantity');

    function renderQtyDropdown() {
        optionsList.textContent = '';
        const unitPrice = autoPrices[autoExamType];

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

    // 🚀 FIX: Prevent Automatic Modal Submission Completely
    document.getElementById('auto-exam-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showToast("Automated service is under maintenance. Please use the Manual Order tab.", "error");
    });


    // --- MANUAL ORDER SECTION ---
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

    // 🚀 FIX: The Ultimate Mobile Copy Hack
    document.getElementById('copy-btn').addEventListener('click', async () => {
        const btn = document.getElementById('copy-btn');
        const accNo = document.getElementById('acc-no').textContent.trim();
        const originalText = btn.innerHTML;

        const successUI = () => {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0284c7;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        };

        // Attempt 1: Modern API (Fails on HTTP usually)
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(accNo);
                return successUI();
            } catch (err) { /* silent fallback */ }
        }

        // Attempt 2: Bulletproof Mobile Hack for HTTP
        const textArea = document.createElement("textarea");
        textArea.value = accNo;
        
        // Hide element out of viewport so keyboard doesn't jump
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        
        document.body.appendChild(textArea);
        
        // Specific fix for Android/iOS text selection
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999); 

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                successUI();
            } else {
                showToast("Your browser blocked copying. Please copy manually.", "error");
            }
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