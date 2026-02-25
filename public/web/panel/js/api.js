// MDM Dashboard — API Client Module

const API = (() => {

    // Detecta se está em localhost ou em produção
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Em produção, não usamos porta no BASE_URL (o Railway cuida do roteamento)
    const port = isLocalhost ? (window.location.port || 3000) : '';
    const colon = port ? `:${port}` : '';
    // Auto-detect base URL from current location
    const BASE_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}/api`;

    function getToken() {
        return localStorage.getItem('mdm_token');
    }

    function clearAuth() {
        localStorage.removeItem('mdm_token');
        localStorage.removeItem('mdm_user');
    }

    async function request(path, method = 'GET', body = null, isFormData = false) {
        const token = getToken();
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const options = { method, headers };

        if (body) {
            options.body = isFormData ? body : JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${path}`, options);

        // Handle 401 — redirect to login
        if (response.status === 401) {
            clearAuth();
            window.location.href = '/panel/login.html';
            throw new Error('Sessão expirada');
        }

        let data;
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new Error(
                (typeof data === 'object' && (data.error || data.message)) ||
                `Erro ${response.status}`
            );
        }

        return data;
    }

    return {
        get: (path) => request(path, 'GET'),
        post: (path, body) => request(path, 'POST', body),
        put: (path, body) => request(path, 'PUT', body),
        delete: (path) => request(path, 'DELETE'),
        upload: (path, formData) => request(path, 'POST', formData, true),
        getToken,
        clearAuth,
        BASE_URL,
    };
})();
