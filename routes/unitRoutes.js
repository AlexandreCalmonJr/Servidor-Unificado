const express = require('express');
const UnitMapping = require('../models/UnitMapping');
const { ipToInt, isValidIPv4 } = require('../utils/helpers');
const authorize = require('../middleware/role');

const unitRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Criar mapeamento de unidade (apenas admin)
  router.post('/', auth, authorize('admin'), modifyApiLimiter, async (req, res) => {
    try {
      const { name, ip_range_start, ip_range_end } = req.body;
      if (!name || !ip_range_start || !ip_range_end) {
        return res.status(400).json({ 
          success: false,
          message: 'name, ip_range_start e ip_range_end são obrigatórios' 
        });
      }
      if (!isValidIPv4(ip_range_start) || !isValidIPv4(ip_range_end)) {
        return res.status(400).json({ 
          success: false,
          message: 'ip_range_start e ip_range_end devem ser IPs válidos no formato xxx.xxx.xxx.xxx' 
        });
      }
      const startInt = ipToInt(ip_range_start);
      const endInt = ipToInt(ip_range_end);
      if (startInt > endInt) {
        return res.status(400).json({ 
          success: false,
          message: 'ip_range_start deve ser menor ou igual a ip_range_end' 
        });
      }
      const unit = new UnitMapping({ name, ip_range_start, ip_range_end });
      await unit.save();
      logger.info(`Unidade criada por ${req.user.username}: ${name}`);
      res.status(201).json({
        success: true,
        message: 'Unidade criada com sucesso',
        unit
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ 
          success: false,
          message: 'Unidade com este nome já existe' 
        });
      }
      logger.error(`Erro ao criar unidade: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor', 
        details: err.message 
      });
    }
  });

  // Listar unidades (todos os usuários autenticados podem ver)
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const units = await UnitMapping.find().lean();
      logger.info(`Lista de unidades solicitada por ${req.user.username}: ${units.length} unidades`);
      res.status(200).json({
        success: true,
        message: 'Unidades listadas com sucesso',
        units,
        total: units.length
      });
    } catch (err) {
      logger.error(`Erro ao obter unidades: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Atualizar unidade (apenas admin)
  router.put('/:name', auth, authorize('admin'), modifyApiLimiter, async (req, res) => {
    try {
      const { name, ip_range_start, ip_range_end } = req.body;
      
      if (ip_range_start && !isValidIPv4(ip_range_start)) {
        return res.status(400).json({ 
          success: false,
          message: 'ip_range_start deve ser um IP válido' 
        });
      }
      if (ip_range_end && !isValidIPv4(ip_range_end)) {
        return res.status(400).json({ 
          success: false,
          message: 'ip_range_end deve ser um IP válido' 
        });
      }
      
      const unit = await UnitMapping.findOneAndUpdate(
        { name: req.params.name },
        { name, ip_range_start, ip_range_end },
        { new: true }
      );
      if (!unit) {
        return res.status(404).json({ 
          success: false,
          message: 'Unidade não encontrada' 
        });
      }
      logger.info(`Unidade atualizada por ${req.user.username}: ${name}`);
      res.status(200).json({
        success: true,
        message: 'Unidade atualizada com sucesso',
        unit
      });
    } catch (err) {
      logger.error(`Erro ao atualizar unidade: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Excluir unidade (apenas admin)
  router.delete('/:name', auth, authorize('admin'), modifyApiLimiter, async (req, res) => {
    try {
      const unit = await UnitMapping.findOneAndDelete({ name: req.params.name });
      if (!unit) {
        return res.status(404).json({ 
          success: false,
          message: 'Unidade não encontrada' 
        });
      }
      logger.info(`Unidade excluída por ${req.user.username}: ${req.params.name}`);
      res.status(200).json({ 
        success: true,
        message: `Unidade ${req.params.name} excluída com sucesso` 
      });
    } catch (err) {
      logger.error(`Erro ao excluir unidade: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor' 
      });
    }
  });

  return router;
};

module.exports = unitRoutes;