const crypto = require('crypto');

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
  return (process.env.COMMAND_SIGNING_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
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

module.exports = {
  canonicalizeCommand,
  signCommand,
};
