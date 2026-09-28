document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    // 🚀 Smart Back Button Logic
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer;
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/';
            backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Orders Hub`;
        } else {
            backBtn.href = '/dashboard/exam-certs/';
            backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Exam Certifications`;
        }
    }

    const container = document.getElementById('orders-container');

    const { data, error } = await window.db
        .from('exam_cert_orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.9rem; font-weight: 600;">No certificates found.</div>`;
        return;
    }

    container.innerHTML = '';

    data.forEach(order => {
        const dateObj = new Date(order.created_at);
        const dateStr = dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        
        let statusClass = 'status-pending';
        let statusText = 'Pending';
        const st = (order.status || '').toUpperCase();

        if (st.includes('REFUND')) { statusClass = 'status-successful'; statusText = 'Refunded'; }
        else if (st.includes('FAIL')) { statusClass = 'status-failed'; statusText = 'Failed'; }
        else if (st.includes('COMPLETE') || st.includes('SUCCESS')) { statusClass = 'status-successful'; statusText = 'Processed'; }
        else if (st.includes('PROCESS')) { statusClass = 'status-pending'; statusText = 'Processing'; }

        // Use correct database column names
        const providerClean = (order.service_provider || 'EXAM').toUpperCase();
        const title = `${providerClean} CERTIFICATE`;
        
        const amountVal = order.amount ? parseFloat(order.amount) : 10000; 
        const amount = `₦${amountVal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        let logoFile = 'brytpay-logo.png';
        if (providerClean.includes('WAEC')) logoFile = 'waec-logo.png';
        else if (providerClean.includes('NECO')) logoFile = 'neco-logo.png';
        else if (providerClean.includes('NABTEB')) logoFile = 'nabteb-logo.png';

        // 🚀 THE FIX: Passing ref= instead of id= to ensure 100% routing safety
        container.innerHTML += `
            <a href="order-details.html?ref=${order.order_reference}" class="tx-row">
                <div class="tx-left">
                    <div class="tx-brand"><img src="../../assets/img/${logoFile}" alt="${providerClean}" onerror="this.src='../../assets/img/brytpay-logo.png'"></div>
                    <div class="tx-info">
                        <div class="tx-title">${title}</div>
                        <div class="tx-date">${dateStr} • ID: ${order.candidate_number || 'N/A'}</div>
                    </div>
                </div>
                <div class="tx-right">
                    <div class="tx-amount">${amount}</div>
                    <span class="tx-status ${statusClass}">${statusText}</span>
                </div>
            </a>
        `;
    });
});