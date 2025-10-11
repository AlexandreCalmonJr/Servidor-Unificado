const loginForm = document.getElementById('login-form');
const messageElement = document.getElementById('message');

if (loginForm) { // Garante que o script só execute na página de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('mdm_token', data.token);
                // Redireciona para o dashboard após login bem-sucedido
                window.location.href = '/dashboard.html';
            } else {
                messageElement.textContent = data.error || 'Erro ao fazer login. Tente novamente.';
            }
        } catch (error) {
            messageElement.textContent = 'Erro de conexão com o servidor.';
            console.error('Erro de login:', error);
        }
    });
}
