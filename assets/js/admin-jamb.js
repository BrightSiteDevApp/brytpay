document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const tbody = document.getElementById('admin-orders-body');
    const modal = document.getElementById('admin-modal');
    const statusSelect = document.getElementById('update-status');
    const notesInput = document.getElementById('update-notes');
    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('document-upload');
    const saveBtn = document.getElementById('modal-save');
    const searchInput = document.getElementById('search-orders');

    const JAMB_LOGO = "../../assets/img/jamb-logo.png";
    let allOrders = [];
    let currentOrder = null;

    statusSelect.addEventListener('change', () => {
        if (statusSelect.value === 'COMPLETED') {
            uploadSection.style.display = 'block';
        } else {
            uploadSection.style.display = 'none';
            fileInput.value = ''; 
        }
    });

    function renderOrders(ordersToRender) {
        tbody.innerHTML = '';
        
        if (ordersToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8; font-size: 0.75rem;">No orders found.</td></tr>';
            return;
        }

        ordersToRender.forEach(order => {
            const serviceName = order.service_type || 'JAMB Registration';
            let badgeClass = order.status === 'COMPLETED' ? 'badge-completed' : (order.status === 'PROCESSING' ? 'badge-processing' : (order.status.includes('FAIL') || order.status.includes('REFUND') ? 'badge-failed' : 'badge-paid'));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="service-col">
                        <img src="${JAMB_LOGO}" class="jamb-logo" alt="JAMB" onerror="this.src='https://via.placeholder.com/24'">
                        <span>${serviceName}</span>
                    </div>
                </td>
                <td><span class="order-ref">${order.order_reference}</span></td>
                <td><span class="status-badge ${badgeClass}">${order.status.replace('_', ' ')}</span></td>
            `;

            tr.addEventListener('click', () => {
                currentOrder = order;
                document.getElementById('modal-order-ref').textContent = order.order_reference;
                document.getElementById('modal-name').textContent = order.customer_full_name;
                document.getElementById('modal-reg').textContent = order.jamb_registration_number || 'N/A';
                document.getElementById('modal-whatsapp').textContent = order.whatsapp_number;
                document.getElementById('modal-email').textContent = order.email;

                statusSelect.value = order.status;
                notesInput.value = order.admin_notes || '';
                uploadSection.style.display = order.status === 'COMPLETED' ? 'block' : 'none';
                fileInput.value = '';
                
                modal.style.display = 'flex';
            });
            tbody.appendChild(tr);
        });
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = allOrders.filter(order => {
            return (order.jamb_registration_number && order.jamb_registration_number.toLowerCase().includes(query)) || 
                   (order.order_reference && order.order_reference.toLowerCase().includes(query));
        });
        renderOrders(filtered);
    });

    async function loadAdminOrders() {
        try {
            const { data, error } = await window.db.rpc('admin_get_all_jamb_orders');
            if (error) throw error;
            allOrders = data || [];
            renderOrders(allOrders);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="3" style="color: #b91c1c; text-align:center; padding: 20px; font-size: 0.75rem;">Error loading orders.</td></tr>`;
        }
    }

    document.getElementById('modal-cancel').addEventListener('click', () => modal.style.display = 'none');

    saveBtn.addEventListener('click', async () => {
        if (!currentOrder) return;
        const newStatus = statusSelect.value;
        let documentPath = null;

        if (newStatus === 'COMPLETED' && !currentOrder.document_path && fileInput.files.length === 0) {
            alert('You must upload the document to mark this order as COMPLETED.');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            if (newStatus === 'COMPLETED' && fileInput.files.length > 0) {
                saveBtn.textContent = 'Uploading...';
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const filePath = `${currentOrder.user_id}/${currentOrder.id}.${fileExt}`;
                
                const { error: uploadError } = await window.db.storage
                    .from('jamb_documents')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) throw new Error('Document upload failed. Ensure "jamb_documents" bucket exists and is public.');
                documentPath = filePath;
            }

            saveBtn.textContent = 'Finalizing...';
            
            const payload = {
                p_order_id: currentOrder.id,
                p_status: newStatus,
                p_notes: notesInput.value || null,
                p_doc_path: documentPath || currentOrder.document_path || null
            };

            const { error: rpcError } = await window.db.rpc('admin_update_jamb_status', payload);

            if (rpcError) throw rpcError;

            // 🎉 Success! The database is updated. 
            // Supabase will now automatically trigger your `send-jamb-email` webhook in the background.

            modal.style.display = 'none';
            searchInput.value = ''; 
            loadAdminOrders();

        } catch (err) {
            alert(err.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Dispatch';
        }
    });

    loadAdminOrders();
});