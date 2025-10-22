const express = require('express');
const mongoose = require('mongoose');
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
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'AUTH_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️  Variáveis de ambiente faltando:', missingVars.join(', '));
  console.log('📝 Usando valores padrão para variáveis faltantes');
}

const cron = require('node-cron');

// Importar a função de atualização de status
const updateDeviceStatus = require('./scripts/updateDeviceStatus');

const expressConfig = require('./config/express');
const connectDB = require('./config/db');
const { getLocalIPAddress } = require('./utils/helpers');

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

const app = express();
const port = process.env.PORT || 3000;
const ip = '0.0.0.0';

// Conectar ao banco de dados
connectDB(logger).then(() => {
  // Executar verificação de status assim que conectar (opcional)
  logger.info('🔄 Executando verificação inicial de status dos dispositivos...');
  updateDeviceStatus(logger).catch(err => {
    logger.error('Erro na verificação inicial:', { message: err.message });
  });
});

// Configurar o Express e as rotas
expressConfig(app, logger);

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

// Iniciar servidor
app.listen(port, ip, () => {
  logger.info(`🚀 MDM Server rodando em http://${getLocalIPAddress()}:${port}`);
  logger.info(`📱 Provisionamento disponível em: http://${getLocalIPAddress()}:${port}/provision/{token}`);
  logger.info(`📊 Dashboard disponível em: http://${getLocalIPAddress()}:${port}/dashboard`);
});