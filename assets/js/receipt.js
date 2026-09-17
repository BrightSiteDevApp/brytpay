document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) return window.location.href = '/auth/login.html'; 

    const user = session.user;
    const urlParams = new URLSearchParams(window.location.search);
    const txId = urlParams.get('id');

    if (!txId) {
        alert('Transaction ID is missing.');
        window.location.href = '/dashboard/history/';
        return;
    }

    const recDate = document.getElementById('rec-date');
    const recAmount = document.getElementById('rec-amount');
    const recStatus = document.getElementById('rec-status');
    const receiptDetailsList = document.getElementById('receipt-details-list');
    const recTimestamp = document.getElementById('rec-timestamp');
    const providerLogo = document.getElementById('receipt-provider-logo');
    
    const pinContainer = document.getElementById('pin-container');
    const pinDisplay = document.getElementById('pin-display');
    const actionContainer = document.getElementById('jamb-action-container');

    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const downloadImgBtn = document.getElementById('download-img-btn');

    // 🚀 UPDATED CLEANER: Completely scrubs out API vendor names
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

        if (error || !data) return window.location.href = '/dashboard/history/';

        const txDate = new Date(data.created_at);
        recDate.textContent = txDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        recAmount.textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        recTimestamp.textContent = `Downloaded: ${new Date().toLocaleString('en-NG')}`;
        
        const st = (data.status || '').toLowerCase();
        if (['successful', 'completed', 'processed', 'refunded'].includes(st)) {
            recStatus.textContent = st === 'refunded' ? 'REFUNDED' : 'SUCCESSFUL';
            recStatus.style.background = '#dcfce7'; 
            recStatus.style.color = '#16a34a'; 
        } else if (['pending', 'processing'].includes(st)) {
            recStatus.textContent = 'PROCESSING';
            recStatus.style.background = '#fef08a'; 
            recStatus.style.color = '#ca8a04'; 
        } else {
            recStatus.textContent = 'FAILED';
            recStatus.style.background = '#fee2e2'; 
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

        if (isCreditTx(data)) {
            displayService = 'WALLET FUNDING';
            displayProvider = 'FUNDING GATEWAY';
            displayRecipient = user.email || 'Your Wallet';
        
        } else if (ref.startsWith('JMB_') || txType === 'jamb_order' || rawService.includes('jamb') || rawService.includes('admission') || rawService.includes('result')) {
            displayService = data.service_type || 'JAMB SERVICE';
            displayProvider = 'BRYT PAY JAMB DESK';
            displayRecipient = 'JAMB Candidate';
            trackUrl = '/dashboard/jamb/orders.html';
            trackText = 'Track JAMB Order Status →';
            
        } else if (ref.startsWith('NIN_') || txType === 'nin_order' || rawService.includes('nin') || rawService.includes('slip')) {
            displayService = data.service_type || 'NIN SERVICE';
            displayProvider = 'BRYT PAY NIN DESK';
            displayRecipient = 'NIN Holder';
            trackUrl = '/dashboard/nin/orders.html';
            trackText = 'Track NIN Order Status →';
            
        } else if (rawService.includes('education') || rawService.includes('waec') || rawService.includes('neco') || rawService.includes('nabteb') || txType.includes('education')) {
            displayService = cleanStr(data.service_type) || 'EXAM PIN PURCHASE';
            displayProvider = 'BRYT PAY EXAMS';
            displayRecipient = data.recipient || 'N/A';
            trackUrl = '/dashboard/educations/orders.html';
            trackText = 'View Education Pins →';
            
        // 🚀 SMART PROVIDER MASKING FOR DATA & AIRTIME
        } else if (rawService.includes('data')) {
            let net = rawService.replace(/data/gi, '').replace(/-/g, ' ').trim().toUpperCase();
            displayService = net ? `${net} DATA BUNDLE` : 'DATA BUNDLE';
            displayProvider = net || 'BRYT PAY'; // E.g., Sets provider to "GLO" instead of "CheapDataHub"
            displayRecipient = data.recipient;
        } else if (rawService.includes('airtime')) {
            let net = rawService.replace(/airtime/gi, '').trim().toUpperCase();
            displayService = net ? `${net} AIRTIME TOP-UP` : 'AIRTIME TOP-UP';
            displayProvider = net || 'BRYT PAY'; // Sets provider to "MTN", "AIRTEL", etc.
            displayRecipient = data.recipient;
        } else {
            displayService = cleanStr(data.service_type);
            // Universal fallback to mask CheapDataHub if it leaks anywhere else
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
        rowsHtml += `<div class="receipt-row"><div class="receipt-key">Transaction Ref</div><div class="receipt-value" title="${actualRef}">${formatRef(actualRef)}</div></div>`;

        receiptDetailsList.innerHTML = rowsHtml;

        if (actionContainer) {
            if (trackUrl) {
                const btnLink = actionContainer.querySelector('a');
                if (btnLink) {
                    btnLink.href = trackUrl;
                    btnLink.textContent = trackText;
                } else {
                    actionContainer.innerHTML = `<a href="${trackUrl}" style="display:flex; justify-content:center; align-items:center; background:#0B1220; color:#fff; padding:14px; border-radius:10px; font-weight:700; text-decoration:none; margin-bottom:15px; width:100%; font-size:15px;">${trackText}</a>`;
                }
                actionContainer.style.display = 'block';
            } else {
                actionContainer.style.display = 'none';
            }
        }
    }

    await fetchTransaction();

    downloadPdfBtn.addEventListener('click', () => {
        downloadPdfBtn.disabled = true;
        const originalText = downloadPdfBtn.innerHTML;
        downloadPdfBtn.textContent = 'Saving PDF...';

        const element = document.getElementById('receipt-content');
        const opt = {
            margin:       0.5,
            filename:     `BRYT_Receipt_${txId.substring(0,8)}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.innerHTML = originalText;
        });
    });

    downloadImgBtn.addEventListener('click', async () => {
        downloadImgBtn.disabled = true;
        const originalText = downloadImgBtn.innerHTML;
        downloadImgBtn.textContent = 'Saving Image...';

        const element = document.getElementById('receipt-content');
        
        try {
            const canvas = await html2canvas(element, { scale: 3, useCORS: true });
            const link = document.createElement('a');
            link.download = `BRYT_Receipt_${txId.substring(0,8)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            alert('Failed to generate image. Please try PDF.');
        } finally {
            downloadImgBtn.disabled = false;
            downloadImgBtn.innerHTML = originalText;
        }
    });
});