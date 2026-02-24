require('dotenv').config();

const path = require('path');
const cron = require('node-cron');

// ===== VALIDAÇÃO DE AMBIENTE =====
const validateEnv = require('./config/validateEnv');
try {
  validateEnv();
} catch (error) {
  console.error('\n❌ Erro de configuração:', error.message);
  console.error('\n💡 Corrija as variáveis de ambiente e tente novamente.\n');
  process.exit(1);
}

// ===== IMPORTS =====
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');
const compression = require('compression');
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');
const { metricsMiddleware, getMetrics, getPrometheusMetrics } = require('./middleware/metricsMiddleware');
const { staticCacheMiddleware } = require('./middleware/cacheMiddleware');
const { errorHandler } = require('./middleware/error');
const auth = require('./middleware/auth');
const deviceAuth = require('./middleware/deviceAuth');
const { getApiLimiter, modifyApiLimiter, enrollLimiter } = require('./middleware/rateLimiters');
const assetStatusUpdater = require('./scripts/assetStatusUpdater');
const { getLocalIPAddress } = require('./utils/helpers');
const cacheService = require('./services/cacheService');
const WebSocketServer = require('./services/websocketServer');

// ===== CONTROLLERS =====
const agentController = require('./controllers/agentController');

// ===== ROTAS =====
const authRoutes = require('./routes/authRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const assetCommandRoutes = require('./routes/assetCommandRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const serverRoutes = require('./routes/serverRoutes');
const publicRoutes = require('./routes/publicRoutes');
const provisioningRoutes = require('./routes/provisioningRoutes');
const configProfileRoutes = require('./routes/configProfileRoutes');
const bssidRoutes = require('./routes/bssidRoutes');
const unitRoutes = require('./routes/unitRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const exportRoutes = require('./routes/exportRoutes');
const savedFilterRoutes = require('./routes/savedFilterRoutes');

const app = express();
const port = process.env.PORT || 3000;

// ===== LOG DE INICIALIZAÇÃO =====
logger.logSystemEvent('server_starting', {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  port,
});

// ===== CONEXÃO COM MONGODB =====
const connectDB = async () => {
  try {
    logger.info('Conectando ao MongoDB...');

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    logger.logSystemEvent('mongodb_connected', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Erro na conexão MongoDB:', { message: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado do MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Reconectado ao MongoDB');
    });

    const createAdminUser = require('./scripts/createAdminUser');
    await createAdminUser();

  } catch (err) {
    logger.logCriticalError(err, {
      context: 'mongodb_connection',
      mongoUri: process.env.MONGO_URI.replace(/\/\/.*@/, '//***@'),
    });
    console.error('\n❌ Falha ao conectar ao MongoDB');
    console.error('💡 Verifique se o MongoDB está rodando e se o MONGO_URI está correto\n');
    process.exit(1);
  }
};

connectDB();

// ===== MIDDLEWARES GLOBAIS =====

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(mongoSanitize());
app.use(hpp());
app.use(compression());
app.use(requestLogger);
app.use(metricsMiddleware);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
      const allowed = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      return callback(allowed.includes(origin) ? null : new Error('Not allowed by CORS'), allowed.includes(origin));
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'AUTH_TOKEN', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Arquivos estáticos com cache
app.use('/public', staticCacheMiddleware(86400), express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== HEALTH / PROBES / MÉTRICAS =====

app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  const health = {
    status: mongoose.connection.readyState === 1 ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    services: {
      mongodb: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
      },
      redis: {
        status: cacheService.isReady() ? 'connected' : 'disconnected',
        enabled: process.env.REDIS_ENABLED === 'true',
      },
    },
    memory: {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    },
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
  };
  res.status(health.status === 'OK' ? 200 : 503).json(health);
});

app.get('/ready', (req, res) => {
  mongoose.connection.readyState === 1
    ? res.status(200).json({ ready: true })
    : res.status(503).json({ ready: false, reason: 'MongoDB not connected' });
});

app.get('/live', (req, res) => res.status(200).json({ alive: true }));

app.get('/metrics', (req, res) => res.json(getMetrics()));

app.get('/metrics/prometheus', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getPrometheusMetrics());
});

