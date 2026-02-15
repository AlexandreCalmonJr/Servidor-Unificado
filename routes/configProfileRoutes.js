const express = require('express');
const ConfigProfile = require('../models/ConfigProfile');

const configProfileRoutes = (logger, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Criar perfil de configuração
  router.post('/', auth, modifyApiLimiter, async (req, res) => {
    try {
      const profileData = req.body;

      if (!profileData.name) {
        logger.warn('Nome do perfil ausente');
        return res.status(400).json({ error: 'Nome do perfil é obrigatório' });
      }

      const profile = new ConfigProfile(profileData);
      await profile.save();

      logger.info(`Perfil de configuração criado: ${profileData.name}`);
      res.status(201).json(profile);

    } catch (err) {
      if (err.code === 11000) {
        logger.warn(`Perfil já existe: ${req.body.name}`);
        return res.status(409).json({ error: 'Perfil com este nome já existe' });
      }
      logger.error(`Erro ao criar perfil: ${err.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Listar todos os perfis
  router.get('/', auth, async (req, res) => {
    try {
      const profiles = await ConfigProfile.find().sort({ created_at: -1 });
      res.json(profiles);
    } catch (err) {
      logger.error(`Erro ao listar perfis: ${err.message}`);
      res.status(500).json({ error: 'Erro ao listar perfis' });
    }
  });

  // Obter perfil por ID
  router.get('/:id', auth, async (req, res) => {
    try {
      const profile = await ConfigProfile.findById(req.params.id);
      if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  });

  // Atualizar perfil
  router.put('/:id', auth, modifyApiLimiter, async (req, res) => {
    try {
      const profile = await ConfigProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' });

      logger.info(`Perfil atualizado: ${profile.name}`);
      res.json(profile);
    } catch (err) {
      logger.error(`Erro ao atualizar perfil: ${err.message}`);
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  });

  // Deletar perfil
  router.delete('/:id', auth, modifyApiLimiter, async (req, res) => {
    try {
      const profile = await ConfigProfile.findByIdAndDelete(req.params.id);
      if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' });

      logger.info(`Perfil removido: ${profile.name}`);
      res.json({ success: true, message: 'Perfil removido' });
    } catch (err) {
      logger.error(`Erro ao deletar perfil: ${err.message}`);
      res.status(500).json({ error: 'Erro ao deletar perfil' });
    }
  });

  return router;
};

module.exports = configProfileRoutes;