// backend/config/secrets.js
// Leitor de segredos com suporte a Docker secrets (/run/secrets/*) e fallback para .env
// ===================================================================

const fs = require('fs');
const path = require('path');

const DOCKER_SECRETS_DIR = '/run/secrets';

/**
 * Lê um segredo do Docker secrets ou do .env (via process.env).
 * 
 * Ordem de prioridade:
 * 1. Docker secret file (/run/secrets/<name>)
 * 2. Environment variable (process.env[envKey])
 * 3. defaultValue (se fornecido)
 * 
 * @param {string} name - Nome do Docker secret (ex: 'auth_token')
 * @param {string} envKey - Nome da variável de ambiente (ex: 'AUTH_TOKEN')
 * @param {string} [defaultValue] - Valor padrão se nenhum for encontrado
 * @returns {string|undefined}
 */
function readSecret(name, envKey, defaultValue) {
  // 1. Docker secret
  const secretPath = path.join(DOCKER_SECRETS_DIR, name);
  try {
    const value = fs.readFileSync(secretPath, 'utf8').trim();
    if (value) return value;
  } catch {
    // Arquivo não existe ou não acessível — fallback para env
  }

  // 2. Environment variable
  if (process.env[envKey]) return process.env[envKey];

  // 3. Default
  return defaultValue;
}

/**
 * Lê um arquivo de chave (PEM/key) com suporte a Docker secrets.
 * 
 * @param {string} envKey - Variável de ambiente com o caminho do arquivo
 * @param {string} dockerSecretName - Nome alternativo em Docker secrets
 * @returns {string|null}
 */
function readKeyFile(envKey, dockerSecretName) {
  // 1. Docker secret
  if (dockerSecretName) {
    const secretPath = path.join(DOCKER_SECRETS_DIR, dockerSecretName);
    try {
      return fs.readFileSync(secretPath, 'utf8');
    } catch {
      // Não disponível
    }
  }

  // 2. Caminho do .env
  const filePath = process.env[envKey];
  if (!filePath) return null;

  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, '..', '..', filePath);

  try {
    return fs.readFileSync(resolved, 'utf8');
  } catch {
    return null;
  }
}

// Exporta valores já resolvidos (singleton, lidos uma vez no boot)
const secrets = {
  AUTH_TOKEN: readSecret('auth_token', 'AUTH_TOKEN'),
  JWT_SECRET: readSecret('jwt_secret', 'JWT_SECRET'),
  MONGO_URI: readSecret('mongo_uri', 'MONGO_URI', 'mongodb://localhost:27017/mdm'),
  REDIS_URL: readSecret('redis_url', 'REDIS_URL', 'redis://localhost:6379'),

  COMMAND_PRIVATE_KEY: readKeyFile('COMMAND_SIGNING_PRIVATE_KEY_FILE', 'command_private_key'),

  // Helpers
  readSecret,
  readKeyFile,
};

module.exports = secrets;
