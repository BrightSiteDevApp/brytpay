document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const container = document.getElementById('orders-container');

    const { data, error } = await window.db
        .from('jamb_orders')
        .select('id, service_type, jamb_registration_number, amount, status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #64748b;">No transactions found.</div>`;
        return;
    }

    container.innerHTML = '';

    data.forEach(order => {
        const dateObj = new Date(order.created_at);
        const dateStr = dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        
        let statusClass = 'status-processing';
        let statusText = 'Pending';
        const st = (order.status || '').toUpperCase();

        // 🚀 SMART STATUS SCANNER
        if (st.includes('REFUND')) { statusClass = 'status-failed'; statusText = 'Refunded'; }
        else if (st.includes('FAIL')) { statusClass = 'status-failed'; statusText = 'Failed'; }
        else if (st.includes('COMPLETE') || st.includes('SUCCESS')) { statusClass = 'status-completed'; statusText = 'Processed'; }
        else if (st.includes('PROCESS')) { statusClass = 'status-processing'; statusText = 'Processing'; }

        const title = `${order.service_type} (${order.jamb_registration_number})`;
        const amount = `₦${parseFloat(order.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        container.innerHTML += `
            <a href="order-details.html?id=${order.id}" class="list-card">
                <div class="list-left">
                    <img src="../../assets/img/jamb-logo.png" class="list-icon" alt="JAMB">
                    <div>
                        <div class="list-title">${title}</div>
                        <div class="list-date">${dateStr} - ${timeStr}</div>
                    </div>
                </div>
                <div class="list-right">
                    <div class="list-amount">${amount}</div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </a>
        `;
    });
});