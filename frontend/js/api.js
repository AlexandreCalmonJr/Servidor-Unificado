// MDM Dashboard — API Client Module

const API = (() => {
    // ─── CORREÇÃO: BASE_URL calculada corretamente para dev e produção ───
    // Em produção (Railway, Heroku, etc.) window.location.port é "" — não
    // adicionar porta nenhuma. Em dev local usa a porta atual ou 3000.
    function buildBaseUrl() {
        const { protocol, hostname, port } = window.location;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

        if (isLocalhost && port) {
            return `${protocol}//${hostname}:${port}/api`;
        }
        if (isLocalhost) {
            return `${protocol}//${hostname}:3000/api`;
        }
        // Produção: sem porta explícita — o proxy reverso roteia
        return `${protocol}//${hostname}/api`;
    }

    const BASE_URL = buildBaseUrl();

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