lucide.createIcons();

const ModalEstoque = {
    keydownListener: null,
    show: function (title, message, type = 'alert', onConfirm = null) {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;
        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        btnCancel.style.display = type === 'confirm' ? 'inline-block' : 'none';

        btnConfirm.onclick = () => {
            this.hide();
            if (onConfirm) onConfirm();
        };
        btnCancel.onclick = () => this.hide();
        modal.style.display = 'flex';
        btnConfirm.focus();

        if (this.keydownListener) document.removeEventListener('keydown', this.keydownListener);
        this.keydownListener = (e) => {
            if (modal.style.display === 'flex') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (document.activeElement === btnCancel) btnCancel.click();
                    else btnConfirm.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    btnCancel.click();
                } else if (type === 'confirm' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    e.preventDefault();
                    if (document.activeElement === btnConfirm) btnCancel.focus();
                    else btnConfirm.focus();
                }
            }
        };
        document.addEventListener('keydown', this.keydownListener);
    },

    // NOVO: Função para substituir o prompt feio do Windows!
    prompt: function (title, messageHtml, defaultValue, onConfirm) {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;

        // Injeta o HTML com o input bonitão dentro do modal
        document.getElementById('modal-message').innerHTML = `
            <div style="margin-bottom: 15px; font-size: 14px; color: var(--text-main);">${messageHtml}</div>
            <input type="number" id="modal-input-prompt" value="${defaultValue}" style="width: 100%; padding: 12px; background: #0b1017; border: 1px solid #334155; color: #10b981; border-radius: 6px; outline: none; font-size: 20px; font-weight: bold; text-align: center;">
        `;

        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        btnCancel.style.display = 'inline-block';

        btnConfirm.onclick = () => {
            const val = document.getElementById('modal-input-prompt').value;
            this.hide();
            document.getElementById('modal-message').innerHTML = ''; // Limpa pra não vazar HTML nos outros alertas
            if (onConfirm) onConfirm(val);
        };

        btnCancel.onclick = () => {
            this.hide();
            document.getElementById('modal-message').innerHTML = '';
        };

        modal.style.display = 'flex';

        // Dá o foco automático no input e já seleciona o número para facilitar a digitação
        setTimeout(() => {
            const inp = document.getElementById('modal-input-prompt');
            if (inp) { inp.focus(); inp.select(); }
        }, 50);

        if (this.keydownListener) document.removeEventListener('keydown', this.keydownListener);
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
        if (this.keydownListener) document.removeEventListener('keydown', this.keydownListener);
    }
};

// Motores de Banco de Dados
const DB_ESTOQUE = {
    KEY: 'ks_estoque_dados',
    get: function () {
        const data = localStorage.getItem(this.KEY);
        const parsed = data ? JSON.parse(data) : { insumos: [], logsInsumos: [], logsPecas: [] };
        if (!parsed.insumos) parsed.insumos = [];
        if (!parsed.logsInsumos) parsed.logsInsumos = [];
        if (!parsed.logsPecas) parsed.logsPecas = [];
        return parsed;
    },
    save: function (data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
        // Dispara o AutoSave do ERP
        if (typeof DB !== 'undefined' && DB.save) DB.save(DB.get());
    }
};

const LerERP = () => {
    const data = localStorage.getItem('ks_afinacoes_dados');
    return data ? JSON.parse(data) : { produtos: [], clientes: [] };
};

const LerRH = () => {
    const data = localStorage.getItem('ks_rh_dados');
    return data ? JSON.parse(data) : { funcionarios: [] };
};

const Estoque_UI = {
    switchTab: function (tabId) {
        // 1. Esconde tudo e tira a cor de todos os botões
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // 2. Acha o botão exato que foi clicado (ou chamado pelo carregamento) e pinta ele
        const targetBtn = document.querySelector(`button[onclick*="Estoque_UI.switchTab('${tabId}')"]`);
        if (targetBtn) targetBtn.classList.add('active');

        // 3. Mostra a tela correta
        const tabElement = document.getElementById(`tab-${tabId}`);
        if (tabElement) tabElement.classList.add('active');

        // 4. Carrega os dados da tela correspondente
        if (tabId === 'painel') Estoque.renderPainel();
        if (tabId === 'itens') Estoque.renderInsumos();
        if (tabId === 'entrada' || tabId === 'saida') {
            Estoque.renderSelects();
            const dataLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            if (document.getElementById('ent-data')) document.getElementById('ent-data').value = dataLocal;
            if (document.getElementById('sai-data')) document.getElementById('sai-data').value = dataLocal;
        }
        if (tabId === 'historico') Estoque.renderHistorico();

        if (tabId === 'relatorio') {
            const dataMes = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().substring(0, 7);
            document.getElementById('relatorio-mes').value = dataMes;
            Estoque.gerarRelatorioMensal();
        }
    }
};

