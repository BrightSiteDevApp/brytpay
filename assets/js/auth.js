document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // 🛡️ SECURITY FIX: Smart Redirect Helper (Anti-Open Redirect)
    // ==========================================
    const handleSmartRedirect = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');
        
        // Ensure redirectUrl exists, starts with exactly ONE slash (local path), 
        // and does NOT start with TWO slashes (which browsers interpret as an external domain).
        if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
            window.location.href = decodeURIComponent(redirectUrl);
        } else {
            window.location.href = '/dashboard/';
        }
    };

    const { data: { session } } = await window.db.auth.getSession();
    if (session) {
        handleSmartRedirect();
        return;
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
        const pwdHint = document.getElementById('pwd-hint');

        pwdInput.addEventListener('input', () => {
            if (pwdRegex.test(pwdInput.value)) {
                pwdHint.textContent = "✓ Password is strong";
                pwdHint.className = "password-hint valid";
            } else {
                pwdHint.textContent = "Must contain an uppercase letter, lowercase letter, and a number (min 8 chars).";
                pwdHint.className = "password-hint invalid";
            }
        });

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signup-btn');
            
            regName = document.getElementById('fullname').value.trim();
            regPhone = document.getElementById('phone').value.trim();
            regEmail = document.getElementById('email').value.trim();
            const pwd = pwdInput.value;

            // 🛡️ SECURITY FIX: Ensure phone contains exactly 11 numeric digits only
            if (!/^\d{11}$/.test(regPhone)) return showError('Enter a valid 11-digit phone number (numbers only).');
            if (!pwdRegex.test(pwd)) return showError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');

            btn.disabled = true;
            btn.textContent = 'Creating account...';
            if (errorEl) errorEl.style.display = 'none';

            const { data, error } = await window.db.auth.signUp({
                email: regEmail,
                password: pwd,
                options: { data: { full_name: regName, phone_number: regPhone } }
            });

            if (error) {
                showError(error.message);
                btn.disabled = false;
                btn.textContent = 'Create Account';
                return;
            }

            // 🛡️ SECURITY FIX: Safe DOM insertion to prevent XSS
            const signupHeader = document.getElementById('signup-header');
            signupHeader.innerHTML = `<h1>Check your email</h1><p>We sent an 8-digit code to <strong id="safe-reg-email"></strong></p>`;
            document.getElementById('safe-reg-email').textContent = regEmail; // .textContent neutralizes any malicious code

            signupForm.style.display = 'none';
            document.getElementById('signup-otp-form').style.display = 'block';
        });

        document.getElementById('signup-otp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('verify-signup-btn');
            const token = document.getElementById('signup-otp-code').value.trim();
            
            btn.disabled = true;
            btn.textContent = 'Verifying...';

            const { data, error } = await window.db.auth.verifyOtp({ email: regEmail, token, type: 'signup' });

            if (error || !data.session) {
                showError(`Verification failed: ${error?.message || 'Invalid code'}`);
                btn.disabled = false;
                btn.textContent = 'Verify & Complete';
                return;
            }

            const user = data.session.user;
            
            try {
                const { error: profileError } = await window.db.from('profiles').upsert({ 
                    id: user.id, 
                    full_name: regName, 
                    phone_number: regPhone,
                    email: regEmail 
                });

                if (profileError) console.error("Failed to save phone number to profiles:", profileError);

                await window.db.from('wallets').upsert({ user_id: user.id, balance: 0.00 });
            } catch (err) {
                console.error("Database error during profile creation:", err);
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
            authTitle.innerHTML = `<h1>Reset Password</h1><p>We'll send you an 8-digit code.</p>`;
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

            await window.db.auth.signOut();
            const { error: otpError } = await window.db.auth.signInWithOtp({ email });

            if (otpError) {
                showError('Failed to send login code: ' + otpError.message);
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            loginEmailForOtp = email;
            loginForm.style.display = 'none';
            loginOtpForm.style.display = 'block';
            authTitle.innerHTML = `<h1>Two-Step Login</h1><p>Check your email for the security code.</p>`;
        });

        loginOtpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('verify-login-btn');
            const token = document.getElementById('login-otp-code').value.trim();

            btn.disabled = true;
            btn.textContent = 'Authenticating...';

            const { error } = await window.db.auth.verifyOtp({ email: loginEmailForOtp, token, type: 'email' });

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
            btn.textContent = 'Sending...';

            const { error } = await window.db.auth.resetPasswordForEmail(recoveryEmail);

            if (error) {
                showError(error.message);
                btn.disabled = false;
                btn.textContent = 'Send 8-Digit Code';
                return;
            }

            resetEmailForm.style.display = 'none';
            resetPwdForm.style.display = 'block';
            
            // 🛡️ SECURITY FIX: Safe DOM insertion to prevent XSS
            authTitle.innerHTML = `<h1>Enter Code</h1><p>Sent to <strong id="safe-recovery-email"></strong></p>`;
            document.getElementById('safe-recovery-email').textContent = recoveryEmail; // .textContent neutralizes attacks
            
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