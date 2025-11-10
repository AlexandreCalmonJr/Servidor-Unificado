# Dockerfile

# ===== Estágio 1: Builder =====
# Usa uma imagem Node.js para instalar as dependências
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Copia os arquivos de definição de pacotes
COPY package.json package-lock.json* ./

# Instala as dependências (usar 'npm ci' é mais rápido e seguro se você tiver package-lock.json)
RUN npm ci

# ===== Estágio 2: Final =====
# Usa uma imagem 'slim' para produção
FROM node:18-alpine
WORKDIR /usr/src/app

# Copia as dependências já instaladas do estágio 'builder'
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copia todo o código-fonte da aplicação
COPY . .

# [cite_start]Expõe a porta que seu servidor usa (do seu .env, o padrão é 3000) [cite: 1]
EXPOSE 3000

# Define o comando para iniciar o servidor
CMD [ "node", "server.js" ]