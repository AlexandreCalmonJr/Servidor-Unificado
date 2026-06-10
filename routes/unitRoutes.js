const unitRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const express = require('express');
  const router = express.Router();
  const UnitMapping = require('../models/UnitMapping');
  const { ipToInt, isValidIPv4 } = require('../utils/helpers');
  const authorize = require('../middleware/role');

  // ✅ POST /api/units - Criar Unidade
  router.post('/', auth, authorize('admin'), modifyApiLimiter, async (req, res) => {
    try {
      const { name, ip_ranges } = req.body;
      
      if (!name || !ip_ranges || !Array.isArray(ip_ranges) || ip_ranges.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'name e ip_ranges (com pelo menos uma faixa) são obrigatórios' 
        });
      }

      // Valida cada faixa
      for (const range of ip_ranges) {
        const { start, end } = range;
        if (!start || !end) {
          return res.status(400).json({ 
            success: false,
            message: 'Cada faixa deve conter start e end' 
          });
        }
        if (!isValidIPv4(start) || !isValidIPv4(end)) {
          return res.status(400).json({ 
            success: false,
            message: `IPs inválidos: ${start} - ${end}` 
          });
        }
        if (ipToInt(start) > ipToInt(end)) {
          return res.status(400).json({ 
            success: false,
            message: `IP inicial deve ser menor que final: ${start} - ${end}` 
          });
        }
      }

      const unit = new UnitMapping({ name, ip_ranges });
      await unit.save();
      logger.info(`✅ Unidade criada: ${name} com ${ip_ranges.length} faixa(s)`);
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
      logger.error(`❌ Erro ao criar unidade: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno'
      });
    }
  });

  // ✅ GET /api/units - Listar Unidades
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const units = await UnitMapping.find().lean();
      logger.info(`🏢 Unidades listadas: ${units.length} unidade(s)`);
      res.status(200).json({
        success: true,
        units,
        total: units.length
      });
    } catch (err) {
      logger.error(`❌ Erro ao listar unidades: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno' 
      });
    }
  });

  // ✅ PUT /api/units/:name - Atualizar Unidade
  router.put('/:name', auth, authorize('admin'), modifyApiLimiter, async (req, res) => {
    try {
      const { name, ip_ranges } = req.body;
      
      const updateData = {};
      if (name) updateData.name = name;
      
      if (ip_ranges) {
        if (!Array.isArray(ip_ranges) || ip_ranges.length === 0) {
          return res.status(400).json({ 
            success: false,
            message: 'ip_ranges deve ter pelo menos uma faixa' 
          });
        }
        
        for (const range of ip_ranges) {
          const { start, end } = range;
          if (!start || !end || !isValidIPv4(start) || !isValidIPv4(end)) {
            return res.status(400).json({ 
              success: false,
              message: `Faixa inválida: ${start} - ${end}` 
            });
          }
          if (ipToInt(start) > ipToInt(end)) {
            return res.status(400).json({ 
              success: false,
              message: `IP inicial > final: ${start} - ${end}` 
            });
          }
        }
        updateData.ip_ranges = ip_ranges;
      }

      const unit = await UnitMapping.findOneAndUpdate(
        { name: req.params.name },
        updateData,
        { new: true }
      );

      if (!unit) {
        return res.status(404).json({ 
          success: false,
          message: 'Unidade não encontrada' 
        });
      }
      logger.info(`✏️ Unidade atualizada: ${unit.name}`);
      res.status(200).json({
        success: true,
        message: 'Unidade atualizada',
        unit
      });
    } catch (err) {
      logger.error(`❌ Erro ao atualizar unidade: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno' 
      });
    }
  });

  // ✅ DELETE /api/units/:name - Deletar Unidade
  router.delete('/:name', auth, authorize('admin'), modifyApiLimiter, async (req, res) => {
    try {
      const unit = await UnitMapping.findOneAndDelete({ name: req.params.name });
      if (!unit) {
        return res.status(404).json({ 
          success: false,
          message: 'Unidade não encontrada' 
        });
      }
      logger.info(`🗑️ Unidade excluída: ${req.params.name}`);
      res.status(200).json({ 
        success: true,
        message: `Unidade ${req.params.name} excluída` 
      });
    } catch (err) {
      logger.error(`❌ Erro ao excluir unidade: ${err.message}`);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno' 
      });
    }
  });

  return router;
};

module.exports = unitRoutes;
