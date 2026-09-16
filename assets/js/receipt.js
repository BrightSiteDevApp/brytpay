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
    const jambActionContainer = document.getElementById('jamb-action-container');

    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const downloadImgBtn = document.getElementById('download-img-btn');

    // 🚀 Deep Cleaning Function (Removes VTPASS and formats text)
    const cleanStr = (str) => {
        if (!str) return '';
        return str.replace(/vtpass/gi, '').replace(/external_checkout/gi, '').replace(/[:\-_]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    };

    // 🚀 Shorten long references so they don't stretch the UI
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

    // 🚀 Dynamic Logo Mapper
    const getLogoPath = (tx) => {
        const raw = `${tx.service_type || ''} ${tx.recipient || ''} ${tx.provider || ''}`.toLowerCase();
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
        if (raw.includes('jamb')) return 'jamb-logo.png';
        return 'brytpay-logo.png'; // Fallback
    };

    async function fetchTransaction() {
        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('id', txId)
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            alert('Transaction not found or access denied.');
            window.location.href = '/dashboard/history/';
            return;
        }

        // Basic Info
        const txDate = new Date(data.created_at);
        recDate.textContent = txDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        recAmount.textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
        recTimestamp.textContent = `Downloaded: ${new Date().toLocaleString('en-NG')}`;
        
        // 🚀 Smart Status Mapper (Catches "completed" and "processed")
        const st = (data.status || '').toLowerCase();
        if (['successful', 'completed', 'processed'].includes(st)) {
            if (data.service_type === 'jamb') {
                recStatus.textContent = 'PROCESSED';
            } else {
                recStatus.textContent = 'SUCCESSFUL';
            }
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

        // Set Provider Logo
        providerLogo.src = `../../assets/img/${getLogoPath(data)}`;

        // 🚀 Check for Education PINs
        if ((data.service_type === 'education' || cleanStr(data.service_type).includes('WAEC')) && data.admin_notes && data.admin_notes.includes('PIN')) {
            let rawPins = data.admin_notes.replace('PIN Details:', '').trim();
            rawPins = rawPins.replace(/[\[\]"\{\}]/g, ' ').trim();
            pinDisplay.innerHTML = rawPins.replace(/,/g, '<br>');
            pinContainer.style.display = 'block';
        }

        // 🚀 Dynamic Data Extraction
        let displayService = '';
        let displayProvider = '';
        let displayRecipient = '';
        let displayDetails = ''; // E.g., '1GB Data' or 'Airtime'

        const rawService = (data.service_type || '').toLowerCase();
        const rawProvider = (data.provider || data.network_or_operator || '').toLowerCase();
        const rawRecipient = (data.recipient || '').toLowerCase();

        if (isCreditTx(data)) {
            displayService = 'WALLET FUNDING';
            displayProvider = rawRecipient.includes('paystack') ? 'PAYSTACK' : rawRecipient.includes('flutterwave') ? 'FLUTTERWAVE' : cleanStr(data.provider || 'BRYT PAY');
            displayRecipient = user.email || 'Your Wallet';
        } else if (rawService.includes('cbt') || rawRecipient.includes('cbt')) {
            displayService = 'BRYT CBT SIM PAYMENT';
            displayProvider = 'BRYT PAY SECURE';
            displayRecipient = cleanStr(data.service_type).replace('BRYT CBT', '').trim() || 'PREMIUM ACCESS';
        } else if (rawService.includes('dgm') || rawRecipient.includes('dgm')) {
            displayService = 'BRYT DGM PAYMENT';
            displayProvider = 'BRYT PAY SECURE';
            displayRecipient = 'VENDOR CHECKOUT';
        } else if (rawService === 'jamb') {
            displayService = cleanStr(data.recipient || 'JAMB Processing');
            displayProvider = 'BRYT PAY JAMB DESK';
            displayRecipient = 'JAMB Candidate';
            jambActionContainer.style.display = 'block';
        } else if (rawService.includes('data')) {
            displayService = 'DATA BUNDLE';
            displayProvider = cleanStr(rawProvider);
            displayRecipient = data.recipient;
            displayDetails = cleanStr(data.service_type); // Shows the specific plan like "MTN SME 1GB"
        } else if (rawService.includes('airtime')) {
            displayService = 'AIRTIME TOP-UP';
            displayProvider = cleanStr(rawProvider);
            displayRecipient = data.recipient;
        } else {
            displayService = cleanStr(data.service_type);
            displayProvider = cleanStr(rawProvider);
            displayRecipient = data.recipient;
        }

        // 🚀 Inject Rows into the Receipt
        let rowsHtml = `
            <div class="receipt-row"><div class="receipt-key">Service Type</div><div class="receipt-value">${displayService}</div></div>
            <div class="receipt-row"><div class="receipt-key">Provider</div><div class="receipt-value">${displayProvider}</div></div>
            <div class="receipt-row"><div class="receipt-key">Recipient/Account</div><div class="receipt-value">${displayRecipient}</div></div>
        `;

        if (displayDetails && displayDetails !== displayService) {
            rowsHtml += `<div class="receipt-row"><div class="receipt-key">Package / Details</div><div class="receipt-value">${displayDetails}</div></div>`;
        }

        // Handle Reference safely
        const actualRef = data.reference || data.external_reference || 'N/A';
        rowsHtml += `<div class="receipt-row"><div class="receipt-key">Transaction Ref</div><div class="receipt-value" title="${actualRef}">${formatRef(actualRef)}</div></div>`;

        receiptDetailsList.innerHTML = rowsHtml;
    }

    await fetchTransaction();

    // Export Logic
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