document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    const container = document.getElementById('notifications-container');
    const markAllBtn = document.getElementById('mark-all-read');

    const getIconInfo = (type) => {
        if (type === 'alert') return { class: 'type-alert', svg: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' };
        if (type === 'success') return { class: 'type-success', svg: '<polyline points="20 6 9 17 4 12"></polyline>' };
        return { class: 'type-system', svg: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' };
    };

    // 🚀 NEW: Formats date to show exact Day, Month, Year, and Time
    const formatExactDate = (dateStr) => {
        const dateObj = new Date(dateStr);
        return dateObj.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        });
    };

    async function loadNotifications() {
        const { data, error } = await window.db
            .from('user_notifications')
            .select('*')
            .or(`user_id.eq.${user.id},user_id.is.null`)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-inbox">
                    <div class="empty-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    </div>
                    <h3 class="empty-title">All Caught Up</h3>
                    <p class="empty-desc">You have no new notifications right now. Check back later for updates.</p>
                </div>`;
            return;
        }

        const localRead = JSON.parse(localStorage.getItem('bryt_read_notifs') || '[]');
        container.innerHTML = '';
        let unreadCount = 0;
        
        data.forEach(notif => {
            const icon = getIconInfo(notif.type);
            const isGlobal = notif.user_id === null;
            
            const isReadLocally = isGlobal && localRead.includes(notif.id);
            const isUnread = (!notif.is_read && !isReadLocally) ? 'unread' : '';
            if (isUnread) unreadCount++;
            
            container.innerHTML += `
                <div class="notif-card ${isUnread}" data-id="${notif.id}" data-global="${isGlobal}">
                    <div class="notif-icon-wrap ${icon.class}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>
                    </div>
                    <div class="notif-body">
                        <h4 class="notif-title">${notif.title}</h4>
                        <p class="notif-text">${notif.message}</p>
                        <div class="notif-footer">
                            <span class="notif-time">${formatExactDate(notif.created_at)}</span>
                            ${isUnread ? `<button class="btn-action-read" onclick="markAsRead('${notif.id}',${isGlobal})">Mark as read</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        if (unreadCount > 0) {
            markAllBtn.style.display = 'block';
        }
    }

    window.markAsRead = async (id, isGlobal) => {
        const card = document.querySelector(`.notif-card[data-id="${id}"]`);
        if (card) {
            card.classList.remove('unread');
            const btn = card.querySelector('.btn-action-read');
            if (btn) btn.remove();
            
            const remainingUnread = document.querySelectorAll('.notif-card.unread').length;
            if (remainingUnread === 0) markAllBtn.style.display = 'none';
        }

        if (isGlobal) {
            const localRead = JSON.parse(localStorage.getItem('bryt_read_notifs') || '[]');
            if (!localRead.includes(id)) {
                localRead.push(id);
                localStorage.setItem('bryt_read_notifs', JSON.stringify(localRead));
            }
        } else {
            await window.db.from('user_notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
        }
    };

    markAllBtn.addEventListener('click', async () => {
        const localRead = JSON.parse(localStorage.getItem('bryt_read_notifs') || '[]');
        
        document.querySelectorAll('.notif-card.unread').forEach(card => {
            card.classList.remove('unread');
            const btn = card.querySelector('.btn-action-read');
            if (btn) btn.remove();
            
            const id = card.getAttribute('data-id');
            const isGlobal = card.getAttribute('data-global') === 'true';
            
            if (isGlobal && !localRead.includes(id)) {
                localRead.push(id);
            }
        });
        
        localStorage.setItem('bryt_read_notifs', JSON.stringify(localRead));
        await window.db.from('user_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
        
        markAllBtn.style.display = 'none';
    });

    loadNotifications();
});