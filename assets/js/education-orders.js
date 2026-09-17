document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }
    
    const container = document.getElementById('orders-container');
    const overlay = document.getElementById('pin-overlay');
    const sheet = document.getElementById('pin-sheet');
    let currentExamType = '';
    let currentPinsText = '';

    // 🚀 ULTRA-HD PREMIUM IMAGE DOWNLOADER (CLEAN HEADER)
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

        const link = document.createElement('a');
        link.download = `BRYT_${examType.toUpperCase()}_PIN.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    };

    // Load Transactions that contain PIN Details
    async function loadPINOrders() {
        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'successful')
            .like('admin_notes', '%PIN Details%')
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <h3>No PINs Found</h3>
                    <p>You haven't purchased any Education PINs yet.</p>
                    <a href="index.html" class="btn-primary" style="display: inline-block; padding: 12px 24px; margin-top: 16px; text-decoration: none;">Buy PINs Now</a>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        data.forEach(tx => {
            const notes = tx.admin_notes || "";
            const parts = notes.split('PIN Details:');
            const pinsText = parts.length > 1 ? parts[1].trim() : "";

            const txStr = JSON.stringify(tx).toLowerCase();
            let examType = 'waec';
            if (txStr.includes('neco')) examType = 'neco';
            if (txStr.includes('nabteb')) examType = 'nabteb';

            const dateObj = new Date(tx.created_at);
            const dateStr = `${dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })} • ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;

            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-header">
                    <img src="../../assets/img/${examType}-logo.png" class="order-icon" onerror="this.src='../../assets/img/brytpay-logo.png'">
                    <div>
                        <h3 class="order-title">${examType.toUpperCase()} Result Checker</h3>
                        <p class="order-date">${dateStr}</p>
                    </div>
                </div>
                <div class="order-footer">
                    <div class="order-price">₦${parseFloat(tx.amount).toLocaleString('en-NG')}</div>
                    <button class="btn-view" data-exam="${examType}" data-pins="${encodeURIComponent(pinsText)}">View PIN</button>
                </div>
            `;
            container.appendChild(card);
        });

        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentExamType = e.target.getAttribute('data-exam');
                currentPinsText = decodeURIComponent(e.target.getAttribute('data-pins'));
                
                document.getElementById('modal-title').textContent = `${currentExamType.toUpperCase()} PIN Details`;
                document.getElementById('modal-pin-text').textContent = currentPinsText;
                
                document.body.style.overflow = 'hidden';
                overlay.style.display = 'flex';
                setTimeout(() => sheet.classList.add('open'), 10);
            });
        });
    }

    await loadPINOrders();

    const closeModal = () => {
        sheet.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => overlay.style.display = 'none', 300);
    };

    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    document.getElementById('btn-download-card').addEventListener('click', () => {
        if (!currentExamType || !currentPinsText) return;
        window.downloadReceipt(currentExamType, currentPinsText);
    });
});