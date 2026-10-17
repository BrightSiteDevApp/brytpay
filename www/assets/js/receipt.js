document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) return window.location.href = '/auth/login.html'; 

    const user = session.user;
    const urlParams = new URLSearchParams(window.location.search);
    const txId = urlParams.get('id');

    if (!txId) {
        alert('Transaction ID is missing.');
        window.location.href = '/dashboard/history/index.html';
        return;
    }

    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/index.html';
        } else if (referrer.includes('/dashboard/') && !referrer.includes('/history/') && !referrer.includes('/orders/')) {
            backBtn.href = '/dashboard/index.html';
        } else {
            backBtn.href = '/dashboard/history/index.html';
        }
    }

    const recDate = document.getElementById('rec-date');
    const recAmount = document.getElementById('rec-amount');
    const recStatus = document.getElementById('rec-status');
    const receiptDetailsList = document.getElementById('receipt-details-list');
    const recTimestamp = document.getElementById('rec-timestamp');
    const providerLogo = document.getElementById('receipt-provider-logo');
    
    const actionContainer = document.getElementById('smart-action-container');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const downloadImgBtn = document.getElementById('download-img-btn');

    const cleanStr = (str) => {
        if (!str) return '';
        return str.replace(/vtpass/gi, '')
                  .replace(/cheapdatahub/gi, '')
                  .replace(/external_checkout/gi, '')
                  .replace(/[:\-_]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .toUpperCase();
    };

    const formatRef = (ref) => {
        if (!ref) return 'N/A';
        if (ref.length > 20) return `${ref.substring(0, 8)}...${ref.substring(ref.length - 8)}`;
        return ref;
    };

    const isCreditTx = (tx) => {
        const s = (tx.service_type || '').toLowerCase();
        const p = (tx.provider || tx.recipient || '').toLowerCase();
        const t = (tx.type || '').toLowerCase();
        return t === 'credit' || s.includes('fund') || s.includes('deposit') || s.includes('topup') || p.includes('paystack') || p.includes('flutterwave') || p.includes('topup');
    };

    const getLogoPath = (tx) => {
        const raw = `${tx.type || ''} ${tx.service_type || ''} ${tx.recipient || ''} ${tx.provider || ''} ${tx.reference || ''}`.toLowerCase();
        
        if (raw.includes('cbt')) return 'brytcbtsim-logo.png';
        if (raw.includes('dgm')) return 'brytdgm-logo.png';
        if (isCreditTx(tx)) return 'brytpay-logo.png';
        if (raw.includes('mtn')) return 'mtn-logo.png';
        if (raw.includes('airtel')) return 'airtel-logo.png';
        if (raw.includes('glo')) return 'glo-logo.png';
        if (raw.includes('9mobile') || raw.includes('etisalat')) return '9mob-logo.png';
        if (raw.includes('dstv')) return 'dstv-logo.png';
        if (raw.includes('gotv')) return 'gotv-logo.png';
        if (raw.includes('startimes')) return 'startimes-logo.png';
        if (raw.includes('waec')) return 'waec-logo.png';
        if (raw.includes('neco')) return 'neco-logo.png';
        if (raw.includes('nabteb')) return 'nabteb-logo.png';
        if (raw.includes('jmb_') || raw.includes('jamb') || raw.includes('admission') || raw.includes('result')) return 'jamb-logo.png';
        if (raw.includes('nin_') || raw.includes('nin') || raw.includes('slip')) return 'nimc-logo.png';
        
        return 'brytpay-logo.png';
    };

    async function fetchTransaction() {
        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('id', txId)
            .eq('user_id', user.id)
            .single();

        if (error || !data) return window.location.href = '/dashboard/history/index.html';

        const txDate = new Date(data.created_at);
        recDate.textContent = txDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        recAmount.textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        recTimestamp.textContent = `Downloaded: ${new Date().toLocaleString('en-NG')}`;
        
        const st = (data.status || '').toLowerCase();
        if (['successful', 'completed', 'processed', 'refunded'].includes(st)) {
            recStatus.textContent = st === 'refunded' ? 'REFUNDED' : 'SUCCESSFUL';
            recStatus.style.background = 'rgba(34, 197, 94, 0.1)'; 
            recStatus.style.color = '#16a34a'; 
        } else if (['pending', 'processing'].includes(st)) {
            recStatus.textContent = 'PROCESSING';
            recStatus.style.background = 'rgba(234, 179, 8, 0.1)'; 
            recStatus.style.color = '#ca8a04'; 
        } else {
            recStatus.textContent = 'FAILED';
            recStatus.style.background = 'rgba(239, 68, 68, 0.1)'; 
            recStatus.style.color = '#dc2626'; 
        }

        providerLogo.src = `../../assets/img/${getLogoPath(data)}`;

        let displayService = '';
        let displayProvider = '';
        let displayRecipient = '';
        
        let trackUrl = null;
        let trackText = '';

        const txType = (data.type || '').toLowerCase();
        const rawService = (data.service_type || '').toLowerCase();
        const ref = (data.reference || data.external_reference || '').toUpperCase();
        const sharedRef = data.reference || data.external_reference || '';

        // 🚀 SMART ROUTING LOGIC
        if (isCreditTx(data)) {
            displayService = 'WALLET FUNDING';
            displayProvider = 'FUNDING GATEWAY';
            displayRecipient = user.email || 'Your Wallet';
        } else if (ref.startsWith('JMB_') || txType === 'jamb_order' || rawService.includes('jamb') || rawService.includes('admission') || rawService.includes('result')) {
            displayService = data.service_type || 'JAMB SERVICE';
            displayProvider = 'BRYT PAY JAMB DESK';
            displayRecipient = 'JAMB Candidate';
            trackUrl = `/dashboard/jamb/order-details.html?ref=${sharedRef}`;
            trackText = 'View JAMB Details →';
        } else if (ref.startsWith('NIN_') || txType === 'nin_order' || rawService.includes('nin') || rawService.includes('slip')) {
            displayService = data.service_type || 'NIN SERVICE';
            displayProvider = 'BRYT PAY NIN DESK';
            displayRecipient = 'NIN Holder';
            trackUrl = `/dashboard/nin/order-details.html?ref=${sharedRef}`;
            trackText = 'View NIN Details →';
        } else if (rawService.includes('education') || rawService.includes('waec') || rawService.includes('neco') || rawService.includes('nabteb') || txType.includes('education') || rawService.includes('certificate')) {
            displayService = cleanStr(data.service_type) || 'EXAM SERVICE';
            displayProvider = 'BRYT PAY EXAMS';
            displayRecipient = data.recipient || 'N/A';
            if (rawService.includes('certificate')) {
                trackUrl = `/dashboard/exam-certs/order-details.html?ref=${sharedRef}`;
                trackText = 'View Certificate →';
            } else {
                trackUrl = `/dashboard/education/order-details.html?id=${data.id}`;
                trackText = 'View Full PIN →';
            }
        } else if (rawService.includes('data')) {
            let net = rawService.replace(/data/gi, '').replace(/-/g, ' ').trim().toUpperCase();
            displayService = net ? `${net} DATA BUNDLE` : 'DATA BUNDLE';
            displayProvider = net || 'BRYT PAY'; 
            displayRecipient = data.recipient;
        } else if (rawService.includes('airtime')) {
            let net = rawService.replace(/airtime/gi, '').trim().toUpperCase();
            displayService = net ? `${net} AIRTIME TOP-UP` : 'AIRTIME TOP-UP';
            displayProvider = net || 'BRYT PAY'; 
            displayRecipient = data.recipient;
        } else {
            displayService = cleanStr(data.service_type);
            let prov = cleanStr(data.provider);
            displayProvider = prov || 'BRYT PAY';
            displayRecipient = data.recipient || 'N/A';
        }

        let rowsHtml = `
            <div class="receipt-row"><div class="receipt-key">Service Type</div><div class="receipt-value">${displayService}</div></div>
            <div class="receipt-row"><div class="receipt-key">Provider</div><div class="receipt-value">${displayProvider}</div></div>
            <div class="receipt-row"><div class="receipt-key">Recipient</div><div class="receipt-value">${displayRecipient}</div></div>
        `;

        const actualRef = data.reference || data.external_reference || 'N/A';
        
        rowsHtml += `
            <div class="receipt-row" style="align-items: center;">
                <div class="receipt-key" style="margin-top: 2px;">Ref. Number</div>
                <div class="receipt-value" style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;" title="${actualRef}">
                    <span>${formatRef(actualRef)}</span>
                    ${actualRef !== 'N/A' ? `
                    <button id="copy-ref-btn" style="background: transparent; border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; padding: 2px; transition: 0.2s;" title="Copy Reference">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;

        receiptDetailsList.innerHTML = rowsHtml;

        const copyBtn = document.getElementById('copy-ref-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(actualRef);
                    } else {
                        const textArea = document.createElement("textarea");
                        textArea.value = actualRef;
                        textArea.style.position = "absolute";
                        textArea.style.left = "-999999px";
                        document.body.prepend(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        textArea.remove();
                    }

                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D5ED0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
                } catch (err) {}
            });
        }

        if (actionContainer) {
            if (trackUrl) {
                const btnLink = actionContainer.querySelector('a');
                if (btnLink) {
                    btnLink.href = trackUrl;
                    btnLink.innerHTML = `${trackText}`;
                }
                actionContainer.style.display = 'block';
            } else {
                actionContainer.style.display = 'none';
            }
        }
    }

    await fetchTransaction();

    // The Receipt should force Dark Mode text to light temporarily so the image looks clean
    function prepForRender(element) {
        element.style.background = '#ffffff';
        element.style.color = '#0f172a';
        const texts = element.querySelectorAll('.receipt-title, .receipt-value, .receipt-amount, .pin-data');
        texts.forEach(el => el.style.color = '#0B1220');
    }

    function restoreFromRender(element) {
        element.style.background = '';
        element.style.color = '';
        const texts = element.querySelectorAll('.receipt-title, .receipt-value, .receipt-amount, .pin-data');
        texts.forEach(el => el.style.color = '');
    }

   downloadPdfBtn.addEventListener('click', () => {
        downloadPdfBtn.disabled = true;
        const originalText = downloadPdfBtn.innerHTML;
        downloadPdfBtn.textContent = 'Preparing...';
        
        const copyBtn = document.getElementById('copy-ref-btn');
        if (copyBtn) copyBtn.style.display = 'none';

        const element = document.getElementById('receipt-content');
        prepForRender(element);

        const opt = {
            margin:       0.5,
            filename:     `BRYT_Receipt_${txId.substring(0,8)}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        if (window.Capacitor) {
            html2pdf().set(opt).from(element).toPdf().output('datauristring').then(async (pdfBase64) => {
                try {
                    const base64Data = pdfBase64.split(',')[1];
                    const savedFile = await window.Capacitor.Plugins.Filesystem.writeFile({
                        path: `BRYT_Receipt_${txId.substring(0,8)}.pdf`,
                        data: base64Data,
                        directory: 'CACHE'
                    });
                    await window.Capacitor.Plugins.Share.share({
                        title: 'BRYT Pay Receipt',
                        url: savedFile.uri
                    });
                } catch (err) {
                    alert('Failed to save PDF.');
                } finally {
                    restoreFromRender(element);
                    if (copyBtn) copyBtn.style.display = 'flex';
                    downloadPdfBtn.disabled = false;
                    downloadPdfBtn.innerHTML = originalText;
                }
            });
        } else {
            html2pdf().set(opt).from(element).save().then(() => {
                restoreFromRender(element);
                if (copyBtn) copyBtn.style.display = 'flex';
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = originalText;
            });
        }
    });

    downloadImgBtn.addEventListener('click', async () => {
        downloadImgBtn.disabled = true;
        const originalText = downloadImgBtn.innerHTML;
        downloadImgBtn.textContent = 'Preparing...';
        
        const copyBtn = document.getElementById('copy-ref-btn');
        if (copyBtn) copyBtn.style.display = 'none';

        const element = document.getElementById('receipt-content');
        prepForRender(element);
        
        try {
            const canvas = await html2canvas(element, { scale: 3, useCORS: true });
            
            if (window.Capacitor) {
                const base64Data = canvas.toDataURL('image/png').split(',')[1];
                const savedFile = await window.Capacitor.Plugins.Filesystem.writeFile({
                    path: `BRYT_Receipt_${txId.substring(0,8)}.png`,
                    data: base64Data,
                    directory: 'CACHE'
                });
                await window.Capacitor.Plugins.Share.share({
                    title: 'BRYT Pay Receipt',
                    url: savedFile.uri
                });
            } else {
                const link = document.createElement('a');
                link.download = `BRYT_Receipt_${txId.substring(0,8)}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } catch (err) {
            alert('Failed to generate image. Please try PDF.');
        } finally {
            restoreFromRender(element);
            if (copyBtn) copyBtn.style.display = 'flex';
            downloadImgBtn.disabled = false;
            downloadImgBtn.innerHTML = originalText;
        }
    });
});