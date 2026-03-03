/**
 * Skeleton Loading Component
 * Mostra efeito de carregamento animado
 */

class SkeletonLoader {
  static createTableSkeleton(rows = 5, columns = 7) {
    const skeletons = [];
    
    for (let i = 0; i < rows; i++) {
      let cells = '';
      for (let j = 0; j < columns; j++) {
        cells += `
          <td style="padding: 12px;">
            <div style="
              height: 20px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
            "></div>
          </td>
        `;
      }
      skeletons.push(`<tr>${cells}</tr>`);
    }

    return `
      <table style="width: 100%; border-collapse: collapse;">
        ${skeletons.join('')}
      </table>
      <style>
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    `;
  }

  static createCardSkeleton(count = 3) {
    const cards = [];
    
    for (let i = 0; i < count; i++) {
      cards.push(`
        <div style="
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
          <!-- Header -->
          <div style="margin-bottom: 16px;">
            <div style="
              height: 24px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
              margin-bottom: 8px;
            "></div>
            <div style="
              height: 16px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
              width: 80%;
            "></div>
          </div>

          <!-- Bar -->
          <div style="margin-bottom: 16px;">
            <div style="
              height: 8px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
            "></div>
          </div>

          <!-- Grid Stats -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            ${[1, 2, 3].map(() => `
              <div style="
                height: 60px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
              "></div>
            `).join('')}
          </div>
        </div>
      `);
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; padding: 20px;">
        ${cards.join('')}
      </div>
      <style>
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    `;
  }

  static createAssetTableSkeleton(rows = 10) {
    return this.createTableSkeleton(rows, 7);
  }

  static createDashboardSkeleton() {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 20px;">
        ${[1, 2, 3, 4].map(() => `
          <div style="
            padding: 16px;
            background: #f5f5f5;
            border-radius: 8px;
          ">
            <div style="
              height: 20px;
              background: linear-gradient(90deg, #e0e0e0 25%, #d0d0d0 50%, #e0e0e0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
              margin-bottom: 8px;
            "></div>
            <div style="
              height: 32px;
              background: linear-gradient(90deg, #e0e0e0 25%, #d0d0d0 50%, #e0e0e0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
            "></div>
          </div>
        `).join('')}
      </div>
      <style>
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    `;
  }

  static showSkeleton(elementId, type = 'table', options = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const rows = options.rows || 5;
    const count = options.count || 3;

    switch (type) {
      case 'table':
        element.innerHTML = this.createTableSkeleton(rows, options.columns || 7);
        break;
      case 'cards':
        element.innerHTML = this.createCardSkeleton(count);
        break;
      case 'dashboard':
        element.innerHTML = this.createDashboardSkeleton();
        break;
      default:
        element.innerHTML = this.createTableSkeleton(rows, 7);
    }
  }

  static hideSkeleton(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = '';
  }
}

// Exportar para uso global
window.SkeletonLoader = SkeletonLoader;
