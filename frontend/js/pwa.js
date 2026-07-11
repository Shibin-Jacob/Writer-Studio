let deferredPrompt;

// Register the Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Handle the install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show our custom install UI
    showInstallPromotion();
});

function showInstallPromotion() {
    // Check if the prompt is already shown or the app is already installed
    if (document.getElementById('pwa-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 10000;
        animation: slideInUp 0.5s ease-out forwards;
    `;

    // Inject animation style if not present
    if (!document.getElementById('pwa-anim-style')) {
        const style = document.createElement('style');
        style.id = 'pwa-anim-style';
        style.textContent = `
            @keyframes slideInUp {
                from { transform: translateY(100px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    banner.innerHTML = `
        <img src="/img/logo-squaricle.png" alt="Writer Studio" style="width: 48px; height: 48px; border-radius: 12px;">
        <div style="flex-grow: 1;">
            <h4 style="margin: 0 0 4px 0; color: #f8fafc; font-size: 1rem;">Install Writer Studio</h4>
            <p style="margin: 0; color: #94a3b8; font-size: 0.85rem;">Work faster and offline!</p>
        </div>
        <button id="pwa-install-btn" style="
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 20px; 
            cursor: pointer; 
            font-weight: 500;
        ">Install</button>
        <button id="pwa-dismiss-btn" style="
            background: transparent;
            color: #94a3b8;
            border: none;
            padding: 4px;
            cursor: pointer;
            margin-left: -8px;
        ">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        // Hide our user interface that shows our A2HS button
        banner.remove();
        // Show the prompt
        if (deferredPrompt) {
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
        }
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        banner.remove();
    });
}

window.addEventListener('appinstalled', () => {
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    console.log('PWA was installed');
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
});

// Enforce onboarding and set profile globally
(async function enforceOnboarding() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const path = window.location.pathname;
    // Don't enforce on auth, onboarding, or landing pages
    if (path.includes('auth.html') || path.includes('onboarding.html') || path === '/' || path.includes('index.html')) {
        return;
    }

    try {
        const response = await fetch('/api/auth/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            
            // Update profile initial globally
            const profileInitialElement = document.getElementById('profileInitial');
            const profileImageElement = document.getElementById('profileImage');
            
            if (data.profile_photo_url) {
                if (profileImageElement) {
                    profileImageElement.src = data.profile_photo_url;
                    profileImageElement.style.display = 'block';
                    profileImageElement.style.width = '100%';
                    profileImageElement.style.height = '100%';
                    profileImageElement.style.objectFit = 'cover';
                }
                if (profileInitialElement) profileInitialElement.style.display = 'none';
            } else if (data.username) {
                if (profileInitialElement) {
                    profileInitialElement.textContent = data.username.charAt(0).toUpperCase();
                    profileInitialElement.style.display = 'block';
                }
                if (profileImageElement) profileImageElement.style.display = 'none';
            }

            // Redirect to onboarding if profile is incomplete
            if (!data.full_name || !data.phone_no) {
                window.location.href = '/onboarding.html';
            }
        } else if (response.status === 401) {
            // Token is likely invalid/expired
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/auth.html';
        }
    } catch(e) {
        console.error('Failed to fetch user profile:', e);
    }
})();

// Dynamically load cropper utils
(function() {
    if (!document.getElementById('cropper-utils-script')) {
        const s = document.createElement('script');
        s.id = 'cropper-utils-script';
        s.src = '/js/cropper_utils.js';
        document.head.appendChild(s);
    }
})();

// Apply Global Settings
window.applyGlobalSettings = function() {
    const extEnabled = localStorage.getItem('extEnabled') !== 'false';
    const extLinks = document.querySelectorAll('a[href="/extensions.html"], div[onclick*="/extensions.html"]');
    
    extLinks.forEach(el => {
        el.style.display = extEnabled ? '' : 'none';
    });
    
    if (!extEnabled && window.location.pathname.endsWith('/extensions.html')) {
        window.location.href = '/dashboard.html';
    }
};

window.applyGlobalSettings();
