document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/index.html';
        } else {
            backBtn.href = '/dashboard/nin/orders.html';
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    const orderRef = urlParams.get('ref');

    if (!orderId && !orderRef) { window.location.href = 'orders.html'; return; }

    let query = window.db.from('nin_orders').select('*');
    if (orderRef) query = query.eq('order_reference', orderRef);
    else query = query.eq('id', orderId);

    const { data, error } = await query.single();
    if (error || !data) { alert('Order not found.'); window.location.href = 'orders.html'; return; }

    const dateObj = new Date(data.created_at);
    document.getElementById('sum-title').textContent = data.service_type;
    document.getElementById('sum-price').textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG')}`;
    document.getElementById('sum-ref').textContent = data.order_reference;
    document.getElementById('sum-amount').textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG', {minimumFractionDigits: 2})}`;
    document.getElementById('sum-date').textContent = `${dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })} - ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;

    const statusBadge = document.getElementById('sum-status');
    const st = (data.status || '').toUpperCase();
    
    if (st.includes('REFUND')) { 
        statusBadge.textContent = 'Refunded'; 
        statusBadge.style.cssText = 'background: rgba(21, 128, 61, 0.1); color: #16a34a; border: 1px solid rgba(21, 128, 61, 0.2);';
    } else if (st.includes('FAIL')) { 
        statusBadge.textContent = 'Failed'; 
        statusBadge.style.cssText = 'background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.2);';
    } else if (st.includes('COMPLETE') || st.includes('SUCCESS')) { 
        statusBadge.textContent = 'Ready'; 
        statusBadge.style.cssText = 'background: rgba(21, 128, 61, 0.1); color: #16a34a; border: 1px solid rgba(21, 128, 61, 0.2);';
    } else { 
        statusBadge.textContent = 'Processing'; 
        statusBadge.style.cssText = 'background: rgba(202, 138, 4, 0.1); color: #ca8a04; border: 1px solid rgba(202, 138, 4, 0.2);';
    }

    const btnOpenQuery = document.getElementById('btn-open-query');
    if (!st.includes('COMPLETE') && !st.includes('SUCCESS')) {
        btnOpenQuery.disabled = true;
        btnOpenQuery.textContent = 'Unavailable';
        btnOpenQuery.style.opacity = '0.5';
        btnOpenQuery.style.cursor = 'not-allowed';
    }

    const dlBtn = document.getElementById('btn-download-doc');
    if ((st.includes('COMPLETE') || st.includes('SUCCESS')) && data.document_path) {
        dlBtn.disabled = false;
        dlBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> View Slip`;
        
        dlBtn.addEventListener('click', async () => {
            dlBtn.disabled = true;
            dlBtn.textContent = 'Loading...';

            try {
                const { data: urlData } = await window.db.storage.from('nin_documents').createSignedUrl(data.document_path, 60);
                
                if (urlData && urlData.signedUrl) {
                    if (window.Capacitor !== undefined) {
                        window.open(urlData.signedUrl, '_system');
                        dlBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Opened`;
                    } else {
                        const response = await fetch(urlData.signedUrl);
                        const blob = await response.blob();
                        const localUrl = window.URL.createObjectURL(blob);
                        
                        const fileName = `BRYT_NIN_${data.identifier_value}.${data.document_path.split('.').pop()}`;
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = localUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        
                        window.URL.revokeObjectURL(localUrl);
                        document.body.removeChild(a);
                        dlBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Downloaded`;
                    }
                } else {
                    throw new Error("Could not generate document link");
                }
            } catch (err) {
                alert('Document load failed. Please check your internet connection.');
                dlBtn.innerHTML = `Try Again`;
            }
            dlBtn.disabled = false;
        });
    }

    const overlay = document.getElementById('query-overlay');
    const sheet = document.getElementById('query-sheet');
    
    btnOpenQuery.addEventListener('click', () => {
        if (!st.includes('COMPLETE') && !st.includes('SUCCESS')) return;
        document.getElementById('q-name').textContent = data.customer_full_name;
        document.getElementById('q-reg').textContent = data.identifier_value;
        document.getElementById('q-year').textContent = data.identifier_type === 'PHONE_NUMBER' ? 'Phone Number' : 'NIN';
        
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('active'), 10);
    });

    const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    };
    
    document.getElementById('btn-close-query').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    document.getElementById('btn-submit-query').addEventListener('click', async () => {
        const msg = document.getElementById('q-message').value.trim();
        if (!msg) { alert('Please describe your issue.'); return; }

        const btn = document.getElementById('btn-submit-query');
        btn.disabled = true; btn.textContent = 'Submitting...';

        const { error } = await window.db.from('nin_queries').insert({
            order_id: data.id,
            user_id: session.user.id,
            message: msg
        });

        if (error) {
            alert('Failed to submit query. Please try again.');
        } else {
            alert('Query submitted successfully!');
            closeModal();
            document.getElementById('q-message').value = '';
        }
        btn.disabled = false; btn.textContent = 'Submit Query';
    });
});