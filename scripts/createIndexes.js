// scripts/createIndexes.js - CRIAÇÃO DE ÍNDICES OTIMIZADOS

require('dotenv').config();
const mongoose = require('mongoose');
const chalk = require('chalk');

// Importar todos os models
const Device = require('../models/Device');
const User = require('../models/User');
const ManagedAsset = require('../models/ManagedAsset');
const AssetCommand = require('../models/AssetCommand');
const BssidMapping = require('../models/BssidMapping');
const UnitMapping = require('../models/UnitMapping');
const LocationHistory = require('../models/LocationHistory');
const Totem = require('../models/Totem');

/**
 * Conecta ao MongoDB
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(chalk.green('✓ Conectado ao MongoDB'));
    } catch (error) {
        console.error(chalk.red('✗ Erro ao conectar ao MongoDB:'), error.message);
        process.exit(1);
    }
};

/**
 * Cria índices para a collection de Devices
 */
const createDeviceIndexes = async () => {
    console.log(chalk.blue('\n📱 Criando índices para Devices...'));

    try {
        // Índice único para serial_number
        await Device.collection.createIndex({ serial_number: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: serial_number'));

        // Índice para busca por status
        await Device.collection.createIndex({ status: 1 });
        console.log(chalk.green('  ✓ Índice: status'));

        // Índice composto para queries de localização
        await Device.collection.createIndex({ unit: 1, sector: 1 });
        console.log(chalk.green('  ✓ Índice composto: unit + sector'));

        // Índice para busca por última atualização
        await Device.collection.createIndex({ last_seen: -1 });
        console.log(chalk.green('  ✓ Índice: last_seen (desc)'));

        // Índice de texto para busca
        await Device.collection.createIndex(
            { device_name: 'text', serial_number: 'text', model: 'text' },
            { name: 'device_text_search' }
        );
        console.log(chalk.green('  ✓ Índice de texto: device_name, serial_number, model'));

        // Índice para IP address
        await Device.collection.createIndex({ ip_address: 1 });
        console.log(chalk.green('  ✓ Índice: ip_address'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de Device:'), error.message);
    }
};

/**
 * Cria índices para a collection de Users
 */
const createUserIndexes = async () => {
    console.log(chalk.blue('\n👤 Criando índices para Users...'));

    try {
        // Índices únicos
        await User.collection.createIndex({ username: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: username'));

        await User.collection.createIndex({ email: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: email'));

        // Índice para role
        await User.collection.createIndex({ role: 1 });
        console.log(chalk.green('  ✓ Índice: role'));

        // Índice para sector
        await User.collection.createIndex({ sector: 1 });
        console.log(chalk.green('  ✓ Índice: sector'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de User:'), error.message);
    }
};

/**
 * Cria índices para a collection de ManagedAssets
 */
const createAssetIndexes = async () => {
    console.log(chalk.blue('\n💼 Criando índices para ManagedAssets...'));

    try {
        // Índice único para serial_number
        await ManagedAsset.collection.createIndex({ serial_number: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: serial_number'));

        // Índice para tipo de asset
        await ManagedAsset.collection.createIndex({ asset_type: 1 });
        console.log(chalk.green('  ✓ Índice: asset_type'));

        // Índice composto para localização
        await ManagedAsset.collection.createIndex({ unit: 1, sector: 1 });
        console.log(chalk.green('  ✓ Índice composto: unit + sector'));

        // Índice para status
        await ManagedAsset.collection.createIndex({ status: 1 });
        console.log(chalk.green('  ✓ Índice: status'));

        // Índice para última atualização
        await ManagedAsset.collection.createIndex({ last_seen: -1 });
        console.log(chalk.green('  ✓ Índice: last_seen (desc)'));

        // Índice de texto para busca
        await ManagedAsset.collection.createIndex(
            { asset_name: 'text', serial_number: 'text', model: 'text' },
            { name: 'asset_text_search' }
        );
        console.log(chalk.green('  ✓ Índice de texto: asset_name, serial_number, model'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de ManagedAsset:'), error.message);
    }
};

/**
 * Cria índices para a collection de AssetCommands
 */
const createCommandIndexes = async () => {
    console.log(chalk.blue('\n📋 Criando índices para AssetCommands...'));

    try {
        // Índice para asset_id
        await AssetCommand.collection.createIndex({ asset_id: 1 });
        console.log(chalk.green('  ✓ Índice: asset_id'));

        // Índice para status
        await AssetCommand.collection.createIndex({ status: 1 });
        console.log(chalk.green('  ✓ Índice: status'));

        // Índice composto para queries de comandos pendentes
        await AssetCommand.collection.createIndex({ asset_id: 1, status: 1 });
        console.log(chalk.green('  ✓ Índice composto: asset_id + status'));

        // Índice para data de criação
        await AssetCommand.collection.createIndex({ created_at: -1 });
        console.log(chalk.green('  ✓ Índice: created_at (desc)'));

        // TTL index para auto-deletar comandos antigos (90 dias)
        await AssetCommand.collection.createIndex(
            { created_at: 1 },
            { expireAfterSeconds: 7776000, name: 'command_ttl' }
        );
        console.log(chalk.green('  ✓ TTL Index: comandos expiram após 90 dias'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de AssetCommand:'), error.message);
    }
};

/**
 * Cria índices para a collection de BssidMappings
 */
const createBssidIndexes = async () => {
    console.log(chalk.blue('\n📡 Criando índices para BssidMappings...'));

    try {
        // Índice único para bssid
        await BssidMapping.collection.createIndex({ bssid: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: bssid'));

        // Índice para unit
        await BssidMapping.collection.createIndex({ unit: 1 });
        console.log(chalk.green('  ✓ Índice: unit'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de BssidMapping:'), error.message);
    }
};

/**
 * Cria índices para a collection de LocationHistory
 */
const createLocationHistoryIndexes = async () => {
    console.log(chalk.blue('\n📍 Criando índices para LocationHistory...'));

    try {
        // Índice composto para queries de histórico por dispositivo
        await LocationHistory.collection.createIndex({ device_id: 1, timestamp: -1 });
        console.log(chalk.green('  ✓ Índice composto: device_id + timestamp (desc)'));

        // Índice para timestamp
        await LocationHistory.collection.createIndex({ timestamp: -1 });
        console.log(chalk.green('  ✓ Índice: timestamp (desc)'));

        // TTL index para auto-deletar histórico antigo (180 dias)
        await LocationHistory.collection.createIndex(
            { timestamp: 1 },
            { expireAfterSeconds: 15552000, name: 'location_history_ttl' }
        );
        console.log(chalk.green('  ✓ TTL Index: histórico expira após 180 dias'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de LocationHistory:'), error.message);
    }
};

/**
 * Cria índices para a collection de Totems
 */
const createTotemIndexes = async () => {
    console.log(chalk.blue('\n🖥️  Criando índices para Totems...'));

    try {
        // Índice único para serial_number
        await Totem.collection.createIndex({ serial_number: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: serial_number'));

        // Índice para status
        await Totem.collection.createIndex({ status: 1 });
        console.log(chalk.green('  ✓ Índice: status'));

        // Índice para última atualização
        await Totem.collection.createIndex({ last_seen: -1 });
        console.log(chalk.green('  ✓ Índice: last_seen (desc)'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de Totem:'), error.message);
    }
};

/**
 * Lista todos os índices criados
 */
const listAllIndexes = async () => {
    console.log(chalk.blue('\n📊 Resumo de Índices Criados:\n'));

    const collections = [
        { name: 'devices', model: Device },
        { name: 'users', model: User },
        { name: 'managedassets', model: ManagedAsset },
        { name: 'assetcommands', model: AssetCommand },
        { name: 'bssidmappings', model: BssidMapping },
        { name: 'locationhistories', model: LocationHistory },
        { name: 'totems', model: Totem },
    ];

    for (const col of collections) {
        try {
            const indexes = await col.model.collection.indexes();
            console.log(chalk.cyan(`${col.name}:`), `${indexes.length} índices`);
        } catch (error) {
            console.log(chalk.yellow(`${col.name}:`), 'Collection não existe ainda');
        }
    }
};

/**
 * Função principal
 */
const main = async () => {
    console.log(chalk.bold.blue('\n🔧 Criação de Índices do Banco de Dados\n'));
    console.log(chalk.gray('='.repeat(50)));

    await connectDB();

    await createDeviceIndexes();
    await createUserIndexes();
    await createAssetIndexes();
    await createCommandIndexes();
    await createBssidIndexes();
    await createLocationHistoryIndexes();
    await createTotemIndexes();

    console.log(chalk.gray('\n' + '='.repeat(50)));
    await listAllIndexes();
    console.log(chalk.gray('='.repeat(50)));

    console.log(chalk.bold.green('\n✅ Índices criados com sucesso!\n'));

    await mongoose.connection.close();
    console.log(chalk.gray('Conexão com MongoDB fechada.'));
    process.exit(0);
};

// Executar
main().catch((error) => {
    console.error(chalk.red('\n❌ Erro fatal:'), error);
    process.exit(1);
});
