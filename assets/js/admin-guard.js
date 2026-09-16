document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check if logged in at all
    const { data: { session }, error } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = '/auth/login.html';
        return;
    }

    // 2. Check if the logged-in email exists in the secure admins table
    const { data: adminRecord, error: adminError } = await window.db
        .from('admins')
        .select('email')
        .eq('email', session.user.email)
        .single();

    // 3. If they are not an admin, kick them to the customer dashboard
    if (adminError || !adminRecord) {
        alert('Security Alert: You are not authorized to view the Admin Area.');
        window.location.href = '/dashboard/';
        return;
    }
    
    // 4. If they are an admin, unhide the page content
    document.body.style.display = 'block';
});