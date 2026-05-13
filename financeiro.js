// Inicializa os ícones Lucide
lucide.createIcons();

const CustomModal = {
    show: function (msg, isConfirm = false, onConfirm = null) {
        document.getElementById('modal-message').innerText = msg;
        const modalEl = document.getElementById('custom-modal');
        modalEl.style.display = 'flex';

        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        btnCancel.style.display = isConfirm ? 'inline-block' : 'none';

        btnConfirm.onclick = () => { this.hide(); if (onConfirm) onConfirm(); };
        btnCancel.onclick = () => { this.hide(); };
    },
    hide: function () {
        document.getElementById('custom-modal').style.display = 'none';
    }
};

const UI = {
    switchTab: function (tabId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`button[onclick="UI.switchTab('${tabId}')"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');

        if (tabId === 'raiox') Financeiro.renderRaioX();
        if (tabId === 'despesas') Financeiro.renderDespesas();
    }
};

// Funções de Acesso Múltiplo aos Bancos
const DbReader = {
    getNotas: function () {
        const data = localStorage.getItem('ks_afinacoes_dados');
        return data ? JSON.parse(data).notasSalvas || [] : [];
    },
    getEstoque: function () {
        const data = localStorage.getItem('ks_estoque_dados');
        return data ? JSON.parse(data) : { insumos: [], logsInsumos: [] };
    },
    getFin: function () {
        const data = localStorage.getItem('ks_financeiro_dados');
        return data ? JSON.parse(data) : { despesas: [] };
    },
    saveFin: function (data) {
        localStorage.setItem('ks_financeiro_dados', JSON.stringify(data));
    }
};

const Financeiro = {
    init: function () {
        const mesAtual = new Date().toISOString().substring(0, 7);
        document.getElementById('filtro-raiox-mes').value = mesAtual;
        document.getElementById('filtro-despesas-mes').value = mesAtual;
        document.getElementById('dre-mes').value = mesAtual;

        this.renderRaioX();
        this.renderDespesas();
    },

    // ==========================================
    // ABA 1: RAIO X DE NOTAS
    // ==========================================
    renderRaioX: function () {
        const mes = document.getElementById('filtro-raiox-mes').value;
        const notas = DbReader.getNotas().filter(n => n.data.startsWith(mes) && n.tipo !== 'RETRABALHO');
        const tbody = document.querySelector('#tabela-raiox tbody');

        if (notas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhuma nota de venda este mês.</td></tr>`;
            return;
        }

        let html = '';
        notas.forEach(nota => {
            let custoMao = 0;
            nota.itens.forEach(item => {
                custoMao += (item.custoProducaoTotal || 0);
            });

            const sobra = nota.total - custoMao;

            html += `<tr onclick="Financeiro.detalharNota('${nota.id}')" style="cursor: pointer;" title="Clique para ver a conta de padaria">
                <td>
                    <strong style="color: var(--primary-color);">${nota.id}</strong><br>
                    <span style="font-size: 11px;">${nota.data.split('-').reverse().join('/')}</span>
                </td>
                <td>${nota.cliente}</td>
                <td style="text-align:right;">R$ ${nota.total.toFixed(2).replace('.', ',')}</td>
                <td style="text-align:right; color: var(--danger-color);">R$ ${custoMao.toFixed(2).replace('.', ',')}</td>
                <td style="text-align:right; color: var(--success-color); font-weight: bold;">R$ ${sobra.toFixed(2).replace('.', ',')}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    },

    detalharNota: function (id) {
        const nota = DbReader.getNotas().find(n => n.id === id);
        if (!nota) return;

        const dataFormatada = nota.data.split('-').reverse().join('/');
        const isRetrabalho = nota.tipo === 'RETRABALHO';

        // LADO ESQUERDO
        let visualHtml = `
            <div style="background: white; color: black !important; width: 100%; max-width: 450px; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #000; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="font-size: 18px; font-weight: bold; color: black !important;">KS AFINAÇÕES</div>
                    <div style="font-size: 10px; color: black !important;">Nº ${nota.id} - Data: ${dataFormatada}</div>
                    ${isRetrabalho ? '<div style="background: black; color: white; font-weight: bold; margin-top:5px; padding: 2px;">RETRABALHO</div>' : ''}
                </div>
                <table style="width: 100%; font-size: 10px; border-collapse: collapse; color: black !important;">
                    <thead>
                        <tr style="border-bottom: 1px solid black;">
                            <th style="text-align: left; padding: 4px 0; color: black">CÓD.</th>
                            <th style="text-align: left; padding: 4px 0; color: black">PRODUTO</th>
                            <th style="text-align: center; padding: 4px 0; color: black">QTD</th>
                            <th style="text-align: right; padding: 4px 0; color: black">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nota.itens.map(i => `
                            <tr>
                                <td style="padding: 4px 0; color: black !important;">${i.codigo}</td>
                                <td style="padding: 4px 0; color: black !important;">${i.nome}</td>
                                <td style="text-align: center; color: black !important;">${i.qtd}</td>
                                <td style="text-align: right; color: black !important;">R$ ${i.subtotal.toFixed(2).replace('.', ',')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 15px; font-weight: bold; border-top: 1px solid black; padding-top: 5px; font-size: 14px; color: black !important;">
                    TOTAL: R$ ${nota.total.toFixed(2).replace('.', ',')}
                </div>
            </div>
        `;

        // LADO DIREITO
        let totalCustoMao = 0;
        let itensFinanceiroHtml = '';

        nota.itens.forEach(i => {
            const custoUn = i.custoProducao || 0;
            const custoTotalItem = i.custoProducaoTotal || 0;
            totalCustoMao += custoTotalItem;

            const corMao = i.maoObraTipo === 'EMPREITA' ? '#ef4444' : (i.maoObraTipo === 'PRODUCAO' ? '#38bdf8' : '#facc15');

            itensFinanceiroHtml += `
                <div style="padding: 12px; background: var(--surface-color); border-radius: 6px; margin-bottom: 10px; border-left: 4px solid ${corMao};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="color: var(--text-main); display: block;">[${i.codigo}] ${i.nome}</strong>
                            <small style="color: var(--text-muted);">Responsável: <b style="color: ${corMao};">${i.maoObraNome || 'KS AFINAÇÕES'}</b></small>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: var(--success-color);">+ R$ ${i.subtotal.toFixed(2)}</div>
                            <div style="font-size: 11px; color: var(--danger-color);">(- R$ ${custoTotalItem.toFixed(2)})</div>
                        </div>
                    </div>
                    <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted); border-top: 1px solid #334155; padding-top: 5px; display: flex; justify-content: space-between;">
                        <span>Venda Un: R$ ${i.valor.toFixed(2)}</span>
                        <span>Custo Un: R$ ${custoUn.toFixed(2)}</span>
                        <span style="color: var(--primary-color);">Sobra: R$ ${(i.subtotal - custoTotalItem).toFixed(2)}</span>
                    </div>
                </div>
            `;
        });

        const sobraLiquida = nota.total - totalCustoMao;

        let financeiroHtml = `
            <div style="margin-bottom: 25px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid #334155;">
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <span style="color: var(--text-muted);">Faturamento da Nota:</span>
                    <strong style="color: var(--success-color);">R$ ${nota.total.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <span style="color: var(--text-muted);">Total Pago Mão de Obra:</span>
                    <strong style="color: var(--danger-color);">R$ ${totalCustoMao.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; margin-top: 10px; border-top: 2px solid #334155; font-size: 18px;">
                    <strong>SOBRA REAL KS:</strong>
                    <strong style="color: var(--primary-color);">R$ ${sobraLiquida.toFixed(2).replace('.', ',')}</strong>
                </div>
            </div>
            <h5 style="color: var(--text-muted); margin-bottom: 10px; font-size: 11px; letter-spacing: 1px;">ANÁLISE POR ITEM</h5>
            ${itensFinanceiroHtml}
        `;

        document.getElementById('raiox-visual-nota').innerHTML = visualHtml;
        document.getElementById('raiox-detalhes-financeiros').innerHTML = financeiroHtml;
        document.getElementById('modal-detalhe-nota').style.display = 'flex';
    },

    // ==========================================
    // ABA 2: AGENDA FINANCEIRA (INTELIGÊNCIA MOBILLS)
    // ==========================================
    salvarDespesa: function () {
        const idEdicao = document.getElementById('desp-id-edicao').value;
        const desc = document.getElementById('desp-desc').value.trim();
        const categoria = document.getElementById('desp-categoria').value;
        const valor = parseFloat(document.getElementById('desp-valor').value);
        const venc = document.getElementById('desp-venc').value;

        if (!desc || isNaN(valor) || !venc) return;

        const db = DbReader.getFin();
        if (!db.despesas) db.despesas = [];

        if (idEdicao) {
            // Modo Edição: Altera apenas a ocorrência deste mês
            const index = db.despesas.findIndex(d => d.id === idEdicao);
            if (index !== -1) {
                db.despesas[index] = { ...db.despesas[index], descricao: desc, categoria, valor, vencimento: venc };
            }
        } else {
            // Novo Lançamento
            const groupId = categoria === 'FIXA' ? 'GRP_' + Date.now() : null; // Semente para repetir
            db.despesas.push({
                id: 'DESP_' + Date.now() + Math.floor(Math.random() * 1000),
                groupId: groupId,
                descricao: desc,
                categoria: categoria,
                valor: valor,
                vencimento: venc,
                pago: false,
                cancelada: false // Usado para quebrar a corrente de despesas fixas apagadas
            });
        }

        DbReader.saveFin(db);
        this.limparFormDespesa();
        this.renderDespesas();
        CustomModal.show(idEdicao ? 'Alteração salva com sucesso!' : 'Lançamento registrado!');
    },

    iniciarEdicaoDespesa: function (id) {
        const d = DbReader.getFin().despesas.find(x => x.id === id);
        if (!d) return;

        document.getElementById('desp-id-edicao').value = d.id;
        document.getElementById('desp-desc').value = d.descricao;
        document.getElementById('desp-categoria').value = d.categoria || 'FIXA';
        document.getElementById('desp-valor').value = d.valor;
        document.getElementById('desp-venc').value = d.vencimento;

        const btn = document.getElementById('btn-salvar-despesa');
        btn.innerHTML = '<i data-lucide="save" style="width: 18px;"></i> Atualizar Conta';
        btn.className = 'btn-outline';
        btn.style.borderColor = 'var(--primary-color)';
        btn.style.color = 'var(--primary-color)';

        document.getElementById('desp-desc').focus();
        lucide.createIcons();
    },

    limparFormDespesa: function () {
        document.getElementById('desp-id-edicao').value = '';
        document.getElementById('desp-desc').value = '';
        document.getElementById('desp-valor').value = '';
        document.getElementById('desp-categoria').value = 'FIXA';

        const btn = document.getElementById('btn-salvar-despesa');
        btn.innerHTML = '<i data-lucide="plus-circle" style="width: 18px;"></i> Lançar';
        btn.className = 'btn-primary';
        btn.style.borderColor = '';
        btn.style.color = '';
        lucide.createIcons();
    },

    autoGerarFixas: function (mesView) {
        const db = DbReader.getFin();
        if (!db.despesas) db.despesas = [];
        let mudouDb = false;

        const fixas = db.despesas.filter(d => d.categoria === 'FIXA' && d.groupId);
        const gruposIds = [...new Set(fixas.map(f => f.groupId))];

        gruposIds.forEach(gId => {
            const instancias = fixas.filter(f => f.groupId === gId);
            instancias.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

            const primeira = instancias[0];
            if (primeira.vencimento.substring(0, 7) > mesView) return; // Se foi criada no futuro, ignora

            const existeNesseMes = instancias.some(i => i.vencimento.startsWith(mesView));

            if (!existeNesseMes) {
                const passadas = instancias.filter(i => i.vencimento.substring(0, 7) < mesView);
                if (passadas.length > 0) {
                    const base = passadas[passadas.length - 1]; // Puxa a do mês anterior

                    if (base.cancelada) return; // Se foi excluída, não gera nos meses da frente

                    const dia = base.vencimento.split('-')[2];
                    let dataProj = new Date(`${mesView}-${dia}T12:00:00`);
                    if (dataProj.getMonth() + 1 !== parseInt(mesView.split('-')[1])) {
                        dataProj = new Date(parseInt(mesView.split('-')[0]), parseInt(mesView.split('-')[1]), 0, 12);
                    }

                    db.despesas.push({
                        id: 'DESP_' + Date.now() + Math.floor(Math.random() * 1000),
                        groupId: base.groupId,
                        descricao: base.descricao,
                        categoria: 'FIXA',
                        valor: base.valor, // Copia o valor exato do mês anterior (inclusive se foi editado)
                        vencimento: dataProj.toISOString().split('T')[0],
                        pago: false,
                        cancelada: false
                    });
                    mudouDb = true;
                }
            }
        });

        if (mudouDb) DbReader.saveFin(db);
    },

    renderDespesas: function () {
        const mes = document.getElementById('filtro-despesas-mes').value;

        // Ativa a inteligência de projetar as contas fixas pro mês
        this.autoGerarFixas(mes);

        const db = DbReader.getFin();
        const despesas = db.despesas.filter(d => d.vencimento.startsWith(mes) && !d.cancelada);

        despesas.sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));

        const tbody = document.querySelector('#tabela-despesas tbody');
        let tPago = 0, tPendente = 0;

        if (despesas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum lançamento registrado neste mês.</td></tr>`;
            document.getElementById('resumo-despesas-rapido').innerHTML = '';
            return;
        }

        let html = '';
        despesas.forEach(d => {
            if (d.pago) tPago += d.valor; else tPendente += d.valor;

            const isAtrasado = !d.pago && new Date(d.vencimento) < new Date(new Date().toISOString().split('T')[0]);
            const corStatus = d.pago ? 'var(--success-color)' : (isAtrasado ? 'var(--danger-color)' : 'var(--text-muted)');

            // Cores das Categorias
            let corBadge = '#94a3b8'; let lblBadge = d.categoria;
            if (d.categoria === 'FIXA') { corBadge = '#38bdf8'; lblBadge = 'FIXA'; }
            if (d.categoria === 'VARIAVEL') { corBadge = '#fb923c'; lblBadge = 'VARIÁVEL'; }
            if (d.categoria === 'MATERIAL') { corBadge = '#a855f7'; lblBadge = 'MATERIAL'; }
            if (d.categoria === 'MANUTENCAO') { corBadge = '#f43f5e'; lblBadge = 'MANUTENÇÃO'; }
            if (d.categoria === 'RH') { corBadge = '#eab308'; lblBadge = 'RH'; }

            html += `<tr>
                <td><strong style="color: ${isAtrasado && !d.pago ? 'var(--danger-color)' : 'inherit'};">${d.vencimento.split('-').reverse().join('/')}</strong></td>
                <td><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${corBadge}22; color: ${corBadge}; border: 1px solid ${corBadge}55; font-weight: bold;">${lblBadge}</span></td>
                <td>${d.descricao}</td>
                <td style="text-align:right; font-weight:bold;">R$ ${d.valor.toFixed(2).replace('.', ',')}</td>
                <td style="text-align:center;">
                    <label style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; color: ${corStatus}; font-size: 11px; font-weight: bold;">
                        <input type="checkbox" ${d.pago ? 'checked' : ''} onchange="Financeiro.togglePago('${d.id}')" style="width:16px; height:16px; margin:0;">
                        ${d.pago ? 'PAGO' : (isAtrasado ? 'ATRASADO' : 'PENDENTE')}
                    </label>
                </td>
                <td style="text-align:center;">
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="btn-outline" style="padding: 4px 8px; border-color: var(--primary-color); color: var(--primary-color);" onclick="Financeiro.iniciarEdicaoDespesa('${d.id}')" title="Editar este mês">
                            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-danger" style="padding: 4px 8px;" onclick="Financeiro.excluirDespesa('${d.id}')" title="Excluir">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html;
        document.getElementById('resumo-despesas-rapido').innerHTML = `
            <span style="color: var(--success-color);">Total Pago: <b>R$ ${tPago.toFixed(2).replace('.', ',')}</b></span>
            <span style="color: var(--danger-color); border-left: 1px solid var(--border-color); padding-left: 15px;">A Pagar: <b>R$ ${tPendente.toFixed(2).replace('.', ',')}</b></span>
        `;
        lucide.createIcons();
    },

    togglePago: function (id) {
        const db = DbReader.getFin();
        const d = db.despesas.find(x => x.id === id);
        if (d) {
            d.pago = !d.pago;
            DbReader.saveFin(db);
            this.renderDespesas();
        }
    },

    excluirDespesa: function (id) {
        CustomModal.show('Confirma exclusão? Se for uma conta Fixa, ela não será mais gerada para os próximos meses.', true, () => {
            const db = DbReader.getFin();
            const index = db.despesas.findIndex(x => x.id === id);
            if (index > -1) {
                if (db.despesas[index].categoria === 'FIXA') {
                    // Cancela para parar de clonar no futuro
                    db.despesas[index].cancelada = true;
                } else {
                    db.despesas.splice(index, 1);
                }
                DbReader.saveFin(db);
                this.renderDespesas();
            }
        });
    }
};

// ==========================================
// ABA 3: DRE (FECHAMENTO MENSAL PROFISSIONAL)
// ==========================================
const DRE = {
    gerar: function () {
        const mes = document.getElementById('dre-mes').value;
        if (!mes) { CustomModal.show('Selecione um mês para o fechamento.'); return; }

        const tituloMesEl = document.getElementById('dre-titulo-mes');
        if (tituloMesEl) tituloMesEl.innerText = mes.split('-').reverse().join('/');

        // 1. FATURAMENTO E CUSTO DE MÃO DE OBRA (NOTAS)
        const notas = DbReader.getNotas().filter(n => n.data.startsWith(mes) && n.tipo !== 'RETRABALHO');
        let faturamento = 0;
        let custoMaoObraNotas = 0;
        let htmlDetalheNotas = '';

        [...notas].reverse().forEach(n => {
            faturamento += n.total;
            let custoMaoNota = 0;
            n.itens.forEach(i => {
                if (i.maoObraTipo === 'PRODUCAO' || i.maoObraTipo === 'EMPREITA') {
                    custoMaoObraNotas += (i.custoProducaoTotal || 0);
                    custoMaoNota += (i.custoProducaoTotal || 0);
                }
            });
            htmlDetalheNotas += `<tr>
                <td>Nota Nº ${n.id} - ${n.cliente}</td>
                <td style="text-align: right; color: #15803d;">+ R$ ${n.total.toFixed(2).replace('.', ',')}</td>
                <td style="text-align: right; color: #b91c1c;">- R$ ${custoMaoNota.toFixed(2).replace('.', ',')}</td>
            </tr>`;
        });

        // 2. DESPESAS DA AGENDA MANUAL E RH
        const dbFin = DbReader.getFin();
        let despFixas = 0, despVariaveis = 0, despRH = 0, despMaterial = 0, despManutencao = 0;
        let htmlDetalheDespesas = '';

        if (dbFin.despesas) {
            const despesasPagas = dbFin.despesas.filter(d => d.vencimento.startsWith(mes) && d.pago && !d.cancelada);
            [...despesasPagas].reverse().forEach(d => {
                if (d.categoria === 'FIXA') despFixas += d.valor;
                else if (d.categoria === 'VARIAVEL') despVariaveis += d.valor;
                else if (d.categoria === 'MATERIAL') despMaterial += d.valor;
                else if (d.categoria === 'MANUTENCAO') despManutencao += d.valor;
                else if (d.categoria === 'RH') despRH += d.valor;

                htmlDetalheDespesas += `<tr>
                    <td style="text-align: center;">${d.vencimento.split('-').reverse().join('/')}</td>
                    <td>${d.categoria}</td>
                    <td>${d.descricao}</td>
                    <td style="text-align: right; color: #b91c1c;">- R$ ${d.valor.toFixed(2).replace('.', ',')}</td>
                </tr>`;
            });
        }

        const lucroLiquido = faturamento - custoMaoObraNotas - despFixas - despVariaveis - despMaterial - despManutencao - despRH;

        // ATUALIZAÇÃO DOS CARDS NA TELA
        const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = `R$ ${val.toFixed(2).replace('.', ',')}`; };

        safeSet('dre-faturamento', faturamento);
        safeSet('dre-custo-mao', custoMaoObraNotas);
        safeSet('dre-custo-fixo', despFixas);
        safeSet('dre-custo-var', despVariaveis);
        safeSet('dre-custo-mat', despMaterial);
        safeSet('dre-custo-manut', despManutencao);
        safeSet('dre-custo-rh', despRH);

        const elLucro = document.getElementById('dre-lucro-liquido');
        if (elLucro) {
            elLucro.innerText = `R$ ${lucroLiquido.toFixed(2).replace('.', ',')}`;
            elLucro.className = lucroLiquido >= 0 ? 'dre-value dre-positive' : 'dre-value dre-negative';
        }

        // MONTAGEM DO DETALHAMENTO NA TELA
        const detalhamentoDiv = document.getElementById('dre-detalhamento');
        if (detalhamentoDiv) {
            detalhamentoDiv.innerHTML = `
                <h3 style="margin-top: 30px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Detalhamento de Entradas (Notas)</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                    <thead><tr style="background: rgba(0,0,0,0.1);"><th style="text-align:left; padding:8px;">Origem</th><th style="text-align:right; padding:8px;">Faturamento</th><th style="text-align:right; padding:8px;">Custo M.O</th></tr></thead>
                    <tbody id="tbody-notas-print">${htmlDetalheNotas || '<tr><td colspan="3" style="text-align:center;">Nenhuma nota.</td></tr>'}</tbody>
                </table>
                <h3 style="border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Detalhamento de Saídas (Agenda)</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead><tr style="background: rgba(0,0,0,0.1);"><th style="text-align:center; padding:8px;">Data</th><th style="text-align:left; padding:8px;">Categoria</th><th style="text-align:left; padding:8px;">Descrição</th><th style="text-align:right; padding:8px;">Valor</th></tr></thead>
                    <tbody id="tbody-despesas-print">${htmlDetalheDespesas || '<tr><td colspan="4" style="text-align:center;">Nenhuma despesa.</td></tr>'}</tbody>
                </table>
            `;
        }

        // Mostra o container
        const printArea = document.getElementById('print-area-dre');
        if (printArea) printArea.style.display = 'block';
    },

    imprimir: function () {
        const mes = document.getElementById('dre-mes').value;
        const areaMain = document.getElementById('print-area-dre');

        if (!mes || !areaMain || areaMain.style.display === 'none') {
            CustomModal.show('Gere o balanço primeiro antes de imprimir.');
            return;
        }

        const tituloOriginal = document.title;
        const nomeMes = document.getElementById('dre-titulo-mes').innerText;
        document.title = `Fechamento_KS_${nomeMes.replace('/', '-')}`;

        // DADOS PARA O LAYOUT DE LISTA ADMINISTRATIVA
        const getVal = (id) => document.getElementById(id)?.innerText || 'R$ 0,00';
        const lucroEl = document.getElementById('dre-lucro-liquido');
        const isPositivo = lucroEl?.classList.contains('dre-positive');

        // Pega as tabelas que foram montadas na tela para jogar na impressão
        const tbodyNotas = document.getElementById('tbody-notas-print') ? document.getElementById('tbody-notas-print').innerHTML : '';
        const tbodyDespesas = document.getElementById('tbody-despesas-print') ? document.getElementById('tbody-despesas-print').innerHTML : '';

        // Novo ID v5 para quebrar o cache de página fantasma do navegador
        let printDiv = document.getElementById('print-area-externa-dre-v5');
        if (!printDiv) {
            printDiv = document.createElement('div');
            printDiv.id = 'print-area-externa-dre-v5';
            document.body.appendChild(printDiv);
        }

        // LAYOUT DE LISTA PROFISSIONAL COM TÍTULOS EXCLUSIVOS NA IMPRESSÃO
        printDiv.innerHTML = `
            <div style="color: #000 !important; font-family: Arial, sans-serif; padding: 10mm;">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px;">
                    <div>
                        <h1 style="color: black; margin: 0; font-size: 22px;">KS AFINAÇÕES</h1>
                        <p style="color: black; margin: 2px 0; font-size: 15px;">RELATÓRIO DE FECHAMENTO FINANCEIRO</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="color: black; margin: 0; font-size: 16px;">DEMONSTRATIVO MENSAL</h2>
                        <p style="color: black; margin: 2px 0; font-size: 14px; font-weight: bold;">Mês Referência: ${nomeMes}</p>
                    </div>
                </div>

                <h3 style="color: black; font-size: 14px; border-bottom: 1px solid #000; padding-bottom: 5px;">1. RESUMO CONSOLIDADO DO PERÍODO</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 30px;">
                    <tr><td style="padding: 6px 5px;">Faturamento Bruto (Total de Notas)</td><td style="text-align: right; font-weight: bold; color: #15803d !important;">+ ${getVal('dre-faturamento')}</td></tr>
                    <tr><td style="padding: 6px 5px;">(-) Mão de Obra (Produção/Empreita)</td><td style="text-align: right; color: #b91c1c !important;">- ${getVal('dre-custo-mao')}</td></tr>
                    <tr><td style="padding: 6px 5px;">(-) Despesas Fixas</td><td style="text-align: right; color: #b91c1c !important;">- ${getVal('dre-custo-fixo')}</td></tr>
                    <tr><td style="padding: 6px 5px;">(-) Gastos Variáveis</td><td style="text-align: right; color: #b91c1c !important;">- ${getVal('dre-custo-var')}</td></tr>
                    <tr><td style="padding: 6px 5px;">(-) Manutenção de Equipamentos</td><td style="text-align: right; color: #b91c1c !important;">- ${getVal('dre-custo-manut')}</td></tr>
                    <tr><td style="padding: 6px 5px;">(-) Compras de Materiais</td><td style="text-align: right; color: #b91c1c !important;">- ${getVal('dre-custo-mat')}</td></tr>
                    <tr><td style="padding: 6px 5px;">(-) Folha de Pagamento / RH</td><td style="text-align: right; color: #b91c1c !important;">- ${getVal('dre-custo-rh')}</td></tr>
                    <tr style="border-top: 2px solid black; font-size: 18px;">
                        <td style="padding: 15px 5px; font-weight: bold;">LUCRO LÍQUIDO REAL</td>
                        <td style="text-align: right; font-weight: bold; color: ${isPositivo ? '#15803d' : '#b91c1c'} !important;">${getVal('dre-lucro-liquido')}</td>
                    </tr>
                </table>

                <div style="page-break-before: auto;">
                    <h3 style="color: black; font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; border-bottom: 2px solid black; padding-bottom: 5px;">NOTAS E FATURAMENTOS</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                        <thead><tr style="background: #f0f0f0;"><th style="text-align:left; padding:8px; border: 1px solid #000;">Origem</th><th style="text-align:right; padding:8px; border: 1px solid #000;">Faturamento</th><th style="text-align:right; padding:8px; border: 1px solid #000;">Custo M.O</th></tr></thead>
                        <tbody>${tbodyNotas}</tbody>
                    </table>

                    <h3 style="color: black; font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; border-bottom: 2px solid black; padding-bottom: 5px;">DESPESAS</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead><tr style="background: #f0f0f0;"><th style="text-align:center; padding:8px; border: 1px solid #000;">Data</th><th style="text-align:left; padding:8px; border: 1px solid #000;">Categoria</th><th style="text-align:left; padding:8px; border: 1px solid #000;">Descrição</th><th style="text-align:right; padding:8px; border: 1px solid #000;">Valor</th></tr></thead>
                        <tbody>${tbodyDespesas}</tbody>
                    </table>
                </div>

                <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 20px; text-align: center; color: #1a1a1a;">
                    Documento Interno - KS Afinações | Gerado em: ${new Date().toLocaleString('pt-BR')}
                </div>
            </div>
        `;

        // INJEÇÃO DE CSS PARA IMPRESSÃO LIMPA
        let style = document.getElementById('print-style-final-v5');
        if (!style) {
            style = document.createElement('style');
            style.id = 'print-style-final-v5';
            style.innerHTML = `
                #print-area-externa-dre-v5 { display: none; }
                body.printing-dre .app-container, body.printing-dre .modal-overlay { display: none !important; }
                body.printing-dre #print-area-externa-dre-v5 { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white !important; }
                body.printing-dre #print-area-externa-dre-v5 table td { border: 1px solid #000; padding: 6px; }
                @media print { 
                    @page { size: A4 portrait; margin: 0; } 
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
                }
            `;
            document.head.appendChild(style);
        }

        document.body.className = 'printing-dre';
        setTimeout(() => {
            window.print();
            document.title = tituloOriginal;
            document.body.className = '';
        }, 500);
    }
};

// ==========================================
// INTEGRAÇÃO GLOBAL (Para Estoque/RH enviarem dados para cá)
// ==========================================
window.IntegracaoFinanceiro = {
    lancarDespesaAutomatica: function (descricao, valor, data, categoria) {
        const db = DbReader.getFin();
        if (!db.despesas) db.despesas = [];

        db.despesas.push({
            id: 'DESP_' + Date.now() + Math.floor(Math.random() * 1000),
            descricao: descricao,
            categoria: categoria, // 'MATERIAL' ou 'RH'
            valor: valor,
            vencimento: data,
            pago: true, // Lançamentos automáticos via sistema já entram como pagos
            cancelada: false
        });
        DbReader.saveFin(db);
    }
};

window.onload = () => Financeiro.init();