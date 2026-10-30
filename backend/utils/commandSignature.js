const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function normalizeForSignature(value) {
  if (value instanceof Map) {
    return normalizeForSignature(Object.fromEntries(value));
  }
  if (Array.isArray(value)) {
    return value.map(normalizeForSignature);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = normalizeForSignature(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function canonicalizeCommand(command) {
  const payload = {
    id: String(command.id || command._id || ''),
    commandType: String(command.commandType || command.command_type || ''),
    command: String(command.command || ''),
    parameters: normalizeForSignature(command.parameters || {}),
    requiresElevation: Boolean(command.requiresElevation ?? command.requires_elevation ?? false),
    timeout: Number(command.timeout || 0),
  };
  return JSON.stringify(normalizeForSignature(payload));
}

function getPrivateKey() {
  const inline = (process.env.COMMAND_SIGNING_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  if (inline) return inline;

  const candidates = [
    process.env.COMMAND_SIGNING_PRIVATE_KEY_FILE,
    path.join(__dirname, '..', '..', 'secrets', 'command_private_key.pem'),
    '/run/secrets/command_private_key.pem',
  ].filter(Boolean);

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (error) {
      // Chave opcional: ausencia apenas desabilita assinatura.
    }
  }

  return '';
}

function signCommand(command) {
  const privateKey = getPrivateKey();
  if (!privateKey) return null;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(canonicalizeCommand(command));
  signer.end();

  return {
    alg: 'RS256',
    value: signer.sign(privateKey, 'base64'),
  };
}

function verifyCommand(command, signature, publicKey) {
  if (!signature || !signature.value || !publicKey) return false;
  try {
    const key = String(publicKey).replace(/\\n/g, '\n').trim();
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(canonicalizeCommand(command));
    verifier.end();
    return verifier.verify(key, signature.value, 'base64');
  } catch (error) {
    return false;
  }
}

module.exports = {
  canonicalizeCommand,
  signCommand,
  verifyCommand,
};

