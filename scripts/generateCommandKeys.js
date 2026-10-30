// scripts/generateCommandKeys.js
// Gera par de chaves RSA-2048 para assinatura criptográfica de comandos remotos MDM

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateKeys() {
  console.log('\n🔐 Gerando par de chaves RSA-2048 para assinatura de comandos MDM...');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  const keysDir = path.join(__dirname, '..', 'secrets');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const privPath = path.join(keysDir, 'command_private_key.pem');
  const pubPath = path.join(__dirname, '..', 'backend', 'config', 'keys', 'command_public_key.pem');

  fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
  fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });

  console.log('✅ Chaves salvas com sucesso em:');
  console.log(`   - Chave Privada (servidor, NÃO versionar): ${privPath}`);
  console.log(`   - Chave Pública (agentes):                ${pubPath}`);
  console.log('\n💡 O servidor lê a privada de COMMAND_SIGNING_PRIVATE_KEY_FILE');
  console.log('   ou do caminho padrão secrets/command_private_key.pem.\n');
}

if (require.main === module) {
  generateKeys();
}

module.exports = generateKeys;
