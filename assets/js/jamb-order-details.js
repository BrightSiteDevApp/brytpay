document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    if (!orderId) { window.location.href = 'orders.html'; return; }

    let currentOrder = null;

    // Fetch Order Data
    const { data, error } = await window.db
        .from('jamb_orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error || !data) { 
        alert('Order not found.'); 
        window.location.href = 'orders.html'; 
        return; 
    }
    currentOrder = data;

    // Populate Summary Page
    const dateObj = new Date(data.created_at);
    document.getElementById('sum-title').textContent = data.service_type;
    document.getElementById('sum-price').textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG')}`;
    document.getElementById('sum-ref').textContent = data.order_reference;
    document.getElementById('sum-amount').textContent = `₦${parseFloat(data.amount).toLocaleString('en-NG', {minimumFractionDigits: 2})}`;
    document.getElementById('sum-date').textContent = `${dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })} - ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;

    // Precise Status Logic
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
        statusBadge.textContent = 'Processed'; 
        statusBadge.classList.add('status-completed'); 
    }

    // Setup Query Button Visibility
    const btnOpenQuery = document.getElementById('btn-open-query');
    if (data.status !== 'COMPLETED') {
        btnOpenQuery.disabled = true;
        btnOpenQuery.textContent = 'Query Unavailable (Order is Pending)';
        btnOpenQuery.style.opacity = '0.6';
        btnOpenQuery.style.cursor = 'not-allowed';
    }

    // Setup Download Button (Forcing Native Download to Phone via Blob)
    const dlBtn = document.getElementById('btn-download-doc');
    if (data.status === 'COMPLETED' && data.document_path) {
        dlBtn.disabled = false;
        dlBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Document
        `;
        
        dlBtn.addEventListener('click', async () => {
            dlBtn.disabled = true;
            dlBtn.textContent = 'Preparing Download...';

            try {
                const { data: urlData } = await window.db.storage.from('jamb_documents').createSignedUrl(data.document_path, 60);
                const response = await fetch(urlData.signedUrl);
                const blob = await response.blob();
                const localUrl = window.URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = localUrl;
                a.download = `BRYT_${data.jamb_registration_number}.${data.document_path.split('.').pop()}`;
                document.body.appendChild(a);
                a.click();
                
                window.URL.revokeObjectURL(localUrl);
                document.body.removeChild(a);
                
                dlBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Downloaded Successfully
                `;
            } catch (err) {
                alert('Download failed. Please check your internet connection.');
                dlBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Try Download Again
                `;
            }
            dlBtn.disabled = false;
        });
    }

    // --- QUERY MODAL LOGIC (Bottom Sheet) ---
    const overlay = document.getElementById('query-overlay');
    const sheet = document.getElementById('query-sheet');
    
    btnOpenQuery.addEventListener('click', () => {
        if (data.status !== 'COMPLETED') return;
        
        document.getElementById('q-name').textContent = data.customer_full_name;
        document.getElementById('q-reg').textContent = data.jamb_registration_number;
        document.getElementById('q-year').textContent = data.jamb_year || 'N/A';
        
        // Lock body scrolling when modal is open
        document.body.style.overflow = 'hidden';
        
        overlay.style.display = 'flex';
        setTimeout(() => sheet.classList.add('open'), 10);
    });

    const closeModal = () => {
        sheet.classList.remove('open');
        // Restore body scrolling
        document.body.style.overflow = '';
        setTimeout(() => overlay.style.display = 'none', 300);
    };
    
    document.getElementById('btn-close-query').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { 
        if (e.target === overlay) closeModal(); 
    });

    // Submit Query to Database
    document.getElementById('btn-submit-query').addEventListener('click', async () => {
        const msg = document.getElementById('q-message').value.trim();
        if (!msg) { 
            alert('Please enter a message describing the issue.'); 
            return; 
        }

        const btn = document.getElementById('btn-submit-query');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        const { error } = await window.db.from('jamb_queries').insert({
            order_id: data.id,
            user_id: session.user.id,
            message: msg
        });

        if (error) {
            alert('Failed to submit query. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Submit Query';
        } else {
            alert('Query submitted successfully! Our support team will investigate immediately.');
            closeModal();
            btn.disabled = false;
            btn.textContent = 'Submit Query';
            document.getElementById('q-message').value = '';
        }
    });
});