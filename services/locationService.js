// services/locationService.js - VERSÃO CORRIGIDA COM MAC PARCIAL
const UnitMapping = require('../models/UnitMapping');
const BssidMapping = require('../models/BssidMapping');
const logger = require('../utils/logger');

class LocationService {
  constructor() {
    this.unitsCache = null;
    this.bssidCache = null;
    this.cacheExpiry = null;
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutos
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  // ===================================================================
  // NORMALIZAÇÃO DE MAC ADDRESS
  // ===================================================================
  
  normalizeMac(mac) {
    if (!mac || typeof mac !== 'string') {
      logger.debug('MAC inválido (null/undefined)', { mac });
      return null;
    }

    try {
      let normalized = mac.trim().toUpperCase();
      normalized = normalized.replace(/[^0-9A-F:-]/g, '');
      normalized = normalized.replace(/[-\.]/g, ':');

      if (!/^([0-9A-F]{2}[:]){5}[0-9A-F]{2}$/.test(normalized)) {
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
   * 🆕 NOVA FUNÇÃO: Extrai o prefixo do MAC (primeiros 14 caracteres)
   * Exemplo: AA:BB:CC:DD:EE:FF → AA:BB:CC:DD
   */
  getMacPrefix(mac) {
    const normalized = this.normalizeMac(mac);
    if (!normalized) return null;
    
    // Pega os primeiros 14 caracteres (AA:BB:CC:DD)
    // Isso ignora os últimos 5 caracteres (:EE:FF)
    const prefix = normalized.substring(0, 14);
    
    logger.debug('Prefixo MAC extraído', { 
      original: mac, 
      normalized, 
      prefix 
    });
    
    return prefix;
  }

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

      // 🆕 MODIFICAÇÃO: Pré-processa BSSIDs com prefixo também
      const normalizedBssids = bssids.map(b => {
        const mac_normalized = this.normalizeMac(b.mac_address_radio);
        const mac_prefix = mac_normalized ? mac_normalized.substring(0, 14) : null;
        
        return {
          ...b,
          mac_normalized,
          mac_prefix // 🆕 Adiciona o prefixo para busca parcial
        };
      }).filter(b => b.mac_normalized && b.mac_prefix); // Remove inválidos

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

      if (normalizedBssids.length > 0) {
        const sample = normalizedBssids.slice(0, 3);
        logger.debug('Amostra de BSSIDs no cache:', {
          sample: sample.map(b => ({
            mac_full: b.mac_normalized,
            mac_prefix: b.mac_prefix, // 🆕
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
  // MAPEAMENTO DE LOCALIZAÇÃO (MODIFICADO)
  // ===================================================================

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
      source: 'default',
      confidence: 'low'
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

      // 🆕 ETAPA 2: Mapear SETOR/ANDAR pelo BSSID (BUSCA PARCIAL)
      if (mac_address_radio && !this.isGenericMac(mac_address_radio)) {
        const normalized = this.normalizeMac(mac_address_radio);
        
        if (normalized) {
          const prefix = normalized.substring(0, 14); // AA:BB:CC:DD
          
          // 🆕 TENTA BUSCA EXATA PRIMEIRO
          let bssidInfo = this._findBssidInfoExact(normalized, bssids);
          
          // 🆕 SE NÃO ENCONTRAR, TENTA BUSCA POR PREFIXO
          if (!bssidInfo) {
            bssidInfo = this._findBssidInfoByPrefix(prefix, bssids);
            
            if (bssidInfo) {
              logger.info('✅ Localização encontrada por PREFIXO do BSSID', {
                device: device_name,
                bssid_full: normalized,
                bssid_prefix: prefix,
                matched_full: bssidInfo.mac_normalized,
                sector: bssidInfo.sector,
                floor: bssidInfo.floor
              });
            }
          } else {
            logger.info('✅ Localização encontrada por BSSID EXATO', {
              device: device_name,
              bssid: normalized,
              sector: bssidInfo.sector,
              floor: bssidInfo.floor
            });
          }
          
          if (bssidInfo) {
            result.sector = bssidInfo.sector;
            result.floor = bssidInfo.floor;
            result.confidence = 'high';
            
            if (bssidInfo.unitName && result.unit === 'N/A') {
              result.unit = bssidInfo.unitName;
              result.source = 'bssid_unit';
            } else if (bssidInfo.unitName) {
              result.source = 'ip_and_bssid';
            } else {
              result.source = 'bssid_location';
            }
          } else {
            logger.warn('⚠️ BSSID não encontrado (nem exato nem por prefixo)', {
              device: device_name,
              bssid_full: normalized,
              bssid_prefix: prefix,
              total_bssids: bssids.length,
              sugestao: 'Cadastre o prefixo em Admin → Localizações → BSSIDs'
            });

            // DEBUG: Mostra BSSIDs com mesmo prefixo
            const similar = bssids
              .filter(b => b.mac_prefix === prefix)
              .slice(0, 3);
            
            if (similar.length > 0) {
              logger.debug('BSSIDs com mesmo prefixo encontrados', {
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

      return result;
    }
  }

  // ===================================================================
  // FUNÇÕES AUXILIARES (MODIFICADAS)
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

  /**
   * 🆕 Busca EXATA por MAC completo (comportamento antigo)
   */
  _findBssidInfoExact(normalizedMac, bssids) {
    if (!normalizedMac) return null;
    return bssids.find(b => b.mac_normalized === normalizedMac);
  }

  /**
   * 🆕 Busca por PREFIXO do MAC (primeiros 14 caracteres)
   */
  _findBssidInfoByPrefix(macPrefix, bssids) {
    if (!macPrefix) return null;
    
    // Retorna o primeiro BSSID que tenha o mesmo prefixo
    return bssids.find(b => b.mac_prefix === macPrefix);
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
  // DIAGNÓSTICO (ATUALIZADO)
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

  async diagnose({ ip_address, mac_address_radio }) {
    const { units, bssids } = await this.getCache();
    
    const normalized = this.normalizeMac(mac_address_radio);
    const prefix = normalized ? normalized.substring(0, 14) : null;
    
    const report = {
      timestamp: new Date().toISOString(),
      cache: this.getCacheStats(),
      input: {
        ip: ip_address,
        bssid_original: mac_address_radio,
        bssid_normalized: normalized,
        bssid_prefix: prefix, // 🆕
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

    // 🆕 Testa mapeamento de BSSID (exato e parcial)
    if (normalized && !this.isGenericMac(mac_address_radio)) {
      let bssid = this._findBssidInfoExact(normalized, bssids);
      let matchType = 'exact';
      
      if (!bssid && prefix) {
        bssid = this._findBssidInfoByPrefix(prefix, bssids);
        matchType = 'prefix';
      }
      
      report.bssid_mapping = bssid ? {
        found: true,
        match_type: matchType, // 🆕
        matched_mac: bssid.mac_normalized,
        sector: bssid.sector,
        floor: bssid.floor,
        unit: bssid.unitName
      } : {
        found: false,
        total_bssids: bssids.length
      };

      if (!bssid) {
        report.recommendations.push(`Cadastre o BSSID ${normalized} (ou prefixo ${prefix}) em Admin → BSSIDs`);
        
        // Busca similares por prefixo
        const similar = bssids.filter(b => b.mac_prefix === prefix);
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

module.exports = new LocationService();