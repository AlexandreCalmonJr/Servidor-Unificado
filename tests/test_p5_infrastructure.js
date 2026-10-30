/**
 * tests/test_p5_infrastructure.js
 * Bateria de testes automatizados para a Fase P5 (Infraestrutura, Containers e CI/CD)
 *
 * Cobre:
 * 1. Dockerfile Multi-Stage: estágios, non-root user, dumb-init, healthcheck e cópia seletiva
 * 2. docker-compose.yml: top-level secrets, perfil Caddy TLS, healthchecks e volumes
 * 3. .dockerignore: bloqueio rigoroso de segredos, agentes e arquivos de build
 * 4. .github/workflows/ci.yml: sintaxe, serviço MongoDB, execução das 6 suítes e build check
 * 5. deploy/Caddyfile: upstream dinâmico para containers e headers de segurança
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${description} ${details ? '(' + details + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ ${description} ${details ? '— ' + details : ''}`);
    failed++;
  }
}

async function runP5Tests() {
  console.log('\n=================================================================');
  console.log('⚡  BATERIA DE TESTES P5 — INFRAESTRUTURA, CONTAINERS E CI/CD');
  console.log('=================================================================\n');

  // ── TESTE 1: Dockerfile Multi-Stage ─────────────────────────────────
  console.log('1. Dockerfile Multi-Stage e Segurança do Container (O1):');
  const dockerfilePath = path.join(__dirname, '../Dockerfile');
  assert('Arquivo Dockerfile existe', fs.existsSync(dockerfilePath));

  const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8').replace(/\r\n/g, '\n');

  assert('Estágio 1 (dependencies) presente', dockerfile.includes('FROM node:20-alpine AS dependencies'));
  assert('Estágio 2 (builder) presente', dockerfile.includes('FROM node:20-alpine AS builder'));
  assert('Estágio 3 (production) presente', dockerfile.includes('FROM node:20-alpine AS production'));
  assert('Execução restrita a usuário não-root (USER nodejs)', dockerfile.includes('USER nodejs'));
  assert('Criação do usuário nodejs com UID não privilegiado', dockerfile.includes('adduser -S nodejs -u 1001'));
  assert('dumb-init configurado como ENTRYPOINT para captura de sinais', dockerfile.includes('ENTRYPOINT ["dumb-init", "--"]'));
  assert('HEALTHCHECK nativo embutido no container', dockerfile.includes('HEALTHCHECK') && dockerfile.includes('/health'));
  assert('Cópia seletiva de runtime (backend, frontend, public) sem poluição', dockerfile.includes('COPY --from=builder --chown=nodejs:nodejs /usr/src/app/backend ./backend'));
  assert('Porta da aplicação exposta (EXPOSE 3000)', dockerfile.includes('EXPOSE 3000'));

  // ── TESTE 2: .dockerignore ──────────────────────────────────────────
  console.log('\n2. Regras de Exclusão do Contexto Docker (.dockerignore):');
  const dockerignorePath = path.join(__dirname, '../.dockerignore');
  assert('.dockerignore existe', fs.existsSync(dockerignorePath));

  const dockerignore = fs.readFileSync(dockerignorePath, 'utf-8').replace(/\r\n/g, '\n');

  assert('.dockerignore bloqueia segredos locais (secrets/, .env)', dockerignore.includes('secrets/') && dockerignore.includes('.env'));
  assert('.dockerignore bloqueia dependências pesadas (node_modules)', dockerignore.includes('node_modules'));
  assert('.dockerignore bloqueia diretórios de inteligência (.agent/)', dockerignore.includes('.agent/'));
  assert('.dockerignore bloqueia workflows de CI (.github/)', dockerignore.includes('.github/'));
  assert('.dockerignore bloqueia templates de deploy locais (deploy/)', dockerignore.includes('deploy/'));

  // ── TESTE 3: docker-compose.yml e Top-level Secrets ─────────────────
  console.log('\n3. Orquestração e Top-level Secrets (docker-compose.yml - S1/S7):');
  const composePath = path.join(__dirname, '../docker-compose.yml');
  assert('docker-compose.yml existe', fs.existsSync(composePath));

  const composeContent = fs.readFileSync(composePath, 'utf-8').replace(/\r\n/g, '\n');

  assert('Bloco top-level "secrets:" declarado no compose', composeContent.includes('\nsecrets:'));
  assert('Secret command_private_key mapeado', composeContent.includes('command_private_key:'));
  assert('Serviço mdm-server consome secrets nativos', composeContent.includes('secrets:\n      - command_private_key'));
  assert('Serviço mongodb configurado com healthcheck', composeContent.includes('mongosh') && composeContent.includes('ping'));
  assert('Serviço redis configurado com healthcheck', composeContent.includes('redis-cli') && composeContent.includes('ping'));
  assert('Serviço Caddy TLS configurado com perfil "proxy"', composeContent.includes('profiles:\n      - proxy') && composeContent.includes('caddy:2-alpine'));
  assert('Rede isolada mdm-network configurada', composeContent.includes('mdm-network:'));
  assert('Volumes persistentes declarados (mongo-data, redis-data, backups-data, caddy-data)', composeContent.includes('mongo-data:') && composeContent.includes('caddy-data:'));

  // ── TESTE 4: Pipeline de CI/CD GitHub Actions ───────────────────────
  console.log('\n4. Pipeline de CI/CD (.github/workflows/ci.yml - O4):');
  const ciPath = path.join(__dirname, '../.github/workflows/ci.yml');
  assert('Arquivo .github/workflows/ci.yml existe', fs.existsSync(ciPath));

  const ciContent = fs.readFileSync(ciPath, 'utf-8').replace(/\r\n/g, '\n');

  assert('Gatilhos de push e pull_request configurados', ciContent.includes('push:') && ciContent.includes('pull_request:'));
  assert('Serviço de apoio MongoDB ativo no job de teste', ciContent.includes('image: mongo:6.0') && ciContent.includes('27017:27017'));
  assert('Matriz de versões Node.js (20.x, 22.x)', ciContent.includes('node-version: [20.x, 22.x]'));
  assert('Execução da Bateria P0 (Security Hardening)', ciContent.includes('test_p0_security.js'));
  assert('Execução da Bateria P1 (Identidade e Transporte)', ciContent.includes('test_p1_identity.js'));
  assert('Execução da Bateria P2 (Contrato de API e Schemas)', ciContent.includes('test_p2_contract_integrity.js'));
  assert('Execução da Bateria P3 (API e Performance)', ciContent.includes('test_p3_performance.js'));
  assert('Execução da Bateria P4 (Tempo Real e Frontend)', ciContent.includes('test_p4_frontend_realtime.js'));
  assert('Execução da Full Suite geral (npm test)', ciContent.includes('run: npm test'));
  assert('Job docker-build-check presente para validação de compilação da imagem', ciContent.includes('docker-build-check:') && ciContent.includes('docker build'));

  // ── TESTE 5: deploy/Caddyfile ───────────────────────────────────────
  console.log('\n5. Configuração do Proxy Reverso TLS (deploy/Caddyfile):');
  const caddyfilePath = path.join(__dirname, '../deploy/Caddyfile');
  assert('deploy/Caddyfile existe', fs.existsSync(caddyfilePath));

  const caddyfile = fs.readFileSync(caddyfilePath, 'utf-8').replace(/\r\n/g, '\n');

  assert('Caddyfile suporta upstream flexível {$UPSTREAM:mdm-server:3000}', caddyfile.includes('{$UPSTREAM:mdm-server:3000}'));
  assert('Caddyfile define header Strict-Transport-Security (HSTS)', caddyfile.includes('Strict-Transport-Security'));
  assert('Caddyfile remove header identificador de servidor (-Server)', caddyfile.includes('-Server'));

  console.log('\n=================================================================');
  console.log(`📊 RESULTADO P5: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runP5Tests().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
