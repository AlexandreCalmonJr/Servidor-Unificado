const express = require('express');
const UnitMapping = require('../models/UnitMapping');
const { ipToInt, isValidIPv4 } = require('../utils/helpers');
const authorize = require('../middleware/role');

const unitRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Criar mapeamento de unidade (apenas admin)
  router.post('/', auth, authorize('admin'), modifyApiLimiter, async (req, res) => {
    try {
      // AJUSTE: 'ip_ranges' agora é esperado como um array
      const { name, ip_ranges } = req.body;
      
      if (!name || !ip_ranges || !Array.isArray(ip_ranges) || ip_ranges.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'name e um array ip_ranges (com pelo menos uma faixa) são obrigatórios' 
        });
      }

      // Valida cada faixa de IP no array
      for (const range of ip_ranges) {
        const { start, end } = range;
        if (!start || !end) {
          return res.status(400).json({ 
            success: false,
            message: 'Cada faixa em ip_ranges deve conter start e end' 
          });
        }
        if (!isValidIPv4(start) || !isValidIPv4(end)) {
          return res.status(400).json({ 
            success: false,
            message: `IPs inválidos na faixa: ${start} - ${end}. Formato xxx.xxx.xxx.xxx esperado.` 
          });
        }
        const startInt = ipToInt(start);
        const endInt = ipToInt(end);
        if (startInt > endInt) {
          return res.status(400).json({ 
            success: false,
            message: `IP inicial deve ser menor que o IP final na faixa: ${start} - ${end}` 
          });
        }
      }

      // AJUSTE: Salva o objeto com o array
      const unit = new UnitMapping({ name, ip_ranges });
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
  // (Esta rota não precisa de mudanças, ela retorna o que estiver no DB)
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const units = await UnitMapping.find().lean();
      logger.info(`Lista de unidades solicitada por ${req.user.username}: ${units.length} unidades`);
      res.status(200).json({
        success: true,
        message: 'Unidades listadas com sucesso',
        units, // Agora 'units' conterá o array 'ip_ranges'
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
      // AJUSTE: Recebe 'ip_ranges' para atualização
      const { name, ip_ranges } = req.body;
      
      const updateData = {};
      if (name) {
        updateData.name = name;
      }
      
      // Se ip_ranges foi fornecido, valida antes de adicionar ao updateData
      if (ip_ranges) {
        if (!Array.isArray(ip_ranges) || ip_ranges.length === 0) {
           return res.status(400).json({ 
            success: false,
            message: 'ip_ranges deve ser um array com pelo menos uma faixa' 
          });
        }
         // Valida cada faixa de IP no array
        for (const range of ip_ranges) {
          const { start, end } = range;
          if (!start || !end) {
            return res.status(400).json({ 
              success: false,
              message: 'Cada faixa em ip_ranges deve conter start e end' 
            });
          }
          if (!isValidIPv4(start) || !isValidIPv4(end)) {
            return res.status(400).json({ 
              success: false,
              message: `IPs inválidos na faixa: ${start} - ${end}.` 
            });
          }
          if (ipToInt(start) > ipToInt(end)) {
            return res.status(400).json({ 
              success: false,
              message: `IP inicial deve ser menor que o IP final na faixa: ${start} - ${end}` 
            });
          }
        }
        // Adiciona ao objeto de atualização
        updateData.ip_ranges = ip_ranges;
      }

      const unit = await UnitMapping.findOneAndUpdate(
        { name: req.params.name },
        updateData, // Usa o objeto de atualização construído
        { new: true }
      );

      if (!unit) {
        return res.status(404).json({ 
          success: false,
          message: 'Unidade não encontrada' 
        });
      }
      logger.info(`Unidade atualizada por ${req.user.username}: ${unit.name}`);
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
  // (Esta rota não precisa de mudanças)
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