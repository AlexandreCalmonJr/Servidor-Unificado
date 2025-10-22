const express = require('express');
const { body, validationResult } = require('express-validator');
const BssidMapping = require('../models/BssidMapping');

const bssidRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Criar mapeamento de BSSID
  router.post('/', auth, modifyApiLimiter, [
    body('mac_address_radio')
      .notEmpty()
      .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
      .withMessage('mac_address_radio deve ser um MAC válido'),
    body('sector').notEmpty().withMessage('sector é obrigatório'),
    body('floor').notEmpty().withMessage('floor é obrigatório'),
    // AJUSTE: Validação opcional para o novo campo
    body('unitName').optional().trim(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erros de validação: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      // AJUSTE: Extrai unitName do body
      const { mac_address_radio, sector, floor, unitName } = req.body;
      const mapping = new BssidMapping({ 
        mac_address_radio, 
        sector, 
        floor, 
        // AJUSTE: Salva o novo campo
        unitName: unitName || '' 
      });
      await mapping.save();
      logger.info(`Mapeamento de BSSID criado: ${mac_address_radio}`);
      res.status(201).json(mapping);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'BSSID já mapeado' });
      }
      logger.error(`Erro ao criar mapeamento de BSSID: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Listar mapeamentos de BSSID (com tratamento reforçado de nulls)
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const mappings = await BssidMapping.find().lean();
      // Garantir que todos os campos sejam strings, mesmo se null ou undefined
      const safeMappings = mappings.map(mapping => ({
        _id: mapping._id,
        mac_address_radio: mapping.mac_address_radio || '00:00:00:00:00:00',
        sector: mapping.sector || 'Desconhecido',
        floor: mapping.floor || 'Desconhecido',
        // AJUSTE: Envia unitName (com valor padrão)
        unitName: mapping.unitName || ''
      }));
      logger.info(`JSON retornado para /api/bssid-mappings: ${JSON.stringify(safeMappings)}`);
      res.status(200).json(safeMappings);
    } catch (err) {
      logger.error(`Erro ao obter mapeamentos de BSSID: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Listar mapeamentos de BSSID POR UNIDADE
  router.get('/by-unit/:unitName', auth, getApiLimiter, async (req, res) => {
    try {
      const { unitName } = req.params;
      if (!unitName) {
        return res.status(400).json({ error: 'Nome da unidade é obrigatório' });
      }

      const mappings = await BssidMapping.find({ unitName: unitName }).lean();
      
      // Mesma lógica de segurança da rota GET /
      const safeMappings = mappings.map(mapping => ({
        _id: mapping._id,
        mac_address_radio: mapping.mac_address_radio || '00:00:00:00:00:00',
        sector: mapping.sector || 'Desconhecido',
        floor: mapping.floor || 'Desconhecido',
        unitName: mapping.unitName || ''
      }));

      logger.info(`JSON retornado para /api/bssid-mappings/by-unit/${unitName}`);
      res.status(200).json(safeMappings);

    } catch (err) {
      logger.error(`Erro ao obter mapeamentos por unidade: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Atualizar mapeamento de BSSID
  router.put('/:mac_address_radio', auth, modifyApiLimiter, async (req, res) => {
    try {
      // AJUSTE: Extrai unitName para atualização
      const { sector, floor, unitName } = req.body;
      const mapping = await BssidMapping.findOneAndUpdate(
        { mac_address_radio: req.params.mac_address_radio },
        // AJUSTE: Atualiza unitName (se fornecido)
        { sector, floor, unitName },
        { new: true }
      );
      if (!mapping) {
        return res.status(404).json({ error: 'Mapeamento de BSSID não encontrado' });
      }
      logger.info(`Mapeamento de BSSID atualizado: ${req.params.mac_address_radio}`);
      res.status(200).json(mapping);
    } catch (err) {
      logger.error(`Erro ao atualizar mapeamento de BSSID: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Excluir mapeamento de BSSID
  router.delete('/:mac_address_radio', auth, modifyApiLimiter, async (req, res) => {
    try {
      const mapping = await BssidMapping.findOneAndDelete({ mac_address_radio: req.params.mac_address_radio });
      if (!mapping) {
        return res.status(404).json({ error: 'Mapeamento de BSSID não encontrado' });
      }
      logger.info(`Mapeamento de BSSID excluído: ${req.params.mac_address_radio}`);
      res.status(200).json({ message: `Mapeamento de BSSID ${req.params.mac_address_radio} excluído com sucesso` });
    } catch (err) {
      logger.error(`Erro ao excluir mapeamento de BSSID: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  router.get('/by-unit/:unitName', auth, getApiLimiter, async (req, res) => {
    try {
      const { unitName } = req.params;
      if (!unitName) {
        return res.status(400).json({ error: 'Nome da unidade é obrigatório' });
      }

      // Busca no DB filtrando pelo 'unitName'
      const mappings = await BssidMapping.find({ unitName: unitName }).lean();
      
      // Mesma lógica de segurança da rota GET /
      const safeMappings = mappings.map(mapping => ({
        _id: mapping._id,
        mac_address_radio: mapping.mac_address_radio || '00:00:00:00:00:00',
        sector: mapping.sector || 'Desconhecido',
        floor: mapping.floor || 'Desconhecido',
        unitName: mapping.unitName || ''
      }));

      logger.info(`BSSIDs por unidade solicitados por ${req.user.username} para ${unitName}: ${safeMappings.length} encontrados`);
      // Retorna diretamente o array de mapeamentos
      res.status(200).json(safeMappings);

    } catch (err) {
      logger.error(`Erro ao obter mapeamentos por unidade: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });


  return router;
};

module.exports = bssidRoutes;