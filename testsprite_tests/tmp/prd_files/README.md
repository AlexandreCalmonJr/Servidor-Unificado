# Servidor MDM Unificado

Sistema de gerenciamento de dispositivos móveis (MDM) e monitoramento de totens, construído com Node.js, Express e MongoDB.

## 📋 Índice

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [API](#api)
- [Desenvolvimento](#desenvolvimento)
- [Deploy](#deploy)
- [Segurança](#segurança)
- [Monitoramento](#monitoramento)

## ✨ Características

- 🔐 **Autenticação JWT** com suporte a múltiplos formatos de token
- 🛡️ **Segurança** com Helmet, sanitização MongoDB e proteção HPP
- 📊 **Métricas** de performance e monitoramento em tempo real
- 🚀 **Cache** inteligente com Redis (opcional) e cache HTTP
- 🔄 **Rate Limiting** configurável por rota e usuário
- 📱 **Gerenciamento de Dispositivos** (mobile, totens, notebooks, etc.)
- 🌐 **CORS** configurável para múltiplas origens
- 📈 **Health Checks** avançados para Kubernetes
- 🔍 **Logs estruturados** com Winston
- ⚡ **Performance** otimizada com compressão e índices de banco de dados

## 🔧 Requisitos

- Node.js >= 16.x
- MongoDB >= 5.0
- Redis >= 6.0 (opcional, mas recomendado)
- npm ou yarn

## 📦 Instalação

### Instalação Local

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd Servidor-Unificado

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o servidor
npm start
```

### Instalação com Docker

```bash
# Build e inicie os containers
docker-compose up -d

# Verifique os logs
docker-compose logs -f mdm-server

# Pare os containers
docker-compose down
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# Banco de Dados
MONGO_URI=mongodb://localhost:27017/mdm

# Segurança
JWT_SECRET=sua_chave_super_secreta_com_pelo_menos_32_caracteres_aqui
AUTH_TOKEN=hap@2025

# Servidor
PORT=3000
NODE_ENV=development

# CORS (separado por vírgulas)
CORS_ORIGIN=http://localhost:3001,https://app.exemplo.com

# Logs
LOG_LEVEL=info

# Cache (Redis)
REDIS_ENABLED=false
REDIS_URL=redis://127.0.0.1:6379
```

#### Gerando JWT_SECRET Seguro

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Configuração do MongoDB

O servidor cria automaticamente as collections necessárias. Para otimizar performance, execute:

```bash
npm run create-indexes
```

## 🚀 Uso

### Desenvolvimento

```bash
# Inicia o servidor em modo desenvolvimento com auto-reload
npm run dev

# Verifica código com ESLint
npm run lint

# Corrige problemas de lint automaticamente
npm run lint:fix

# Formata código com Prettier
npm run format

# Verifica formatação
npm run format:check
```

### Produção

```bash
# Inicia o servidor em modo produção
NODE_ENV=production npm start
```

## 📡 API

### Endpoints Principais

#### Health Checks

```bash
# Health check básico
GET /health

# Readiness probe (Kubernetes)
GET /ready

# Liveness probe (Kubernetes)
GET /live

# Métricas de performance
GET /metrics

# Métricas formato Prometheus
GET /metrics/prometheus
```

#### Autenticação

```bash
# Login
POST /api/auth/login
Content-Type: application/json
{
  "username": "admin",
  "password": "senha123"
}

# Registro de usuário (requer autenticação admin)
POST /api/auth/register
Authorization: Bearer <token>
Content-Type: application/json
{
  "username": "novo_usuario",
  "email": "usuario@exemplo.com",
  "password": "senha_forte_123!",
  "role": "user",
  "sector": "TI",
  "permissions": ["mobile", "totem"]
}

# Verificar token
GET /api/auth/verify
Authorization: Bearer <token>
```

#### Dispositivos

```bash
# Listar dispositivos
GET /api/devices
Authorization: Bearer <token>

# Buscar dispositivo por serial
GET /api/devices/:serialNumber
Authorization: Bearer <token>

# Atualizar dispositivo
PUT /api/devices/:serialNumber
Authorization: Bearer <token>
Content-Type: application/json
{
  "device_name": "Novo Nome",
  "status": "online"
}

# Deletar dispositivo
DELETE /api/devices/:serialNumber
Authorization: Bearer <token>
```

### Autenticação

O servidor suporta três formatos de autenticação:

1. **Header Authorization Bearer** (recomendado para web)
   ```
   Authorization: Bearer <token>
   ```

2. **Header AUTH_TOKEN** (para agentes)
   ```
   AUTH_TOKEN: <token>
   ```

3. **Query Parameter** (para agentes sem suporte a headers customizados)
   ```
   ?token=<token>
   ```

## 👨‍💻 Desenvolvimento

### Estrutura do Projeto

```
Servidor-Unificado/
├── config/              # Configurações
├── controllers/         # Controladores de rotas
├── middleware/          # Middlewares customizados
├── models/              # Modelos do Mongoose
├── routes/              # Definições de rotas
├── scripts/             # Scripts utilitários
├── services/            # Serviços (cache, etc.)
├── utils/               # Utilitários (logger, helpers, validators)
├── public/              # Arquivos estáticos
├── logs/                # Arquivos de log
├── .env                 # Variáveis de ambiente
├── server.js            # Ponto de entrada
└── package.json         # Dependências
```

### Padrões de Código

- **ESLint**: Configurado com regras de segurança
- **Prettier**: Formatação consistente
- **JSDoc**: Documentação de funções

### Adicionando Novas Rotas

1. Crie o controller em `controllers/`
2. Defina as rotas em `routes/`
3. Adicione validação usando `utils/validators.js`
4. Registre a rota em `server.js`

Exemplo:

```javascript
// routes/exemploRoutes.js
const { validateObjectId } = require('../utils/validators');
const { asyncHandler } = require('../middleware/error');

module.exports = (logger, limiter, auth) => {
  const router = express.Router();
  
  router.get('/:id', 
    auth, 
    validateObjectId('id'),
    asyncHandler(async (req, res) => {
      // Sua lógica aqui
      res.json({ success: true });
    })
  );
  
  return router;
};
```

## 🐳 Deploy

### Docker

```bash
# Build da imagem
docker build -t mdm-server:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -e MONGO_URI=mongodb://mongo:27017/mdm \
  -e JWT_SECRET=seu_secret_aqui \
  --name mdm-server \
  mdm-server:latest
```

### Docker Compose

```bash
# Inicia todos os serviços (MongoDB, Redis, Servidor)
docker-compose up -d

# Escala o servidor
docker-compose up -d --scale mdm-server=3

# Visualiza logs
docker-compose logs -f

# Para todos os serviços
docker-compose down
```

### Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mdm-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mdm-server
  template:
    metadata:
      labels:
        app: mdm-server
    spec:
      containers:
      - name: mdm-server
        image: mdm-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mdm-secrets
              key: mongo-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: mdm-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 🔒 Segurança

### Práticas Implementadas

- ✅ **Helmet**: Headers HTTP seguros
- ✅ **CORS**: Configuração restritiva de origens
- ✅ **Rate Limiting**: Proteção contra DDoS e brute force
- ✅ **Sanitização**: Prevenção de NoSQL injection
- ✅ **HPP**: Proteção contra HTTP Parameter Pollution
- ✅ **JWT**: Autenticação stateless com expiração
- ✅ **Bcrypt**: Hash seguro de senhas
- ✅ **Validação**: Validação rigorosa de entrada

### Recomendações

1. **Nunca** commite o arquivo `.env`
2. Use **senhas fortes** para JWT_SECRET (mínimo 32 caracteres)
3. Configure **CORS** com domínios específicos em produção
4. Ative **HTTPS** em produção
5. Mantenha **dependências atualizadas**: `npm audit`
6. Use **variáveis de ambiente** para dados sensíveis
7. Implemente **rotação de tokens** JWT

## 📊 Monitoramento

### Métricas Disponíveis

Acesse `/metrics` para ver:

- Total de requisições
- Requisições por método HTTP
- Requisições por rota
- Tempo médio de resposta
- Percentis (P50, P95, P99)
- Taxa de erro
- Uso de memória
- Uptime

### Integração com Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mdm-server'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics/prometheus'
    scrape_interval: 15s
```

### Logs

Logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs
- `logs/access.log` - Requisições HTTP

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Licença

ISC

## 👥 Autores

- Equipe de Desenvolvimento MDM

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.
