const API_URL = 'http://localhost:3000/api'; // Certifique-se de que a URL corresponde ao seu servidor

function getToken() {
    return localStorage.getItem('mdm_token');
}

/**
 * Realiza uma requisição HTTP para a API.
 * @param {string} path - O caminho do endpoint da API (ex: '/auth/login').
 * @param {string} method - O método HTTP (GET, POST, PUT, DELETE).
 * @param {object} [body=null] - O corpo da requisição para métodos POST/PUT.
 * @returns {Promise<object>} - Os dados da resposta da API.
 * @throws {Error} Se a requisição falhar ou retornar um erro.
 */
async function request(path, method = 'GET', body = null) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${path}`, options);
        const data = await response.json();

        if (!response.ok) {
            // Se a resposta não for OK (status 4xx ou 5xx), lança um erro com a mensagem da API
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error(`Erro na requisição ${method} ${path}:`, error);
        throw error; // Propaga o erro para quem chamou a função
    }
}
