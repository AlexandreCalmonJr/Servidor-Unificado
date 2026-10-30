# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS dependencies

# Instalar ferramentas de build para módulos nativos
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /usr/src/app

# Copiar apenas package files para aproveitar cache de layers
COPY package*.json ./

# Instalar dependências completas
RUN npm ci --legacy-peer-deps

# ===== STAGE 2: Builder =====
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copiar dependências do stage anterior
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY public ./public

# Remover devDependencies deixando apenas runtime
RUN npm prune --production --legacy-peer-deps

# ===== STAGE 3: Production =====
FROM node:20-alpine AS production

LABEL maintainer="mdm-team@exemplo.com" \
      description="Servidor MDM Unificado" \
      version="2.0.0" \
      org.opencontainers.image.source="https://github.com/AlexandreCalmonJr/Servidor-Unificado"

# Instalar apenas dependências de runtime necessárias
RUN apk add --no-cache \
    dumb-init \
    curl

# Criar grupo e usuário não-root dedicados
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /usr/src/app

# Copiar apenas os módulos de produção e código essencial
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/frontend ./frontend
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/public ./public

# Criar diretórios de escrita com permissão restrita ao usuário nodejs
RUN mkdir -p logs backups && \
    chown -R nodejs:nodejs logs backups

# Trocar para usuário não-root
USER nodejs

# Expor porta da aplicação
EXPOSE 3000

# Healthcheck embutido
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Entrypoint com dumb-init para propagação correta de sinais POSIX (SIGTERM, SIGINT)
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicialização
CMD ["node", "backend/server.js"]