// ============================================
// APP.JS - Main Application Logic
// ============================================

// ---- State ----
let currentPage = 'dashboard';
let equipPageNum = 1;
let movPageNum = 1;
const ITEMS_PER_PAGE = 12;
let sortField = 'dataCadastro';
let sortDir = 'desc';
let filteredEquips = [];
let filteredMovs = [];
let filteredManus = [];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initTopbar();
  initSidebar();
  initSearch();
  const isLogged = checkAuth();
  if (isLogged) {
    loadConfiguracoes();
    refreshAll();
    setGreeting();
    if (typeof supabaseSync !== 'undefined') {
      supabaseSync.init();
    }
  }

  // Auto-limpeza de URL do Supabase (remove /rest/v1 e barras finais ao sair do campo)
  const sbUrlInp = document.getElementById('supabaseUrlInput');
  if (sbUrlInp) {
    sbUrlInp.addEventListener('blur', () => {
      if (typeof supabaseSync !== 'undefined' && sbUrlInp.value.trim()) {
        sbUrlInp.value = supabaseSync.cleanUrl(sbUrlInp.value);
      }
    });
  }
});

function initTopbar() {
  // Date display
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}

function setGreeting() {
  const el = document.getElementById('dashGreeting');
  if (!el) return;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = DB.config.nome || 'Administrador';
  el.textContent = `${greet}, ${nome}! Aqui está o resumo do seu inventário de TI.`;
}

// ============================================
// SIDEBAR
// ============================================
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const backdrop = document.getElementById('sidebarBackdrop');

  function openMobileSidebar() {
    sidebar?.classList.add('mobile-open');
    backdrop?.classList.add('active');
  }

  function closeMobileSidebar() {
    sidebar?.classList.remove('mobile-open');
    backdrop?.classList.remove('active');
  }

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
  });

  mobileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar?.classList.contains('mobile-open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  backdrop?.addEventListener('click', () => {
    closeMobileSidebar();
  });

  // Restore collapsed state (apenas desktop)
  if (localStorage.getItem('sidebar_collapsed') === 'true' && window.innerWidth > 900) {
    sidebar?.classList.add('collapsed');
  }

  // Close mobile sidebar on outside click
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && sidebar?.classList.contains('mobile-open')) {
      if (!sidebar.contains(e.target) && e.target !== mobileBtn && !mobileBtn?.contains(e.target)) {
        closeMobileSidebar();
      }
    }
  });
}

// ============================================
// NAVIGATION
// ============================================
function navigateTo(page) {
  currentPage = page;

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const navItem = document.getElementById('nav-' + page);
  if (navItem) navItem.classList.add('active');

  // Breadcrumb
  const labels = {
    dashboard: 'Dashboard',
    equipamentos: 'Equipamentos',
    colaboradores: 'Colaboradores',
    movimentacoes: 'Movimentações',
    relatorios: 'Relatórios',
    manutencao: 'Manutenção',
    configuracoes: 'Configurações'
  };
  const bc = document.getElementById('breadcrumbText');
  if (bc) bc.textContent = labels[page] || page;

  // Refresh page-specific content
  if (page === 'dashboard') {
    updateDashboard();
    updateCharts();
  } else if (page === 'equipamentos') {
    renderEquipamentos();
  } else if (page === 'colaboradores') {
    renderColaboradores();
  } else if (page === 'movimentacoes') {
    renderMovimentacoes();
  } else if (page === 'manutencao') {
    renderManutencoes();
    updateManuStats();
  } else if (page === 'configuracoes') {
    renderConfiguracoes();
  }

  // Close mobile sidebar
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
  }

  return false;
}

// ============================================
// REFRESH ALL
// ============================================
function refreshAll() {
  updateBadges();
  updateDashboard();
  updateCharts();
  updateActivityList();
  renderEquipamentos();
  renderColaboradores();
  renderMovimentacoes();
  renderManutencoes();
  updateManuStats();
  updateFilterLocais();
  checkGarantias();
}

function updateBadges() {
  const badgeEquip = document.getElementById('badge-equipamentos');
  if (badgeEquip) badgeEquip.textContent = DB.equipamentos.length || '';

  const badgeColab = document.getElementById('badge-colaboradores');
  if (badgeColab) badgeColab.textContent = DB.colaboradores.length || '';
}

