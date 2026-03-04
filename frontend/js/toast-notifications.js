/**
 * Toast Notifications System
 * Assinatura canônica: showToast(message, type = 'info', duration = 4000)
 * Compatível com todas as chamadas existentes no projeto.
 */

class ToastNotificationManager {
  constructor() {
    this.container = null;
    this._ensureContainer();
  }

  _ensureContainer() {
    // Reutiliza o container do HTML se existir, senão cria
    this.container = document.getElementById('toast-container')
      || document.querySelector('.toast-container');

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * showToast(message, type = 'info', duration = 4000)
   * type: 'success' | 'error' | 'warning' | 'info'
   */
  show(message, type = 'info', duration = 4000) {
    this._ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = String(message);
    this.container.appendChild(toast);

    // Força reflow para que a transição CSS dispare
    void toast.offsetHeight;
    toast.classList.add('toast-show');

    const remove = () => {
      toast.classList.remove('toast-show');
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    };

    // Botão de fechar opcional
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:none;border:none;color:inherit;cursor:pointer;margin-left:8px;font-size:14px;opacity:.7;';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', remove);
    toast.appendChild(closeBtn);

    if (duration > 0) setTimeout(remove, duration);
    return toast;
  }

  success(message, duration = 4000) { return this.show(message, 'success', duration); }
  error(message, duration = 5000) { return this.show(message, 'error', duration); }
  warning(message, duration = 4000) { return this.show(message, 'warning', duration); }
  info(message, duration = 4000) { return this.show(message, 'info', duration); }
}

// ─── Instância global ────────────────────────────────────────────────────────
const _toastManager = new ToastNotificationManager();
window.toastManager = _toastManager;

// ─── API global unificada ────────────────────────────────────────────────────
// showToast(message, type, duration) — sobrescreve o fallback de app.js
// Mantém compatibilidade total com todas as chamadas existentes.
window.showToast = (message, type = 'info', duration = 4000) => {
  return _toastManager.show(message, type, duration);
};

// Aliases convenientes
window.showToastSuccess = (message, duration) => _toastManager.success(message, duration);
window.showToastError = (message, duration) => _toastManager.error(message, duration);
window.showToastWarning = (message, duration) => _toastManager.warning(message, duration);
window.showToastInfo = (message, duration) => _toastManager.info(message, duration);