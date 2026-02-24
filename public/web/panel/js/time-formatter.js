/**
 * Time Formatter - Formata datas para "Há X tempo"
 * Exemplo: 5 minutos atrás → "Há 5m"
 */

class TimeFormatter {
  static formatTimeAgo(date) {
    if (!date) return '—';
    
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'agora';
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `há ${Math.floor(seconds / 86400)}d`;
    
    return then.toLocaleDateString('pt-BR');
  }

  static formatDateTime(date) {
    if (!date) return '—';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getStatusBadge(status) {
    const badges = {
      'online': { icon: '🟢', color: '#4caf50', label: 'Online', bg: '#e8f5e9' },
      'offline': { icon: '🔴', color: '#f44336', label: 'Offline', bg: '#ffebee' },
      'maintenance': { icon: '🟡', color: '#ff9800', label: 'Manutenção', bg: '#fff3e0' },
      'retired': { icon: '⚫', color: '#999', label: 'Aposentado', bg: '#f5f5f5' },
      'unknown': { icon: '⚪', color: '#9e9e9e', label: 'Desconhecido', bg: '#fafafa' },
    };
    return badges[status] || badges['unknown'];
  }

  static getHealthColor(online, total) {
    if (total === 0) return '#999';
    const percentage = (online / total) * 100;
    if (percentage >= 80) return '#4caf50'; // Verde
    if (percentage >= 60) return '#8bc34a'; // Verde claro
    if (percentage >= 40) return '#ff9800'; // Laranja
    if (percentage >= 20) return '#ff7043'; // Laranja escuro
    return '#f44336'; // Vermelho
  }

  static createStatusBadgeHTML(status) {
    const badge = this.getStatusBadge(status);
    return `
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        background: ${badge.bg};
        color: ${badge.color};
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      ">
        ${badge.icon} ${badge.label}
      </span>
    `;
  }

  static createHealthBarHTML(online, total, height = '8px') {
    if (total === 0) {
      return `
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="flex: 1; height: ${height}; background: #e0e0e0; border-radius: 4px;"></div>
          <span style="font-size: 12px; color: #999; min-width: 30px;">N/A</span>
        </div>
      `;
    }

    const percentage = (online / total) * 100;
    const color = this.getHealthColor(online, total);

    return `
      <div style="display: flex; gap: 8px; align-items: center;">
        <div style="flex: 1; height: ${height}; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
          <div style="
            width: ${percentage}%;
            height: 100%;
            background: ${color};
            transition: width 0.3s ease;
            border-radius: 4px;
          "></div>
        </div>
        <span style="font-size: 12px; color: ${color}; font-weight: bold; min-width: 35px;">
          ${Math.round(percentage)}%
        </span>
      </div>
    `;
  }

  static createSkeletonHTML(width = '100%', height = '20px') {
    return `
      <div style="
        width: ${width};
        height: ${height};
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
      "></div>
      <style>
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    `;
  }
}

// Exportar para uso em HTML inline
window.TimeFormatter = TimeFormatter;
