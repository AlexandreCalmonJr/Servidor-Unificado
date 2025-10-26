// services/locationService.js - SERVIÇO DE MAPEAMENTO DE LOCALIZAÇÃO COM CACHE
const UnitMapping = require('../models/UnitMapping');
const BssidMapping = require('../models/BssidMapping');
const logger = require('../utils/logger');

class LocationService {
  constructor() {
    this.unitsCache = null;
    this.bssidCache = null;
    this.cacheExpiry = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Atualiza o cache de unidades e BSSIDs
   */
  async refreshCache() {
    // Evita múltiplas chamadas simultâneas
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
      logger.debug('Atualizando cache de localização...');

      const [units, bssids] = await Promise.all([
        UnitMapping.find().lean(),
        BssidMapping.find().lean()
      ]);

      this.unitsCache = units;
      this.bssidCache = bssids;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      const duration = Date.now() - startTime;
      logger.info('Cache de localização atualizado', {
        units: units.length,
        bssids: bssids.length,
        duration: `${duration}ms`,
        expiresIn: `${this.CACHE_TTL / 1000}s`
      });

    } catch (error) {
      logger.error('Erro ao atualizar cache de localização:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Retorna o cache, atualizando se necessário
   */
  async getCache() {
    if (!this.cacheExpiry || Date.now() > this.cacheExpiry) {
      await this.refreshCache();
    }
    return { 
      units: this.unitsCache || [], 
      bssids: this.bssidCache || [] 
    };
  }

  /**
   * Invalida o cache manualmente (útil após criar/atualizar mapeamentos)
   */
  invalidateCache() {
    logger.debug('Cache de localização invalidado manualmente');
    this.cacheExpiry = null;
    this.unitsCache = null;
    this.bssidCache = null;
  }

  /**
   * Mapeia a localização de um dispositivo baseado em IP e BSSID
   * @param {Object} deviceData - Dados do dispositivo
   * @param {string} deviceData.ip_address - Endereço IP
   * @param {string} deviceData.mac_address_radio - BSSID (MAC do rádio WiFi)
   * @param {string} deviceData.device_name - Nome do dispositivo (para logs)
   * @returns {Object} { unit, sector, floor }
   */
  async mapDeviceLocation({ ip_address, mac_address_radio, device_name }) {
    const startTime = Date.now();
    
    try {
      const { units, bssids } = await this.getCache();

      // Mapeamento por IP (prioridade para Unit)
      const unit = this._findUnitByIp(ip_address, units);
      
      // Mapeamento por BSSID (para setor/andar)
      const bssidInfo = this._findBssidInfo(mac_address_radio, bssids);

      const result = {
        unit: unit?.name || bssidInfo?.unitName || 'N/A',
        sector: bssidInfo?.sector || 'Desconhecido',
        floor: bssidInfo?.floor || 'Desconhecido',
      };

      const duration = Date.now() - startTime;
      
      logger.debug('Localização mapeada', {
        device: device_name,
        ip: ip_address,
        bssid: mac_address_radio,
        result,
        duration: `${duration}ms`
      });

      return result;

    } catch (error) {
      logger.error('Erro ao mapear localização', {
        device: device_name,
        ip: ip_address,
        bssid: mac_address_radio,
        error: error.message
      });

      // Retorna valores padrão em caso de erro
      return {
        unit: 'N/A',
        sector: 'Desconhecido',
        floor: 'Desconhecido',
      };
    }
  }

  /**
   * Encontra a unidade pelo endereço IP
   * @private
   */
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

          // Validação
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
   * Encontra informações de BSSID pelo endereço MAC
   * @private
   */
  _findBssidInfo(mac, bssids) {
    if (!mac || mac === 'N/A' || mac === '00:00:00:00:00:00') return null;
    
    try {
      const normalized = mac.toUpperCase().replace(/-/g, ':').replace(/\./g, ':');
      
      return bssids.find(b => {
        const bssidNormalized = b.mac_address_radio
          .toUpperCase()
          .replace(/-/g, ':')
          .replace(/\./g, ':');
        
        return bssidNormalized === normalized;
      });

    } catch (error) {
      logger.warn('Erro ao processar BSSID', { mac, error: error.message });
      return null;
    }
  }

  /**
   * Converte IP string para número inteiro
   * @private
   */
  _ipToInt(ip) {
    if (!ip) return 0;
    
    try {
      const parts = ip.split('.').map(Number);
      
      // Validação básica
      if (parts.length !== 4) return 0;
      if (parts.some(p => isNaN(p) || p < 0 || p > 255)) return 0;
      
      return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    } catch (error) {
      return 0;
    }
  }

  /**
   * Valida se um IP está em formato válido
   */
  isValidIp(ip) {
    if (!ip || typeof ip !== 'string') return false;
    
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * Valida se um MAC está em formato válido
   */
  isValidMac(mac) {
    if (!mac || typeof mac !== 'string') return false;
    
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }

  /**
   * Retorna estatísticas do cache
   */
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
}

// Exporta como singleton
module.exports = new LocationService();