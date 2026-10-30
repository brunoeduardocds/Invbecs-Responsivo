// ============================================
// DATA LAYER - localStorage persistence
// ============================================

const DB_KEY = 'invbecs_db';
const LEGACY_DB_KEY = 'invti_db';

// Configurações e Hash padrão para o primeiro acesso (admin / 123)
const DEFAULT_AUTH = {
  usuario: 'admin',
  salt: 'invbecs_salt_v1',
  hash: 'fe58001e3d438478a9fe8f53db8dd7420dd80794a6750eb7cae472a4b53b9891', // SHA-256 de ('123' + salt)
  autoLogoutMinutes: 15
};

const DEFAULT_DB = {
  equipamentos: [],
  colaboradores: [],
  movimentacoes: [],
  manutencoes: [],
  localizacoes: ['TI - Sala Principal', 'Sala de Reuniões A', 'Sala de Reuniões B', 'Recepção', 'Almoxarifado TI', 'Servidor - Rack'],
  setores: ['TI', 'Administrativo', 'Financeiro', 'RH', 'Comercial', 'Operações', 'Diretoria'],
  config: { 
    nome: 'Administrador', 
    empresa: '', 
    setor: 'TI',
    auth: { ...DEFAULT_AUTH }
  },
  actividades: [],
  nextEquipId: 1,
  nextColabId: 1,
  nextMovId: 1,
  nextManuId: 1,
};

