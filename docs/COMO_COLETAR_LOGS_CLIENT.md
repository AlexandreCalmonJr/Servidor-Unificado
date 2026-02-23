# 🔍 Como Coletar Logs do Client Electron

## Localização dos Logs

### 1. **Pasta de Dados da Aplicação**
Windows (Electron):
```
%APPDATA%\unified-desktop-agent\
```

Ou em um terminal PowerShell:
```powershell
$env:APPDATA
# Copie o resultado e vá a: ...\AppData\Roaming\unified-desktop-agent\logs\
```

### 2. **Via DevTools (Desenvolvimento)**
Se estiver rodando em modo desenvolvimento (`npm start`):

1. Abra a janela do app
2. Pressione: `Ctrl + Shift + I` para abrir DevTools
3. Vá a aba **Console**
4. Procure por logs que começam com `[CommandPoller]` ou `[APIClient]`
5. Print Screen ou copie os logs

### 3. **No Logger Local**
Se instalou o app, os logs estão em:
```
C:\Users\{user}\AppData\Roaming\unified-desktop-agent\
```

Procure por arquivo tipo:
- `app.log`
- `main.log`
- `error.log`

### 4. **Teste Rápido - Mode Desenvolvimento**

```bash
cd clients\desktop
npm start
```

Quando abrir a janela:
1. Clique em "Configurações"
2. Verifique que tem:
   - IP do servidor
   - Porta 3000
   - Módulo: "Notebooks TI"
   - Token válido
3. Clique "Sincronizar Agora"
4. Abra DevTools (Ctrl+Shift+I)
5. Vá ao Console
6. Copie TODOS os logs que aparecerem

## Logs que Procurar

### ✅ Se funcionar corretamente:
```
[CommandPoller] 🔍 Buscando tipo do módulo 699c756685e5276aa4b3ae70...
[APIClient] 🔍 GET http://localhost:3000/api/modules/699c756685e5276aa4b3ae70
[APIClient] ✅ Resposta recebida: {"_id":"...","type":"notebook",...}
[CommandPoller] ✅ Tipo do módulo obtido com sucesso: notebook
[CommandPoller] 📤 Enviando para moduleId: 699c756685e5276aa4b3ae70 com asset_type: notebook
```

### ❌ Se falhar:
```
[CommandPoller] 🔍 Buscando tipo do módulo 699c756685e5276aa4b3ae70...
[APIClient] 🔍 GET http://localhost:3000/api/modules/699c756685e5276aa4b3ae70
[APIClient] ❌ Erro ao buscar estrutura do módulo: 401 Unauthorized
[APIClient] Erro 401: Não autorizado. Verifique token.
[CommandPoller] ❌ Falha ao obter tipo do módulo: 401 Unauthorized
[CommandPoller] Usando fallback 'desktop'
```

## Problemas Comuns

### "Erro 401: Não autorizado"
- **Causa:** Token inválido ou expirado
- **Solução:** Gere um novo token no painel admin

### "Erro de conexão" / "Timeout"
- **Causa:** IP/porta incorretos
- **Solução:** Verifique se consegue fazer ping: `ping IP_DO_SERVIDOR`

### "response.data?.module is undefined"
- **Causa:** API retornou estrutura diferente
- **Solução:** Compartilhe o log completo da resposta

## Como Compartilhar

1. Abra o Console (Ctrl+Shift+I)
2. Clique direito → "Save as..."
3. Salve em `console.log`
4. OU copie e cole os logs aqui

---

## Teste Alternativo (Node.js Puro)

Se preferir testar sem abrir o app:

```bash
# Na pasta do servidor
node -e "
require('dotenv').config();
const axios = require('axios');
(async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/modules/699c756685e5276aa4b3ae70', {
      headers: { 'Authorization': 'Bearer SEU_TOKEN' },
      timeout: 5000,
    });
    console.log('✅ Resposta:', JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.error('❌ Erro:', e.message);
    if (e.response?.data) console.error('Detalhes:', e.response.data);
  }
})();
"
```

---

## Checklist Antes de Reportar

- [ ] Cliente foi reconstruído (`npm start`)
- [ ] Servidor está rodando (http://localhost:3000/health retorna 200)
- [ ] Configuração do cliente está correta
- [ ] Cliquei "Sincronizar Agora"
- [ ] Copiei os logs do Console (Ctrl+Shift+I)
- [ ] Verifiquei se tem os logs `[CommandPoller]` e `[APIClient]`

