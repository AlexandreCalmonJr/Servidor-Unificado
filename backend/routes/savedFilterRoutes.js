// routes/savedFilterRoutes.js
const express = require('express');
const SavedFilter = require('../models/SavedFilter');

const savedFilterRoutes = (logger, modifyApiLimiter, auth) => {
  const router = express.Router();

  // ── Listar filtros salvos para módulo ──────────────────────────
  router.get('/module/:moduleId', auth, async (req, res) => {
    try {
      const { moduleId } = req.params;
      const userId = req.user._id;

      const filters = await SavedFilter.find({ 
        userId, 
        moduleId 
      }).sort({ isDefault: -1, createdAt: -1 });

      res.json({
        success: true,
        filters,
        total: filters.length,
      });
    } catch (err) {
      logger.error(`Erro ao listar filtros salvos: ${err.message}`);
      res.status(500).json({ error: 'Erro ao listar filtros' });
    }
  });

  // ── Obter filtro salvo específico ──────────────────────────────
  router.get('/:filterId', auth, async (req, res) => {
    try {
      const { filterId } = req.params;
      const userId = req.user._id;

      const filter = await SavedFilter.findOne({ 
        _id: filterId, 
        userId 
      });

      if (!filter) {
        return res.status(404).json({ error: 'Filtro não encontrado' });
      }

      res.json({
        success: true,
        filter,
      });
    } catch (err) {
      logger.error(`Erro ao obter filtro: ${err.message}`);
      res.status(500).json({ error: 'Erro ao obter filtro' });
    }
  });

  // ── Salvar novo filtro ─────────────────────────────────────────
  router.post('/', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, filterName, description, filterData, isDefault } = req.body;
      const userId = req.user._id;

      if (!moduleId || !filterName) {
        return res.status(400).json({ 
          error: 'moduleId e filterName são obrigatórios' 
        });
      }

      // Se isDefault = true, desmarcar outros como default
      if (isDefault) {
        await SavedFilter.updateMany(
          { userId, moduleId, isDefault: true },
          { isDefault: false }
        );
      }

      const newFilter = new SavedFilter({
        userId,
        moduleId,
        filterName,
        description: description || '',
        filterData: filterData || {},
        isDefault: isDefault || false,
      });

      const saved = await newFilter.save();

      logger.info(`Filtro salvo: ${filterName} para módulo ${moduleId}`);
      res.status(201).json({
        success: true,
        message: 'Filtro salvo com sucesso',
        filter: saved,
      });
    } catch (err) {
      logger.error(`Erro ao salvar filtro: ${err.message}`);
      res.status(500).json({ error: 'Erro ao salvar filtro' });
    }
  });

  // ── Atualizar filtro ───────────────────────────────────────────
  router.put('/:filterId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { filterId } = req.params;
      const { filterName, description, filterData, isDefault } = req.body;
      const userId = req.user._id;

      const filter = await SavedFilter.findOne({ 
        _id: filterId, 
        userId 
      });

      if (!filter) {
        return res.status(404).json({ error: 'Filtro não encontrado' });
      }

      // Atualizar campos
      if (filterName) filter.filterName = filterName;
      if (description !== undefined) filter.description = description;
      if (filterData) filter.filterData = filterData;
      
      if (isDefault !== undefined) {
        if (isDefault) {
          // Se marcando como default, desmarcar outros
          await SavedFilter.updateMany(
            { userId, moduleId: filter.moduleId, isDefault: true, _id: { $ne: filterId } },
            { isDefault: false }
          );
        }
        filter.isDefault = isDefault;
      }

      filter.updatedAt = new Date();
      const updated = await filter.save();

      logger.info(`Filtro atualizado: ${filterId}`);
      res.json({
        success: true,
        message: 'Filtro atualizado com sucesso',
        filter: updated,
      });
    } catch (err) {
      logger.error(`Erro ao atualizar filtro: ${err.message}`);
      res.status(500).json({ error: 'Erro ao atualizar filtro' });
    }
  });

  // ── Deletar filtro ─────────────────────────────────────────────
  router.delete('/:filterId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { filterId } = req.params;
      const userId = req.user._id;

      const result = await SavedFilter.findOneAndDelete({ 
        _id: filterId, 
        userId 
      });

      if (!result) {
        return res.status(404).json({ error: 'Filtro não encontrado' });
      }

      logger.info(`Filtro deletado: ${filterId}`);
      res.json({
        success: true,
        message: 'Filtro deletado com sucesso',
      });
    } catch (err) {
      logger.error(`Erro ao deletar filtro: ${err.message}`);
      res.status(500).json({ error: 'Erro ao deletar filtro' });
    }
  });

  // ── Definir como filtro padrão ─────────────────────────────────
  router.post('/:filterId/set-default', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { filterId } = req.params;
      const userId = req.user._id;

      const filter = await SavedFilter.findOne({ 
        _id: filterId, 
        userId 
      });

      if (!filter) {
        return res.status(404).json({ error: 'Filtro não encontrado' });
      }

      // Desmarcar outros como default no mesmo módulo
      await SavedFilter.updateMany(
        { userId, moduleId: filter.moduleId, _id: { $ne: filterId } },
        { isDefault: false }
      );

      filter.isDefault = true;
      const updated = await filter.save();

      logger.info(`Filtro definido como padrão: ${filterId}`);
      res.json({
        success: true,
        message: 'Filtro definido como padrão',
        filter: updated,
      });
    } catch (err) {
      logger.error(`Erro ao definir filtro padrão: ${err.message}`);
      res.status(500).json({ error: 'Erro ao definir filtro' });
    }
  });

  return router;
};

module.exports = savedFilterRoutes;
