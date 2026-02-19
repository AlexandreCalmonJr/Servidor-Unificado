require('dotenv').config();
const assetCommandRoutes = require('./routes/assetCommandRoutes');

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
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');
const { metricsMiddleware, getMetrics, getPrometheusMetrics } = require('./middleware/metricsMiddleware');
const updateDeviceStatus = require('./scripts/updateDeviceStatus');
const assetStatusUpdater = require('./scripts/assetStatusUpdater');
const { getLocalIPAddress } = require('./utils/helpers');
const cacheService = require('./services/cacheService');
const WebSocketServer = require('./services/websocketServer');

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

// Segurança - Helmet (headers HTTP seguros)
// Configuração permissiva para evitar bloqueios em desenvolvimento local
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"], // Permite todas as conexões
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
            scriptSrcAttr: ["'unsafe-inline'"], // Fix for inline event handlers
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            fontSrc: ["'self'", "data:", "https:"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
            upgradeInsecureRequests: null, // Desabilita upgrade forçado para HTTPS
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Sanitização de dados MongoDB (previne NoSQL injection)
app.use(mongoSanitize());

// Proteção contra HTTP Parameter Pollution
app.use(hpp());

// Compressão GZIP
const compression = require('compression');
app.use(compression());

// Logger de requisições
app.use(requestLogger);

// Métricas de performance
app.use(metricsMiddleware);

// CORS configurado
const corsOptions = {
    origin: function (origin, callback) {
        // Permite requisições sem origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Se CORS_ORIGIN estiver definido, usa a lista
        if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
            const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // Permite todas as origens em desenvolvimento
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'AUTH_TOKEN', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 horas
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Body parser com limites apropriados
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos com cache
const { staticCacheMiddleware } = require('./middleware/cacheMiddleware');
app.use('/public', staticCacheMiddleware(86400), express.static(path.join(__dirname, 'public')));

// ===== HEALTH CHECK E MÉTRICAS =====

// Health check básico
app.get('/health', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    const health = {
        status: 'OK',
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
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        },
        version: process.env.npm_package_version || '2.0.0',
        environment: process.env.NODE_ENV || 'development',
    };

    // Se algum serviço crítico estiver down, retorna 503
    if (mongoose.connection.readyState !== 1) {
        health.status = 'DEGRADED';
        return res.status(503).json(health);
    }

    res.json(health);
});

// Readiness probe (para Kubernetes)
app.get('/ready', (req, res) => {
    if (mongoose.connection.readyState === 1) {
        res.status(200).json({ ready: true });
    } else {
        res.status(503).json({ ready: false, reason: 'MongoDB not connected' });
    }
});

// Liveness probe (para Kubernetes)
app.get('/live', (req, res) => {
    res.status(200).json({ alive: true });
});

// Métricas de performance
app.get('/metrics', (req, res) => {
    res.json(getMetrics());
});

// Métricas no formato Prometheus
app.get('/metrics/prometheus', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(getPrometheusMetrics());
});

// ===== ROTAS IMPORTS =====
const auth = require('./middleware/auth');
const deviceAuth = require('./middleware/deviceAuth');
const { getApiLimiter, modifyApiLimiter, enrollLimiter } = require('./middleware/rateLimiters');
const { errorHandler } = require('./middleware/error');

// Controllers
const totemController = require('./controllers/totemController');

