document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    if (!orderId) { window.location.href = 'orders.html'; return; }

    const { data, error } = await window.db
        .from('nin_orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error || !data) { 
        alert('Order not found.'); 
        window.location.href = 'orders.html'; 
        return; 
    }

    const dateObj = new Date(data.created_at);
    document.getElementById('sum-title').textContent = data.service_type;
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

    const btnOpenQuery = document.getElementById('btn-open-query');
    if (!st.includes('COMPLETE') && !st.includes('SUCCESS')) {
        btnOpenQuery.disabled = true;
        btnOpenQuery.textContent = 'Query Unavailable (Order is not Ready)';
        btnOpenQuery.style.opacity = '0.6';
        btnOpenQuery.style.cursor = 'not-allowed';
    }

    const dlBtn = document.getElementById('btn-download-doc');
    if ((st.includes('COMPLETE') || st.includes('SUCCESS')) && data.document_path) {
        dlBtn.disabled = false;
        dlBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Slip
        `;
        
        dlBtn.addEventListener('click', async () => {
            dlBtn.disabled = true;
            dlBtn.textContent = 'Preparing Download...';
            try {
                const { data: urlData } = await window.db.storage.from('nin_documents').createSignedUrl(data.document_path, 60);
                const response = await fetch(urlData.signedUrl);
                const blob = await response.blob();
                const localUrl = window.URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = localUrl;
                a.download = `BRYT_NIN_${data.identifier_value}.${data.document_path.split('.').pop()}`;
                document.body.appendChild(a);
                a.click();
                
                window.URL.revokeObjectURL(localUrl);
                document.body.removeChild(a);
                dlBtn.innerHTML = `Downloaded Successfully`;
            } catch (err) {
                alert('Download failed. Please try again.');
            }
            dlBtn.disabled = false;
        });
    }

    // 🚀 STABILIZED QUERY MODAL & BUTTON LOGIC
    const overlay = document.getElementById('query-overlay');
    const sheet = document.getElementById('query-sheet');

    const closeModal = () => {
        sheet.classList.remove('open');
        setTimeout(() => overlay.style.display = 'none', 300);
    };

    document.getElementById('btn-open-query').addEventListener('click', () => {
        if (!st.includes('COMPLETE') && !st.includes('SUCCESS')) return; 
        document.getElementById('q-name').textContent = data.customer_full_name;
        document.getElementById('q-reg').textContent = data.identifier_value; 
        document.getElementById('q-year').textContent = data.identifier_type;
        overlay.style.display = 'flex';
        setTimeout(() => sheet.classList.add('open'), 10);
    });

    document.getElementById('btn-close-query').addEventListener('click', closeModal);

    document.getElementById('btn-submit-query').addEventListener('click', async () => {
        const msg = document.getElementById('q-message').value.trim();
        if (!msg) return alert('Please enter a message.'); 

        const btn = document.getElementById('btn-submit-query');
        btn.disabled = true; 
        btn.textContent = 'Submitting...';

        const { error } = await window.db.from('nin_queries').insert({
            order_id: data.id,
            user_id: session.user.id,
            message: msg
        });

        if (!error) {
            alert('Query submitted successfully!');
            closeModal();
            document.getElementById('q-message').value = ''; // Clears the box properly
        } else {
            alert('Failed to submit query.');
        }
        
        // Restores the button instantly
        btn.disabled = false; 
        btn.textContent = 'Submit Query';
    });
});