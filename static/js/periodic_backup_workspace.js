(function () {
  'use strict';

  const PeriodicBackupWorkspace = {
    init(root) {
      this.root = root;
      this.cards = Array.from(root.querySelectorAll('[data-backup-card]'));
      this.selectionBar = root.querySelector('[data-backup-selection-bar]');
      this.uploadPanel = root.querySelector('[data-backup-upload-panel]');
      this.uploadForm = root.querySelector('[data-upload-form]');
      this.fileInput = root.querySelector('[data-upload-files]');
      this.dropzone = root.querySelector('[data-dropzone]');
      this.selected = new Set();
      this.unsavedFiles = false;
      this.staticPreview = document.documentElement.dataset.staticPreview === 'true';
      localStorage.setItem('pb_workspace_view', 'workspace');
      this.bind();
      this.renderSelection();
    },

    bind() {
      this.cards.forEach((card) => {
        const checkbox = card.querySelector('.pbw-card-check');
        if (!checkbox) return;
        card.addEventListener('click', (event) => {
          if (event.target.closest('a,button,input,label')) return;
          this.toggle(card);
        });
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.toggle(card);
          }
        });
        checkbox.addEventListener('change', () => this.setSelected(card, checkbox.checked));
      });
      this.root.querySelector('[data-clear-selection]')?.addEventListener('click', () => this.clear());
      this.root.querySelector('[data-open-upload]')?.addEventListener('click', () => this.openUpload());
      this.root.querySelectorAll('[data-close-upload]').forEach((button) => button.addEventListener('click', () => this.closeUpload()));
      this.fileInput?.addEventListener('change', () => this.renderFiles());
      this.uploadForm?.addEventListener('submit', () => { this.unsavedFiles = false; });
      this.dropzone?.addEventListener('dragover', (event) => { event.preventDefault(); this.dropzone.classList.add('is-dragover'); });
      this.dropzone?.addEventListener('dragleave', () => this.dropzone.classList.remove('is-dragover'));
      this.dropzone?.addEventListener('drop', (event) => {
        event.preventDefault();
        this.dropzone.classList.remove('is-dragover');
        if (event.dataTransfer.files.length) {
          this.fileInput.files = event.dataTransfer.files;
          this.renderFiles();
        }
      });
      window.addEventListener('beforeunload', (event) => {
        if (!this.unsavedFiles) return;
        event.preventDefault();
        event.returnValue = '';
      });
      this.root.querySelector('[data-legacy-view]')?.addEventListener('click', () => {
        localStorage.setItem('pb_workspace_view', 'legacy');
      });
      if (this.staticPreview) this.bindStaticFilters();
    },

    bindStaticFilters() {
      const form = this.root.querySelector('[data-workspace-filter]');
      if (!form) return;
      form.addEventListener('submit', (event) => { event.preventDefault(); this.applyStaticFilters(form); });
      form.addEventListener('change', () => this.applyStaticFilters(form));
      this.root.querySelectorAll('[data-filter-factory]').forEach((link) => link.addEventListener('click', (event) => {
        event.preventDefault();
        form.elements.factory.value = link.dataset.filterFactory;
        form.elements.region.value = link.dataset.filterRegion;
        form.elements.status.value = 'pending';
        this.applyStaticFilters(form);
      }));
    },

    applyStaticFilters(form) {
      const query = form.elements.q.value.trim().toLocaleLowerCase('ko');
      const status = form.elements.status.value;
      const region = form.elements.region.value;
      const factory = form.elements.factory.value;
      const line = form.elements.line.value;
      let visible = 0;
      this.cards.forEach((card) => {
        const matches = (!query || card.dataset.search.includes(query)) &&
          (status === 'all' || card.dataset.status === status) &&
          (!region || card.dataset.region === region) &&
          (!factory || card.dataset.factory === factory) &&
          (!line || card.dataset.line === line);
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      const description = this.root.querySelector('#pbw-results-title + p');
      if (description) description.textContent = `화면 미리보기 검색 결과 ${visible}건 · 카드를 눌러 백업할 설비를 선택하세요.`;
      this.clear();
    },

    toggle(card) {
      this.setSelected(card, !this.selected.has(card.dataset.backupId));
    },

    setSelected(card, value) {
      const id = card.dataset.backupId;
      const checkbox = card.querySelector('.pbw-card-check');
      if (value) this.selected.add(id); else this.selected.delete(id);
      card.classList.toggle('is-selected', value);
      if (checkbox) checkbox.checked = value;
      this.renderSelection();
    },

    clear() {
      this.cards.forEach((card) => this.setSelected(card, false));
      this.closeUpload();
    },

    selectedCards() {
      return this.cards.filter((card) => this.selected.has(card.dataset.backupId));
    },

    renderSelection() {
      const cards = this.selectedCards();
      this.selectionBar.hidden = cards.length === 0;
      this.selectionBar.querySelector('[data-selected-count]').textContent = String(cards.length);
      const names = cards.map((card) => card.querySelector('h3').textContent.trim());
      this.selectionBar.querySelector('[data-selected-names]').textContent = names.join(', ') || '설비를 선택하세요.';
    },

    openUpload() {
      const cards = this.selectedCards();
      if (!cards.length) return;
      const factories = new Set(cards.map((card) => card.dataset.factory));
      const message = this.uploadPanel.querySelector('[data-upload-message]');
      const mode = this.uploadPanel.querySelector('[data-upload-mode]');
      const submit = this.uploadForm.querySelector('[type="submit"]');
      message.textContent = '';
      submit.disabled = false;
      if (cards.length === 1) {
        this.uploadForm.action = cards[0].dataset.uploadUrl;
        this.uploadForm.querySelector('[data-upload-factory]').value = cards[0].dataset.factory;
        mode.textContent = `${cards[0].querySelector('h3').textContent.trim()} 설비에 파일을 연결합니다.`;
      } else if (factories.size === 1) {
        this.uploadForm.action = this.uploadForm.dataset.bulkAction || this.uploadForm.action;
        this.uploadForm.querySelector('[data-upload-factory]').value = cards[0].dataset.factory;
        mode.textContent = `${cards[0].dataset.factory} 설비 ${cards.length}대에 파일명을 기준으로 연결합니다.`;
      } else {
        mode.textContent = '여러 설비를 선택했습니다.';
        message.textContent = '일괄 백업은 같은 공장의 설비만 선택할 수 있습니다.';
        submit.disabled = true;
      }
      this.uploadPanel.hidden = false;
      this.uploadPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    closeUpload() {
      this.uploadPanel.hidden = true;
    },

    renderFiles() {
      const files = Array.from(this.fileInput.files || []);
      const list = this.root.querySelector('[data-file-list]');
      this.unsavedFiles = files.length > 0;
      list.innerHTML = files.length
        ? files.map((file) => `<span>📄 ${this.escape(file.name)} · ${this.formatSize(file.size)}</span>`).join('')
        : '선택된 파일이 없습니다.';
    },

    formatSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
      return `${(bytes / 1048576).toFixed(1)} MB`;
    },

    escape(value) {
      const node = document.createElement('span');
      node.textContent = value;
      return node.innerHTML;
    }
  };

  window.PeriodicBackupWorkspace = PeriodicBackupWorkspace;
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-periodic-backup-workspace]');
    if (root) PeriodicBackupWorkspace.init(root);
  });
}());
