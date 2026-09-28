document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    // 🚀 THE FIX: Smart Back Button Logic
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer;
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/';
            backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Orders Hub`;
        } else {
            backBtn.href = 'orders.html';
            backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> My Certificates`;
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    const orderRef = urlParams.get('ref');

    if (!orderId && !orderRef) { window.location.href = 'orders.html'; return; }

    let query = window.db.from('exam_cert_orders').select('*');
    
    if (orderRef) {
        query = query.eq('order_reference', orderRef);
    } else {
        query = query.eq('id', orderId);
    }

    const { data, error } = await query.single();

    if (error || !data) { 
        alert('Order not found.'); 
        window.location.href = 'orders.html'; 
        return; 
    }

    const dateObj = new Date(data.created_at);
    const providerClean = (data.provider || 'EXAM').toUpperCase();
    
    // Set Provider Icon Dynamically
    let logoFile = 'brytpay-logo.png';
    if (providerClean.includes('WAEC')) logoFile = 'waec-logo.png';
    else if (providerClean.includes('NECO')) logoFile = 'neco-logo.png';
    else if (providerClean.includes('NABTEB')) logoFile = 'nabteb-logo.png';
    
    document.getElementById('sum-icon').src = `../../assets/img/${logoFile}`;
    document.getElementById('sum-title').textContent = `${providerClean} Certificate`;
    document.getElementById('sum-price').textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG')}`;
    document.getElementById('sum-ref').textContent = data.order_reference;
    document.getElementById('sum-amount').textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG', {minimumFractionDigits: 2})}`;
    document.getElementById('sum-date').textContent = `${dateObj.toLocaleDateString('en-NG')} - ${dateObj.toLocaleTimeString('en-US')}`;

    // SMART STATUS SCANNER
    const statusBadge = document.getElementById('sum-status');
    statusBadge.className = 'status-pill'; 
    const st = (data.status || '').toUpperCase();
    
    if (st.includes('REFUND')) { 
        statusBadge.textContent = 'Refunded'; 
        statusBadge.classList.add('status-failed'); 
    } else if (st.includes('FAIL')) { 
        statusBadge.textContent = 'Failed'; 
        statusBadge.classList.add('status-failed'); 
    } else if (st.includes('COMPLETE') || st.includes('SUCCESS')) { 
        statusBadge.textContent = 'Ready'; 
        statusBadge.classList.add('status-completed'); 
    } else if (st.includes('PROCESS')) { 
        statusBadge.textContent = 'Processing'; 
        statusBadge.classList.add('status-processing'); 
    } else { 
        statusBadge.textContent = 'Pending'; 
        statusBadge.classList.add('status-processing'); 
    }

    const dlBtn = document.getElementById('btn-download-doc');
    if ((st.includes('COMPLETE') || st.includes('SUCCESS')) && data.document_path) {
        dlBtn.disabled = false;
        dlBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Certificate
        `;
        
        dlBtn.addEventListener('click', async () => {
            dlBtn.disabled = true;
            dlBtn.textContent = 'Preparing Download...';
            try {
                const { data: urlData } = await window.db.storage.from('exam_documents').createSignedUrl(data.document_path, 60);
                const response = await fetch(urlData.signedUrl);
                const blob = await response.blob();
                const localUrl = window.URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = localUrl;
                a.download = `BRYT_${providerClean}_${data.candidate_no}.${data.document_path.split('.').pop()}`;
                document.body.appendChild(a);
                a.click();
                
                window.URL.revokeObjectURL(localUrl);
                document.body.removeChild(a);
                dlBtn.innerHTML = `Downloaded Successfully`;
            } catch (err) {
                alert('Download failed. Please try again.');
                dlBtn.innerHTML = `Try Download Again`;
            }
            dlBtn.disabled = false;
        });
    }
});