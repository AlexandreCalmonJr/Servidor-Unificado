// server.js - VERSÃO MELHORADA COM VALIDAÇÃO E LOGS
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
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');
const updateDeviceStatus = require('./scripts/updateDeviceStatus');
const { getLocalIPAddress } = require('./utils/helpers');

const app = express();
const port = process.env.PORT || 3000;
const ip = '0.0.0.0';

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
      family: 4, // IPv4 only
    });

    logger.logSystemEvent('mongodb_connected', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });

    // Eventos de conexão
    mongoose.connection.on('error', (err) => {
      logger.error('Erro na conexão MongoDB:', {
        message: err.message,
        stack: err.stack,
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado do MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Reconectado ao MongoDB');
    });

  } catch (err) {
    logger.logCriticalError(err, {
      context: 'mongodb_connection',
      mongoUri: process.env.MONGO_URI.replace(/\/\/.*@/, '//***@'), // Mascara credenciais
    });
    
    console.error('\n❌ Falha ao conectar ao MongoDB');
    console.error('💡 Verifique se o MongoDB está rodando e se o MONGO_URI está correto\n');
    process.exit(1);
  }
};

// Conecta ao banco
connectDB();

// ===== MIDDLEWARES GLOBAIS =====
app.use(requestLogger); // Logger de requisições

const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use('/public', express.static(path.join(__dirname, 'public')));


// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ===== ROTAS =====
const auth = require('./middleware/auth');
const { getApiLimiter, modifyApiLimiter, enrollLimiter } = require('./middleware/rateLimiters');
const { errorHandler } = require('./middleware/error');

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

// Montagem de rotas
app.use('/api/auth', authRoutes(logger, getApiLimiter, modifyApiLimiter));
app.post('/api/monitor', modifyApiLimiter, totemController.handleTotemData);
app.get('/provision/:token', provisioningRoutes.renderProvisioningPage(logger));
app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));
app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
app.use('/api/devices', deviceRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/modules', moduleRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/assets', assetModuleRoutes(logger, getApiLimiter));
app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));
app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));
app.use('/api', publicRoutes(logger, getApiLimiter));

// ===== DASHBOARD (OPCIONAL) =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.get('/dashboard', auth, serverRoutes.renderDashboard(logger));
app.use(express.static(path.join(__dirname, 'public', 'web'))); // Serve arquivos estáticos da pasta web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});
// ===== ROTA 404 =====
app.use((req, res) => {
  logger.warn('Rota não encontrada', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path,
    method: req.method,
  });
});

// ===== ERROR HANDLER =====
app.use(errorHandler(logger));

// ===== TAREFA AGENDADA =====
cron.schedule('*/5 * * * *', async () => {
  logger.debug('Executando tarefa agendada de verificação de status');
  
  try {
    await updateDeviceStatus(logger);
  } catch (error) {
    logger.error('Erro na tarefa agendada:', {
      message: error.message,
      stack: error.stack,
    });
  }
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
const server = app.listen(port, ip, () => {
  const localIp = getLocalIPAddress();
  
  logger.logSystemEvent('server_started', {
    port,
    ip,
    localIp,
    environment: process.env.NODE_ENV || 'development',
  });

  console.log('\n' + '='.repeat(60));
  console.log('🚀 MDM Server iniciado com sucesso!');
  console.log('='.repeat(60));
  console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Acesso local: http://localhost:${port}`);
  console.log(`🌐 Acesso rede: http://${localIp}:${port}`);
  console.log(`📊 Health check: http://${localIp}:${port}/health`);
  console.log(`📱 Dashboard: http://${localIp}:${port}/dashboard`);
  console.log('='.repeat(60) + '\n');
});

// ===== TRATAMENTO DE SINAIS =====
const gracefulShutdown = (signal) => {
  logger.logSystemEvent('shutdown_initiated', { signal });
  
  console.log(`\n\n⚠️  ${signal} recebido. Encerrando servidor graciosamente...`);

  server.close(async () => {
    logger.logSystemEvent('server_closed');
    console.log('✅ Servidor HTTP encerrado');

    try {
      await mongoose.connection.close();
      logger.logSystemEvent('mongodb_disconnected');
      console.log('✅ MongoDB desconectado');
      
      process.exit(0);
    } catch (err) {
      logger.error('Erro ao desconectar MongoDB:', {
        message: err.message,
      });
      process.exit(1);
    }
  });

  // Força o encerramento após 10 segundos
  setTimeout(() => {
    logger.error('Shutdown forçado após timeout');
    console.error('❌ Não foi possível encerrar graciosamente. Forçando...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===== TRATAMENTO DE ERROS NÃO CAPTURADOS =====
process.on('unhandledRejection', (reason, promise) => {
  logger.logCriticalError(new Error('Unhandled Rejection'), {
    reason: reason?.toString(),
    promise: promise?.toString(),
  });
  
  console.error('\n❌ ERRO CRÍTICO: Unhandled Promise Rejection');
  console.error(reason);
  
  // Em produção, encerra o processo
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

process.on('uncaughtException', (err) => {
  logger.logCriticalError(err, {
    context: 'uncaught_exception',
  });
  
  console.error('\n❌ ERRO CRÍTICO: Uncaught Exception');
  console.error(err);
  
  // Em produção, encerra o processo
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  }
});