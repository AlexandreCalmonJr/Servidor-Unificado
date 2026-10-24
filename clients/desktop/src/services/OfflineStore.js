/**
 * OfflineStore.js
 * Gerenciador de buffer de telemetria e métricas offline para o agente desktop.
 * Armazena eventos e telemetria quando a rede corporativa estiver indisponível
 * e realiza o flush em lote assim que a conectividade for restaurada.
 */

class OfflineStore {
  constructor(maxSize = 100, ttlMs = 48 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.queue = [];
  }

  enqueue(item) {
    if (!item) return;
    const entry = {
      timestamp: Date.now(),
      data: item,
    };

    // Remove itens expirados antes de adicionar
    this._pruneExpired();

    // Se atingiu tamanho máximo, descarta o mais antigo
    if (this.queue.length >= this.maxSize) {
      this.queue.shift();
    }

    this.queue.push(entry);
  }

  peekAll() {
    this._pruneExpired();
    return this.queue.map((entry) => entry.data);
  }

  size() {
    this._pruneExpired();
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }

  _pruneExpired() {
    const now = Date.now();
    this.queue = this.queue.filter((entry) => now - entry.timestamp <= this.ttlMs);
  }
}

module.exports = new OfflineStore();
