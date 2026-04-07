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
    show: function (msg, isConfirm = false, onConfirm = null) {
        document.getElementById('modal-message').innerText = msg;
        document.getElementById('custom-modal').style.display = 'flex';

        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        btnCancel.style.display = isConfirm ? 'inline-block' : 'none';

        btnConfirm.onclick = () => {
            this.hide();
            if (onConfirm) onConfirm();
        };

        btnCancel.onclick = () => {
            this.hide();
        };
    },
    hide: function () {
        document.getElementById('custom-modal').style.display = 'none';
    }
};

const DB = {
    KEY: 'ks_afinacoes_dados',
    get: function () {
        const data = localStorage.getItem(this.KEY);
        return data ? JSON.parse(data) : { produtos: [], clientes: [] };
    },
    // ATUALIZADO: Salva Notas e RH juntos no backup da nuvem
    save: function (data) {
        // Salva os dados de Notas localmente
        localStorage.setItem(this.KEY, JSON.stringify(data));
        
        // Captura os dados atuais de RH para incluir no backup unificado
        const dadosRH = localStorage.getItem('ks_rh_dados');
        const backupUnificado = {
            notas: data,
            rh: dadosRH ? JSON.parse(dadosRH) : { funcionarios: [], pontos: [], descontosFechamento: [] }
        };

        UI.updateDashCards();
        UI.renderSelectsFornecedoresTabelas();
        
        // Envia o pacote completo (Notas + RH) para o Google Drive
        DriveAPI.autoSaveBackup(JSON.stringify(backupUnificado));
    },
    // ATUALIZADO: Restaura tanto Notas quanto RH
    importBackup: function () {
        const fileInput = document.getElementById('file-import');
        if (!fileInput.files.length) { CustomModal.show('Selecione um arquivo .json primeiro.'); return; }
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const parsed = JSON.parse(e.target.result);
                
                // Verifica se é o novo formato unificado
                if (parsed.notas && parsed.rh) {
                    localStorage.setItem(DB.KEY, JSON.stringify(parsed.notas));
                    localStorage.setItem('ks_rh_dados', JSON.stringify(parsed.rh));
                    CustomModal.show('Backup Unificado (Notas + RH) restaurado com sucesso!');
                } 
                // Mantém compatibilidade com backups antigos (só notas)
                else if (parsed.produtos && parsed.clientes) {
                    localStorage.setItem(DB.KEY, JSON.stringify(parsed));
                    CustomModal.show('Backup antigo (apenas Notas) restaurado com sucesso!');
                }
                
                UI.initData();
            } catch (err) { CustomModal.show('Erro ao ler arquivo JSON.'); }
        };
        reader.readAsText(fileInput.files[0]);
    },
    // ATUALIZADO: Gera arquivo JSON contendo tudo
    downloadManualBackup: function () {
        const dadosNotas = JSON.parse(localStorage.getItem(this.KEY) || '{"produtos":[], "clientes":[]}');
        const dadosRH = JSON.parse(localStorage.getItem('ks_rh_dados') || '{"funcionarios":[], "pontos":[]}');
        
        const backupUnificado = {
            notas: dadosNotas,
            rh: dadosRH
        };
        
        const blob = new Blob([JSON.stringify(backupUnificado)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup_geral_ks.json';
        a.click();
    }
};

const DriveAPI = {
    tokenClient: null, accessToken: null, backupFileId: null,
    init: function () {
        if (CLIENT_ID === 'COLE_AQUI_SEU_CLIENT_ID') return;
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID, scope: SCOPES,
            callback: (r) => { if (r && r.access_token) { this.accessToken = r.access_token; this.updateStatusUI(true); this.findBackupFileId(); } },
        });
    },
    handleAuthClick: function () {
        if (!this.tokenClient) { CustomModal.show('O Desenvolvedor precisa configurar o Google Cloud Client ID.'); return; }
        if (this.accessToken === null) this.tokenClient.requestAccessToken({ prompt: 'consent' });
    },
    updateStatusUI: function (isConnected) {
        if (isConnected) {
            document.getElementById('gdrive-status-text').innerText = "Status: Sincronizado";
            document.getElementById('gdrive-status-text').style.color = "var(--success-color)";
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

let itensNotaAtual = [];

const LogicaNegocio = {
    salvarProduto: function () {
        const db = DB.get();
        const codigoBase = document.getElementById('prod-codigo').value.trim();
        const nomeBase = document.getElementById('prod-nome').value.trim();
        const fornecedor = document.getElementById('prod-fornecedor').value.trim();
        const valVenda = parseFloat(document.getElementById('prod-val-venda').value);

        const varPintura = document.getElementById('var-pintura').checked;
        const varPolida = document.getElementById('var-polida').checked;

        if (db.produtos.find(p => p.codigo === codigoBase)) { CustomModal.show(`O código ${codigoBase} já existe!`); return; }

        let variacoesArray = ["Cromada"];
        if (varPintura) variacoesArray.push("Pintura");
        if (varPolida) variacoesArray.push("Polida");

        db.produtos.push({
            codigo: codigoBase,
            nome: nomeBase,
            fornecedor: fornecedor,
            valVenda: valVenda,
            variacoes: variacoesArray
        });

        DB.save(db);

        document.getElementById('prod-codigo').value = '';
        document.getElementById('var-pintura').checked = false;
        document.getElementById('var-polida').checked = false;
        document.getElementById('prod-codigo').focus();

        UI.renderTabelaProdutos();
        CustomModal.show(`Produto salvo com sucesso!`);
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

        const tr = document.getElementById(`tr-produto-${codigo}`);
        tr.innerHTML = `
            <td><input type="text" id="edit-prod-cod-${codigo}" value="${prod.codigo}"></td>
            <td>
                <input type="text" id="edit-prod-nome-${codigo}" value="${prod.nome}">
                <div>
                    <label><input type="checkbox" id="edit-prod-var-pintura-${codigo}" ${hasPintura}> Pintura</label>
                    <label><input type="checkbox" id="edit-prod-var-polida-${codigo}" ${hasPolida}> Polida</label>
                </div>
            </td>
            <td><select id="edit-prod-forn-${codigo}">${optionsForn}</select></td>
            <td><input type="number" id="edit-prod-val-${codigo}" value="${prod.valVenda}" step="0.01"></td>
            <td>
                <button onclick="LogicaNegocio.salvarEdicaoProduto('${codigo}')"><i data-lucide="check"></i></button>
                <button onclick="UI.renderTabelaProdutos()"><i data-lucide="x"></i></button>
            </td>
        `;
        lucide.createIcons();
    },

    salvarEdicaoProduto: function (codigoAntigo) {
        const novoCod = document.getElementById(`edit-prod-cod-${codigoAntigo}`).value.trim();
        const novoNome = document.getElementById(`edit-prod-nome-${codigoAntigo}`).value.trim();
        const novoForn = document.getElementById(`edit-prod-forn-${codigoAntigo}`).value.trim();
        const novoVal = parseFloat(document.getElementById(`edit-prod-val-${codigoAntigo}`).value);
        const varPintura = document.getElementById(`edit-prod-var-pintura-${codigoAntigo}`).checked;
        const varPolida = document.getElementById(`edit-prod-var-polida-${codigoAntigo}`).checked;

        const db = DB.get();
        const prodIndex = db.produtos.findIndex(p => p.codigo === codigoAntigo);
        if (prodIndex > -1) {
            let variacoesArray = ["Cromada"];
            if (varPintura) variacoesArray.push("Pintura");
            if (varPolida) variacoesArray.push("Polida");

            db.produtos[prodIndex] = { codigo: novoCod, nome: novoNome, fornecedor: novoForn, valVenda: novoVal, variacoes: variacoesArray };
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
        CustomModal.show('Confirma exclusão?', true, () => {
            const db = DB.get();
            db.clientes.splice(index, 1);
            DB.save(db);
            UI.renderTabelaClientes();
        });
    },

    autoPreencherItemNota: function () {
        const codigoInput = document.getElementById('nota-item-codigo').value;
        const prod = DB.get().produtos.find(p => p.codigo === codigoInput);
        const selectVariacao = document.getElementById('nota-item-variacao');
        selectVariacao.innerHTML = '';
        if (prod) {
            document.getElementById('nota-item-nome').value = prod.nome;
            document.getElementById('nota-item-valor').value = prod.valVenda;
            (prod.variacoes || ["Cromada"]).forEach(v => { selectVariacao.innerHTML += `<option value="${v}">${v}</option>`; });
        }
    },

    adicionarItemNota: function () {
        const codigo = document.getElementById('nota-item-codigo').value;
        const nomeBase = document.getElementById('nota-item-nome').value;
        const variacaoSelecionada = document.getElementById('nota-item-variacao').value;
        const valor = parseFloat(document.getElementById('nota-item-valor').value);
        const qtd = parseInt(document.getElementById('nota-item-qtd').value);
        const repeticoes = parseInt(document.getElementById('nota-item-repeticoes').value) || 1;

        const nomeFinalNaNota = `${nomeBase} - ${variacaoSelecionada}`;
        for (let i = 0; i < repeticoes; i++) {
            itensNotaAtual.push({ codigo: codigo, nome: nomeFinalNaNota, valor: valor, qtd: qtd, subtotal: valor * qtd });
        }

        UI.renderItensNota();
    },

    gerarEImprimirNota: function () {
        const clIndex = document.getElementById('nota-cliente').value;
        if (clIndex === "") { CustomModal.show('Selecione o Cliente.'); return; }
        if (itensNotaAtual.length === 0) { CustomModal.show('Nota vazia.'); return; }

        const cliente = DB.get().clientes[clIndex];
        const idNota = Math.floor(10000 + Math.random() * 90000).toString();
        
        // Lógica de Impressão aqui (igual ao script original)
        document.body.className = 'printing-nota';
        setTimeout(() => { window.print(); }, 500);
    }
};

const UI = {
    initData: function () {
        this.updateDashCards();
        this.renderTabelaProdutos();
        this.renderTabelaClientes();
        this.renderSelectClientes();
        this.renderSelectFornecedorProduto();
        this.renderSelectsFornecedoresTabelas();
    },
    switchTab: function (tabId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`button[onclick="UI.switchTab('${tabId}')"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        document.body.className = '';
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
            tbody.innerHTML += `<tr><td>${p.codigo}</td><td>${p.nome}</td><td>${p.fornecedor || '-'}</td><td>R$ ${p.valVenda.toFixed(2)}</td><td><button onclick="LogicaNegocio.iniciarEdicaoProduto('${p.codigo}')"><i data-lucide="pencil"></i></button></td></tr>`;
        });
        lucide.createIcons();
    },
    renderSelectClientes: function () {
        const select = document.getElementById('nota-cliente');
        select.innerHTML = '<option value="">-- Selecione --</option>';
        DB.get().clientes.forEach((c, i) => select.innerHTML += `<option value="${i}">${c.nome}</option>`);
    },
    renderItensNota: function () {
        const tbody = document.getElementById('lista-itens-nota');
        tbody.innerHTML = '';
        let total = 0;
        itensNotaAtual.forEach((item, i) => {
            total += item.subtotal;
            tbody.innerHTML += `<tr><td>${item.codigo}</td><td>${item.nome}</td><td>R$ ${item.valor.toFixed(2)}</td><td>${item.qtd}</td><td>R$ ${item.subtotal.toFixed(2)}</td></tr>`;
        });
        document.getElementById('nota-total-display').innerText = `R$ ${total.toFixed(2)}`;
    },
    renderSelectsFornecedoresTabelas: function () { /* Lógica original */ },
    renderSelectFornecedorProduto: function () { /* Lógica original */ },
    renderTabelaClientes: function () { /* Lógica original */ }
};

window.onload = function () {
    UI.initData();
    setTimeout(() => { if (window.google) DriveAPI.init(); }, 1000);
};
