document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }
    
    // 🚀 SMART BACK BUTTON ROUTING (Updates both URL and Text)
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/receipt/')) {
            backBtn.href = referrer; 
            backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back`;
        } else if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/';
            backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back`;
        } else {
            backBtn.href = 'orders.html';
            backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back`;
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    if (!orderId) { window.location.href = 'orders.html'; return; }

    // Fetch the transaction
    const { data: tx, error } = await window.db.from('transactions').select('*').eq('id', orderId).single();
    if (error || !tx) { 
        alert('PIN order not found.'); 
        window.location.href = 'orders.html'; 
        return; 
    }

    // Extract PINs and Exam Type from notes
    const notes = tx.admin_notes || "";
    const parts = notes.split('PIN Details:');
    const pinsText = parts.length > 1 ? parts[1].trim() : "PIN generation pending...";

    const txStr = JSON.stringify(tx).toLowerCase();
    let examType = 'waec';
    if (txStr.includes('neco')) examType = 'neco';
    if (txStr.includes('nabteb')) examType = 'nabteb';

    // Populate UI
    document.getElementById('sum-title').textContent = `${examType.toUpperCase()} Result Checker`;
    document.getElementById('sum-price').textContent = `₦${parseFloat(tx.amount).toLocaleString('en-NG')}`;
    document.getElementById('sum-amount').textContent = `₦${parseFloat(tx.amount).toLocaleString('en-NG', {minimumFractionDigits: 2})}`;
    
    const dateObj = new Date(tx.created_at);
    document.getElementById('sum-date').textContent = `${dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })} - ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;
    
    // Use transaction reference or fallback to the first 8 characters of ID
    document.getElementById('sum-ref').textContent = tx.reference || tx.id.slice(0,8).toUpperCase();
    document.getElementById('sum-pins').textContent = pinsText;
    document.getElementById('exam-logo').src = `../../assets/img/${examType}-logo.png`;

    // Hook up Download Button
    document.getElementById('btn-download-doc').addEventListener('click', () => {
        downloadReceipt(examType, pinsText);
    });

    // 🚀 ULTRA-HD PREMIUM IMAGE DOWNLOADER
    async function downloadReceipt(examType, pinsText) {
        const btn = document.getElementById('btn-download-doc');
        btn.innerHTML = 'Generating...';
        btn.disabled = true;

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

        const link = document.createElement('a');
        link.download = `BRYT_${examType.toUpperCase()}_PIN.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download PIN Card`;
        btn.disabled = false;
    }
});