// Função criptográfica nativa para gerar hash SHA-256 com salt
async function hashPassword(plainText, salt = 'invbecs_salt_v1') {
  const enc = new TextEncoder();
  const data = enc.encode(plainText + (salt || ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadDB() {
  try {
    let raw = localStorage.getItem(DB_KEY);
    // Migração suave do banco anterior se existir
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_DB_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(DB_KEY, legacyRaw);
      }
    }
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DB));
    const db = JSON.parse(raw);
    // Merge missing keys from DEFAULT_DB
    for (const key of Object.keys(DEFAULT_DB)) {
      if (db[key] === undefined) db[key] = DEFAULT_DB[key];
    }
    // Garante que o objeto auth e seus campos existam mesmo em bancos antigos
    if (!db.config) db.config = { ...DEFAULT_DB.config };
    if (!db.config.auth || !db.config.auth.hash) {
      db.config.auth = { ...DEFAULT_AUTH };
    }
    return db;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Global DB reference
let DB = loadDB();

// ---- Equipamentos ----
function addEquipamento(equip) {
  equip.id = DB.nextEquipId++;
  equip.dataCadastro = new Date().toISOString();
  DB.equipamentos.push(equip);
  addActivity(`Equipamento <strong>${equip.descricao}</strong> (${equip.patrimonio}) cadastrado`, 'add');
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncEquipamento(equip);
  return equip;
}

function updateEquipamento(id, data) {
  const idx = DB.equipamentos.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const old = { ...DB.equipamentos[idx] };
  DB.equipamentos[idx] = { ...DB.equipamentos[idx], ...data, id };
  addActivity(`Equipamento <strong>${DB.equipamentos[idx].descricao}</strong> (${DB.equipamentos[idx].patrimonio}) atualizado`, 'edit');
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncEquipamento(DB.equipamentos[idx]);
  return DB.equipamentos[idx];
}

function deleteEquipamento(id) {
  const equip = DB.equipamentos.find(e => e.id === id);
  if (equip) {
    addActivity(`Equipamento <strong>${equip.descricao}</strong> (${equip.patrimonio}) removido`, 'delete');
  }
  DB.equipamentos = DB.equipamentos.filter(e => e.id !== id);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.deleteEquipamento(id);
}

function getEquipamento(id) {
  return DB.equipamentos.find(e => e.id === id);
}

// ---- Colaboradores ----
function addColaborador(colab) {
  colab.id = DB.nextColabId++;
  colab.dataCadastro = new Date().toISOString();
  DB.colaboradores.push(colab);
  addActivity(`Colaborador <strong>${colab.nome}</strong> cadastrado`, 'add');
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncColaborador(colab);
  return colab;
}

function updateColaborador(id, data) {
  const idx = DB.colaboradores.findIndex(c => c.id === id);
  if (idx === -1) return null;
  DB.colaboradores[idx] = { ...DB.colaboradores[idx], ...data, id };
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncColaborador(DB.colaboradores[idx]);
  return DB.colaboradores[idx];
}

function deleteColaborador(id) {
  const colab = DB.colaboradores.find(c => c.id === id);
  if (colab) addActivity(`Colaborador <strong>${colab.nome}</strong> removido`, 'delete');
  DB.colaboradores = DB.colaboradores.filter(c => c.id !== id);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.deleteColaborador(id);
}

function getColaborador(id) {
  return DB.colaboradores.find(c => c.id === id);
}

function getEquipamentosDoColaborador(colabId) {
  const colab = getColaborador(colabId);
  if (!colab) return [];
  return DB.equipamentos.filter(e => e.responsavel === colab.nome);
}

// ---- Movimentações ----
function addMovimentacao(mov) {
  mov.id = DB.nextMovId++;
  mov.dataCadastro = new Date().toISOString();
  if (!mov.data) mov.data = new Date().toISOString().split('T')[0];
  DB.movimentacoes.push(mov);
  addActivity(`Movimentação de <strong>${mov.equipamentoDesc}</strong>: ${mov.tipo}`, 'move');
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncMovimentacao(mov);
  return mov;
}

function deleteMovimentacao(id) {
  DB.movimentacoes = DB.movimentacoes.filter(m => m.id !== id);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.deleteMovimentacao(id);
}

// ---- Manutenções ----
function addManutencao(manu) {
  manu.id = DB.nextManuId++;
  manu.dataAbertura = new Date().toISOString().split('T')[0];
  manu.dataCadastro = new Date().toISOString();
  DB.manutencoes.push(manu);
  addActivity(`OS de manutenção aberta para <strong>${manu.equipamentoDesc}</strong>`, 'manu');
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncManutencao(manu);
  return manu;
}

function updateManutencao(id, data) {
  const idx = DB.manutencoes.findIndex(m => m.id === id);
  if (idx === -1) return null;
  DB.manutencoes[idx] = { ...DB.manutencoes[idx], ...data, id };
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncManutencao(DB.manutencoes[idx]);
  return DB.manutencoes[idx];
}

function deleteManutencao(id) {
  DB.manutencoes = DB.manutencoes.filter(m => m.id !== id);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.deleteManutencao(id);
}

// ---- Activity Log ----
function addActivity(text, type) {
  const item = { text, type, time: new Date().toISOString() };
  DB.actividades.unshift(item);
  if (DB.actividades.length > 50) DB.actividades = DB.actividades.slice(0, 50);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncAtividade(item);
}

// ---- Localizações ----
function addLocalizacao(loc) {
  if (!loc || DB.localizacoes.includes(loc)) return false;
  DB.localizacoes.push(loc);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncMetadata('localizacoes', DB.localizacoes);
  return true;
}

function removeLocalizacao(loc) {
  DB.localizacoes = DB.localizacoes.filter(l => l !== loc);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncMetadata('localizacoes', DB.localizacoes);
}

// ---- Setores ----
function addSetor(setor) {
  if (!setor || DB.setores.includes(setor)) return false;
  DB.setores.push(setor);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncMetadata('setores', DB.setores);
  return true;
}

function removeSetor(setor) {
  DB.setores = DB.setores.filter(s => s !== setor);
  saveDB(DB);
  if (typeof supabaseSync !== 'undefined') supabaseSync.syncMetadata('setores', DB.setores);
}

// ---- Backup ----
function exportarBackupJSON() {
  return JSON.stringify(DB, null, 2);
}

function importarBackupJSON(jsonStr) {
  const imported = JSON.parse(jsonStr);
  DB = { ...DEFAULT_DB, ...imported };
  if (!DB.config) DB.config = { ...DEFAULT_DB.config };
  if (!DB.config.auth || !DB.config.auth.hash) {
    DB.config.auth = { ...DEFAULT_AUTH };
  }
  saveDB(DB);
}

// ---- Utils ----
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch { return dateStr; }
}

function formatCurrency(val) {
  if (!val && val !== 0) return '-';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'agora mesmo';
    if (mins < 60) return `há ${mins} min`;
    if (hours < 24) return `há ${hours}h`;
    if (days < 7) return `há ${days}d`;
    return d.toLocaleDateString('pt-BR');
  } catch { return iso; }
}

function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 5);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
