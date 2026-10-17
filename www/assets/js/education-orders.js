document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }
    
    // 🚀 SMART BACK BUTTON ROUTING
    const backBtn = document.getElementById('smart-back-btn');
    if (backBtn) {
        const referrer = document.referrer || '';
        if (referrer.includes('/dashboard/orders/')) {
            backBtn.href = '/dashboard/orders/index.html';
        } else {
            backBtn.href = '/dashboard/education/index.html';
        }
    }

    const container = document.getElementById('orders-container');

    async function loadPINOrders() {
        const { data, error } = await window.db
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'successful')
            .like('admin_notes', '%PIN Details%')
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 600;">No Education PINs found.</div>`;
            return;
        }

        container.innerHTML = '';

        data.forEach(tx => {
            const txStr = JSON.stringify(tx).toLowerCase();
            let examType = 'waec';
            if (txStr.includes('neco')) examType = 'neco';
            if (txStr.includes('nabteb')) examType = 'nabteb';

            const dateObj = new Date(tx.created_at);
            const dateStr = dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
            
            const refClean = tx.reference || tx.external_reference || tx.id.slice(0,8).toUpperCase();
            const amount = `₦${parseFloat(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

            container.innerHTML += `
                <a href="order-details.html?id=${tx.id}" class="tx-row" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 12px; border-bottom: 1px solid var(--border-light); gap: 10px; cursor: pointer; text-decoration: none;">
                    <div class="tx-left" style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                        <div class="tx-brand" style="width: 36px; height: 36px; border-radius: 12px; background: #ffffff; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; padding: 4px;">
                            <img src="../../assets/img/${examType}-logo.png" alt="${examType}" style="width:100%;height:100%;object-fit:contain;" onerror="this.src='../../assets/img/brytpay-logo.png'">
                        </div>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${examType.toUpperCase()} Result Checker</div>
                            <div style="font-size: 0.68rem; color: #64748b; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px;">${dateStr} • Ref: ${refClean.length > 15 ? refClean.slice(0,8)+'...' : refClean}</div>
                        </div>
                    </div>
                    <div class="tx-right" style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); letter-spacing: -0.3px; white-space: nowrap;">${amount}</div>
                        <span style="display: inline-block; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 12px; text-transform: capitalize; background: rgba(21, 128, 61, 0.1); color: #16a34a; border: 1px solid rgba(21, 128, 61, 0.2);">Completed</span>
                    </div>
                </a>
            `;
        });
    }

    await loadPINOrders();
});