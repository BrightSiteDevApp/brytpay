document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    if (!orderId) { window.location.href = 'orders.html'; return; }

    // Fetch NIN Order Data
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

    // 🚀 FIX: Precise Status Logic separating PAID from PROCESSING
    const statusBadge = document.getElementById('sum-status');
    statusBadge.className = 'status-pill'; 
    
    if (data.status === 'PAID') {
        statusBadge.textContent = 'Pending'; 
        statusBadge.classList.add('status-processing'); 
    } else if (data.status === 'PROCESSING') { 
        statusBadge.textContent = 'Processing'; 
        statusBadge.classList.add('status-processing'); 
    } else if (data.status === 'FAILED' || data.status === 'REFUNDED') { 
        statusBadge.textContent = 'Failed'; 
        statusBadge.classList.add('status-failed'); 
    } else { 
        statusBadge.textContent = 'Ready'; 
        statusBadge.classList.add('status-completed'); 
    }

    // 🚀 FIX: Lock down the Query button until the order is COMPLETED
    const btnOpenQuery = document.getElementById('btn-open-query');
    if (data.status !== 'COMPLETED') {
        btnOpenQuery.disabled = true;
        btnOpenQuery.textContent = 'Query Unavailable (Order is Pending)';
        btnOpenQuery.style.opacity = '0.6';
        btnOpenQuery.style.cursor = 'not-allowed';
    }

    // Setup Download Button
    const dlBtn = document.getElementById('btn-download-doc');
    if (data.status === 'COMPLETED' && data.document_path) {
        dlBtn.disabled = false;
        dlBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Slip
        `;
        
        dlBtn.addEventListener('click', async () => {
            dlBtn.disabled = true;
            dlBtn.textContent = 'Preparing Download...';
            try {
                // Fetch from the nin_documents bucket
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

    // Query System (Connects to nin_queries)
    document.getElementById('btn-open-query').addEventListener('click', () => {
        // Prevent opening if not completed, just in case
        if (data.status !== 'COMPLETED') return; 
        
        document.getElementById('q-name').textContent = data.customer_full_name;
        document.getElementById('q-reg').textContent = data.identifier_value; 
        document.getElementById('q-year').textContent = data.identifier_type;
        document.getElementById('query-overlay').style.display = 'flex';
        setTimeout(() => document.getElementById('query-sheet').classList.add('open'), 10);
    });

    document.getElementById('btn-close-query').addEventListener('click', () => {
        document.getElementById('query-sheet').classList.remove('open');
        setTimeout(() => document.getElementById('query-overlay').style.display = 'none', 300);
    });

    document.getElementById('btn-submit-query').addEventListener('click', async () => {
        const msg = document.getElementById('q-message').value.trim();
        if (!msg) return alert('Please enter a message.'); 

        const btn = document.getElementById('btn-submit-query');
        btn.disabled = true; btn.textContent = 'Submitting...';

        const { error } = await window.db.from('nin_queries').insert({
            order_id: data.id,
            user_id: session.user.id,
            message: msg
        });

        if (!error) {
            alert('Query submitted successfully!');
            document.getElementById('btn-close-query').click();
        }
        btn.disabled = false; btn.textContent = 'Submit Query';
    });
});