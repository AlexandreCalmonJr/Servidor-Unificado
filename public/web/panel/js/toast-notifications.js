/**
 * Toast Notifications System
 * Displays temporary notification messages with different severity levels
 * Supports: success, error, warning, info
 */

class ToastNotificationManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.initContainer();
  }

  initContainer() {
    // Create container if not exists
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Main message text
   * @param {string} severity - 'success', 'error', 'warning', 'info' (default: 'info')
   * @param {number} duration - Time in ms before auto-dismiss (default: 5000)
   * @param {string} title - Optional title above message
   */
  show(message, severity = 'info', duration = 5000, title = '') {
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${severity}`;
    toastEl.id = toastId;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'polite');

    // Icon based on severity
    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    const icon = iconMap[severity] || 'ℹ';

    // Build HTML
    let html = `<div class="toast-icon">${icon}</div>`;
    html += '<div class="toast-content">';
    if (title) {
      html += `<div class="toast-title">${this.escapeHtml(title)}</div>`;
    }
    html += `<div class="toast-message">${this.escapeHtml(message)}</div>`;
    html += '</div>';
    html += '<button class="toast-close" aria-label="Fechar notificação">×</button>';

    toastEl.innerHTML = html;

    // Close button handler
    toastEl.querySelector('.toast-close').addEventListener('click', () => {
      this.remove(toastId);
    });

    // Add to container
    this.container.appendChild(toastEl);

    // Trigger animation
    setTimeout(() => {
      toastEl.classList.add('toast-show');
    }, 10);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toastId);
      }, duration);
    }

    this.toasts.push(toastId);
    return toastId;
  }

  /**
   * Show success toast
   */
  success(message, title = '', duration = 5000) {
    return this.show(message, 'success', duration, title);
  }

  /**
   * Show error toast
   */
  error(message, title = '', duration = 7000) {
    return this.show(message, 'error', duration, title);
  }

  /**
   * Show warning toast
   */
  warning(message, title = '', duration = 6000) {
    return this.show(message, 'warning', duration, title);
  }

  /**
   * Show info toast
   */
  info(message, title = '', duration = 5000) {
    return this.show(message, 'info', duration, title);
  }

  /**
   * Remove a toast notification
   */
  remove(toastId) {
    const toastEl = document.getElementById(toastId);
    if (toastEl) {
      toastEl.classList.remove('toast-show');
      setTimeout(() => {
        toastEl.remove();
      }, 300);

      this.toasts = this.toasts.filter(id => id !== toastId);
    }
  }

  /**
   * Remove all toasts
   */
  removeAll() {
    this.toasts.forEach(id => this.remove(id));
    this.toasts = [];
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Global instance
const toastManager = new ToastNotificationManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.showToast = (message, severity = 'info', title = '') => {
    return toastManager.show(message, severity, 5000, title);
  };
  window.showToastSuccess = (message, title = '') => toastManager.success(message, title);
  window.showToastError = (message, title = '') => toastManager.error(message, title);
  window.showToastWarning = (message, title = '') => toastManager.warning(message, title);
  window.showToastInfo = (message, title = '') => toastManager.info(message, title);
  window.toastManager = toastManager;
}