const Estoque = {
    calcularEstoqueInsumo: function (idInsumo) {
        const db = DB_ESTOQUE.get();
        let saldo = 0;
        [...db.logsInsumos].reverse().forEach(log => {
            if (log.idInsumo === idInsumo) {
                if (log.tipo === 'Entrada') saldo += log.qtd;
                if (log.tipo === 'Saída') saldo -= log.qtd;
            }
        });
        return saldo;
    },

    calcularEstoquePeca: function (codigoPeca) {
        const db = DB_ESTOQUE.get();
        let saldo = 0;
        [...db.logsPecas].reverse().forEach(log => {
            if (String(log.codigoPeca) === String(codigoPeca)) {
                if (log.tipo === 'Entrada') saldo += log.qtd;
                if (log.tipo === 'Saída') saldo -= log.qtd;
            }
        });
        return saldo;
    },

    salvarInsumo: function () {
        const id = document.getElementById('ins-id').value;
        const nome = document.getElementById('ins-nome').value.trim();
        const unidade = document.getElementById('ins-unidade').value;
        const minimo = parseFloat(document.getElementById('ins-minimo').value);
        const repasse = parseFloat(document.getElementById('ins-repasse').value) || 0;

        if (!nome || isNaN(minimo)) { ModalEstoque.show('Erro', 'Preencha nome e estoque mínimo.'); return; }

        const db = DB_ESTOQUE.get();
        const insumoObj = { id: id || 'INS_' + Date.now(), nome, unidade, minimo, repasse };

        if (id) {
            const idx = db.insumos.findIndex(i => i.id === id);
            if (idx > -1) db.insumos[idx] = insumoObj;
        } else {
            db.insumos.push(insumoObj);
        }

        DB_ESTOQUE.save(db);
        document.getElementById('ins-id').value = '';
        document.getElementById('ins-nome').value = '';
        document.getElementById('ins-minimo').value = '';
        document.getElementById('ins-repasse').value = '';

        this.renderInsumos();
        ModalEstoque.show('Sucesso', 'Insumo salvo!');
    },

    excluirInsumo: function (id) {
        ModalEstoque.show('Atenção', 'Deseja excluir este insumo? O histórico financeiro dele será mantido intacto.', 'confirm', () => {
            const db = DB_ESTOQUE.get();
            db.insumos = db.insumos.filter(i => i.id !== id);
            DB_ESTOQUE.save(db);
            this.renderInsumos();
        });
    },

    editarInsumo: function (id) {
        const db = DB_ESTOQUE.get();
        const ins = db.insumos.find(i => i.id === id);
        if (ins) {
            document.getElementById('ins-id').value = ins.id;
            document.getElementById('ins-nome').value = ins.nome;
            document.getElementById('ins-unidade').value = ins.unidade;
            document.getElementById('ins-minimo').value = ins.minimo;
            document.getElementById('ins-repasse').value = ins.repasse;
            window.scrollTo(0, 0);
        }
    },

    renderInsumos: function () {
        const db = DB_ESTOQUE.get();
        const tbody = document.querySelector('#tabela-insumos tbody');
        if (!tbody) return;

        tbody.innerHTML = db.insumos.map(i => {
            return `<tr>
                <td><strong>${i.nome}</strong></td>
                <td>${i.unidade}</td>
                <td>${i.minimo}</td>
                <td style="color:#ef4444;">R$ ${i.repasse.toFixed(2).replace('.', ',')}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button onclick="Estoque.editarInsumo('${i.id}')" style="background:transparent; border:none; color:#38bdf8; cursor:pointer;"><i data-lucide="pencil" style="width:16px;"></i></button>
                        <button onclick="Estoque.excluirInsumo('${i.id}')" style="background:transparent; border:none; color:#ef4444; cursor:pointer;"><i data-lucide="trash-2" style="width:16px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    },

    toggleTipoEntrada: function () {
        const tipo = document.querySelector('input[name="tipo-entrada"]:checked').value;
        const divTotal = document.getElementById('div-ent-total');
        const inputTotal = document.getElementById('ent-total');
        const labelItem = document.getElementById('label-ent-item');
        const divCliente = document.getElementById('div-ent-cliente');

        if (tipo === 'insumo') {
            divTotal.style.display = 'block';
            inputTotal.required = true;
            labelItem.innerText = 'Selecione o Insumo';
            divCliente.style.display = 'none';
            document.getElementById('ent-cliente').required = false;
        } else {
            divTotal.style.display = 'none';
            inputTotal.required = false;
            inputTotal.value = '';
            labelItem.innerText = 'Selecione o Produto (Peça)';
            divCliente.style.display = 'block';
            document.getElementById('ent-cliente').required = true;
        }
        this.renderSelects();
    },

    renderSelects: function () {
        const db = DB_ESTOQUE.get();
        const erp = LerERP();
        const rh = LerRH();

        // Selects da Entrada
        const tipoEntradaRadio = document.querySelector('input[name="tipo-entrada"]:checked');
        if (tipoEntradaRadio && document.getElementById('ent-item')) {
            const tipo = tipoEntradaRadio.value;
            if (tipo === 'insumo') {
                document.getElementById('ent-item').innerHTML = '<option value="">-- Escolha o Insumo --</option>' +
                    db.insumos.map(i => `<option value="${i.id}">${i.nome} (Atual: ${this.calcularEstoqueInsumo(i.id)} ${i.unidade})</option>`).join('');
            } else {
                document.getElementById('ent-item').innerHTML = '<option value="">-- Escolha a Peça --</option>' +
                    erp.produtos.map(p => `<option value="${p.codigo}">${p.codigo} - ${p.nome}</option>`).join('');
                document.getElementById('ent-cliente').innerHTML = '<option value="">-- Cliente Origem --</option>' +
                    erp.clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
            }
        }

        // Selects da Saída (Apenas Insumos)
        if (document.getElementById('sai-item')) {
            document.getElementById('sai-item').innerHTML = '<option value="">-- Selecione o Insumo --</option>' +
                db.insumos.map(i => `<option value="${i.id}">${i.nome} (Atual: ${this.calcularEstoqueInsumo(i.id)} ${i.unidade})</option>`).join('');
        }

        if (document.getElementById('sai-func')) {
            document.getElementById('sai-func').innerHTML = '<option value="">-- Selecione o Destino --</option>' +
                '<option value="AFINACAO_GERAL" data-tipo="Geral">Uso da Afinação (Sem Desconto)</option>' +
                rh.funcionarios.map(f => `<option value="${f.id}" data-tipo="${f.tipo}">${f.nome} (${f.tipo})</option>`).join('');
        }
    },

    registrarEntrada: function () {
        const tipo = document.querySelector('input[name="tipo-entrada"]:checked').value;
        const data = document.getElementById('ent-data').value;
        const item = document.getElementById('ent-item').value;
        const qtd = parseFloat(document.getElementById('ent-qtd').value);
        const db = DB_ESTOQUE.get();

        if (tipo === 'insumo') {
            const total = parseFloat(document.getElementById('ent-total').value);
            const statusPagamento = document.getElementById('ent-pagamento').value;
            let dataVencimento = data; // Se for pago à vista, o vencimento é o dia da compra

            if (statusPagamento === 'PRAZO') {
                dataVencimento = document.getElementById('ent-vencimento').value;
                if (!dataVencimento) {
                    ModalEstoque.show('Aviso', 'Para compras a prazo, é obrigatório informar a Data de Vencimento.');
                    return;
                }
            }

            if (!data || !item || isNaN(qtd) || isNaN(total)) return;

            db.logsInsumos.push({
                id: 'LOGI_' + Date.now(),
                tipo: 'Entrada',
                data, idInsumo: item, qtd, total, valorUnit: total / qtd
            });

            // --- INTEGRAÇÃO COM AGENDA FINANCEIRA ---
            const insumoNome = db.insumos.find(i => i.id === item)?.nome || 'Insumo';
            const dbFinRaw = localStorage.getItem('ks_financeiro_dados');

            let dbFin = { despesas: [] };
            if (dbFinRaw) {
                dbFin = JSON.parse(dbFinRaw);
                if (!dbFin.despesas) dbFin.despesas = [];
            }

            dbFin.despesas.push({
                id: 'MAT_' + Date.now(),
                descricao: `Compra Material: ${insumoNome} (x${qtd})`,
                categoria: 'MATERIAL',
                valor: total,
                vencimento: dataVencimento,
                pago: statusPagamento === 'PAGO', // Se for PRAZO, entra como Pendente na agenda
                cancelada: false
            });
            localStorage.setItem('ks_financeiro_dados', JSON.stringify(dbFin));
            // --- FIM DA INTEGRAÇÃO ---

            // Limpa os campos após salvar
            const selectPag = document.getElementById('ent-pagamento');
            const divVenc = document.getElementById('div-ent-vencimento');
            const inputVenc = document.getElementById('ent-vencimento');
            if (selectPag) selectPag.value = 'PAGO';
            if (inputVenc) inputVenc.value = '';
            if (divVenc) divVenc.style.display = 'none';

        } else {
            const cliente = document.getElementById('ent-cliente').value;
            if (!data || !item || isNaN(qtd) || !cliente) return;

            db.logsPecas.push({
                id: 'LOGP_' + Date.now(),
                tipo: 'Entrada',
                data, codigoPeca: item, qtd, origemDestino: `Cliente: ${cliente}`
            });
        }

        DB_ESTOQUE.save(db);
        document.getElementById('ent-qtd').value = '';
        if (document.getElementById('ent-total')) document.getElementById('ent-total').value = '';
        this.renderSelects();
        ModalEstoque.show('Sucesso', 'Entrada registrada com sucesso!');
    },

    verificarTipoFuncionario: function () {
        const selFunc = document.getElementById('sai-func');
        const tipo = selFunc.options[selFunc.selectedIndex]?.dataset?.tipo;
        const divValor = document.getElementById('div-sai-valor');

        if (tipo === 'Produção') {
            divValor.style.display = 'block';
            this.autoPreencherRepasse();
        } else {
            divValor.style.display = 'none';
        }
    },

    autoPreencherRepasse: function () {
        const idItem = document.getElementById('sai-item').value;
        if (!idItem) return;
        const item = DB_ESTOQUE.get().insumos.find(i => i.id === idItem);
        if (item) {
            document.getElementById('sai-valor').value = item.repasse;
            this.calcularTotalSaida();
        }
    },

    calcularTotalSaida: function () {
        const qtd = parseFloat(document.getElementById('sai-qtd').value) || 0;
        const valor = parseFloat(document.getElementById('sai-valor').value) || 0;
        document.getElementById('sai-total-display').innerText = `R$ ${(qtd * valor).toFixed(2).replace('.', ',')}`;
    },

    registrarSaidaInsumo: function () {
        const data = document.getElementById('sai-data').value;
        const idItem = document.getElementById('sai-item').value;
        const idFunc = document.getElementById('sai-func').value;
        const qtd = parseFloat(document.getElementById('sai-qtd').value);

        const selFunc = document.getElementById('sai-func');
        const tipoFunc = selFunc.options[selFunc.selectedIndex]?.dataset?.tipo;

        let valorCobrado = 0;
        let totalCobrado = 0;

        if (tipoFunc === 'Produção') {
            valorCobrado = parseFloat(document.getElementById('sai-valor').value) || 0;
            totalCobrado = valorCobrado * qtd;
        }

        if (!data || !idItem || !idFunc || isNaN(qtd)) return;

        const estoqueAtual = this.calcularEstoqueInsumo(idItem);
        if (estoqueAtual - qtd < 0) {
            ModalEstoque.show('Aviso de Estoque Negativo', `Você está retirando mais insumos do que existe no sistema. Lembre-se de lançar a nota de entrada!`);
        } else {
            ModalEstoque.show('Sucesso', 'Saída / Consumo registrado!');
        }

        const db = DB_ESTOQUE.get();
        db.logsInsumos.push({
            id: 'LOGI_' + Date.now(),
            tipo: 'Saída',
            data, idInsumo: idItem, idFunc, qtd, valorCobrado, totalCobrado
        });

        DB_ESTOQUE.save(db);
        document.getElementById('sai-qtd').value = '';
        this.renderSelects();
    },

    renderHistorico: function () {
        const db = DB_ESTOQUE.get();
        const rh = LerRH();
        const erp = LerERP();

        const mesFiltro = document.getElementById('filtro-hist-mes').value;
        const classeFiltro = document.getElementById('filtro-hist-classe').value;
        const tipoFiltro = document.getElementById('filtro-hist-tipo').value;

        const tbody = document.querySelector('#tabela-historico tbody');
        if (!tbody) return;

        let logsInsumos = db.logsInsumos.map(l => ({ ...l, classe: 'Insumos' }));
        let logsPecas = db.logsPecas.map(l => ({ ...l, classe: 'Peças' }));
        let logs = [...logsInsumos, ...logsPecas].sort((a, b) => {
            const dataDiff = new Date(b.data) - new Date(a.data);
            if (dataDiff !== 0) return dataDiff;
            const idA = parseInt(a.id.split('_')[1] || 0);
            const idB = parseInt(b.id.split('_')[1] || 0);
            return idB - idA;
        });

        if (mesFiltro) logs = logs.filter(l => l.data.startsWith(mesFiltro));
        if (classeFiltro) logs = logs.filter(l => l.classe === classeFiltro);
        if (tipoFiltro) logs = logs.filter(l => l.tipo === tipoFiltro);

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:15px; color:#94a3b8;">Nenhum registro encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            let nomeItem = '';
            let origemDestino = '-';
            let financeiro = '-';
            let unidade = '';
            let corTipo = l.tipo === 'Entrada' ? '#10b981' : '#ef4444';

            if (l.classe === 'Insumos') {
                const item = db.insumos.find(i => i.id === l.idInsumo);
                nomeItem = item ? item.nome : 'Material Excluído';
                unidade = item ? item.unidade : '';

                if (l.tipo === 'Entrada') {
                    origemDestino = 'Compra';
                    financeiro = `<span style="color:#10b981;">Custo: R$ ${(l.total || 0).toFixed(2).replace('.', ',')}</span>`;
                } else {
                    if (l.idFunc === 'AFINACAO_GERAL') {
                        origemDestino = 'Uso da Afinação';
                    } else {
                        const f = rh.funcionarios.find(func => func.id === l.idFunc);
                        origemDestino = f ? f.nome : 'Funcionário';
                    }

                    if (l.totalCobrado > 0) {
                        financeiro = `<span style="color:#ef4444;">Cobrado RH: R$ ${l.totalCobrado.toFixed(2).replace('.', ',')}</span>`;
                    } else {
                        financeiro = `<span style="color:#94a3b8;">S/ Cobrança</span>`;
                    }
                }
            } else {
                // Classe Peças
                const p = erp.produtos.find(prod => String(prod.codigo) === String(l.codigoPeca));
                nomeItem = p ? `${p.codigo} - ${p.nome}` : `Cód: ${l.codigoPeca} (Excluída)`;
                unidade = 'un';
                origemDestino = l.origemDestino;
                financeiro = l.tipo === 'Entrada' ? '<span style="color:#38bdf8;">Chegada Afinação</span>' : '<span style="color:#eab308;">Baixa / Ajuste</span>';
            }

            return `<tr>
                <td>${l.data.split('-').reverse().join('/')}</td>
                <td><span style="border: 1px solid #334155; padding: 2px 6px; border-radius: 4px; font-size:11px;">${l.classe}</span></td>
                <td><strong style="color:${corTipo}">${l.tipo}</strong></td>
                <td>${nomeItem}</td>
                <td><strong>${l.qtd}</strong> ${unidade}</td>
                <td>${origemDestino}</td>
                <td style="text-align:right;">${financeiro}</td>
                <td><button onclick="Estoque.excluirLog('${l.id}', '${l.classe}')" style="background:transparent; border:none; color:#ef4444; cursor:pointer;" title="Desfazer Registro"><i data-lucide="trash-2" style="width:14px;"></i></button></td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    },

    excluirLog: function (idLog, classe) {
        ModalEstoque.show('Atenção', 'Deseja excluir permanentemente este registro?', 'confirm', () => {
            const db = DB_ESTOQUE.get();
            if (classe === 'Insumos') {
                db.logsInsumos = db.logsInsumos.filter(l => l.id !== idLog);
            } else {
                db.logsPecas = db.logsPecas.filter(l => l.id !== idLog);
            }
            DB_ESTOQUE.save(db);
            this.renderHistorico();
            this.renderPainel();
        });
    },

    ajustarEstoquePeca: function (codigoPeca, saldoAtual) {
        ModalEstoque.prompt(
            'Ajuste Manual de Estoque',
            `Peça Cód. <strong>${codigoPeca}</strong><br>Saldo atual: ${saldoAtual} un.<br><br>Digite a NOVA quantidade real:`,
            saldoAtual,
            (novoSaldoStr) => {
                if (novoSaldoStr === null || novoSaldoStr.trim() === '') return;

                const novoSaldo = parseFloat(novoSaldoStr);
                if (isNaN(novoSaldo) || novoSaldo < 0) {
                    ModalEstoque.show('Erro', 'Quantidade inválida. Digite um número maior ou igual a zero.');
                    return;
                }

                const diff = novoSaldo - saldoAtual;
                if (diff === 0) return; // Nenhuma alteração

                const db = DB_ESTOQUE.get();
                const tipoLog = diff > 0 ? 'Entrada' : 'Saída';
                const qtdAjuste = Math.abs(diff);

                const dataLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

                db.logsPecas.push({
                    id: 'LOGP_' + Date.now(),
                    tipo: tipoLog,
                    data: dataLocal,
                    codigoPeca: codigoPeca,
                    qtd: qtdAjuste,
                    origemDestino: 'Ajuste Manual de Estoque'
                });

                DB_ESTOQUE.save(db);
                this.renderPainel();
                ModalEstoque.show('Sucesso', 'Estoque de peças ajustado com sucesso!');
            }
        );
    },

    renderPainel: function () {
        const db = DB_ESTOQUE.get();
        const erp = LerERP();

        // 1. Painel de Alertas de Insumos
        const saudavelDiv = document.getElementById('lista-estoque-saudavel');
        const alertaDiv = document.getElementById('lista-estoque-alerta');

        let saudaveis = [];
        let alertas = [];

        db.insumos.forEach(i => {
            const saldo = this.calcularEstoqueInsumo(i.id);
            const info = `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #1e293b;">
                <span>${i.nome}</span>
                <strong>${saldo} ${i.unidade}</strong>
            </div>`;
            if (saldo <= i.minimo) alertas.push(info);
            else saudaveis.push(info);
        });

        if (saudavelDiv) saudavelDiv.innerHTML = saudaveis.length ? saudaveis.join('') : '<span style="color:#94a3b8;">Nenhum item em nível saudável.</span>';
        if (alertaDiv) alertaDiv.innerHTML = alertas.length ? alertas.join('') : '<span style="color:#94a3b8;">Estoque tranquilo! Nenhum alerta.</span>';

        // 2. Painel de Faturamento de Peças
        const tbodyPecas = document.querySelector('#tabela-painel-pecas tbody');
        let faturamentoTotal = 0;
        let pecasHtml = '';

        const codigosMovimentados = [...new Set(db.logsPecas.map(l => l.codigoPeca))];

        codigosMovimentados.forEach(cod => {
            const saldo = this.calcularEstoquePeca(cod);
            if (saldo > 0) {
                const prod = erp.produtos.find(p => String(p.codigo) === String(cod));
                const nome = prod ? prod.nome : 'Produto não encontrado';
                const valVenda = prod ? (prod.valVenda || 0) : 0;

                const fatBruto = saldo * valVenda;
                faturamentoTotal += fatBruto;

                pecasHtml += `
                <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="color:#94a3b8;">${cod}</td>
                    <td style="font-weight:bold;">${nome}</td>
                    <td style="text-align:center; color:#38bdf8; font-weight:bold; font-size:16px;">${saldo}</td>
                    <td style="text-align:right; color:#10b981; font-weight:bold;">R$ ${fatBruto.toFixed(2).replace('.', ',')}</td>
                    <td style="text-align:center;">
                        <button onclick="Estoque.ajustarEstoquePeca('${cod}', ${saldo})" style="background:transparent; border:none; color:#38bdf8; cursor:pointer; padding: 6px; margin: 0 auto; display: inline-flex;" title="Ajustar Estoque"><i data-lucide="pencil" style="width:16px;"></i></button>
                    </td>
                </tr>`;
            }
        });

        if (tbodyPecas) {
            tbodyPecas.innerHTML = pecasHtml === '' ? '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Estoque vazio. Nenhuma peça aguardando afinação.</td></tr>' : pecasHtml;
        }

        if (document.getElementById('painel-faturamento')) {
            document.getElementById('painel-faturamento').innerText = `R$ ${faturamentoTotal.toFixed(2).replace('.', ',')}`;
        }

        lucide.createIcons();
    },

    gerarRelatorioMensal: function () {
        const mesFiltro = document.getElementById('relatorio-mes').value;
        if (!mesFiltro) return;

        const db = DB_ESTOQUE.get();
        const rh = LerRH();

        let logsInsumos = db.logsInsumos.filter(l => l.data.startsWith(mesFiltro));
        let logsPecas = db.logsPecas.filter(l => l.data.startsWith(mesFiltro));

        // Contabilidade de Insumos
        let totalCustoEntrada = 0;
        let totalCobradoSaida = 0;
        logsInsumos.forEach(l => {
            if (l.tipo === 'Entrada') totalCustoEntrada += (l.total || 0);
            if (l.tipo === 'Saída') totalCobradoSaida += (l.totalCobrado || 0);
        });

        // Contabilidade de Peças
        let pecasEntradas = 0;
        let pecasSaidas = 0;
        logsPecas.forEach(l => {
            if (l.tipo === 'Entrada') pecasEntradas += l.qtd;
            if (l.tipo === 'Saída') pecasSaidas += l.qtd;
        });

        const [ano, mesStr] = mesFiltro.split('-');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const nomeMes = meses[parseInt(mesStr) - 1];

        // Desenha a "Folha de Papel" Oficial
        let html = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #000;">KS Afinações</h1>
                <h2 style="font-size: 16px; margin: 5px 0; color: #333;">Relatório Financeiro do Estoque</h2>
                <p style="font-size: 14px; margin: 0; color: #555;">Período fechado: <strong>${nomeMes} / ${ano}</strong></p>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px;">
                <div style="flex: 1; border: 1px solid #000; padding: 15px; border-radius: 4px;">
                    <h3 style="font-size: 14px; margin-top:0; border-bottom: 1px solid #000; padding-bottom: 5px; color: #000;">Resumo de Caixa (Insumos)</h3>
                    <p style="margin: 5px 0; font-size: 13px; color: #000;">Gasto em Compras: <strong style="color: #b91c1c;">R$ ${totalCustoEntrada.toFixed(2).replace('.', ',')}</strong></p>
                    <p style="margin: 5px 0; font-size: 13px; color: #000;">Valor Descontado no RH: <strong style="color: #15803d;">R$ ${totalCobradoSaida.toFixed(2).replace('.', ',')}</strong></p>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #000; border-top: 1px dashed #000; padding-top: 8px;">Custo Real da Empresa: <strong>R$ ${(totalCustoEntrada - totalCobradoSaida).toFixed(2).replace('.', ',')}</strong></p>
                </div>
                <div style="flex: 1; border: 1px solid #000; padding: 15px; border-radius: 4px;">
                    <h3 style="font-size: 14px; margin-top:0; border-bottom: 1px solid #000; padding-bottom: 5px; color: #000;">Resumo de Produtividade (Peças)</h3>
                    <p style="margin: 5px 0; font-size: 13px; color: #000;">Total de Peças (Entrada): <strong>${pecasEntradas} un.</strong></p>
                    <p style="margin: 5px 0; font-size: 13px; color: #000;">Total de Peças (Saída/Faturadas): <strong>${pecasSaidas} un.</strong></p>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #000; border-top: 1px dashed #000; padding-top: 8px;">Balanço do Mês: <strong>${pecasEntradas - pecasSaidas} un.</strong></p>
                </div>
            </div>
            
            <h3 style="font-size: 14px; margin-bottom: 10px; color: #000;">Detalhamento: Consumo da Equipe de Afinação</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; color: #000;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #000; padding: 4px; text-align: left; color: #000; background: #f8fafc;">Data</th>
                        <th style="border: 1px solid #000; padding: 4px; text-align: left; color: #000; background: #f8fafc;">Funcionário / Destino</th>
                        <th style="border: 1px solid #000; padding: 4px; text-align: left; color: #000; background: #f8fafc;">Insumo Retirado</th>
                        <th style="border: 1px solid #000; padding: 4px; text-align: center; color: #000; background: #f8fafc;">Qtd</th>
                        <th style="border: 1px solid #000; padding: 4px; text-align: right; color: #000; background: #f8fafc;">Val. Descontado (RH)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let logSaidasEquipe = logsInsumos.filter(l => l.tipo === 'Saída').sort((a, b) => new Date(a.data) - new Date(b.data));
        if (logSaidasEquipe.length === 0) {
            html += `<tr><td colspan="5" style="border: 1px solid #000; padding: 10px; text-align: center; color: #000;">Nenhum consumo de materiais registrado neste mês.</td></tr>`;
        } else {
            logSaidasEquipe.forEach(l => {
                const item = db.insumos.find(i => i.id === l.idInsumo);
                const nomeItem = item ? item.nome : 'Material Excluído';
                let nomeFunc = 'Uso da Afinação';
                if (l.idFunc !== 'AFINACAO_GERAL') {
                    const f = rh.funcionarios.find(func => func.id === l.idFunc);
                    if (f) nomeFunc = f.nome;
                }

                html += `
                <tr>
                    <td style="border: 1px solid #000; padding: 4px; color: #000;">${l.data.split('-').reverse().join('/')}</td>
                    <td style="border: 1px solid #000; padding: 4px; color: #000;">${nomeFunc}</td>
                    <td style="border: 1px solid #000; padding: 4px; color: #000;">${nomeItem}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center; color: #000;">${l.qtd}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: right; color: #000;">R$ ${(l.totalCobrado || 0).toFixed(2).replace('.', ',')}</td>
                </tr>`;
            });
        }

        html += `</tbody></table>`;
        document.getElementById('print-area-relatorio').innerHTML = html;
        document.getElementById('print-area-relatorio').style.display = 'block';
    },

    imprimirRelatorio: function () {
        const conteudo = document.getElementById('print-area-relatorio').innerHTML;
        if (conteudo.trim() === '') {
            ModalEstoque.show('Erro', 'O relatório está vazio. Escolha um mês válido.');
            return;
        }

        const tituloOriginal = document.title;
        document.title = 'Relatorio_Estoque';

        // Cria uma área de impressão FORA do menu principal para a impressora enxergar
        let printDiv = document.getElementById('print-area-externa');
        if (!printDiv) {
            printDiv = document.createElement('div');
            printDiv.id = 'print-area-externa';
            document.body.appendChild(printDiv);
        }
        printDiv.innerHTML = conteudo;

        let style = document.getElementById('print-style-relatorio');
        if (!style) {
            style = document.createElement('style');
            style.id = 'print-style-relatorio';
            style.innerHTML = `
                #print-area-externa { display: none; }
                body.printing-relatorio .app-container { display: none !important; }
                body.printing-relatorio .modal-overlay { display: none !important; }
                body.printing-relatorio #print-area-externa { 
                    display: block !important; 
                    background: white !important; 
                    color: black !important; 
                    position: absolute;
                    top: 0; left: 0; width: 100%;
                    padding: 3mm !important;
                    box-sizing: border-box !important;
                }
                @media print { 
                    @page { size: A4 portrait; margin: 5mm; } 
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; } 
                }
            `;
            document.head.appendChild(style);
        }

        document.body.className = 'printing-relatorio';

        setTimeout(() => {
            window.print();
            document.title = tituloOriginal;
            document.body.className = '';
        }, 500);
    }
};


window.onload = () => {
    const dataMes = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().substring(0, 7);
    if (document.getElementById('filtro-hist-mes')) document.getElementById('filtro-hist-mes').value = dataMes;
    Estoque_UI.switchTab('painel');
};