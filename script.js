// Inicializa os ícones Lucide
lucide.createIcons();

// INJEÇÃO SEGURA DE CSS PARA ORIENTAÇÃO
function setPrintOrientation(orientation) {
    let style = document.getElementById('dynamic-print-orientation');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-print-orientation';
        style.media = 'print';
        document.head.appendChild(style);
    }
    if (orientation === 'landscape') {
        style.innerHTML = `@page { size: A4 landscape; margin: 4mm; }`;
    } else {
        style.innerHTML = `@page { size: A4 portrait; margin: 4mm; }`;
    }
}

const CLIENT_ID = '697049729115-is5ih1sfs77cib7u3nqte5pktlqfgkbq.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const CustomModal = {
    keydownListener: null,

    show: function (msg, isConfirm = false, onConfirm = null, onCancel = null) {
        document.getElementById('modal-message').innerText = msg;
        const modalEl = document.getElementById('custom-modal');
        modalEl.style.display = 'flex';

        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        btnCancel.style.display = isConfirm ? 'inline-block' : 'none';

        btnConfirm.onclick = () => {
            this.hide();
            if (onConfirm) onConfirm();
        };

        btnCancel.onclick = () => {
            this.hide();
            if (onCancel) onCancel();
        };

        btnConfirm.focus();

        if (this.keydownListener) document.removeEventListener('keydown', this.keydownListener);

        this.keydownListener = (e) => {
            if (modalEl.style.display === 'flex') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (document.activeElement === btnCancel) btnCancel.click();
                    else btnConfirm.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (isConfirm) btnCancel.click();
                    else btnConfirm.click();
                } else if (isConfirm && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    e.preventDefault();
                    if (document.activeElement === btnConfirm) btnCancel.focus();
                    else btnConfirm.focus();
                }
            }
        };
        document.addEventListener('keydown', this.keydownListener);
    },

    hide: function () {
        document.getElementById('custom-modal').style.display = 'none';
        // Remove o ouvinte quando fecha para não interferir no resto do sistema
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
            this.keydownListener = null;
        }
    }
};

