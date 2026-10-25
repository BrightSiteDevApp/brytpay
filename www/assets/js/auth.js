document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // 🧹 MASTER SECURITY RESET
    // ==========================================
    // Wipe dashboard memory so every fresh login strictly requires the PIN
    sessionStorage.removeItem('bryt_unlocked');
    sessionStorage.removeItem('bryt_dash_splash_shown');

    // ==========================================
    // 🚀 TEST & REVIEWER OVERRIDE CONFIG
    // ==========================================
    const TEST_REVIEWER_EMAILS = [
        'test@gmail.com',
        'test@brytpay.name.ng',
        'test@brytpay.com'
    ];
    const TEST_OTP = '123456';

    // ==========================================
    // 🛡️ SMART REDIRECT HELPER (Anti-Open Redirect)
    // ==========================================
    const handleSmartRedirect = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');
        
        if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
            window.location.href = decodeURIComponent(redirectUrl);
        } else {
            window.location.href = '/dashboard/index.html';
        }
    };

    // ==========================================
    // ⏱️ AUTH SPLASH LOGIC & SESSION CHECK
    // ==========================================
    const splash = document.getElementById('app-splash');
    const authSplashShown = sessionStorage.getItem('bryt_auth_splash_shown');

    if (splash) {
        if (authSplashShown === 'true') {
            splash.remove();
            const { data: { session } } = await window.db.auth.getSession();
            if (session) {
                handleSmartRedirect();
                return;
            }
        } else {
            const minSplashTime = new Promise(resolve => setTimeout(resolve, 1500));
            const sessionPromise = window.db.auth.getSession();

            const [_, { data: { session } }] = await Promise.all([minSplashTime, sessionPromise]);

            if (session) {
                handleSmartRedirect();
                return;
            }

            splash.classList.add('hidden');
            sessionStorage.setItem('bryt_auth_splash_shown', 'true');
            setTimeout(() => splash.remove(), 500); 
        }
    } else {
        const { data: { session } } = await window.db.auth.getSession();
        if (session) {
            handleSmartRedirect();
            return;
        }
    }

    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');

    const showError = (msg) => {
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
        if (successEl) successEl.style.display = 'none';
    };

    const showSuccess = (msg) => {
        if (successEl) { successEl.textContent = msg; successEl.style.display = 'block'; }
        if (errorEl) errorEl.style.display = 'none';
    };

    // ==========================================
    // --- PASSWORD VISIBILITY TOGGLE ---
    // ==========================================
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            } else {
                input.type = 'password';
                this.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        });
    });

    // ==========================================
    // --- SIGN UP LOGIC ---
    // ==========================================
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        let regEmail = '';
        let regName = '';
        let regPhone = '';
        
        const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        const pwdInput = document.getElementById('password');
        const confirmPwdInput = document.getElementById('confirm-password');
        const pwdHint = document.getElementById('pwd-hint');
        const pwdMatchHint = document.getElementById('pwd-match-hint');

        pwdInput.addEventListener('input', () => {
            if (pwdRegex.test(pwdInput.value)) {
                pwdHint.textContent = "✓ Password is strong";
                pwdHint.className = "password-hint valid";
            } else {
                pwdHint.textContent = "Min 8 chars, 1 uppercase, 1 lowercase, 1 number.";
                pwdHint.className = "password-hint invalid";
            }
            checkMatch(); 
        });

        const checkMatch = () => {
            if (!confirmPwdInput.value) {
                pwdMatchHint.textContent = "";
                pwdMatchHint.className = "password-hint";
                return;
            }
            if (confirmPwdInput.value === pwdInput.value) {
                pwdMatchHint.textContent = "✓ Passwords match";
                pwdMatchHint.className = "password-hint valid";
            } else {
                pwdMatchHint.textContent = "Passwords do not match.";
                pwdMatchHint.className = "password-hint invalid";
            }
        };

        confirmPwdInput.addEventListener('input', checkMatch);

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signup-btn');
            
            regName = document.getElementById('fullname').value.trim();
            regPhone = document.getElementById('phone').value.trim();
            regEmail = document.getElementById('email').value.trim();
            const pwd = pwdInput.value;
            const confirmPwd = confirmPwdInput.value;
            const isTestAccount = TEST_REVIEWER_EMAILS.includes(regEmail.toLowerCase());

            if (!/^\d{11}$/.test(regPhone)) return showError('Enter a valid 11-digit phone number.');
            if (!isTestAccount && !pwdRegex.test(pwd)) return showError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
            if (pwd !== confirmPwd) return showError('Passwords do not match. Please try again.');

            btn.disabled = true;
            btn.textContent = 'Checking...';
            if (errorEl) errorEl.style.display = 'none';

            try {
                const { data: emailExists } = await window.db.rpc('check_email_exists', { lookup_email: regEmail });
                if (emailExists) {
                    showError('This Email Address is already registered. Please sign in instead.');
                    btn.disabled = false;
                    btn.textContent = 'Create Account';
                    return;
                }
            } catch (err) {
                console.warn("RPC Check skipped.", err);
            }

            btn.textContent = 'Creating account...';

            const { data, error } = await window.db.auth.signUp({
                email: regEmail,
                password: pwd,
                options: { data: { full_name: regName, phone_number: regPhone } }
            });

            if (error) {
                let customErrorMsg = error.message;
                if (customErrorMsg.includes('Database error saving new user') || customErrorMsg.includes('duplicate key')) {
                    customErrorMsg = 'This Phone Number is already registered. Please sign in instead.';
                }
                
                showError(customErrorMsg);
                btn.disabled = false;
                btn.textContent = 'Create Account';
                return;
            }

            const signupHeader = document.getElementById('signup-header');
            signupHeader.innerHTML = `<h1>Check your email</h1><p>We sent a 6-digit code to <strong id="safe-reg-email" style="color: var(--text-main);"></strong></p>`;
            document.getElementById('safe-reg-email').textContent = regEmail; 

            localStorage.setItem('bryt_pending_email', regEmail);
            localStorage.setItem('bryt_pending_name', regName);
            localStorage.setItem('bryt_pending_phone', regPhone);

            signupForm.style.display = 'none';
            document.getElementById('signup-otp-form').style.display = 'block';
        });

        document.getElementById('signup-otp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('verify-signup-btn');
            const token = document.getElementById('signup-otp-code').value.trim();
            const verifyEmail = regEmail || localStorage.getItem('bryt_pending_email');
            
            if (!verifyEmail) {
                showError('Session lost. Please refresh and try signing up again.');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Logging in...'; // 🚀 Updated to look natural

            const { data, error } = await window.db.auth.verifyOtp({ email: verifyEmail, token, type: 'signup' });

            if (error || !data.session) {
                showError(`Verification failed: ${error?.message || 'Invalid code'}`);
                btn.disabled = false;
                btn.textContent = 'Verify & Complete';
                return;
            }

            const user = data.session.user;
            const secureFullName = regName || localStorage.getItem('bryt_pending_name') || user.user_metadata?.full_name || '';
            const securePhone = regPhone || localStorage.getItem('bryt_pending_phone') || user.user_metadata?.phone_number || '';
            
            try {
                let { data: updatedRows, error: profileError } = await window.db
                    .from('profiles')
                    .update({ 
                        full_name: secureFullName, 
                        phone_number: securePhone,
                        email: user.email 
                    })
                    .eq('id', user.id)
                    .select();

                if (!profileError && (!updatedRows || updatedRows.length === 0)) {
                    await window.db.from('profiles').upsert({ 
                        id: user.id, 
                        full_name: secureFullName, 
                        phone_number: securePhone,
                        email: user.email 
                    });
                }

                await window.db.from('wallets').upsert({ user_id: user.id, balance: 0.00 });
                window.db.functions.invoke('send-welcome-email', { body: {} }).catch(err => console.error(err));
                
                // 🚀 INSTANT 9PSB PROVISIONING (Awaited silently in the background)
                try {
                    await window.db.functions.invoke('reserve-virtual-account', {
                        body: { action: 'reserve_basic', phoneNumber: securePhone }
                    });
                } catch (reserveErr) {
                    console.error("Basic account gen failed:", reserveErr);
                }
                
                localStorage.removeItem('bryt_pending_email');
                localStorage.removeItem('bryt_pending_name');
                localStorage.removeItem('bryt_pending_phone');

            } catch (err) {
                console.error("Unexpected Profile Error: ", err);
            }

            handleSmartRedirect();
        });
    }

    // ==========================================
    // --- LOGIN & FORGOT PASSWORD LOGIC ---
    // ==========================================
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const loginOtpForm = document.getElementById('login-otp-form');
        const resetEmailForm = document.getElementById('reset-email-form');
        const resetPwdForm = document.getElementById('reset-pwd-form');
        const authTitle = document.getElementById('auth-title');
        
        let loginEmailForOtp = '';
        let recoveryEmail = '';

        document.getElementById('forgot-pwd-trigger').addEventListener('click', () => {
            loginForm.style.display = 'none';
            resetEmailForm.style.display = 'block';
            authTitle.innerHTML = `<h1>Reset Password</h1><p>We'll send you a 6-digit code.</p>`;
            if (errorEl) errorEl.style.display = 'none';
        });

        document.getElementById('back-to-login').addEventListener('click', () => {
            resetEmailForm.style.display = 'none';
            loginForm.style.display = 'block';
            authTitle.innerHTML = `<h1>Welcome Back</h1><p>Sign in to manage your utility payments.</p>`;
            if (errorEl) errorEl.style.display = 'none';
        });

        document.getElementById('cancel-login-otp').addEventListener('click', (e) => {
            e.preventDefault();
            loginOtpForm.style.display = 'none';
            loginForm.style.display = 'block';
            document.getElementById('login-btn').disabled = false;
            document.getElementById('login-btn').textContent = 'Sign In';
            authTitle.innerHTML = `<h1>Welcome Back</h1><p>Sign in to manage your utility payments.</p>`;
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            btn.disabled = true;
            btn.textContent = 'Verifying Password...';
            if (errorEl) errorEl.style.display = 'none';

            const { data, error } = await window.db.auth.signInWithPassword({ email, password });

            if (error) {
                showError(error.message);
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            loginEmailForOtp = email;

            if (TEST_REVIEWER_EMAILS.includes(email.toLowerCase())) {
                localStorage.setItem('bryt_test_email', email);
                localStorage.setItem('bryt_test_pass', password);
                
                loginForm.style.display = 'none';
                loginOtpForm.style.display = 'block';
                authTitle.innerHTML = `<h1>Two-Step Login</h1><p>Enter your 6-digit security code.</p>`;
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            await window.db.auth.signOut();
            const { error: otpError } = await window.db.auth.signInWithOtp({ email });

            if (otpError) {
                showError('Failed to send login code: ' + otpError.message);
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            loginForm.style.display = 'none';
            loginOtpForm.style.display = 'block';
            authTitle.innerHTML = `<h1>Two-Step Login</h1><p>Check your email for the security code.</p>`;
        });

        loginOtpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('verify-login-btn');
            const token = document.getElementById('login-otp-code').value.trim();
            
            const currentEmail = (loginEmailForOtp || localStorage.getItem('bryt_test_email') || '').toLowerCase();

            btn.disabled = true;
            btn.textContent = 'Authenticating...';

            if (TEST_REVIEWER_EMAILS.includes(currentEmail) && token === TEST_OTP) {
                const { data: sessData } = await window.db.auth.getSession();
                if (!sessData?.session) {
                    const savedPass = localStorage.getItem('bryt_test_pass') || '123456';
                    const { error: reAuthErr } = await window.db.auth.signInWithPassword({
                        email: currentEmail,
                        password: savedPass
                    });
                    if (reAuthErr) {
                        showError(reAuthErr.message);
                        btn.disabled = false;
                        btn.textContent = 'Verify & Sign In';
                        return;
                    }
                }
                
                localStorage.removeItem('bryt_test_email');
                localStorage.removeItem('bryt_test_pass');
                
                handleSmartRedirect();
                return;
            }

            const { error } = await window.db.auth.verifyOtp({ email: currentEmail || loginEmailForOtp, token, type: 'email' });

            if (error) {
                showError('Invalid or expired code.');
                btn.disabled = false;
                btn.textContent = 'Verify & Sign In';
                return;
            }

            handleSmartRedirect();
        });

        resetEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            recoveryEmail = document.getElementById('reset-email').value.trim();
            const btn = document.getElementById('send-otp-btn');

            btn.disabled = true;
            btn.textContent = 'Checking...';

            try {
                const { data: emailExists } = await window.db.rpc('check_email_exists', { lookup_email: recoveryEmail });
                if (!emailExists) {
                    showError('This email address is not found in our database.');
                    btn.disabled = false;
                    btn.textContent = 'Send 6-Digit Code';
                    return;
                }
            } catch (err) {
                console.warn("RPC Check skipped.", err);
            }

            btn.textContent = 'Sending...';

            const { error } = await window.db.auth.resetPasswordForEmail(recoveryEmail);

            if (error) {
                showError(error.message);
                btn.disabled = false;
                btn.textContent = 'Send 6-Digit Code';
                return;
            }

            resetEmailForm.style.display = 'none';
            resetPwdForm.style.display = 'block';
            
            authTitle.innerHTML = `<h1>Enter Code</h1><p>Sent to <strong id="safe-recovery-email" style="color: var(--text-main);"></strong></p>`;
            document.getElementById('safe-recovery-email').textContent = recoveryEmail; 
            
            showSuccess('Reset code sent to your email.');
        });

        resetPwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = document.getElementById('reset-otp').value.trim();
            const newPassword = document.getElementById('new-password').value;
            const btn = document.getElementById('save-pwd-btn');

            btn.disabled = true;
            btn.textContent = 'Verifying...';

            const { error: verifyError } = await window.db.auth.verifyOtp({ email: recoveryEmail, token, type: 'recovery' });

            if (verifyError) {
                showError(`Invalid Code: ${verifyError.message}`);
                btn.disabled = false;
                btn.textContent = 'Save & Sign In';
                return;
            }

            const { error: updateError } = await window.db.auth.updateUser({ password: newPassword });

            if (updateError) {
                await window.db.auth.signOut(); 
                showError(`Update failed: ${updateError.message}. Please request a new code.`);
                btn.disabled = false;
                btn.textContent = 'Save & Sign In';
                
                resetPwdForm.style.display = 'none';
                resetEmailForm.style.display = 'block';
                return;
            }

            handleSmartRedirect();
        });
    }
});