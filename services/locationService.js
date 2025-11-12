// ===================================================================
// File: services/locationService.js - VERSÃO MELHORADA
// Sistema robusto de mapeamento de localização com logs detalhados
// ===================================================================

const UnitMapping = require('../models/UnitMapping');
const BssidMapping = require('../models/BssidMapping');
const logger = require('../utils/logger');

class LocationService {
  constructor() {
    this.unitsCache = null;
    this.bssidCache = null;
    this.cacheExpiry = null;
    // CORREÇÃO (Item 17): Aumentar TTL para 10 minutos
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutos
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  // ===================================================================
  // NORMALIZAÇÃO DE MAC ADDRESS (CRÍTICO)
  // ===================================================================
  
  /**
   * Normaliza MAC address para formato padrão
   * @param {string} mac - MAC em qualquer formato
   * @returns {string} MAC normalizado (AA:BB:CC:DD:EE:FF)
   */
  normalizeMac(mac) {
    if (!mac || typeof mac !== 'string') {
      logger.debug('MAC inválido (null/undefined)', { mac });
      return null;
    }

    try {
      // Remove espaços e converte para maiúsculo
      let normalized = mac.trim().toUpperCase();

      // Remove caracteres inválidos, mantém apenas hex e separadores
      normalized = normalized.replace(/[^0-9A-F:-]/g, '');

      // Substitui separadores para padrão ':'
      normalized = normalized.replace(/[-\.]/g, ':');

      // Valida formato básico (12 dígitos hex + 5 separadores)
      if (!/^([0-9A-F]{2}[:]){5}[0-9A-F]{2}$/.test(normalized)) {
        // Tenta adicionar ':' se faltar
        if (/^[0-9A-F]{12}$/.test(normalized)) {
          normalized = normalized.match(/.{1,2}/g).join(':');
        } else {
          logger.warn('Formato de MAC inválido após normalização', { 
            original: mac, 
            normalized 
          });
          return null;
        }
      }

      logger.debug('MAC normalizado', { original: mac, normalized });
      return normalized;
    } catch (error) {
      logger.error('Erro ao normalizar MAC', { mac, error: error.message });
      return null;
    }
  }

  /**
   * Verifica se MAC é genérico (não-confiável)
   */
  isGenericMac(mac) {
    const genericMacs = [
      '02:00:00:00:00:00',
      '00:00:00:00:00:00',
      'FF:FF:FF:FF:FF:FF',
      'N/A'
    ];
    
    const normalized = this.normalizeMac(mac);
    const isGeneric = !normalized || genericMacs.includes(normalized);
    
    if (isGeneric) {
      logger.debug('MAC genérico detectado', { mac, normalized });
    }
    
    return isGeneric;
  }

  // ===================================================================
  // GESTÃO DE CACHE
  // ===================================================================

  async refreshCache() {
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async _doRefresh() {
    const startTime = Date.now();
    
    try {
      logger.info('🔄 Atualizando cache de localização...');

      const [units, bssids] = await Promise.all([
        UnitMapping.find().lean(),
        BssidMapping.find().lean()
      ]);

      // PRÉ-PROCESSA BSSIDs (normaliza uma vez só)
      const normalizedBssids = bssids.map(b => ({
        ...b,
        mac_normalized: this.normalizeMac(b.mac_address_radio)
      })).filter(b => b.mac_normalized); // Remove inválidos

      this.unitsCache = units;
      this.bssidCache = normalizedBssids;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      const duration = Date.now() - startTime;
      
      logger.info('✅ Cache de localização atualizado', {
        units: units.length,
        bssids: normalizedBssids.length,
        bssidsInvalidos: bssids.length - normalizedBssids.length,
        duration: `${duration}ms`,
        expiresIn: `${this.CACHE_TTL / 1000}s`
      });

      // Log de amostra dos BSSIDs (debug)
      if (normalizedBssids.length > 0) {
        const sample = normalizedBssids.slice(0, 3);
        logger.debug('Amostra de BSSIDs no cache:', {
          sample: sample.map(b => ({
            mac: b.mac_normalized,
            sector: b.sector,
            floor: b.floor,
            unit: b.unitName
          }))
        });
      }

    } catch (error) {
      logger.error('❌ Erro ao atualizar cache de localização', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async getCache() {
    if (!this.cacheExpiry || Date.now() > this.cacheExpiry) {
      await this.refreshCache();
    }
    return { 
      units: this.unitsCache || [], 
      bssids: this.bssidCache || [] 
    };
  }

  invalidateCache() {
    logger.info('🗑️ Cache de localização invalidado manualmente');
    this.cacheExpiry = null;
    this.unitsCache = null;
    this.bssidCache = null;
  }

  // ===================================================================
  // MAPEAMENTO DE LOCALIZAÇÃO (MELHORADO)
  // ===================================================================

  /**
   * Mapeia localização completa de um dispositivo
   */
  async mapDeviceLocation({ ip_address, mac_address_radio, device_name }) {
    const startTime = Date.now();
    
    logger.info('🔎 Iniciando mapeamento de localização', {
      device: device_name,
      ip: ip_address,
      bssid_original: mac_address_radio
    });

    const result = {
      unit: 'N/A',
      sector: 'Desconhecido',
      floor: 'Desconhecido',
      source: 'default', // Para debug
      confidence: 'low'  // low, medium, high
    };

    try {
      const { units, bssids } = await this.getCache();

      // ETAPA 1: Mapear UNIT pelo IP
      if (ip_address && ip_address !== 'N/A' && ip_address !== '0.0.0.0') {
        const unit = this._findUnitByIp(ip_address, units);
        if (unit) {
          result.unit = unit.name;
          result.source = 'ip_mapping';
          result.confidence = 'medium';
          
          logger.info('✅ Unit mapeada por IP', {
            device: device_name,
            ip: ip_address,
            unit: unit.name
          });
        } else {
          logger.warn('⚠️ IP não encontrado em nenhuma faixa cadastrada', {
            device: device_name,
            ip: ip_address,
            total_units: units.length
          });
        }
      } else {
        logger.debug('IP ausente ou inválido', { device: device_name, ip: ip_address });
      }

      // ETAPA 2: Mapear SETOR/ANDAR pelo BSSID
      if (mac_address_radio && !this.isGenericMac(mac_address_radio)) {
        const normalized = this.normalizeMac(mac_address_radio);
        
        if (normalized) {
          const bssidInfo = this._findBssidInfo(normalized, bssids);
          
          if (bssidInfo) {
            result.sector = bssidInfo.sector;
            result.floor = bssidInfo.floor;
            result.confidence = 'high';
            
            // Se BSSID tem unitName e ainda não temos unit
            if (bssidInfo.unitName && result.unit === 'N/A') {
              result.unit = bssidInfo.unitName;
              result.source = 'bssid_unit';
            } else if (bssidInfo.unitName) {
              result.source = 'ip_and_bssid';
            } else {
              result.source = 'bssid_location';
            }

            logger.info('✅ Localização mapeada por BSSID', {
              device: device_name,
              bssid: normalized,
              sector: result.sector,
              floor: result.floor,
              unit: bssidInfo.unitName || 'N/D'
            });
          } else {
            logger.warn('⚠️ BSSID não encontrado no banco', {
              device: device_name,
              bssid: normalized,
              total_bssids: bssids.length,
              sugestao: 'Cadastre em Admin → Localizações → BSSIDs'
            });

            // DEBUG: Mostra BSSIDs similares (mesmos primeiros 6 dígitos)
            const prefix = normalized.substring(0, 8); // Ex: AA:BB:CC
            const similar = bssids
              .filter(b => b.mac_normalized.startsWith(prefix))
              .slice(0, 3);
            
            if (similar.length > 0) {
              logger.debug('BSSIDs similares encontrados', {
                prefix,
                similar: similar.map(b => b.mac_normalized)
              });
            }
          }
        }
      } else {
        logger.warn('⚠️ BSSID genérico ou ausente', {
          device: device_name,
          bssid: mac_address_radio
        });
      }

      const duration = Date.now() - startTime;
      
      logger.info('📍 Resultado do mapeamento', {
        device: device_name,
        result: {
          unit: result.unit,
          sector: result.sector,
          floor: result.floor,
          source: result.source,
          confidence: result.confidence
        },
        duration: `${duration}ms`
      });

      return result;

    } catch (error) {
      logger.error('❌ Erro crítico no mapeamento de localização', {
        device: device_name,
        error: error.message,
        stack: error.stack
      });

      return result; // Retorna valores padrão
    }
  }

  // ===================================================================
  // FUNÇÕES AUXILIARES
  // ===================================================================

  _findUnitByIp(ip, units) {
    if (!ip || ip === 'N/A' || ip === '0.0.0.0') return null;
    
    try {
      const ipNum = this._ipToInt(ip);
      
      return units.find(unit => {
        if (!unit.ip_ranges || !Array.isArray(unit.ip_ranges)) {
          return false;
        }

        return unit.ip_ranges.some(range => {
          const startNum = this._ipToInt(range.start);
          const endNum = this._ipToInt(range.end);

          if (startNum === 0 || endNum === 0) return false;
          if (startNum > endNum) {
            logger.warn('Faixa de IP inválida', {
              unit: unit.name,
              range: `${range.start} - ${range.end}`
            });
            return false;
          }

          return ipNum >= startNum && ipNum <= endNum;
        });
      });

    } catch (error) {
      logger.warn('Erro ao processar IP', { ip, error: error.message });
      return null;
    }
  }

  _findBssidInfo(normalizedMac, bssids) {
    if (!normalizedMac) return null;
    
    // Busca direta (cache já tem MACs normalizados)
    return bssids.find(b => b.mac_normalized === normalizedMac);
  }

  _ipToInt(ip) {
    if (!ip) return 0;
    
    try {
      const parts = ip.split('.').map(Number);
      
      if (parts.length !== 4) return 0;
      if (parts.some(p => isNaN(p) || p < 0 || p > 255)) return 0;
      
      return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    } catch (error) {
      return 0;
    }
  }

  // ===================================================================
  // VALIDAÇÕES
  // ===================================================================

  isValidIp(ip) {
    if (!ip || typeof ip !== 'string') return false;
    
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  isValidMac(mac) {
    const normalized = this.normalizeMac(mac);
    return normalized !== null && !this.isGenericMac(mac);
  }

  // ===================================================================
  // DIAGNÓSTICO
  // ===================================================================

  getCacheStats() {
    const now = Date.now();
    const isExpired = !this.cacheExpiry || now > this.cacheExpiry;
    const timeUntilExpiry = this.cacheExpiry ? Math.max(0, this.cacheExpiry - now) : 0;

    return {
      isValid: !isExpired,
      unitsCount: this.unitsCache?.length || 0,
      bssidsCount: this.bssidCache?.length || 0,
      expiresIn: isExpired ? 0 : Math.floor(timeUntilExpiry / 1000),
      lastRefresh: this.cacheExpiry ? new Date(this.cacheExpiry - this.CACHE_TTL) : null,
    };
  }

  /**
   * Diagnóstico completo de mapeamento
   */
  async diagnose({ ip_address, mac_address_radio }) {
    const { units, bssids } = await this.getCache();
    
    const report = {
      timestamp: new Date().toISOString(),
      cache: this.getCacheStats(),
      input: {
        ip: ip_address,
        bssid_original: mac_address_radio,
        bssid_normalized: this.normalizeMac(mac_address_radio),
        bssid_is_generic: this.isGenericMac(mac_address_radio)
      },
      ip_mapping: null,
      bssid_mapping: null,
      recommendations: []
    };

    // Testa mapeamento de IP
    if (this.isValidIp(ip_address)) {
      const unit = this._findUnitByIp(ip_address, units);
      report.ip_mapping = unit ? {
        found: true,
        unit: unit.name,
        ranges: unit.ip_ranges
      } : {
        found: false,
        total_units: units.length
      };

      if (!unit) {
        report.recommendations.push('Cadastre a faixa de IP em Admin → Unidades');
      }
    } else {
      report.recommendations.push('IP inválido ou ausente');
    }

    // Testa mapeamento de BSSID
    const normalized = this.normalizeMac(mac_address_radio);
    if (normalized && !this.isGenericMac(mac_address_radio)) {
      const bssid = this._findBssidInfo(normalized, bssids);
      report.bssid_mapping = bssid ? {
        found: true,
        sector: bssid.sector,
        floor: bssid.floor,
        unit: bssid.unitName
      } : {
        found: false,
        total_bssids: bssids.length
      };

      if (!bssid) {
        report.recommendations.push(`Cadastre o BSSID ${normalized} em Admin → BSSIDs`);
        
        // Busca similares
        const prefix = normalized.substring(0, 8);
        const similar = bssids.filter(b => b.mac_normalized.startsWith(prefix));
        if (similar.length > 0) {
          report.similar_bssids = similar.map(b => b.mac_normalized).slice(0, 5);
          report.recommendations.push(`Existem ${similar.length} BSSIDs com prefixo similar (${prefix})`);
        }
      }
    } else {
      report.recommendations.push('BSSID genérico ou inválido');
    }

    return report;
  }
}

// Exporta como singleton
module.exports = new LocationService();