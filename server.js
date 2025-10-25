const express = require('express');
const winston = require('winston');
const path = require('path');

// Carregar variáveis de ambiente ANTES de tudo
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

// Verificar se o .env foi carregado corretamente
if (result.error) {
  console.error('❌ Erro ao carregar .env:', result.error);
  console.log('📁 Procurando .env em:', envPath);
} else {
  console.log('✅ Arquivo .env carregado com sucesso');
  console.log('📊 Variáveis carregadas:', Object.keys(result.parsed || {}).length);
}

// Verificar variáveis essenciais
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️  Variáveis de ambiente faltando:', missingVars.join(', '));
  console.log('📝 Usando valores padrão para variáveis faltantes');
}

const cron = require('node-cron');

// Configurar logger com winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/server.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.Console()
  ],
});

// ✅ CORREÇÃO: Importar a função de configuração e criar app
const expressConfig = require('./config/express');
const connectDB = require('./config/db');
const { getLocalIPAddress } = require('./utils/helpers');

// Importar a função de atualização de status
const updateDeviceStatus = require('./scripts/updateDeviceStatus');

// Criar instância do Express
const app = express();

// Configurar o Express usando sua função
expressConfig(app, logger);

let port = parseInt(process.env.PORT) || 3000;
const ip = '0.0.0.0';
const maxPortAttempts = 10;

// Função para tentar iniciar o servidor em uma porta
async function startServer(attemptPort) {
  return new Promise((resolve, reject) => {
    const server = app.listen(attemptPort, ip)
      .once('listening', () => {
        logger.info(`🚀 MDM Server rodando em http://${getLocalIPAddress()}:${attemptPort}`);
        logger.info(`📱 Provisionamento disponível em: http://${getLocalIPAddress()}:${attemptPort}/provision/{token}`);
        logger.info(`📊 Dashboard disponível em: http://${getLocalIPAddress()}:${attemptPort}/dashboard`);
        resolve({ server, port: attemptPort });
      })
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          reject(err);
        } else {
          logger.error(`❌ Erro ao iniciar servidor na porta ${attemptPort}:`, err);
          reject(err);
        }
      });
  });
}

// Tentar iniciar servidor com fallback de portas
async function tryStartServer() {
  for (let attempt = 0; attempt < maxPortAttempts; attempt++) {
    const attemptPort = port + attempt;
    
    try {
      logger.info(`🔄 Tentando iniciar servidor na porta ${attemptPort}...`);
      const result = await startServer(attemptPort);
      
      if (attemptPort !== port) {
        logger.warn(`⚠️  Porta ${port} estava em uso. Servidor iniciado na porta ${attemptPort}`);
        logger.info(`💡 Para usar a porta ${port}, execute: node scripts/diagnose-port.js`);
      }
      
      return result;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`⚠️  Porta ${attemptPort} em uso, tentando próxima...`);
        if (attempt === maxPortAttempts - 1) {
          logger.error(`❌ Todas as portas de ${port} a ${port + maxPortAttempts - 1} estão em uso!`);
          logger.info(`💡 Execute para diagnóstico: node scripts/diagnose-port.js`);
          process.exit(1);
        }
      } else {
        throw err;
      }
    }
  }
}

// Conectar ao banco de dados
connectDB(logger).then(async () => {
  // Executar verificação de status assim que conectar
  logger.info('🔄 Executando verificação inicial de status dos dispositivos...');
  updateDeviceStatus(logger).catch(err => {
    logger.error('Erro na verificação inicial:', { message: err.message });
  });

  // Tarefa agendada para rodar a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    logger.info('⏰ Executando tarefa agendada de verificação de status.');
    try {
      await updateDeviceStatus(logger);
    } catch (error) {
      logger.error('Erro na tarefa agendada de status:', { 
        message: error.message 
      });
    }
  });

  // Iniciar servidor com fallback automático de portas
  await tryStartServer();
}).catch(err => {
  logger.error('❌ Falha ao conectar ao banco de dados:', err);
  process.exit(1);
});