document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/index.html';
        } else {
            backBtn.href = '/dashboard/jamb/index.html';
        }
    }

    const container = document.getElementById('orders-container');

    const { data, error } = await window.db
        .from('jamb_orders')
        .select('id, service_type, jamb_registration_number, amount, status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 600;">No transactions found.</div>`;
        return;
    }

    container.innerHTML = '';

    data.forEach(order => {
        const dateObj = new Date(order.created_at);
        const dateStr = dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        
        let statusStyle = 'background: #fef9c3; color: #a16207; border: 1px solid #fef08a;';
        let statusText = 'Pending';
        const st = (order.status || '').toUpperCase();

        if (st.includes('REFUND')) { statusStyle = 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;'; statusText = 'Refunded'; }
        else if (st.includes('FAIL')) { statusStyle = 'background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;'; statusText = 'Failed'; }
        else if (st.includes('COMPLETE') || st.includes('SUCCESS')) { statusStyle = 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;'; statusText = 'Processed'; }
        else if (st.includes('PROCESS')) { statusStyle = 'background: #fef9c3; color: #a16207; border: 1px solid #fef08a;'; statusText = 'Processing'; }

        const title = order.service_type || 'JAMB SERVICE';
        const amount = `₦${parseFloat(order.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

        container.innerHTML += `
            <a href="order-details.html?id=${order.id}" class="tx-row" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 12px; border-bottom: 1px solid var(--border-light); gap: 10px; cursor: pointer; text-decoration: none;">
                <div class="tx-left" style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                    <div class="tx-brand" style="width: 36px; height: 36px; border-radius: 12px; background: var(--bg-color); border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; padding: 4px;">
                        <img src="../../assets/img/jamb-logo.png" alt="JAMB" style="width:100%;height:100%;object-fit:contain;">
                    </div>
                    <div style="min-width: 0; flex: 1;">
                        <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${title}</div>
                        <div style="font-size: 0.68rem; color: #64748b; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px;">${dateStr} • Reg: ${order.jamb_registration_number || 'N/A'}</div>
                    </div>
                </div>
                <div class="tx-right" style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); letter-spacing: -0.3px; white-space: nowrap;">${amount}</div>
                    <span style="display: inline-block; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 12px; text-transform: capitalize; ${statusStyle}">${statusText}</span>
                </div>
            </a>
        `;
    });
});