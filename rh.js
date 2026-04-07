// Inicializa ícones na carga inicial
lucide.createIcons();

const RHDb = {
    KEY: 'ks_rh_dados',
    get: function () {
        const data = localStorage.getItem(this.KEY);
        const parsed = data ? JSON.parse(data) : { funcionarios: [], pontos: [] };
        if (!parsed.descontosFechamento) parsed.descontosFechamento = [];
        return parsed;
    },
    save: function (data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    }
};

// Controlador do Modal Customizado
const ModalRH = {
    show: function (title, message, type = 'alert', onConfirm = null) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;
        const modal = document.getElementById('custom-modal');
        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');

        btnConfirm.onclick = null;
        btnCancel.onclick = null;

        btnConfirm.onclick = () => {
            modal.style.display = 'none';
            if (onConfirm) onConfirm();
        };

        if (type === 'confirm') {
            btnCancel.style.display = 'inline-block';
            btnCancel.onclick = () => modal.style.display = 'none';
        } else {
            btnCancel.style.display = 'none';
        }

        modal.style.display = 'flex';
    }
};

const RH_UI = {
    switchTab: function (tabId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`button[onclick="RH_UI.switchTab('${tabId}')"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        document.body.className = '';
        if (tabId === 'ponto') RH.renderPontoCards();
        if (tabId === 'fechamento') RH.renderSelectFechamento();
    }
};

const RH = {
    init: function () {
        this.renderTabelaFuncionarios();
        const hoje = new Date();
        const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
        document.getElementById('fechamento-mes').value = `${hoje.getFullYear()}-${mes}`;
    },

    salvarFuncionario: function () {
        const db = RHDb.get();
        const idCampo = document.getElementById('func-id').value;

        const func = {
            id: idCampo ? idCampo : Date.now().toString(),
            nome: document.getElementById('func-nome').value.trim(),
            cargo: document.getElementById('func-cargo').value.trim(),
            dataAdmissao: document.getElementById('func-admissao').value,
            tipo: document.getElementById('func-tipo').value,
            valorBase: parseFloat(document.getElementById('func-valor').value),
            cargaHoraria: parseFloat(document.getElementById('func-carga').value)
        };

        if (idCampo) {
            const index = db.funcionarios.findIndex(f => f.id === idCampo);
            if (index > -1) db.funcionarios[index] = func;
        } else {
            db.funcionarios.push(func);
        }

        RHDb.save(db);
        document.getElementById('form-func').reset();
        document.getElementById('func-id').value = '';
        this.renderTabelaFuncionarios();
    },

    excluirFuncionario: function (id) {
        ModalRH.show('Atenção', 'Tem certeza que deseja excluir este funcionário?', 'confirm', () => {
            const db = RHDb.get();
            db.funcionarios = db.funcionarios.filter(f => f.id !== id);
            RHDb.save(db);
            this.renderTabelaFuncionarios();
        });
    },

    renderTabelaFuncionarios: function () {
        const db = RHDb.get();
        const tbody = document.querySelector('#tabela-funcionarios tbody');
        tbody.innerHTML = '';
        db.funcionarios.forEach(f => {
            const admissaoStr = f.dataAdmissao ? f.dataAdmissao.split('-').reverse().join('/') : '--/--/----';
            tbody.innerHTML += `<tr id="tr-func-${f.id}">
                <td>${f.nome}</td>
                <td>${f.cargo}</td>
                <td>${admissaoStr}</td>
                <td>${f.tipo}</td>
                <td>R$ ${f.valorBase.toFixed(2)}</td>
                <td>${f.cargaHoraria}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="RH.iniciarEdicaoFuncionario('${f.id}')" style="background: transparent; border: none; cursor: pointer; color: var(--primary-color); padding: 0;" title="Editar">
                            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-danger" onclick="RH.excluirFuncionario('${f.id}')" style="padding: 4px;"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        });
        lucide.createIcons();
    },

    iniciarEdicaoFuncionario: function (id) {
        const db = RHDb.get();
        const f = db.funcionarios.find(func => func.id === id);
        if (!f) return;

        const tr = document.getElementById(`tr-func-${id}`);
        tr.innerHTML = `
            <td><input type="text" id="edit-f-nome-${id}" value="${f.nome}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td><input type="text" id="edit-f-cargo-${id}" value="${f.cargo}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td><input type="date" id="edit-f-admissao-${id}" value="${f.dataAdmissao || ''}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td>
                <select id="edit-f-tipo-${id}" style="width: 100%; margin: 0; padding: 4px; font-size: 12px;">
                    <option value="Mensalista" ${f.tipo === 'Mensalista' ? 'selected' : ''}>Mensalista</option>
                    <option value="Horista" ${f.tipo === 'Horista' ? 'selected' : ''}>Horista</option>
                </select>
            </td>
            <td><input type="number" id="edit-f-valor-${id}" value="${f.valorBase}" step="0.01" style="width: 80px; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td><input type="number" id="edit-f-carga-${id}" value="${f.cargaHoraria}" style="width: 60px; margin: 0; padding: 4px; font-size: 12px;"></td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button onclick="RH.salvarEdicaoFuncionario('${id}')" style="background: var(--success-color); border: none; color: white; border-radius: 4px; padding: 6px; cursor: pointer;"><i data-lucide="check" style="width: 14px; height: 14px;"></i></button>
                    <button onclick="RH.renderTabelaFuncionarios()" style="background: var(--danger-color); border: none; color: white; border-radius: 4px; padding: 6px; cursor: pointer;"><i data-lucide="x" style="width: 14px; height: 14px;"></i></button>
                </div>
            </td>
        `;
        lucide.createIcons();
    },

    salvarEdicaoFuncionario: function (id) {
        const db = RHDb.get();
        const index = db.funcionarios.findIndex(f => f.id === id);
        if (index === -1) return;

        db.funcionarios[index] = {
            id: id,
            nome: document.getElementById(`edit-f-nome-${id}`).value.trim(),
            cargo: document.getElementById(`edit-f-cargo-${id}`).value.trim(),
            dataAdmissao: document.getElementById(`edit-f-admissao-${id}`).value,
            tipo: document.getElementById(`edit-f-tipo-${id}`).value,
            valorBase: parseFloat(document.getElementById(`edit-f-valor-${id}`).value),
            cargaHoraria: parseFloat(document.getElementById(`edit-f-carga-${id}`).value)
        };

        RHDb.save(db);
        this.renderTabelaFuncionarios();
    },

    renderPontoCards: function () {
        const db = RHDb.get();
        const container = document.getElementById('lista-pontos');
        container.innerHTML = '';

        if (db.funcionarios.length === 0) {
            container.innerHTML = '<p>Nenhum funcionário cadastrado.</p>';
            return;
        }

        db.funcionarios.forEach(f => {
            const pontoAberto = db.pontos.find(p => p.idFunc === f.id && !p.saida);
            const statusClass = pontoAberto ? 'status-trabalhando' : 'status-ausente';
            const statusText = pontoAberto ? 'Trabalhando' : 'Ausente';

            let btnAction = '';
            if (!pontoAberto) {
                btnAction = `<button class="btn-primary" onclick="RH.registrarPonto('${f.id}', 'entrada')">Registrar Entrada</button>`;
            } else {
                const entradaStr = new Date(pontoAberto.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                btnAction = `
                    <span style="font-size: 12px; color: var(--text-muted); margin-right: 15px;">Entrada: ${entradaStr}</span>
                    <button class="btn-outline" style="border-color: var(--danger-color); color: var(--danger-color);" onclick="RH.registrarPonto('${f.id}', 'saida')">Registrar Saída</button>
                `;
            }

            container.innerHTML += `
                <div class="ponto-card">
                    <div>
                        <h3 style="margin-bottom: 5px;">${f.nome}</h3>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        ${btnAction}
                    </div>
                </div>
            `;
        });
    },

    registrarPonto: function (idFunc, tipo) {
        const db = RHDb.get();
        const agora = new Date().toISOString();

        if (tipo === 'entrada') {
            db.pontos.push({ id: Date.now().toString(), idFunc: idFunc, entrada: agora, saida: null });
        } else {
            const index = db.pontos.findIndex(p => p.idFunc === idFunc && !p.saida);
            if (index > -1) db.pontos[index].saida = agora;
        }

        RHDb.save(db);
        this.renderPontoCards();
    },

    renderSelectFechamento: function () {
        const db = RHDb.get();
        const select = document.getElementById('fechamento-func');
        select.innerHTML = '<option value="">-- Selecione --</option>';
        db.funcionarios.forEach(f => {
            select.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
        });
    },

    adicionarDescontoManual: function () {
        const desc = document.getElementById('desc-nome').value.trim();
        const ref = document.getElementById('desc-ref').value.trim();
        const valor = parseFloat(document.getElementById('desc-valor').value);

        if (!desc || isNaN(valor) || valor <= 0) {
            ModalRH.show('Aviso', 'Preencha a descrição e um valor numérico válido.');
            return;
        }

        const idFunc = document.getElementById('fechamento-func').value;
        const mesAno = document.getElementById('fechamento-mes').value;

        if (!idFunc || !mesAno) {
            ModalRH.show('Aviso', 'Selecione o funcionário e o mês antes de adicionar o desconto.');
            return;
        }

        const db = RHDb.get();
        db.descontosFechamento.push({
            id: Date.now().toString(),
            idFunc, mesAno, desc, ref, valor
        });

        RHDb.save(db);
        document.getElementById('desc-nome').value = '';
        document.getElementById('desc-ref').value = '';
        document.getElementById('desc-valor').value = '';

        this.calcularFechamento();
    },

    removerDescontoManual: function (idDesconto) {
        const db = RHDb.get();
        db.descontosFechamento = db.descontosFechamento.filter(d => d.id !== idDesconto);
        RHDb.save(db);
        this.calcularFechamento();
    },

    fechamentoAtual: null,

    calcularFechamento: function () {
        const idFunc = document.getElementById('fechamento-func').value;
        const mesAno = document.getElementById('fechamento-mes').value;
        const areaRes = document.getElementById('resultado-fechamento');

        if (!idFunc || !mesAno) { areaRes.style.display = 'none'; return; }

        const db = RHDb.get();
        const func = db.funcionarios.find(f => f.id === idFunc);
        if (!func) return;

        const pontosMes = db.pontos.filter(p => {
            if (!p.saida) return false;
            const dataEntrada = new Date(p.entrada);
            const mesPonto = `${dataEntrada.getFullYear()}-${(dataEntrada.getMonth() + 1).toString().padStart(2, '0')}`;
            return (p.idFunc === idFunc && mesPonto === mesAno);
        });

        // Agrupamento por data para a interface
        const agrupados = {};
        let totalHoras = 0;
        pontosMes.sort((a, b) => new Date(a.entrada) - new Date(b.entrada)).forEach(p => {
            const dataStr = new Date(p.entrada).toLocaleDateString('pt-BR');
            if (!agrupados[dataStr]) agrupados[dataStr] = { pontos: [], totalDia: 0 };
            const h = (new Date(p.saida).getTime() - new Date(p.entrada).getTime()) / (1000 * 60 * 60);
            agrupados[dataStr].pontos.push(p);
            agrupados[dataStr].totalDia += h;
            totalHoras += h;
        });

        const tbodyEx = document.querySelector('#tabela-extrato tbody');
        tbodyEx.innerHTML = Object.keys(agrupados).map(data => {
            const dia = agrupados[data];
            const turnosDesc = dia.pontos.map(p =>
                `${new Date(p.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(p.saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            ).join(' / ');

            return `<tr><td>${data}</td><td>${turnosDesc}</td><td>${dia.totalDia.toFixed(2)}h</td></tr>`;
        }).join('');

        const descontosDesseMes = db.descontosFechamento.filter(d => d.idFunc === idFunc && d.mesAno === mesAno);
        const tbodyDesc = document.querySelector('#tabela-descontos-manuais tbody');
        tbodyDesc.innerHTML = descontosDesseMes.map(d => `<tr><td>${d.desc}</td><td>${d.ref || '-'}</td><td>R$ ${d.valor.toFixed(2)}</td><td><button class="btn-danger" onclick="RH.removerDescontoManual('${d.id}')"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button></td></tr>`).join('');

        let proventosExtras = 0;
        let descontosFaltas = 0;
        let totalVencimentos = 0;

        if (func.tipo === 'Horista') {
            totalVencimentos = totalHoras * func.valorBase;
        } else {
            const valorHora = func.valorBase / func.cargaHoraria;
            if (totalHoras > func.cargaHoraria) {
                proventosExtras = (totalHoras - func.cargaHoraria) * valorHora;
                totalVencimentos = func.valorBase + proventosExtras;
            } else if (totalHoras < func.cargaHoraria) {
                descontosFaltas = (func.cargaHoraria - totalHoras) * valorHora;
                totalVencimentos = func.valorBase;
            } else {
                totalVencimentos = func.valorBase;
            }
        }

        const valorLiquido = totalVencimentos - descontosFaltas - descontosDesseMes.reduce((a, b) => a + b.valor, 0);

        document.getElementById('res-nome').innerText = func.nome;
        document.getElementById('res-liquido').innerText = `R$ ${valorLiquido.toFixed(2).replace('.', ',')}`;

        areaRes.style.display = 'block';
        lucide.createIcons();

        this.fechamentoAtual = {
            func, mesAno, totalHoras, valorLiquido, agrupados,
            proventosExtras, descontosFaltas, totalVencimentos,
            descontosManuais: descontosDesseMes, somaDescontosManuais: descontosDesseMes.reduce((a, b) => a + b.valor, 0)
        };
    },

    limparHorasPeriodo: function () {
        const idFunc = document.getElementById('fechamento-func').value;
        const mesAno = document.getElementById('fechamento-mes').value;

        if (!idFunc || !mesAno) return;

        const db = RHDb.get();
        const func = db.funcionarios.find(f => f.id === idFunc);

        ModalRH.show('Atenção Crítica', `Deseja apagar permanentemente todos os registros de ponto de ${func.nome} referentes ao mês ${mesAno}?`, 'confirm', () => {
            db.pontos = db.pontos.filter(p => {
                const dataEntrada = new Date(p.entrada);
                const mesPonto = `${dataEntrada.getFullYear()}-${(dataEntrada.getMonth() + 1).toString().padStart(2, '0')}`;
                return !(p.idFunc === idFunc && mesPonto === mesAno);
            });
            RHDb.save(db);
            this.calcularFechamento();
            ModalRH.show('Sucesso', 'Banco de horas do período limpo!');
        });
    },

    mostrarRelatorio: function () {
        if (!this.fechamentoAtual) return;
        const data = this.fechamentoAtual;
        const [ano, mes] = data.mesAno.split('-');

        let linhas = '';
        Object.keys(data.agrupados).forEach(d => {
            const dia = data.agrupados[d];
            const t1 = dia.pontos[0] ? { e: new Date(dia.pontos[0].entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), s: new Date(dia.pontos[0].saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } : { e: '-', s: '-' };
            const t2 = dia.pontos[1] ? { e: new Date(dia.pontos[1].entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), s: new Date(dia.pontos[1].saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } : { e: '-', s: '-' };
            linhas += `<tr style="border-bottom: 1px solid #1e293b;"><td style="padding:14px; color:#94a3b8;">${d}</td><td align="center" style="color:#f8fafc;">${t1.e}</td><td align="center" style="color:#f8fafc;">${t1.s}</td><td align="center" style="color:#f8fafc;">${t2.e}</td><td align="center" style="color:#f8fafc;">${t2.s}</td><td align="right" style="color:#eab308; font-weight:bold;">${dia.totalDia.toFixed(2)}h</td></tr>`;
        });

        document.getElementById('relatorio-conteudo').innerHTML = `
            <div style="display:flex; gap:30px; flex:1; min-height:0;">
                <div style="flex:1.8; display:flex; flex-direction:column; background:#020617; border-radius:8px; border:1px solid #1e293b;">
                    <div style="padding:15px 20px; background:#1e293b; color:#f8fafc; font-weight:bold;">EXTRATO DE JORNADA DIÁRIA (${mes}/${ano})</div>
                    <div style="flex:1; overflow-y:auto; padding: 0 10px;">
                        <table style="width:100%; border-collapse:collapse; font-size:14px;">
                            <thead style="position:sticky; top:0; background:#020617; color:#64748b; font-size:11px; text-transform:uppercase;">
                                <tr><th style="padding:15px; text-align:left;">Data</th><th colspan="2" style="padding:15px;">Manhã (E/S)</th><th colspan="2" style="padding:15px;">Tarde (E/S)</th><th align="right" style="padding:15px;">Total</th></tr>
                            </thead>
                            <tbody>${linhas}</tbody>
                        </table>
                    </div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
                    <div style="background:#020617; border-radius:8px; border:1px solid #1e293b; padding:20px; flex:1; overflow-y:auto;">
                        <h4 style="color:#ef4444; margin-bottom:10px;">DESCONTOS</h4>
                        <table style="width:100%; font-size:13px; color:#94a3b8;">
                            ${data.descontosManuais.map(d => `<tr><td>${d.desc}</td><td align="right">- R$ ${d.valor.toFixed(2)}</td></tr>`).join('')}
                            ${data.descontosFaltas > 0 ? `<tr><td>Faltas/Atrasos</td><td align="right">- R$ ${data.descontosFaltas.toFixed(2)}</td></tr>` : ''}
                        </table>
                    </div>
                    <div style="background:#1e293b; border:2px solid #10b981; padding:25px; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:10px;"><span>Total Bruto:</span><span style="color:#f8fafc; font-weight:bold;">R$ ${data.totalVencimentos.toFixed(2).replace('.', ',')}</span></div>
                        <div style="border-top:1px solid rgba(148,163,184,0.1); padding-top:15px;">
                            <div style="color:#10b981; font-size:12px; font-weight:bold; text-transform:uppercase;">Valor Líquido</div>
                            <div style="color:#10b981; font-size:36px; font-weight:800;">R$ ${data.valorLiquido.toFixed(2).replace('.', ',')}</div>
                        </div>
                    </div>
                </div>
            </div>`;
        document.getElementById('modal-relatorio').style.display = 'flex';
        lucide.createIcons();
    },

    imprimirHolerite: function () {
        if (!this.fechamentoAtual) return;
        document.getElementById('modal-relatorio').style.display = 'none';

        const data = this.fechamentoAtual;
        const [ano, mes] = data.mesAno.split('-');
        const admissaoStr = data.func.dataAdmissao?.split('-').reverse().join('/') || '--/--/----';

        // --- LÓGICA DO NOME DO ARQUIVO ---
        const nomeArquivo = `Holerite - ${data.func.nome} - ${mes}_${ano}`;
        const tituloOriginal = document.title; // Guarda o título original (RH - KS Afinações)
        document.title = nomeArquivo; // Define o nome que o PDF terá
        // ---------------------------------

        let linhasDescontosExtrasHTML = '';
        data.descontosManuais.forEach((desc, index) => {
            const codExibicao = (4 + index).toString().padStart(3, '0');
            linhasDescontosExtrasHTML += `
                <tr style="color: #000 !important;">
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000;">${codExibicao}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000;">${desc.desc.toUpperCase()}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000;">${desc.ref || ''}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000;"></td>
                    <td style="padding: 4px; text-align: right; border-bottom: 1px solid #000;">${desc.valor.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });

        const totalGeralDescontos = data.descontosFaltas + data.somaDescontosManuais;

        const generateVia = (viaName) => `
        <div style="width: 100%; height: 100%; border: 1px solid #000; box-sizing: border-box; background: #fff; display: flex; flex-direction: column; font-family: Arial, sans-serif; color: #000 !important;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding: 6px; color: #000 !important;">
                <div style="font-size: 10px; line-height: 1.3;">
                    <strong style="font-size: 12px; color: #000 !important;">KS AFINAÇÕES</strong><br>
                    <span style="color: #000 !important;">Estância Triângulo - Estrada, Rodovia - a Loanda<br>
                    Santa Isabel do Ivaí - PR, 87900-000<br>
                    CNPJ: 42.360.395/0001-83</span>
                </div>
                <div style="text-align: right; font-size: 10px;">
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
                <div style="display: flex; width: 100%;">
                    <div style="width: 100%; padding: 4px; color: #000 !important;">
                        <span style="font-size: 8px; color: #000 !important;">Cargo:</span> <strong style="font-size: 11px; color: #000 !important;">${data.func.cargo.toUpperCase()}</strong>
                    </div>
                </div>
            </div>

            <div style="flex: 1; width: 100%; border-bottom: 1px solid #000;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #000 !important;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="width: 10%; padding: 4px; border-right: 1px solid #000; font-weight: bold; text-align: center; color: #000 !important;">Cód.</th>
                            <th style="width: 45%; padding: 4px; border-right: 1px solid #000; text-align: left; font-weight: bold; color: #000 !important;">Descrição</th>
                            <th style="width: 15%; padding: 4px; border-right: 1px solid #000; text-align: center; color: #000 !important;">Ref</th>
                            <th style="width: 15%; padding: 4px; border-right: 1px solid #000; text-align: right; font-weight: bold; color: #000 !important;">Vencimentos</th>
                            <th style="width: 15%; padding: 4px; text-align: right; font-weight: bold; color: #000 !important;">Descontos</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">001</td>
                            <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">SALÁRIO NORMAL</td>
                            <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">${data.func.cargaHoraria}</td>
                            <td style="padding: 4px; border-right: 1px solid #000; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${data.func.valorBase.toFixed(2).replace('.', ',')}</td>
                            <td style="padding: 4px; border-bottom: 1px solid #000; color: #000 !important;"></td>
                        </tr>
                        ${data.proventosExtras > 0 ? `<tr style="color: #000 !important;"><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000;">002</td><td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000;">HORAS EXTRAS</td><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000;">${(data.totalHoras - data.func.cargaHoraria).toFixed(2)}</td><td style="padding: 4px; border-right: 1px solid #000; text-align: right; border-bottom: 1px solid #000;">${data.proventosExtras.toFixed(2).replace('.', ',')}</td><td style="padding: 4px; border-bottom: 1px solid #000;"></td></tr>` : ''}
                        ${data.descontosFaltas > 0 ? `<tr style="color: #000 !important;"><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000;">003</td><td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000;">FALTAS / ATRASOS</td><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000;">-</td><td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000;"></td><td style="padding: 4px; text-align: right; border-bottom: 1px solid #000;">${data.descontosFaltas.toFixed(2).replace('.', ',')}</td></tr>` : ''}
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
                            <span style="font-size: 8px;">Total Vencimentos</span><br>
                            <strong>${data.totalVencimentos.toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div style="width: 50%; padding: 4px; text-align: right; color: #000 !important;">
                            <span style="font-size: 8px;">Total Descontos</span><br>
                            <strong>${totalGeralDescontos.toFixed(2).replace('.', ',')}</strong>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px; flex: 1; color: #000 !important;">
                        <span style="font-size: 10px; font-weight: bold;">Valor Líquido ⇨</span>
                        <strong style="font-size: 14px;">R$ ${data.valorLiquido.toFixed(2).replace('.', ',')}</strong>
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

        document.getElementById('print-area-holerite').innerHTML = `
            <style>
                #print-area-holerite * { color: #000 !important; }
            </style>
            <div class="print-half-holerite">${generateVia('1ª VIA - EMPRESA')}</div>
            <div class="print-separator-holerite"></div>
            <div class="print-half-holerite">${generateVia('2ª VIA - FUNCIONÁRIO')}</div>
        `;

        document.body.classList.add('printing-holerite');

        setTimeout(() => {
            window.print();
            document.body.classList.remove('printing-holerite');
            document.title = tituloOriginal; // Restaura o título original do sistema
        }, 500);
    }
};

window.onload = () => RH.init();