// Routes Files
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const bssidRoutes = require('./routes/bssidRoutes');
const unitRoutes = require('./routes/unitRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
// assetCommandRoutes já foi importado no topo
const monitoringRoutes = require('./routes/monitoringRoutes');
const serverRoutes = require('./routes/serverRoutes');
const publicRoutes = require('./routes/publicRoutes');
const provisioningRoutes = require('./routes/provisioningRoutes');
const configProfileRoutes = require('./routes/configProfileRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');
const totemRoutes = require('./routes/totemRoutes');


// ===== ROTAS PÚBLICAS (sem autenticação) =====
app.use('/api/auth', authRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api', publicRoutes(logger, getApiLimiter));

// ===== ROTAS DE DISPOSITIVOS (usam deviceAuth - token simples) =====
app.post('/api/monitor', modifyApiLimiter, deviceAuth, totemController.handleTotemData);
app.use('/api/devices', deviceRoutes(logger, cacheService, getApiLimiter, modifyApiLimiter, deviceAuth, auth));

// ===== ROTAS DO PAINEL WEB E AGENTES (HÍBRIDO) =====
app.get('/provision/:token', provisioningRoutes.renderProvisioningPage(logger));
app.use('/api/provisioning', provisioningRoutes(logger, modifyApiLimiter, enrollLimiter, auth));
app.use('/api/config-profiles', configProfileRoutes(logger, modifyApiLimiter, auth));
app.use('/api/units', unitRoutes(logger, getApiLimiter, modifyApiLimiter, auth));
app.use('/api/bssid-mappings', bssidRoutes(logger, getApiLimiter, modifyApiLimiter, auth));

// ✅ [CORREÇÃO] ROTA DE COMANDOS
// A ordem dos parâmetros AGORA corresponde ao assetCommandRoutes.js
// (logger, modifyApiLimiter, auth, deviceAuth)
app.use('/api', assetCommandRoutes(logger, modifyApiLimiter, auth, deviceAuth));

// Rota para módulos/assets
// Rota para módulos/assets
app.use('/api/modules', moduleRoutes(logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth));

// Rota de Diagnóstico
app.use('/api/diagnostic', diagnosticRoutes(logger, getApiLimiter, auth));

app.use('/api/monitoring', monitoringRoutes(logger, modifyApiLimiter, auth));
app.use('/api/server', serverRoutes(logger, getApiLimiter, auth));
app.use('/api/diagnostics', diagnosticRoutes(logger, getApiLimiter, auth));
app.use('/api/totems', totemRoutes(logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth));

// ===== EJS ENGINE =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== PAINEL ADMIN (EJS) =====
// EJS route ANTES do static para ter prioridade sobre o index.html estático
app.get('/panel/index.html', (req, res) => {
    res.render('panel/index');
});
app.use('/panel', express.static(path.join(__dirname, 'public', 'web', 'panel')));
app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'web', 'panel', 'login.html'));
});

// ===== DASHBOARD (OPCIONAL) =====
app.get('/dashboard', auth, serverRoutes.renderDashboard(logger));
app.use(express.static(path.join(__dirname, 'public', 'web')));
app.get('/', (req, res) => {
    res.redirect('/panel');
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

// ===== CRON JOB =====
cron.schedule('*/5 * * * *', async () => {
    logger.debug('Executando tarefa agendada de verificação de status');

    try {
        await updateDeviceStatus(logger);
        await assetStatusUpdater(logger);
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
    console.log(`📈 Métricas: http://${localIp}:${port}/metrics`);
    console.log(`📱 Dashboard: http://${localIp}:${port}/dashboard`);
    console.log('='.repeat(60) + '\n');

    // Initialize WebSocket Server
    new WebSocketServer(server);
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

    setTimeout(() => {
        logger.error('Shutdown forçado após timeout');
        console.error('❌ Não foi possível encerrar graciosamente. Forçando...');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    logger.logCriticalError(new Error('Unhandled Rejection'), {
        reason: reason?.toString(),
        promise: promise?.toString(),
    });
    console.error('\n❌ ERRO CRÍTICO: Unhandled Promise Rejection');
    console.error(reason);
    if (process.env.NODE_ENV === 'production') gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
    logger.logCriticalError(err, { context: 'uncaught_exception' });
    console.error('\n❌ ERRO CRÍTICO: Uncaught Exception');
    console.error(err);
    if (process.env.NODE_ENV === 'production') gracefulShutdown('UNCAUGHT_EXCEPTION');
});