const API_BASE = "/api";

// --- THEME LOGIC ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const moon = document.getElementById('moonIcon');
    const sun = document.getElementById('sunIcon');

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        if (moon && sun) {
            moon.style.display = 'block';
            sun.style.display = 'none';
        }
    } else {
        document.body.classList.remove('dark');
        if (moon && sun) {
            sun.style.display = 'block';
            moon.style.display = 'none';
        }
    }
}

// --- AUTH LOGIC ---
let currentCaptchaId = "";

async function loadCaptcha() {
    const qElem = document.getElementById('captchaQuestion');
    if (!qElem) return; // Not on auth page
    try {
        const response = await fetch(`${API_BASE}/auth/captcha`);
        if (response.ok) {
            const data = await response.json();
            qElem.textContent = data.question;
            currentCaptchaId = data.captcha_id;
            document.getElementById('captchaAnswer').value = '';
        }
    } catch (e) {
        console.error("Failed to load captcha", e);
    }
}

function switchAuthView(mode) {
    const loginC = document.getElementById('loginContainer');
    const registerC = document.getElementById('registerContainer');
    if (!loginC || !registerC) return;

    if (mode === 'register') {
        loginC.style.display = 'none';
        registerC.style.display = 'block';
        loadCaptcha();
    } else {
        registerC.style.display = 'none';
        loginC.style.display = 'block';
    }
    
    // Update the URL without reloading the page
    if (window.history && window.history.pushState) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('mode', mode);
        window.history.pushState({}, '', newUrl);
    }
}

async function handleLogin(e, isAutoLogin = false) {
    if (e) e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (rememberMe) {
                localStorage.setItem('token', data.access_token);
                sessionStorage.removeItem('token');
            } else {
                sessionStorage.setItem('token', data.access_token);
                localStorage.removeItem('token');
            }
            // Redirect based on whether it's a new signup or an existing login
            if (isAutoLogin) {
                window.location.href = '/onboarding.html';
            } else {
                window.location.href = '/dashboard.html';
            }
        } else {
            errorDiv.textContent = data.detail || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'Network error occurred.';
        errorDiv.style.display = 'block';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const captchaAnswer = document.getElementById('captchaAnswer').value;
    const errorDiv = document.getElementById('registerError');
    const matchError = document.getElementById('passwordMatchError');
    
    if (password !== confirmPassword) {
        matchError.style.display = 'block';
        return;
    }
    matchError.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                username, 
                password,
                captcha_id: currentCaptchaId,
                captcha_answer: captchaAnswer
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Auto login after register
            document.getElementById('loginUsername').value = username;
            document.getElementById('loginPassword').value = password;
            // Execute login manually instead of dispatching event
            await handleLogin(null, true);
        } else {
            errorDiv.textContent = data.detail || 'Registration failed';
            errorDiv.style.display = 'block';
            loadCaptcha(); // Reload captcha
        }
    } catch (err) {
        errorDiv.textContent = 'Network error occurred.';
        errorDiv.style.display = 'block';
    }
}

// --- DOM READY BINDINGS ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme bindings
    initTheme();
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            const moon = document.getElementById('moonIcon');
            const sun = document.getElementById('sunIcon');
            if(moon && sun) {
                moon.style.display = isDark ? 'block' : 'none';
                sun.style.display = isDark ? 'none' : 'block';
            }
        });
    }

    // 2. Auth Page setup
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
    }
    if (document.getElementById('registerForm')) {
        document.getElementById('registerForm').addEventListener('submit', handleRegister);
    }
    if (document.getElementById('refreshCaptcha')) {
        document.getElementById('refreshCaptcha').addEventListener('click', loadCaptcha);
    }
    
    // View password toggles
    document.querySelectorAll('.view-password-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
                e.currentTarget.style.opacity = input.type === 'text' ? '1' : '0.6';
            }
        });
    });

    // URL Mode parsing
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if ((mode === 'register' || mode === 'signup') && document.getElementById('registerContainer')) {
        switchAuthView('register');
    }

    // 3. Landing Page Animations & Nav
    const nav = document.querySelector('.landing-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
});
