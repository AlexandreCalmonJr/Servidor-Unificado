const crypto = require('crypto');
const secrets = require('../config/secrets');
const ManagedAsset = require('../models/ManagedAsset');

function timingSafeTokenEqual(receivedToken, expectedToken) {
  const received = Buffer.from(String(receivedToken || ''), 'utf8');
  const expected = Buffer.from(String(expectedToken || ''), 'utf8');
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

/**
 * Middleware de Autenticação de Dispositivos (P1 - Dual-Mode)
 * 
 * Suporta:
 * 1. Tokens individuais de dispositivo (prefixo dev_ + hash SHA-256 no ManagedAsset)
 * 2. Token global legado (AUTH_TOKEN com fallback secrets) durante período de transição
 * 3. Detecção e controle de quarentena / revogação por dispositivo
 */
const deviceAuth = async (req, res, next) => {
  const logger = req.logger || console;

  try {
    let receivedToken = null;

    if (req.headers.auth_token) {
      receivedToken = String(req.headers.auth_token).trim();
      logger.debug('Token de dispositivo recebido via AUTH_TOKEN header');
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      receivedToken = req.headers.authorization.substring(7).trim();
      logger.debug('Token de dispositivo recebido via Authorization Bearer');
    }

    if (!receivedToken) {
      logger.warn(`Dispositivo tentou acessar sem token - IP: ${req.ip} - Path: ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Token de autenticacao nao fornecido',
      });
    }

    // ── 1. Fluxo de Token Individual do Dispositivo (dev_...) ───────────
    if (receivedToken.startsWith('dev_')) {
      const tokenHash = crypto.createHash('sha256').update(receivedToken).digest('hex');
      const asset = await ManagedAsset.findOne({
        device_token_hash: tokenHash,
        is_deleted: { $ne: true },
      });

      if (!asset) {
        logger.warn(`Token individual desconhecido ou inexistente de ${req.ip} - Prefix: ${receivedToken.substring(0, 8)}...`);
        return res.status(401).json({
          success: false,
          code: 'INVALID_DEVICE_TOKEN',
          message: 'Token de dispositivo inválido ou não cadastrado',
        });
      }

      // Dispositivo revogado: bloqueio total
      if (asset.token_status === 'revoked') {
        logger.warn(`Tentativa de acesso por dispositivo REVOGADO: ${asset.serial_number} (${asset._id}) - IP: ${req.ip}`);
        return res.status(401).json({
          success: false,
          code: 'DEVICE_TOKEN_REVOKED',
          message: 'Token de dispositivo revogado. Re-provisionamento necessário.',
        });
      }

      const isQuarantined = asset.token_status === 'quarantine';

      req.device = {
        authenticated: true,
        id: asset._id.toString(),
        serial_number: asset.serial_number,
        module_id: asset.module_id?.toString(),
        kind: 'individual',
        isLegacy: false,
        isQuarantined,
        quarantine_reason: asset.quarantine_reason,
        asset,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      };

      if (isQuarantined) {
        logger.warn(`Dispositivo em QUARENTENA operando em modo restrito: ${asset.serial_number} - IP: ${req.ip}`);
      } else {
        logger.debug(`Autenticação individual de dispositivo bem-sucedida: ${asset.serial_number} - IP: ${req.ip}`);
      }

      return next();
    }

    // ── 2. Fluxo Legado (Dual-Mode com AUTH_TOKEN global) ──────────────
    const expectedToken = secrets.AUTH_TOKEN || process.env.AUTH_TOKEN;

    if (!expectedToken) {
      logger.error('AUTH_TOKEN nao configurado no ambiente');
      return res.status(500).json({
        success: false,
        message: 'Configuracao de autenticacao ausente no servidor',
      });
    }

    if (!timingSafeTokenEqual(receivedToken, expectedToken)) {
      logger.warn(`Token invalido recebido de ${req.ip} - Token: ${receivedToken.substring(0, 4)}***`);
      return res.status(401).json({
        success: false,
        message: 'Token de autenticacao invalido',
      });
    }

    req.device = {
      authenticated: true,
      id: 'legacy',
      serial_number: req.body?.serial_number || req.query?.serialNumber || 'legacy',
      kind: 'legacy',
      isLegacy: true,
      isQuarantined: false,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    logger.debug(`Autenticacao de dispositivo bem-sucedida (modo legado) - IP: ${req.ip}`);
    return next();
  } catch (error) {
    logger.error(`Erro na autenticacao de dispositivo - IP: ${req.ip} - Erro: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor durante autenticacao',
    });
  }
};

module.exports = deviceAuth;
