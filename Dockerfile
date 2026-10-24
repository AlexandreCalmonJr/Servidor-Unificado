# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS dependencies

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /usr/src/app

# Copiar apenas package files para aproveitar cache de layers
COPY package*.json ./

# Instalar TODAS as dependências (incluindo dev para build)
RUN npm ci --legacy-peer-deps

# ===== STAGE 2: Build =====
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copiar dependências do stage anterior
COPY --from=dependencies /usr/src/app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Remover devDependencies
RUN npm prune --production --legacy-peer-deps

# ===== STAGE 3: Production =====
FROM node:20-alpine AS production

# Metadados
LABEL maintainer="mdm-team@exemplo.com" \
      description="Servidor MDM Unificado" \
      version="2.0.0" \
      org.opencontainers.image.source="https://github.com/seu-usuario/servidor-unificado"

# Instalar apenas dependências de runtime necessárias
RUN apk add --no-cache \
    dumb-init \
    curl

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /usr/src/app

# Copiar node_modules e código do builder
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app .

# Criar diretórios necessários com permissões corretas
RUN mkdir -p logs public backups && \
    chown -R nodejs:nodejs logs public backups

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Usar dumb-init para lidar com sinais corretamente
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicialização
CMD ["node", "backend/server.js"]