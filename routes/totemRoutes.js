const express = require('express');
const { body, validationResult, param } = require('express-validator');
const totemService = require('../services/totemService');
const ipMappingService = require('../services/ipMappingService');
const { asyncHandler, validationErrorHandler, BadRequestError, NotFoundError } = require('../middleware/error');

// ===== FUNÇÃO DE HELPERS =====
function cleanIpAddress(rawIp) {
  if (!rawIp) return null;
  if (rawIp.startsWith('::ffff:')) {
    return rawIp.substring(7);
  }
  if (rawIp.includes(',')) {
    return rawIp.split(',')[0].trim();
  }
  return rawIp.replace(/[\\[\\]]/g, '');
}

// ===== FUNÇÃO PRINCIPAL =====
const totemRoutes = (logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth) => {
  const router = express.Router();

  // ----------------------------------------------
  // ROTAS DO AGENTE (CREATE / UPDATE)
  // ----------------------------------------------

  // [C/U] CREATE / UPDATE (Upsert): Agente envia dados
  router.post('/data',
    modifyApiLimiter,
    [
      body('serialNumber').notEmpty().trim().escape().withMessage('serialNumber é obrigatório'),
      body('hostname').optional().trim().escape(),
      body('printerStatus').optional().trim().escape(),
      body('paperStatus').optional().trim().escape(),
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw validationErrorHandler(errors);
      }

      const data = req.body;
      const rawIp = req.ip || req.connection.remoteAddress;
      data.ip = cleanIpAddress(rawIp);
      
      const device = await totemService.createOrUpdate(data);

      logger.logDeviceOperation('totem_data_received', {
        serialNumber: device.serialNumber,
      }, {
        ip: device.ip,
        location: device.unitRoutes,
      });

      res.status(200).json({
        message: 'Dados de monitoramento recebidos!',
        deviceId: device._id,
        location: device.unitRoutes
      });
    })
  );

  // ----------------------------------------------
  // ROTAS DO PAINEL WEB (READ / UPDATE / DELETE)
  // ----------------------------------------------
  
  // [R] READ (All): Listar todos os totens
  router.get('/totems',
    auth, 
    getApiLimiter,
    asyncHandler(async (req, res) => {
      const devices = await totemService.getAll();
      
      logger.info('Lista de totens retornada', {
        username: req.user.username,
        count: devices.length,
      });
      
      res.status(200).json(devices);
    })
  );

  // [R] READ (Single): Obter um totem específico
  router.get('/totems/:serialNumber',
    auth,
    getApiLimiter,
    [
      param('serialNumber').notEmpty().trim().escape().withMessage('serialNumber é obrigatório')
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw validationErrorHandler(errors);
      }
      
      const { serialNumber } = req.params;
      const totem = await totemService.getBySerialNumber(serialNumber);
      
      if (!totem) {
        throw new NotFoundError(`Totem não encontrado: ${serialNumber}`);
      }

      logger.debug('Totem específico retornado', {
        username: req.user.username,
        serialNumber,
      });
      
      res.status(200).json(totem);
    })
  );

  // [U] UPDATE: Atualizar dados de um totem (Ex: notas do admin)
  router.put('/totems/:serialNumber',
    auth,
    modifyApiLimiter,
    [
      param('serialNumber').notEmpty().trim().escape(),
      body('hostname').optional().trim().escape(),
      body('notes').optional().trim().escape(), // Exemplo de campo que o painel pode editar
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw validationErrorHandler(errors);
      }

      const { serialNumber } = req.params;
      const updateData = req.body; // Contém apenas os campos enviados (ex: { notes: "..." })

      const updatedTotem = await totemService.updateBySerialNumber(serialNumber, updateData);

      if (!updatedTotem) {
        throw new NotFoundError(`Totem não encontrado: ${serialNumber}`);
      }
      
      logger.logDeviceOperation('totem_updated', {
        serialNumber,
      }, {
        by: req.user.username,
        changes: updateData,
      });

      res.status(200).json({
        message: 'Totem atualizado com sucesso',
        totem: updatedTotem,
      });
    })
  );

  // [D] DELETE: Excluir um totem
  router.delete('/totems/:serialNumber',
    auth,
    modifyApiLimiter,
    [
      param('serialNumber').notEmpty().trim().escape()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw validationErrorHandler(errors);
      }

      const { serialNumber } = req.params;
      const deletedTotem = await totemService.deleteBySerialNumber(serialNumber);

      if (!deletedTotem) {
        throw new NotFoundError(`Totem não encontrado: ${serialNumber}`);
      }

      logger.logDeviceOperation('totem_deleted', {
        serialNumber,
        device_name: deletedTotem.hostname,
      }, {
        by: req.user.username,
      });

      res.status(200).json({
        message: `Totem ${serialNumber} excluído com sucesso`,
      });
    })
  );

  return router;
};

module.exports = totemRoutes;