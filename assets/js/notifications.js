document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = '/auth/login.html'; return; }

    const user = session.user;
    const container = document.getElementById('notifications-container');
    const markAllBtn = document.getElementById('mark-all-read');

    const getIconInfo = (type) => {
        if (type === 'alert') return { class: 'icon-alert', svg: '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' };
        if (type === 'success') return { class: 'icon-success', svg: '<polyline points="20 6 9 17 4 12"></polyline>' };
        return { class: 'icon-info', svg: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>' };
    };

    const timeAgo = (dateStr) => {
        const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    async function loadNotifications() {
        const { data, error } = await window.db
            .from('user_notifications')
            .select('*')
            .or(`user_id.eq.${user.id},user_id.is.null`)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding: 60px 20px;"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom:16px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><div style="color:#475569; font-size:1.1rem; font-weight:700; margin-bottom: 6px;">You're all caught up!</div><div style="font-size:0.85rem; color:#94a3b8;">There are no new notifications at this time.</div></div>`;
            return;
        }

        const localRead = JSON.parse(localStorage.getItem('bryt_read_notifs') || '[]');
        container.innerHTML = '';
        
        data.forEach(notif => {
            const icon = getIconInfo(notif.type);
            const isGlobal = notif.user_id === null;
            
            // 🚀 The Magic: Check if a global broadcast was dismissed locally
            const isReadLocally = isGlobal && localRead.includes(notif.id);
            const isUnread = (!notif.is_read && !isReadLocally) ? 'unread' : '';
            
            container.innerHTML += `
                <div class="notif-card ${isUnread}" data-id="${notif.id}" data-global="${isGlobal}">
                    <div class="notif-icon ${icon.class}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>
                    </div>
                    <div class="notif-content">
                        <div class="notif-title">${notif.title}</div>
                        <div class="notif-message">${notif.message}</div>
                        <div class="notif-meta">
                            <span class="notif-time">${timeAgo(notif.created_at)}</span>
                            ${isUnread ? `<button class="btn-mark-read" onclick="markAsRead('${notif.id}',${isGlobal})">Mark as read</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // Export to window so the inline onclick="" can reach it
    window.markAsRead = async (id, isGlobal) => {
        const card = document.querySelector(`.notif-card[data-id="${id}"]`);
        if (card) {
            card.classList.remove('unread');
            const btn = card.querySelector('.btn-mark-read');
            if (btn) btn.remove();
        }

        if (isGlobal) {
            // Save global dismissals instantly to the browser cache
            const localRead = JSON.parse(localStorage.getItem('bryt_read_notifs') || '[]');
            if (!localRead.includes(id)) {
                localRead.push(id);
                localStorage.setItem('bryt_read_notifs', JSON.stringify(localRead));
            }
        } else {
            // Save personal dismissals to the secure database
            await window.db.from('user_notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
        }
    };

    markAllBtn.addEventListener('click', async () => {
        const localRead = JSON.parse(localStorage.getItem('bryt_read_notifs') || '[]');
        
        document.querySelectorAll('.notif-card.unread').forEach(card => {
            card.classList.remove('unread');
            const btn = card.querySelector('.btn-mark-read');
            if (btn) btn.remove();
            
            const id = card.getAttribute('data-id');
            const isGlobal = card.getAttribute('data-global') === 'true';
            
            if (isGlobal && !localRead.includes(id)) {
                localRead.push(id);
            }
        });
        
        // Save all globals locally
        localStorage.setItem('bryt_read_notifs', JSON.stringify(localRead));
        
        // Update all personal notifications in the database
        await window.db.from('user_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    });

    loadNotifications();
});