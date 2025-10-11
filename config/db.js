const mongoose = require('mongoose');
const winston = require('winston');

module.exports = async (logger) => {
  try {
    // Eventos de conexão
    mongoose.connection.on('connected', () => {
      logger.info('Conectado ao MongoDB com sucesso');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`Erro na conexão MongoDB: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado do MongoDB, tentando reconectar em 5 segundos...');
      // Reconecta automaticamente
      setTimeout(() => {
        mongoose.connect(process.env.MONGO_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }).catch(err => logger.error(`Erro na reconexão: ${err.message}`));
      }, 5000);
    });

    // Configuração de conexão com timeouts
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout para seleção de servidor
      socketTimeoutMS: 45000, // Timeout para sockets
      family: 4, // IPv4 only
    });

    logger.info('Conexão MongoDB configurada com reconexão automática');
  } catch (err) {
    logger.error(`Erro ao conectar ao MongoDB: ${err.message}`);
    process.exit(1);
  }
};