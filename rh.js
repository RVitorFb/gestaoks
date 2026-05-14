// Inicializa ícones na carga inicial
lucide.createIcons();

let sugestaoIndexProdRH = -1;

const RHDb = {
    KEY: 'ks_rh_dados',
    get: function () {
        const data = localStorage.getItem(this.KEY);
        const parsed = data ? JSON.parse(data) : {
            funcionarios: [],
            pontos: [],
            lancamentosProducao: [],
            turnos: [], // <- NOVO
            cargos: []  // <- NOVO
        };
        if (!parsed.descontosFechamento) parsed.descontosFechamento = [];
        if (!parsed.lancamentosProducao) parsed.lancamentosProducao = [];
        if (!parsed.turnos) parsed.turnos = []; // <- NOVO
        if (!parsed.cargos) parsed.cargos = []; // <- NOVO
        return parsed;
    },
    save: function (data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
        // Aciona o backup se ele existir no script local
        if (typeof DB !== 'undefined' && DB.save) {
            const dadosNotas = DB.get();
            DB.save(dadosNotas);
        }
    }
};

const ModalRH = {
    keydownListener: null,

    show: function (title, message, type = 'alert', onConfirm = null, onCancel = null) {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;

        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        const isConfirm = type === 'confirm';
        btnCancel.style.display = isConfirm ? 'inline-block' : 'none';

        btnConfirm.onclick = () => {
            this.hide();
            if (onConfirm) onConfirm();
        };

        btnCancel.onclick = () => {
            this.hide();
            if (onCancel) onCancel(); // Isso permite o botão cancelar fazer ações!
        };

        modal.style.display = 'flex';
        btnConfirm.focus();

        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
        }

        this.keydownListener = (e) => {
            if (modal.style.display === 'flex') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (document.activeElement === btnCancel) {
                        btnCancel.click();
                    } else {
                        btnConfirm.click();
                    }
                }
                else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (isConfirm) {
                        btnCancel.click();
                    } else {
                        btnConfirm.click();
                    }
                }
                else if (isConfirm && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    e.preventDefault();
                    if (document.activeElement === btnConfirm) {
                        btnCancel.focus();
                    } else {
                        btnConfirm.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', this.keydownListener);
    },

    promptEdicaoHoras: function (title, horasIniciais, onConfirm) {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;

        const h = horasIniciais || ['', '', '', ''];

        // Desenha a tela exatamente como nas suas fotos (Grid com 4 campos separados)
        document.getElementById('modal-message').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; margin-top: 10px;">
                <div>
                    <label style="color: var(--text-muted); font-size: 12px; font-weight: bold;">Entrada 1</label>
                    <input type="time" id="edit-e1" value="${h[0]}" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; outline: none; font-size: 16px; margin-top: 4px;">
                </div>
                <div>
                    <label style="color: var(--text-muted); font-size: 12px; font-weight: bold;">Saída 1</label>
                    <input type="time" id="edit-s1" value="${h[1]}" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; outline: none; font-size: 16px; margin-top: 4px;">
                </div>
                <div>
                    <label style="color: var(--text-muted); font-size: 12px; font-weight: bold;">Entrada 2</label>
                    <input type="time" id="edit-e2" value="${h[2]}" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; outline: none; font-size: 16px; margin-top: 4px;">
                </div>
                <div>
                    <label style="color: var(--text-muted); font-size: 12px; font-weight: bold;">Saída 2</label>
                    <input type="time" id="edit-s2" value="${h[3]}" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; outline: none; font-size: 16px; margin-top: 4px;">
                </div>
            </div>
        `;

        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        btnCancel.style.display = 'inline-block';

        btnConfirm.onclick = () => {
            const val = [
                document.getElementById('edit-e1').value,
                document.getElementById('edit-s1').value,
                document.getElementById('edit-e2').value,
                document.getElementById('edit-s2').value
            ];
            this.hide();
            document.getElementById('modal-message').innerHTML = '';
            if (onConfirm) onConfirm(val);
        };

        btnCancel.onclick = () => {
            this.hide();
            document.getElementById('modal-message').innerHTML = '';
        };

        modal.style.display = 'flex';

        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
        }

        this.keydownListener = (e) => {
            if (modal.style.display === 'flex') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btnConfirm.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    btnCancel.click();
                }
            }
        };
        document.addEventListener('keydown', this.keydownListener);
    },

    hide: function () {
        document.getElementById('custom-modal').style.display = 'none';
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
            this.keydownListener = null;
        }
    }
};

const RH_UI = {
    switchTab: function (tabId) {
        // As novas abas incluídas aqui
        const tabs = ['equipe', 'producao', 'fechamento', 'turnos', 'cargos', 'empreita', 'arquivo'];
        tabs.forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if (el) el.classList.remove('active');
        });
        const activeEl = document.getElementById(`tab-${tabId}`);
        if (activeEl) activeEl.classList.add('active');

        const btns = document.querySelectorAll('.nav-btn');
        btns.forEach(b => b.classList.remove('active'));
        const eventBtn = event ? event.currentTarget : null;
        if (eventBtn && eventBtn.tagName === 'BUTTON') eventBtn.classList.add('active');

        // Carregar dados de acordo com a aba
        if (tabId === 'equipe') {
            RH.renderTabelaFuncionarios();
            RH.popularSelectCargos();
        }
        if (tabId === 'producao') RH.renderTabelaProducao();
        if (tabId === 'fechamento') RH.renderSelectFechamento(); // <-- NOME CORRIGIDO AQUI
        if (tabId === 'turnos') RH_Turnos.renderTabela();
        if (tabId === 'cargos') {
            RH_Cargos.renderTabela();
            RH_Cargos.popularSelectsTurnos();
        }
    }
};

const RH = {

    renderSelectFuncProducao: function () {
        const db = RHDb.get();
        const funcs = db.funcionarios.filter(f => f.tipo === 'Produção');
        document.getElementById('prod-id-func').innerHTML = funcs.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    },

    navegarSugestoesProducao: function (event) {
        if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) return;

        const lista = document.getElementById('sugestoes-pecas-rh');

        if (!lista || lista.style.display === 'none') {
            if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                this.selecionarPrimeiraPeca();
            }
            return;
        }

        const items = lista.getElementsByTagName('li');
        if (items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            sugestaoIndexProdRH++;
            if (sugestaoIndexProdRH >= items.length) sugestaoIndexProdRH = 0;
            this.atualizarSelecaoVisualProducao(items, sugestaoIndexProdRH);
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            sugestaoIndexProdRH--;
            if (sugestaoIndexProdRH < 0) sugestaoIndexProdRH = items.length - 1;
            this.atualizarSelecaoVisualProducao(items, sugestaoIndexProdRH);
        }
        else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            if (sugestaoIndexProdRH >= 0 && sugestaoIndexProdRH < items.length) {
                items[sugestaoIndexProdRH].click();
            } else {
                this.selecionarPrimeiraPeca();
            }
        }
    },

    atualizarSelecaoVisualProducao: function (items, indexAtual) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('selecionado');
        }
        if (indexAtual >= 0 && indexAtual < items.length) {
            const selecionado = items[indexAtual];
            selecionado.classList.add('selecionado');
            selecionado.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    filtrarPecasProducao: function (event) {
        if (event && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) return;

        sugestaoIndexProdRH = -1;

        const input = document.getElementById('prod-peca-codigo');
        const termo = input.value.trim().toLowerCase();
        const lista = document.getElementById('sugestoes-pecas-rh');
        const dadosERP = JSON.parse(localStorage.getItem('ks_afinacoes_dados')) || { produtos: [] };

        if (!termo) { lista.style.display = 'none'; return; }

        const filtrados = dadosERP.produtos.filter(p => String(p.codigo).toLowerCase().startsWith(termo));

        if (filtrados.length > 0) {
            lista.innerHTML = '';
            filtrados.forEach((prod, index) => {
                const li = document.createElement('li');
                li.innerText = `${prod.codigo} - ${prod.nome}`;
                li.className = 'sugestao-item';
                li.dataset.codigo = prod.codigo;

                const regex = new RegExp(`^(${termo})`, "i");
                li.innerHTML = li.innerText.replace(regex, "<strong>$1</strong>");

                li.onmouseenter = () => {
                    sugestaoIndexProdRH = index;
                    this.atualizarSelecaoVisualProducao(lista.getElementsByTagName('li'), index);
                };

                li.onclick = () => {
                    this.selecionarPecaProducao(prod.codigo);
                };
                lista.appendChild(li);
            });
            lista.style.display = 'block';
        } else {
            lista.style.display = 'none';
        }
    },

    selecionarPrimeiraPeca: function () {
        const lista = document.getElementById('sugestoes-pecas-rh');
        if (lista.style.display === 'block' && lista.firstChild) {
            this.selecionarPecaProducao(lista.firstChild.dataset.codigo);
        }
    },

    selecionarPecaProducao: function (codigo) {
        document.getElementById('prod-peca-codigo').value = codigo;
        document.getElementById('sugestoes-pecas-rh').style.display = 'none';
        document.getElementById('prod-qtd').focus();
    },

    salvarLancamentoProducao: function () {
        const idFunc = document.getElementById('prod-id-func').value;
        const data = document.getElementById('prod-data').value;
        const codigo = document.getElementById('prod-peca-codigo').value;
        const qtd = parseInt(document.getElementById('prod-qtd').value);
        const caixas = parseInt(document.getElementById('prod-caixas').value) || 1; // Puxa a quantidade de caixas

        if (!idFunc) { ModalRH.show('Erro', 'Selecione um funcionário de Produção primeiro.'); return; }

        const dadosERP = JSON.parse(localStorage.getItem('ks_afinacoes_dados')) || { produtos: [] };
        const peca = dadosERP.produtos.find(p => String(p.codigo) === String(codigo));

        if (!peca) { ModalRH.show('Erro', 'Peça não encontrada no cadastro do sistema ERP.'); return; }

        const db = RHDb.get();

        // Loop para registrar cada caixa como uma linha separada no histórico
        for (let i = 0; i < caixas; i++) {
            db.lancamentosProducao.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // ID único gerado para não dar conflito
                idFunc,
                data,
                pecaNome: peca.nome,
                pecaCodigo: peca.codigo,
                valorUnit: peca.valProducao || 0,
                qtd,
                total: (peca.valProducao || 0) * qtd
            });
        }

        RHDb.save(db);

        // Limpa os campos para o próximo lançamento
        document.getElementById('prod-peca-codigo').value = '';
        document.getElementById('prod-qtd').value = '';
        document.getElementById('prod-caixas').value = '1';

        this.renderTabelaProducao();
        ModalRH.show('Sucesso', `${caixas} caixa(s) registrada(s) com sucesso!`);
    },

    renderTabelaProducao: function () {
        const db = RHDb.get();
        const tbody = document.querySelector('#tabela-revisao-producao tbody');
        if (!tbody) return;

        // Puxa o valor do mês selecionado no filtro
        const filtroMes = document.getElementById('filtro-mes-producao') ? document.getElementById('filtro-mes-producao').value : '';

        let logs = [...db.lancamentosProducao];
        if (filtroMes) {
            logs = logs.filter(l => l.data.startsWith(filtroMes));
        }

        logs.sort((a, b) => new Date(b.data) - new Date(a.data));

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 15px;">Nenhum lançamento registrado para este mês.</td></tr>`;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = logs.map(l => {
            const f = db.funcionarios.find(func => func.id === l.idFunc);
            return `<tr>
             <td>${l.data.split('-').reverse().join('/')}</td>
             <td>${f ? f.nome : 'Excluído'}</td>
             <td>${l.pecaCodigo} - ${l.pecaNome}</td>
             <td>${l.qtd}</td>
             <td>R$ ${l.valorUnit.toFixed(2).replace('.', ',')}</td>
             <td style="color:var(--success-color); font-weight:bold;">R$ ${l.total.toFixed(2).replace('.', ',')}</td>
             <td>
                 <div style="display: flex; gap: 8px; align-items: center;">
                     <button onclick="RH.iniciarEdicaoLancamento('${l.id}')" style="background: transparent; border: none; cursor: pointer; color: #eab308; padding: 0;" title="Editar"><i data-lucide="pencil" style="width: 14px;"></i></button>
                     <button class="btn-danger" onclick="RH.excluirLancamentoProducao('${l.id}')" style="padding:4px;" title="Excluir"><i data-lucide="trash-2" style="width:14px;"></i></button>
                 </div>
             </td>
         </tr>`;
        }).join('');
        lucide.createIcons();
    },

    excluirLancamentoProducao: function (id) {
        ModalRH.show('Excluir', 'Deseja remover este registro de produção?', 'confirm', () => {
            const db = RHDb.get();
            db.lancamentosProducao = db.lancamentosProducao.filter(l => l.id !== id);
            RHDb.save(db);
            this.renderTabelaProducao();
        });
    },

    iniciarEdicaoLancamento: function (id) {
        const db = RHDb.get();
        const l = db.lancamentosProducao.find(log => log.id === id);
        if (!l) return;

        const funcs = db.funcionarios.filter(f => f.tipo === 'Produção');
        let optionsFunc = '';
        funcs.forEach(f => {
            let selected = (f.id === l.idFunc) ? 'selected' : '';
            optionsFunc += `<option value="${f.id}" ${selected}>${f.nome}</option>`;
        });

        const funcOriginal = db.funcionarios.find(f => f.id === l.idFunc);
        if (!funcOriginal) {
            optionsFunc += `<option value="${l.idFunc}" selected>Excluído</option>`;
        }

        const tbody = document.querySelector('#tabela-revisao-producao tbody');

        // Aplica o filtro de mês também na hora de montar a edição
        const filtroMes = document.getElementById('filtro-mes-producao') ? document.getElementById('filtro-mes-producao').value : '';
        let logs = [...db.lancamentosProducao];
        if (filtroMes) logs = logs.filter(lg => lg.data.startsWith(filtroMes));

        logs.sort((a, b) => new Date(b.data) - new Date(a.data));

        tbody.innerHTML = logs.map(log => {
            if (log.id === id) {
                return `<tr style="background-color: rgba(234, 179, 8, 0.1);">
                    <td><input type="date" id="edit-prod-data-${id}" value="${log.data}" style="width:100%; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"></td>
                    <td><select id="edit-prod-func-${id}" style="width:100%; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;">${optionsFunc}</select></td>
                    <td>${log.pecaCodigo} - ${log.pecaNome}</td>
                    <td><input type="number" id="edit-prod-qtd-${id}" value="${log.qtd}" min="1" style="width:60px; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"></td>
                    <td>R$ ${log.valorUnit.toFixed(2).replace('.', ',')}</td>
                    <td style="color:var(--success-color); font-weight:bold;">R$ ${(log.qtd * log.valorUnit).toFixed(2).replace('.', ',')}</td>
                    <td>
                        <div style="display: flex; gap: 4px;">
                            <button onclick="RH.salvarEdicaoLancamento('${id}')" style="background: #10b981; border: none; color: #fff; padding: 6px; border-radius:4px; cursor:pointer;" title="Salvar"><i data-lucide="check" style="width: 14px;"></i></button>
                            <button onclick="RH.renderTabelaProducao()" style="background: #ef4444; border: none; color: #fff; padding: 6px; border-radius:4px; cursor:pointer;" title="Cancelar"><i data-lucide="x" style="width: 14px;"></i></button>
                        </div>
                    </td>
                </tr>`;
            } else {
                const f = db.funcionarios.find(func => func.id === log.idFunc);
                return `<tr>
                    <td>${log.data.split('-').reverse().join('/')}</td>
                    <td>${f ? f.nome : 'Excluído'}</td>
                    <td>${log.pecaCodigo} - ${log.pecaNome}</td>
                    <td>${log.qtd}</td>
                    <td>R$ ${log.valorUnit.toFixed(2).replace('.', ',')}</td>
                    <td style="color:var(--success-color); font-weight:bold;">R$ ${log.total.toFixed(2).replace('.', ',')}</td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button onclick="RH.iniciarEdicaoLancamento('${log.id}')" style="background: transparent; border: none; cursor: pointer; color: #eab308; padding: 0;" title="Editar"><i data-lucide="pencil" style="width: 14px;"></i></button>
                            <button class="btn-danger" onclick="RH.excluirLancamentoProducao('${log.id}')" style="padding:4px;" title="Excluir"><i data-lucide="trash-2" style="width:14px;"></i></button>
                        </div>
                    </td>
                </tr>`;
            }
        }).join('');
        lucide.createIcons();
    },

    salvarEdicaoLancamento: function (id) {
        const data = document.getElementById(`edit-prod-data-${id}`).value;
        const idFunc = document.getElementById(`edit-prod-func-${id}`).value;
        const qtd = parseInt(document.getElementById(`edit-prod-qtd-${id}`).value);

        if (!data || isNaN(qtd) || qtd < 1) {
            ModalRH.show('Aviso', 'Preencha a data e uma quantidade válida.');
            return;
        }

        const db = RHDb.get();
        const lIndex = db.lancamentosProducao.findIndex(log => log.id === id);

        if (lIndex > -1) {
            db.lancamentosProducao[lIndex].data = data;
            db.lancamentosProducao[lIndex].idFunc = idFunc;
            db.lancamentosProducao[lIndex].qtd = qtd;
            // Recalcula o total baseado na nova quantidade e no valor unitário existente
            db.lancamentosProducao[lIndex].total = db.lancamentosProducao[lIndex].valorUnit * qtd;

            RHDb.save(db);
            this.renderTabelaProducao();
        }
    },

    init: function () {
        this.renderTabelaFuncionarios();
        this.renderSelectFechamento();
        this.renderSelectFuncProducao();
        this.renderTabelaFuncionarios();
        this.renderSelectFechamento();
        this.renderSelectFuncProducao();

        RH_Empreita.toggleCampos();
        RH_Empreita.renderTabela();

        const hoje = new Date();
        document.getElementById('fechamento-mes').value = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;

        const campoFiltroProd = document.getElementById('filtro-mes-producao');
        if (campoFiltroProd) campoFiltroProd.value = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;

        const campoFiltroMes = document.getElementById('filtro-hist-mes');
        if (campoFiltroMes) campoFiltroMes.value = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;

        // Puxa a data atual por padrão no lançamento de produção
        const campoDataProd = document.getElementById('prod-data');
        if (campoDataProd) {
            const dataLocal = new Date(hoje.getTime() - (hoje.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            campoDataProd.value = dataLocal;
        }
    },

    toggleCamposFuncionario: function () {
        const tipo = document.getElementById('func-tipo').value;
        const divCargo = document.getElementById('div-func-cargo');
        const divSalario = document.getElementById('div-func-salario');

        if (tipo === 'Mensalista') {
            divCargo.style.display = 'block';
            divSalario.style.display = 'block';
            document.getElementById('func-cargo').required = true;
            document.getElementById('func-salario').required = true;
        } else {
            divCargo.style.display = 'none';
            divSalario.style.display = 'none';
            document.getElementById('func-cargo').required = false;
            document.getElementById('func-salario').required = false;
        }
    },

    popularSelectCargos: function () {
        const db = RHDb.get();
        const sel = document.getElementById('func-cargo');
        if (!sel) return;

        const val = sel.value;
        sel.innerHTML = `<option value="">-- Selecione o Cargo --</option>` +
            db.cargos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        sel.value = val;
    },

    salvarFuncionario: function () {
        const id = document.getElementById('func-id').value;
        const nome = document.getElementById('func-nome').value.trim();
        const admissao = document.getElementById('func-admissao').value;
        const tipo = document.getElementById('func-tipo').value;

        const cargoId = tipo === 'Mensalista' ? document.getElementById('func-cargo').value : null;
        const salarioBase = tipo === 'Mensalista' ? parseFloat(document.getElementById('func-salario').value) : 0;

        if (!nome || !admissao) {
            ModalRH.show('Erro', 'Preencha os campos obrigatórios.');
            return;
        }

        const db = RHDb.get();
        const funcObj = {
            id: id || 'F_' + Date.now(),
            nome,
            admissao,
            tipo,
            cargoId,
            salarioBase,
            status: 'Ativo'
        };

        if (id) {
            const index = db.funcionarios.findIndex(f => f.id === id);
            if (index > -1) db.funcionarios[index] = funcObj;
        } else {
            db.funcionarios.push(funcObj);
        }

        RHDb.save(db);
        document.getElementById('form-func').reset();
        document.getElementById('func-id').value = '';
        this.toggleCamposFuncionario();
        this.renderTabelaFuncionarios();
        this.renderSelectFechamento();   // <-- NOME CORRIGIDO AQUI
        this.renderSelectFuncProducao(); // <-- NOME CORRIGIDO AQUI
    },

    renderTabelaFuncionarios: function () {
        const db = RHDb.get();
        const tbody = document.querySelector('#tabela-funcionarios tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        db.funcionarios.forEach(f => {
            const dataBr = f.admissao.split('-').reverse().join('/');

            // Busca o nome do cargo para exibir na tabela
            let cargoNome = '-';
            if (f.cargoId) {
                const c = db.cargos.find(cargo => cargo.id === f.cargoId);
                if (c) cargoNome = c.nome;
            }

            const salarioFormat = f.tipo === 'Mensalista' ? `R$ ${f.salarioBase.toFixed(2)}` : '-';

            tbody.innerHTML += `<tr>
                <td><strong>${f.nome}</strong></td>
                <td>${dataBr}</td>
                <td><span style="background:var(--surface-hover); padding:2px 8px; border-radius:4px; font-size:12px;">${f.tipo}</span></td>
                <td>${cargoNome}</td>
                <td>${salarioFormat}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button onclick="RH.editarFuncionario('${f.id}')" style="background:transparent; border:none; cursor:pointer; color:var(--primary-color);" title="Editar"><i data-lucide="pencil" style="width:14px;"></i></button>
                        <button class="btn-danger" onclick="RH.excluirFuncionario('${f.id}')" style="padding:4px;" title="Excluir"><i data-lucide="trash-2" style="width:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        });
        lucide.createIcons();
    },

    editarFuncionario: function (id) {
        const db = RHDb.get();
        const f = db.funcionarios.find(x => x.id === id);
        if (f) {
            document.getElementById('func-id').value = f.id;
            document.getElementById('func-nome').value = f.nome;
            document.getElementById('func-admissao').value = f.admissao;
            document.getElementById('func-tipo').value = f.tipo;

            this.toggleCamposFuncionario(); // Atualiza a visibilidade primeiro

            if (f.tipo === 'Mensalista') {
                document.getElementById('func-cargo').value = f.cargoId || '';
                document.getElementById('func-salario').value = f.salarioBase || 0;
            }
        }
    },

    excluirFuncionario: function (id) {
        ModalRH.show('Atenção', 'Remover este funcionário?', 'confirm', () => {
            const db = RHDb.get();
            db.funcionarios = db.funcionarios.filter(f => f.id !== id);
            RHDb.save(db);
            this.renderTabelaFuncionarios();
        });
    },

    renderSelectFechamento: function () {
        const db = RHDb.get();
        document.getElementById('fechamento-func').innerHTML = '<option value="">Selecione</option>' + db.funcionarios.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    },

    importarDadosRelogio: function () {
        const fileInput = document.getElementById('import-relogio-file');
        const file = fileInput.files[0];

        if (!file) {
            ModalRH.show('Aviso', 'Por favor, selecione o arquivo gerado pelo relógio primeiro.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            try {
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

                if (!jsonData || jsonData.length < 5) {
                    ModalRH.show('Erro', 'Formato de arquivo não reconhecido.');
                    return;
                }

                ModalRH.show('Confirmar Importação', `Deseja importar as horas deste arquivo?`, 'confirm', () => {
                    const db = RHDb.get();
                    let pontosAdicionados = 0;

                    let currentFunc = null;
                    let currentMesAno = null;
                    let anoStr = null;
                    let mesStr = null;
                    let naoEncontrados = new Set();

                    // NOVO: MAPEIA OS DIAS QUE JÁ TÊM PONTO NO SISTEMA ANTES DE IMPORTAR
                    const diasExistentes = new Set();
                    db.pontos.forEach(p => {
                        const diaIso = p.entrada.split('T')[0];
                        diasExistentes.add(`${p.idFunc}_${diaIso}`);
                    });

                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i] || [];

                        for (let cell of row) {
                            const cellStr = String(cell || '').trim();

                            if (cellStr.toLowerCase().match(/^(nome|funcion[aá]rio|empregado|colaborador):/)) {
                                let rawName = cellStr.replace(/^(nome|funcion[aá]rio|empregado|colaborador):\s*/i, '');
                                rawName = rawName.replace(/^\d+\s*-\s*/, '');
                                const match = rawName.match(/(.+?)(?=\s+Pis:|\s+CTPS:|\s+ID:|$)/i);
                                if (match) {
                                    const nomeRelogio = match[1].trim();
                                    currentFunc = db.funcionarios.find(f => f.nome.toLowerCase() === nomeRelogio.toLowerCase());
                                    if (!currentFunc) naoEncontrados.add(nomeRelogio);
                                }
                            }

                            if (cellStr.toLowerCase().match(/^(data|per[ií]odo|periodo):/)) {
                                const match1 = cellStr.match(/(?:Data|Per[ií]odo|Periodo):\s*(\d{2})\.(\d{2})\.(\d{2})/i);
                                const match2 = cellStr.match(/(?:Data|Per[ií]odo|Periodo):\s*(?:\d{2}\/\d{2}\/\d{4}\s*a\s*)?\d{2}\/(\d{2})\/(\d{4})/i);

                                if (match1) {
                                    anoStr = "20" + match1[1];
                                    mesStr = match1[2];
                                    currentMesAno = `${anoStr}-${mesStr}`;
                                } else if (match2) {
                                    mesStr = match2[1];
                                    anoStr = match2[2];
                                    currentMesAno = `${anoStr}-${mesStr}`;
                                }
                            }
                        }

                        const col0 = String(row[0] || '').trim();
                        const col8 = String(row[8] || '').trim();

                        if ((/^\d{2}[\.\/]\d{2}(\/\d{4})?$/.test(col0) || /^\d{2}[\.\/]\d{2}(\/\d{4})?$/.test(col8)) && currentFunc) {

                            const processarDia = (dataColIndex, in1Idx, out1Idx, in2Idx, out2Idx) => {
                                const dataCelula = String(row[dataColIndex] || '').trim();
                                if (!dataCelula) return;

                                const diaMatch1 = dataCelula.match(/^(\d{2})\.(\d{2})$/);
                                const diaMatch2 = dataCelula.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

                                let diaLinha = null;
                                let mesLinha = null;
                                let anoLinha = null;

                                if (diaMatch1) {
                                    mesLinha = diaMatch1[1];
                                    diaLinha = diaMatch1[2];
                                    anoLinha = anoStr;
                                } else if (diaMatch2) {
                                    diaLinha = diaMatch2[1];
                                    mesLinha = diaMatch2[2];
                                    anoLinha = diaMatch2[3];
                                } else {
                                    return;
                                }

                                if (!currentMesAno && anoLinha && mesLinha) {
                                    anoStr = anoLinha;
                                    mesStr = mesLinha;
                                    currentMesAno = `${anoStr}-${mesStr}`;
                                }

                                // REGRA ANTI-DUPLICIDADE DE PONTO:
                                // Se já existe no sistema um ponto para este funcionário neste exato dia, aborta a linha do arquivo!
                                const dataIsoPrefix = `${anoLinha}-${mesLinha}-${diaLinha}`;
                                const chaveDia = `${currentFunc.id}_${dataIsoPrefix}`;
                                if (diasExistentes.has(chaveDia)) {
                                    return; // Pula a importação deste dia específico
                                }

                                const limparHora = (horaRaw) => {
                                    if (!horaRaw) return null;
                                    const hStr = String(horaRaw).replace(/[^0-9:]/g, '').trim();
                                    if (/^([01]?\d|2[0-3]):([0-5]\d)$/.test(hStr)) return hStr;
                                    return null;
                                };

                                const criarDataIsoLocal = (horaLimpa) => {
                                    if (!horaLimpa) return null;
                                    const [h, m] = horaLimpa.split(':');
                                    return `${anoLinha}-${mesLinha}-${diaLinha}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00.000Z`;
                                };

                                const in1Iso = criarDataIsoLocal(limparHora(row[in1Idx]));
                                const out1Iso = criarDataIsoLocal(limparHora(row[out1Idx]));
                                const in2Iso = criarDataIsoLocal(limparHora(row[in2Idx]));
                                const out2Iso = criarDataIsoLocal(limparHora(row[out2Idx]));

                                if (in1Iso && out1Iso) {
                                    db.pontos.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 5), idFunc: currentFunc.id, entrada: in1Iso, saida: out1Iso });
                                    pontosAdicionados++;
                                }

                                if (in2Iso && out2Iso) {
                                    db.pontos.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 5), idFunc: currentFunc.id, entrada: in2Iso, saida: out2Iso });
                                    pontosAdicionados++;
                                }
                            };

                            processarDia(0, 2, 3, 4, 5);
                            processarDia(8, 10, 11, 12, 13);
                        }
                    }

                    RHDb.save(db);

                    let msgFinal = `${pontosAdicionados} registros de ponto novos importados com sucesso!`;
                    if (naoEncontrados.size > 0) {
                        msgFinal += `\n\nAviso: O nome no relógio não bate com o sistema (Verifique a grafia exata):\n- ${Array.from(naoEncontrados).join('\n- ')}`;
                    }

                    ModalRH.show('Importação Concluída', msgFinal);
                    fileInput.value = '';

                    document.getElementById('fechamento-func').value = currentFunc ? currentFunc.id : '';
                    if (currentMesAno) document.getElementById('fechamento-mes').value = currentMesAno;

                    RH.calcularFechamento();
                });

            } catch (error) {
                console.error(error);
                ModalRH.show('Erro', 'Ocorreu um erro ao processar a estrutura do arquivo.');
            }
        };

        reader.readAsArrayBuffer(file);
    },

    adicionarDescontoManual: function () {
        const desc = document.getElementById('desc-nome').value;
        const valor = parseFloat(document.getElementById('desc-valor').value);
        const idFunc = document.getElementById('fechamento-func').value;
        const mesAno = document.getElementById('fechamento-mes').value;
        if (!desc || isNaN(valor)) return;
        const db = RHDb.get();
        db.descontosFechamento.push({ id: Date.now().toString(), idFunc, mesAno, desc, ref: document.getElementById('desc-ref').value, valor });
        RHDb.save(db);
        document.getElementById('desc-nome').value = '';
        document.getElementById('desc-valor').value = '';
        this.calcularFechamento();
    },

    removerDescontoManual: function (id) {
        const db = RHDb.get();
        db.descontosFechamento = db.descontosFechamento.filter(d => d.id !== id);
        RHDb.save(db);
        this.calcularFechamento();
    },

    calcularFechamento: function () {
        const idFunc = document.getElementById('fechamento-func').value;
        const mesAno = document.getElementById('fechamento-mes').value;
        if (!idFunc || !mesAno) {
            ModalRH.show('Aviso', 'Selecione o funcionário e o mês.');
            return;
        }

        const db = RHDb.get();
        const func = db.funcionarios.find(f => f.id === idFunc);
        if (!func) return;

        this.fechamentoAtual = { func, mesAno };
        let saldoMensalMinutos = 0;

        // ==============================================
        // MODO PRODUÇÃO
        // ==============================================
        if (func.tipo === 'Produção') {
            const producaoNoMes = db.lancamentosProducao.filter(l => l.idFunc === idFunc && l.data.startsWith(mesAno));
            const totalBruto = producaoNoMes.reduce((acc, l) => acc + l.total, 0);

            document.querySelector('#tabela-extrato thead').innerHTML = `
                <tr>
                    <th style="text-align: left;">Data</th>
                    <th style="text-align: left;">Peça/Serviço (Qtd)</th>
                    <th style="text-align: right;">Total Recebido</th>
                </tr>
            `;

            let producaoRows = '';
            if (producaoNoMes.length === 0) {
                producaoRows = `<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-muted);">Nenhum lançamento de produção neste mês.</td></tr>`;
            } else {
                producaoNoMes.sort((a, b) => new Date(a.data) - new Date(b.data)).forEach(lp => {
                    producaoRows += `
                        <tr style="font-size: 13px; border-bottom: 1px solid var(--border-color);">
                            <td><strong>${lp.data.split('-').reverse().join('/')}</strong></td>
                            <td style="color: var(--primary-color);">${lp.pecaCodigo} - ${lp.pecaNome.toUpperCase()} <br><span style="color:var(--text-muted); font-size:11px;">(${lp.qtd} un. × R$ ${lp.valorUnit.toFixed(2).replace('.', ',')})</span></td>
                            <td style="text-align: right; color: var(--success-color); font-weight: bold; vertical-align: middle;">R$ ${lp.total.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
            }

            document.querySelector('#tabela-extrato tbody').innerHTML = `
                <tr style="background-color: var(--bg-body);"><td colspan="3"><strong>PRODUÇÃO MENSAL</strong></td></tr>
                ${producaoRows}
                <tr style="background-color: #0b1017;">
                    <td colspan="2" style="text-align:right;"><strong>TOTAL BRUTO:</strong></td>
                    <td style="color:var(--success-color); font-weight:bold; text-align: right;">R$ ${totalBruto.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;

            this.fechamentoAtual.totalVencimentos = totalBruto;
            this.fechamentoAtual.saldoFormatado = '-';
            this.fechamentoAtual.valorSaldoFinanceiro = 0;
            this.fechamentoAtual.saldoMinutos = 0;
            this.fechamentoAtual.salBase = 0;

        }
        // ==============================================
        // MODO MENSALISTA
        // ==============================================
        else {
            document.querySelector('#tabela-extrato thead').innerHTML = `
                <tr>
                    <th style="text-align: left;">Data</th>
                    <th>Horários de Turno</th>
                    <th style="text-align: right;">Total Dia</th>
                </tr>
            `;

            const salBase = parseFloat(func.salarioBase) || 0;
            const cargo = db.cargos.find(c => c.id === func.cargoId);
            const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const [anoStr, mesStr] = mesAno.split('-');
            const numDias = new Date(anoStr, mesStr, 0).getDate();

            let extratoDetalhadoHTML = '';

            for (let dia = 1; dia <= numDias; dia++) {
                const dataIsoPrefix = `${anoStr}-${mesStr}-${dia.toString().padStart(2, '0')}`;
                const diaSemanaStr = mapaDias[new Date(anoStr, mesStr - 1, dia).getDay()];

                let cargaEsperadaMinutos = 0;
                if (cargo && cargo.escala && cargo.escala[diaSemanaStr]) {
                    const turno = db.turnos.find(t => t.id === cargo.escala[diaSemanaStr]);
                    if (turno && turno.carga && turno.carga !== "00:00") {
                        const [th, tm] = turno.carga.split(':').map(Number);
                        cargaEsperadaMinutos = (th * 60) + tm;
                    }
                }

                const pontosDia = db.pontos.filter(p => p.idFunc === idFunc && p.entrada.startsWith(dataIsoPrefix));
                pontosDia.sort((a, b) => new Date(a.entrada) - new Date(b.entrada));

                let cargaRealizadaMinutos = 0;
                let batidasTexto = [];

                pontosDia.forEach(p => {
                    const diff = new Date(p.saida) - new Date(p.entrada);
                    cargaRealizadaMinutos += diff / 60000;
                    batidasTexto.push(`${p.entrada.split('T')[1].substring(0, 5)} às ${p.saida.split('T')[1].substring(0, 5)}`);
                });

                let saldoDia = 0;
                if (cargaRealizadaMinutos > 0) {
                    saldoDia = Math.round(cargaRealizadaMinutos - cargaEsperadaMinutos);
                    if (Math.abs(saldoDia) <= 10) saldoDia = 0;
                } else if (cargaEsperadaMinutos > 0 && cargaRealizadaMinutos === 0) {
                    saldoDia = -cargaEsperadaMinutos;
                }

                saldoMensalMinutos += saldoDia;

                if (cargaEsperadaMinutos > 0 || cargaRealizadaMinutos > 0) {
                    const hE = Math.floor(cargaEsperadaMinutos / 60).toString().padStart(2, '0');
                    const mE = (cargaEsperadaMinutos % 60).toString().padStart(2, '0');
                    const hR = Math.floor(cargaRealizadaMinutos / 60).toString().padStart(2, '0');
                    const mR = (cargaRealizadaMinutos % 60).toString().padStart(2, '0');

                    const absS = Math.abs(saldoDia);
                    const hS = Math.floor(absS / 60).toString().padStart(2, '0');
                    const mS = (absS % 60).toString().padStart(2, '0');
                    const sinalS = saldoDia < 0 ? '-' : '+';
                    const corS = saldoDia >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

                    const btnEdit = `<button onclick="RH.editarDiaPonto('${idFunc}', '${dataIsoPrefix}')" style="background:none; border:none; color:#38bdf8; cursor:pointer; padding:0 5px;" title="Editar Horas"><i data-lucide="edit" style="width:16px;"></i></button>`;
                    const btnDel = `<button onclick="RH.excluirDiaPonto('${idFunc}', '${dataIsoPrefix}')" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:0 5px;" title="Apagar Dia"><i data-lucide="trash-2" style="width:16px;"></i></button>`;

                    extratoDetalhadoHTML += `
                        <tr style="font-size: 13px;">
                            <td style="text-align: left;">
                                <div style="display: flex; justify-content: space-between;">
                                    <div>
                                        <strong>${dia.toString().padStart(2, '0')}/${mesStr} (${diaSemanaStr.toUpperCase()})</strong><br>
                                        <span style="font-size: 11px; color: var(--primary-color);">${batidasTexto.join(' | ') || 'Falta Integral'}</span>
                                    </div>
                                    <div style="margin-top: 5px;">${btnEdit} ${btnDel}</div>
                                </div>
                            </td>
                            <td style="vertical-align: middle;">Exp: ${hE}:${mE}h<br>Real: ${hR}:${mR}h</td>
                            <td style="color:${corS}; font-weight:bold; vertical-align: middle; text-align: right;">${saldoDia === 0 ? '00:00h' : `${sinalS}${hS}:${mS}h`}</td>
                        </tr>`;
                }
            }

            const absTotal = Math.abs(saldoMensalMinutos);
            const saldoFormatated = `${saldoMensalMinutos < 0 ? '-' : '+'}${Math.floor(absTotal / 60).toString().padStart(2, '0')}:${(absTotal % 60).toString().padStart(2, '0')}h`;

            document.querySelector('#tabela-extrato tbody').innerHTML = `
                <tr style="background-color: var(--bg-body);"><td colspan="3"><strong>SALÁRIO MENSAL</strong></td></tr>
                <tr><td style="text-align: left;">Salário Base</td><td>-</td><td style="font-weight:bold; text-align: right;">R$ ${salBase.toFixed(2)}</td></tr>
                <tr style="background-color: var(--bg-body);"><td colspan="3"><strong>BANCO DE HORAS DIÁRIO</strong></td></tr>
                ${extratoDetalhadoHTML}
                <tr style="background-color: #0b1017;">
                    <td colspan="2" style="text-align:right;"><strong>SALDO TOTAL DO MÊS:</strong></td>
                    <td style="color:${saldoMensalMinutos >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight:bold; text-align: right;">${saldoMensalMinutos === 0 ? '00:00h' : saldoFormatated}</td>
                </tr>`;

            // --- NOVA LÓGICA SÊNIOR: CÁLCULO EXATO POR MINUTOS DO MÊS ---

            // 1. Soma os minutos REAIS de obrigação do funcionário neste mês específico
            let cargaTotalMesMinutos = 0;

            for (let d = 1; d <= numDias; d++) {
                const diaSemanaNome = mapaDias[new Date(anoStr, mesStr - 1, d).getDay()];
                if (cargo && cargo.escala && cargo.escala[diaSemanaNome]) {
                    const turnoRef = db.turnos.find(t => t.id === cargo.escala[diaSemanaNome]);
                    if (turnoRef && turnoRef.carga && turnoRef.carga !== '00:00') {
                        const [th, tm] = turnoRef.carga.split(':').map(Number);
                        cargaTotalMesMinutos += (th * 60) + tm;
                    }
                }
            }

            // 2. Descobre o valor EXATO de cada minuto daquele mês
            let valorMinuto = 0;
            if (cargaTotalMesMinutos > 0) {
                valorMinuto = salBase / cargaTotalMesMinutos;
            }

            // 3. Multiplica os minutos de saldo (faltas ou extras) pelo valor do minuto
            const absTotalMinutos = Math.abs(saldoMensalMinutos);
            const valorSaldoFinanceiro = absTotalMinutos * valorMinuto;

            this.fechamentoAtual.salBase = salBase;
            this.fechamentoAtual.saldoMinutos = saldoMensalMinutos;
            this.fechamentoAtual.saldoFormatado = saldoMensalMinutos === 0 ? '00:00h' : saldoFormatated;
            this.fechamentoAtual.valorSaldoFinanceiro = valorSaldoFinanceiro;

            if (saldoMensalMinutos > 0) {
                this.fechamentoAtual.totalVencimentos = salBase + valorSaldoFinanceiro;
            } else {
                this.fechamentoAtual.totalVencimentos = salBase;
            }
        }

        // ==============================================
        // CÁLCULO E RENDERIZAÇÃO DOS DESCONTOS (INCLUI ESTOQUE)
        // ==============================================
        const descontosManuais = db.descontosFechamento.filter(d => d.idFunc === idFunc && d.mesAno === mesAno);

        // --- MÁGICA DA INTEGRAÇÃO COM O ESTOQUE ---
        const dbEstoqueRaw = localStorage.getItem('ks_estoque_dados');
        const dbEstoque = dbEstoqueRaw ? JSON.parse(dbEstoqueRaw) : { insumos: [], logsInsumos: [], logsPecas: [] };

        const descontosDoEstoque = [];
        if (dbEstoque.logsInsumos) {
            const saidasFuncionarioMes = dbEstoque.logsInsumos.filter(l =>
                l.tipo === 'Saída' && l.idFunc === idFunc && l.data.startsWith(mesAno) && l.totalCobrado > 0
            );

            saidasFuncionarioMes.forEach(saida => {
                const itemEstoque = dbEstoque.insumos.find(i => i.id === saida.idInsumo);
                const nomeItem = itemEstoque ? itemEstoque.nome : 'Material';
                descontosDoEstoque.push({
                    id: 'EST_' + saida.id, // ID fictício para renderização
                    desc: `Consumo: ${nomeItem} (${saida.qtd})`,
                    ref: saida.data.split('-').reverse().join('/'),
                    valor: saida.totalCobrado,
                    isEstoque: true // Trava para impedir o RH de apagar um dado que pertence ao Estoque
                });
            });
        }

        const todosDescontos = [...descontosManuais, ...descontosDoEstoque];
        let somaDesc = todosDescontos.reduce((a, b) => a + b.valor, 0);

        if (func.tipo === 'Mensalista' && this.fechamentoAtual.saldoMinutos < 0) {
            somaDesc += this.fechamentoAtual.valorSaldoFinanceiro;
        }

        this.fechamentoAtual.somaDescontosManuais = somaDesc;
        this.fechamentoAtual.descontosManuais = todosDescontos;
        this.fechamentoAtual.valorLiquido = this.fechamentoAtual.totalVencimentos - somaDesc;

        const tbodyDescontos = document.querySelector('#tabela-descontos-manuais tbody');
        if (tbodyDescontos) {
            if (todosDescontos.length === 0) {
                tbodyDescontos.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:15px;">Nenhum desconto lançado neste mês.</td></tr>`;
            } else {
                tbodyDescontos.innerHTML = todosDescontos.map(d => {
                    const btnExcluir = d.isEstoque
                        ? `<span style="font-size:10px; color:#38bdf8;">Registrado no Estoque</span>`
                        : `<button class="btn-danger" onclick="RH.removerDescontoManual('${d.id}')" style="padding:4px;"><i data-lucide="trash-2" style="width:14px;"></i></button>`;
                    return `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="${d.isEstoque ? 'color:#38bdf8;' : ''}">${d.desc}</td>
                        <td>${d.ref || '-'}</td>
                        <td style="color:var(--danger-color); font-weight:bold;">R$ ${d.valor.toFixed(2).replace('.', ',')}</td>
                        <td style="text-align: center;">${btnExcluir}</td>
                    </tr>
                `}).join('');
            }
        }

        document.getElementById('res-nome').innerText = func.nome;
        document.getElementById('res-liquido').innerText = `R$ ${this.fechamentoAtual.valorLiquido.toFixed(2).replace('.', ',')}`;
        document.getElementById('resultado-fechamento').style.display = 'block';
        setTimeout(() => lucide.createIcons(), 50);
    },

    limparHorasPeriodo: function () {
        const idFunc = document.getElementById('fechamento-func').value;
        const mesAno = document.getElementById('fechamento-mes').value;

        if (!idFunc || !mesAno) {
            ModalRH.show('Aviso', 'Selecione o funcionário e o mês.');
            return;
        }

        ModalRH.show('Confirmar Exclusão', 'Tem certeza que deseja apagar TODOS os pontos deste funcionário neste mês?', 'confirm', () => {
            const db = RHDb.get();
            const pontosIniciais = db.pontos.length;

            // Remove os pontos que batem com o funcionário e o mês
            db.pontos = db.pontos.filter(p => !(p.idFunc === idFunc && p.entrada.startsWith(mesAno)));

            const removidos = pontosIniciais - db.pontos.length;

            if (removidos > 0) {
                RHDb.save(db);
                ModalRH.show('Sucesso', `${removidos} batidas removidas com sucesso.`);
                RH.calcularFechamento(); // Atualiza a tela na hora
            } else {
                ModalRH.show('Aviso', 'Nenhuma hora para remover neste período.');
            }
        });
    },

    editarDiaPonto: function (idFunc, dataIsoPrefix) {
        const db = RHDb.get();
        const pontosDia = db.pontos.filter(p => p.idFunc === idFunc && p.entrada.startsWith(dataIsoPrefix));
        pontosDia.sort((a, b) => new Date(a.entrada) - new Date(b.entrada));

        // Prepara as horas iniciais caso já existam batidas no dia
        let horasIniciais = ['', '', '', ''];
        if (pontosDia.length > 0) {
            horasIniciais[0] = pontosDia[0].entrada.split('T')[1].substring(0, 5);
            horasIniciais[1] = pontosDia[0].saida.split('T')[1].substring(0, 5);
        }
        if (pontosDia.length > 1) {
            horasIniciais[2] = pontosDia[1].entrada.split('T')[1].substring(0, 5);
            horasIniciais[3] = pontosDia[1].saida.split('T')[1].substring(0, 5);
        }

        const dataFormatada = dataIsoPrefix.split('-').reverse().join('/');

        // Aciona a nova tela com os 4 campos
        ModalRH.promptEdicaoHoras(`Editar Horas - ${dataFormatada}`, horasIniciais, (novasHoras) => {
            if (!novasHoras) return;

            const dbAtual = RHDb.get();
            // Remove as batidas antigas daquele dia
            dbAtual.pontos = dbAtual.pontos.filter(p => !(p.idFunc === idFunc && p.entrada.startsWith(dataIsoPrefix)));

            // Se preencheu o Turno 1, salva
            if (novasHoras[0] && novasHoras[1]) {
                dbAtual.pontos.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    idFunc: idFunc,
                    entrada: `${dataIsoPrefix}T${novasHoras[0]}:00.000Z`,
                    saida: `${dataIsoPrefix}T${novasHoras[1]}:00.000Z`
                });
            }

            // Se preencheu o Turno 2, salva
            if (novasHoras[2] && novasHoras[3]) {
                dbAtual.pontos.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    idFunc: idFunc,
                    entrada: `${dataIsoPrefix}T${novasHoras[2]}:00.000Z`,
                    saida: `${dataIsoPrefix}T${novasHoras[3]}:00.000Z`
                });
            }

            RHDb.save(dbAtual);
            RH.calcularFechamento(); // Recalcula tudo na hora
        });
    },

    excluirDiaPonto: function (idFunc, dataIsoPrefix) {
        ModalRH.show('Confirmar Exclusão', `Você tem certeza que deseja excluir as horas do dia ${dataIsoPrefix.split('-').reverse().join('/')}?`, 'confirm', () => {
            const db = RHDb.get();
            // Filtra o banco removendo os pontos daquele dia exato
            db.pontos = db.pontos.filter(p => !(p.idFunc === idFunc && p.entrada.startsWith(dataIsoPrefix)));
            RHDb.save(db);
            RH.calcularFechamento(); // Recalcula a tabela automaticamente
        });
    },

    mostrarRelatorio: function () {
        if (!this.fechamentoAtual) {
            ModalRH.show('Erro', 'Calcule o fechamento primeiro antes de gerar o relatório.');
            return;
        }

        const data = this.fechamentoAtual;
        const db = RHDb.get();
        const conteudo = document.getElementById('relatorio-conteudo');

        conteudo.style.overflow = 'hidden';

        // --- 1. LADO ESQUERDO: RESUMO FINANCEIRO ---
        let financeiroHtml = '';
        if (data.func.tipo === 'Produção') {
            financeiroHtml = `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #cbd5e1;">Valor Total de Produção</span>
                    <span style="font-weight: bold; color: #10b981; font-size: 16px;">R$ ${data.totalVencimentos.toFixed(2).replace('.', ',')}</span>
                </div>
            `;
        } else {
            const cargo = db.cargos.find(c => c.id === data.func.cargoId);
            financeiroHtml = `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #cbd5e1;">Cargo</span>
                    <span style="font-weight: bold; color: #f8fafc;">${cargo ? cargo.nome : 'N/D'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #cbd5e1;">Salário Base</span>
                    <span style="font-weight: bold; color: #10b981; font-size: 16px;">R$ ${data.salBase.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #cbd5e1;">Saldo Banco de Horas</span>
                    <span style="font-weight: bold; font-size: 16px; color: ${data.saldoMinutos >= 0 ? '#10b981' : '#ef4444'};">${data.saldoFormatado}</span>
                </div>
            `;

            if (data.saldoMinutos > 0) {
                financeiroHtml += `
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #10b981;">
                        <span style="color: #10b981; font-size: 12px;">+ Horas Extras</span>
                        <span style="font-weight: bold; color: #10b981; font-size: 15px;">R$ ${data.valorSaldoFinanceiro.toFixed(2).replace('.', ',')}</span>
                    </div>
                `;
            }
        }

        let descontosHtml = '';
        if (data.func.tipo === 'Mensalista' && data.saldoMinutos < 0) {
            descontosHtml += `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #ef4444;">
                    <span style="color: #ef4444; font-size: 12px;">Atrasos/Faltas</span>
                    <span style="color: #ef4444; font-weight: bold;">- R$ ${data.valorSaldoFinanceiro.toFixed(2).replace('.', ',')}</span>
                </div>
            `;
        }

        if (data.descontosManuais && data.descontosManuais.length > 0) {
            data.descontosManuais.forEach(desc => {
                descontosHtml += `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #334155;">
                        <span style="color: #94a3b8;">${desc.desc}</span>
                        <span style="color: #ef4444; font-weight: bold;">- R$ ${desc.valor.toFixed(2).replace('.', ',')}</span>
                    </div>
                `;
            });
        }

        if (descontosHtml === '') descontosHtml = `<div style="padding: 10px 0; color: #64748b; font-style: italic;">Nenhum desconto.</div>`;

        // --- 2. LADO DIREITO: RENDERIZAÇÃO DINÂMICA (PONTO OU PRODUÇÃO) ---
        let extratoDiasHtml = '';
        const tituloLadoDireito = data.func.tipo === 'Produção' ? 'Detalhamento de Peças Produzidas' : 'Extrato Detalhado do Relógio';

        if (data.func.tipo === 'Produção') {
            const producoes = db.lancamentosProducao.filter(lp => lp.idFunc === data.func.id && lp.data.startsWith(data.mesAno));

            extratoDiasHtml += `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: center;">
                    <thead style="background: #1e293b; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                        <tr>
                            <th style="padding: 12px 10px; color: #94a3b8; text-align: left;">Data</th>
                            <th style="padding: 12px 10px; color: #94a3b8; text-align: left;">Descrição da Peça / Serviço</th>
                            <th style="padding: 12px 5px; color: #94a3b8;">Quantidade</th>
                            <th style="padding: 12px 10px; color: #94a3b8; text-align: right;">Valor Un.</th>
                            <th style="padding: 12px 10px; color: #94a3b8; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (producoes.length === 0) {
                extratoDiasHtml += `<tr><td colspan="5" style="padding: 20px; color: #94a3b8;">Nenhum lançamento registrado neste mês.</td></tr>`;
            } else {
                producoes.sort((a, b) => new Date(a.data) - new Date(b.data)).forEach((lp, i) => {
                    extratoDiasHtml += `
                        <tr style="border-bottom: 1px solid #1e293b; background: ${i % 2 === 0 ? '#0b1017' : 'transparent'};">
                            <td style="padding: 10px; color: #f8fafc; text-align: left;"><strong>${lp.data.split('-').reverse().join('/')}</strong></td>
                            <td style="padding: 10px; color: #38bdf8; text-align: left; font-weight: bold;">${lp.pecaCodigo} - ${lp.pecaNome.toUpperCase()}</td>
                            <td style="padding: 10px; color: #f8fafc;">${lp.qtd} un.</td>
                            <td style="padding: 10px; text-align: right; color: #94a3b8;">R$ ${lp.valorUnit.toFixed(2).replace('.', ',')}</td>
                            <td style="padding: 10px; text-align: right; color: #10b981; font-weight: bold;">R$ ${lp.total.toFixed(2).replace('.', ',')}</td>
                        </tr>`;
                });
            }
            extratoDiasHtml += `</tbody></table>`;

        } else {
            // Lógica do Mensalista (mantida a mesma)
            const [anoStr, mesStr] = data.mesAno.split('-');
            const numDias = new Date(anoStr, mesStr, 0).getDate();
            const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const cargo = db.cargos.find(c => c.id === data.func.cargoId);

            extratoDiasHtml += `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: center;">
                    <thead style="background: #1e293b; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                        <tr>
                            <th style="padding: 12px 10px; color: #94a3b8; text-align: left;">Data</th>
                            <th style="padding: 12px 5px; color: #94a3b8;">Ent. 1</th>
                            <th style="padding: 12px 5px; color: #94a3b8;">Saí. 1</th>
                            <th style="padding: 12px 5px; color: #94a3b8;">Ent. 2</th>
                            <th style="padding: 12px 5px; color: #94a3b8;">Saí. 2</th>
                            <th style="padding: 12px 10px; color: #94a3b8; text-align: right;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let dia = 1; dia <= numDias; dia++) {
                const dataIso = `${anoStr}-${mesStr}-${dia.toString().padStart(2, '0')}`;
                const diaSemana = mapaDias[new Date(anoStr, mesStr - 1, dia).getDay()];

                const pontosDia = db.pontos.filter(p => p.idFunc === data.func.id && p.entrada.startsWith(dataIso));
                pontosDia.sort((a, b) => new Date(a.entrada) - new Date(b.entrada));

                let cargaReal = 0, tE1 = '-', tS1 = '-', tE2 = '-', tS2 = '-';
                pontosDia.forEach((p, i) => {
                    cargaReal += (new Date(p.saida) - new Date(p.entrada)) / 60000;
                    const hIn = p.entrada.split('T')[1].substring(0, 5);
                    const hOut = p.saida.split('T')[1].substring(0, 5);
                    if (i === 0) { tE1 = hIn; tS1 = hOut; }
                    if (i === 1) { tE2 = hIn; tS2 = hOut; }
                });

                let cargaExp = 0;
                if (cargo && cargo.escala && cargo.escala[diaSemana]) {
                    const turno = db.turnos.find(t => t.id === cargo.escala[diaSemana]);
                    if (turno && turno.carga) {
                        const [th, tm] = turno.carga.split(':').map(Number);
                        cargaExp = (th * 60) + tm;
                    }
                }

                if (cargaExp > 0 || cargaReal > 0) {
                    let saldoDia = cargaReal > 0 ? Math.round(cargaReal - cargaExp) : 0;
                    if (Math.abs(saldoDia) <= 10) saldoDia = 0;

                    const corS = saldoDia >= 0 ? '#10b981' : '#ef4444';
                    const absS = Math.abs(saldoDia);
                    const saldoFormat = `${saldoDia < 0 ? '-' : '+'}${Math.floor(absS / 60).toString().padStart(2, '0')}:${(absS % 60).toString().padStart(2, '0')}h`;

                    extratoDiasHtml += `
                        <tr style="border-bottom: 1px solid #1e293b; background: ${dia % 2 === 0 ? '#0b1017' : 'transparent'};">
                            <td style="padding: 10px; color: #f8fafc; text-align: left;"><strong>${dia.toString().padStart(2, '0')}/${mesStr}</strong> <small style="color:#64748b">${diaSemana.toUpperCase()}</small></td>
                            <td style="color: #38bdf8;">${tE1}</td><td style="color: #38bdf8;">${tS1}</td>
                            <td style="color: #38bdf8;">${tE2}</td><td style="color: #38bdf8;">${tS2}</td>
                            <td style="padding: 10px; text-align: right; color: ${corS}; font-weight: bold;">${cargaReal > 0 ? (saldoDia === 0 ? '00:00h' : saldoFormat) : 'Falta'}</td>
                        </tr>`;
                }
            }
            extratoDiasHtml += `</tbody></table>`;
        }

        // --- 3. MONTAGEM FINAL DA ESTRUTURA ---
        conteudo.innerHTML = `
            <div style="display: flex; height: 100%; width: 100%; border-radius: 8px; overflow: hidden;">
                
                <div style="width: 320px; display: flex; flex-direction: column; background: #171c26; border-right: 2px solid #1e293b;">
                    <div style="padding: 25px; flex: 1; overflow-y: auto;">
                        <h4 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-top: 0; text-transform: uppercase;">Resumo Financeiro</h4>
                        ${financeiroHtml}
                        <div style="text-align: right; margin-top: 10px; color: #f8fafc; font-weight: bold; font-size: 15px;">Vencimentos: R$ ${data.totalVencimentos.toFixed(2).replace('.', ',')}</div>

                        <h4 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px; margin-top: 30px; text-transform: uppercase;">Descontos</h4>
                        ${descontosHtml}
                        <div style="text-align: right; margin-top: 10px; color: #ef4444; font-weight: bold; font-size: 15px;">Descontos: - R$ ${data.somaDescontosManuais.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div style="padding: 20px; background: #0b1017; border-top: 1px solid #1e293b;">
                        <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Líquido Final</span>
                        <div style="color: #10b981; font-size: 24px; font-weight: bold;">R$ ${data.valorLiquido.toFixed(2).replace('.', ',')}</div>
                    </div>
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; background: #0f172a;">
                    <div style="padding: 15px 25px; background: #1e293b; border-bottom: 1px solid #334155;">
                        <h4 style="margin: 0; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">${tituloLadoDireito}</h4>
                    </div>
                    <div style="flex: 1; overflow-y: auto; padding: 0 15px 15px 15px;">
                        <div style="margin-top: 15px; border: 1px solid #1e293b; border-radius: 4px;">
                            ${extratoDiasHtml}
                        </div>
                    </div>
                </div>

            </div>
        `;

        const modal = document.getElementById('modal-relatorio');
        modal.style.display = 'flex';

        document.body.style.overflow = 'hidden';

        const fecharModal = () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        };

        const closeBtns = modal.querySelectorAll('button[onclick*="style.display="]');
        closeBtns.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.onclick = fecharModal;
        });
    },

    gerarPDFHolerite: function () {
        if (!this.fechamentoAtual) {
            ModalRH.show('Erro', 'Calcule o fechamento primeiro.');
            return;
        }

        const data = this.fechamentoAtual;
        const [ano, mes] = data.mesAno.split('-');
        const admissaoStr = data.func.admissao ? data.func.admissao.split('-').reverse().join('/') : '--/--/----';

        const nomeArquivo = `Holerite - ${data.func.nome} - ${mes}_${ano}`;
        const tituloOriginal = document.title;
        document.title = nomeArquivo;

        let linhasDescontosExtrasHTML = '';

        // LINHA DE DESCONTO: Se o saldo for negativo, imprime a linha na coluna de descontos
        if (data.func.tipo !== 'Produção' && data.saldoMinutos < 0) {
            linhasDescontosExtrasHTML += `
                <tr>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">101</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">ATRASOS E FALTAS (SALDO NEGATIVO)</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">${data.saldoFormatado.replace('-', '')}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;"></td>
                    <td style="padding: 4px; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${data.valorSaldoFinanceiro.toFixed(2).replace('.', ',')}</td>
                </tr>`;
        }

        // Outros descontos manuais
        if (data.descontosManuais && data.descontosManuais.length > 0) {
            data.descontosManuais.forEach((desc, index) => {
                linhasDescontosExtrasHTML += `
                    <tr>
                        <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">00${index + 2}</td>
                        <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">${desc.desc.toUpperCase()}</td>
                        <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">${desc.ref || ''}</td>
                        <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;"></td>
                        <td style="padding: 4px; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${desc.valor.toFixed(2).replace('.', ',')}</td>
                    </tr>`;
            });
        }

        let linhasVencimentosHTML = '';
        let cargoNome = "PRODUÇÃO";

        if (data.func.tipo === 'Produção') {
            linhasVencimentosHTML = `
                <tr>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">001</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">VALOR DE PRODUÇÃO MENSAL</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">-</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${data.totalVencimentos.toFixed(2).replace('.', ',')}</td>
                    <td style="padding: 4px; border-bottom: 1px solid #000; color: #000 !important;"></td>
                </tr>`;
        } else {
            const db = RHDb.get();
            const cargo = db.cargos.find(c => c.id === data.func.cargoId);
            if (cargo) cargoNome = cargo.nome.toUpperCase();

            // LINHA DE VENCIMENTO: Salário Base
            linhasVencimentosHTML = `
                <tr>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">001</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">SALÁRIO BASE MENSAL</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">-</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${data.salBase.toFixed(2).replace('.', ',')}</td>
                    <td style="padding: 4px; border-bottom: 1px solid #000; color: #000 !important;"></td>
                </tr>`;

            // LINHA DE VENCIMENTO EXTRA: Se houver saldo positivo, entra como Horas Extras
            if (data.saldoMinutos > 0) {
                linhasVencimentosHTML += `
                <tr>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">002</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">HORAS EXTRAS (SALDO POSITIVO)</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">${data.saldoFormatado.replace('+', '')}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${data.valorSaldoFinanceiro.toFixed(2).replace('.', ',')}</td>
                    <td style="padding: 4px; border-bottom: 1px solid #000; color: #000 !important;"></td>
                </tr>`;
            }
        }

        const generateVia = (viaName) => `
        <div style="width: 100%; height: 100%; border: 1px solid #000; box-sizing: border-box; background: #fff; display: flex; flex-direction: column; font-family: Arial, sans-serif; color: #000 !important;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding: 6px;">
                <div style="font-size: 10px; line-height: 1.3; color: #000 !important;">
                    <strong style="font-size: 12px; color: #000 !important;">KS AFINAÇÕES</strong><br>
                    <span style="color: #000 !important;">Estância Triângulo - Estrada, Rodovia - Santa Isabel do Ivaí a<br>
                    Loanda - PR, 87910-000<br>
                    CNPJ: 42.360.395/0001-83</span>
                </div>
                <div style="text-align: right; font-size: 10px; color: #000 !important;">
                    <strong style="font-size: 14px; text-transform: uppercase; color: #000 !important;">Recibo de Pagamento de Salário</strong><br>
                    <span style="color: #000 !important;">Mês: ${mes}/${ano}</span><br>
                    <span style="font-size: 9px; font-weight: bold; color: #000 !important;">(${viaName})</span>
                </div>
            </div>

            <div style="border-bottom: 1px solid #000; display: flex; flex-direction: column; font-size: 10px; color: #000 !important;">
                <div style="display: flex; border-bottom: 1px solid #000; width: 100%;">
                    <div style="width: 70%; padding: 4px; border-right: 1px solid #000; color: #000 !important;">
                        <span style="font-size: 8px; color: #000 !important;">Código &nbsp;&nbsp;&nbsp; Nome do Funcionário</span><br>
                        <strong style="font-size: 11px; color: #000 !important;">${data.func.id.slice(-4).padStart(5, '0')} &nbsp;&nbsp;&nbsp; ${data.func.nome.toUpperCase()}</strong>
                    </div>
                    <div style="width: 30%; padding: 4px; color: #000 !important;">
                        <span style="font-size: 8px; color: #000 !important;">Data de Admissão</span><br>
                        <strong style="font-size: 11px; color: #000 !important;">${admissaoStr}</strong>
                    </div>
                </div>
                <div style="display: flex; width: 100%; justify-content: space-between;">
                    <div style="padding: 4px; color: #000 !important;">
                        <span style="font-size: 8px; color: #000 !important;">Cargo:</span> <strong style="font-size: 11px; color: #000 !important;">${cargoNome}</strong>
                    </div>
                    ${data.func.tipo === 'Mensalista' ? `
                    <div style="padding: 4px; color: #000 !important; text-align: right;">
                        <span style="font-size: 8px; color: #000 !important;">Saldo de Horas Resumido:</span> <strong style="font-size: 11px; color: ${data.saldoMinutos >= 0 ? '#16a34a' : '#dc2626'} !important;">${data.saldoFormatado}</strong>
                    </div>` : ''}
                </div>
            </div>

            <div style="flex: 1; width: 100%; border-bottom: 1px solid #000;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #000 !important;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="width: 10%; padding: 4px; border-right: 1px solid #000; font-weight: bold; text-align: center; color: #000 !important;">Cód.</th>
                            <th style="width: 45%; padding: 4px; border-right: 1px solid #000; text-align: left; font-weight: bold; color: #000 !important;">Descrição</th>
                            <th style="width: 15%; padding: 4px; border-right: 1px solid #000; font-weight: bold; text-align: center; color: #000 !important;">Referência</th>
                            <th style="width: 15%; padding: 4px; border-right: 1px solid #000; text-align: right; font-weight: bold; color: #000 !important;">Vencimentos</th>
                            <th style="width: 15%; padding: 4px; text-align: right; font-weight: bold; color: #000 !important;">Descontos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasVencimentosHTML}
                        ${linhasDescontosExtrasHTML}
                    </tbody>
                </table>
            </div>

            <div style="display: flex; border-bottom: 1px solid #000; font-size: 10px; color: #000 !important; width: 100%;">
                <div style="width: 60%; padding: 6px; border-right: 1px solid #000; color: #000 !important;">
                    Forma de Pagamento<br>
                    <strong style="font-size: 12px; color: #000 !important;">PIX / DINHEIRO</strong>
                </div>
                <div style="width: 40%; display: flex; flex-direction: column;">
                    <div style="display: flex; border-bottom: 1px solid #000; flex: 1;">
                        <div style="width: 50%; padding: 4px; border-right: 1px solid #000; text-align: right; color: #000 !important;">
                            <span style="font-size: 8px; color: #000 !important;">Total Vencimentos</span><br>
                            <strong style="color: #000 !important;">${data.totalVencimentos.toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div style="width: 50%; padding: 4px; text-align: right; color: #000 !important;">
                            <span style="font-size: 8px; color: #000 !important;">Total Descontos</span><br>
                            <strong style="color: #000 !important;">${data.somaDescontosManuais.toFixed(2).replace('.', ',')}</strong>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px; flex: 1; color: #000 !important;">
                        <span style="font-size: 10px; font-weight: bold; color: #000 !important;">Valor Líquido ⇨</span>
                        <strong style="font-size: 14px; color: #000 !important;">R$ ${data.valorLiquido.toFixed(2).replace('.', ',')}</strong>
                    </div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 15px; font-size: 10px; color: #000 !important;">
                <span style="margin-bottom: 25px; font-weight: bold; font-size: 11px; color: #000 !important;">RECEBI O VALOR LÍQUIDO DESCRITO NESTE RECIBO</span>
                <div style="display: flex; width: 80%; justify-content: space-between;">
                    <div style="width: 60%; border-top: 1px solid #000; text-align: center; padding-top: 4px; font-weight: bold; color: #000 !important;">ASSINATURA DO FUNCIONÁRIO</div>
                    <div style="width: 30%; border-top: 1px solid #000; text-align: center; padding-top: 4px; font-weight: bold; color: #000 !important;">DATA</div>
                </div>
            </div>
        </div>
        `;

        const area = document.getElementById('print-area-holerite');
        if (area) {
            area.style.display = 'block';
            const printHtml = `
            <div class="print-half-holerite">${generateVia('1ª VIA - EMPRESA')}</div>
            <div class="print-separator-holerite" style="border-top: 1px dashed #000; margin: 15px 0;"></div>
            <div class="print-half-holerite">${generateVia('2ª VIA - FUNCIONÁRIO')}</div>
        `;

            const executarImpressao = () => {
                const area = document.getElementById('print-area-holerite');
                if (area) {
                    area.innerHTML = printHtml;
                    document.body.className = 'printing-holerite';
                    area.style.display = 'block';
                    setTimeout(() => {
                        window.print();
                        document.title = tituloOriginal;
                        document.body.className = '';
                        area.style.display = 'none';
                    }, 500);
                }
            };

            const salvarNoHistorico = (chave) => {
                const dbParaSalvar = RHDb.get();
                if (!dbParaSalvar.historico) dbParaSalvar.historico = [];

                const historicoObj = {
                    id: Date.now().toString(),
                    idOriginal: chave,
                    timestamp: new Date().toISOString(),
                    tipo: 'Holerite',
                    mesRef: `${ano}-${mes}`,
                    nome: data.func.nome,
                    valorLiquido: data.valorLiquido,
                    htmlImpressao: printHtml
                };

                const idx = dbParaSalvar.historico.findIndex(h => h.idOriginal === chave);
                if (idx > -1) dbParaSalvar.historico[idx] = historicoObj;
                else dbParaSalvar.historico.push(historicoObj);

                RHDb.save(dbParaSalvar);

                // --- INTEGRAÇÃO FINANCEIRA (AUTOMÁTICA E PAGA) ---
                const dbFinRaw = localStorage.getItem('ks_financeiro_dados');
                let dbFin = { despesas: [] };
                if (dbFinRaw) {
                    dbFin = JSON.parse(dbFinRaw);
                    if (!dbFin.despesas) dbFin.despesas = [];
                }

                const idFin = 'RH_' + data.func.id + '_' + ano + '_' + mes;
                const idxFin = dbFin.despesas.findIndex(t => t.id === idFin);

                const despesaRH = {
                    id: idFin,
                    descricao: `Folha RH: ${data.func.nome.toUpperCase()} (${mes}/${ano})`,
                    categoria: 'RH',
                    valor: data.valorLiquido,
                    vencimento: new Date().toISOString().split('T')[0],
                    pago: true, // Já entra como PAGO no Fechamento
                    cancelada: false
                };

                if (idxFin > -1) dbFin.despesas[idxFin] = despesaRH;
                else dbFin.despesas.push(despesaRH);

                localStorage.setItem('ks_financeiro_dados', JSON.stringify(dbFin));
            };

            // PERGUNTA DE SALVAMENTO PARA RELATÓRIO
            const dbBusca = RHDb.get();
            const chaveRelatorio = `relatorio_${data.func.id}_${ano}-${mes}`;
            const existente = (dbBusca.historico || []).find(h => h.idOriginal === chaveRelatorio);

            if (existente) {
                ModalRH.show('Atualizar Relatório?', 'Já existe um relatório de conferência salvo para este funcionário neste mês.\n\n[OK] ATUALIZAR arquivo e imprimir.\n[Cancelar] Apenas IMPRIMIR cópia solta.', 'confirm',
                    () => { salvarNoHistorico(chaveRelatorio); executarImpressao(); },
                    () => { executarImpressao(); }
                );
            } else {
                ModalRH.show('Salvar Oficialmente?', 'Deseja salvar uma cópia deste Relatório no Arquivo Central?\n\n[OK] Sim, salvar e imprimir.\n[Cancelar] Não, apenas imprimir (Rascunho).', 'confirm',
                    () => { salvarNoHistorico(chaveRelatorio); executarImpressao(); },
                    () => { executarImpressao(); }
                );
            }
        }
    },

    imprimirExtrato: function () {
        if (!this.fechamentoAtual) return;
        const data = this.fechamentoAtual;
        const db = RHDb.get();
        const [ano, mes] = data.mesAno.split('-');

        const tituloOriginal = document.title;
        document.title = `Relatorio - ${data.func.nome} - ${mes}_${ano}`;

        let relatorioHTML = `
            <div style="font-family: Arial, sans-serif; padding: 0; color: #000; background: #fff;">
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 5px;">
                    <h2 style="margin: 0; text-transform: uppercase; color: #000;">KS AFINAÇÕES - EXTRATO DE ${data.func.tipo.toUpperCase()}</h2>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #000;"><strong>Funcionário:</strong> ${data.func.nome.toUpperCase()} | <strong>Mês de Referência:</strong> ${mes}/${ano}</p>
                </div>
        `;

        // ==========================================
        // TABELA 1: PRODUÇÃO OU PONTO
        // ==========================================
        if (data.func.tipo === 'Produção') {
            const producoes = db.lancamentosProducao.filter(lp => lp.idFunc === data.func.id && lp.data.startsWith(data.mesAno));
            producoes.sort((a, b) => new Date(a.data) - new Date(b.data));

            relatorioHTML += `
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; color: #000;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">Data</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; color: #000;">Descrição da Peça / Serviço</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">Qtd</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #000;">Val. Unit.</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #000;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (producoes.length === 0) {
                relatorioHTML += `<tr><td colspan="5" style="border: 1px solid #000; padding: 15px; text-align: center; color: #000;">Nenhum lançamento no período.</td></tr>`;
            } else {
                producoes.forEach(lp => {
                    relatorioHTML += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${lp.data.split('-').reverse().join('/')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: left; color: #000;">${lp.pecaCodigo} - ${lp.pecaNome.toUpperCase()}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${lp.qtd}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000;">R$ ${lp.valorUnit.toFixed(2).replace('.', ',')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000;">R$ ${lp.total.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
            }
            relatorioHTML += `</tbody></table>`;
        } else {
            relatorioHTML += `<h3 style="text-align: center; margin-top: 5px; margin-bottom: 5px; color: #000;">ESPELHO DE PONTO DETALHADO</h3>`;
            const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const cargo = db.cargos.find(c => c.id === data.func.cargoId);
            const numDias = new Date(ano, mes, 0).getDate();

            relatorioHTML += `
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; color: #000;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; color: #000;">Data</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">Entrada 1</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">Saída 1</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">Entrada 2</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">Saída 2</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #000;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let dia = 1; dia <= numDias; dia++) {
                const dataIso = `${ano}-${mes}-${dia.toString().padStart(2, '0')}`;
                const diaSemana = mapaDias[new Date(ano, mes - 1, dia).getDay()];

                const pontosDia = db.pontos.filter(p => p.idFunc === data.func.id && p.entrada.startsWith(dataIso));
                pontosDia.sort((a, b) => new Date(a.entrada) - new Date(b.entrada));

                let cargaReal = 0, tE1 = '-', tS1 = '-', tE2 = '-', tS2 = '-';
                pontosDia.forEach((p, i) => {
                    cargaReal += (new Date(p.saida) - new Date(p.entrada)) / 60000;
                    const hIn = p.entrada.split('T')[1].substring(0, 5);
                    const hOut = p.saida.split('T')[1].substring(0, 5);
                    if (i === 0) { tE1 = hIn; tS1 = hOut; }
                    if (i === 1) { tE2 = hIn; tS2 = hOut; }
                });

                let cargaExp = 0;
                if (cargo && cargo.escala && cargo.escala[diaSemana]) {
                    const turno = db.turnos.find(t => t.id === cargo.escala[diaSemana]);
                    if (turno && turno.carga) {
                        const [th, tm] = turno.carga.split(':').map(Number);
                        cargaExp = (th * 60) + tm;
                    }
                }

                if (cargaExp > 0 || cargaReal > 0) {
                    let saldoDia = cargaReal > 0 ? Math.round(cargaReal - cargaExp) : 0;
                    if (Math.abs(saldoDia) <= 10) saldoDia = 0;

                    const absS = Math.abs(saldoDia);
                    const saldoFormat = `${saldoDia < 0 ? '-' : '+'}${Math.floor(absS / 60).toString().padStart(2, '0')}:${(absS % 60).toString().padStart(2, '0')}h`;

                    relatorioHTML += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 6px; color: #000;"><strong>${dia.toString().padStart(2, '0')}/${mes}</strong> <span style="font-size:10px;">(${diaSemana.toUpperCase()})</span></td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${tE1}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${tS1}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${tE2}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${tS2}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000;">${cargaReal > 0 ? (saldoDia === 0 ? '00:00h' : saldoFormat) : 'Falta'}</td>
                        </tr>`;
                }
            }
            relatorioHTML += `</tbody></table>`;
        }

        // ==========================================
        // TABELA 2: DESCONTOS (SE HOUVER)
        // ==========================================
        let descontosTabelaHTML = '';
        if ((data.func.tipo === 'Mensalista' && data.saldoMinutos < 0) || (data.descontosManuais && data.descontosManuais.length > 0)) {
            descontosTabelaHTML += `
                <div style="page-break-inside: avoid;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; color: #000;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; color: #000;">Descrição do Desconto</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">Referência</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #d32f2f;">Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (data.func.tipo === 'Mensalista' && data.saldoMinutos < 0) {
                descontosTabelaHTML += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px; color: #000;">Atrasos e Faltas (Saldo Negativo)</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${data.saldoFormatado.replace('-', '')}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #d32f2f; font-weight: bold;">- R$ ${data.valorSaldoFinanceiro.toFixed(2).replace('.', ',')}</td>
                    </tr>
                `;
            }

            if (data.descontosManuais && data.descontosManuais.length > 0) {
                data.descontosManuais.forEach(desc => {
                    descontosTabelaHTML += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 6px; color: #000;">${desc.desc}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${desc.ref || '-'}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #d32f2f; font-weight: bold;">- R$ ${desc.valor.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
            }

            descontosTabelaHTML += `</tbody></table></div>`;
        }

        // ==========================================
        // RODAPÉ: LINHA ÚNICA LIMPA
        // ==========================================
        relatorioHTML += `
                ${descontosTabelaHTML}
                <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #000; page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #000;">
                        <span><strong>TOTAL VENCIMENTOS:</strong> R$ ${data.totalVencimentos.toFixed(2).replace('.', ',')}</span>
                        <span><strong>TOTAL DESCONTOS:</strong> <span style="color: #d32f2f;">- R$ ${data.somaDescontosManuais.toFixed(2).replace('.', ',')}</span></span>
                        <span style="font-size: 18px;"><strong>LÍQUIDO A PAGAR: R$ ${data.valorLiquido.toFixed(2).replace('.', ',')}</strong></span>
                    </div>
                </div>
            </div>
        `;

        const executarImpressao = () => {
            const area = document.getElementById('print-area-holerite');
            if (area) {
                area.innerHTML = relatorioHTML;

                const style = document.createElement('style');
                style.id = 'print-extrato-style';
                style.innerHTML = `
                    body.printing-extrato .app-container,
                    body.printing-extrato .modal-overlay { display: none !important; }
                    body.printing-extrato #print-area-holerite {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                    }
                    @media print {
                        @page { size: A4 portrait; margin: 15mm; }
                        body { background: #fff !important; }
                    }
                `;
                document.head.appendChild(style);

                document.body.className = 'printing-extrato';
                area.style.display = 'block';

                setTimeout(() => {
                    window.print();
                    document.title = tituloOriginal;
                    document.body.className = '';
                    area.style.display = 'none';
                    const styleEl = document.getElementById('print-extrato-style');
                    if (styleEl) styleEl.remove();
                }, 500);
            }
        };

        const salvarNoHistorico = (chave) => {
            const dbParaSalvar = RHDb.get();
            if (!dbParaSalvar.historico) dbParaSalvar.historico = [];

            const historicoObj = {
                id: Date.now().toString(),
                idOriginal: chave,
                timestamp: new Date().toISOString(),
                tipo: 'Relatório',
                mesRef: `${ano}-${mes}`,
                nome: data.func.nome,
                valorLiquido: data.valorLiquido,
                htmlImpressao: relatorioHTML
            };

            const idx = dbParaSalvar.historico.findIndex(h => h.idOriginal === chave);
            if (idx > -1) dbParaSalvar.historico[idx] = historicoObj;
            else dbParaSalvar.historico.push(historicoObj);

            RHDb.save(dbParaSalvar);
        };

        const dbBusca = RHDb.get();
        const chaveRelatorio = `relatorio_${data.func.id}_${ano}-${mes}`;
        const existente = (dbBusca.historico || []).find(h => h.idOriginal === chaveRelatorio);

        if (existente) {
            ModalRH.show('Atualizar Relatório?', 'Já existe um relatório de conferência salvo para este funcionário neste mês.\n\n[OK] ATUALIZAR arquivo e imprimir.\n[Cancelar] Apenas IMPRIMIR cópia solta.', 'confirm',
                () => { salvarNoHistorico(chaveRelatorio); executarImpressao(); },
                () => { executarImpressao(); }
            );
        } else {
            salvarNoHistorico(chaveRelatorio);
            executarImpressao();
        }
    },

};

// ==========================================
// MÓDULO: TURNOS
// ==========================================
const RH_Turnos = {
    calcularCarga: function (e1, s1, e2, s2) {
        const toMin = (t) => {
            if (!t) return 0;
            const [h, m] = t.split(':').map(Number);
            return (h * 60) + m;
        };
        const manha = toMin(s1) - toMin(e1);
        const tarde = toMin(s2) - toMin(e2);
        const total = (manha > 0 ? manha : 0) + (tarde > 0 ? tarde : 0);
        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    salvarTurno: function () {
        const id = document.getElementById('turno-id').value;
        const nome = document.getElementById('turno-nome').value.trim();
        const e1 = document.getElementById('turno-e1').value;
        const s1 = document.getElementById('turno-s1').value;
        const e2 = document.getElementById('turno-e2').value;
        const s2 = document.getElementById('turno-s2').value;

        if (!nome || !e1 || !s1 || !e2 || !s2) {
            ModalRH.show('Erro', 'Preencha todos os horários do turno.');
            return;
        }

        const db = RHDb.get();
        const carga = this.calcularCarga(e1, s1, e2, s2);

        const turnoObj = {
            id: id || 'T_' + Date.now(),
            nome, e1, s1, e2, s2, carga
        };

        if (id) {
            const idx = db.turnos.findIndex(t => t.id === id);
            if (idx > -1) db.turnos[idx] = turnoObj;
        } else {
            db.turnos.push(turnoObj);
        }

        RHDb.save(db);
        document.getElementById('form-turno').reset();
        document.getElementById('turno-id').value = '';
        this.renderTabela();
        RH_Cargos.popularSelectsTurnos();
    },

    excluirTurno: function (id) {
        ModalRH.show('Atenção', 'Deseja excluir este turno?', 'confirm', () => {
            const db = RHDb.get();
            const emUso = db.cargos.some(c => Object.values(c.escala).includes(id));
            if (emUso) {
                ModalRH.show('Erro', 'Turno em uso por um Cargo. Remova do cargo primeiro.');
                return;
            }
            db.turnos = db.turnos.filter(t => t.id !== id);
            RHDb.save(db);
            this.renderTabela();
            RH_Cargos.popularSelectsTurnos();
        });
    },

    renderTabela: function () {
        const db = RHDb.get();
        const tbody = document.querySelector('#tabela-turnos tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        db.turnos.forEach(t => {
            tbody.innerHTML += `<tr>
                <td>${t.nome}</td>
                <td>${t.e1}</td>
                <td>${t.s1}</td>
                <td>${t.e2}</td>
                <td>${t.s2}</td>
                <td style="color:var(--primary-color); font-weight:bold;">${t.carga}</td>
                <td>
                    <button class=\"btn-danger\" onclick=\"RH_Turnos.excluirTurno('${t.id}')\" style=\"padding:4px;\" title=\"Excluir\"><i data-lucide=\"trash-2\" style=\"width:14px;\"></i></button>
                </td>
            </tr>`;
        });
        lucide.createIcons();
    }
};

// ==========================================
// MÓDULO: CARGOS E ESCALAS
// ==========================================
const RH_Cargos = {
    popularSelectsTurnos: function () {
        const db = RHDb.get();
        const options = `<option value="">-- Folga / Extra --</option>` +
            db.turnos.map(t => `<option value="${t.id}">${t.nome} (${t.carga})</option>`).join('');

        const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
        dias.forEach(d => {
            const sel = document.getElementById(`cargo-${d}`);
            if (sel) {
                const val = sel.value;
                sel.innerHTML = options;
                sel.value = val;
            }
        });
    },

    salvarCargo: function () {
        const id = document.getElementById('cargo-id').value;
        const nome = document.getElementById('cargo-nome').value.trim();

        if (!nome) {
            ModalRH.show('Erro', 'Preencha o nome do cargo.');
            return;
        }

        const escala = {
            seg: document.getElementById('cargo-seg').value,
            ter: document.getElementById('cargo-ter').value,
            qua: document.getElementById('cargo-qua').value,
            qui: document.getElementById('cargo-qui').value,
            sex: document.getElementById('cargo-sex').value,
            sab: document.getElementById('cargo-sab').value,
            dom: document.getElementById('cargo-dom').value
        };

        const db = RHDb.get();
        const cargoObj = {
            id: id || 'C_' + Date.now(),
            nome,
            escala
        };

        if (id) {
            const idx = db.cargos.findIndex(c => c.id === id);
            if (idx > -1) db.cargos[idx] = cargoObj;
        } else {
            db.cargos.push(cargoObj);
        }

        RHDb.save(db);
        document.getElementById('form-cargo').reset();
        document.getElementById('cargo-id').value = '';
        this.renderTabela();
        RH.popularSelectCargos();
    },

    excluirCargo: function (id) {
        ModalRH.show('Atenção', 'Deseja excluir este cargo?', 'confirm', () => {
            const db = RHDb.get();
            const emUso = db.funcionarios.some(f => f.cargoId === id);
            if (emUso) {
                ModalRH.show('Erro', 'Este cargo está atribuído a um funcionário. Altere o funcionário primeiro.');
                return;
            }
            db.cargos = db.cargos.filter(c => c.id !== id);
            RHDb.save(db);
            this.renderTabela();
            RH.popularSelectCargos();
        });
    },

    renderTabela: function () {
        const db = RHDb.get();
        const tbody = document.querySelector('#tabela-cargos tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        db.cargos.forEach(c => {
            // Função para pegar o nome do turno ou "Folga"
            const getT = (idT) => idT ? (db.turnos.find(t => t.id === idT)?.nome || 'Folga') : 'Folga';
            const resumo = `Seg-Qui: ${getT(c.escala.seg)} | Sex: ${getT(c.escala.sex)}`;

            tbody.innerHTML += `<tr>
                <td><strong>${c.nome}</strong></td>
                <td style="font-size: 12px; color: var(--text-muted);">${resumo}</td>
                <td>
                    <button class=\"btn-danger\" onclick=\"RH_Cargos.excluirCargo('${c.id}')\" style=\"padding:4px;\" title=\"Excluir\"><i data-lucide=\"trash-2\" style=\"width:14px;\"></i></button>
                </td>
            </tr>`;
        });
        lucide.createIcons();
    }
};

// ==========================================
// MÓDULO: EMPREITA AVULSA (TERCEIRIZADOS)
// ==========================================
const RH_Empreita = {
    itens: [],
    sugestaoIndex: -1,

    // Motor Inteligente para Converter Número em Texto (Ex: 200 -> duzentos reais)
    valorPorExtenso: function (numero) {
        const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
        const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
        const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

        if (numero === 0) return "zero reais";

        function converterGrupo(n) {
            if (n === 100) return "cem";
            let c = Math.floor(n / 100);
            let d = Math.floor((n % 100) / 10);
            let u = n % 10;
            let res = [];

            if (c > 0) res.push(centenas[c]);
            if (d === 1) {
                res.push(unidades[n % 100]);
            } else {
                if (d > 1) res.push(dezenas[d]);
                if (u > 0) res.push(unidades[u]);
            }
            return res.join(" e ");
        }

        let reais = Math.floor(numero);
        let centavos = Math.round((numero - reais) * 100);
        let partes = [];

        if (reais > 0) {
            let milhoes = Math.floor(reais / 1000000);
            let milhares = Math.floor((reais % 1000000) / 1000);
            let resto = reais % 1000;

            let reaisExtenso = [];
            if (milhoes > 0) reaisExtenso.push(converterGrupo(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
            if (milhares > 0) reaisExtenso.push((milhares === 1 ? "um" : converterGrupo(milhares)) + " mil");
            if (resto > 0) {
                let prefix = (reaisExtenso.length > 0 && (resto < 100 || resto % 100 === 0)) ? " e " : (reaisExtenso.length > 0 ? " " : "");
                reaisExtenso.push(prefix + converterGrupo(resto));
            }
            let strReais = reaisExtenso.join("").replace(/  +/g, ' ').trim();
            strReais += (reais === 1 ? " real" : " reais");
            partes.push(strReais);
        }

        if (centavos > 0) {
            let strCentavos = converterGrupo(centavos) + (centavos === 1 ? " centavo" : " centavos");
            partes.push(strCentavos);
        }

        return partes.join(" e ");
    },

    toggleCampos: function () {
        const formato = document.getElementById('emp-formato').value;
        const container = document.getElementById('emp-campos-dinamicos');

        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.alignItems = 'flex-end';
        container.style.flex = '1';

        if (formato === 'hora') {
            container.innerHTML = `
                <div style="flex: 2; min-width: 150px;">
                    <label>Descrição do Serviço</label>
                    <input type="text" id="emp-desc" placeholder="Ex: Diária" style="margin-bottom: 0; width: 100%;">
                </div>
                <div style="flex: 0.8; min-width: 80px;">
                    <label>Total de Horas</label>
                    <input type="number" id="emp-qtd" min="0.1" step="0.1" placeholder="Ex: 8.5" style="margin-bottom: 0; width: 100%;">
                </div>
                <div style="flex: 1; min-width: 100px;">
                    <label>Valor/Hora (R$)</label>
                    <input type="number" id="emp-valor" min="0.1" step="0.01" placeholder="Ex: 25.00" style="margin-bottom: 0; width: 100%;">
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="flex: 2; min-width: 150px; position: relative;">
                    <label>Busca (Cód ou Nome)</label>
                    <input type="text" id="emp-desc" placeholder="Ex: 6161 ou Corpo" onkeyup="RH_Empreita.filtrarPecas(event)" onkeydown="RH_Empreita.navegarSugestoes(event)" autocomplete="off" style="margin-bottom: 0; width: 100%;">
                    <ul id="sugestoes-pecas-emp" class="sugestao-lista" style="display: none; top: calc(100% + 2px);"></ul>
                </div>
                <div style="flex: 0.8; min-width: 70px;">
                    <label>Qtd.</label>
                    <input type="number" id="emp-qtd" min="1" step="1" placeholder="Ex: 50" style="margin-bottom: 0; width: 100%;">
                </div>
                <div style="flex: 0.8; min-width: 70px;">
                    <label>Caixas</label>
                    <input type="number" id="emp-caixas" min="1" value="1" style="margin-bottom: 0; width: 100%;">
                </div>
                <div style="flex: 1; min-width: 90px;">
                    <label>Val. Unit. (R$)</label>
                    <input type="number" id="emp-valor" min="0.00" step="0.01" placeholder="Ex: 1.50" style="margin-bottom: 0; width: 100%;">
                </div>
            `;
        }
    },

    filtrarPecas: function (event) {
        if (event && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) return;

        this.sugestaoIndex = -1;
        const input = document.getElementById('emp-desc');
        const termo = input.value.trim().toLowerCase();
        const lista = document.getElementById('sugestoes-pecas-emp');
        const dadosERP = JSON.parse(localStorage.getItem('ks_afinacoes_dados')) || { produtos: [] };

        if (!termo) { lista.style.display = 'none'; return; }

        // Igual ao original: Filtra apenas pelo CÓDIGO que COMEÇA com o termo digitado
        const filtrados = dadosERP.produtos.filter(p => String(p.codigo).toLowerCase().startsWith(termo));

        if (filtrados.length > 0) {
            lista.innerHTML = '';
            filtrados.forEach((prod, index) => {
                const li = document.createElement('li');
                li.innerText = `${prod.codigo} - ${prod.nome}`;
                li.className = 'sugestao-item';

                li.dataset.codigo = prod.codigo;
                li.dataset.nome = prod.nome;
                li.dataset.valor = prod.valProducao || 0;

                // Destaca apenas o termo digitado, APENAS no começo da string
                const regex = new RegExp(`^(${termo})`, "i");
                li.innerHTML = li.innerText.replace(regex, "<strong>$1</strong>");

                li.onmouseenter = () => {
                    this.sugestaoIndex = index;
                    this.atualizarSelecaoVisual(lista.getElementsByTagName('li'), index);
                };

                li.onclick = () => {
                    this.selecionarPeca(prod);
                };
                lista.appendChild(li);
            });
            lista.style.display = 'block';
        } else {
            lista.style.display = 'none';
        }
    },

    navegarSugestoes: function (event) {
        const lista = document.getElementById('sugestoes-pecas-emp');
        if (!lista || lista.style.display === 'none') return;

        const items = lista.getElementsByTagName('li');
        if (items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.sugestaoIndex++;
            if (this.sugestaoIndex >= items.length) this.sugestaoIndex = 0;
            this.atualizarSelecaoVisual(items, this.sugestaoIndex);
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.sugestaoIndex--;
            if (this.sugestaoIndex < 0) this.sugestaoIndex = items.length - 1;
            this.atualizarSelecaoVisual(items, this.sugestaoIndex);
        }
        else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            if (this.sugestaoIndex >= 0 && this.sugestaoIndex < items.length) {
                items[this.sugestaoIndex].click();
            } else if (items.length > 0) {
                items[0].click();
            }
        }
    },

    atualizarSelecaoVisual: function (items, indexAtual) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('selecionado');
        }
        if (indexAtual >= 0 && indexAtual < items.length) {
            const selecionado = items[indexAtual];
            selecionado.classList.add('selecionado');
            selecionado.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    selecionarPeca: function (prod) {
        document.getElementById('emp-desc').value = `${prod.codigo} - ${prod.nome}`;
        document.getElementById('emp-valor').value = prod.valProducao || 0;
        document.getElementById('sugestoes-pecas-emp').style.display = 'none';
        document.getElementById('emp-qtd').focus();
    },

    adicionarItem: function () {
        const prestador = document.getElementById('emp-nome').value.trim();
        if (!prestador) {
            ModalRH.show('Aviso', 'Preencha o nome do prestador primeiro.');
            return;
        }

        const desc = document.getElementById('emp-desc').value.trim();
        const qtd = parseFloat(document.getElementById('emp-qtd').value);
        const valor = parseFloat(document.getElementById('emp-valor').value);
        const formato = document.getElementById('emp-formato').value;
        const caixas = formato === 'producao' ? (parseInt(document.getElementById('emp-caixas').value) || 1) : 1;

        if (!desc || isNaN(qtd) || isNaN(valor) || qtd <= 0 || valor < 0) {
            ModalRH.show('Aviso', 'Preencha a descrição, quantidade e valor corretamente.');
            return;
        }

        const subtotal = qtd * valor;

        for (let i = 0; i < caixas; i++) {
            this.itens.push({
                id: Date.now() + Math.random(),
                formato: formato,
                desc: desc,
                qtd: qtd,
                valor: valor,
                subtotal: subtotal
            });
        }

        document.getElementById('emp-desc').value = '';
        document.getElementById('emp-qtd').value = '';
        document.getElementById('emp-desc').focus();
        document.getElementById('emp-valor').value = '';
        if (formato === 'producao') {
            document.getElementById('emp-caixas').value = '1';
        }

        this.renderTabela();
    },

    removerItem: function (id) {
        this.itens = this.itens.filter(i => i.id !== id);
        this.renderTabela();
    },

    renderTabela: function () {
        const tbody = document.getElementById('lista-itens-empreita');
        if (!tbody) return;

        let html = '';
        let total = 0;

        this.itens.forEach(item => {
            total += item.subtotal;
            const formatoLabel = item.formato === 'hora' ? 'h' : 'un';
            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td>${item.desc.toUpperCase()}</td>
                    <td>${item.qtd} ${formatoLabel}</td>
                    <td>R$ ${item.valor.toFixed(2).replace('.', ',')}</td>
                    <td style="color: var(--success-color); font-weight: bold;">R$ ${item.subtotal.toFixed(2).replace('.', ',')}</td>
                    <td>
                        <button class="btn-danger" onclick="RH_Empreita.removerItem(${item.id})" style="padding:4px;" title="Remover"><i data-lucide="trash-2" style="width:14px;"></i></button>
                    </td>
                </tr>
            `;
        });

        if (this.itens.length === 0) {
            html = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">Nenhum serviço adicionado.</td></tr>`;
        }

        tbody.innerHTML = html;
        document.getElementById('empreita-total-display').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
        lucide.createIcons();
    },

    gerarRecibo: function () {
        const prestador = document.getElementById('emp-nome').value.trim();
        if (!prestador || this.itens.length === 0) {
            ModalRH.show('Erro', 'Preencha o nome do prestador e adicione ao menos um serviço na lista.');
            return;
        }

        const totalGeral = this.itens.reduce((acc, item) => acc + item.subtotal, 0);
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const valorExtenso = this.valorPorExtenso(totalGeral);

        const tituloOriginal = document.title;
        document.title = `Recibo_Empreita_${prestador.replace(/\s+/g, '_')}_${dataHoje.replace(/\//g, '_')}`;

        // Usa estritamente 1px solid #000 para não haver bordas grossas desiguais
        let itensHTML = '';
        this.itens.forEach(item => {
            const formatoLabel = item.formato === 'hora' ? 'h' : 'un';
            itensHTML += `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; color: #000; font-weight: bold;">${item.desc.toUpperCase()}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; color: #000; font-weight: bold;">${item.qtd} ${formatoLabel}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #000; font-weight: bold;">R$ ${item.valor.toFixed(2).replace('.', ',')}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #000; font-weight: bold;">R$ ${item.subtotal.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });

        // Box usa height: 100% e display flex para esticar até o fim. O margin-top: auto joga as assinaturas para o chão da via.
        const generateVia = (viaName) => `
            <div style="border: 2px solid #000; padding: 15px; background: #fff; width: 100%; box-sizing: border-box; height: 100%; display: flex; flex-direction: column;">
                
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px;">
                    <h1 style="margin: 0; text-transform: uppercase; color: #000; font-size: 18px; font-weight: bold;">KS AFINAÇÕES - RECIBO DE PRESTAÇÃO DE SERVIÇOS</h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #000; font-weight: bold;">Estância Triângulo - Estrada, Rodovia - Santa Isabel do Ivaí a Loanda - PR | CNPJ: 42.360.395/0001-83</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: bold; color: #000; text-decoration: underline;">${viaName}</p>
                </div>

                <div style="margin-bottom: 15px; font-size: 14px; color: #000; display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 10px;">
                    <p style="margin: 0; font-weight: bold; color: #000;">PRESTADOR: <span style="text-transform: uppercase;">${prestador}</span></p>
                    <p style="margin: 0; font-weight: bold; color: #000;">DATA DE EMISSÃO: ${dataHoje}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; color: #000;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; color: #000;">DESCRIÇÃO DO SERVIÇO / PEÇA</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #000;">QTD</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #000;">VALOR UNIT.</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #000;">SUBTOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensHTML}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 14px; color: #000;">TOTAL A PAGAR:</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 14px; color: #000;">R$ ${totalGeral.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: auto; color: #000; padding-top: 15px;">
                    <p style="font-size: 14px; line-height: 1.6; text-align: justify; margin-bottom: 35px; color: #000; font-weight: bold;">
                        Recebi de KS Afinações a quantia de R$ ${totalGeral.toFixed(2).replace('.', ',')} (${valorExtenso}), 
                        referente aos serviços prestados descritos acima. E, por ser verdade, firmo o presente recibo.
                    </p>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <div style="width: 60%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 12px; color: #000; font-weight: bold;">
                            <span style="text-transform: uppercase;">${prestador}</span><br>Assinatura do Prestador
                        </div>
                        <div style="width: 30%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 12px; color: #000; font-weight: bold;">
                            DATA
                        </div>
                    </div>
                </div>
            </div>
        `;

        const executarImpressao = () => {
            const area = document.getElementById('print-area-holerite');
            if (area) {
                area.innerHTML = relatorioHTML;
                const style = document.createElement('style');
                style.id = 'print-extrato-style';
                style.innerHTML = `
                    body.printing-extrato .app-container, body.printing-extrato .modal-overlay { display: none !important; }
                    body.printing-extrato #print-area-holerite { display: block !important; position: static !important; width: 100% !important; height: auto !important; padding: 0 !important; box-sizing: border-box !important; }
                    @media print { @page { size: A4 portrait; margin: 15mm; } body { background: #fff !important; } }
                `;
                document.head.appendChild(style);
                document.body.className = 'printing-extrato';
                area.style.display = 'block';

                setTimeout(() => {
                    window.print();
                    document.title = tituloOriginal;
                    document.body.className = '';
                    area.style.display = 'none';
                    const styleEl = document.getElementById('print-extrato-style');
                    if (styleEl) styleEl.remove();
                }, 500);
            }
        };

        const salvarNoHistorico = (chave) => {
            const dbParaSalvar = RHDb.get();
            if (!dbParaSalvar.historico) dbParaSalvar.historico = [];

            const historicoObj = {
                id: Date.now().toString(),
                idOriginal: chave,
                timestamp: new Date().toISOString(),
                tipo: 'Relatório', // Tipo específico para o Extrato/Espelho
                mesRef: `${ano}-${mes}`,
                nome: data.func.nome,
                valorLiquido: data.valorLiquido,
                htmlImpressao: relatorioHTML // Salva a tabela limpa
            };

            const idx = dbParaSalvar.historico.findIndex(h => h.idOriginal === chave);
            if (idx > -1) dbParaSalvar.historico[idx] = historicoObj;
            else dbParaSalvar.historico.push(historicoObj);

            RHDb.save(dbParaSalvar);
        };

        // TRAVA DE SEGURANÇA E SALVAMENTO
        const dbBusca = RHDb.get();
        const chaveRelatorio = `relatorio_${data.func.id}_${ano}-${mes}`;
        const existente = (dbBusca.historico || []).find(h => h.idOriginal === chaveRelatorio);

        if (existente) {
            ModalRH.show('Atualizar Relatório?', 'Já existe um relatório de conferência salvo para este funcionário neste mês.\n\n[OK] ATUALIZAR arquivo e imprimir.\n[Cancelar] Apenas IMPRIMIR cópia solta.', 'confirm',
                () => { salvarNoHistorico(chaveRelatorio); executarImpressao(); },
                () => { executarImpressao(); }
            );
        } else {
            salvarNoHistorico(chaveRelatorio);
            executarImpressao();
        }

        // PERGUNTA DE SALVAMENTO PARA EMPREITA E INTEGRAÇÃO FINANCEIRA
        ModalRH.show('Salvar Oficialmente?', 'Deseja salvar uma cópia deste Recibo no Arquivo Central e enviá-lo ao Financeiro?\n\n[OK] Sim, salvar e imprimir.\n[Cancelar] Não, apenas imprimir (Rascunho).', 'confirm',
            () => {
                const dbParaSalvar = RHDb.get();
                if (!dbParaSalvar.historico) dbParaSalvar.historico = [];
                dbParaSalvar.historico.push({
                    id: Date.now().toString(),
                    idOriginal: `empreita_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    tipo: 'Empreita',
                    mesRef: dataIso,
                    nome: prestador,
                    valorLiquido: totalGeral,
                    htmlImpressao: htmlCompleto
                });
                RHDb.save(dbParaSalvar);

                // --- INTEGRAÇÃO FINANCEIRA (AUTOMÁTICA E PAGA) ---
                const dbFinRaw = localStorage.getItem('ks_financeiro_dados');
                let dbFin = { despesas: [] };
                if (dbFinRaw) {
                    dbFin = JSON.parse(dbFinRaw);
                    if (!dbFin.despesas) dbFin.despesas = [];
                }
                dbFin.despesas.push({
                    id: 'EMP_' + Date.now(),
                    descricao: `Pagamento Empreita: ${prestador}`,
                    categoria: 'RH',
                    valor: totalGeral,
                    vencimento: new Date().toISOString().split('T')[0],
                    pago: true, // Já entra como PAGO no Fechamento
                    cancelada: false
                });
                localStorage.setItem('ks_financeiro_dados', JSON.stringify(dbFin));

                executarImpressao();
            },
            () => { executarImpressao(); }
        )
    }
};

// ==========================================
// MÓDULO: ARQUIVO CENTRAL (HISTÓRICO)
// ==========================================
const RH_Historico = {
    documentoVisualizadoId: null,

    renderTabela: function () {
        const db = RHDb.get();
        if (!db.historico) db.historico = [];

        const mes = document.getElementById('filtro-hist-mes').value;
        const tipo = document.getElementById('filtro-hist-tipo').value;
        const nomeBusca = document.getElementById('filtro-hist-nome').value.trim().toLowerCase();

        const tbody = document.getElementById('lista-historico');
        if (!tbody) return;

        let html = '';
        let historico = db.historico;

        // Ordena do mais novo pro mais antigo
        historico.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        historico.forEach(h => {
            if (mes && h.mesRef !== mes) return;
            if (tipo && h.tipo !== tipo) return;
            if (nomeBusca && !h.nome.toLowerCase().includes(nomeBusca)) return;

            let corTipo = '#94a3b8';
            if (h.tipo === 'Holerite') corTipo = 'var(--primary-color)';
            if (h.tipo === 'Empreita') corTipo = '#38bdf8';
            if (h.tipo === 'Relatório') corTipo = '#a855f7';

            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="font-size: 13px;">${new Date(h.timestamp).toLocaleDateString('pt-BR')} ${new Date(h.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span style="border: 1px solid ${corTipo}; color: ${corTipo}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${h.tipo}</span></td>
                    <td>${h.mesRef ? h.mesRef.split('-').reverse().join('/') : '-'}</td>
                    <td><strong>${h.nome}</strong></td>
                    <td style="color: var(--success-color); font-weight: bold; text-align: right;">R$ ${h.valorLiquido.toFixed(2).replace('.', ',')}</td>
                    <td style="text-align: center;">
                        <div style="display:flex; gap:8px; justify-content: center;">
                            <button class="btn-outline" style="border-color: #10b981; color: #10b981; padding: 4px;" onclick="RH_Historico.visualizar('${h.id}')" title="Visualizar Documento">
                                <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="btn-danger" style="padding: 4px;" onclick="RH_Historico.excluir('${h.id}')" title="Excluir Definitivamente">
                                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        if (html === '') {
            html = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px;">Nenhum documento salvo encontrado com estes filtros.</td></tr>`;
        }

        tbody.innerHTML = html;
        lucide.createIcons();
    },

    excluir: function (id) {
        ModalRH.show('Atenção', 'Tem certeza que deseja excluir permanentemente este documento do Arquivo Central?', 'confirm', () => {
            const db = RHDb.get();
            db.historico = db.historico.filter(h => h.id !== id);
            RHDb.save(db);
            this.renderTabela();
        });
    },

    visualizar: function (id) {
        const db = RHDb.get();
        const doc = db.historico.find(h => h.id === id);
        if (!doc) return;

        this.documentoVisualizadoId = id; // Guarda o ID para a impressora usar

        document.getElementById('preview-title').innerText = `Visualização: ${doc.tipo} - ${doc.nome.toUpperCase()}`;
        document.getElementById('preview-content').innerHTML = doc.htmlImpressao;

        document.getElementById('modal-preview-doc').style.display = 'flex';
    },

    imprimirPreview: function () {
        if (!this.documentoVisualizadoId) return;

        const db = RHDb.get();
        const doc = db.historico.find(h => h.id === this.documentoVisualizadoId);
        if (!doc) return;

        const tituloOriginal = document.title;
        document.title = `REIMPRESSAO_${doc.tipo}_${doc.nome.replace(/\s+/g, '_')}`;

        const area = document.getElementById('print-area-holerite');
        if (area) {
            area.innerHTML = doc.htmlImpressao;

            const style = document.createElement('style');
            style.id = 'print-reprint-style';

            // Ajusta o CSS da página física de acordo com o documento salvo
            if (doc.tipo === 'Holerite') {
                style.innerHTML = `
                    body.printing-holerite .app-container, body.printing-holerite .modal-overlay { display: none !important; }
                    body.printing-holerite #print-area-holerite { display: flex !important; flex-direction: column !important; justify-content: space-between !important; position: relative !important; width: 100% !important; height: 99% !important; padding: 2px !important; box-sizing: border-box !important; }
                    @media print { @page { size: A4 portrait; margin: 0 !important; } body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; height: 100% !important; } }
                `;
                document.body.className = 'printing-holerite';
            } else if (doc.tipo === 'Empreita') {
                style.innerHTML = `
                    body.printing-empreita .app-container, body.printing-empreita .modal-overlay { display: none !important; }
                    body.printing-empreita #print-area-holerite { display: flex !important; flex-direction: column !important; justify-content: space-between !important; width: 100% !important; height: 98vh !important; box-sizing: border-box !important; padding: 0 !important; margin: 0 !important; }
                    @media print { @page { size: A4 portrait; margin: 10mm !important; } body { background: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; } }
                `;
                document.body.className = 'printing-empreita';
            } else {
                // Relatório Normal
                style.innerHTML = `
                    body.printing-extrato .app-container, body.printing-extrato .modal-overlay { display: none !important; }
                    body.printing-extrato #print-area-holerite { display: block !important; position: static !important; width: 100% !important; height: auto !important; padding: 0 !important; box-sizing: border-box !important; }
                    @media print { @page { size: A4 portrait; margin: 15mm; } body { background: #fff !important; } }
                `;
                document.body.className = 'printing-extrato';
            }

            document.head.appendChild(style);
            area.style.display = 'block';

            setTimeout(() => {
                window.print();
                document.title = tituloOriginal;
                document.body.className = '';
                area.style.display = 'none';
                if (document.getElementById('print-reprint-style')) document.getElementById('print-reprint-style').remove();

                // Opcional: Fecha o modal de preview após imprimir
                document.getElementById('modal-preview-doc').style.display = 'none';
            }, 500);
        }
    }
};

window.onload = () => RH.init();
