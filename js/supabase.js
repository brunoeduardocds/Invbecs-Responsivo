// ==============================================================================
// SUPABASE SYNC MODULE - Sincronização em Nuvem e Tempo Real (Multi-dispositivo)
// ==============================================================================

const SUPABASE_STORAGE_URL_KEY = 'invbecs_supabase_url';
const SUPABASE_STORAGE_ANON_KEY = 'invbecs_supabase_anon_key';
const SUPABASE_STORAGE_ENABLED = 'invbecs_supabase_enabled';
const LEGACY_STORAGE_URL_KEY = 'invti_supabase_url';
const LEGACY_STORAGE_ANON_KEY = 'invti_supabase_anon_key';
const LEGACY_STORAGE_ENABLED = 'invti_supabase_enabled';

const supabaseSync = {
  client: null,
  isConnected: false,
  isSyncing: false,
  subscription: null,

  // Normaliza e limpa a URL do Supabase para evitar erros como "Invalid path specified in request URL"
  cleanUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim();
    if (!clean) return '';

    // Adiciona protocolo se o usuário não digitou
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }

    try {
      const parsed = new URL(clean);
      let pathname = parsed.pathname.replace(/\/+$/, '');
      // Remove sufixos como /rest/v1, /auth/v1, /storage/v1, etc.
      pathname = pathname.replace(/\/(rest|auth|storage|graphql)(\/v\d+)?$/i, '');
      parsed.pathname = pathname === '/' ? '' : pathname;
      parsed.search = '';
      parsed.hash = '';
      let res = parsed.origin + (parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '');
      return res.replace(/\/+$/, '');
    } catch {
      return clean
        .replace(/\/+$/, '')
        .replace(/\/(rest|auth|storage|graphql)(\/v\d+)?$/i, '')
        .replace(/\/+$/, '');
    }
  },

  // Extrai nome de coluna ausente caso o PostgREST retorne erro de schema cache
  extractMissingColumn(error) {
    if (!error) return null;
    const msg = typeof error === 'string' ? error : (error.message || '');
    const match = msg.match(/Could not find the '([^']+)' column/i) ||
                  msg.match(/column '([^']+)'/i) ||
                  msg.match(/column "([^"]+)"/i);
    return match ? match[1] : null;
  },

  // Upsert inteligente com auto-recuperação caso a tabela do Supabase tenha colunas diferentes
  async safeUpsert(table, rows, onConflict = 'id') {
    if (!this.client || !this.isConnected || !rows || rows.length === 0) {
      return { success: false, error: new Error('Cliente desconectado ou sem dados para enviar') };
    }

    let payload = rows.map(r => ({ ...r }));
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data, error } = await this.client.from(table).upsert(payload, { onConflict });
      if (!error) return { success: true, data };

      const missingCol = this.extractMissingColumn(error);
      if (missingCol && payload.some(item => missingCol in item)) {
        console.warn(`[Supabase safeUpsert] Coluna "${missingCol}" não encontrada na tabela "${table}". Removendo e reenviando...`);
        payload = payload.map(item => {
          const copy = { ...item };
          delete copy[missingCol];
          return copy;
        });
        continue;
      }
      return { success: false, error };
    }
    return { success: false, error: new Error(`Falha ao sincronizar dados na tabela ${table}`) };
  },

  // Formata mensagens de erro técnicas para alertas amigáveis em português
  formatError(error) {
    if (!error) return 'Erro desconhecido.';
    const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));

    if (msg.includes('Invalid path specified in request URL')) {
      return 'URL do Supabase incorreta (não inclua "/rest/v1" ou barras extras no final). Use apenas a URL base: https://[seu-projeto].supabase.co';
    }
    if (error.code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
      return 'As tabelas ainda não foram criadas no Supabase! Clique no botão "Ver Script SQL para o Supabase", copie o código e execute no SQL Editor do Supabase.';
    }
    if (error.code === 'PGRST301' || msg.includes('JWT') || msg.includes('API key') || msg.includes('apikey')) {
      return 'Chave de API (Anon Key) inválida ou expirada. Verifique em Project Settings > API no painel do Supabase.';
    }
    return msg;
  },

  // Inicializa o cliente e testa conexão se configurado
  async init() {
    let rawUrl = localStorage.getItem(SUPABASE_STORAGE_URL_KEY) || localStorage.getItem(LEGACY_STORAGE_URL_KEY);
    const key = localStorage.getItem(SUPABASE_STORAGE_ANON_KEY) || localStorage.getItem(LEGACY_STORAGE_ANON_KEY);
    const enabled = (localStorage.getItem(SUPABASE_STORAGE_ENABLED) || localStorage.getItem(LEGACY_STORAGE_ENABLED)) !== 'false';

    this.updateCloudStatusBadge('connecting', 'Conectando...');

    if (!rawUrl || !key || !enabled) {
      this.isConnected = false;
      this.updateCloudStatusBadge('local', 'Modo Local');
      return false;
    }

    // Auto-higienização da URL salva no navegador
    const url = this.cleanUrl(rawUrl);
    if (url !== rawUrl) {
      localStorage.setItem(SUPABASE_STORAGE_URL_KEY, url);
      const urlInp = document.getElementById('supabaseUrlInput');
      if (urlInp && urlInp.value === rawUrl) urlInp.value = url;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('Supabase SDK não foi carregado pelo navegador.');
      this.isConnected = false;
      this.updateCloudStatusBadge('error', 'SDK Indisponível');
      return false;
    }

    try {
      this.client = window.supabase.createClient(url, key.trim(), {
        auth: { persistSession: false }
      });

      // Testa leitura simples
      const { error } = await this.client.from('equipamentos').select('id', { count: 'exact', head: true });

      if (error) {
        console.warn('Erro ao conectar ao Supabase:', error.message);
        this.isConnected = false;
        this.updateCloudStatusBadge('error', 'Erro de Conexão');
        return false;
      }

      this.isConnected = true;
      this.updateCloudStatusBadge('connected', 'Nuvem Ativa');

      // Puxa os dados mais recentes da nuvem na inicialização
      await this.pullAllFromCloud({ silent: true });

      // Inicia escuta em tempo real (Realtime WebSocket)
      this.setupRealtime();

      return true;
    } catch (err) {
      console.error('Falha de inicialização Supabase:', err);
      this.isConnected = false;
      this.updateCloudStatusBadge('error', 'Falha na Nuvem');
      return false;
    }
  },

  // Atualiza indicadores visuais de status na Topbar e em Configurações
  updateCloudStatusBadge(status, text) {
    const badge = document.getElementById('cloudStatusBadge');
    if (badge) {
      badge.className = `cloud-status-badge ${status}`;
      const textEl = badge.querySelector('.cloud-status-text');
      if (textEl) textEl.textContent = text;
      badge.title = `Supabase: ${text}`;
    }

    const configBadge = document.getElementById('supabaseConfigBadge');
    if (configBadge) {
      configBadge.className = `status-pill status-${status}`;
      configBadge.textContent = text;
    }
  },

  // Testa conexão com credenciais informadas pelo usuário
  async testConnection(url, key) {
    const clean = this.cleanUrl(url);
    if (!clean || !key) {
      return { success: false, message: 'Informe a URL e a Chave Anon do projeto Supabase.' };
    }

    if (!window.supabase) {
      return { success: false, message: 'Biblioteca do Supabase não carregada. Verifique sua conexão com a internet.' };
    }

    try {
      const testClient = window.supabase.createClient(clean, key.trim(), {
        auth: { persistSession: false }
      });

      const { error } = await testClient.from('equipamentos').select('id', { count: 'exact', head: true });

      if (error) {
        return { success: false, message: this.formatError(error) };
      }

      return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
    } catch (err) {
      return { success: false, message: `Erro ao testar: ${this.formatError(err)}` };
    }
  },

  // Salva credenciais e conecta
  async saveConfig(url, key) {
    const clean = this.cleanUrl(url);
    if (!clean || !key) {
      showToast('Por favor, preencha a URL e a Chave Anon.', 'error');
      return false;
    }

    // Atualiza visualmente o input na tela se foi limpo
    const sbUrlInp = document.getElementById('supabaseUrlInput');
    if (sbUrlInp && sbUrlInp.value !== clean) {
      sbUrlInp.value = clean;
    }

    const test = await this.testConnection(clean, key);
    if (!test.success) {
      showToast(test.message, 'error');
      return false;
    }

    localStorage.setItem(SUPABASE_STORAGE_URL_KEY, clean);
    localStorage.setItem(SUPABASE_STORAGE_ANON_KEY, key.trim());
    localStorage.setItem(SUPABASE_STORAGE_ENABLED, 'true');

    await this.init();
    showToast('Supabase conectado com sucesso! Sincronização em tempo real ativada.', 'success');
    return true;
  },

  // Desconecta e volta para modo local
  disconnect() {
    if (this.subscription) {
      this.client?.removeChannel(this.subscription);
      this.subscription = null;
    }
    localStorage.removeItem(SUPABASE_STORAGE_URL_KEY);
    localStorage.removeItem(SUPABASE_STORAGE_ANON_KEY);
    localStorage.removeItem(LEGACY_STORAGE_URL_KEY);
    localStorage.removeItem(LEGACY_STORAGE_ANON_KEY);
    localStorage.setItem(SUPABASE_STORAGE_ENABLED, 'false');
    this.client = null;
    this.isConnected = false;
    this.updateCloudStatusBadge('local', 'Modo Local');
    showToast('Desconectado do Supabase. O sistema está operando em Modo Local.', 'info');
  },

  // Configura canais Realtime para receber alterações feitas em outros aparelhos
  setupRealtime() {
    if (!this.client || !this.isConnected) return;

    if (this.subscription) {
      this.client.removeChannel(this.subscription);
    }

    this.subscription = this.client
      .channel('invbecs-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos' }, (payload) => {
        this.handleRemoteChange('equipamentos', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, (payload) => {
        this.handleRemoteChange('colaboradores', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, (payload) => {
        this.handleRemoteChange('movimentacoes', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manutencoes' }, (payload) => {
        this.handleRemoteChange('manutencoes', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sistema_meta' }, (payload) => {
        this.handleRemoteMetadata(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Supabase Realtime ativo: escutando alterações.');
        }
      });
  },

  // Trata alterações remotas recebidas de outro aparelho (celular/PC)
  handleRemoteChange(collection, payload) {
    if (!DB[collection]) return;
    const { eventType, new: newRec, old: oldRec } = payload;

    if (eventType === 'INSERT') {
      const exists = DB[collection].some(item => Number(item.id) === Number(newRec.id));
      if (!exists) {
        let item = { ...newRec };
        if (collection === 'colaboradores' || collection === 'movimentacoes') {
          item.obs = item.obs || item.observacoes || '';
        } else if (collection === 'manutencoes') {
          item.defeito = item.defeito || item.problema || '';
          item.servico = item.servico || item.solucao || '';
          item.tecnico = item.tecnico || item.fornecedor || '';
          item.obs = item.obs || item.observacoes || '';
        }
        DB[collection].unshift(item);
        saveDB(DB);
        if (typeof refreshAll === 'function') refreshAll();
        showToast(`Novo item recebido da nuvem em ${collection}!`, 'info');
      }
    } else if (eventType === 'UPDATE') {
      const idx = DB[collection].findIndex(item => Number(item.id) === Number(newRec.id));
      if (idx !== -1) {
        let item = { ...DB[collection][idx], ...newRec };
        if (collection === 'colaboradores' || collection === 'movimentacoes') {
          item.obs = item.obs || item.observacoes || '';
        } else if (collection === 'manutencoes') {
          item.defeito = item.defeito || item.problema || '';
          item.servico = item.servico || item.solucao || '';
          item.tecnico = item.tecnico || item.fornecedor || '';
          item.obs = item.obs || item.observacoes || '';
        }
        DB[collection][idx] = item;
        saveDB(DB);
        if (typeof refreshAll === 'function') refreshAll();
      }
    } else if (eventType === 'DELETE') {
      const targetId = Number(oldRec.id);
      DB[collection] = DB[collection].filter(item => Number(item.id) !== targetId);
      saveDB(DB);
      if (typeof refreshAll === 'function') refreshAll();
      showToast(`Item excluído na nuvem em ${collection}.`, 'info');
    }
  },

  handleRemoteMetadata(payload) {
    const { new: newRec } = payload;
    if (!newRec || !newRec.chave) return;

    if (newRec.chave === 'localizacoes' && Array.isArray(newRec.valor)) {
      DB.localizacoes = newRec.valor;
    } else if (newRec.chave === 'setores' && Array.isArray(newRec.valor)) {
      DB.setores = newRec.valor;
    } else if (newRec.chave === 'config' && typeof newRec.valor === 'object') {
      DB.config = { ...DB.config, ...newRec.valor };
    }
    saveDB(DB);
    if (typeof refreshAll === 'function') refreshAll();
  },

  // Puxa todos os dados do Supabase e substitui o DB local
  async pullAllFromCloud(options = {}) {
    if (!this.client || !this.isConnected) return;
    this.isSyncing = true;
    this.updateCloudStatusBadge('connecting', 'Sincronizando...');

    try {
      const [equipsRes, colabsRes, movsRes, manusRes, metaRes, ativRes] = await Promise.all([
        this.client.from('equipamentos').select('*').order('id', { ascending: false }),
        this.client.from('colaboradores').select('*').order('id', { ascending: false }),
        this.client.from('movimentacoes').select('*').order('id', { ascending: false }),
        this.client.from('manutencoes').select('*').order('id', { ascending: false }),
        this.client.from('sistema_meta').select('*'),
        this.client.from('atividades').select('*').order('time', { ascending: false }).limit(50)
      ]);

      if (equipsRes.data) DB.equipamentos = equipsRes.data;
      if (colabsRes.data) {
        DB.colaboradores = colabsRes.data.map(c => ({
          ...c,
          obs: c.obs || c.observacoes || ''
        }));
      }
      if (movsRes.data) {
        DB.movimentacoes = movsRes.data.map(m => ({
          ...m,
          obs: m.obs || m.observacoes || ''
        }));
      }
      if (manusRes.data) {
        DB.manutencoes = manusRes.data.map(m => ({
          ...m,
          defeito: m.defeito || m.problema || '',
          servico: m.servico || m.solucao || '',
          tecnico: m.tecnico || m.fornecedor || '',
          obs: m.obs || m.observacoes || ''
        }));
      }

      // Metadados
      if (metaRes.data) {
        for (const row of metaRes.data) {
          if (row.chave === 'localizacoes' && Array.isArray(row.valor)) DB.localizacoes = row.valor;
          if (row.chave === 'setores' && Array.isArray(row.valor)) DB.setores = row.valor;
          if (row.chave === 'config' && typeof row.valor === 'object') {
            // Preserva autenticação local se não houver na nuvem
            const localAuth = DB.config?.auth;
            DB.config = { ...DB.config, ...row.valor };
            if (!DB.config.auth && localAuth) DB.config.auth = localAuth;
          }
        }
      }

      if (ativRes.data && ativRes.data.length > 0) {
        DB.actividades = ativRes.data;
      }

      // Calcula próximos IDs
      const maxEquip = DB.equipamentos.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0);
      const maxColab = DB.colaboradores.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0);
      const maxMov = DB.movimentacoes.reduce((m, mov) => Math.max(m, Number(mov.id) || 0), 0);
      const maxManu = DB.manutencoes.reduce((m, manu) => Math.max(m, Number(manu.id) || 0), 0);

      DB.nextEquipId = maxEquip + 1;
      DB.nextColabId = maxColab + 1;
      DB.nextMovId = maxMov + 1;
      DB.nextManuId = maxManu + 1;

      saveDB(DB);

      if (typeof refreshAll === 'function') refreshAll();

      this.updateCloudStatusBadge('connected', 'Nuvem Ativa');

      if (!options.silent) {
        showToast('Dados sincronizados da nuvem com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao puxar dados do Supabase:', err);
      this.updateCloudStatusBadge('error', 'Erro ao Sincronizar');
      if (!options.silent) {
        showToast(`Erro ao baixar da nuvem: ${this.formatError(err)}`, 'error');
      }
    } finally {
      this.isSyncing = false;
    }
  },

  // Sobe todos os dados locais atuais para o Supabase (Migração inicial)
  async pushAllToCloud() {
    let rawUrl = localStorage.getItem(SUPABASE_STORAGE_URL_KEY) || localStorage.getItem(LEGACY_STORAGE_URL_KEY);
    const key = localStorage.getItem(SUPABASE_STORAGE_ANON_KEY) || localStorage.getItem(LEGACY_STORAGE_ANON_KEY);

    // Se a URL salva contiver /rest/v1 ou caminhos inválidos, higieniza e recria o cliente
    if (rawUrl) {
      const clean = this.cleanUrl(rawUrl);
      if (clean !== rawUrl) {
        localStorage.setItem(SUPABASE_STORAGE_URL_KEY, clean);
        const urlInp = document.getElementById('supabaseUrlInput');
        if (urlInp) urlInp.value = clean;
        await this.init();
      }
    }

    if (!this.client || !this.isConnected) {
      if (rawUrl && key) {
        const ok = await this.init();
        if (!ok || !this.client || !this.isConnected) {
          showToast('Supabase não conectado. Configure e teste a conexão primeiro.', 'error');
          return;
        }
      } else {
        showToast('Supabase não conectado. Configure e teste a conexão primeiro.', 'error');
        return;
      }
    }

    this.isSyncing = true;
    this.updateCloudStatusBadge('connecting', 'Enviando...');

    try {
      let totalEnviado = 0;

      // 1. Equipamentos
      if (DB.equipamentos && DB.equipamentos.length > 0) {
        const payload = DB.equipamentos.map(e => ({
          ...e,
          id: Number(e.id),
          valor: Number(e.valor) || 0
        }));
        const res = await this.safeUpsert('equipamentos', payload, 'id');
        if (!res.success) throw new Error(`Equipamentos: ${this.formatError(res.error)}`);
        totalEnviado += payload.length;
      }

      // 2. Colaboradores
      if (DB.colaboradores && DB.colaboradores.length > 0) {
        const payload = DB.colaboradores.map(c => {
          const obsText = c.obs || c.observacoes || '';
          return {
            id: Number(c.id),
            nome: c.nome,
            cargo: c.cargo || '',
            setor: c.setor || '',
            email: c.email || '',
            telefone: c.telefone || '',
            matricula: c.matricula || '',
            observacoes: obsText,
            obs: obsText,
            dataCadastro: c.dataCadastro || new Date().toISOString()
          };
        });
        const res = await this.safeUpsert('colaboradores', payload, 'id');
        if (!res.success) throw new Error(`Colaboradores: ${this.formatError(res.error)}`);
        totalEnviado += payload.length;
      }

      // 3. Movimentações
      if (DB.movimentacoes && DB.movimentacoes.length > 0) {
        const payload = DB.movimentacoes.map(m => {
          const obsText = m.obs || m.observacoes || '';
          return {
            id: Number(m.id),
            equipamentoId: m.equipamentoId ? Number(m.equipamentoId) : null,
            equipamentoDesc: m.equipamentoDesc || '',
            tipo: m.tipo || '',
            de: m.de || '',
            para: m.para || '',
            responsavel: m.responsavel || '',
            data: m.data || '',
            observacoes: obsText,
            obs: obsText,
            dataCadastro: m.dataCadastro || new Date().toISOString()
          };
        });
        const res = await this.safeUpsert('movimentacoes', payload, 'id');
        if (!res.success) throw new Error(`Movimentações: ${this.formatError(res.error)}`);
        totalEnviado += payload.length;
      }

      // 4. Manutenções
      if (DB.manutencoes && DB.manutencoes.length > 0) {
        const payload = DB.manutencoes.map(m => {
          const obsText = m.obs || m.observacoes || '';
          const defText = m.defeito || m.problema || '';
          const servText = m.servico || m.solucao || '';
          const tecText = m.tecnico || m.fornecedor || '';
          return {
            id: Number(m.id),
            equipamentoId: m.equipamentoId ? Number(m.equipamentoId) : null,
            equipamentoDesc: m.equipamentoDesc || '',
            tipo: m.tipo || 'Corretiva',
            custo: Number(m.custo) || 0,
            status: m.status || 'Aberta',
            dataAbertura: m.dataAbertura || '',
            dataConclusao: m.dataConclusao || '',
            dataCadastro: m.dataCadastro || new Date().toISOString(),
            problema: defText,
            defeito: defText,
            solucao: servText,
            servico: servText,
            fornecedor: tecText,
            tecnico: tecText,
            observacoes: obsText,
            obs: obsText
          };
        });
        const res = await this.safeUpsert('manutencoes', payload, 'id');
        if (!res.success) throw new Error(`Manutenções: ${this.formatError(res.error)}`);
        totalEnviado += payload.length;
      }

      // 5. Metadados (Localizações, Setores, Config)
      const metaRows = [
        { chave: 'localizacoes', valor: DB.localizacoes || [] },
        { chave: 'setores', valor: DB.setores || [] },
        { chave: 'config', valor: { nome: DB.config?.nome, empresa: DB.config?.empresa, setor: DB.config?.setor } }
      ];
      const metaRes = await this.safeUpsert('sistema_meta', metaRows, 'chave');
      if (!metaRes.success) throw new Error(`Configurações: ${this.formatError(metaRes.error)}`);

      // 6. Atividades
      if (DB.actividades && DB.actividades.length > 0) {
        const payload = DB.actividades.slice(0, 50).map((a, i) => ({
          id: a.id || `act_${Date.now()}_${i}`,
          text: a.text,
          type: a.type,
          time: a.time || new Date().toISOString()
        }));
        await this.safeUpsert('atividades', payload, 'id');
      }

      this.updateCloudStatusBadge('connected', 'Nuvem Ativa');
      showToast(`Migração concluída! ${totalEnviado} registros sincronizados na nuvem.`, 'success');
    } catch (err) {
      console.error('Erro na migração para Supabase:', err);
      this.updateCloudStatusBadge('error', 'Erro no Envio');
      showToast(`Falha ao subir dados: ${this.formatError(err)}`, 'error');
    } finally {
      this.isSyncing = false;
    }
  },

  // ----------------------------------------------------
  // Operações CRUD individuais em segundo plano
  // ----------------------------------------------------
  async syncEquipamento(equip) {
    if (!this.client || !this.isConnected) return;
    try {
      const payload = { ...equip, id: Number(equip.id), valor: Number(equip.valor) || 0 };
      await this.safeUpsert('equipamentos', [payload], 'id');
    } catch (err) {
      console.warn('Supabase syncEquipamento erro:', err);
    }
  },

  async deleteEquipamento(id) {
    if (!this.client || !this.isConnected) return;
    try {
      const { error } = await this.client.from('equipamentos').delete().eq('id', Number(id));
      if (error) console.warn('Supabase deleteEquipamento erro:', error.message);
    } catch (err) {
      console.warn('Supabase deleteEquipamento erro:', err);
    }
  },

  async syncColaborador(colab) {
    if (!this.client || !this.isConnected) return;
    try {
      const obsText = colab.obs || colab.observacoes || '';
      const payload = {
        id: Number(colab.id),
        nome: colab.nome,
        cargo: colab.cargo || '',
        setor: colab.setor || '',
        email: colab.email || '',
        telefone: colab.telefone || '',
        matricula: colab.matricula || '',
        observacoes: obsText,
        obs: obsText,
        dataCadastro: colab.dataCadastro || new Date().toISOString()
      };
      await this.safeUpsert('colaboradores', [payload], 'id');
    } catch (err) {
      console.warn('Supabase syncColaborador erro:', err);
    }
  },

  async deleteColaborador(id) {
    if (!this.client || !this.isConnected) return;
    try {
      const { error } = await this.client.from('colaboradores').delete().eq('id', Number(id));
      if (error) console.warn('Supabase deleteColaborador erro:', error.message);
    } catch (err) {
      console.warn('Supabase deleteColaborador erro:', err);
    }
  },

  async syncMovimentacao(mov) {
    if (!this.client || !this.isConnected) return;
    try {
      const obsText = mov.obs || mov.observacoes || '';
      const payload = {
        id: Number(mov.id),
        equipamentoId: mov.equipamentoId ? Number(mov.equipamentoId) : null,
        equipamentoDesc: mov.equipamentoDesc || '',
        tipo: mov.tipo || '',
        de: mov.de || '',
        para: mov.para || '',
        responsavel: mov.responsavel || '',
        data: mov.data || '',
        observacoes: obsText,
        obs: obsText,
        dataCadastro: mov.dataCadastro || new Date().toISOString()
      };
      await this.safeUpsert('movimentacoes', [payload], 'id');
    } catch (err) {
      console.warn('Supabase syncMovimentacao erro:', err);
    }
  },

  async deleteMovimentacao(id) {
    if (!this.client || !this.isConnected) return;
    try {
      const { error } = await this.client.from('movimentacoes').delete().eq('id', Number(id));
      if (error) console.warn('Supabase deleteMovimentacao erro:', error.message);
    } catch (err) {
      console.warn('Supabase deleteMovimentacao erro:', err);
    }
  },

  async syncManutencao(manu) {
    if (!this.client || !this.isConnected) return;
    try {
      const obsText = manu.obs || manu.observacoes || '';
      const defText = manu.defeito || manu.problema || '';
      const servText = manu.servico || manu.solucao || '';
      const tecText = manu.tecnico || manu.fornecedor || '';
      const payload = {
        id: Number(manu.id),
        equipamentoId: manu.equipamentoId ? Number(manu.equipamentoId) : null,
        equipamentoDesc: manu.equipamentoDesc || '',
        tipo: manu.tipo || 'Corretiva',
        custo: Number(manu.custo) || 0,
        status: manu.status || 'Aberta',
        dataAbertura: manu.dataAbertura || '',
        dataConclusao: manu.dataConclusao || '',
        dataCadastro: manu.dataCadastro || new Date().toISOString(),
        problema: defText,
        defeito: defText,
        solucao: servText,
        servico: servText,
        fornecedor: tecText,
        tecnico: tecText,
        observacoes: obsText,
        obs: obsText
      };
      await this.safeUpsert('manutencoes', [payload], 'id');
    } catch (err) {
      console.warn('Supabase syncManutencao erro:', err);
    }
  },

  async deleteManutencao(id) {
    if (!this.client || !this.isConnected) return;
    try {
      const { error } = await this.client.from('manutencoes').delete().eq('id', Number(id));
      if (error) console.warn('Supabase deleteManutencao erro:', error.message);
    } catch (err) {
      console.warn('Supabase deleteManutencao erro:', err);
    }
  },

  async syncMetadata(chave, valor) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.safeUpsert('sistema_meta', [{ chave, valor }], 'chave');
    } catch (err) {
      console.warn(`Supabase syncMetadata ${chave} erro:`, err);
    }
  },

  async syncAtividade(atividade) {
    if (!this.client || !this.isConnected) return;
    try {
      const payload = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text: atividade.text,
        type: atividade.type,
        time: atividade.time || new Date().toISOString()
      };
      await this.safeUpsert('atividades', [payload], 'id');
    } catch (err) {
      console.warn('Supabase syncAtividade erro:', err);
    }
  }
};
