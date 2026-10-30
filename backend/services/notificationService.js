// services/notificationService.js
/**
 * Serviço de Notificações
 * Emite eventos via WebSocket para UI em tempo real
 */

const WebSocketServer = require('./websocketServer');

class NotificationService {
  /**
   * Notifica sobre novo token de provisionamento criado
   */
  static notifyTokenCreated(token, organization, configProfile) {
    // Dados de provisionamento só para o painel (S9: dispositivos não devem ver)
    WebSocketServer.broadcastToPanel({
      type: 'notification',
      category: 'provisioning',
      event: 'token_created',
      title: '🔑 Novo Token de Provisionamento',
      message: `Token gerado para ${organization} com perfil ${configProfile}`,
      data: {
        organization,
        configProfile,
      },
      severity: 'info',
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre novo dispositivo provisionado
   */
  static notifyDeviceEnrolled(deviceName, serialNumber, organization) {
    // Dados de provisionamento só para o painel (S9)
    WebSocketServer.broadcastToPanel({
      type: 'notification',
      category: 'provisioning',
      event: 'device_enrolled',
      title: '📱 Dispositivo Provisionado',
      message: `${deviceName} foi adicionado a ${organization}`,
      data: {
        deviceName,
        organization,
      },
      severity: 'success',
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre comando executado
   */
  static notifyCommandExecuted(deviceName, commandType, status) {
    WebSocketServer.broadcastToPanel({
      type: 'notification',
      category: 'commands',
      event: 'command_executed',
      title: `⌨️ Comando ${status === 'success' ? 'Executado' : 'Falhou'}`,
      message: `${deviceName}: ${commandType} - ${status.toUpperCase()}`,
      data: {
        deviceName,
        commandType,
        status,
      },
      severity: status === 'success' ? 'success' : 'error',
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre mudança de status do dispositivo
   */
  static notifyDeviceStatusChanged(deviceName, oldStatus, newStatus) {
    const statusMap = {
      online: '🟢 Online',
      offline: '🔴 Offline',
      maintenance: '🟡 Manutenção',
    };

    WebSocketServer.notifyAll({
      type: 'notification',
      category: 'device',
      event: 'device_status_changed',
      title: '📊 Status do Dispositivo Alterado',
      message: `${deviceName}: ${statusMap[oldStatus]} → ${statusMap[newStatus]}`,
      data: {
        deviceName,
        oldStatus,
        newStatus,
      },
      severity: newStatus === 'online' ? 'success' : newStatus === 'offline' ? 'warning' : 'info',
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre erro crítico
   */
  static notifyError(title, message, severity = 'error') {
    WebSocketServer.notifyAll({
      type: 'notification',
      category: 'system',
      event: 'error',
      title: `❌ ${title}`,
      message,
      severity,
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre sucesso de operação
   */
  static notifySuccess(title, message) {
    WebSocketServer.notifyAll({
      type: 'notification',
      category: 'system',
      event: 'success',
      title: `✅ ${title}`,
      message,
      severity: 'success',
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre operação em progresso
   */
  static notifyProgress(title, message, progress = null) {
    WebSocketServer.notifyAll({
      type: 'notification',
      category: 'system',
      event: 'progress',
      title: `⏳ ${title}`,
      message,
      data: { progress },
      severity: 'info',
      timestamp: new Date(),
    });
  }

  /**
   * Notifica usuário específico
   */
  static notifyUser(userId, title, message, category = 'info', data = {}) {
    WebSocketServer.notifyUser(userId, {
      type: 'notification',
      category,
      title,
      message,
      data,
      severity: category,
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre atualização de dashboard
   */
  static notifyDashboardUpdate(moduleId, stats) {
    WebSocketServer.broadcastToPanel({
      type: 'dashboard_update',
      moduleId,
      stats,
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre novo comando na fila
   */
  static notifyCommandQueued(deviceName, commandType, priority = 'normal') {
    WebSocketServer.broadcastToPanel({
      type: 'notification',
      category: 'commands',
      event: 'command_queued',
      title: '⏳ Comando Enfileirado',
      message: `${deviceName}: ${commandType} (${priority})`,
      data: {
        deviceName,
        commandType,
        priority,
      },
      severity: 'info',
      timestamp: new Date(),
    });
  }

  /**
   * Notifica sobre filtro salvo
   */
  static notifyFilterSaved(userId, filterName, moduleId) {
    WebSocketServer.notifyUser(userId, {
      type: 'notification',
      category: 'filters',
      event: 'filter_saved',
      title: '💾 Filtro Salvo',
      message: `Filtro "${filterName}" salvo para o módulo`,
      data: {
        filterName,
        moduleId,
      },
      severity: 'success',
    });
  }
}

module.exports = NotificationService;
