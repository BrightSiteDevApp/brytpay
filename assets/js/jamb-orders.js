document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    // 🚀 THE FIX: Smart Back Button Logic for JAMB Orders
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer;
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/';
            backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Orders Hub`;
        } else {
            backBtn.href = '/dashboard/jamb/';
            backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> JAMB Services`;
        }
    }

    const container = document.getElementById('orders-container');

    const { data, error } = await window.db
        .from('jamb_orders')
        .select('id, service_type, jamb_registration_number, amount, status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.9rem; font-weight: 600;">No transactions found.</div>`;
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

        const title = order.service_type || 'JAMB SERVICE';
        const amount = `₦${parseFloat(order.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        container.innerHTML += `
            <a href="order-details.html?id=${order.id}" class="tx-row">
                <div class="tx-left">
                    <div class="tx-brand"><img src="../../assets/img/jamb-logo.png" alt="JAMB"></div>
                    <div class="tx-info">
                        <div class="tx-title">${title}</div>
                        <div class="tx-date">${dateStr} • Reg: ${order.jamb_registration_number || 'N/A'}</div>
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