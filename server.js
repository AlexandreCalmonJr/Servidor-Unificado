const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
require('dotenv').config();
const cron = require('node-cron');
const path = require('path');

// Lógica de atualização de status agora está em um arquivo separado
const fixDeviceStatus = require('./scripts/updateDeviceStatus'); // Importa a função

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
connectDB(logger);

// Configurar o Express e as rotas
expressConfig(app, logger);

// Tarefa agendada para rodar a cada 5 minutos
cron.schedule('*/5 * * * *', () => {
  logger.info('Executando tarefa agendada para verificação de status dos dispositivos.');
  // Chama a função importada
  fixDeviceStatus(logger);
});

// Iniciar servidor
app.listen(port, ip, () => {
  logger.info(`🚀 MDM Server rodando em http://${getLocalIPAddress()}:${port}`);
  logger.info(`📱 Provisionamento disponível em: http://${getLocalIPAddress()}:${port}/provision/{token}`);
  logger.info(`📊 Dashboard disponível em: http://${getLocalIPAddress()}:${port}/dashboard`);
});