// ===== ROTAS PÚBLICAS =====
app.use('/api/auth', authRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api', publicRoutes(logger, getApiLimiter));

// ===== ROTAS DE AGENTES (deviceAuth) =====
// Agentes enviam dados de monitoramento (desktop, totem, mobile, etc.)
app.post('/api/monitor', modifyApiLimiter, deviceAuth, agentController.handleAgentData);
app.use('/api/devices', deviceRoutes(logger, modifyApiLimiter, getApiLimiter, deviceAuth));
// ===== ROTAS MODULARES (painel + agentes) =====
app.use('/api/modules', moduleRoutes(logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth));
app.use('/api', assetCommandRoutes(logger, modifyApiLimiter, auth, deviceAuth));

// ===== ROTAS DO PAINEL =====
app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));
app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));
app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));
app.use('/api/diagnostic', diagnosticRoutes(logger, getApiLimiter, auth));
app.use('/api/export', exportRoutes(logger, getApiLimiter, auth));
app.use('/api/filters', savedFilterRoutes(logger, modifyApiLimiter, auth));

// ===== PAINEL WEB (SPA) =====
app.get('/provision/:token', provisioningRoutes.renderProvisioningPage(logger));
app.get('/dashboard', auth, serverRoutes.renderDashboard(logger));

app.use('/panel', express.static(path.join(__dirname, 'public', 'web', 'panel')));
app.get('/panel', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'web', 'panel', 'login.html'))
);
app.get('/panel/', (req, res) => {
  const token = req.headers.authorization?.substring(7) || req.query.token || req.headers.auth_token;
  const file = token ? 'index.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', 'web', 'panel', file));
});

app.use(express.static(path.join(__dirname, 'public', 'web')));
app.get('/', (req, res) => res.redirect('/panel'));

// ===== 404 =====
app.use((req, res) => {
  logger.warn('Rota não encontrada', { method: req.method, path: req.path, ip: req.ip });
  res.status(404).json({ success: false, message: 'Rota não encontrada', path: req.path });
});

// ===== ERROR HANDLER =====
app.use(errorHandler(logger));

// ===== CRON — atualiza status dos ativos a cada 5 min =====
cron.schedule('*/5 * * * *', async () => {
  logger.debug('Executando tarefa agendada de verificação de status');
  try {
    await assetStatusUpdater(logger);
  } catch (error) {
    logger.error('Erro na tarefa agendada:', { message: error.message });
  }
});

// ===== INICIALIZAÇÃO =====
const server = app.listen(port, '0.0.0.0', () => {
  const localIp = getLocalIPAddress();

  logger.logSystemEvent('server_started', {
    port,
    localIp,
    environment: process.env.NODE_ENV || 'development',
  });

  console.log('\n' + '='.repeat(60));
  console.log('🚀 MDM Server iniciado com sucesso!');
  console.log('='.repeat(60));
  console.log(`📱 Ambiente  : ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Local     : http://localhost:${port}`);
  console.log(`🌐 Rede      : http://${localIp}:${port}`);
  console.log(`💊 Health    : http://${localIp}:${port}/health`);
  console.log(`📈 Métricas  : http://${localIp}:${port}/metrics`);
  console.log(`🖥️  Painel    : http://${localIp}:${port}/panel`);
  console.log('='.repeat(60) + '\n');

  new WebSocketServer(server);
});

// ===== GRACEFUL SHUTDOWN =====
const gracefulShutdown = async (signal) => {
  logger.logSystemEvent('shutdown_initiated', { signal });
  console.log(`\n⚠️  ${signal} recebido. Encerrando servidor...`);

  server.close(async () => {
    logger.logSystemEvent('server_closed');
    console.log('✅ Servidor HTTP encerrado');
    try {
      await mongoose.connection.close();
      logger.logSystemEvent('mongodb_disconnected');
      console.log('✅ MongoDB desconectado');
      process.exit(0);
    } catch (err) {
      logger.error('Erro ao desconectar MongoDB:', { message: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Shutdown forçado após timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.logCriticalError(new Error('Unhandled Rejection'), { reason: reason?.toString() });
  console.error('\n❌ Unhandled Promise Rejection:', reason);
  if (process.env.NODE_ENV === 'production') gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  logger.logCriticalError(err, { context: 'uncaught_exception' });
  console.error('\n❌ Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') gracefulShutdown('UNCAUGHT_EXCEPTION');
});