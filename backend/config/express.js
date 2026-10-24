const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

const { modifyApiLimiter, getApiLimiter, enrollLimiter } = require('../middleware/rateLimiters');
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const authorize = require('../middleware/role');
const { requestLogger } = require('../middleware/logging');
const errorHandler = require('../middleware/error');
const cacheService = require('../services/cacheService');

// Rotas
const authRoutes = require('../routes/authRoutes');
const totemController = require('../controllers/totemController');
const monitoringRoutes = require('../routes/monitoringRoutes');
const moduleRoutes = require('../routes/moduleRoutes');
const deviceRoutes = require('../routes/deviceRoutes'); // [NOVO] Importação da rota de dispositivos
const assetCommandRoutes = require('../routes/assetCommandRoutes');
const provisioningRoutes = require('../routes/provisioningRoutes');
const configProfileRoutes = require('../routes/configProfileRoutes');
const bssidRoutes = require('../routes/bssidRoutes');
const unitRoutes = require('../routes/unitRoutes');
const serverRoutes = require('../routes/serverRoutes');
const publicRoutes = require('../routes/publicRoutes');

const expressConfig = (app, logger) => {
  app.locals.logger = logger;

  // ── Middlewares globais ──────────────────────────────────────────
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
  }));
  app.use(cors());
  app.use(express.json());
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public', 'web')));
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));
  app.use(requestLogger);

  // ── Rotas públicas ───────────────────────────────────────────────
  app.use('/api/auth', authRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/', publicRoutes(logger, getApiLimiter));

  // ── Rotas para clientes / agentes ────────────────────────────────
  // Totem (agente envia dados de monitoramento)
  app.post('/api/monitor', modifyApiLimiter, deviceAuth, totemController.handleTotemData);

  // ── Rotas modulares (painel + agentes) ───────────────────────────
  app.use('/api/modules', moduleRoutes(logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth));
  app.use('/api/devices', deviceRoutes(logger, modifyApiLimiter, getApiLimiter, deviceAuth)); // [NOVO] Registro da rota
  app.use('/api', assetCommandRoutes(logger, modifyApiLimiter, auth, deviceAuth));

  // ── Rotas do painel de controle ──────────────────────────────────
  app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));
  app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));
  app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
  app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));

  // ── Rotas de visualização (SSR) ──────────────────────────────────
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'web', 'index.html'));
  });

  app.get('/dashboard', auth, authorize('admin'),
    require('../routes/serverRoutes').renderDashboard(logger));

  app.get('/provision/:token',
    require('../routes/provisioningRoutes').renderProvisioningPage(logger));

  // ── Error handler (deve ser o último middleware) ─────────────────
  app.use(errorHandler(logger));
};

module.exports = expressConfig;