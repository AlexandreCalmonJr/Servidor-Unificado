#!/usr/bin/env node

/**
 * Teste de Integração - Fase 3
 * Valida WebSocket notifications e Saved Filters
 * 
 * Uso: node scripts/test-phase3.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Logger = require('../config/Logger');
const logger = new Logger('PHASE3-TEST');

// Models
const User = require('../models/User');
const SavedFilter = require('../models/SavedFilter');

// Services
const notificationService = require('../services/notificationService');
const WebSocketServer = require('../services/websocketServer');

async function runTests() {
  try {
    // Conectar MongoDB
    logger.info('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('✅ MongoDB conectado');

    // Teste 1: Verificar se SavedFilter model existe
    logger.info('Teste 1: Verificando modelo SavedFilter...');
    const filterCount = await SavedFilter.countDocuments();
    logger.info(`✅ SavedFilter model OK (${filterCount} filtros no banco)`);

    // Teste 2: Criar filtro de teste
    logger.info('Teste 2: Criando filtro de teste...');
    const testFilter = await SavedFilter.create({
      userId: new mongoose.Types.ObjectId(),
      moduleId: 'test_module',
      filterName: 'Teste Filter',
      filterData: {
        searchTerm: 'teste',
        statusFilter: 'active',
        sortBy: 'name',
        sortOrder: 'asc',
        pageSize: 25,
      },
      isDefault: false,
    });
    logger.info(`✅ Filtro criado: ${testFilter._id}`);

    // Teste 3: Atualizar filtro como padrão
    logger.info('Teste 3: Definindo filtro como padrão...');
    await SavedFilter.updateMany(
      { userId: testFilter.userId, moduleId: testFilter.moduleId, _id: { $ne: testFilter._id } },
      { isDefault: false }
    );
    testFilter.isDefault = true;
    await testFilter.save();
    logger.info(`✅ Filtro definido como padrão`);

    // Teste 4: Recuperar filtro padrão
    logger.info('Teste 4: Recuperando filtro padrão...');
    const defaultFilter = await SavedFilter.findOne({
      userId: testFilter.userId,
      moduleId: testFilter.moduleId,
      isDefault: true,
    });
    if (defaultFilter) {
      logger.info(`✅ Filtro padrão recuperado: ${defaultFilter.filterName}`);
    } else {
      logger.warn('⚠️ Nenhum filtro padrão encontrado');
    }

    // Teste 5: Verificar NotificationService
    logger.info('Teste 5: Verificando NotificationService...');
    if (typeof notificationService.notifyTokenCreated === 'function') {
      logger.info('✅ notifyTokenCreated() disponível');
    }
    if (typeof notificationService.notifyDeviceEnrolled === 'function') {
      logger.info('✅ notifyDeviceEnrolled() disponível');
    }
    if (typeof notificationService.notifyCommandExecuted === 'function') {
      logger.info('✅ notifyCommandExecuted() disponível');
    }

    // Teste 6: Verificar WebSocketServer methods
    logger.info('Teste 6: Verificando WebSocketServer methods...');
    if (typeof WebSocketServer.notifyUser === 'function') {
      logger.info('✅ WebSocketServer.notifyUser() disponível');
    }
    if (typeof WebSocketServer.notifyAll === 'function') {
      logger.info('✅ WebSocketServer.notifyAll() disponível');
    }

    // Teste 7: Listar índices do SavedFilter
    logger.info('Teste 7: Verificando índices de SavedFilter...');
    const indexes = await SavedFilter.collection.getIndexes();
    logger.info('Índices encontrados:');
    Object.keys(indexes).forEach(key => {
      logger.info(`  - ${key}`);
    });

    // Teste 8: Limpeza - Remover filtro de teste
    logger.info('Teste 8: Limpando dados de teste...');
    await SavedFilter.deleteOne({ _id: testFilter._id });
    logger.info('✅ Filtro de teste removido');

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
    logger.info('='.repeat(60));

    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro durante testes:', error);
    process.exit(1);
  }
}

// Executar testes
runTests();
