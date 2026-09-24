document.addEventListener('DOMContentLoaded', () => {
    const targetSelect = document.getElementById('notif-target');
    const emailGroup = document.getElementById('email-group');
    const form = document.getElementById('admin-notif-form');

    targetSelect.addEventListener('change', (e) => {
        emailGroup.style.display = e.target.value === 'specific' ? 'block' : 'none';
        document.getElementById('notif-email').required = e.target.value === 'specific';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Sending...';

        const target = targetSelect.value;
        const type = document.getElementById('notif-type').value;
        const title = document.getElementById('notif-title').value;
        const message = document.getElementById('notif-message').value;
        const email = target === 'specific' ? document.getElementById('notif-email').value.trim() : null;

        try {
            // 🚀 Call the secure database function instead of direct insert
            const { error } = await window.db.rpc('admin_send_notification', {
                p_email: email,
                p_title: title,
                p_message: message,
                p_type: type
            });

            if (error) throw error;

            alert('Notification sent successfully!');
            form.reset();
            emailGroup.style.display = 'none';

        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Notification';
        }
    });
});