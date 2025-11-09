const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

const { modifyApiLimiter, getApiLimiter, enrollLimiter } = require('../middleware/rateLimiters');
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth'); // Import para autenticação de dispositivos
const authorize = require('../middleware/role');
const { requestLogger } = require('../middleware/logging');
const errorHandler = require('../middleware/error');

// Importar os controladores e rotas
const authRoutes = require('../routes/authRoutes');
const mdmDeviceRoutes = require('../routes/deviceRoutes');
const totemController = require('../controllers/totemController');
const monitoringRoutes = require('../routes/monitoringRoutes');
const moduleRoutes = require('../routes/moduleRoutes');

// Outras rotas do MDM
const provisioningRoutes = require('../routes/provisioningRoutes');
const configProfileRoutes = require('../routes/configProfileRoutes');
const bssidRoutes = require('../routes/bssidRoutes');
const unitRoutes = require('../routes/unitRoutes');
const serverRoutes = require('../routes/serverRoutes');
const publicRoutes = require('../routes/publicRoutes');
const assetModuleRoutes = require('../routes/assetModuleRoutes');

const expressConfig = (app, logger) => {
  // Disponibilizar o logger para toda a aplicação
  app.locals.logger = logger;

  // Configurações básicas
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    level: 6, // ⭐ Balance entre CPU e tamanho (1-9, padrão é 6)
    threshold: 1024, // ⭐ Só comprime respostas > 1KB
  }));
  app.use(cors());
  app.use(express.json());
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public', 'web')));
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));

  // Middleware de logging
  app.use(requestLogger);

  // Rota de autenticação (pública)
  app.use('/api/auth', authRoutes());

  // Rota pública para APKs
  app.use('/', publicRoutes(logger, getApiLimiter));

  // Rotas de módulos de ativos
  app.use('/api/assets', assetModuleRoutes(logger, getApiLimiter));

  // --- ROTAS PARA CLIENTES (DISPOSITIVOS) ---
  // Rota para monitoramento (totem)
  app.post('/api/monitor', modifyApiLimiter, deviceAuth, totemController.handleTotemData);

  // Rota para dispositivos MDM
  // CORRIGIDO: Inclui deviceAuth antes de auth, como em server.js
  app.use('/api/devices', mdmDeviceRoutes(logger, getApiLimiter, modifyApiLimiter, deviceAuth, auth));

  // --- ROTAS PARA O PAINEL DE CONTROLE ---
  app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));
  app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));
  app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
  app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));
  app.use('/api/modules', moduleRoutes(logger, getApiLimiter, modifyApiLimiter, auth));

  // Rotas de visualização
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'web', 'index.html'));
  });
  
  app.get('/dashboard', auth, authorize('admin'), require('../routes/serverRoutes').renderDashboard(logger));
  app.get('/provision/:token', require('../routes/provisioningRoutes').renderProvisioningPage(logger));
  
  // Error handler (deve ser o último middleware)
  app.use(errorHandler(logger));
};

module.exports = expressConfig;