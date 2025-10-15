const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

const { modifyApiLimiter, getApiLimiter, enrollLimiter } = require('../middleware/rateLimiters');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const requestLogger = require('../middleware/logging');
const errorHandler = require('../middleware/error');

// Importar os controladores e rotas
const authRoutes = require('../routes/authRoutes');
const mdmDeviceRoutes = require('../routes/deviceRoutes');// Renomeado de deviceRoutes.js
const totemController = require('../controllers/totemController');
const monitoringRoutes = require('../routes/monitoringRoutes');

// Outras rotas do MDM
const provisioningRoutes = require('../routes/provisioningRoutes');
const configProfileRoutes = require('../routes/configProfileRoutes');
const bssidRoutes = require('../routes/bssidRoutes');
const unitRoutes = require('../routes/unitRoutes');
const serverRoutes = require('../routes/serverRoutes');
const publicRoutes = require('../routes/publicRoutes'); // *** ADICIONADO ***


const expressConfig = (app, logger) => {
  // ... (configurações de compressão, cors, json, ejs, static)
  app.use(compression());
  app.use(cors());
  app.use(express.json());
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public', 'web')));
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));
  // ...

  app.use(requestLogger(logger));

  // Rota de autenticação (pública)
  app.use('/api/auth', authRoutes());

  // *** ADICIONAR ROTA PÚBLICA PARA APKs ***
  app.use('/', publicRoutes(logger, getApiLimiter));

  // --- ROTAS ORIGINAIS PARA CLIENTES (COMPATIBILIDADE MANTIDA) ---

  // Rota original do cliente de monitoramento (totem)
  // POST /api/monitor
  app.post('/api/monitor', totemController.handleTotemData);

  // Rota original do cliente MDM (dispositivos móveis)
  // Ex: /api/devices/checkin, etc.
  app.use('/api/devices', mdmDeviceRoutes(logger, getApiLimiter, modifyApiLimiter, auth));


  // --- NOVAS ROTAS MODULARES PARA O PAINEL DE CONTROLE ---

  // Módulo de Monitoramento para o Painel (protegido por autenticação)
  // Ex: /api/monitoring/totems, /api/monitoring/ip-mappings
  app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));

  // Outras rotas do MDM (usadas pelo painel e provisionamento)
  app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));
  app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
  app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
  app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));


  // ... (rotas de visualização, erro handler, etc.)
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'web', 'index.html'));
  });
  app.get('/dashboard', auth, authorize('admin'), require('../routes/serverRoutes').renderDashboard(logger));
  app.get('/provision/:token', require('../routes/provisioningRoutes').renderProvisioningPage(logger));
  app.use(errorHandler(logger));
};

module.exports = expressConfig;