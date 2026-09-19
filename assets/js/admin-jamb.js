document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) return window.location.href = '/auth/login.html'; 

    const tbody = document.getElementById('admin-orders-body');
    const modal = document.getElementById('admin-modal');
    const statusSelect = document.getElementById('update-status');
    const notesInput = document.getElementById('update-notes');
    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('document-upload');
    const saveBtn = document.getElementById('modal-save');

    let allOrders = [];
    let currentOrder = null;

    statusSelect.addEventListener('change', () => {
        uploadSection.style.display = statusSelect.value === 'COMPLETED' ? 'block' : 'none';
        if (statusSelect.value !== 'COMPLETED') fileInput.value = ''; 
    });

    function renderOrders(ordersToRender) {
        tbody.innerHTML = '';
        if (ordersToRender.length === 0) return tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">No orders found.</td></tr>';

        ordersToRender.forEach(order => {
            const badgeClass = order.status === 'COMPLETED' ? 'badge-completed' : (order.status === 'PROCESSING' || order.status === 'PAID' ? 'badge-processing' : 'badge-failed');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="service-col"><img src="../../assets/img/jamb-logo.png" style="width:24px;" alt="JAMB"><span>${order.service_type || 'JAMB'}</span></div></td>
                <td><span class="order-ref">${order.order_reference}</span></td>
                <td><span class="status-badge ${badgeClass}">${order.status}</span></td>
            `;

            tr.addEventListener('click', () => {
                currentOrder = order;
                document.getElementById('modal-order-ref').textContent = order.order_reference;
                document.getElementById('modal-name').textContent = order.customer_full_name;
                document.getElementById('modal-reg').textContent = order.jamb_registration_number || 'N/A';
                
                // 🚀 FIXED: Added WhatsApp and Email injection
                document.getElementById('modal-whatsapp').textContent = order.whatsapp_number || 'N/A';
                document.getElementById('modal-email').textContent = order.email || 'N/A';

                statusSelect.value = order.status;
                notesInput.value = order.admin_notes || '';
                uploadSection.style.display = order.status === 'COMPLETED' ? 'block' : 'none';
                modal.style.display = 'flex';
            });
            tbody.appendChild(tr);
        });
    }

    async function loadAdminOrders() {
        const { data } = await window.db.rpc('admin_get_all_jamb_orders');
        allOrders = data || [];
        renderOrders(allOrders);
    }

    document.getElementById('modal-cancel').addEventListener('click', () => modal.style.display = 'none');

    saveBtn.addEventListener('click', async () => {
        if (!currentOrder) return;
        const newStatus = statusSelect.value;
        let documentPath = null;

        if (newStatus === 'COMPLETED' && !currentOrder.document_path && fileInput.files.length === 0) {
            return alert('You must upload the document to mark this order as COMPLETED.');
        }

        saveBtn.disabled = true; saveBtn.textContent = 'Saving...';

        try {
            if (newStatus === 'COMPLETED' && fileInput.files.length > 0) {
                saveBtn.textContent = 'Uploading Document...';
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const filePath = `${currentOrder.user_id}/${currentOrder.id}.${fileExt}`;
                
                const { error: uploadError } = await window.db.storage
                    .from('jamb_documents')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) throw new Error('Document upload failed. Ensure "jamb_documents" bucket exists.');
                documentPath = filePath;
            }

            saveBtn.textContent = 'Finalizing...';
            const { error: rpcError } = await window.db.rpc('admin_update_jamb_status', {
                p_order_id: currentOrder.id, 
                p_status: newStatus, 
                p_notes: notesInput.value || null, 
                p_doc_path: documentPath || currentOrder.document_path || null
            });

            if (rpcError) throw rpcError; 

            alert(`Order updated to ${newStatus}. Email webhook triggered!`);
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