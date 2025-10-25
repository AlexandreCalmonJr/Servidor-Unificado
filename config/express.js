// express.js - CONFIGURAÇÃO COMPLETA E ALINHADA DO SERVIDOR MDM
// 
// ESTRUTURA DE ROTAS:
// 
// PÚBLICAS (sem autenticação):
//   POST /api/auth/login
//   POST /api/monitor (compatibilidade totem antigo)
//   GET  /provision/:token
//   POST /api/provisioning/enroll
//   GET  /health
//
// PROTEGIDAS (requerem token):
//   Dispositivos:  /api/devices/*
//   Unidades:      /api/units/*
//   BSSIDs:        /api/bssid-mappings/*
//   Módulos:       /api/modules/*
//   Monitoramento: /api/monitoring/*
//   Servidor:      /api/server/*
//   Usuários:      /api/auth/users/*
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const winston = require('winston');

// Middleware
const auth = require('./middleware/auth');
const { getApiLimiter, modifyApiLimiter, enrollLimiter } = require('./middleware/rateLimiters');

// Controllers
const totemController = require('./controllers/totemController');

// Routes
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const bssidRoutes = require('./routes/bssidRoutes');
const unitRoutes = require('./routes/unitRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const assetModuleRoutes = require('./routes/assetModuleRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const serverRoutes = require('./routes/serverRoutes');
const publicRoutes = require('./routes/publicRoutes');
const provisioningRoutes = require('./routes/provisioningRoutes');
const configProfileRoutes = require('./routes/configProfileRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== LOGGER SETUP ==========
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'mdm-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware para adicionar logger ao req
app.use((req, res, next) => {
  req.logger = logger;
  next();
});

// ========== CONFIGURAÇÃO BÁSICA ==========
app.use(cors({
  origin: '*', // Em produção, especifique domínios permitidos
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos (APKs, etc)
app.use('/public', express.static(path.join(__dirname, 'public')));

// ========== CONEXÃO COM MONGODB ==========
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mdm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('✅ MongoDB conectado com sucesso'))
.catch(err => {
  logger.error('❌ Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ========== ROTAS DE AUTENTICAÇÃO (SEM AUTH) ==========
app.use('/api/auth', authRoutes(logger, getApiLimiter, modifyApiLimiter));

// ========== ROTAS PÚBLICAS (SEM AUTH) ==========
// Rota para agentes enviarem dados SEM autenticação (compatibilidade com totem antigo)
app.post('/api/monitor', modifyApiLimiter, totemController.handleTotemData);

// Rota de provisionamento (página web)
app.get('/provision/:token', provisioningRoutes.renderProvisioningPage(logger));

// ========== ROTAS DE PROVISIONAMENTO ==========
app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));

// ========== ROTAS DE PERFIS DE CONFIGURAÇÃO ==========
app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));

// ========== ROTAS DE DISPOSITIVOS MÓVEIS (MDM) ==========
// TODAS as rotas de devices precisam de autenticação
app.use('/api/devices', deviceRoutes(logger, getApiLimiter, modifyApiLimiter, auth));

// ========== ROTAS DE UNIDADES (IP RANGES) ==========
app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));

// ========== ROTAS DE BSSID (MAC ADDRESS MAPPING) ==========
app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));

// ========== ROTAS DE MÓDULOS DE ATIVOS ==========
// Sistema novo de módulos dinâmicos
app.use('/api/modules', moduleRoutes(logger, getApiLimiter, modifyApiLimiter, auth));

// DEPRECATED: Manter para compatibilidade com versões antigas do painel
// Será removido em versões futuras
app.use('/api/assets', assetModuleRoutes(logger, getApiLimiter));

// ========== ROTAS DE MONITORAMENTO (TOTEM) ==========
// Rotas para o painel gerenciar totens
app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));

// ========== ROTAS DE SERVIDOR ==========
// Métricas, APKs, etc
app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));

// ========== ROTAS PÚBLICAS (APKs) ==========
app.use('/api', publicRoutes(logger, getApiLimiter));

// ========== PÁGINA DE DASHBOARD (OPCIONAL) ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.get('/dashboard', auth, serverRoutes.renderDashboard(logger));

// ========== TRATAMENTO DE ERROS 404 ==========
app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.path} - IP: ${req.ip}`);
  res.status(404).json({ 
    success: false, 
    message: 'Rota não encontrada',
    path: req.path,
    method: req.method
  });
});

// ========== TRATAMENTO DE ERROS GLOBAL ==========
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== INICIALIZAÇÃO DO SERVIDOR ==========
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor MDM rodando na porta ${PORT}`);
  logger.info(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Acesso local: http://localhost:${PORT}`);
  logger.info(`🌐 Acesso rede: http://192.168.0.183:${PORT}`);
});

// Tratamento de sinais de término
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Encerrando servidor graciosamente...');
  mongoose.connection.close(() => {
    logger.info('MongoDB desconectado');
    process.exit(0);
  });
});

module.exports = app;