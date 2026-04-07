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
    KEY_RH: 'ks_rh_dados', 
    
    get: function () {
        const data = localStorage.getItem(this.KEY);
        return data ? JSON.parse(data) : { produtos: [], clientes: [] };
    },
    save: function (data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
        
        // Backup Unificado (Notas + RH)
        const dadosRHRaw = localStorage.getItem(this.KEY_RH);
        const backupUnificado = {
            notas: data,
            rh: dadosRHRaw ? JSON.parse(dadosRHRaw) : { funcionarios: [], pontos: [], descontosFechamento: [] }
        };

        if (document.getElementById('dash-prod-count')) {
            UI.updateDashCards();
        }
        if (document.getElementById('tabela-fornecedor')) {
            UI.renderSelectsFornecedoresTabelas();
        }
        
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
        CustomModal.show(`Produto salvo com sucesso! Variações ativas: ${variacoesArray.join(', ')}`);
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
            <td><input type="text" id="edit-prod-cod-${codigo}" value="${prod.codigo}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td>
                <input type="text" id="edit-prod-nome-${codigo}" value="${prod.nome}" style="width: 100%; margin: 0 0 4px 0; padding: 4px; font-size: 12px;">
                <div style="display: flex; gap: 10px; font-size: 10px; color: var(--text-main); align-items: center;">
                    <label style="display: flex; align-items: center; gap: 4px; margin: 0;"><input type="checkbox" id="edit-prod-var-pintura-${codigo}" ${hasPintura} style="width: 12px; height: 12px; margin: 0;"> Pintura</label>
                    <label style="display: flex; align-items: center; gap: 4px; margin: 0;"><input type="checkbox" id="edit-prod-var-polida-${codigo}" ${hasPolida} style="width: 12px; height: 12px; margin: 0;"> Polida</label>
                </div>
            </td>
            <td><select id="edit-prod-forn-${codigo}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;">${optionsForn}</select></td>
            <td><input type="number" id="edit-prod-val-${codigo}" value="${prod.valVenda}" step="0.01" style="width: 70px; margin: 0; padding: 4px; font-size: 12px;"></td>
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
        const cod = document.getElementById('busca-codigo').value;
        const prod = DB.get().produtos.find(p => p.codigo === cod);
        const div = document.getElementById('busca-resultado');
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

    autoPreencherItemNota: function () {
        const codigoInput = document.getElementById('nota-item-codigo').value;
        const prod = DB.get().produtos.find(p => p.codigo === codigoInput);
        const selectVariacao = document.getElementById('nota-item-variacao');

        selectVariacao.innerHTML = '';

        if (prod) {
            document.getElementById('nota-item-nome').value = prod.nome;
            document.getElementById('nota-item-valor').value = prod.valVenda;

            const variacoesDaPeca = prod.variacoes || ["Cromada"];
            variacoesDaPeca.forEach(v => {
                selectVariacao.innerHTML += `<option value="${v}">${v}</option>`;
            });
        } else {
            document.getElementById('nota-item-nome').value = '';
            document.getElementById('nota-item-valor').value = '';
            selectVariacao.innerHTML = '<option value="">--</option>';
        }
    },

    adicionarItemNota: function () {
        if (document.getElementById('nota-item-codigo').value && !document.getElementById('nota-item-nome').value) {
            this.autoPreencherItemNota();
        }

        const codigo = document.getElementById('nota-item-codigo').value;
        const nomeBase = document.getElementById('nota-item-nome').value;
        const variacaoSelecionada = document.getElementById('nota-item-variacao').value;
        const valor = parseFloat(document.getElementById('nota-item-valor').value);

        const qtd = parseInt(document.getElementById('nota-item-qtd').value);
        const perca = parseInt(document.getElementById('nota-item-perca').value) || 0;
        const repeticoes = parseInt(document.getElementById('nota-item-repeticoes').value) || 1;

        if (!codigo || !nomeBase || !variacaoSelecionada || isNaN(valor) || isNaN(qtd) || qtd < 1) {
            CustomModal.show('Verifique os dados do item. O código digitado precisa ser válido.');
            return;
        }

        const nomeFinalNaNota = `${nomeBase} - ${variacaoSelecionada}`;

        for (let i = 0; i < repeticoes; i++) {
            itensNotaAtual.push({
                codigo: codigo,
                nome: nomeFinalNaNota,
                valor: valor,
                qtd: qtd,
                perca: perca,
                subtotal: valor * qtd
            });
        }

        document.getElementById('nota-item-codigo').value = '';
        document.getElementById('nota-item-nome').value = '';
        document.getElementById('nota-item-valor').value = '';
        document.getElementById('nota-item-qtd').value = '1';
        document.getElementById('nota-item-perca').value = '0';
        document.getElementById('nota-item-repeticoes').value = '1';
        document.getElementById('nota-item-variacao').innerHTML = '<option value="">--</option>';

        UI.renderItensNota();
        document.getElementById('nota-item-codigo').focus();
    },

    removerItemNota: function (index) {
        itensNotaAtual.splice(index, 1);
        UI.renderItensNota();
    },

    limparNota: function () {
        CustomModal.show('Deseja realmente apagar todos os itens desta nota e começar de novo?', true, () => {
            itensNotaAtual = [];
            UI.renderItensNota();
            document.getElementById('nota-cliente').value = '';
            CustomModal.show('Nota limpa com sucesso!');
        });
    },

    gerarEImprimirNota: function () {
        const codigoPendente = document.getElementById('nota-item-codigo').value;
        if (codigoPendente.trim() !== "") {
            CustomModal.show('ATENÇÃO: Você digitou um código no campo (' + codigoPendente + ') mas esqueceu de clicar em Adicionar. Por favor, adicione antes de gerar a nota!');
            return;
        }

        const clIndex = document.getElementById('nota-cliente').value;
        if (clIndex === "") { CustomModal.show('Selecione o Destinatário/Cliente da lista.'); return; }

        if (itensNotaAtual.length === 0) {
            CustomModal.show('Sua nota está vazia. Adicione os itens na tabela antes de Imprimir!');
            return;
        }

        const cliente = DB.get().clientes[clIndex];
        const idNota = Math.floor(10000 + Math.random() * 90000).toString();
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const total = itensNotaAtual.reduce((acc, item) => acc + item.subtotal, 0);

        const generateVia = (viaName) => `
            <div style="border: 2px solid black; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; font-family: Arial, sans-serif; color: black; background: white;">
                
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid black; padding: 4px 8px; font-size: 10px; font-weight: bold; color: black;">
                    <span>${viaName}</span>
                    <span>DOCUMENTO AUXILIAR</span>
                    <span></span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 2px solid black;">
                    <div>
                        <div style="font-size: 24px; font-weight: bold; letter-spacing: 0.5px; color: black;">KS Afinações</div>
                        <div style="font-size: 11px; color: #333; margin-top: 2px;">Metais Sanitários</div>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: black;">
                        <div style="margin-bottom: 4px;">N.º <span style="font-weight: bold; font-size: 14px; color: black;">${idNota}</span></div>
                        <div>Data: ${dataAtual}</div>
                    </div>
                </div>

                <div style="display: flex; border-bottom: 2px solid black; font-size: 10px; color: black;">
                    <div style="flex: 1; border-right: 2px solid black; padding: 0;">
                        <div style="text-align: center; font-weight: bold; border-bottom: 1px solid black; padding: 4px 0; background: transparent;">KS Afinações</div>
                        <table style="width: 100%; font-size: 10px; border-collapse: collapse; color: black;">
                            <tr><td style="width: 55px; padding: 3px 6px;">Endereço:</td><td style="padding: 3px 6px;">KS Afinações, Loanda - PR, 87900-000</td></tr>
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
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: black;">
                        <thead>
                            <tr>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 12%; color: black;">CÓDIGO</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 40%; color: black;">PRODUTO</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 8%; color: black;">QTD</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 10%; color: black;">PERCA</th>
                                <th style="border-right: 1px solid black; border-bottom: 2px solid black; padding: 4px; text-align: center; width: 15%; color: black;">VAL. UNIT.</th>
                                <th style="border-bottom: 2px solid black; padding: 4px; text-align: center; width: 15%; color: black;">VAL. TOTAL</th>
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

                <div style="display: flex; min-height: 150px;">
                    <div style="flex: 6; border-right: 1px solid black; padding: 12px 15px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
                        <div style="text-align: center; margin-bottom: 6px; font-size: 11px; color: black;">
                            Dúvidas sobre o pedido? Contacte <strong>(44) 9 9828-8914</strong>
                        </div>
                        <div style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 45px; color: black;">
                            OBRIGADO PELA CONFIANÇA!
                        </div>
                        <div style="border-top: 1px solid black; width: 85%; padding-top: 6px; text-align: center; font-size: 12px; color: black;">
                            Assinatura Cliente
                        </div>
                    </div>
                    <div style="flex: 4; display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; font-size: 18px; font-weight: bold; color: black;">
                        <span>TOTAL:</span>
                        <span>R$ ${total.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('print-top').innerHTML = generateVia("1ª VIA");
        document.getElementById('print-bottom').innerHTML = generateVia("2ª VIA");

        const tituloOriginal = document.title;
        document.title = idNota;

        document.body.className = 'printing-nota';

        setTimeout(() => {
            window.print();
        }, 500);
    }
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
                    const precoNovo = precoAntigo * (1 + (porcentagem / 100));
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
    },
    switchTab: function (tabId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`button[onclick="UI.switchTab('${tabId}')"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');

        document.body.className = '';
        document.title = "Gestão - KS Afinações";
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
                <td>R$ ${p.valVenda.toFixed(2)}</td>
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
            tbody.innerHTML += `<tr>
                <td>${item.codigo}</td>
                <td>${item.nome}</td>
                <td>R$ ${item.valor.toFixed(2)}</td>
                <td>${item.qtd}</td>
                <td style="color: var(--text-main); font-weight: ${item.perca > 0 ? 'bold' : 'normal'};">${item.perca > 0 ? item.perca : '-'}</td>
                <td>R$ ${item.subtotal.toFixed(2)}</td>
                <td><button class="btn-danger" onclick="LogicaNegocio.removerItemNota(${i})"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button></td>
            </tr>`;
        });
        document.getElementById('nota-total-display').innerText = `R$ ${total.toFixed(2)}`;
        lucide.createIcons();
    }
};

document.addEventListener("DOMContentLoaded", function () {
    UI.initData();
    setTimeout(() => { if (window.google) DriveAPI.init(); }, 1000);
});
