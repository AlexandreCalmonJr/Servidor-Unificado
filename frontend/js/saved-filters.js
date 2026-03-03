/**
 * Saved Filters Management Component
 * Allows users to save, load, and manage filter configurations per module
 */

class SavedFiltersManager {
  constructor(moduleId) {
    this.moduleId = moduleId;
    this.filters = [];
    this.currentFilterId = null;
    this.defaultFilterId = null;
  }

  /**
   * Load all filters for current module from server
   */
  async loadFilters() {
    try {
      const data = await API.get(`/filters/module/${this.moduleId}`);
      this.filters = data.filters || [];

      // Find default filter
      this.defaultFilterId = this.filters.find(f => f.isDefault)?._id || null;

      return this.filters;
    } catch (error) {
      console.error('Error loading filters:', error);
      showToastError('Erro ao carregar filtros salvos', error.message);
      return [];
    }
  }

  /**
   * Save current filter configuration
   */
  async saveCurrentFilter(filterName, filterData) {
    try {
      const savedFilter = await API.post('/filters', {
        moduleId: this.moduleId,
        filterName,
        filterData,
      });

      this.filters.push(savedFilter);

      showToastSuccess(`Filtro "${filterName}" salvo com sucesso`);
      return savedFilter;
    } catch (error) {
      console.error('Error saving filter:', error);
      showToastError('Erro ao salvar filtro', error.message);
      return null;
    }
  }

  /**
   * Update an existing filter
   */
  async updateFilter(filterId, filterName, filterData) {
    try {
      const updated = await API.put(`/filters/${filterId}`, {
        filterName,
        filterData,
      });

      // Update in local array
      const index = this.filters.findIndex(f => f._id === filterId);
      if (index !== -1) {
        this.filters[index] = updated;
      }

      showToastSuccess(`Filtro "${filterName}" atualizado com sucesso`);
      return updated;
    } catch (error) {
      console.error('Error updating filter:', error);
      showToastError('Erro ao atualizar filtro', error.message);
      return null;
    }
  }

  /**
   * Delete a saved filter
   */
  async deleteFilter(filterId) {
    try {
      await API.delete(`/filters/${filterId}`);

      // Remove from local array
      this.filters = this.filters.filter(f => f._id !== filterId);

      showToastSuccess('Filtro removido com sucesso');
      return true;
    } catch (error) {
      console.error('Error deleting filter:', error);
      showToastError('Erro ao remover filtro', error.message);
      return false;
    }
  }

  /**
   * Set a filter as default
   */
  async setDefaultFilter(filterId) {
    try {
      await API.post(`/filters/${filterId}/set-default`);

      // Update local flags
      this.filters.forEach(f => {
        f.isDefault = f._id === filterId;
      });
      this.defaultFilterId = filterId;

      showToastSuccess('Filtro definido como padrão');
      return true;
    } catch (error) {
      console.error('Error setting default filter:', error);
      showToastError('Erro ao definir filtro padrão', error.message);
      return false;
    }
  }

  /**
   * Get filter by ID
   */
  getFilter(filterId) {
    return this.filters.find(f => f._id === filterId);
  }

  /**
   * Get default filter
   */
  getDefaultFilter() {
    if (!this.defaultFilterId) return null;
    return this.getFilter(this.defaultFilterId);
  }

  /**
   * Get all filters
   */
  getAllFilters() {
    return this.filters;
  }

  /**
   * Create UI element for filter dropdown
   */
  createFilterDropdown(onFilterSelect) {
    const container = document.createElement('div');
    container.className = 'filter-dropdown';

    const button = document.createElement('button');
    button.className = 'btn btn-secondary btn-small';
    button.innerHTML = '<i class="icon-filter"></i> Filtros Salvos';
    button.title = 'Gerenciar filtros salvos';

    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.style.display = 'none';

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    // Render filter options
    this.updateFilterMenu(menu, onFilterSelect);

    container.appendChild(button);
    container.appendChild(menu);

    // Close menu on outside click
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    return container;
  }

  /**
   * Update the filter dropdown menu
   */
  updateFilterMenu(menu, onFilterSelect) {
    menu.innerHTML = '';

    if (this.filters.length === 0) {
      const noFiltersItem = document.createElement('div');
      noFiltersItem.className = 'dropdown-item disabled';
      noFiltersItem.textContent = 'Nenhum filtro salvo';
      menu.appendChild(noFiltersItem);
      return;
    }

    this.filters.forEach(filter => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      if (filter.isDefault) {
        item.classList.add('is-default');
      }

      const label = document.createElement('span');
      label.textContent = filter.filterName;
      if (filter.isDefault) {
        label.innerHTML += ' <span class="badge badge-default">Padrão</span>';
      }

      const actions = document.createElement('div');
      actions.className = 'dropdown-item-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'icon-btn';
      loadBtn.innerHTML = '↓';
      loadBtn.title = 'Carregar filtro';
      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onFilterSelect) {
          onFilterSelect(filter);
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn danger';
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = 'Deletar filtro';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Deseja deletar o filtro "${filter.filterName}"?`)) {
          this.deleteFilter(filter._id).then(() => {
            this.updateFilterMenu(menu, onFilterSelect);
          });
        }
      });

      actions.appendChild(loadBtn);
      if (!filter.isDefault) {
        const setDefaultBtn = document.createElement('button');
        setDefaultBtn.className = 'icon-btn';
        setDefaultBtn.innerHTML = '★';
        setDefaultBtn.title = 'Definir como padrão';
        setDefaultBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setDefaultFilter(filter._id).then(() => {
            this.updateFilterMenu(menu, onFilterSelect);
          });
        });
        actions.appendChild(setDefaultBtn);
      }
      actions.appendChild(deleteBtn);

      item.appendChild(label);
      item.appendChild(actions);
      menu.appendChild(item);
    });
  }
}

// Create global instance helper
window.createSavedFiltersManager = (moduleId) => new SavedFiltersManager(moduleId);