const DB = {
    KEY: 'ks_afinacoes_dados',
    KEY_RH: 'ks_rh_dados',
    KEY_ESTOQUE: 'ks_estoque_dados',

    get: function () {
        const data = localStorage.getItem(this.KEY);
        const parsed = data ? JSON.parse(data) : { produtos: [], clientes: [], notasSalvas: [] };
        if (!parsed.notasSalvas) parsed.notasSalvas = []; // Garante que a gaveta de notas exista
        return parsed;
    },
    save: function (data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));

        const dadosRHRaw = localStorage.getItem(this.KEY_RH);
        const dadosEstoqueRaw = localStorage.getItem(this.KEY_ESTOQUE);
        const backupUnificado = {
            notas: data,
            rh: dadosRHRaw ? JSON.parse(dadosRHRaw) : { funcionarios: [], pontos: [], descontosFechamento: [] },
            estoque: dadosEstoqueRaw ? JSON.parse(dadosEstoqueRaw) : { insumos: [], logsInsumos: [], logsPecas: [] }
        };

        if (document.getElementById('dash-prod-count')) UI.updateDashCards();
        if (document.getElementById('tabela-fornecedor')) UI.renderSelectsFornecedoresTabelas();

        DriveAPI.autoSaveBackup(JSON.stringify(backupUnificado));
    },
    importBackup: function () {
        const fileInput = document.getElementById('file-import');
        if (!fileInput.files.length) { CustomModal.show('Selecione um arquivo .json do seu celular/PC primeiro.'); return; }
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.notas && parsed.rh) {
                    localStorage.setItem(DB.KEY, JSON.stringify(parsed.notas));
                    localStorage.setItem(DB.KEY_RH, JSON.stringify(parsed.rh));
                    if (parsed.estoque) localStorage.setItem(DB.KEY_ESTOQUE, JSON.stringify(parsed.estoque));
                    CustomModal.show('Backup Unificado restaurado com sucesso!');
                    UI.initData();
                } else if (parsed.produtos && parsed.clientes) {
                    localStorage.setItem(DB.KEY, JSON.stringify(parsed));
                    CustomModal.show('Backup antigo restaurado com sucesso!');
                    UI.initData();
                }
            } catch (err) { CustomModal.show('Erro ao ler arquivo JSON.'); }
        };
        reader.readAsText(fileInput.files[0]);
    },
    downloadManualBackup: function () {
        const dadosNotas = this.get();
        const dadosRHRaw = localStorage.getItem(this.KEY_RH);
        const dadosEstoqueRaw = localStorage.getItem(this.KEY_ESTOQUE);

        const backupUnificado = {
            notas: dadosNotas,
            rh: dadosRHRaw ? JSON.parse(dadosRHRaw) : { funcionarios: [], pontos: [], descontosFechamento: [] },
            estoque: dadosEstoqueRaw ? JSON.parse(dadosEstoqueRaw) : { insumos: [], logsInsumos: [], logsPecas: [] }
        };

        const blob = new Blob([JSON.stringify(backupUnificado)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup_ks_afinacoes.json';
        a.click();
    },
    downloadManualBackup: function () {
        const dadosNotas = this.get();
        const dadosRHRaw = localStorage.getItem(this.KEY_RH);
        const dadosRH = dadosRHRaw ? JSON.parse(dadosRHRaw) : { funcionarios: [], pontos: [], descontosFechamento: [] };

        const backupUnificado = {
            notas: dadosNotas,
            rh: dadosRH
        };

        const blob = new Blob([JSON.stringify(backupUnificado)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup_ks_afinacoes.json';
        a.click();
    }
};

function LerRH() {
    const data = localStorage.getItem('ks_rh_dados');
    return data ? JSON.parse(data) : { funcionarios: [] };
}

const DriveAPI = {
    tokenClient: null, accessToken: null, backupFileId: null,
    init: function () {
        if (CLIENT_ID === 'COLE_AQUI_SEU_CLIENT_ID') return;

        // VERIFICA SE JÁ EXISTE UM LOGIN SALVO (Válido por 1 hora)
        const savedToken = localStorage.getItem('ks_gdrive_token');
        if (savedToken) {
            const tokenData = JSON.parse(savedToken);
            if (Date.now() < tokenData.expiresAt) {
                this.accessToken = tokenData.token;
                this.updateStatusUI(true);
                this.findBackupFileId();
            } else {
                localStorage.removeItem('ks_gdrive_token'); // Expirou, apaga
            }
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID, scope: SCOPES,
            callback: (r) => {
                if (r && r.access_token) {
                    this.accessToken = r.access_token;

                    // SALVA O LOGIN NA MEMÓRIA PARA NÃO PEDIR NAS OUTRAS TELAS
                    const expiresAt = Date.now() + (r.expires_in * 1000);
                    localStorage.setItem('ks_gdrive_token', JSON.stringify({ token: r.access_token, expiresAt: expiresAt }));

                    this.updateStatusUI(true);
                    this.findBackupFileId();
                }
            },
        });
    },
    handleAuthClick: function () {
        if (!this.tokenClient) { CustomModal.show('O Desenvolvedor precisa configurar o Google Cloud Client ID no Código Fonte para habilitar o backup em nuvem.'); return; }
        if (this.accessToken === null) this.tokenClient.requestAccessToken({ prompt: 'consent' });
    },
    updateStatusUI: function (isConnected) {
        if (isConnected) {
            const statusEl = document.getElementById('gdrive-status-text');
            if (statusEl) {
                statusEl.innerText = "Status: Sincronizado";
                statusEl.style.color = "var(--success-color)";
            }
        }
    },
    findBackupFileId: async function () {
        if (!this.accessToken) return;
        try {
            const res = await fetch('https://www.googleapis.com/drive/v3/files?q=name="backup_ks_afinacoes.json" and trashed=false', { headers: { 'Authorization': `Bearer ${this.accessToken}` } });
            const data = await res.json();
            if (data.files && data.files.length > 0) this.backupFileId = data.files[0].id;
        } catch (e) { }
    },
    autoSaveBackup: async function (jsonString) {
        if (!this.accessToken) return;
        const boundary = '-------314159265358979323846';
        const body = `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: 'backup_ks_afinacoes.json', mimeType: 'application/json' })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonString}\r\n--${boundary}--`;
        try {
            const res = await fetch(`https://www.googleapis.com${this.backupFileId ? `/upload/drive/v3/files/${this.backupFileId}` : `/upload/drive/v3/files`}?uploadType=multipart`, {
                method: this.backupFileId ? 'PATCH' : 'POST',
                headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
                body: body
            });
            const data = await res.json();
            if (!this.backupFileId && data.id) this.backupFileId = data.id;
        } catch (e) { }
    }
};

// Variáveis Globais do Sistema
let itensNotaAtual = [];
let itemNotaEmEdicaoIndex = null;
let idNotaAtual = null;
let sugestaoIndexNota = -1;
let sugestaoIndexBusca = -1;
let notaAbatida = false;

const LogicaNegocio = {

    // === NAVEGAÇÃO RÁPIDA NA NOTA (ENTER = TAB) ===
    // === NAVEGAÇÃO RÁPIDA NA NOTA (ENTER = AVANÇAR | ESC = VOLTAR) ===
    focarProximoCampo: function (event, proximoId, anteriorId) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const proximoCampo = document.getElementById(proximoId);
            if (proximoCampo) {
                if (proximoId === 'btn-add-item-nota') {
                    proximoCampo.click();
                } else {
                    proximoCampo.focus();
                    if (proximoCampo.tagName === 'INPUT') {
                        proximoCampo.select();
                    }
                }
            }
        }
        else if (event.key === 'Escape' && anteriorId) {
            event.preventDefault(); // Impede outros comportamentos padrão do ESC
            const campoAnterior = document.getElementById(anteriorId);
            if (campoAnterior) {
                campoAnterior.focus();
                if (campoAnterior.tagName === 'INPUT') {
                    campoAnterior.select();
                }
            }
        }
    },

    salvarProduto: function () {
        const db = DB.get();
        const codigoBase = document.getElementById('prod-codigo').value.trim();
        const nomeBase = document.getElementById('prod-nome').value.trim();
        const fornecedor = document.getElementById('prod-fornecedor').value.trim();
        const valVenda = parseFloat(document.getElementById('prod-val-venda').value);
        const valVendaPolida = parseFloat(document.getElementById('prod-val-venda-polida').value) || valVenda; // Se vazio, usa o normal
        const valProducao = parseFloat(document.getElementById('prod-val-producao').value) || 0;

        const varPintura = document.getElementById('var-pintura').checked;
        const varPolida = document.getElementById('var-polida').checked;

        if (db.produtos.find(p => String(p.codigo) === codigoBase)) { CustomModal.show(`O código ${codigoBase} já existe!`); return; }

        let variacoesArray = ["Cromada"];
        if (varPintura) variacoesArray.push("Pintura");
        if (varPolida) variacoesArray.push("Polida");

        db.produtos.push({
            codigo: codigoBase,
            nome: nomeBase,
            fornecedor: fornecedor,
            valVenda: valVenda,
            valVendaPolida: valVendaPolida, // SALVA O VALOR POLIDO
            valProducao: valProducao,
            variacoes: variacoesArray
        });

        DB.save(db);

        // Limpa os campos após salvar
        document.getElementById('prod-codigo').value = '';
        document.getElementById('prod-val-venda-polida').value = '';
        document.getElementById('prod-val-producao').value = '';
        document.getElementById('var-pintura').checked = false;
        document.getElementById('var-polida').checked = false;
        document.getElementById('prod-codigo').focus();
        document.getElementById('div-venda-polida').style.display = 'none';

        UI.renderTabelaProdutos();
        CustomModal.show(`Produto salvo com sucesso!`);
    },

    toggleCampoPolido: function () {
        const isPolida = document.getElementById('var-polida').checked;
        document.getElementById('div-venda-polida').style.display = isPolida ? 'block' : 'none';
    },

    excluirProduto: function (codigo) {
        CustomModal.show('Tem certeza que deseja excluir este produto?', true, () => {
            const db = DB.get();
            db.produtos = db.produtos.filter(p => p.codigo !== codigo);
            DB.save(db);
            UI.renderTabelaProdutos();
        });
    },

    iniciarEdicaoProduto: function (codigo) {
        const db = DB.get();
        const prod = db.produtos.find(p => p.codigo === codigo);
        if (!prod) return;

        let optionsForn = '<option value="">--</option>';
        db.clientes.forEach(c => {
            let selected = (c.nome === prod.fornecedor) ? 'selected' : '';
            optionsForn += `<option value="${c.nome}" ${selected}>${c.nome}</option>`;
        });

        const hasPintura = prod.variacoes && prod.variacoes.includes("Pintura") ? 'checked' : '';
        const hasPolida = prod.variacoes && prod.variacoes.includes("Polida") ? 'checked' : '';
        const valProducaoAtual = prod.valProducao || 0;
        const valVendaPolidaAtual = prod.valVendaPolida || prod.valVenda;

        const tr = document.getElementById(`tr-produto-${codigo}`);
        tr.innerHTML = `
            <td><input type="text" id="edit-prod-cod-${codigo}" value="${prod.codigo}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td>
                <input type="text" id="edit-prod-nome-${codigo}" value="${prod.nome}" style="width: 100%; margin: 0 0 4px 0; padding: 4px; font-size: 12px;">
                <div style="display: flex; gap: 10px; font-size: 10px; color: var(--text-main); align-items: center;">
                    <label style="display: flex; align-items: center; gap: 4px; margin: 0;"><input type="checkbox" id="edit-prod-var-pintura-${codigo}" ${hasPintura} style="width: 12px; height: 12px; margin: 0;"> Pintura</label>
                    <label style="display: flex; align-items: center; gap: 4px; margin: 0;"><input type="checkbox" id="edit-prod-var-polida-${codigo}" ${hasPolida} onchange="LogicaNegocio.toggleEditPolido('${codigo}')" style="width: 12px; height: 12px; margin: 0;"> Polida</label>
                </div>
            </td>
            <td><select id="edit-prod-forn-${codigo}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;">${optionsForn}</select></td>
            <td>
                <input type="number" id="edit-prod-val-${codigo}" value="${prod.valVenda}" step="0.01" style="width: 70px; margin: 0 0 4px 0; padding: 4px; font-size: 12px;" title="Venda Normal">
                <div id="div-edit-polida-${codigo}" style="${prod.variacoes && prod.variacoes.includes('Polida') ? 'display: block;' : 'display: none;'}">
                    <input type="number" id="edit-prod-val-polida-${codigo}" value="${valVendaPolidaAtual}" step="0.01" style="width: 70px; margin: 0; padding: 4px; font-size: 12px; border: 1px solid #a855f7;" title="Venda Polida">
                </div>
            </td>
            <td><input type="number" id="edit-prod-producao-${codigo}" value="${valProducaoAtual}" step="0.01" style="width: 70px; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button onclick="LogicaNegocio.salvarEdicaoProduto('${codigo}')" style="background: var(--success-color); border: none; color: white; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Salvar">
                        <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button onclick="UI.renderTabelaProdutos()" style="background: var(--danger-color); border: none; color: white; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Cancelar">
                        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        `;
        lucide.createIcons();
    },

    salvarEdicaoProduto: function (codigoAntigo) {
        const novoCod = document.getElementById(`edit-prod-cod-${codigoAntigo}`).value.trim();
        const novoNome = document.getElementById(`edit-prod-nome-${codigoAntigo}`).value.trim();
        const novoForn = document.getElementById(`edit-prod-forn-${codigoAntigo}`).value.trim();
        const novoVal = parseFloat(document.getElementById(`edit-prod-val-${codigoAntigo}`).value);
        const novoValPolida = parseFloat(document.getElementById(`edit-prod-val-polida-${codigoAntigo}`).value) || novoVal;
        const novoValProducao = parseFloat(document.getElementById(`edit-prod-producao-${codigoAntigo}`).value) || 0;

        const varPintura = document.getElementById(`edit-prod-var-pintura-${codigoAntigo}`).checked;
        const varPolida = document.getElementById(`edit-prod-var-polida-${codigoAntigo}`).checked;

        if (!novoCod || !novoNome || isNaN(novoVal) || novoVal < 0) {
            CustomModal.show('Preencha os campos obrigatórios com valores válidos.');
            return;
        }

        const db = DB.get();

        if (novoCod !== codigoAntigo && db.produtos.find(p => p.codigo === novoCod)) {
            CustomModal.show(`O código ${novoCod} já está em uso!`);
            return;
        }

        const prodIndex = db.produtos.findIndex(p => p.codigo === codigoAntigo);
        if (prodIndex > -1) {
            let variacoesArray = ["Cromada"];
            if (varPintura) variacoesArray.push("Pintura");
            if (varPolida) variacoesArray.push("Polida");

            db.produtos[prodIndex] = {
                codigo: novoCod,
                nome: novoNome,
                fornecedor: novoForn,
                valVenda: novoVal,
                valVendaPolida: novoValPolida, // SALVA NA EDIÇÃO
                valProducao: novoValProducao,
                variacoes: variacoesArray
            };
            DB.save(db);
            UI.renderTabelaProdutos();
        }
    },

    salvarCliente: function () {
        const db = DB.get();
        db.clientes.push({
            nome: document.getElementById('cli-nome').value,
            cnpj: document.getElementById('cli-cnpj').value,
            endereco: document.getElementById('cli-endereco').value,
            telefone: document.getElementById('cli-telefone').value
        });
        DB.save(db);
        document.getElementById('form-cliente').reset();
        UI.renderTabelaClientes();
        UI.renderSelectClientes();
        UI.renderSelectFornecedorProduto();
        CustomModal.show('Cliente salvo com sucesso!');
    },

    excluirCliente: function (index) {
        CustomModal.show('Tem certeza que deseja excluir este cliente?', true, () => {
            const db = DB.get();
            db.clientes.splice(index, 1);
            DB.save(db);
            UI.renderTabelaClientes();
            UI.renderSelectClientes();
            UI.renderSelectFornecedorProduto();
        });
    },

    iniciarEdicaoCliente: function (index) {
        const db = DB.get();
        const cliente = db.clientes[index];
        if (!cliente) return;

        const tr = document.getElementById(`tr-cliente-${index}`);
        tr.innerHTML = `
            <td><input type="text" id="edit-cli-nome-${index}" value="${cliente.nome}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td><input type="text" id="edit-cli-cnpj-${index}" value="${cliente.cnpj || ''}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td><input type="text" id="edit-cli-telefone-${index}" value="${cliente.telefone || ''}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button onclick="LogicaNegocio.salvarEdicaoCliente(${index})" style="background: var(--success-color); border: none; color: white; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Salvar">
                        <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button onclick="UI.renderTabelaClientes()" style="background: var(--danger-color); border: none; color: white; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Cancelar">
                        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        `;
        lucide.createIcons();
    },

    salvarEdicaoCliente: function (index) {
        const nome = document.getElementById(`edit-cli-nome-${index}`).value;
        const cnpj = document.getElementById(`edit-cli-cnpj-${index}`).value;
        const telefone = document.getElementById(`edit-cli-telefone-${index}`).value;

        if (!nome.trim()) {
            CustomModal.show('O nome do cliente é obrigatório.');
            return;
        }

        const db = DB.get();
        if (db.clientes[index]) {
            const enderecoAnterior = db.clientes[index].endereco || '';
            db.clientes[index] = { nome, cnpj, endereco: enderecoAnterior, telefone };
            DB.save(db);
            UI.renderTabelaClientes();
            UI.renderSelectClientes();
            UI.renderSelectFornecedorProduto();
        }
    },

    buscarProduto: function () {
        const cod = document.getElementById('busca-codigo').value.trim();
        const prod = DB.get().produtos.find(p => p.codigo === cod);
        const div = document.getElementById('busca-resultado');

        const listaSugestoes = document.getElementById('lista-sugestoes-busca');
        if (listaSugestoes) listaSugestoes.style.display = 'none';

        div.style.display = 'block';

        if (prod) {
            const varsTexto = prod.variacoes ? prod.variacoes.join(', ') : "Cromada";
            div.innerHTML = `
                <h3 style="color: var(--text-main); font-size: 16px; margin-bottom: 10px;">${prod.nome}</h3>
                <p style="color: var(--text-muted); font-size: 14px;"><strong>Cód:</strong> ${prod.codigo}</p>
                <p style="color: var(--text-muted); font-size: 14px;"><strong>Variações:</strong> ${varsTexto}</p>
                <p style="color: var(--text-muted); font-size: 14px;"><strong>Empresa:</strong> ${prod.fornecedor || '-'}</p>
                <p style="color: var(--text-main); font-size: 14px; margin-top: 10px;"><strong>Valor:</strong> R$ ${prod.valVenda.toFixed(2)}</p>
            `;
        } else {
            div.innerHTML = `<p style="color: var(--danger-color); font-size: 14px;">Produto não encontrado.</p>`;
        }
    },

    // ==========================================
    // SISTEMA AVANÇADO DE AUTO-COMPLETE COM SETAS
    // ==========================================

    navegarSugestoes: function (event, tipo) {
        // Intercepta apenas teclas relevantes para navegação e seleção
        if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) return;

        const listId = tipo === 'nota' ? 'lista-sugestoes-produtos' : 'lista-sugestoes-busca';
        const lista = document.getElementById(listId);

        // Se a lista não estiver visível e a tecla for Enter/Tab, usa a primeira opção silenciosamente
        if (!lista || lista.style.display === 'none') {
            if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                if (tipo === 'nota') this.selecionarPrimeiraSugestao();
                else this.selecionarPrimeiraSugestaoBusca();
            }
            return;
        }

        const items = lista.getElementsByTagName('li');
        if (items.length === 0) return;

        let indexAtual = tipo === 'nota' ? sugestaoIndexNota : sugestaoIndexBusca;

        if (event.key === 'ArrowDown') {
            event.preventDefault(); // Impede o cursor de ir pro fim do texto
            indexAtual++;
            if (indexAtual >= items.length) indexAtual = 0; // Se passou do limite, volta pro topo
            this.atualizarSelecaoVisual(items, indexAtual);
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault(); // Impede o cursor de ir pro começo do texto
            indexAtual--;
            if (indexAtual < 0) indexAtual = items.length - 1; // Se subiu do topo, vai pro último
            this.atualizarSelecaoVisual(items, indexAtual);
        }
        else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            if (indexAtual >= 0 && indexAtual < items.length) {
                items[indexAtual].click(); // Simula o clique na opção focada
            } else {
                // Se a lista tá aberta mas nenhuma seta foi usada, pega a primeira
                if (tipo === 'nota') this.selecionarPrimeiraSugestao();
                else this.selecionarPrimeiraSugestaoBusca();
            }
        }

        // Salva a posição globalmente
        if (tipo === 'nota') sugestaoIndexNota = indexAtual;
        else sugestaoIndexBusca = indexAtual;
    },

    atualizarSelecaoVisual: function (items, indexAtual) {
        // Limpa a classe de todos
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('selecionado');
        }
        // Aplica na atual
        if (indexAtual >= 0 && indexAtual < items.length) {
            const selecionado = items[indexAtual];
            selecionado.classList.add('selecionado');
            // Mantém a opção focada visível se a lista tiver scroll
            selecionado.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    filtrarProdutosNota: function (event) {
        // Ignora o processamento do texto se o usuário apertou uma tecla de navegação (para não resetar o cursor)
        if (event && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) return;

        sugestaoIndexNota = -1; // Reseta a navegação sempre que digitar algo novo

        const codigoInput = document.getElementById('nota-item-codigo');
        const termoBusca = codigoInput.value.trim().toLowerCase();
        const listaSugestoes = document.getElementById('lista-sugestoes-produtos');
        const db = DB.get();

        if (!termoBusca) {
            listaSugestoes.style.display = 'none';
            this.limparFormularioItemNota();
            return;
        }

        const produtosFiltrados = db.produtos.filter(p => String(p.codigo).trim().toLowerCase().startsWith(termoBusca));

        if (produtosFiltrados.length > 0) {
            listaSugestoes.innerHTML = '';
            produtosFiltrados.forEach((prod, index) => {
                const li = document.createElement('li');
                li.innerText = `${prod.codigo} - ${prod.nome}`;
                li.className = 'sugestao-item';
                li.dataset.codigo = prod.codigo;

                const regex = new RegExp(`^(${termoBusca})`, "i");
                li.innerHTML = li.innerText.replace(regex, "<strong>$1</strong>");

                // Sincroniza a posição da navegação com o mouse
                li.onmouseenter = () => {
                    sugestaoIndexNota = index;
                    this.atualizarSelecaoVisual(listaSugestoes.getElementsByTagName('li'), index);
                };

                li.onclick = () => {
                    codigoInput.value = prod.codigo;
                    listaSugestoes.style.display = 'none';
                    this.autoPreencherItemNota();
                };
                listaSugestoes.appendChild(li);
            });
            listaSugestoes.style.display = 'block';
        } else {
            listaSugestoes.style.display = 'none';
            this.limparFormularioItemNota();
        }
    },

    filtrarProdutosBusca: function (event) {
        if (event && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) return;

        sugestaoIndexBusca = -1;

        const codigoInput = document.getElementById('busca-codigo');
        const termoBusca = codigoInput.value.trim().toLowerCase();
        const listaSugestoes = document.getElementById('lista-sugestoes-busca');
        const db = DB.get();

        if (!termoBusca) {
            listaSugestoes.style.display = 'none';
            document.getElementById('busca-resultado').style.display = 'none';
            return;
        }

        const produtosFiltrados = db.produtos.filter(p => String(p.codigo).trim().toLowerCase().startsWith(termoBusca));

        if (produtosFiltrados.length > 0) {
            listaSugestoes.innerHTML = '';
            produtosFiltrados.forEach((prod, index) => {
                const li = document.createElement('li');
                li.innerText = `${prod.codigo} - ${prod.nome}`;
                li.className = 'sugestao-item';
                li.dataset.codigo = prod.codigo;

                const regex = new RegExp(`^(${termoBusca})`, "i");
                li.innerHTML = li.innerText.replace(regex, "<strong>$1</strong>");

                li.onmouseenter = () => {
                    sugestaoIndexBusca = index;
                    this.atualizarSelecaoVisual(listaSugestoes.getElementsByTagName('li'), index);
                };

                li.onclick = () => {
                    codigoInput.value = prod.codigo;
                    listaSugestoes.style.display = 'none';
                    this.buscarProduto();
                };
                listaSugestoes.appendChild(li);
            });
            listaSugestoes.style.display = 'block';
        } else {
            listaSugestoes.style.display = 'none';
        }
    },

    selecionarPrimeiraSugestao: function () {
        const listaSugestoes = document.getElementById('lista-sugestoes-produtos');
        if (listaSugestoes.style.display === 'block' && listaSugestoes.firstChild) {
            const primeiroCodigo = listaSugestoes.firstChild.dataset.codigo;
            document.getElementById('nota-item-codigo').value = primeiroCodigo;
            listaSugestoes.style.display = 'none';
            this.autoPreencherItemNota();
        } else {
            this.autoPreencherItemNota();
        }
    },

    selecionarPrimeiraSugestaoBusca: function () {
        const listaSugestoes = document.getElementById('lista-sugestoes-busca');
        if (listaSugestoes.style.display === 'block' && listaSugestoes.firstChild) {
            const primeiroCodigo = listaSugestoes.firstChild.dataset.codigo;
            document.getElementById('busca-codigo').value = primeiroCodigo;
            listaSugestoes.style.display = 'none';
            this.buscarProduto();
        } else {
            this.buscarProduto();
        }
    },

    limparFormularioItemNota: function () {
        document.getElementById('nota-item-nome').value = '';
        document.getElementById('nota-item-valor').value = '';
        document.getElementById('nota-item-variacao').innerHTML = '<option value="">--</option>';
    },

    autoPreencherItemNota: function () {
        const codigoInput = document.getElementById('nota-item-codigo').value.trim();
        const prod = DB.get().produtos.find(p => String(p.codigo) === String(codigoInput));
        const selectVariacao = document.getElementById('nota-item-variacao');

        selectVariacao.innerHTML = '';

        if (prod) {
            document.getElementById('nota-item-nome').value = prod.nome;
            document.getElementById('nota-item-valor').value = prod.valVenda;
            document.getElementById('nota-item-valor-producao-base').value = prod.valProducao || 0; // Puxa o custo base

            const variacoesDaPeca = prod.variacoes || ["Cromada"];
            variacoesDaPeca.forEach(v => {
                selectVariacao.innerHTML += `<option value="${v}">${v}</option>`;
            });

            document.getElementById('nota-item-variacao').focus();
            document.getElementById('lista-sugestoes-produtos').style.display = 'none';
            LogicaNegocio.verificarVariacao();
        }
    },

    toggleMaoObra: function () {
        const tipo = document.getElementById('nota-item-tipo-mao').value;
        document.getElementById('div-responsavel-producao').style.display = tipo === 'PRODUCAO' ? 'block' : 'none';
        document.getElementById('div-responsavel-empreita').style.display = tipo === 'EMPREITA' ? 'block' : 'none';
    },

    verificarVariacao: function () {
        const variacao = document.getElementById('nota-item-variacao').value;
        const inputValor = document.getElementById('nota-item-valor');
        const codigoInput = document.getElementById('nota-item-codigo').value.trim();

        const db = DB.get();
        const prod = db.produtos.find(p => String(p.codigo) === String(codigoInput));

        if (!prod) return;

        // Puxa o valor do banco. Se for Polida, puxa o Polida. Senão, puxa o normal.
        if (variacao === 'Polida') {
            inputValor.value = prod.valVendaPolida || prod.valVenda;
        } else {
            inputValor.value = prod.valVenda;
        }
    },

    toggleEditPolido: function (codigo) {
        const isPolida = document.getElementById(`edit-prod-var-polida-${codigo}`).checked;
        document.getElementById(`div-edit-polida-${codigo}`).style.display = isPolida ? 'block' : 'none';
    },

    carregarFuncionariosProducao: function () {
        const rh = LerRH();
        const sel = document.getElementById('nota-item-func-producao');
        if (!sel) return;
        const prods = rh.funcionarios.filter(f => f.tipo === 'Produção');
        sel.innerHTML = '<option value="">-- Selecione o Funcionário --</option>' +
            prods.map(f => `<option value="${f.nome}">${f.nome}</option>`).join('');
    },

    adicionarItemNota: function () {
        if (document.getElementById('nota-item-codigo').value && !document.getElementById('nota-item-nome').value) {
            this.autoPreencherItemNota();
        }

        const codigo = document.getElementById('nota-item-codigo').value;
        const nomeBase = document.getElementById('nota-item-nome').value;
        const variacaoSelecionada = document.getElementById('nota-item-variacao').value;
        let valor = parseFloat(document.getElementById('nota-item-valor').value);
        // FORÇA a captura do radio correto, validando se existe no DOM:
        const radiosTipo = document.querySelectorAll('input[name="nota-tipo"]');
        let tipoNota = 'VENDA';
        radiosTipo.forEach(radio => {
            if (radio.checked) tipoNota = radio.value;
        });

        const qtd = parseInt(document.getElementById('nota-item-qtd').value);
        const perca = parseInt(document.getElementById('nota-item-perca').value) || 0;
        const repeticoes = parseInt(document.getElementById('nota-item-repeticoes').value) || 1;

        if (!codigo || !nomeBase || !variacaoSelecionada || isNaN(valor) || isNaN(qtd) || qtd < 1) {
            CustomModal.show('Verifique os dados do item. A quantidade deve ser no mínimo 1.');
            return;
        }

        // --- NOVA LÓGICA DE MÃO DE OBRA ---
        const maoObraTipo = document.getElementById('nota-item-tipo-mao').value;
        let maoObraNome = 'KS Afinações';
        let custoProducao = 0;

        if (maoObraTipo === 'PRODUCAO') {
            maoObraNome = document.getElementById('nota-item-func-producao').value;
            if (!maoObraNome) { CustomModal.show('Selecione o funcionário de produção da lista!'); return; }
            custoProducao = parseFloat(document.getElementById('nota-item-valor-producao-base').value) || 0;
        } else if (maoObraTipo === 'EMPREITA') {
            maoObraNome = document.getElementById('nota-item-nome-empreita').value.trim();
            if (!maoObraNome) { CustomModal.show('Digite o nome da empreita/oficina!'); return; }
            custoProducao = parseFloat(document.getElementById('nota-item-valor-empreita').value);
            if (isNaN(custoProducao) || custoProducao < 0) { CustomModal.show('Digite o valor por peça combinado com a empreita!'); return; }
        }

        // Aplica a regra do Retrabalho (Zera as cobranças para a KS e para o Cliente)
        if (tipoNota === 'RETRABALHO') {
            valor = 0;
            custoProducao = 0;
        }
        // -----------------------------------

        const nomeFinalNaNota = `${nomeBase} - ${variacaoSelecionada}`;
        const subtotal = valor * qtd;
        const custoProducaoTotal = custoProducao * qtd;

        if (itemNotaEmEdicaoIndex !== null) {
            itensNotaAtual[itemNotaEmEdicaoIndex] = {
                codigo: codigo, nome: nomeFinalNaNota, valor: valor, qtd: qtd, perca: perca, subtotal: subtotal, variacaoBruta: variacaoSelecionada,
                maoObraTipo: maoObraTipo, maoObraNome: maoObraNome, custoProducao: custoProducao, custoProducaoTotal: custoProducaoTotal
            };
            itemNotaEmEdicaoIndex = null;
            document.getElementById('btn-add-item-nota').innerText = "Adicionar";
            document.getElementById('btn-add-item-nota').classList.remove('btn-success');
            document.getElementById('btn-add-item-nota').classList.add('btn-outline');
            document.getElementById('btn-add-item-nota').style.borderColor = 'var(--border-color)';
            document.getElementById('btn-add-item-nota').style.color = 'var(--text-main)';
        } else {
            for (let i = 0; i < repeticoes; i++) {
                itensNotaAtual.push({
                    codigo: codigo, nome: nomeFinalNaNota, valor: valor, qtd: qtd, perca: perca, subtotal: subtotal, variacaoBruta: variacaoSelecionada,
                    maoObraTipo: maoObraTipo, maoObraNome: maoObraNome, custoProducao: custoProducao, custoProducaoTotal: custoProducaoTotal
                });
            }
        }

        document.getElementById('nota-item-codigo').value = '';
        document.getElementById('nota-item-nome').value = '';
        document.getElementById('nota-item-valor').value = '';
        document.getElementById('nota-item-qtd').value = '';
        document.getElementById('nota-item-perca').value = '0';
        document.getElementById('nota-item-repeticoes').value = '1';
        document.getElementById('nota-item-variacao').innerHTML = '<option value="">--</option>';
        document.getElementById('lista-sugestoes-produtos').style.display = 'none';

        // Limpar novos campos de Mão de Obra
        document.getElementById('nota-item-valor-producao-base').value = '';
        document.getElementById('nota-item-nome-empreita').value = '';
        document.getElementById('nota-item-valor-empreita').value = '';

        UI.renderItensNota();

        setTimeout(() => {
            document.getElementById('nota-item-codigo').focus();
            sugestaoIndexNota = -1;
        }, 50);
    },

    editarItemNota: function (index) {
        const item = itensNotaAtual[index];
        if (!item) return;

        document.getElementById('nota-item-codigo').value = item.codigo;
        this.autoPreencherItemNota();

        setTimeout(() => {
            const selectVariacao = document.getElementById('nota-item-variacao');
            if (item.variacaoBruta) selectVariacao.value = item.variacaoBruta;

            // Retorna os dados da Mão de Obra pra tela
            document.getElementById('nota-item-tipo-mao').value = item.maoObraTipo || 'KS';
            LogicaNegocio.toggleMaoObra();
            if (item.maoObraTipo === 'PRODUCAO') {
                document.getElementById('nota-item-func-producao').value = item.maoObraNome;
            } else if (item.maoObraTipo === 'EMPREITA') {
                document.getElementById('nota-item-nome-empreita').value = item.maoObraNome;
                document.getElementById('nota-item-valor-empreita').value = item.custoProducao;
            }
        }, 50);

        document.getElementById('nota-item-qtd').value = item.qtd;
        document.getElementById('nota-item-perca').value = item.perca;
        document.getElementById('nota-item-repeticoes').value = '1';

        itemNotaEmEdicaoIndex = index;

        const btnAdd = document.getElementById('btn-add-item-nota');
        btnAdd.innerText = "Salvar Edição";
        btnAdd.classList.remove('btn-outline');
        btnAdd.classList.add('btn-success');
        btnAdd.style.borderColor = 'var(--success-color)';
        btnAdd.style.color = 'var(--success-color)';
    },

    removerItemNota: function (index) {
        itensNotaAtual.splice(index, 1);
        UI.renderItensNota();
    },

    limparNota: function () {
        CustomModal.show('Deseja realmente apagar todos os itens desta nota e começar de novo?', true, () => {
            itensNotaAtual = [];
            itemNotaEmEdicaoIndex = null;
            idNotaAtual = null;
            notaAbatida = false; // Reseta a trava do estoque

            UI.renderItensNota();
            document.getElementById('nota-cliente').value = '';
            document.getElementById('nota-data').value = new Date().toISOString().split('T')[0];

            const btnAdd = document.getElementById('btn-add-item-nota');
            btnAdd.innerText = "Adicionar";
            btnAdd.classList.remove('btn-success');
            btnAdd.classList.add('btn-outline');
            btnAdd.style.borderColor = 'var(--border-color)';
            btnAdd.style.color = 'var(--text-main)';

            // Volta o botão de estoque ao normal
            const btnEstoque = document.getElementById('btn-abater-estoque');
            if (btnEstoque) {
                btnEstoque.style.backgroundColor = 'transparent';
                btnEstoque.style.borderColor = '#38bdf8';
                btnEstoque.style.color = '#38bdf8';
                btnEstoque.innerHTML = '<i data-lucide="package-minus" style="width: 18px; height: 18px;"></i> Abater Estoque';
                lucide.createIcons();
            }

            CustomModal.show('Nota limpa com sucesso!');
        });
    },

    gerarEImprimirNota: function (isReprint = false) {
        if (!isReprint) {
            const codigoPendente = document.getElementById('nota-item-codigo').value;
            if (codigoPendente.trim() !== "") {
                CustomModal.show('ATENÇÃO: Você tem um código (' + codigoPendente + ') digitado que não foi adicionado ou salvo. Verifique antes de gerar a nota!');
                return;
            }
        }

        const clIndex = document.getElementById('nota-cliente').value;
        if (clIndex === "") { CustomModal.show('Selecione o Destinatário/Cliente da lista.'); return; }

        if (itensNotaAtual.length === 0) {
            CustomModal.show('Sua nota está vazia. Adicione os itens na tabela antes de Imprimir!');
            return;
        }

        const cliente = DB.get().clientes[clIndex];

        const radiosTipo = document.querySelectorAll('input[name="nota-tipo"]');
        let tipoNota = 'VENDA';
        radiosTipo.forEach(radio => {
            if (radio.checked) tipoNota = radio.value;
        });

        if (tipoNota === 'RETRABALHO') {
            itensNotaAtual.forEach(item => {
                item.valor = 0;
                item.subtotal = 0;
            });
        }

        if (!idNotaAtual) {
            idNotaAtual = Math.floor(10000 + Math.random() * 90000).toString();
        }
        const idNota = idNotaAtual;

        const dataInputRaw = document.getElementById('nota-data').value;
        let dataImpressao = new Date().toLocaleDateString('pt-BR');
        if (dataInputRaw) {
            const partes = dataInputRaw.split('-');
            dataImpressao = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        const total = itensNotaAtual.reduce((acc, item) => acc + item.subtotal, 0);

        const db = DB.get();
        const novaNota = {
            id: idNota,
            data: dataInputRaw || new Date().toISOString().split('T')[0],
            cliente: cliente.nome,
            clienteIndex: clIndex,
            itens: JSON.parse(JSON.stringify(itensNotaAtual)),
            total: total,
            tipo: tipoNota
        };
        const idxNotaExistente = db.notasSalvas.findIndex(n => n.id === idNota);
        if (idxNotaExistente > -1) db.notasSalvas[idxNotaExistente] = novaNota;
        else db.notasSalvas.push(novaNota);
        DB.save(db);

        const generateVia = (viaName) => `
            <div style="border: 2px solid black; display: flex; flex-direction: column; min-height: 46vh; padding: 10px; box-sizing: border-box; font-family: Arial, sans-serif; color: black; background: white; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid black; padding: 4px 8px; font-size: 10px; font-weight: bold; color: black;">
                    <span>${viaName}</span>
                    <span style="color: ${tipoNota === 'RETRABALHO' ? '#ef4444' : 'black'}; font-size: 12px;">
                        ${tipoNota === 'RETRABALHO' ? 'RETRABALHO (SEM CUSTO)' : 'DOCUMENTO AUXILIAR'}
                    </span>
                    <span></span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 2px solid black;">
                    <div>
                        <div style="font-size: 24px; font-weight: bold; letter-spacing: 0.5px; color: black;">KS Afinações</div>
                        <div style="font-size: 11px; color: #333; margin-top: 2px;">Metais Sanitários</div>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: black;">
                        <div style="margin-bottom: 4px;">N.º <span style="font-weight: bold; font-size: 14px; color: black;">${idNota}</span></div>
                        <div>Data: ${dataImpressao}</div>
                    </div>
                </div>
                <div style="display: flex; border-bottom: 2px solid black; font-size: 10px; color: black;">
                    <div style="flex: 1; border-right: 2px solid black; padding: 0;">
                        <div style="text-align: center; font-weight: bold; border-bottom: 1px solid black; padding: 4px 0; background: transparent;">KS Afinações</div>
                        <table style="width: 100%; font-size: 10px; border-collapse: collapse; color: black;">
                            <tr><td style="width: 55px; padding: 3px 6px;">Endereço:</td><td style="padding: 3px 6px;">KS Afinações, Santa Isabel - PR, 87910-000</td></tr>
                            <tr><td style="padding: 3px 6px;">Telefone:</td><td style="padding: 3px 6px;">(44) 9 9828-8914</td></tr>
                            <tr><td style="padding: 3px 6px;">CNPJ:</td><td style="padding: 3px 6px;">42.360.395/0001-83</td></tr>
                        </table>
                    </div>
                    <div style="flex: 1; padding: 0;">
                        <div style="text-align: center; font-weight: bold; border-bottom: 1px solid black; padding: 4px 0; background: transparent;">${cliente.nome}</div>
                        <table style="width: 100%; font-size: 10px; border-collapse: collapse; color: black;">
                            <tr><td style="width: 55px; padding: 3px 6px;">Endereço:</td><td style="padding: 3px 6px;">${cliente.endereco || '-'}</td></tr>
                            <tr><td style="padding: 3px 6px;">Telefone:</td><td style="padding: 3px 6px;">${cliente.telefone || '-'}</td></tr>
                            <tr><td style="padding: 3px 6px;">CNPJ:</td><td style="padding: 3px 6px;">${cliente.cnpj || '-'}</td></tr>
                        </table>
                    </div>
                </div>
                <div style="flex: 1; border-bottom: 2px solid black;">
                    ${tipoNota === 'RETRABALHO' ? `
                    <div style="text-align: center; padding: 5px; background: #ffffff; color: #ca0f0f; font-weight: bold; font-size: 14px; letter-spacing: 2px; border-bottom: 2px solid black;">
                        RETRABALHO - SEM CUSTO ADICIONAL
                    </div>` : ''}
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: black;">
                        <thead>
                            <tr>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 12%; color: black;">CÓDIGO</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 40%; color: black;">PRODUTO</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 8%; color: black;">QTD</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 10%; color: black;">PERCA</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: right; width: 15%; color: black;">VAL. UNIT.</th>
                                <th style="border-bottom: 2px solid black; padding: 4px; text-align: right; width: 15%; color: black;">VAL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itensNotaAtual.map(i => `
                            <tr>
                                <td style="border-right: 1px solid black; padding: 3px 4px; text-align: center; color: black;">${i.codigo}</td>
                                <td style="border-right: 1px solid black; padding: 3px 4px; color: black;">${i.nome}</td>
                                <td style="border-right: 1px solid black; padding: 3px 4px; text-align: center; color: black;">${i.qtd}</td>
                                <td style="border-right: 1px solid black; padding: 3px 4px; text-align: center; font-weight: ${i.perca > 0 ? 'bold' : 'normal'}; color: black;">${i.perca > 0 ? i.perca : ''}</td>
                                <td style="border-right: 1px solid black; padding: 3px 4px; text-align: right; color: black;">R$ ${i.valor.toFixed(2).replace('.', ',')}</td>
                                <td style="padding: 3px 4px; text-align: right; color: black;">R$ ${i.subtotal.toFixed(2).replace('.', ',')}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="display: flex; min-height: 100px; padding-top: 10px;">
                    <div style="flex: 6; border-right: 1px solid black; padding: 0 15px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
                        <div style="text-align: center; margin-bottom: 6px; font-size: 11px; color: black;">
                            Dúvidas sobre o pedido? Contacte <strong>(44) 9 9828-8914</strong>
                        </div>
                        <div style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 10px; color: black;">
                            OBRIGADO PELA CONFIANÇA!
                        </div>
                        ${viaName === '1ª VIA' ? `
                        <div style="border-top: 1px solid black; width: 85%; padding-top: 6px; text-align: center; font-size: 12px; color: black; margin-top: 20px;">
                            Assinatura Cliente
                        </div>` : ''}
                    </div>
                    <div style="flex: 4; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; font-size: 18px; font-weight: bold; color: black;">
                        <span>TOTAL:</span>
                        <span>R$ ${total.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            </div>
        `;

        // DOM VIRTUAL V3
        let printDiv = document.getElementById('print-area-externa-nota-v3');
        if (!printDiv) {
            printDiv = document.createElement('div');
            printDiv.id = 'print-area-externa-nota-v3';
            document.body.appendChild(printDiv);
        }

        printDiv.innerHTML = `
            ${generateVia("1ª VIA")}
            <div style="border-top: 1px dashed #000; margin: 15px 0;"></div>
            ${generateVia("2ª VIA")}
        `;

        // CSS BLINDADO CONTRA A PÁGINA BRANCA DO CELULAR
        let style = document.getElementById('print-style-nota-mobile-v3');
        if (!style) {
            style = document.createElement('style');
            style.id = 'print-style-nota-mobile-v3';
            style.innerHTML = `
                #print-area-externa-nota-v3 { display: none; }
                
                /* Esconde TUDO no body que não seja a nota de impressão */
                body.printing-nota > *:not(#print-area-externa-nota-v3) {
                    display: none !important;
                }
                
                body.printing-nota {
                    background: white !important;
                    overflow: visible !important;
                    height: auto !important;
                }

                /* Libera a nota com posição STATICA (Natural), que é a única que o celular respeita */
                body.printing-nota #print-area-externa-nota-v3 { 
                    display: block !important; 
                    position: static !important; 
                    width: 100% !important; 
                    background: white !important; 
                    min-height: 100vh;
                    margin: 0;
                    padding: 0;
                }

                @media print { 
                    @page { size: A4 portrait; margin: 5mm; } 
                    body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0;} 
                }
            `;
            document.head.appendChild(style);
        }

        const tituloOriginal = document.title;
        document.title = idNota;
        
        // Ativa a classe
        document.body.classList.add('printing-nota');

        // Força o navegador do celular a "desenhar" a tela antes de avançar
        void document.body.offsetHeight;

        setTimeout(() => {
            window.print();
            
            // FUNÇÃO DE RETORNO BLINDADA PARA CELULAR
            // Só tira a classe de impressão DEPOIS que o celular terminar de gerar o PDF
            const restoreApp = () => {
                document.title = tituloOriginal;
                document.body.classList.remove('printing-nota');
                window.removeEventListener('afterprint', restoreApp);
            };

            // Escuta o evento oficial do celular
            window.addEventListener('afterprint', restoreApp);
            
            // Caso de falha (se o iPhone não disparar o evento, volta ao normal em 5 segundos)
            setTimeout(restoreApp, 5000); 

        }, 800);
    },

    abaterEstoqueNota: function () {
        if (itensNotaAtual.length === 0) {
            CustomModal.show('A nota está vazia. Adicione os itens primeiro.');
            return;
        }
        const clIndex = document.getElementById('nota-cliente').value;
        if (clIndex === "") {
            CustomModal.show('Selecione o Cliente na nota para poder registrar a saída no estoque.');
            return;
        }

        if (notaAbatida) {
            CustomModal.show('As peças desta nota JÁ FORAM abatidas do estoque!');
            return;
        }

        const cliente = DB.get().clientes[clIndex];

        CustomModal.show(`Confirma a baixa destas peças no Estoque de Afinação?`, true, () => {
            const dbEraw = localStorage.getItem('ks_estoque_dados');
            const dbE = dbEraw ? JSON.parse(dbEraw) : { insumos: [], logsInsumos: [], logsPecas: [] };
            if (!dbE.logsPecas) dbE.logsPecas = [];

            if (!idNotaAtual) {
                idNotaAtual = Math.floor(10000 + Math.random() * 90000).toString();
            }

            itensNotaAtual.forEach(item => {
                dbE.logsPecas.push({
                    id: 'LOGP_' + Date.now() + Math.random().toString(36).substr(2, 5),
                    data: new Date().toISOString().split('T')[0],
                    tipo: 'Saída',
                    codigoPeca: item.codigo,
                    qtd: item.qtd,
                    origemDestino: `Nota Fiscal ${idNotaAtual} - ${cliente.nome}`
                });
            });

            localStorage.setItem('ks_estoque_dados', JSON.stringify(dbE));
            if (typeof DB !== 'undefined' && DB.save) DB.save(DB.get());

            notaAbatida = true;

            const btnEstoque = document.getElementById('btn-abater-estoque');
            if (btnEstoque) {
                btnEstoque.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                btnEstoque.style.borderColor = '#10b981';
                btnEstoque.style.color = '#10b981';
                btnEstoque.innerHTML = '<i data-lucide="check" style="width: 18px; height: 18px;"></i> Estoque Abatido';
                lucide.createIcons();
            }

            CustomModal.show('Peças abatidas com sucesso!');
        });
    },

    abaterEstoqueNota: function () {
        if (itensNotaAtual.length === 0) {
            CustomModal.show('A nota está vazia. Adicione os itens primeiro.');
            return;
        }
        const clIndex = document.getElementById('nota-cliente').value;
        if (clIndex === "") {
            CustomModal.show('Selecione o Cliente na nota para poder registrar a saída no estoque.');
            return;
        }

        if (notaAbatida) {
            CustomModal.show('As peças desta nota JÁ FORAM abatidas do estoque!');
            return;
        }

        const cliente = DB.get().clientes[clIndex];

        CustomModal.show(`Confirma a baixa destas peças no Estoque de Afinação?`, true, () => {
            const dbEraw = localStorage.getItem('ks_estoque_dados');
            const dbE = dbEraw ? JSON.parse(dbEraw) : { insumos: [], logsInsumos: [], logsPecas: [] };
            if (!dbE.logsPecas) dbE.logsPecas = [];

            if (!idNotaAtual) {
                idNotaAtual = Math.floor(10000 + Math.random() * 90000).toString();
            }

            itensNotaAtual.forEach(item => {
                dbE.logsPecas.push({
                    id: 'LOGP_' + Date.now() + Math.random().toString(36).substr(2, 5),
                    data: new Date().toISOString().split('T')[0],
                    tipo: 'Saída',
                    codigoPeca: item.codigo,
                    qtd: item.qtd,
                    origemDestino: `Nota Fiscal ${idNotaAtual} - ${cliente.nome}`
                });
            });

            localStorage.setItem('ks_estoque_dados', JSON.stringify(dbE));
            if (typeof DB !== 'undefined' && DB.save) DB.save(DB.get());

            notaAbatida = true;

            const btnEstoque = document.getElementById('btn-abater-estoque');
            if (btnEstoque) {
                btnEstoque.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                btnEstoque.style.borderColor = '#10b981';
                btnEstoque.style.color = '#10b981';
                btnEstoque.innerHTML = '<i data-lucide="check" style="width: 18px; height: 18px;"></i> Estoque Abatido';
                lucide.createIcons();
            }

            CustomModal.show('Peças abatidas com sucesso!');
        });
    },
};

const Tabelas = {
    gerarTabelaPreview: function (dadosReajuste = null) {
        const fornecedor = document.getElementById('tabela-fornecedor').value;
        let produtos = DB.get().produtos;

        let titulo = "Tabela Geral - KS Afinações";
        if (fornecedor !== "GERAL") {
            produtos = produtos.filter(p => p.fornecedor === fornecedor);
            titulo = `TABELA KS AFINAÇÃO ${new Date().getFullYear()} - ${fornecedor}`;
        }

        if (produtos.length === 0 && !dadosReajuste) {
            CustomModal.show('Nenhum produto encontrado para este fornecedor.');
            return;
        }

        produtos.sort((a, b) => a.nome.localeCompare(b.nome));

        let htmlContent = '';

        if (dadosReajuste) {
            htmlContent += `
                <div class="tabela-precos-header">
                    <h1>KS AFINAÇÕES</h1>
                    <h2>Relatório de Reajuste</h2>
                </div>
                <div class="tabela-precos-subheader">Empresa: ${dadosReajuste.empresa} | Aumento Aplicado: +${dadosReajuste.porcentagem}%</div>
                <table class="tabela-precos-table">
                    <thead>
                        <tr>
                            <th class="produto-col" style="width: 70%; text-align: left;">Produto</th>
                            <th class="valor-col-th" style="width: 15%;">Preço Antigo</th>
                            <th class="valor-col-th" style="width: 15%;">Preço Novo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            dadosReajuste.itens.forEach(item => {
                htmlContent += `
                    <tr>
                        <td class="produto-col">${item.codigo} - ${item.nome}</td>
                        <td>
                            <div class="valor-reajuste-flex">
                                <span>R$</span> <span>${item.antigo.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </td>
                        <td>
                            <div class="valor-reajuste-flex">
                                <span>R$</span> <span>${item.novo.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </td>
                    </tr>
                `;
            });
        } else {
            htmlContent += `
                <div class="tabela-precos-header">
                    <h1>KS AFINAÇÕES</h1>
                    <h2>Tabela de Preços</h2>
                </div>
                <div class="tabela-precos-subheader">Tabela.: ${titulo.toUpperCase()}</div>
                <table class="tabela-precos-table">
                    <thead>
                        <tr>
                            <th class="produto-col" style="width: 80%; text-align: left;">Produto</th>
                            <th class="valor-col-th" style="width: 20%;">Vlr. Unit.</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            produtos.forEach(p => {
                const variacoes = p.variacoes || ["Cromada"];

                let nomeExibicao = "";
                if (variacoes.length > 1) {
                    nomeExibicao = `${p.codigo} - ${p.nome} (TODOS)`;
                } else {
                    nomeExibicao = `${p.codigo} - ${p.nome} - ${variacoes[0]}`;
                }

                htmlContent += `
                    <tr>
                        <td class="produto-col">${nomeExibicao}</td>
                        <td>
                            <div class="valor-flex">
                                <span>R$</span> <span>${p.valVenda.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        htmlContent += `</tbody></table>`;

        document.getElementById('preview-tabela-conteudo').innerHTML = htmlContent;
        document.getElementById('preview-tabela-container').style.display = 'block';
        document.getElementById('print-tabela-conteudo').innerHTML = htmlContent;

        document.getElementById('btn-imprimir-tabela').style.display = 'flex';
    },

    imprimirTabela: function () {
        document.title = "Tabela_Precos_KS_Afinacoes";
        document.body.className = 'printing-tabela';

        setTimeout(() => {
            window.print();
        }, 500);
    },

    aplicarReajuste: function () {
        const fornecedor = document.getElementById('reajuste-fornecedor').value;
        const porcentagemStr = document.getElementById('reajuste-porcentagem').value;

        if (!fornecedor) { CustomModal.show('Selecione uma empresa para reajustar.'); return; }
        if (!porcentagemStr || isNaN(parseFloat(porcentagemStr)) || parseFloat(porcentagemStr) <= 0) {
            CustomModal.show('Digite uma porcentagem válida de aumento (ex: 10).'); return;
        }

        const porcentagem = parseFloat(porcentagemStr);

        CustomModal.show(`Atenção: Isso aumentará todos os preços da empresa ${fornecedor} em ${porcentagem}%. Confirma?`, true, () => {
            const db = DB.get();
            let alterados = 0;
            let relatorioItens = [];

            db.produtos.forEach(p => {
                if (p.fornecedor === fornecedor) {
                    const precoAntigo = p.valVenda;
                    const precoNovo = parseFloat((precoAntigo * (1 + (porcentagem / 100))).toFixed(2));
                    p.valVenda = precoNovo;
                    alterados++;

                    let nomeRelatorio = p.nome;
                    if (p.variacoes && p.variacoes.length > 1) {
                        nomeRelatorio = `${p.nome} (TODOS)`;
                    } else if (p.variacoes && p.variacoes.length === 1) {
                        nomeRelatorio = `${p.nome} - ${p.variacoes[0]}`;
                    }

                    relatorioItens.push({ codigo: p.codigo, nome: nomeRelatorio, antigo: precoAntigo, novo: precoNovo });
                }
            });

            if (alterados > 0) {
                DB.save(db);
                UI.renderTabelaProdutos();

                const dadosReajuste = { empresa: fornecedor, porcentagem: porcentagem, itens: relatorioItens };
                this.gerarTabelaPreview(dadosReajuste);

                document.getElementById('reajuste-porcentagem').value = '';
                CustomModal.show(`${alterados} produtos base foram atualizados com sucesso! Você pode visualizar e IMPRIMIR a tabela de relatório logo abaixo.`);
            } else {
                CustomModal.show('Nenhum produto encontrado para esta empresa.');
            }
        });
    }
};

const UI = {
    initData: function () {
        if (document.getElementById('dash-prod-count')) this.updateDashCards();
        if (document.querySelector('#tabela-produtos tbody')) this.renderTabelaProdutos();
        if (document.querySelector('#tabela-clientes tbody')) this.renderTabelaClientes();
        if (document.getElementById('nota-cliente')) this.renderSelectClientes();
        if (document.getElementById('prod-fornecedor')) this.renderSelectFornecedorProduto();
        if (document.getElementById('tabela-fornecedor')) this.renderSelectsFornecedoresTabelas();

        // Define a data atual no input de data da nota
        const inputData = document.getElementById('nota-data');
        if (inputData) {
            inputData.value = new Date().toISOString().split('T')[0];
        }

        // CARREGA A LISTA DE FUNCIONÁRIOS AO ABRIR O SISTEMA
        LogicaNegocio.carregarFuncionariosProducao();
    },

    switchTab: function (tabId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`button[onclick="UI.switchTab('${tabId}')"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');

        document.body.className = '';
        document.title = "Gestão - KS Afinações";

        if (tabId === 'busca') Tabelas.renderProdutos();
        if (tabId === 'nota') LogicaNegocio.carregarFuncionariosProducao();
        if (tabId === 'arquivo') ArquivoNotas.renderLista();
    },

    updateDashCards: function () {
        const db = DB.get();
        document.getElementById('dash-prod-count').innerText = db.produtos.length;
        document.getElementById('dash-cli-count').innerText = db.clientes.length;
    },

    renderTabelaProdutos: function () {
        const tbody = document.querySelector('#tabela-produtos tbody');
        tbody.innerHTML = '';
        DB.get().produtos.forEach(p => {
            const varsFormatadas = p.variacoes ? p.variacoes.join(', ') : 'Cromada';
            tbody.innerHTML += `<tr id="tr-produto-${p.codigo}">
                <td>${p.codigo}</td>
                <td>${p.nome} <br><small style="color:var(--text-muted); font-size: 12px;">(${varsFormatadas})</small></td>
                <td>${p.fornecedor || '-'}</td>
                <td>
                    R$ ${p.valVenda.toFixed(2)}
                    ${p.variacoes && p.variacoes.includes("Polida") ? `<br><small style="color:#a855f7;">Polida: R$ ${(p.valVendaPolida || p.valVenda).toFixed(2)}</small>` : ''}
                </td>
                <td style="color: var(--success-color); font-weight: bold;">R$ ${(p.valProducao || 0).toFixed(2)}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="LogicaNegocio.iniciarEdicaoProduto('${p.codigo}')" style="background: transparent; border: none; cursor: pointer; color: var(--primary-color); padding: 0;" title="Editar Produto">
                            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-danger" onclick="LogicaNegocio.excluirProduto('${p.codigo}')"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        });
        lucide.createIcons();
    },

    renderTabelaClientes: function () {
        const tbody = document.querySelector('#tabela-clientes tbody');
        tbody.innerHTML = '';
        DB.get().clientes.forEach((c, i) => {
            tbody.innerHTML += `<tr id="tr-cliente-${i}">
                <td>${c.nome}</td>
                <td>${c.cnpj || '-'}</td>
                <td>${c.telefone || '-'}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="LogicaNegocio.iniciarEdicaoCliente(${i})" style="background: transparent; border: none; cursor: pointer; color: var(--primary-color); padding: 0;" title="Editar Cliente">
                            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-danger" onclick="LogicaNegocio.excluirCliente(${i})"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        });
        lucide.createIcons();
    },
    renderSelectClientes: function () {
        const select = document.getElementById('nota-cliente');
        select.innerHTML = '<option value="">-- Selecione --</option>';
        DB.get().clientes.forEach((c, i) => select.innerHTML += `<option value="${i}">${c.nome}</option>`);
    },
    renderSelectFornecedorProduto: function () {
        const select = document.getElementById('prod-fornecedor');
        const valorAtual = select.value;
        select.innerHTML = '<option value="">-- Selecione o Fornecedor (Opcional) --</option>';
        DB.get().clientes.forEach(c => select.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
        if (valorAtual) select.value = valorAtual;
    },
    renderSelectsFornecedoresTabelas: function () {
        const selectTabela = document.getElementById('tabela-fornecedor');
        const selectReajuste = document.getElementById('reajuste-fornecedor');

        const fornecedores = [...new Set(DB.get().produtos.map(p => p.fornecedor).filter(f => f && f.trim() !== ''))];
        fornecedores.sort();

        selectTabela.innerHTML = '<option value="GERAL">-- Tabela Geral (Todos os Produtos) --</option>';
        selectReajuste.innerHTML = '<option value="">-- Selecione a Empresa --</option>';

        fornecedores.forEach(f => {
            selectTabela.innerHTML += `<option value="${f}">${f}</option>`;
            selectReajuste.innerHTML += `<option value="${f}">${f}</option>`;
        });
    },

    renderItensNota: function () {
        const tbody = document.getElementById('lista-itens-nota');
        tbody.innerHTML = '';
        let total = 0;
        itensNotaAtual.forEach((item, i) => {
            total += item.subtotal;
            // Destaque visual se for o item sendo editado
            const trClass = (itemNotaEmEdicaoIndex === i) ? 'style="background-color: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--success-color);"' : '';

            tbody.innerHTML += `<tr ${trClass}>
                <td>${item.codigo}</td>
                <td>
                    ${item.nome}
                    <div style="font-size: 11px; color: #38bdf8; margin-top: 2px;">👤 ${item.maoObraNome || 'KS Afinações'}</div>
                </td>
                <td>R$ ${item.valor.toFixed(2)}</td>
                <td>${item.qtd}</td>
                <td style="color: var(--text-main); font-weight: ${item.perca > 0 ? 'bold' : 'normal'};">${item.perca > 0 ? item.perca : '-'}</td>
                <td>R$ ${item.subtotal.toFixed(2)}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-outline" style="border-color: var(--primary-color); color: var(--primary-color); padding: 4px;" onclick="LogicaNegocio.editarItemNota(${i})" title="Editar Item">
                            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-danger" style="padding: 4px;" onclick="LogicaNegocio.removerItemNota(${i})" title="Remover">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        });
        document.getElementById('nota-total-display').innerText = `R$ ${total.toFixed(2)}`;
        lucide.createIcons();
    }
};

const ArquivoNotas = {
    renderLista: function () {
        const db = DB.get();
        const tbody = document.querySelector('#tabela-arquivo-notas tbody');
        if (!tbody) return;

        let filtro = 'TODAS';
        const selectFiltro = document.getElementById('filtro-arquivo-tipo');
        if (selectFiltro) filtro = selectFiltro.value;

        let notas = [...db.notasSalvas].reverse();

        // APLICA O FILTRO POR MODO DE ESCOLHA
        if (filtro !== 'TODAS') {
            notas = notas.filter(n => (n.tipo || 'VENDA') === filtro);
        }

        if (notas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhuma nota de ${filtro.toLowerCase()} encontrada.</td></tr>`;
            return;
        }

        let html = '';
        notas.forEach(nota => {
            const dataFormatada = nota.data.split('-').reverse().join('/');
            const isRetrabalho = nota.tipo === 'RETRABALHO';
            const corTipo = isRetrabalho ? '#ef4444' : '#10b981';
            const labelTipo = isRetrabalho ? 'RETRABALHO' : 'VENDA';

            html += `<tr>
                <td style="color:#facc15; font-weight:bold;">${nota.id}</td>
                <td>${dataFormatada}</td>
                <td><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${corTipo}22; color: ${corTipo}; border: 1px solid ${corTipo}55; font-weight: bold;">${labelTipo}</span></td>
                <td>${nota.cliente}</td>
                <td style="text-align:right; color:#10b981; font-weight:bold;">R$ ${nota.total.toFixed(2).replace('.', ',')}</td>
                <td style="text-align:center;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button class="btn-outline" style="padding: 6px 10px; font-size:12px; border-color:#a855f7; color:#a855f7; display: flex; align-items: center; gap: 4px; min-width: auto; height: auto;" onclick="ArquivoNotas.abrirPreview('${nota.id}')" title="Ver Detalhes"><i data-lucide="eye" style="width: 14px;"></i> Ver</button>
                        <button class="btn-outline" style="padding: 6px 10px; font-size:12px; border-color:#38bdf8; color:#38bdf8; display: flex; align-items: center; gap: 4px; min-width: auto; height: auto;" onclick="ArquivoNotas.visualizar('${nota.id}')" title="Imprimir"><i data-lucide="printer" style="width: 14px;"></i> Imp</button>
                        <button class="btn-outline" style="padding: 6px 10px; font-size:12px; border-color:#eab308; color:#eab308; display: flex; align-items: center; gap: 4px; min-width: auto; height: auto;" onclick="ArquivoNotas.editar('${nota.id}')" title="Editar"><i data-lucide="pencil" style="width: 14px;"></i> Edit</button>
                        <button class="btn-danger" style="padding: 6px 10px; font-size:12px; display: flex; align-items: center; gap: 4px; min-width: auto; height: auto;" onclick="ArquivoNotas.excluir('${nota.id}')" title="Excluir"><i data-lucide="trash-2" style="width: 14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        lucide.createIcons();
    },

    visualizar: function (id) {
        const nota = DB.get().notasSalvas.find(n => n.id === id);
        if (!nota) return;

        const backupItens = JSON.parse(JSON.stringify(itensNotaAtual));
        const backupId = idNotaAtual;

        itensNotaAtual = nota.itens;
        idNotaAtual = nota.id;
        document.getElementById('nota-data').value = nota.data;
        document.getElementById('nota-cliente').value = nota.clienteIndex;

        LogicaNegocio.gerarEImprimirNota(true);

        itensNotaAtual = backupItens;
        idNotaAtual = backupId;
    },

    editar: function (id) {
        const nota = DB.get().notasSalvas.find(n => n.id === id);
        if (!nota) return;

        CustomModal.show(`Deseja abrir a Nota ${id} para edição?`, true, () => {
            itensNotaAtual = JSON.parse(JSON.stringify(nota.itens));
            idNotaAtual = nota.id;
            notaAbatida = false;
            document.getElementById('nota-data').value = nota.data;
            document.getElementById('nota-cliente').value = nota.clienteIndex;
            UI.switchTab('nota');
            UI.renderItensNota();
        });
    },

    excluir: function (id) {
        CustomModal.show(`Tem certeza absoluta que deseja excluir a Nota Nº ${id}? Esta ação não pode ser desfeita.`, true, () => {
            const db = DB.get();
            db.notasSalvas = db.notasSalvas.filter(n => n.id !== id);
            DB.save(db);
            ArquivoNotas.renderLista();
            CustomModal.show(`Nota ${id} excluída com sucesso!`);
        });
    },

    abrirPreview: function (id) {
        const nota = DB.get().notasSalvas.find(n => n.id === id);
        if (!nota) return;
        const dataFormatada = nota.data.split('-').reverse().join('/');
        const isRetrabalho = nota.tipo === 'RETRABALHO';

        let html = `
            <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <p><strong>Tipo:</strong> <span style="color: ${isRetrabalho ? '#ef4444' : '#10b981'}; font-weight:bold;">${isRetrabalho ? 'RETRABALHO' : 'VENDA'}</span></p>
                <p><strong>Cliente:</strong> ${nota.cliente}</p>
                <p><strong>Data:</strong> ${dataFormatada}</p>
                <p style="font-size: 18px;"><strong>Total:</strong> <span style="color: var(--success-color);">R$ ${nota.total.toFixed(2).replace('.', ',')}</span></p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted);">
                        <th style="padding: 8px 4px; text-align: left;">Cód</th>
                        <th style="padding: 8px 4px; text-align: left;">Produto / Resp.</th>
                        <th style="padding: 8px 4px; text-align: center;">Qtd</th>
                        <th style="padding: 8px 4px; text-align: right;">Val. Un.</th>
                        <th style="padding: 8px 4px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        nota.itens.forEach(item => {
            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px 4px;">${item.codigo}</td>
                    <td style="padding: 8px 4px;">
                        ${item.nome}
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Resp: ${item.maoObraNome || 'KS'}</div>
                    </td>
                    <td style="padding: 8px 4px; text-align: center;">${item.qtd}</td>
                    <td style="padding: 8px 4px; text-align: right;">R$ ${item.valor.toFixed(2)}</td>
                    <td style="padding: 8px 4px; text-align: right; color: var(--success-color);">R$ ${item.subtotal.toFixed(2)}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;

        document.getElementById('preview-nota-titulo').innerText = `Nota Nº ${nota.id}`;
        document.getElementById('preview-nota-conteudo').innerHTML = html;
        document.getElementById('modal-preview-nota').style.display = 'flex';

        lucide.createIcons();
    }
};

document.addEventListener("DOMContentLoaded", function () {
    UI.initData();
    setTimeout(() => { if (window.google) DriveAPI.init(); }, 1000);
});