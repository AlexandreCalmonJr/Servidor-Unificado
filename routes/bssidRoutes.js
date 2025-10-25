const express = require('express');
const { body, validationResult } = require('express-validator');
const BssidMapping = require('../models/BssidMapping');

const bssidRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // ✅ POST /api/bssid-mappings - Criar BSSID
  router.post('/', auth, modifyApiLimiter, [
    body('mac_address_radio')
      .notEmpty()
      .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
      .withMessage('mac_address_radio deve ser um MAC válido'),
    body('sector').notEmpty().withMessage('sector é obrigatório'),
    body('floor').notEmpty().withMessage('floor é obrigatório'),
    body('unitName').optional().trim(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erros de validação: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { mac_address_radio, sector, floor, unitName } = req.body;
      const mapping = new BssidMapping({ 
        mac_address_radio, 
        sector, 
        floor, 
        unitName: unitName || '' 
      });
      await mapping.save();
      logger.info(`✅ BSSID criado: ${mac_address_radio} - ${sector}/${floor} (${unitName || 'Sem unidade'})`);
      res.status(201).json(mapping);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'BSSID já mapeado' });
      }
      logger.error(`❌ Erro ao criar BSSID: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ✅ GET /api/bssid-mappings - Listar TODOS os BSSIDs
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const mappings = await BssidMapping.find().lean();
      const safeMappings = mappings.map(mapping => ({
        _id: mapping._id,
        mac_address_radio: mapping.mac_address_radio || '00:00:00:00:00:00',
        sector: mapping.sector || 'Desconhecido',
        floor: mapping.floor || 'Desconhecido',
        unitName: mapping.unitName || ''
      }));
      logger.info(`📡 BSSIDs listados: ${safeMappings.length} mapeamentos`);
      res.status(200).json(safeMappings);
    } catch (err) {
      logger.error(`❌ Erro ao obter BSSIDs: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ✅ GET /api/bssid-mappings/by-unit/:unitName - Filtrar por Unidade
  router.get('/by-unit/:unitName', auth, getApiLimiter, async (req, res) => {
    try {
      const { unitName } = req.params;
      if (!unitName) {
        return res.status(400).json({ error: 'Nome da unidade é obrigatório' });
      }

      const mappings = await BssidMapping.find({ unitName: unitName }).lean();
      
      const safeMappings = mappings.map(mapping => ({
        _id: mapping._id,
        mac_address_radio: mapping.mac_address_radio || '00:00:00:00:00:00',
        sector: mapping.sector || 'Desconhecido',
        floor: mapping.floor || 'Desconhecido',
        unitName: mapping.unitName || ''
      }));

      logger.info(`🔍 BSSIDs por unidade '${unitName}': ${safeMappings.length} encontrados`);
      res.status(200).json(safeMappings);

    } catch (err) {
      logger.error(`❌ Erro ao filtrar BSSIDs por unidade: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ✅ PUT /api/bssid-mappings/:mac_address_radio - Atualizar BSSID
  router.put('/:mac_address_radio', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { sector, floor, unitName } = req.body;
      const mapping = await BssidMapping.findOneAndUpdate(
        { mac_address_radio: req.params.mac_address_radio },
        { sector, floor, unitName: unitName || '' },
        { new: true }
      );
      if (!mapping) {
        return res.status(404).json({ error: 'BSSID não encontrado' });
      }
      logger.info(`✏️ BSSID atualizado: ${req.params.mac_address_radio}`);
      res.status(200).json(mapping);
    } catch (err) {
      logger.error(`❌ Erro ao atualizar BSSID: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ✅ DELETE /api/bssid-mappings/:mac_address_radio - Deletar BSSID
  router.delete('/:mac_address_radio', auth, modifyApiLimiter, async (req, res) => {
    try {
      const mapping = await BssidMapping.findOneAndDelete({ 
        mac_address_radio: req.params.mac_address_radio 
      });
      if (!mapping) {
        return res.status(404).json({ error: 'BSSID não encontrado' });
      }
      logger.info(`🗑️ BSSID excluído: ${req.params.mac_address_radio}`);
      res.status(200).json({ 
        message: `BSSID ${req.params.mac_address_radio} excluído com sucesso` 
      });
    } catch (err) {
      logger.error(`❌ Erro ao excluir BSSID: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  return router;
};

module.exports = bssidRoutes;