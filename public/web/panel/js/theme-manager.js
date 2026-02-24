/**
 * Theme Manager - Dark/Light Mode Toggle
 * Gerencia alternância entre temas escuro e claro
 */

class ThemeManager {
  constructor() {
    this.STORAGE_KEY = 'mdm-theme-mode';
    this.DEFAULT_THEME = 'dark';
    this.init();
  }

  init() {
    // Recuperar tema salvo ou usar padrão
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_THEME;
    this.setTheme(savedTheme);
    
    // Setup event listener para botão de toggle
    this.setupToggleButton();
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    
    localStorage.setItem(this.STORAGE_KEY, theme);
    console.log(`🎨 Tema alterado para: ${theme}`);
  }

  getCurrentTheme() {
    return localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_THEME;
  }

  toggleTheme() {
    const current = this.getCurrentTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }

  setupToggleButton() {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createToggleButton());
    } else {
      this.createToggleButton();
    }
  }

  createToggleButton() {
    // Procurar pelo topbar-right
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight) return;

    // Verificar se botão já existe
    if (document.querySelector('.theme-toggle-btn')) return;

    // Criar botão
    const button = document.createElement('button');
    button.className = 'theme-toggle-btn';
    button.title = 'Alternar tema (Escuro/Claro)';
    button.innerHTML = this.getCurrentTheme() === 'dark' ? '☀️' : '🌙';
    
    button.addEventListener('click', () => {
      const newTheme = this.toggleTheme();
      button.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    });

    // Adicionar como primeiro elemento do topbar-right
    topbarRight.insertBefore(button, topbarRight.firstChild);
  }
}

// Inicializar gerenciador de tema
const themeManager = new ThemeManager();
window.themeManager = themeManager;
