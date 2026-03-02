/**
 * Dashboard Cards Component
 * Cards de status em tempo real para cada módulo
 */

class DashboardCards {
  constructor() {
    this.container = document.getElementById('dashboard-cards');
    this.updateInterval = null;
    this.modules = [];
  }

  async init() {
    console.log('🎨 Inicializando Dashboard Cards...');
    await this.loadModules();
    this.render();
    this.startAutoUpdate();
  }

  async loadModules() {
    try {
      const data = await API.get('/modules');
      this.modules = data.modules || [];
      console.log(`📊 ${this.modules.length} módulos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar módulos:', error);
    }
  }

  async getModuleStats(moduleId) {
    try {
      return await API.get(`/modules/${moduleId}/stats`);
    } catch (error) {
      console.error(`❌ Erro ao buscar stats do módulo ${moduleId}:`, error);
      return null;
    }
  }

  getHealthColor(online, total) {
    if (total === 0) return '#999';
    const percentage = (online / total) * 100;
    if (percentage >= 80) return '#4caf50'; // Verde
    if (percentage >= 50) return '#ff9800'; // Laranja
    return '#f44336'; // Vermelho
  }

  getStatusBadge(status) {
    const badges = {
      online: { icon: '🟢', color: '#4caf50', label: 'Online' },
      offline: { icon: '🔴', color: '#f44336', label: 'Offline' },
      maintenance: { icon: '🟡', color: '#ff9800', label: 'Manutenção' },
    };
    return badges[status] || { icon: '⚪', color: '#999', label: 'Desconhecido' };
  }

  formatPercentage(value, total) {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }

  async render() {
    if (!this.container) {
      console.warn('⚠️ Container #dashboard-cards não encontrado');
      return;
    }

    this.container.innerHTML = '<div style="text-align: center; padding: 20px;">⏳ Carregando cards...</div>';

    const cards = await Promise.all(
      this.modules.map(async (module) => {
        const stats = await this.getModuleStats(module._id);
        return this.createCard(module, stats);
      })
    );

    this.container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; padding: 20px;">
        ${cards.join('')}
      </div>
    `;

    console.log('✅ Dashboard cards renderizados');
  }

  createCard(module, stats) {
    if (!stats || !stats.success) {
      return `
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; border-left: 4px solid #ccc;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px;">📦 ${module.name}</h3>
          <p style="color: #999; margin: 0;">Erro ao carregar dados</p>
        </div>
      `;
    }

    const total = stats.total || 0;
    const online = stats.online || 0;
    const offline = stats.offline || 0;
    const maintenance = stats.maintenance || 0;

    const healthColor = this.getHealthColor(online, total);
    const healthPercentage = this.formatPercentage(online, total);

    const onlineBadge = this.getStatusBadge('online');
    const offlineBadge = this.getStatusBadge('offline');
    const maintenanceBadge = this.getStatusBadge('maintenance');

    return `
      <div style="background: linear-gradient(135deg, rgba(13, 13, 13, 0.6) 0%, rgba(255, 107, 44, 0.08) 100%); border: 2px solid ${healthColor}; border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 20px ${healthColor}33; position: relative; overflow: hidden; transition: all 0.3s ease; backdrop-filter: blur(10px);">
        <!-- Glow Background -->
        <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, ${healthColor}22 0%, transparent 70%); pointer-events: none; opacity: 0; transition: opacity 0.3s;"></div>
        
        <!-- Header Line -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, ${healthColor}, transparent); opacity: 0.8;"></div>

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid ${healthColor}33; position: relative; z-index: 1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 2rem; animation: float 3s ease-in-out infinite; text-shadow: 0 0 12px ${healthColor}44;">🏢</span>
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: ${healthColor}; text-shadow: 0 2px 8px ${healthColor}22;">${module.name}</h3>
          </div>
          <span style="font-size: 0.75rem; color: ${healthColor}; background: ${healthColor}15; padding: 6px 10px; border-radius: 6px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
            ${module.type.toUpperCase()}
          </span>
        </div>

        <!-- Health Bar -->
        <div style="margin-bottom: 16px; position: relative; z-index: 1;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Saúde Geral</span>
            <span style="font-size: 14px; font-weight: 800; color: ${healthColor}; text-shadow: 0 0 8px ${healthColor}44;">${healthPercentage}</span>
          </div>
          <div style="width: 100%; height: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; border: 1px solid ${healthColor}22;">
            <div style="width: ${healthPercentage}; height: 100%; background: linear-gradient(90deg, ${healthColor}, ${healthColor}88); transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); box-shadow: 0 0 12px ${healthColor}66; border-radius: 8px;"></div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; position: relative; z-index: 1;">
          <!-- Online -->
          <div style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.05) 100%); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(76, 175, 80, 0.3); transition: all 0.3s ease;">
            <div style="font-size: 24px; font-weight: 800; color: #4caf50; text-shadow: 0 0 10px rgba(76, 175, 80, 0.4);">${online}</div>
            <div style="font-size: 11px; color: #4caf50; margin-top: 4px; font-weight: 700; letter-spacing: 0.5px;">🟢 ONLINE</div>
          </div>

          <!-- Offline -->
          <div style="background: linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(244, 67, 54, 0.05) 100%); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(244, 67, 54, 0.3); transition: all 0.3s ease;">
            <div style="font-size: 24px; font-weight: 800; color: #f44336; text-shadow: 0 0 10px rgba(244, 67, 54, 0.4);">${offline}</div>
            <div style="font-size: 11px; color: #f44336; margin-top: 4px; font-weight: 700; letter-spacing: 0.5px;">🔴 OFFLINE</div>
          </div>

          <!-- Maintenance -->
          <div style="background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.05) 100%); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255, 152, 0, 0.3); transition: all 0.3s ease;">
            <div style="font-size: 24px; font-weight: 800; color: #ff9800; text-shadow: 0 0 10px rgba(255, 152, 0, 0.4);">${maintenance}</div>
            <div style="font-size: 11px; color: #ff9800; margin-top: 4px; font-weight: 700; letter-spacing: 0.5px;">🟡 MANUTENÇÃO</div>
          </div>
        </div>

        <!-- Total -->
        <div style="padding: 12px; background: linear-gradient(135deg, ${healthColor}15 0%, ${healthColor}08 100%); border-radius: 8px; text-align: center; border: 1px solid ${healthColor}22; position: relative; z-index: 1;">
          <span style="font-size: 13px; color: ${healthColor}; font-weight: 700;">
            <strong>TOTAL:</strong> ${total} dispositivo(s)
          </span>
        </div>

        <!-- Last Updated -->
        <div style="font-size: 11px; color: #777; text-align: right; margin-top: 10px; position: relative; z-index: 1;">
          🔄 ${new Date().toLocaleTimeString('pt-BR')}
        </div>
      </div>
    `;
  }

  startAutoUpdate() {
    if (this.updateInterval) clearInterval(this.updateInterval);

    // Atualizar a cada 30 segundos
    this.updateInterval = setInterval(() => {
      console.log('🔄 Atualizando dashboard cards...');
      this.render();
    }, 30000);
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new DashboardCards();
    dashboard.init();
  });
} else {
  const dashboard = new DashboardCards();
  dashboard.init();
}
