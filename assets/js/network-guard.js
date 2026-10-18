(function () {
    // 1. Inject Branded Styles matching BRYT Pay Account UI
    const style = document.createElement('style');
    style.id = 'bryt-offline-styles';
    style.textContent = `
        #bryt-network-guard-screen {
            --guard-bg: #f4f6f9;
            --guard-card: #ffffff;
            --guard-text: #0B1220;
            --guard-border: #f1f5f9;
            --guard-primary: #1D5ED0;
            
            position: fixed; inset: 0; z-index: 99999999;
            background: var(--guard-bg);
            display: none; align-items: center; justify-content: center;
            padding: 20px; font-family: system-ui, -apple-system, sans-serif;
            transition: background 0.3s;
        }
        
        /* Sync with BRYT Pay Dark Mode */
        html.dark-theme #bryt-network-guard-screen {
            --guard-bg: #0f172a;
            --guard-card: #1e293b;
            --guard-text: #f8fafc;
            --guard-border: #334155;
        }

        #bryt-network-guard-screen.active {
            display: flex !important;
        }

        .bryt-offline-card {
            background: var(--guard-card);
            border: 1px solid var(--guard-border);
            border-radius: 20px;
            padding: 32px 24px;
            width: 100%;
            max-width: 320px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.05);
            transform: translateY(20px);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
        }
        
        #bryt-network-guard-screen.active .bryt-offline-card {
            transform: translateY(0);
            opacity: 1;
        }

        .bryt-offline-icon {
            width: 56px; height: 56px;
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px;
        }
        
        .bryt-offline-icon svg { width: 28px; height: 28px; }

        .bryt-offline-title {
            font-size: 1.15rem; font-weight: 800; 
            color: var(--guard-text); 
            margin: 0 0 8px 0;
        }

        .bryt-offline-desc {
            font-size: 0.8rem; color: #64748b; 
            margin: 0 0 24px 0; line-height: 1.5; font-weight: 500;
        }

        .bryt-offline-btn {
            width: 100%; padding: 14px; 
            background: var(--guard-primary); color: #ffffff; 
            font-size: 0.9rem; font-weight: 800;
            border: none; border-radius: 12px; cursor: pointer;
            display: flex; justify-content: center; align-items: center; gap: 8px;
            transition: 0.2s;
        }

        .bryt-offline-btn:active { transform: scale(0.96); }
        .bryt-offline-btn.checking { background: #64748b; cursor: not-allowed; }
        .bryt-offline-btn.failed { background: #ef4444; }

        @keyframes bryt-shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
        }
        .bryt-shake-box { animation: bryt-shake 0.4s ease; }
    `;
    document.head.appendChild(style);

    // 2. Build the Screen DOM Elements
    const screen = document.createElement('div');
    screen.id = 'bryt-network-guard-screen';
    screen.innerHTML = `
        <div class="bryt-offline-card">
            <div class="bryt-offline-icon" id="bryt-offline-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 1l22 22"></path>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
            </div>
            <h2 class="bryt-offline-title">Connection Lost</h2>
            <p class="bryt-offline-desc">You are currently offline. Please check your mobile data or Wi-Fi connection.</p>
            <button type="button" class="bryt-offline-btn" id="bryt-retry-btn">
                Retry Connection
            </button>
        </div>
    `;

    if (document.body) {
        document.body.appendChild(screen);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(screen));
    }

    const retryBtn = screen.querySelector('#bryt-retry-btn');
    const iconWrap = screen.querySelector('#bryt-offline-icon');

    // 3. UI Toggle Functions
    function showOfflineScreen() {
        screen.classList.add('active');
    }

    function hideOfflineScreen() {
        screen.classList.remove('active');
    }

    // 4. Verification Check
    async function testActualConnection() {
        if (!navigator.onLine) return false;

        try {
            // Fast ping to verify actual data throughput
            await fetch('https://www.google.com/generate_204', {
                method: 'HEAD', mode: 'no-cors', cache: 'no-store'
            });
            return true;
        } catch (e) {
            if (window.db && window.db.auth) {
                try {
                    await window.db.auth.getSession();
                    return true;
                } catch (err) {
                    return false;
                }
            }
            return false;
        }
    }

    // 5. Retry Handler
    async function handleRetry() {
        if (retryBtn.classList.contains('checking')) return;

        retryBtn.classList.add('checking');
        retryBtn.innerHTML = '<div style="width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div> Checking...';

        const hasInternet = await testActualConnection();

        if (hasInternet) {
            retryBtn.textContent = 'Connected! ✓';
            retryBtn.style.background = '#10b981';
            
            setTimeout(() => {
                hideOfflineScreen();
                retryBtn.classList.remove('checking');
                retryBtn.style.background = '';
                retryBtn.textContent = 'Retry Connection';
                window.location.reload(); // Refresh the frozen page securely
            }, 600);
        } else {
            iconWrap.classList.add('bryt-shake-box');
            retryBtn.classList.remove('checking');
            retryBtn.classList.add('failed');
            retryBtn.textContent = 'Still Offline';

            setTimeout(() => {
                iconWrap.classList.remove('bryt-shake-box');
                retryBtn.classList.remove('failed');
                retryBtn.textContent = 'Retry Connection';
            }, 1800);
        }
    }

    retryBtn.addEventListener('click', handleRetry);

    // 6. Native Listeners
    if (!navigator.onLine) showOfflineScreen();
    window.addEventListener('offline', showOfflineScreen);
    window.addEventListener('online', async () => {
        if (await testActualConnection()) hideOfflineScreen();
    });

    // Add spinner keyframe for the button
    const spinKeyframe = document.createElement('style');
    spinKeyframe.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(spinKeyframe);
})();