// ============================================
// DASHBOARD
// ============================================
function updateDashboard() {
  const total = DB.equipamentos.length;
  const ativos = DB.equipamentos.filter(e => e.status === 'Ativo').length;
  const emManu = DB.equipamentos.filter(e => e.status === 'Em Manutenção').length;
  const colabs = DB.colaboradores.length;

  animateCounter('statTotalVal', total);
  animateCounter('statAtivosVal', ativos);
  animateCounter('statManutencaoVal', emManu);
  animateCounter('statColabVal', colabs);

  // Recent table (last 5)
  const recent = [...DB.equipamentos]
    .sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro))
    .slice(0, 5);

  const tbody = document.getElementById('dashRecentTableBody');
  if (tbody) {
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum equipamento cadastrado</td></tr>';
    } else {
      tbody.innerHTML = recent.map(e => `
        <tr>
          <td><strong style="color: var(--accent)">${escapeHtml(e.patrimonio)}</strong></td>
          <td>${escapeHtml(e.descricao)}</td>
          <td><span class="chip">${escapeHtml(e.categoria)}</span></td>
          <td>${escapeHtml(e.responsavel) || '<span style="color:var(--text-muted)">—</span>'}</td>
          <td>${getBadge(e.status)}</td>
          <td>${escapeHtml(e.localizacao) || '<span style="color:var(--text-muted)">—</span>'}</td>
        </tr>
      `).join('');
    }
  }

  updateActivityList();
  updateBadges();
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  if (start === target) return;
  const duration = 600;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateActivityList() {
  const list = document.getElementById('activityList');
  if (!list) return;
  const acts = DB.actividades.slice(0, 10);
  if (acts.length === 0) {
    list.innerHTML = `
      <div class="empty-activity">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>Nenhuma atividade registrada</p>
      </div>`;
    return;
  }
  const typeColors = {
    add: 'var(--green)', edit: 'var(--accent)', delete: 'var(--red)',
    move: 'var(--blue)', manu: 'var(--yellow)'
  };
  list.innerHTML = acts.map(a => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${typeColors[a.type] || 'var(--accent)'}"></div>
      <div class="activity-content">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${formatDateTime(a.time)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// EQUIPAMENTOS
// ============================================
function renderEquipamentos() {
  filteredEquips = getFilteredEquipamentos();
  const tbody = document.getElementById('equipTableBody');
  const info = document.getElementById('equipResultsInfo');
  if (!tbody) return;

  if (info) {
    info.textContent = filteredEquips.length === 0
      ? 'Nenhum resultado encontrado'
      : `Exibindo ${filteredEquips.length} equipamento${filteredEquips.length !== 1 ? 's' : ''}`;
  }

  // Sort
  filteredEquips.sort((a, b) => {
    const va = (a[sortField] || '').toString().toLowerCase();
    const vb = (b[sortField] || '').toString().toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  // Paginate
  const total = filteredEquips.length;
  const start = (equipPageNum - 1) * ITEMS_PER_PAGE;
  const page = filteredEquips.slice(start, start + ITEMS_PER_PAGE);

  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Nenhum equipamento encontrado</td></tr>';
  } else {
    tbody.innerHTML = page.map(e => `
      <tr>
        <td><strong style="color:var(--accent);font-family:monospace">${escapeHtml(e.patrimonio)}</strong></td>
        <td>
          <div style="font-weight:600;color:var(--text-primary)">${escapeHtml(e.descricao)}</div>
          ${e.serial ? `<div style="font-size:11px;color:var(--text-muted)">S/N: ${escapeHtml(e.serial)}</div>` : ''}
        </td>
        <td><span class="chip">${escapeHtml(e.categoria)}</span></td>
        <td>
          <div style="font-size:13px">${escapeHtml(e.marca) || '—'}</div>
          ${e.modelo ? `<div style="font-size:11px;color:var(--text-muted)">${escapeHtml(e.modelo)}</div>` : ''}
        </td>
        <td>${escapeHtml(e.responsavel) || '<span style="color:var(--text-muted)">Disponível</span>'}</td>
        <td>${escapeHtml(e.localizacao) || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${getBadge(e.status)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon btn-secondary" onclick="verDetalheEquipamento(${e.id})" title="Ver detalhes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-icon btn-secondary" onclick="editarEquipamento(${e.id})" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-danger" onclick="confirmarExcluirEquip(${e.id})" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderPagination('equipPagination', total, equipPageNum, (p) => {
    equipPageNum = p;
    renderEquipamentos();
  });
}

function getFilteredEquipamentos() {
  const search = (document.getElementById('filterEquip')?.value || '').toLowerCase();
  const cat = document.getElementById('filterCategoria')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const local = document.getElementById('filterLocalSelect')?.value || '';

  return DB.equipamentos.filter(e => {
    const matchSearch = !search ||
      (e.patrimonio || '').toLowerCase().includes(search) ||
      (e.descricao || '').toLowerCase().includes(search) ||
      (e.marca || '').toLowerCase().includes(search) ||
      (e.modelo || '').toLowerCase().includes(search) ||
      (e.serial || '').toLowerCase().includes(search) ||
      (e.responsavel || '').toLowerCase().includes(search);
    const matchCat = !cat || e.categoria === cat;
    const matchStatus = !status || e.status === status;
    const matchLocal = !local || e.localizacao === local;
    return matchSearch && matchCat && matchStatus && matchLocal;
  });
}

function filtrarEquipamentos() {
  equipPageNum = 1;
  renderEquipamentos();
}

function limparFiltros() {
  document.getElementById('filterEquip').value = '';
  document.getElementById('filterCategoria').value = '';
  document.getElementById('filterStatus').value = '';
  const fl = document.getElementById('filterLocalSelect');
  if (fl) fl.value = '';
  filtrarEquipamentos();
}

function sortTable(field) {
  if (sortField === field) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDir = 'asc';
  }
  renderEquipamentos();
}

function updateFilterLocais() {
  const select = document.getElementById('filterLocalSelect');
  if (!select) return;
  const cur = select.value;
  select.innerHTML = '<option value="">Todos os locais</option>' +
    DB.localizacoes.map(l => `<option value="${escapeHtml(l)}" ${l === cur ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('');
}

// ============================================
// EQUIPAMENTO - CRUD
// ============================================
// ---- Internal modal opener (sem setup) ----
function _showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// ---- openModal: executa setup e abre o modal ----
function openModal(id) {
  if (id === 'modalEquipamento') {
    // Reset campos
    document.getElementById('modalEquipTitulo').textContent = 'Novo Equipamento';
    document.getElementById('equipId').value = '';
    ['equipPatrimonio','equipDescricao','equipCategoria','equipMarca','equipModelo',
     'equipSerial','equipNF','equipDataAquisicao','equipValor','equipResponsavel','equipLocalizacao',
     'equipGarantia','equipEspecificacoes','equipObservacoes'].forEach(f => {
      const el = document.getElementById(f);
      if (el) el.value = '';
    });
    const statusEl = document.getElementById('equipStatus');
    if (statusEl) statusEl.value = 'Ativo';
    prepararModalEquipamento();
  } else if (id === 'modalColaborador') {
    prepararModalColaborador();
  } else if (id === 'modalMovimentacao') {
    prepararModalMovimentacao();
  } else if (id === 'modalManutencao') {
    prepararModalManutencao();
  }
  _showModal(id);
}

// Close on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

function prepararModalEquipamento() {
  const resp = document.getElementById('equipResponsavel');
  if (resp) {
    resp.innerHTML = '<option value="">Nenhum / Disponível</option>' +
      DB.colaboradores.map(c => `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`).join('');
  }
  const loc = document.getElementById('equipLocalizacao');
  if (loc) {
    loc.innerHTML = '<option value="">Selecione a localização</option>' +
      DB.localizacoes.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
  }
}

function editarEquipamento(id) {
  const e = getEquipamento(id);
  if (!e) return;
  document.getElementById('modalEquipTitulo').textContent = 'Editar Equipamento';
  document.getElementById('equipId').value = e.id;
  prepararModalEquipamento();

  document.getElementById('equipPatrimonio').value = e.patrimonio || '';
  document.getElementById('equipDescricao').value = e.descricao || '';
  document.getElementById('equipCategoria').value = e.categoria || '';
  document.getElementById('equipMarca').value = e.marca || '';
  document.getElementById('equipModelo').value = e.modelo || '';
  document.getElementById('equipSerial').value = e.serial || '';
  document.getElementById('equipNF').value = e.nf || '';
  document.getElementById('equipDataAquisicao').value = e.dataAquisicao || '';
  document.getElementById('equipValor').value = e.valor || '';
  document.getElementById('equipResponsavel').value = e.responsavel || '';
  document.getElementById('equipLocalizacao').value = e.localizacao || '';
  document.getElementById('equipStatus').value = e.status || 'Ativo';
  document.getElementById('equipGarantia').value = e.garantia || '';
  document.getElementById('equipEspecificacoes').value = e.especificacoes || '';
  document.getElementById('equipObservacoes').value = e.observacoes || '';

  const modal = document.getElementById('modalEquipamento');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function salvarEquipamento() {
  const patrimonio = document.getElementById('equipPatrimonio').value.trim();
  const descricao = document.getElementById('equipDescricao').value.trim();
  const categoria = document.getElementById('equipCategoria').value;

  if (!patrimonio || !descricao || !categoria) {
    showToast('Preencha os campos obrigatórios: Patrimônio, Descrição e Categoria.', 'error');
    return;
  }

  const idVal = document.getElementById('equipId').value;
  const data = {
    patrimonio,
    descricao,
    categoria,
    marca: document.getElementById('equipMarca').value.trim(),
    modelo: document.getElementById('equipModelo').value.trim(),
    serial: document.getElementById('equipSerial').value.trim(),
    nf: document.getElementById('equipNF').value.trim(),
    dataAquisicao: document.getElementById('equipDataAquisicao').value,
    valor: document.getElementById('equipValor').value,
    responsavel: document.getElementById('equipResponsavel').value,
    localizacao: document.getElementById('equipLocalizacao').value,
    status: document.getElementById('equipStatus').value,
    garantia: document.getElementById('equipGarantia').value,
    especificacoes: document.getElementById('equipEspecificacoes').value.trim(),
    observacoes: document.getElementById('equipObservacoes').value.trim(),
  };

  if (idVal) {
    // Check duplicate patrimonio (excluding self)
    const dup = DB.equipamentos.find(e => e.patrimonio === patrimonio && e.id !== parseInt(idVal));
    if (dup) { showToast('Já existe um equipamento com este número de patrimônio!', 'error'); return; }
    updateEquipamento(parseInt(idVal), data);
    showToast('Equipamento atualizado com sucesso!', 'success');
  } else {
    // Check duplicate patrimonio
    if (DB.equipamentos.find(e => e.patrimonio === patrimonio)) {
      showToast('Já existe um equipamento com este número de patrimônio!', 'error'); return;
    }
    addEquipamento(data);
    showToast('Equipamento cadastrado com sucesso!', 'success');
  }

  closeModal('modalEquipamento');
  refreshAll();
}

function confirmarExcluirEquip(id) {
  const equip = getEquipamento(id);
  if (!equip) return;
  document.getElementById('confirmTitulo').textContent = 'Excluir Equipamento';
  document.getElementById('confirmMensagem').innerHTML =
    `Tem certeza que deseja excluir o equipamento <strong>${escapeHtml(equip.descricao)}</strong> (${escapeHtml(equip.patrimonio)})? Esta ação não pode ser desfeita.`;
  document.getElementById('confirmBtn').onclick = () => {
    deleteEquipamento(id);
    closeModal('modalConfirm');
    showToast('Equipamento excluído!', 'warning');
    refreshAll();
  };
  openModal('modalConfirm');
}

function verDetalheEquipamento(id) {
  const e = getEquipamento(id);
  if (!e) return;

  const body = document.getElementById('modalDetalheBody');
  const garantiaStatus = e.garantia
    ? (new Date(e.garantia) >= new Date() ? `<span style="color:var(--green)">${formatDate(e.garantia)} (vigente)</span>` : `<span style="color:var(--red)">${formatDate(e.garantia)} (vencida)</span>`)
    : '<span style="color:var(--text-muted)">—</span>';

  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-section-title">Identificação</div>
      <div class="detail-field">
        <span class="detail-label">Patrimônio</span>
        <span class="detail-value" style="color:var(--accent);font-family:monospace;font-size:16px">${escapeHtml(e.patrimonio)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Status</span>
        <span class="detail-value">${getBadge(e.status)}</span>
      </div>
      <div class="detail-field span-2">
        <span class="detail-label">Descrição</span>
        <span class="detail-value">${escapeHtml(e.descricao)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Categoria</span>
        <span class="detail-value"><span class="chip">${escapeHtml(e.categoria)}</span></span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Marca / Modelo</span>
        <span class="detail-value">${escapeHtml(e.marca) || '—'} ${e.modelo ? '/ ' + escapeHtml(e.modelo) : ''}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Número de Série</span>
        <span class="detail-value" style="font-family:monospace">${escapeHtml(e.serial) || '—'}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Nota Fiscal</span>
        <span class="detail-value">${escapeHtml(e.nf) || '—'}</span>
      </div>

      <div class="detail-section-title">Posse & Localização</div>
      <div class="detail-field">
        <span class="detail-label">Responsável</span>
        <span class="detail-value">${escapeHtml(e.responsavel) || 'Disponível'}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Localização</span>
        <span class="detail-value">${escapeHtml(e.localizacao) || '—'}</span>
      </div>

      <div class="detail-section-title">Financeiro & Garantia</div>
      <div class="detail-field">
        <span class="detail-label">Data de Aquisição</span>
        <span class="detail-value">${formatDate(e.dataAquisicao)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Valor de Aquisição</span>
        <span class="detail-value">${formatCurrency(e.valor)}</span>
      </div>
      <div class="detail-field span-2">
        <span class="detail-label">Garantia</span>
        <span class="detail-value">${garantiaStatus}</span>
      </div>

      ${e.especificacoes ? `
      <div class="detail-section-title">Especificações Técnicas</div>
      <div class="detail-field span-2">
        <span class="detail-value" style="font-size:13px;white-space:pre-line">${escapeHtml(e.especificacoes)}</span>
      </div>` : ''}

      ${e.observacoes ? `
      <div class="detail-section-title">Observações</div>
      <div class="detail-field span-2">
        <span class="detail-value" style="font-size:13px;color:var(--text-secondary);white-space:pre-line">${escapeHtml(e.observacoes)}</span>
      </div>` : ''}

      <div class="detail-section-title">Controle</div>
      <div class="detail-field">
        <span class="detail-label">Data de Cadastro</span>
        <span class="detail-value">${formatDate(e.dataCadastro)}</span>
      </div>
    </div>
  `;

  document.getElementById('btnEditarDetalhe').onclick = () => {
    closeModal('modalDetalhe');
    editarEquipamento(id);
  };

  openModal('modalDetalhe');
}

// ============================================
// COLABORADORES
// ============================================
function prepararModalColaborador() {
  const setorSel = document.getElementById('colabSetor');
  if (setorSel) {
    setorSel.innerHTML = '<option value="">Selecione o setor</option>' +
      DB.setores.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  }
  // Reset fields
  document.getElementById('modalColabTitulo').textContent = 'Novo Colaborador';
  document.getElementById('colabId').value = '';
  ['colabNome','colabCargo','colabSetor','colabEmail','colabTelefone','colabMatricula','colabObs']
    .forEach(f => { const el = document.getElementById(f); if(el) el.value = ''; });
}

function editarColaborador(id) {
  const c = getColaborador(id);
  if (!c) return;

  prepararModalColaborador();
  document.getElementById('modalColabTitulo').textContent = 'Editar Colaborador';
  document.getElementById('colabId').value = c.id;
  document.getElementById('colabNome').value = c.nome || '';
  document.getElementById('colabCargo').value = c.cargo || '';
  document.getElementById('colabSetor').value = c.setor || '';
  document.getElementById('colabEmail').value = c.email || '';
  document.getElementById('colabTelefone').value = c.telefone || '';
  document.getElementById('colabMatricula').value = c.matricula || '';
  document.getElementById('colabObs').value = c.obs || '';

  const modal = document.getElementById('modalColaborador');
  if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function salvarColaborador() {
  const nome = document.getElementById('colabNome').value.trim();
  if (!nome) { showToast('Informe o nome do colaborador!', 'error'); return; }

  const idVal = document.getElementById('colabId').value;
  const data = {
    nome,
    cargo: document.getElementById('colabCargo').value.trim(),
    setor: document.getElementById('colabSetor').value,
    email: document.getElementById('colabEmail').value.trim(),
    telefone: document.getElementById('colabTelefone').value.trim(),
    matricula: document.getElementById('colabMatricula').value.trim(),
    obs: document.getElementById('colabObs').value.trim(),
  };

  if (idVal) {
    updateColaborador(parseInt(idVal), data);
    showToast('Colaborador atualizado!', 'success');
  } else {
    addColaborador(data);
    showToast('Colaborador cadastrado!', 'success');
  }

  closeModal('modalColaborador');
  refreshAll();
}

function confirmarExcluirColab(id) {
  const c = getColaborador(id);
  if (!c) return;
  const equips = getEquipamentosDoColaborador(id);
  document.getElementById('confirmTitulo').textContent = 'Excluir Colaborador';
  document.getElementById('confirmMensagem').innerHTML =
    `Tem certeza que deseja excluir <strong>${escapeHtml(c.nome)}</strong>?${equips.length > 0 ? ` Este colaborador possui <strong>${equips.length}</strong> equipamento(s) atribuído(s) que ficarão sem responsável.` : ''} Esta ação não pode ser desfeita.`;
  document.getElementById('confirmBtn').onclick = () => {
    deleteColaborador(id);
    closeModal('modalConfirm');
    showToast('Colaborador excluído!', 'warning');
    refreshAll();
  };
  openModal('modalConfirm');
}

function renderColaboradores() {
  const grid = document.getElementById('colabsGrid');
  if (!grid) return;

  const search = (document.getElementById('filterColab')?.value || '').toLowerCase();
  const setor = document.getElementById('filterSetor')?.value || '';

  let colabs = DB.colaboradores.filter(c => {
    const matchSearch = !search ||
      (c.nome || '').toLowerCase().includes(search) ||
      (c.cargo || '').toLowerCase().includes(search) ||
      (c.setor || '').toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search) ||
      (c.matricula || '').toLowerCase().includes(search);
    const matchSetor = !setor || c.setor === setor;
    return matchSearch && matchSetor;
  });

  // Update setor filter options
  const setorFilter = document.getElementById('filterSetor');
  if (setorFilter) {
    const cur = setorFilter.value;
    const usedSetores = [...new Set(DB.colaboradores.map(c => c.setor).filter(Boolean))];
    setorFilter.innerHTML = '<option value="">Todos os setores</option>' +
      usedSetores.map(s => `<option value="${escapeHtml(s)}" ${s === cur ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
  }

  if (colabs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p>${DB.colaboradores.length === 0 ? 'Nenhum colaborador cadastrado' : 'Nenhum resultado encontrado'}</p>
        ${DB.colaboradores.length === 0 ? '<button class="btn btn-primary" onclick="openModal(\'modalColaborador\')">Adicionar Colaborador</button>' : ''}
      </div>`;
    return;
  }

  grid.innerHTML = colabs.map(c => {
    const equips = DB.equipamentos.filter(e => e.responsavel === c.nome);
    const initials = c.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return `
      <div class="colab-card">
        <div class="colab-avatar">${initials}</div>
        <div class="colab-name">${escapeHtml(c.nome)}</div>
        <div class="colab-cargo">${escapeHtml(c.cargo) || 'Sem cargo definido'}</div>
        <div class="colab-info">
          ${c.setor ? `<div class="colab-info-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            ${escapeHtml(c.setor)}
          </div>` : ''}
          ${c.email ? `<div class="colab-info-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            ${escapeHtml(c.email)}
          </div>` : ''}
          ${c.telefone ? `<div class="colab-info-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .27 0.92z"/></svg>
            ${escapeHtml(c.telefone)}
          </div>` : ''}
          ${c.matricula ? `<div class="colab-info-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h10M7 12h5"/></svg>
            Matrícula: ${escapeHtml(c.matricula)}
          </div>` : ''}
        </div>
        <div class="colab-equipamentos">
          <div class="colab-equip-count"><strong>${equips.length}</strong> equipamento${equips.length !== 1 ? 's' : ''}</div>
          <div class="colab-actions">
            <button class="btn btn-icon btn-secondary" onclick="editarColaborador(${c.id})" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-danger" onclick="confirmarExcluirColab(${c.id})" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarColaboradores() {
  renderColaboradores();
}

// ============================================
// MOVIMENTAÇÕES
// ============================================
function prepararModalMovimentacao() {
  // Equipamentos
  const movEquip = document.getElementById('movEquipamento');
  if (movEquip) {
    movEquip.innerHTML = '<option value="">Selecione o equipamento...</option>' +
      DB.equipamentos.map(e => `<option value="${e.id}">${escapeHtml(e.patrimonio)} - ${escapeHtml(e.descricao)}</option>`).join('');
  }
  // Responsaveis
  const movResp = document.getElementById('movResponsavel');
  if (movResp) {
    movResp.innerHTML = '<option value="">Selecione...</option>' +
      DB.colaboradores.map(c => `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`).join('');
  }
  // Default date
  const movData = document.getElementById('movData');
  if (movData) movData.value = new Date().toISOString().split('T')[0];
  // Reset fields
  ['movTipo','movDe','movPara','movObs'].forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
  });
}

function salvarMovimentacao() {
  const equipId = parseInt(document.getElementById('movEquipamento').value);
  const tipo = document.getElementById('movTipo').value;

  if (!equipId || !tipo) {
    showToast('Informe o equipamento e o tipo de movimentação!', 'error');
    return;
  }

  const equip = getEquipamento(equipId);
  const data = {
    equipamentoId: equipId,
    equipamentoDesc: equip ? `${equip.patrimonio} - ${equip.descricao}` : '—',
    tipo,
    de: document.getElementById('movDe').value.trim(),
    para: document.getElementById('movPara').value.trim(),
    responsavel: document.getElementById('movResponsavel').value,
    data: document.getElementById('movData').value,
    obs: document.getElementById('movObs').value.trim(),
  };

  addMovimentacao(data);
  showToast('Movimentação registrada!', 'success');
  closeModal('modalMovimentacao');
  refreshAll();
}

function renderMovimentacoes() {
  const search = (document.getElementById('filterMov')?.value || '').toLowerCase();
  const tipo = document.getElementById('filterTipoMov')?.value || '';
  const data = document.getElementById('filterMovData')?.value || '';

  filteredMovs = DB.movimentacoes.filter(m => {
    const matchSearch = !search ||
      (m.equipamentoDesc || '').toLowerCase().includes(search) ||
      (m.tipo || '').toLowerCase().includes(search) ||
      (m.de || '').toLowerCase().includes(search) ||
      (m.para || '').toLowerCase().includes(search) ||
      (m.responsavel || '').toLowerCase().includes(search);
    const matchTipo = !tipo || m.tipo === tipo;
    const matchData = !data || m.data === data;
    return matchSearch && matchTipo && matchData;
  }).sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));

  const tbody = document.getElementById('movTableBody');
  if (!tbody) return;

  const start = (movPageNum - 1) * ITEMS_PER_PAGE;
  const page = filteredMovs.slice(start, start + ITEMS_PER_PAGE);

  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Nenhuma movimentação encontrada</td></tr>';
  } else {
    tbody.innerHTML = page.map(m => `
      <tr>
        <td>${formatDate(m.data || m.dataCadastro)}</td>
        <td>${getMovBadge(m.tipo)}</td>
        <td><strong style="color:var(--text-primary)">${escapeHtml(m.equipamentoDesc)}</strong></td>
        <td>${escapeHtml(m.de) || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${escapeHtml(m.para) || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${escapeHtml(m.responsavel) || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td style="max-width:200px;word-break:break-word">${escapeHtml(m.obs) || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>
          <button class="btn btn-icon btn-danger" onclick="confirmarExcluirMov(${m.id})" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderPagination('movPagination', filteredMovs.length, movPageNum, (p) => {
    movPageNum = p;
    renderMovimentacoes();
  });
}

function filtrarMovimentacoes() {
  movPageNum = 1;
  renderMovimentacoes();
}

function confirmarExcluirMov(id) {
  document.getElementById('confirmTitulo').textContent = 'Excluir Movimentação';
  document.getElementById('confirmMensagem').textContent = 'Deseja excluir este registro de movimentação?';
  document.getElementById('confirmBtn').onclick = () => {
    deleteMovimentacao(id);
    closeModal('modalConfirm');
    showToast('Movimentação excluída!', 'warning');
    renderMovimentacoes();
  };
  openModal('modalConfirm');
}

// ============================================
// MANUTENÇÃO
// ============================================
function prepararModalManutencao() {
  const manuEquip = document.getElementById('manuEquipamento');
  if (manuEquip) {
    manuEquip.innerHTML = '<option value="">Selecione...</option>' +
      DB.equipamentos.map(e => `<option value="${e.id}">${escapeHtml(e.patrimonio)} - ${escapeHtml(e.descricao)}</option>`).join('');
  }
  document.getElementById('manuId').value = '';
  document.getElementById('modalManuTitulo').textContent = 'Nova Ordem de Manutenção';
  ['manuTecnico','manuDefeito','manuServico','manuObs'].forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
  });
  document.getElementById('manuCustoInput').value = '';
  document.getElementById('manuStatusInput').value = 'Aberta';
}

function abrirNovaManutencao() {
  prepararModalManutencao();
  const modal = document.getElementById('modalManutencao');
  if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function editarManutencao(id) {
  const m = DB.manutencoes.find(x => x.id === id);
  if (!m) return;
  prepararModalManutencao();
  document.getElementById('modalManuTitulo').textContent = 'Editar OS de Manutenção';
  document.getElementById('manuId').value = m.id;
  document.getElementById('manuEquipamento').value = m.equipamentoId || '';
  document.getElementById('manuTecnico').value = m.tecnico || '';
  document.getElementById('manuDefeito').value = m.defeito || '';
  document.getElementById('manuServico').value = m.servico || '';
  document.getElementById('manuCustoInput').value = m.custo || '';
  document.getElementById('manuStatusInput').value = m.status || 'Aberta';
  document.getElementById('manuObs').value = m.obs || '';
  const modal = document.getElementById('modalManutencao');
  if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function salvarManutencao() {
  const equipId = parseInt(document.getElementById('manuEquipamento').value);
  const defeito = document.getElementById('manuDefeito').value.trim();
  if (!equipId || !defeito) {
    showToast('Informe o equipamento e o defeito!', 'error');
    return;
  }
  const equip = getEquipamento(equipId);
  const idVal = document.getElementById('manuId').value;
  const data = {
    equipamentoId: equipId,
    equipamentoDesc: equip ? `${equip.patrimonio} - ${equip.descricao}` : '—',
    tecnico: document.getElementById('manuTecnico').value.trim(),
    defeito,
    servico: document.getElementById('manuServico').value.trim(),
    custo: parseFloat(document.getElementById('manuCustoInput').value) || 0,
    status: document.getElementById('manuStatusInput').value,
    obs: document.getElementById('manuObs').value.trim(),
  };

  if (idVal) {
    updateManutencao(parseInt(idVal), data);
    showToast('OS atualizada!', 'success');
  } else {
    addManutencao(data);
    // Auto-update equipment status
    if (equip && data.status !== 'Concluída' && data.status !== 'Cancelada') {
      updateEquipamento(equip.id, { ...equip, status: 'Em Manutenção' });
    }
    showToast('OS de manutenção registrada!', 'success');
  }

  closeModal('modalManutencao');
  refreshAll();
}

function confirmarExcluirManu(id) {
  document.getElementById('confirmTitulo').textContent = 'Excluir OS';
  document.getElementById('confirmMensagem').textContent = 'Deseja excluir esta ordem de manutenção?';
  document.getElementById('confirmBtn').onclick = () => {
    deleteManutencao(id);
    closeModal('modalConfirm');
    showToast('OS excluída!', 'warning');
    renderManutencoes();
    updateManuStats();
  };
  openModal('modalConfirm');
}

function renderManutencoes() {
  const status = document.getElementById('filterManuStatus')?.value || '';
  filteredManus = DB.manutencoes.filter(m => !status || m.status === status)
    .sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));

  const tbody = document.getElementById('manuTableBody');
  if (!tbody) return;

  if (filteredManus.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Nenhuma manutenção encontrada</td></tr>';
    return;
  }

  tbody.innerHTML = filteredManus.map((m, i) => `
    <tr>
      <td><strong style="color:var(--accent);font-family:monospace">OS-${String(m.id).padStart(4,'0')}</strong></td>
      <td>${formatDate(m.dataAbertura)}</td>
      <td>${escapeHtml(m.equipamentoDesc)}</td>
      <td style="max-width:200px">${escapeHtml(m.defeito)}</td>
      <td>${escapeHtml(m.tecnico) || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${m.custo ? formatCurrency(m.custo) : '—'}</td>
      <td>${getManuBadge(m.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-secondary" onclick="editarManutencao(${m.id})" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-icon btn-danger" onclick="confirmarExcluirManu(${m.id})" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filtrarManutencoes() {
  renderManutencoes();
}

function updateManuStats() {
  const emAndamento = DB.manutencoes.filter(m => m.status === 'Aberta' || m.status === 'Em andamento').length;
  const concluidas = DB.manutencoes.filter(m => m.status === 'Concluída').length;
  const custoTotal = DB.manutencoes.reduce((s, m) => s + (parseFloat(m.custo) || 0), 0);

  const elEm = document.getElementById('manuEmAndamento');
  const elConc = document.getElementById('manuConcluidas');
  const elCusto = document.getElementById('manuCusto');

  if (elEm) elEm.textContent = emAndamento;
  if (elConc) elConc.textContent = concluidas;
  if (elCusto) elCusto.textContent = formatCurrency(custoTotal);
}

// ============================================
// CONFIGURAÇÕES
// ============================================
function loadConfiguracoes() {
  const cfg = DB.config;
  const el = document.getElementById('configNome');
  if (el) el.value = cfg.nome || '';
  const em = document.getElementById('configEmpresa');
  if (em) em.value = cfg.empresa || '';
  const es = document.getElementById('configSetor');
  if (es) es.value = cfg.setor || '';

  // Update user info in sidebar
  const userNameEl = document.getElementById('userNameSidebar');
  if (userNameEl) userNameEl.textContent = cfg.nome || 'Administrador';
  const avatarEl = document.getElementById('userAvatarSidebar');
  if (avatarEl) avatarEl.textContent = (cfg.nome || 'A')[0].toUpperCase();

  // Populate security settings fields
  const authUserInp = document.getElementById('authUsuarioInput');
  if (authUserInp) authUserInp.value = cfg.auth?.usuario || 'admin';
  const autoLogoutSel = document.getElementById('authAutoLogoutSelect');
  if (autoLogoutSel && cfg.auth) {
    autoLogoutSel.value = (cfg.auth.autoLogoutMinutes !== undefined) ? cfg.auth.autoLogoutMinutes : '15';
  }

  // Populate Supabase settings fields
  const sbUrlInp = document.getElementById('supabaseUrlInput');
  const sbKeyInp = document.getElementById('supabaseKeyInput');
  if (sbUrlInp) {
    let savedUrl = localStorage.getItem('invbecs_supabase_url') || localStorage.getItem('invti_supabase_url') || '';
    if (typeof supabaseSync !== 'undefined' && savedUrl) {
      savedUrl = supabaseSync.cleanUrl(savedUrl);
    }
    sbUrlInp.value = savedUrl;
  }
  if (sbKeyInp) sbKeyInp.value = localStorage.getItem('invbecs_supabase_anon_key') || localStorage.getItem('invti_supabase_anon_key') || '';

  if (typeof supabaseSync !== 'undefined') {
    const isConn = supabaseSync.isConnected;
    const hasConfig = Boolean(localStorage.getItem('invbecs_supabase_url') || localStorage.getItem('invti_supabase_url'));
    supabaseSync.updateCloudStatusBadge(
      isConn ? 'connected' : (hasConfig ? 'connecting' : 'local'),
      isConn ? 'Nuvem Ativa' : (hasConfig ? 'Conectando...' : 'Modo Local')
    );
  }

  renderTagLocais();
  renderTagSetores();
}

function salvarConfiguracoes() {
  DB.config.nome = document.getElementById('configNome').value.trim() || 'Administrador';
  DB.config.empresa = document.getElementById('configEmpresa').value.trim();
  DB.config.setor = document.getElementById('configSetor').value.trim();
  saveDB(DB);
  loadConfiguracoes();
  setGreeting();
  showToast('Configurações salvas!', 'success');
}

function renderConfiguracoes() {
  loadConfiguracoes();
}

// ============================================
// SUPABASE UI HANDLERS
// ============================================
async function salvarSupabaseConfig() {
  const urlInp = document.getElementById('supabaseUrlInput');
  const keyInp = document.getElementById('supabaseKeyInput');
  let url = urlInp?.value.trim();
  const key = keyInp?.value.trim();

  if (!url || !key) {
    showToast('Informe a URL e a Chave Anon do Supabase.', 'warning');
    return;
  }

  if (typeof supabaseSync !== 'undefined') {
    url = supabaseSync.cleanUrl(url);
    if (urlInp) urlInp.value = url;
    await supabaseSync.saveConfig(url, key);
  }
}

async function testarSupabaseConfig() {
  const urlInp = document.getElementById('supabaseUrlInput');
  const keyInp = document.getElementById('supabaseKeyInput');
  let url = urlInp?.value.trim();
  const key = keyInp?.value.trim();

  if (!url || !key) {
    showToast('Informe a URL e a Chave Anon para testar.', 'warning');
    return;
  }

  if (typeof supabaseSync !== 'undefined') {
    url = supabaseSync.cleanUrl(url);
    if (urlInp) urlInp.value = url;
    showToast('Testando conexão com o Supabase...', 'info');
    const res = await supabaseSync.testConnection(url, key);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  }
}

async function subirDadosSupabase() {
  const urlInp = document.getElementById('supabaseUrlInput');
  const keyInp = document.getElementById('supabaseKeyInput');
  const typedUrl = urlInp?.value.trim();
  const typedKey = keyInp?.value.trim();

  const savedUrl = localStorage.getItem('invbecs_supabase_url') || localStorage.getItem('invti_supabase_url');
  const savedKey = localStorage.getItem('invbecs_supabase_anon_key') || localStorage.getItem('invti_supabase_anon_key');

  if (typeof supabaseSync !== 'undefined') {
    const cleanTyped = supabaseSync.cleanUrl(typedUrl);
    if (urlInp && cleanTyped && cleanTyped !== typedUrl) {
      urlInp.value = cleanTyped;
    }
    // Se o usuário digitou credenciais ou ainda não conectou, salva antes de subir
    if (typedUrl && typedKey && (cleanTyped !== savedUrl || typedKey !== savedKey || !supabaseSync.isConnected)) {
      const ok = await supabaseSync.saveConfig(cleanTyped, typedKey);
      if (!ok) return;
    }
    await supabaseSync.pushAllToCloud();
  }
}

async function baixarDadosSupabase() {
  const urlInp = document.getElementById('supabaseUrlInput');
  const keyInp = document.getElementById('supabaseKeyInput');
  const typedUrl = urlInp?.value.trim();
  const typedKey = keyInp?.value.trim();

  const savedUrl = localStorage.getItem('invbecs_supabase_url') || localStorage.getItem('invti_supabase_url');
  const savedKey = localStorage.getItem('invbecs_supabase_anon_key') || localStorage.getItem('invti_supabase_anon_key');

  if (typeof supabaseSync !== 'undefined') {
    const cleanTyped = supabaseSync.cleanUrl(typedUrl);
    if (urlInp && cleanTyped && cleanTyped !== typedUrl) {
      urlInp.value = cleanTyped;
    }
    if (typedUrl && typedKey && (cleanTyped !== savedUrl || typedKey !== savedKey || !supabaseSync.isConnected)) {
      const ok = await supabaseSync.saveConfig(cleanTyped, typedKey);
      if (!ok) return;
    }
    await supabaseSync.pullAllFromCloud({ silent: false });
  }
}

function desconectarSupabase() {
  if (typeof supabaseSync !== 'undefined') {
    supabaseSync.disconnect();
    const sbUrlInp = document.getElementById('supabaseUrlInput');
    const sbKeyInp = document.getElementById('supabaseKeyInput');
    if (sbUrlInp) sbUrlInp.value = '';
    if (sbKeyInp) sbKeyInp.value = '';
  }
}

function abrirModalSQLSupabase() {
  const textarea = document.getElementById('sqlSupabaseContent');
  if (textarea) {
    textarea.value = `-- ==============================================================================
-- INVBECS - SCHEMA PARA SUPABASE (PostgreSQL + Realtime)
-- Instruções: Cole no "SQL Editor" do Supabase e clique em "Run"
-- ==============================================================================

-- 1. TABELA DE EQUIPAMENTOS
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id BIGINT PRIMARY KEY,
  patrimonio TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  marca TEXT,
  modelo TEXT,
  serial TEXT,
  nf TEXT,
  "dataAquisicao" TEXT,
  valor NUMERIC(12, 2) DEFAULT 0,
  responsavel TEXT,
  localizacao TEXT,
  status TEXT DEFAULT 'Ativo',
  garantia TEXT,
  especificacoes TEXT,
  observacoes TEXT,
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE COLABORADORES
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id BIGINT PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT,
  setor TEXT,
  email TEXT,
  telefone TEXT,
  matricula TEXT,
  observacoes TEXT,
  obs TEXT,
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE MOVIMENTAÇÕES
CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id BIGINT PRIMARY KEY,
  "equipamentoId" BIGINT,
  "equipamentoDesc" TEXT,
  tipo TEXT,
  de TEXT,
  para TEXT,
  responsavel TEXT,
  data TEXT,
  observacoes TEXT,
  obs TEXT,
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE MANUTENÇÕES (ORDENS DE SERVIÇO)
CREATE TABLE IF NOT EXISTS public.manutencoes (
  id BIGINT PRIMARY KEY,
  "equipamentoId" BIGINT,
  "equipamentoDesc" TEXT,
  tipo TEXT,
  fornecedor TEXT,
  problema TEXT,
  solucao TEXT,
  tecnico TEXT,
  defeito TEXT,
  servico TEXT,
  obs TEXT,
  observacoes TEXT,
  "dataAbertura" TEXT,
  "dataConclusao" TEXT,
  custo NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'Aberta',
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE CONFIGURAÇÕES & METADADOS
CREATE TABLE IF NOT EXISTS public.sistema_meta (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE HISTÓRICO DE ATIVIDADES
CREATE TABLE IF NOT EXISTS public.atividades (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  time TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRAÇÕES DE COMPATIBILIDADE DE COLUNAS
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS obs TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS observacoes TEXT;

ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS obs TEXT;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS observacoes TEXT;

ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS tecnico TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS defeito TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS servico TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS obs TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS problema TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS solucao TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- HABILITAR RLS E ACESSO PÚBLICO ANON
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sistema_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipamentos' AND policyname = 'Acesso publico anon equipamentos') THEN
    CREATE POLICY "Acesso publico anon equipamentos" ON public.equipamentos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colaboradores' AND policyname = 'Acesso publico anon colaboradores') THEN
    CREATE POLICY "Acesso publico anon colaboradores" ON public.colaboradores FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'movimentacoes' AND policyname = 'Acesso publico anon movimentacoes') THEN
    CREATE POLICY "Acesso publico anon movimentacoes" ON public.movimentacoes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manutencoes' AND policyname = 'Acesso publico anon manutencoes') THEN
    CREATE POLICY "Acesso publico anon manutencoes" ON public.manutencoes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sistema_meta' AND policyname = 'Acesso publico anon sistema_meta') THEN
    CREATE POLICY "Acesso publico anon sistema_meta" ON public.sistema_meta FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atividades' AND policyname = 'Acesso publico anon atividades') THEN
    CREATE POLICY "Acesso publico anon atividades" ON public.atividades FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ATIVAR REALTIME
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.equipamentos; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.colaboradores; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.manutencoes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sistema_meta; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;`;
  }
  openModal('modalSupabaseSQL');
}

function copiarSQLClipboard() {
  const textarea = document.getElementById('sqlSupabaseContent');
  if (!textarea) return;
  textarea.select();
  navigator.clipboard.writeText(textarea.value).then(() => {
    showToast('Código SQL copiado para a área de transferência!', 'success');
  }).catch(() => {
    document.execCommand('copy');
    showToast('Código SQL copiado!', 'success');
  });
}

function renderTagLocais() {
  const el = document.getElementById('tagLocais');
  if (!el) return;
  el.innerHTML = DB.localizacoes.map(l => `
    <span class="tag">
      ${escapeHtml(l)}
      <span class="tag-remove" onclick="removerLocalizacao('${escapeHtml(l).replace(/'/g, "\\'")}')">✕</span>
    </span>
  `).join('');
}

function renderTagSetores() {
  const el = document.getElementById('tagSetores');
  if (!el) return;
  el.innerHTML = DB.setores.map(s => `
    <span class="tag">
      ${escapeHtml(s)}
      <span class="tag-remove" onclick="removerSetor('${escapeHtml(s).replace(/'/g, "\\'")}')">✕</span>
    </span>
  `).join('');
}

function adicionarLocalizacao() {
  const input = document.getElementById('novaLocalizacao');
  const val = input?.value.trim();
  if (!val) return;
  if (addLocalizacao(val)) {
    input.value = '';
    renderTagLocais();
    updateFilterLocais();
    showToast(`Localização "${val}" adicionada!`, 'success');
  } else {
    showToast('Localização já existe!', 'warning');
  }
}

function removerLocalizacao(loc) {
  removeLocalizacao(loc);
  renderTagLocais();
  updateFilterLocais();
}

function adicionarSetor() {
  const input = document.getElementById('novoSetor');
  const val = input?.value.trim();
  if (!val) return;
  if (addSetor(val)) {
    input.value = '';
    renderTagSetores();
    showToast(`Setor "${val}" adicionado!`, 'success');
  } else {
    showToast('Setor já existe!', 'warning');
  }
}

function removerSetor(setor) {
  removeSetor(setor);
  renderTagSetores();
}

// ============================================
// RELATÓRIOS
// ============================================
function gerarRelatorio(tipo) {
  const output = document.getElementById('relatorioOutput');
  const titulo = document.getElementById('relatorioTitulo');
  const conteudo = document.getElementById('relatorioConteudo');
  if (!output || !titulo || !conteudo) return;

  let html = '';
  const dataAtual = new Date().toLocaleDateString('pt-BR');

  if (tipo === 'geral') {
    titulo.textContent = `Relatório Geral de Equipamentos — ${dataAtual}`;
    const equips = [...DB.equipamentos].sort((a,b) => (a.patrimonio||'').localeCompare(b.patrimonio||''));
    html = `<div class="report-summary">Total: <strong>${equips.length}</strong> equipamento(s)</div>
    <table>
      <thead><tr>
        <th>Patrimônio</th><th>Descrição</th><th>Categoria</th><th>Marca/Modelo</th>
        <th>Responsável</th><th>Localização</th><th>Status</th><th>Aquisição</th><th>Valor</th>
      </tr></thead>
      <tbody>
        ${equips.length === 0 ? '<tr><td colspan="9" class="empty-row">Nenhum equipamento</td></tr>' :
          equips.map(e => `<tr>
            <td><strong>${escapeHtml(e.patrimonio)}</strong></td>
            <td>${escapeHtml(e.descricao)}</td>
            <td>${escapeHtml(e.categoria)}</td>
            <td>${[e.marca,e.modelo].filter(Boolean).map(escapeHtml).join(' / ') || '—'}</td>
            <td>${escapeHtml(e.responsavel) || '—'}</td>
            <td>${escapeHtml(e.localizacao) || '—'}</td>
            <td>${getBadge(e.status)}</td>
            <td>${formatDate(e.dataAquisicao)}</td>
            <td>${formatCurrency(e.valor)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  } else if (tipo === 'categoria') {
    titulo.textContent = `Relatório por Categoria — ${dataAtual}`;
    const cats = {};
    DB.equipamentos.forEach(e => { cats[e.categoria] = (cats[e.categoria] || []).concat(e); });
    html = Object.entries(cats).sort((a,b)=>b[1].length-a[1].length).map(([cat, equips]) => `
      <div style="padding:16px 20px 0">
        <h4 style="color:var(--accent);font-size:13px;margin-bottom:8px">
          ${escapeHtml(cat)} <span style="color:var(--text-muted);font-weight:400">(${equips.length})</span>
        </h4>
      </div>
      <table style="margin-bottom:8px">
        <thead><tr><th>Patrimônio</th><th>Descrição</th><th>Marca/Modelo</th><th>Responsável</th><th>Status</th></tr></thead>
        <tbody>${equips.map(e => `<tr>
          <td><strong>${escapeHtml(e.patrimonio)}</strong></td>
          <td>${escapeHtml(e.descricao)}</td>
          <td>${[e.marca,e.modelo].filter(Boolean).map(escapeHtml).join(' / ') || '—'}</td>
          <td>${escapeHtml(e.responsavel) || '—'}</td>
          <td>${getBadge(e.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
    `).join('') || '<div class="report-summary">Nenhum equipamento cadastrado.</div>';

  } else if (tipo === 'colaborador') {
    titulo.textContent = `Relatório por Colaborador — ${dataAtual}`;
    html = DB.colaboradores.length === 0 ? '<div class="report-summary">Nenhum colaborador cadastrado.</div>' :
      DB.colaboradores.map(c => {
        const equips = DB.equipamentos.filter(e => e.responsavel === c.nome);
        return `
        <div style="padding:16px 20px 0">
          <h4 style="color:var(--accent);font-size:13px;margin-bottom:4px">${escapeHtml(c.nome)} — ${escapeHtml(c.cargo || '')} | ${escapeHtml(c.setor || '')}</h4>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${equips.length} equipamento(s)</p>
        </div>
        ${equips.length > 0 ? `<table style="margin-bottom:8px">
          <thead><tr><th>Patrimônio</th><th>Descrição</th><th>Categoria</th><th>Status</th></tr></thead>
          <tbody>${equips.map(e => `<tr>
            <td><strong>${escapeHtml(e.patrimonio)}</strong></td>
            <td>${escapeHtml(e.descricao)}</td>
            <td>${escapeHtml(e.categoria)}</td>
            <td>${getBadge(e.status)}</td>
          </tr>`).join('')}</tbody>
        </table>` : '<div style="padding:4px 20px 12px;font-size:12px;color:var(--text-muted)">Sem equipamentos atribuídos</div>'}`;
      }).join('');

  } else if (tipo === 'manutencao') {
    titulo.textContent = `Relatório de Manutenções — ${dataAtual}`;
    const manus = [...DB.manutencoes].sort((a,b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));
    const totalCusto = manus.reduce((s,m) => s + (parseFloat(m.custo)||0), 0);
    html = `<div class="report-summary">
      Total de OS: <strong>${manus.length}</strong> | 
      Custo total: <strong>${formatCurrency(totalCusto)}</strong>
    </div>
    <table>
      <thead><tr><th>OS</th><th>Data</th><th>Equipamento</th><th>Defeito</th><th>Técnico</th><th>Custo</th><th>Status</th></tr></thead>
      <tbody>${manus.length === 0 ? '<tr><td colspan="7" class="empty-row">Nenhuma manutenção</td></tr>' :
        manus.map(m => `<tr>
          <td>OS-${String(m.id).padStart(4,'0')}</td>
          <td>${formatDate(m.dataAbertura)}</td>
          <td>${escapeHtml(m.equipamentoDesc)}</td>
          <td>${escapeHtml(m.defeito)}</td>
          <td>${escapeHtml(m.tecnico) || '—'}</td>
          <td>${m.custo ? formatCurrency(m.custo) : '—'}</td>
          <td>${getManuBadge(m.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  } else if (tipo === 'local') {
    titulo.textContent = `Relatório por Localização — ${dataAtual}`;
    const locais = {};
    DB.equipamentos.forEach(e => {
      const loc = e.localizacao || 'Não definida';
      locais[loc] = (locais[loc] || []).concat(e);
    });
    html = Object.entries(locais).sort((a,b)=>b[1].length-a[1].length).map(([loc, equips]) => `
      <div style="padding:16px 20px 0">
        <h4 style="color:var(--accent);font-size:13px;margin-bottom:8px">
          📍 ${escapeHtml(loc)} <span style="color:var(--text-muted);font-weight:400">(${equips.length})</span>
        </h4>
      </div>
      <table style="margin-bottom:8px">
        <thead><tr><th>Patrimônio</th><th>Descrição</th><th>Categoria</th><th>Responsável</th><th>Status</th></tr></thead>
        <tbody>${equips.map(e => `<tr>
          <td><strong>${escapeHtml(e.patrimonio)}</strong></td>
          <td>${escapeHtml(e.descricao)}</td>
          <td>${escapeHtml(e.categoria)}</td>
          <td>${escapeHtml(e.responsavel) || '—'}</td>
          <td>${getBadge(e.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
    `).join('') || '<div class="report-summary">Nenhum equipamento cadastrado.</div>';
  }

  conteudo.innerHTML = html;
  output.style.display = 'block';
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function imprimirRelatorio() {
  window.print();
}

// ============================================
// EXPORT CSV
// ============================================
function exportarCSV() {
  if (DB.equipamentos.length === 0) {
    showToast('Nenhum equipamento para exportar!', 'warning');
    return;
  }
  const headers = ['Patrimônio','Descrição','Categoria','Marca','Modelo','Nº Série','NF',
    'Data Aquisição','Valor','Responsável','Localização','Status','Garantia','Especificações','Observações','Data Cadastro'];
  const rows = DB.equipamentos.map(e => [
    e.patrimonio, e.descricao, e.categoria, e.marca, e.modelo, e.serial, e.nf,
    formatDate(e.dataAquisicao), e.valor || '', e.responsavel, e.localizacao, e.status,
    formatDate(e.garantia), e.especificacoes, e.observacoes, formatDate(e.dataCadastro)
  ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`));

  const csv = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Inventario_TI_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado com sucesso!', 'success');
}

// ============================================
// BACKUP
// ============================================
function exportarBackup() {
  const json = exportarBackupJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invbecs_Backup_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado!', 'success');
}

function importarBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      importarBackupJSON(e.target.result);
      showToast('Backup importado com sucesso!', 'success');
      refreshAll();
      loadConfiguracoes();
    } catch (err) {
      showToast('Erro ao importar backup. Verifique o arquivo.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function confirmarLimparDados() {
  document.getElementById('confirmTitulo').textContent = '⚠️ Limpar Todos os Dados';
  document.getElementById('confirmMensagem').innerHTML =
    'Esta ação irá <strong>apagar permanentemente</strong> todos os equipamentos, colaboradores, movimentações e manutenções cadastrados. Esta ação <strong>não pode ser desfeita</strong>.';
  document.getElementById('confirmBtn').textContent = 'Sim, limpar tudo';
  document.getElementById('confirmBtn').onclick = () => {
    DB = JSON.parse(JSON.stringify(DEFAULT_DB));
    saveDB(DB);
    closeModal('modalConfirm');
    showToast('Todos os dados foram apagados.', 'warning');
    refreshAll();
    loadConfiguracoes();
  };
  openModal('modalConfirm');
}

// ============================================
// GLOBAL SEARCH
// ============================================
function initSearch() {
  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      results.classList.remove('visible');
      return;
    }

    const hits = [];
    DB.equipamentos.filter(e =>
      (e.patrimonio || '').toLowerCase().includes(q) ||
      (e.descricao || '').toLowerCase().includes(q) ||
      (e.marca || '').toLowerCase().includes(q)
    ).slice(0, 5).forEach(e => hits.push({ type: 'Equip.', label: `${e.patrimonio} — ${e.descricao}`, action: () => { verDetalheEquipamento(e.id); input.value = ''; results.classList.remove('visible'); } }));

    DB.colaboradores.filter(c =>
      (c.nome || '').toLowerCase().includes(q) ||
      (c.cargo || '').toLowerCase().includes(q)
    ).slice(0, 3).forEach(c => hits.push({ type: 'Colab.', label: c.nome, action: () => { navigateTo('colaboradores'); input.value = ''; results.classList.remove('visible'); } }));

    if (hits.length === 0) {
      results.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">Nenhum resultado encontrado</div>';
    } else {
      results.innerHTML = hits.map((h, i) => `
        <div class="search-result-item" data-idx="${i}">
          <span class="search-result-type">${h.type}</span>
          <span>${escapeHtml(h.label)}</span>
        </div>
      `).join('');
      results.querySelectorAll('.search-result-item').forEach((el, i) => {
        el.addEventListener('click', hits[i].action);
      });
    }
    results.classList.add('visible');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#globalSearchContainer')) {
      results.classList.remove('visible');
    }
  });
}

// ============================================
// PAGINATION
// ============================================
function renderPagination(containerId, total, current, onChangeFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="(${onChangeFn})(${current - 1})" ${current === 1 ? 'disabled' : ''}>&laquo;</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - current) > 2 && i !== 1 && i !== totalPages) {
      if (i === 2 || i === totalPages - 1) html += '<span style="color:var(--text-muted);padding:0 4px">…</span>';
      continue;
    }
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="(${onChangeFn})(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="(${onChangeFn})(${current + 1})" ${current === totalPages ? 'disabled' : ''}>&raquo;</button>`;
  container.innerHTML = html;
}

// ============================================
// BADGES / HELPERS
// ============================================
function getBadge(status) {
  const map = {
    'Ativo': 'badge-ativo',
    'Em Manutenção': 'badge-manutencao',
    'Inativo': 'badge-inativo',
    'Descartado': 'badge-descartado',
    'Reserva': 'badge-reserva',
  };
  const cls = map[status] || 'badge-inativo';
  return `<span class="badge ${cls}">${escapeHtml(status || '—')}</span>`;
}

function getMovBadge(tipo) {
  const map = {
    'Entrada': 'badge-entrada',
    'Saída': 'badge-saida',
    'Transferência': 'badge-transferencia',
    'Manutenção': 'badge-manutencao',
    'Retorno': 'badge-retorno',
    'Descarte': 'badge-descarte',
  };
  const cls = map[tipo] || '';
  return `<span class="badge ${cls}">${escapeHtml(tipo || '—')}</span>`;
}

function getManuBadge(status) {
  const map = {
    'Aberta': 'badge-aberta',
    'Em andamento': 'badge-em-andamento',
    'Concluída': 'badge-concluida',
    'Cancelada': 'badge-cancelada',
  };
  const cls = map[status] || '';
  return `<span class="badge ${cls}">${escapeHtml(status || '—')}</span>`;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info}<span class="toast-message">${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
// GARANTIAS CHECK
// ============================================
function checkGarantias() {
  const hoje = new Date();
  const em30dias = new Date(hoje);
  em30dias.setDate(em30dias.getDate() + 30);

  const vencendoEmBreve = DB.equipamentos.filter(e => {
    if (!e.garantia) return false;
    const g = new Date(e.garantia);
    return g >= hoje && g <= em30dias;
  });

  const notifDot = document.getElementById('notifDot');
  if (notifDot) {
    notifDot.classList.toggle('visible', vencendoEmBreve.length > 0);
  }
}
// ============================================
// AUTENTICAÇÃO E SEGURANÇA AVANÇADA
// ============================================
const AUTH_SESSION_KEY = 'invbecs_session_token';
const AUTH_ATTEMPTS_KEY = 'invbecs_failed_attempts';
const AUTH_LOCKOUT_KEY = 'invbecs_lockout_until';
const LEGACY_AUTH_SESSION_KEY = 'invti_session_token';

let inactivityTimer = null;
let lockoutInterval = null;

// ---- Inatividade & Auto-Logout ----
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  const minutes = (DB.config.auth && DB.config.auth.autoLogoutMinutes !== undefined)
    ? DB.config.auth.autoLogoutMinutes
    : 15;
  if (minutes > 0) {
    inactivityTimer = setTimeout(() => {
      handleLogout(true);
    }, minutes * 60 * 1000);
  }
}

function initInactivityTracker() {
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}

function stopInactivityTracker() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
}

// ---- Proteção contra Força Bruta (Rate Limiting) ----
function checkLockout() {
  const lockoutUntil = parseInt(sessionStorage.getItem(AUTH_LOCKOUT_KEY) || '0', 10);
  const now = Date.now();
  const lockoutEl = document.getElementById('loginLockout');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const userField = document.getElementById('loginUser');
  const passField = document.getElementById('loginPass');

  if (lockoutUntil > now) {
    const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
    if (lockoutEl) {
      lockoutEl.style.display = 'block';
      lockoutEl.textContent = `Acesso temporariamente bloqueado por segurança. Tente novamente em ${remainingSec}s.`;
    }
    if (submitBtn) submitBtn.disabled = true;
    if (userField) userField.disabled = true;
    if (passField) passField.disabled = true;

    if (!lockoutInterval) {
      lockoutInterval = setInterval(() => {
        checkLockout();
      }, 1000);
    }
    return true;
  } else {
    if (lockoutInterval) {
      clearInterval(lockoutInterval);
      lockoutInterval = null;
    }
    sessionStorage.removeItem(AUTH_LOCKOUT_KEY);
    if (lockoutEl) lockoutEl.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    if (userField) userField.disabled = false;
    if (passField) passField.disabled = false;
    return false;
  }
}

// ---- Verificação de Sessão Inicial ----
function checkAuth() {
  const sessionToken = sessionStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(LEGACY_AUTH_SESSION_KEY);
  const loginOverlay = document.getElementById('loginScreen');

  if (sessionToken) {
    document.body.classList.remove('auth-locked');
    if (loginOverlay) loginOverlay.classList.add('hidden');
    initInactivityTracker();
    return true;
  } else {
    document.body.classList.add('auth-locked');
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    checkLockout();
    return false;
  }
}

// ---- Processo de Login ----
async function handleLogin(event) {
  event.preventDefault();
  if (checkLockout()) return;

  const userInput = document.getElementById('loginUser').value.trim();
  const passInput = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  const cardEl = document.getElementById('loginCard');

  const authConfig = DB.config.auth || DEFAULT_AUTH;
  const computedHash = await hashPassword(passInput, authConfig.salt);

  const isUserValid = (userInput.toLowerCase() === authConfig.usuario.toLowerCase());
  const isPassValid = (computedHash === authConfig.hash);

  if (isUserValid && isPassValid) {
    // Autenticado com sucesso
    sessionStorage.setItem(AUTH_SESSION_KEY, 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2));
    sessionStorage.removeItem(AUTH_ATTEMPTS_KEY);
    sessionStorage.removeItem(AUTH_LOCKOUT_KEY);

    if (errorEl) errorEl.style.display = 'none';
    const noticeEl = document.getElementById('loginNotice');
    if (noticeEl) noticeEl.style.display = 'none';

    document.body.classList.remove('auth-locked');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('loginPass').value = '';

    // Inicializa o sistema seguro
    loadConfiguracoes();
    refreshAll();
    setGreeting();
    initInactivityTracker();
    if (typeof supabaseSync !== 'undefined') {
      supabaseSync.init();
    }
    showToast('Acesso concedido com sucesso!', 'success');
  } else {
    // Falha de autenticação
    let attempts = parseInt(sessionStorage.getItem(AUTH_ATTEMPTS_KEY) || '0', 10) + 1;
    sessionStorage.setItem(AUTH_ATTEMPTS_KEY, attempts.toString());

    if (cardEl) {
      cardEl.classList.remove('shake-card');
      void cardEl.offsetWidth; // Trigger reflow para reiniciar animação
      cardEl.classList.add('shake-card');
    }

    if (attempts >= 5) {
      const lockUntil = Date.now() + 30000; // Bloqueio de 30 segundos
      sessionStorage.setItem(AUTH_LOCKOUT_KEY, lockUntil.toString());
      sessionStorage.setItem(AUTH_ATTEMPTS_KEY, '0');
      if (errorEl) errorEl.style.display = 'none';
      checkLockout();
    } else {
      const restantes = 5 - attempts;
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = `Usuário ou senha incorretos! Restam ${restantes} tentativa(s).`;
      }
    }
  }
}

// ---- Logout ----
function handleLogout(isTimeout = false) {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
  stopInactivityTracker();
  document.body.classList.add('auth-locked');

  const loginOverlay = document.getElementById('loginScreen');
  if (loginOverlay) loginOverlay.classList.remove('hidden');

  const errorEl = document.getElementById('loginError');
  if (errorEl) errorEl.style.display = 'none';

  const noticeEl = document.getElementById('loginNotice');
  if (noticeEl) {
    if (isTimeout) {
      noticeEl.style.display = 'block';
      noticeEl.textContent = '🔒 Sessão encerrada automaticamente por inatividade.';
    } else {
      noticeEl.style.display = 'none';
    }
  }

  const passInput = document.getElementById('loginPass');
  if (passInput) passInput.value = '';

  checkLockout();
  if (!isTimeout) {
    showToast('Sessão encerrada com segurança.', 'info');
  }
}

// ---- Alternar Visualização de Senha ----
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ---- Medidor de Força de Senha ----
function checkPasswordStrength(password) {
  const bar = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (!bar || !label) return;

  if (!password) {
    bar.className = 'strength-bar';
    label.textContent = 'Mínimo 6 caracteres recomendados';
    label.style.color = 'var(--text-muted)';
    return;
  }

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    bar.className = 'strength-bar weak';
    label.textContent = 'Força da senha: Fraca';
    label.style.color = 'var(--red)';
  } else if (score <= 4) {
    bar.className = 'strength-bar medium';
    label.textContent = 'Força da senha: Média';
    label.style.color = 'var(--yellow)';
  } else {
    bar.className = 'strength-bar strong';
    label.textContent = 'Força da senha: Forte (Excelente!)';
    label.style.color = 'var(--green)';
  }
}

// ---- Salvar Alterações de Segurança (Configurações) ----
async function salvarSeguranca() {
  const authConfig = DB.config.auth || { ...DEFAULT_AUTH };
  const userField = document.getElementById('authUsuarioInput');
  const currentPassField = document.getElementById('authSenhaAtualInput');
  const newPassField = document.getElementById('authNovaSenhaInput');
  const confirmPassField = document.getElementById('authConfirmaSenhaInput');
  const autoLogoutSelect = document.getElementById('authAutoLogoutSelect');

  const novoUsuario = userField?.value.trim() || authConfig.usuario;
  const senhaAtual = currentPassField?.value || '';
  const novaSenha = newPassField?.value || '';
  const confirmaSenha = confirmPassField?.value || '';
  const autoLogoutVal = parseInt(autoLogoutSelect?.value || '15', 10);

  if (!senhaAtual) {
    showToast('Digite a senha atual para autorizar as alterações.', 'error');
    currentPassField?.focus();
    return;
  }

  // Validação criptográfica da senha atual
  const currentHash = await hashPassword(senhaAtual, authConfig.salt);
  if (currentHash !== authConfig.hash) {
    showToast('A senha atual informada está incorreta!', 'error');
    currentPassField?.focus();
    return;
  }

  // Se o usuário solicitou troca de senha
  if (novaSenha) {
    if (novaSenha.length < 4) {
      showToast('A nova senha deve ter pelo menos 4 caracteres.', 'warning');
      newPassField?.focus();
      return;
    }
    if (novaSenha !== confirmaSenha) {
      showToast('A confirmação da nova senha não confere!', 'error');
      confirmPassField?.focus();
      return;
    }

    // Gera um novo salt criptográfico único para a nova senha
    const newSalt = 'invbecs_salt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const newHash = await hashPassword(novaSenha, newSalt);

    authConfig.salt = newSalt;
    authConfig.hash = newHash;
  }

  authConfig.usuario = novoUsuario;
  authConfig.autoLogoutMinutes = autoLogoutVal;
  DB.config.auth = authConfig;

  saveDB(DB);

  // Limpa campos confidenciais
  if (currentPassField) currentPassField.value = '';
  if (newPassField) newPassField.value = '';
  if (confirmPassField) confirmPassField.value = '';
  checkPasswordStrength('');

  resetInactivityTimer();
  showToast('Configurações de segurança atualizadas com sucesso!', 'success');
}

