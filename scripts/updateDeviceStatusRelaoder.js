const mongoose = require('mongoose');
const path = require('path');
const Device = require('../models/Device');

// Garante que o arquivo .env seja encontrado corretamente
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const dbURI = process.env.MONGO_URI;

if (!dbURI) {
  console.error('Erro: A variável de ambiente MONGO_URI não foi definida. Verifique seu arquivo .env.');
  process.exit(1);
}

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conectado ao banco de dados, iniciando a correção dos status...');
    return fixDeviceStatus();
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  });

const fixDeviceStatus = async () => {
  try {
    const allDevices = await Device.find({});
    const now = new Date();
    let correctedCount = 0;

    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    for (const device of allDevices) {
      let originalStatus = device.status;
      let newStatus = originalStatus;
      let newIsOnline = device.is_online;

      if (device.maintenance_status) {
        // Ignora dispositivos em manutenção
        continue;
      }
      
      const lastSeen = device.last_seen ? new Date(device.last_seen) : new Date(0);
      const lastSync = device.last_sync ? new Date(device.last_sync) : new Date(0);

      // Lógica de correção baseada no tempo
      if (lastSeen > fortyFiveMinutesAgo) {
        newStatus = 'online';
        newIsOnline = true;
      } else if (lastSync < fiveDaysAgo) {
        newStatus = 'Sem Monitorar';
        newIsOnline = false;
      } else {
        newStatus = 'offline';
        newIsOnline = false;
      }

      if (newStatus !== originalStatus) {
        device.status = newStatus;
        device.is_online = newIsOnline;
        await device.save();
        correctedCount++;
        console.log(`Dispositivo "${device.device_name}" corrigido de "${originalStatus}" para "${newStatus}".`);
      }
    }

    console.log(`Correção concluída. ${correctedCount} de ${allDevices.length} dispositivos tiveram seus status ajustados.`);

  } catch (error) {
    console.error('Erro durante a correção do status dos dispositivos:', error);
  } finally {
    mongoose.connection.close();
    console.log('Conexão com o banco de dados fechada.');
  }
};