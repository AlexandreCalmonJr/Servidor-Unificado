// ===================================================================
// File: routes/diagnosticRoutes.js - ROTAS DE DIAGNÓSTICO
// ===================================================================

const express = require('express');
const locationService = require('../services/locationService');
const { Device } = require('../models/Device');
const BssidMapping = require('../models/BssidMapping');
const UnitMapping = require('../models/UnitMapping');

const diagnosticRoutes = (logger, getApiLimiter, auth) => {
  const router = express.Router();

  // ===================================================================
  // 1. DIAGNÓSTICO COMPLETO DE LOCALIZAÇÃO
  // ===================================================================
  router.get('/location-test', auth, getApiLimiter, async (req, res) => {
    try {
      const { ip, bssid, serial_number } = req.query;

      let testData = {};

      // Se forneceu serial, busca dados do dispositivo
      if (serial_number) {
        const device = await Device.findOne({ serial_number }).lean();
        if (!device) {
          return res.status(404).json({
            success: false,
            message: `Dispositivo não encontrado: ${serial_number}`
          });
        }

        testData = {
          ip_address: device.ip_address,
          mac_address_radio: device.mac_address_radio,
          device_name: device.device_name,
          current_mapping: {
            unit: device.unit,
            sector: device.sector,
            floor: device.floor
          }
        };
      } else if (ip || bssid) {
        // Testa com dados fornecidos
        testData = {
          ip_address: ip || 'N/A',
          mac_address_radio: bssid || 'N/A',
          device_name: 'Teste Manual'
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Forneça "serial_number" ou ("ip" e/ou "bssid")'
        });
      }

      // Executa diagnóstico
      const diagnostic = await locationService.diagnose(testData);

      // Executa mapeamento real
      const mappingResult = await locationService.mapDeviceLocation(testData);

      logger.info('Diagnóstico de localização executado', {
        username: req.user.username,
        test_data: testData
      });

      res.json({
        success: true,
        diagnostic,
        mapping_result: mappingResult,
        test_data: testData
      });

    } catch (error) {
      logger.error('Erro no diagnóstico', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        message: 'Erro ao executar diagnóstico',
        error: error.message
      });
    }
  });

  // ===================================================================
  // 2. LISTAR BSSIDS COM PROBLEMAS
  // ===================================================================
  router.get('/bssid-validation', auth, getApiLimiter, async (req, res) => {
    try {
      const bssids = await BssidMapping.find().lean();

      const report = {
        total: bssids.length,
        valid: 0,
        invalid: 0,
        generic: 0,
        duplicates: 0,
        details: []
      };

      const seen = new Set();
      const duplicates = new Set();

      bssids.forEach(b => {
        const normalized = locationService.normalizeMac(b.mac_address_radio);
        const isGeneric = locationService.isGenericMac(b.mac_address_radio);

        const item = {
          _id: b._id,
          original: b.mac_address_radio,
          normalized,
          sector: b.sector,
          floor: b.floor,
          unitName: b.unitName,
          status: 'ok'
        };

        if (!normalized) {
          item.status = 'invalid';
          item.error = 'Formato inválido';
          report.invalid++;
        } else if (isGeneric) {
          item.status = 'generic';
          item.error = 'MAC genérico (não identifica localização)';
          report.generic++;
        } else if (seen.has(normalized)) {
          item.status = 'duplicate';
          item.error = 'MAC duplicado';
          duplicates.add(normalized);
          report.duplicates++;
        } else {
          seen.add(normalized);
          report.valid++;
        }

        if (item.status !== 'ok') {
          report.details.push(item);
        }
      });

      logger.info('Validação de BSSIDs executada', {
        username: req.user.username,
        report: {
          total: report.total,
          valid: report.valid,
          problems: report.invalid + report.generic + report.duplicates
        }
      });

      res.json({
        success: true,
        report,
        duplicated_macs: Array.from(duplicates)
      });

    } catch (error) {
      logger.error('Erro na validação de BSSIDs', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: 'Erro na validação',
        error: error.message
      });
    }
  });

  // ===================================================================
  // 3. DISPOSITIVOS COM LOCALIZAÇÃO DESCONHECIDA
  // ===================================================================
  router.get('/unmapped-devices', auth, getApiLimiter, async (req, res) => {
    try {
      const devices = await Device.find({
        $or: [
          { unit: 'N/A' },
          { sector: 'Desconhecido' },
          { floor: 'Desconhecido' }
        ]
      })
        .select('device_name serial_number ip_address mac_address_radio unit sector floor last_seen')
        .sort({ last_seen: -1 })
        .limit(50)
        .lean();

      const analysis = await Promise.all(
        devices.map(async (device) => {
          const diagnostic = await locationService.diagnose({
            ip_address: device.ip_address,
            mac_address_radio: device.mac_address_radio
          });

          return {
            device_name: device.device_name,
            serial_number: device.serial_number,
            ip_address: device.ip_address,
            mac_address_radio: device.mac_address_radio,
            current_location: {
              unit: device.unit,
              sector: device.sector,
              floor: device.floor
            },
            last_seen: device.last_seen,
            diagnostic: {
              bssid_normalized: diagnostic.input.bssid_normalized,
              bssid_is_generic: diagnostic.input.bssid_is_generic,
              ip_found: diagnostic.ip_mapping?.found || false,
              bssid_found: diagnostic.bssid_mapping?.found || false,
              recommendations: diagnostic.recommendations
            }
          };
        })
      );

      logger.info('Análise de dispositivos não mapeados', {
        username: req.user.username,
        count: devices.length
      });

      res.json({
        success: true,
        total: devices.length,
        devices: analysis
      });

    } catch (error) {
      logger.error('Erro ao analisar dispositivos não mapeados', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: 'Erro na análise',
        error: error.message
      });
    }
  });

  // ===================================================================
  // 4. ESTATÍSTICAS DE CACHE
  // ===================================================================
  router.get('/cache-stats', auth, getApiLimiter, async (req, res) => {
    try {
      const stats = locationService.getCacheStats();

      res.json({
        success: true,
        cache: stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas',
        error: error.message
      });
    }
  });

  // ===================================================================
  // 5. INVALIDAR CACHE MANUALMENTE
  // ===================================================================
  router.post('/invalidate-cache', auth, async (req, res) => {
    try {
      locationService.invalidateCache();

      logger.info('Cache de localização invalidado', {
        username: req.user.username
      });

      res.json({
        success: true,
        message: 'Cache invalidado com sucesso. Próxima consulta recarregará os dados.'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao invalidar cache',
        error: error.message
      });
    }
  });

  // ===================================================================
  // 6. SUGESTÕES DE CADASTRO
  // ===================================================================
  router.get('/mapping-suggestions', auth, getApiLimiter, async (req, res) => {
    try {
      // Busca dispositivos com BSSID não genérico mas sem mapeamento
      const devices = await Device.find({
        mac_address_radio: {
          $exists: true,
          $nin: ['N/A', '02:00:00:00:00:00', '00:00:00:00:00:00']
        },
        $or: [
          { sector: 'Desconhecido' },
          { floor: 'Desconhecido' }
        ]
      })
        .select('device_name serial_number mac_address_radio sector floor')
        .sort({ last_seen: -1 })
        .limit(20)
        .lean();

      const existingBssids = await BssidMapping.find().lean();
      const existingMacs = new Set(
        existingBssids.map(b => locationService.normalizeMac(b.mac_address_radio))
      );

      const suggestions = devices
        .map(d => {
          const normalized = locationService.normalizeMac(d.mac_address_radio);

          if (!normalized || existingMacs.has(normalized)) {
            return null;
          }

          return {
            device_name: d.device_name,
            serial_number: d.serial_number,
            bssid_to_register: normalized,
            current_sector: d.sector,
            current_floor: d.floor,
            suggestion: `Cadastrar BSSID ${normalized} para ${d.device_name}`
          };
        })
        .filter(Boolean);

      logger.info('Sugestões de cadastro geradas', {
        username: req.user.username,
        suggestions_count: suggestions.length
      });

      res.json({
        success: true,
        suggestions,
        instructions: 'Copie os BSSIDs sugeridos e cadastre em Admin → Localizações → BSSIDs'
      });

    } catch (error) {
      logger.error('Erro ao gerar sugestões', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar sugestões',
        error: error.message
      });
    }
  });

  return router;
};

module.exports = diagnosticRoutes;