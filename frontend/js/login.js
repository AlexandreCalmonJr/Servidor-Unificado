(() => {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    let submitting = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitting) return;

        errorEl.textContent = '';

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            errorEl.textContent = 'Preencha todos os campos.';
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';

        try {
            const data = await API.post('/auth/login', { username, password });
            if (data.token) {
                localStorage.setItem('mdm_token', data.token);
                if (data.user) {
                    localStorage.setItem('mdm_user', JSON.stringify(data.user));
                }
                window.location.href = '/panel/';
            } else {
                errorEl.textContent = 'Resposta invalida do servidor.';
            }
        } catch (err) {
            errorEl.textContent = err.message || 'Erro ao conectar. Tente novamente.';
        } finally {
            submitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    });
})();
