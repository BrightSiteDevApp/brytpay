document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const container = document.getElementById('orders-container');

    async function loadCertOrders() {
        const { data, error } = await window.db
            .from('exam_cert_orders')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <h3>No Certificates Found</h3>
                    <p>You haven't requested any digital certificates yet.</p>
                    <a href="index.html" class="btn-primary" style="display: inline-block; padding: 12px 24px; margin-top: 16px; text-decoration: none; border-radius:8px;">Request Certificate</a>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        data.forEach(order => {
            const badgeClass = order.status === 'COMPLETED' ? 'badge-completed' : (order.status === 'PROCESSING' ? 'badge-processing' : 'badge-failed');
            
            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-header">
                    <div style="font-weight: 800; color: #0f172a;">${order.service_provider} Certificate</div>
                    <div class="status-badge ${badgeClass}">${order.status}</div>
                </div>
                <div class="order-details">
                    <div>Candidate No: <strong>${order.candidate_number}</strong></div>
                    <div>Exam Year: <strong>${order.exam_year}</strong></div>
                    <div class="order-meta" style="margin-top:8px;">Ref: ${order.order_reference}</div>
                </div>
                ${order.status === 'COMPLETED' && order.document_path ? `
                    <button class="btn-download" data-path="${order.document_path}" data-name="${order.service_provider}_CERT_${order.candidate_number}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download PDF
                    </button>
                ` : `
                    <div style="background: #f1f5f9; text-align: center; padding: 12px; border-radius: 10px; font-size: 0.8rem; color: #64748b; font-weight: 600;">
                        ${order.status === 'PROCESSING' ? 'Processing at the BRYT Desk...' : 'Order Failed or Refunded'}
                    </div>
                `}
            `;
            container.appendChild(card);
        });

        // 🚀 SECURE PDF DOWNLOADER
        document.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                const path = target.getAttribute('data-path');
                const name = target.getAttribute('data-name');
                const ext = path.split('.').pop();
                
                target.textContent = 'Downloading...';
                target.disabled = true;

                try {
                    const { data: fileBlob, error } = await window.db.storage.from('exam_cert_documents').download(path);
                    if (error) throw error;
                    
                    const url = URL.createObjectURL(fileBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${name}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                } catch (err) {
                    alert('Could not download file. Please contact support.');
                } finally {
                    target.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download PDF`;
                    target.disabled = false;
                }
            });
        });
    }

    await loadCertOrders();
});