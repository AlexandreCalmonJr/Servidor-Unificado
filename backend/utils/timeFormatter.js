/**
 * utils/timeFormatter.js
 * Formata timestamps em "há X tempo"
 */

function formatTimeAgo(date) {
  if (!date) return 'Nunca';
  
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Agora';
  if (minutes < 60) return `há ${minutes}min`;
  if (hours < 24) return `há ${hours}h`;
  if (days < 30) return `há ${days}d`;
  
  return new Date(date).toLocaleDateString('pt-BR');
}

function getHealthColor(minutesSinceLastSeen) {
  if (minutesSinceLastSeen < 5) return '#10b981'; // Verde
  if (minutesSinceLastSeen < 30) return '#f59e0b'; // Amarelo
  if (minutesSinceLastSeen < 60) return '#f97316'; // Laranja
  return '#ef4444'; // Vermelho
}

function getStatusBadge(status) {
  const badges = {
    'online': { icon: '🟢', label: 'Online', color: '#10b981' },
    'offline': { icon: '🔴', label: 'Offline', color: '#ef4444' },
    'maintenance': { icon: '🟡', label: 'Manutenção', color: '#f59e0b' },
    'unknown': { icon: '⚫', label: 'Desconhecido', color: '#6b7280' }
  };
  return badges[status] || badges['unknown'];
}

module.exports = {
  formatTimeAgo,
  getHealthColor,
  getStatusBadge
};
