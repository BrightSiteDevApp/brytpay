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
        
        let userId = null;

        try {
            if (target === 'specific') {
                const email = document.getElementById('notif-email').value.trim();
                // Find the user ID from the profiles table based on email
                const { data: profile, error: profErr } = await window.db
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();
                
                if (profErr || !profile) throw new Error("Could not find a user with that email.");
                userId = profile.id;
            }

            const { error } = await window.db.from('user_notifications').insert({
                user_id: userId, // null means broadcast to all
                title: title,
                message: message,
                type: type
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