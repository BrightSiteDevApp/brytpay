document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) return window.location.href = '/auth/login.html'; 

    const tbody = document.getElementById('admin-orders-body');
    const modal = document.getElementById('admin-modal');
    const statusSelect = document.getElementById('update-status');
    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('document-upload');
    const saveBtn = document.getElementById('modal-save');

    let currentOrder = null;

    statusSelect.addEventListener('change', () => {
        uploadSection.style.display = statusSelect.value === 'COMPLETED' ? 'block' : 'none';
    });

    async function loadAdminOrders() {
        const { data } = await window.db.rpc('admin_get_all_exam_cert_orders');
        tbody.innerHTML = '';
        if (!data || data.length === 0) return tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">No orders found.</td></tr>';

        data.forEach(order => {
            const badgeClass = order.status === 'COMPLETED' ? 'badge-completed' : (order.status === 'PROCESSING' ? 'badge-processing' : 'badge-failed');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="service-col"><img src="../../assets/img/${order.service_provider.toLowerCase()}-logo.png" class="exam-logo" onerror="this.src='../../assets/img/brytpay-logo.png'"><span>${order.service_provider} Cert</span></div></td>
                <td><span class="order-ref">${order.order_reference}</span></td>
                <td><span class="status-badge ${badgeClass}">${order.status}</span></td>
            `;

            tr.addEventListener('click', () => {
                currentOrder = order;
                document.getElementById('modal-order-ref').textContent = order.order_reference;
                document.getElementById('modal-name').textContent = order.customer_full_name;
                document.getElementById('modal-candidate-no').textContent = order.candidate_number;
                document.getElementById('modal-year').textContent = order.exam_year;
                document.getElementById('modal-type').textContent = order.exam_type;
                statusSelect.value = order.status;
                document.getElementById('update-notes').value = order.admin_notes || '';
                uploadSection.style.display = order.status === 'COMPLETED' ? 'block' : 'none';
                modal.style.display = 'flex';
            });
            tbody.appendChild(tr);
        });
    }

    document.getElementById('modal-cancel').addEventListener('click', () => modal.style.display = 'none');

    saveBtn.addEventListener('click', async () => {
        if (!currentOrder) return;
        const newStatus = statusSelect.value;
        let documentPath = null;

        if (newStatus === 'COMPLETED' && !currentOrder.document_path && fileInput.files.length === 0) {
            return alert('You must upload the certificate to mark this order as COMPLETED.');
        }

        saveBtn.disabled = true; saveBtn.textContent = 'Saving...';

        try {
            if (newStatus === 'COMPLETED' && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const filePath = `${currentOrder.user_id}/${currentOrder.id}.${fileExt}`;
                
                const { error: uploadError } = await window.db.storage.from('exam_cert_documents').upload(filePath, file, { upsert: true });
                if (uploadError) throw new Error('Document upload failed.');
                documentPath = filePath;
            }

            const { error: rpcError } = await window.db.rpc('admin_update_exam_cert_status', {
                p_order_id: currentOrder.id, 
                p_status: newStatus, 
                p_notes: document.getElementById('update-notes').value || null, 
                p_doc_path: documentPath || currentOrder.document_path || null
            });

            if (rpcError) throw rpcError; 

            alert(`Order updated to ${newStatus}. Email dispatched!`);
            modal.style.display = 'none';
            loadAdminOrders();
        } catch (err) {
            alert(err.message); 
        } finally {
            saveBtn.disabled = false; saveBtn.textContent = 'Save & Dispatch';
        }
    });

    loadAdminOrders();
});