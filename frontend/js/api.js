const API_BASE = "/api";

function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getAuthHeaders() {
    const token = getToken();
    if (!token) {
        window.location.href = "/auth.html";
        return {};
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

async function apiFetch(endpoint, options = {}) {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return null;
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        });
        
        if (response.status === 401) {
            // Unauthorized, clear token and redirect
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = "/auth.html";
            return null;
        }
        
        return response;
    } catch (err) {
        console.error("API Error:", err);
        return null;
    }
}
