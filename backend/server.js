const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const { PUBLIC_DIR, FRONTEND_DIR, FRONTEND_REACT_DIR } = require('./config/paths');
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
const crypto = require('crypto');
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
const assetStatusUpdater = require('../scripts/assetStatusUpdater');
const { getLocalIPAddress } = require('./utils/helpers');
const cacheService = require('./services/cacheService');
const WebSocketServer = require('./services/websocketServer');
const PrinterService = require('./services/printerService');

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
const printerRoutes = require('./routes/printerRoutes');
const printerSyncRoutes = require('./routes/printerSyncRoutes');
const { getSessionToken, authenticateJwtToken } = require('./utils/authTokens');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./docs/openapi.json');
const { validateBody } = require('./middleware/schemaValidator');

const app = express();
const port = process.env.PORT || 3000;

// ===== INICIALIZAÇÃO DO SERVIÇO DE IMPRESSORAS =====
const printerService = new PrinterService(logger);

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

    const createAdminUser = require('../scripts/createAdminUser');
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

// CSP Nonce middleware para scripts dinâmicos (SSR/templates)
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com",
        "https://cdn.tailwindcss.com",
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      upgradeInsecureRequests: null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  originAgentCluster: false,
}));

app.use(mongoSanitize());
app.use(hpp());
app.use(compression());
app.use(requestLogger);
app.use(metricsMiddleware);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const configured = process.env.CORS_ORIGIN || '';
    if (configured && configured !== '*') {
      const allowed = configured.split(',').map(o => o.trim()).filter(Boolean);
      const isAllowed = allowed.includes(origin);
      return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    }
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('CORS_ORIGIN must be explicit in production'), false);
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
app.use('/public', staticCacheMiddleware(86400), express.static(PUBLIC_DIR));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(FRONTEND_DIR, 'views'));

// ===== HEALTH / PROBES / MÉTRICAS =====

app.get('/health', (req, res) => {
  const health = {
    status: mongoose.connection.readyState === 1 ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
  };
  res.status(health.status === 'OK' ? 200 : 503).json(health);
});

app.get('/ready', (req, res) => {
  mongoose.connection.readyState === 1
    ? res.status(200).json({ ready: true })
    : res.status(503).json({ ready: false, reason: 'MongoDB not connected' });
});

app.get('/live', (req, res) => res.status(200).json({ alive: true }));

app.get('/metrics', auth, (req, res) => res.json(getMetrics()));

app.get('/metrics/prometheus', auth, (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getPrometheusMetrics());
});

// ===== ROTAS PÚBLICAS =====
app.use('/api/auth', authRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api', publicRoutes(logger, getApiLimiter));

// ===== DOCUMENTAÇÃO DA API (OpenAPI 3.0 / Swagger UI) =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));

// ===== ROTAS DE AGENTES (deviceAuth) =====
// Agentes enviam dados de monitoramento (desktop, totem, mobile, etc.)
app.post('/api/monitor', modifyApiLimiter, deviceAuth, validateBody('telemetry'), agentController.handleAgentData);
app.use('/api/devices', deviceRoutes(logger, modifyApiLimiter, getApiLimiter, deviceAuth));
// ===== ROTAS MODULARES (painel + agentes) =====
app.use('/api/modules', moduleRoutes(logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth));
app.use('/api', assetCommandRoutes(logger, modifyApiLimiter, auth, deviceAuth));

// ===== ROTAS DO PAINEL =====
app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));
app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth, deviceAuth));
app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));
app.use('/api/diagnostic', diagnosticRoutes(logger, getApiLimiter, auth));
app.use('/api/export', exportRoutes(logger, getApiLimiter, auth));
app.use('/api/filters', savedFilterRoutes(logger, modifyApiLimiter, auth));

// ===== ROTAS DE IMPRESSORAS =====
app.use('/api/printers', printerRoutes(logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth, printerService));
app.use('/api/printers', printerSyncRoutes(logger, modifyApiLimiter, deviceAuth));

// ===== PAINEL WEB (SPA) =====
const requirePanelSession = async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    if (!token) return res.redirect('/panel/login.html');
    req.user = await authenticateJwtToken(token);
    return next();
  } catch (error) {
    return res.redirect('/panel/login.html');
  }
};

app.get('/provision/:token', provisioningRoutes.renderProvisioningPage(logger));
app.get('/dashboard', (req, res) => res.redirect('/panel/index.html'));

app.get('/panel/index.html', requirePanelSession, (req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'))
);
// Redirect /panel and /panel/ diretamente para /panel/index.html (antes do static para evitar loop)
app.get('/panel', (req, res) =>
  res.redirect('/panel/index.html')
);
app.use('/panel/views', requirePanelSession, express.static(path.join(FRONTEND_DIR, 'views'), { index: false }));
app.use('/panel', express.static(FRONTEND_DIR, { index: false }));

app.get('/index.html', requirePanelSession, (req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'))
);
app.use('/views', requirePanelSession, express.static(path.join(FRONTEND_DIR, 'views'), { index: false }));
app.use(express.static(FRONTEND_DIR, { index: false }));
app.get('/', (req, res) => res.redirect('/panel'));

// ===== PAINEL REACT (NOVO FRONTEND EM PARALELO) =====
if (fs.existsSync(FRONTEND_REACT_DIR)) {
  app.use('/panel-react', express.static(FRONTEND_REACT_DIR));
  app.get(['/panel-react', '/panel-react/*'], (req, res) => {
    res.sendFile(path.join(FRONTEND_REACT_DIR, 'index.html'));
  });
}

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

// ===== INICIALIZAÇÃO DO PRINTER SERVICE =====
const initializePrinterService = async () => {
  try {
    await printerService.start();
    logger.info('✅ Serviço de impressoras iniciado com sucesso');
  } catch (error) {
    logger.error('❌ Erro ao inicializar serviço de impressoras:', error.message);
  }
};

// ===== INICIALIZAÇÃO =====
const server = app.listen(port, '0.0.0.0', async () => {
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
  
  // Inicializa serviço de impressoras
  await initializePrinterService();
});

// ===== GRACEFUL SHUTDOWN =====
const gracefulShutdown = async (signal) => {
  logger.logSystemEvent('shutdown_initiated', { signal });
  console.log(`\n⚠️  ${signal} recebido. Encerrando servidor...`);

  // Para o serviço de impressoras
  if (printerService) {
    printerService.stop();
    console.log('✅ Serviço de impressoras parado');
  }

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
