// routes/diagnosticRoutes.js
const express = require('express');
const locationService = require('../services/locationService');
const ManagedAsset = require('../models/ManagedAsset');
const BssidMapping = require('../models/BssidMapping');
const UnitMapping = require('../models/UnitMapping');

const diagnosticRoutes = (logger, getApiLimiter, auth) => {
  const router = express.Router();

  // ── 1. Diagnóstico completo de localização ───────────────────────
  router.get('/location-test', auth, getApiLimiter, async (req, res) => {
    try {
      const { ip, bssid, serial_number } = req.query;
      let testData = {};

      if (serial_number) {
        const asset = await ManagedAsset.findOne({ serial_number }).lean();
        if (!asset) return res.status(404).json({ success: false, message: `Dispositivo não encontrado: ${serial_number}` });
        testData = {
          ip_address: asset.ip_address,
          mac_address_radio: asset.mac_address,
          device_name: asset.asset_name,
          current_mapping: { unit: asset.unit, sector: asset.sector, floor: asset.floor },
        };
      } else if (ip || bssid) {
        testData = { ip_address: ip || 'N/A', mac_address_radio: bssid || 'N/A', device_name: 'Teste Manual' };
      } else {
        return res.status(400).json({ success: false, message: 'Forneça "serial_number" ou ("ip" e/ou "bssid")' });
      }

      const [diagnostic, mappingResult] = await Promise.all([
        locationService.diagnose(testData),
        locationService.mapDeviceLocation(testData),
      ]);

      res.json({ success: true, diagnostic, mapping_result: mappingResult, test_data: testData });
    } catch (error) {
      logger.error('Erro no diagnóstico', { error: error.message });
      res.status(500).json({ success: false, message: 'Erro ao executar diagnóstico', error: error.message });
    }
  });

  // ── 2. Validação de BSSIDs com problemas ─────────────────────────
  router.get('/bssid-validation', auth, getApiLimiter, async (req, res) => {
    try {
      const bssids = await BssidMapping.find().lean();
      const report = { total: bssids.length, valid: 0, invalid: 0, generic: 0, duplicates: 0, details: [] };
      const seen = new Set();

      bssids.forEach(b => {
        const normalized = locationService.normalizeMac(b.mac_address_radio);
        const isGeneric = locationService.isGenericMac(b.mac_address_radio);
        const item = { _id: b._id, original: b.mac_address_radio, normalized, sector: b.sector, floor: b.floor, unitName: b.unitName, status: 'ok' };

        if (!normalized) { item.status = 'invalid'; item.error = 'Formato inválido'; report.invalid++; }
        else if (isGeneric) { item.status = 'generic'; item.error = 'MAC genérico'; report.generic++; }
        else if (seen.has(normalized)) { item.status = 'duplicate'; item.error = 'MAC duplicado'; report.duplicates++; }
        else { seen.add(normalized); report.valid++; }

        if (item.status !== 'ok') report.details.push(item);
      });

      res.json({ success: true, report });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro na validação', error: error.message });
    }
  });

  // ── 3. Dispositivos com localização desconhecida ──────────────────
  router.get('/unmapped-devices', auth, getApiLimiter, async (req, res) => {
    try {
      const assets = await ManagedAsset.find({
        $or: [{ unit: 'N/A' }, { sector: 'Desconhecido' }, { floor: 'Desconhecido' }],
      })
        .select('asset_name serial_number ip_address mac_address unit sector floor last_seen')
        .sort({ last_seen: -1 })
        .limit(50)
        .lean();

      const analysis = await Promise.all(
        assets.map(async (asset) => {
          const diagnostic = await locationService.diagnose({
            ip_address: asset.ip_address,
            mac_address_radio: asset.mac_address,
          });
          return {
            asset_name: asset.asset_name,
            serial_number: asset.serial_number,
            ip_address: asset.ip_address,
            mac_address: asset.mac_address,
            current_location: { unit: asset.unit, sector: asset.sector, floor: asset.floor },
            last_seen: asset.last_seen,
            diagnostic: {
              bssid_normalized: diagnostic.input.bssid_normalized,
              bssid_is_generic: diagnostic.input.bssid_is_generic,
              ip_found: diagnostic.ip_mapping?.found || false,
              bssid_found: diagnostic.bssid_mapping?.found || false,
              recommendations: diagnostic.recommendations,
            },
          };
        })
      );

      res.json({ success: true, total: assets.length, devices: analysis });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro na análise', error: error.message });
    }
  });

  // ── 4. Estatísticas de cache ──────────────────────────────────────
  router.get('/cache-stats', auth, getApiLimiter, async (req, res) => {
    try {
      res.json({ success: true, cache: locationService.getCacheStats() });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao obter estatísticas', error: error.message });
    }
  });

  // ── 5. Invalidar cache manualmente ───────────────────────────────
  router.post('/invalidate-cache', auth, async (req, res) => {
    try {
      locationService.invalidateCache();
      logger.info('Cache de localização invalidado', { username: req.user.username });
      res.json({ success: true, message: 'Cache invalidado com sucesso.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao invalidar cache', error: error.message });
    }
  });

  // ── 6. Sugestões de cadastro de BSSID ────────────────────────────
  router.get('/mapping-suggestions', auth, getApiLimiter, async (req, res) => {
    try {
      const assets = await ManagedAsset.find({
        mac_address: { $exists: true, $nin: ['N/A', '02:00:00:00:00:00', '00:00:00:00:00:00'] },
        $or: [{ sector: 'Desconhecido' }, { floor: 'Desconhecido' }],
      })
        .select('asset_name serial_number mac_address sector floor')
        .sort({ last_seen: -1 })
        .limit(20)
        .lean();

      const existingBssids = await BssidMapping.find().lean();
      const existingMacs = new Set(existingBssids.map(b => locationService.normalizeMac(b.mac_address_radio)));

      const suggestions = assets
        .map(a => {
          const normalized = locationService.normalizeMac(a.mac_address);
          if (!normalized || existingMacs.has(normalized)) return null;
          return {
            asset_name: a.asset_name,
            serial_number: a.serial_number,
            bssid_to_register: normalized,
            current_sector: a.sector,
            current_floor: a.floor,
            suggestion: `Cadastrar BSSID ${normalized} para ${a.asset_name}`,
          };
        })
        .filter(Boolean);

      res.json({ success: true, suggestions, instructions: 'Cadastre em Admin → Localizações → BSSIDs' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao gerar sugestões', error: error.message });
    }
  });

  return router;
};

module.exports = diagnosticRoutes;
