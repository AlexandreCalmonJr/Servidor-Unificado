# Dockerfile
FROM node:18-alpine

# Metadados
LABEL maintainer="seu@email.com"
LABEL description="Servidor MDM Unificado"

# Diretório de trabalho
WORKDIR /usr/src/app

# Copiar package.json e package-lock.json primeiro (cache de layers)
COPY package*.json ./

# Instalar dependências de produção
# --omit=dev pula devDependencies
# --legacy-peer-deps resolve conflitos de versão
RUN npm ci --omit=dev --legacy-peer-deps

# Copiar o resto do código
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs public backups

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicialização
CMD ["node", "server.js"]