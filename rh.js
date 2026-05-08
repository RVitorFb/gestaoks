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
        // Aciona o backup se ele existir no script local
        if (typeof DB !== 'undefined' && DB.save) {
            const dadosNotas = DB.get();
            DB.save(dadosNotas);
        }
    }
};

const ModalRH = {
    show: function (title, message, type = 'alert', onConfirm = null) {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;
        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');
        btnConfirm.onclick = () => { modal.style.display = 'none'; if (onConfirm) onConfirm(); };
        btnCancel.style.display = (type === 'confirm') ? 'inline-block' : 'none';
        btnCancel.onclick = () => modal.style.display = 'none';
        modal.style.display = 'flex';
    }
};

const RH_UI = {
    switchTab: function (tabId) {
        document.querySelectorAll('.nav-btn, .tab-content').forEach(el => el.classList.remove('active'));
        const btn = document.querySelector(`button[onclick*="${tabId}"]`);
        if (btn) btn.classList.add('active');
        const content = document.getElementById(`tab-${tabId}`);
        if (content) content.classList.add('active');
        if (tabId === 'ponto') RH.renderPontoCards();
        if (tabId === 'fechamento') RH.renderSelectFechamento();
    }
};

const RH = {
    init: function () {
        this.renderTabelaFuncionarios();
        const hoje = new Date();
        document.getElementById('fechamento-mes').value = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    },

    salvarFuncionario: function () {
        const db = RHDb.get();
        const id = document.getElementById('func-id').value || Date.now().toString();
        const func = {
            id,
            nome: document.getElementById('func-nome').value.trim(),
            cargo: document.getElementById('func-cargo').value.trim(),
            dataAdmissao: document.getElementById('func-admissao').value,
            tipo: document.getElementById('func-tipo').value,
            valorBase: parseFloat(document.getElementById('func-valor').value),
            cargaHoraria: parseFloat(document.getElementById('func-carga').value)
        };
        const idx = db.funcionarios.findIndex(f => f.id === id);
        if (idx > -1) db.funcionarios[idx] = func; else db.funcionarios.push(func);
        RHDb.save(db);
        document.getElementById('form-func').reset();
        document.getElementById('func-id').value = '';
        this.renderTabelaFuncionarios();
    },

    renderTabelaFuncionarios: function () {
        const db = RHDb.get();
        const tbody = document.querySelector('#tabela-funcionarios tbody');
        tbody.innerHTML = db.funcionarios.map(f => `
            <tr id="tr-func-${f.id}">
                <td>${f.nome}</td>
                <td>${f.cargo}</td>
                <td>${f.dataAdmissao?.split('-').reverse().join('/') || '-'}</td>
                <td>${f.tipo}</td>
                <td>R$ ${f.valorBase.toFixed(2)}</td>
                <td>${f.cargaHoraria}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="RH.iniciarEdicaoFuncionario('${f.id}')" style="background: transparent; border: none; cursor: pointer; color: #eab308; padding: 0;"><i data-lucide="pencil" style="width: 16px;"></i></button>
                        <button class="btn-danger" onclick="RH.excluirFuncionario('${f.id}')" style="padding: 4px;"><i data-lucide="trash-2" style="width: 16px;"></i></button>
                    </div>
                </td>
            </tr>`).join('');
        lucide.createIcons();
    },

    iniciarEdicaoFuncionario: function (id) {
        const db = RHDb.get();
        const f = db.funcionarios.find(func => func.id === id);
        if (!f) return;
        const tr = document.getElementById(`tr-func-${id}`);
        tr.innerHTML = `
            <td><input type="text" id="edit-f-nome-${id}" value="${f.nome}" style="width:100%; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"></td>
            <td><input type="text" id="edit-f-cargo-${id}" value="${f.cargo}" style="width:100%; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"></td>
            <td><input type="date" id="edit-f-admissao-${id}" value="${f.dataAdmissao || ''}" style="width:100%; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"></td>
            <td><select id="edit-f-tipo-${id}" style="width:100%; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"><option value="Mensalista" ${f.tipo === 'Mensalista' ? 'selected' : ''}>Mensalista</option><option value="Horista" ${f.tipo === 'Horista' ? 'selected' : ''}>Horista</option></select></td>
            <td><input type="number" id="edit-f-valor-${id}" value="${f.valorBase}" step="0.01" style="width:80px; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"></td>
            <td><input type="number" id="edit-f-carga-${id}" value="${f.cargaHoraria}" style="width:60px; background:#1e293b; color:#fff; border:1px solid #334155; padding:4px;"></td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button onclick="RH.salvarEdicaoFuncionario('${id}')" style="background: #10b981; border: none; color: #fff; padding: 6px; border-radius:4px; cursor:pointer;"><i data-lucide="check" style="width: 14px;"></i></button>
                    <button onclick="RH.renderTabelaFuncionarios()" style="background: #ef4444; border: none; color: #fff; padding: 6px; border-radius:4px; cursor:pointer;"><i data-lucide="x" style="width: 14px;"></i></button>
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
            id,
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

    excluirFuncionario: function (id) {
        ModalRH.show('Atenção', 'Remover este funcionário?', 'confirm', () => {
            const db = RHDb.get();
            db.funcionarios = db.funcionarios.filter(f => f.id !== id);
            RHDb.save(db);
            this.renderTabelaFuncionarios();
        });
    },

    registrarPonto: function (idFunc, tipo) {
        const db = RHDb.get();
        const agora = new Date().toISOString();
        if (tipo === 'entrada') db.pontos.push({ id: Date.now().toString(), idFunc, entrada: agora, saida: null });
        else { const p = db.pontos.find(p => p.idFunc === idFunc && !p.saida); if (p) p.saida = agora; }
        RHDb.save(db);
        this.renderPontoCards();
    },

    renderPontoCards: function () {
        const db = RHDb.get();
        const container = document.getElementById('lista-pontos');
        container.innerHTML = db.funcionarios.map(f => {
            const aberto = db.pontos.find(p => p.idFunc === f.id && !p.saida);
            return `
                <div class="ponto-card">
                    <div><h3>${f.nome}</h3><span class="status-badge ${aberto ? 'status-trabalhando' : 'status-ausente'}">${aberto ? 'Trabalhando' : 'Ausente'}</span></div>
                    <button class="${aberto ? 'btn-outline' : 'btn-primary'}" onclick="RH.registrarPonto('${f.id}','${aberto ? 'saida' : 'entrada'}')">${aberto ? 'Registrar Saída' : 'Registrar Entrada'}</button>
                </div>`;
        }).join('') || '<p>Nenhum funcionário cadastrado.</p>';
    },

    renderSelectFechamento: function () {
        const db = RHDb.get();
        document.getElementById('fechamento-func').innerHTML = '<option value="">Selecione</option>' + db.funcionarios.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    },

    importarDadosRelogio: function () {
        const fileInput = document.getElementById('import-relogio-file');
        const file = fileInput.files[0];

        if (!file) {
            ModalRH.show('Aviso', 'Por favor, selecione o arquivo .xls gerado pelo relógio primeiro.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            try {
                // Lê o arquivo Excel
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!jsonData || jsonData.length < 5) {
                    ModalRH.show('Erro', 'Formato de arquivo não reconhecido.');
                    return;
                }

                // 1. Encontrar o Cabeçalho (Nome e Data) ignorando linhas em branco
                let nomeRelogio = null;
                let mesAnoRelogio = null;
                let anoStr = null;
                let mesStr = null;

                for (let i = 0; i < Math.min(15, jsonData.length); i++) {
                    const linhaStr = (jsonData[i] || []).map(c => c || '').join('  ');

                    if (linhaStr.includes('Nome:') || linhaStr.includes('Data:')) {
                        const matchNome = linhaStr.match(/Nome:\s*(.+?)(?=\s\s|ID:|$)/i);
                        if (matchNome && !nomeRelogio) nomeRelogio = matchNome[1].trim();

                        const matchData = linhaStr.match(/Data:\s*(\d{2})\.(\d{2})\./i);
                        if (matchData && !mesAnoRelogio) {
                            anoStr = "20" + matchData[1];
                            mesStr = matchData[2];
                            mesAnoRelogio = `${anoStr}-${mesStr}`;
                        }
                    }
                }

                if (!nomeRelogio || !mesAnoRelogio) {
                    ModalRH.show('Erro', 'Não foi possível identificar o Nome ou o Mês de Referência (Data) no cabeçalho do arquivo.');
                    return;
                }

                const db = RHDb.get();
                const func = db.funcionarios.find(f => f.nome.toLowerCase() === nomeRelogio.toLowerCase());

                if (!func) {
                    ModalRH.show('Erro', `Funcionário "${nomeRelogio}" não encontrado no sistema. O nome deve estar idêntico.`);
                    return;
                }

                // 2. Encontrar onde começam os dados de ponto (dias)
                let startIndex = -1;
                for (let i = 0; i < jsonData.length; i++) {
                    const col0 = String((jsonData[i] || [])[0] || '').trim();
                    if (/^\d{2}\.\d{2}$/.test(col0)) {
                        startIndex = i;
                        break;
                    }
                }

                if (startIndex === -1) {
                    ModalRH.show('Erro', 'Não foi possível encontrar as datas de ponto no arquivo.');
                    return;
                }

                ModalRH.show('Confirmar Importação', `Deseja importar as horas de ${nomeRelogio} para ${mesStr}/${anoStr}? Isso não apagará os dados já existentes, apenas adicionará novos pontos.`, 'confirm', () => {

                    let pontosAdicionados = 0;

                    for (let i = startIndex; i < jsonData.length; i++) {
                        const row = jsonData[i] || [];
                        if (row.length === 0) continue;

                        const processarDia = (dataColIndex, in1Idx, out1Idx, in2Idx, out2Idx) => {
                            const dataCelula = row[dataColIndex];
                            if (!dataCelula) return;

                            const diaMatch = dataCelula.toString().trim().match(/^(\d{2})\.(\d{2})$/);
                            if (!diaMatch) return;

                            const diaStr = diaMatch[2]; // Captura apenas o DIA (Ex: 04.01 -> 01)

                            const limparHora = (horaRaw) => {
                                if (!horaRaw) return null;
                                const hStr = horaRaw.toString().replace(/\*/g, '').trim();
                                if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(hStr)) return hStr;
                                return null;
                            };

                            // CORREÇÃO: Cria a data considerando o Fuso Horário local antes de salvar no sistema
                            const criarDataIsoLocal = (horaLimpa) => {
                                if (!horaLimpa) return null;
                                const [h, m] = horaLimpa.split(':');
                                return new Date(parseInt(anoStr), parseInt(mesStr) - 1, parseInt(diaStr), parseInt(h), parseInt(m)).toISOString();
                            };

                            const in1Iso = criarDataIsoLocal(limparHora(row[in1Idx]));
                            const out1Iso = criarDataIsoLocal(limparHora(row[out1Idx]));
                            const in2Iso = criarDataIsoLocal(limparHora(row[in2Idx]));
                            const out2Iso = criarDataIsoLocal(limparHora(row[out2Idx]));

                            if (in1Iso && out1Iso) {
                                db.pontos.push({
                                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                    idFunc: func.id,
                                    entrada: in1Iso,
                                    saida: out1Iso
                                });
                                pontosAdicionados++;
                            }

                            if (in2Iso && out2Iso) {
                                db.pontos.push({
                                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                    idFunc: func.id,
                                    entrada: in2Iso,
                                    saida: out2Iso
                                });
                                pontosAdicionados++;
                            }
                        };

                        // Metade esquerda da tabela (Colunas: Data=0, Entrada1=2, Saida1=3, Entrada2=4, Saida2=5)
                        processarDia(0, 2, 3, 4, 5);

                        // Metade direita da tabela (Colunas: Data=8, Entrada1=10, Saida1=11, Entrada2=12, Saida2=13)
                        processarDia(8, 10, 11, 12, 13);
                    }

                    RHDb.save(db);

                    document.getElementById('fechamento-func').value = func.id;
                    document.getElementById('fechamento-mes').value = mesAnoRelogio;
                    RH.calcularFechamento();

                    ModalRH.show('Sucesso', `${pontosAdicionados} turnos importados com sucesso!`);
                    fileInput.value = '';
                });

            } catch (error) {
                console.error(error);
                ModalRH.show('Erro', 'Ocorreu um erro ao processar o arquivo.');
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
        if (!idFunc || !mesAno) return;
        const db = RHDb.get();
        const func = db.funcionarios.find(f => f.id === idFunc);
        if (!func) return;

        const pontos = db.pontos.filter(p => p.saida && p.idFunc === idFunc && p.entrada.startsWith(mesAno));
        const agrupados = {};
        let totalHoras = 0;
        pontos.sort((a, b) => new Date(a.entrada) - new Date(b.entrada)).forEach(p => {
            const d = new Date(p.entrada).toLocaleDateString('pt-BR');
            if (!agrupados[d]) agrupados[d] = { pontos: [], totalDia: 0 };
            const h = (new Date(p.saida) - new Date(p.entrada)) / 36e5;
            agrupados[d].pontos.push(p); agrupados[d].totalDia += h; totalHoras += h;
        });

        const tbodyEx = document.querySelector('#tabela-extrato tbody');
        tbodyEx.innerHTML = Object.keys(agrupados).map(d => {
            const dia = agrupados[d];
            const turnosHTML = dia.pontos.map(p => {
                const ent = new Date(p.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const sai = new Date(p.saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span>${ent} - ${sai}</span>
                            <button onclick="RH.editarHoraPonto('${p.id}')" style="background:transparent; border:none; color:#eab308; cursor:pointer; padding:0;" title="Editar">
                                <i data-lucide="pencil" style="width:13px; height:13px;"></i>
                            </button>
                            <button onclick="RH.excluirHoraPonto('${p.id}')" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:0;" title="Excluir">
                                <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
                            </button>
                        </div>`;
            }).join('');
            return `<tr><td>${d}</td><td>${turnosHTML}</td><td>${dia.totalDia.toFixed(2)}h</td></tr>`;
        }).join('');

        const descontos = db.descontosFechamento.filter(d => d.idFunc === idFunc && d.mesAno === mesAno);
        const somaDesc = descontos.reduce((a, b) => a + b.valor, 0);
        document.querySelector('#tabela-descontos-manuais tbody').innerHTML = descontos.map(d => `<tr><td>${d.desc}</td><td>${d.ref}</td><td>R$ ${d.valor.toFixed(2)}</td><td><button class="btn-danger" onclick="RH.removerDescontoManual('${d.id}')"><i data-lucide="trash-2" style="width:14px;"></i></button></td></tr>`).join('');

        const valorHora = func.valorBase / (func.tipo === 'Mensalista' ? func.cargaHoraria : 1);
        const bruto = func.tipo === 'Mensalista' ? (func.valorBase + (totalHoras > func.cargaHoraria ? (totalHoras - func.cargaHoraria) * valorHora : 0)) : totalHoras * func.valorBase;
        const descFaltas = (func.tipo === 'Mensalista' && totalHoras < func.cargaHoraria) ? (func.cargaHoraria - totalHoras) * valorHora : 0;

        this.fechamentoAtual = { func, mesAno, totalHoras, valorLiquido: bruto - descFaltas - somaDesc, totalVencimentos: bruto, descontosFaltas: descFaltas, descontosManuais: descontos, somaDescontosManuais: somaDesc, agrupados };
        document.getElementById('res-nome').innerText = func.nome;
        document.getElementById('res-liquido').innerText = `R$ ${this.fechamentoAtual.valorLiquido.toFixed(2).replace('.', ',')}`;
        document.getElementById('resultado-fechamento').style.display = 'block';
        lucide.createIcons();
    },

    pontoEmEdicaoId: null,

    editarHoraPonto: function (idPonto) {
        const db = RHDb.get();
        const ponto = db.pontos.find(p => p.id === idPonto);
        if (!ponto) return;

        this.pontoEmEdicaoId = idPonto;

        const entOriginal = new Date(ponto.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const saiOriginal = ponto.saida ? new Date(ponto.saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "";

        // ALIMENTA E ABRE O MODAL DO RELÓGIO (A TELA ESCURA DO FUNCIONARIOS.HTML)
        document.getElementById('edit-hora-entrada').value = entOriginal;
        document.getElementById('edit-hora-saida').value = saiOriginal;
        document.getElementById('modal-edit-hora').style.display = 'flex';
    },

    salvarEdicaoHora: function () {
        if (!this.pontoEmEdicaoId) return;

        const novaEntrada = document.getElementById('edit-hora-entrada').value;
        const novaSaida = document.getElementById('edit-hora-saida').value;

        if (!novaEntrada || !novaSaida) {
            ModalRH.show('Aviso', 'Preencha os dois horários para salvar.');
            return;
        }

        const db = RHDb.get();
        const ponto = db.pontos.find(p => p.id === this.pontoEmEdicaoId);
        if (!ponto) return;

        const dataRef = new Date(ponto.entrada);
        const [hE, mE] = novaEntrada.split(':');
        const [hS, mS] = novaSaida.split(':');

        const dEntrada = new Date(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate(), hE, mE);
        const dSaida = new Date(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate(), hS, mS);

        if (dSaida <= dEntrada) {
            ModalRH.show('Aviso', 'O horário de saída deve ser maior que o de entrada.');
            return;
        }

        ponto.entrada = dEntrada.toISOString();
        ponto.saida = dSaida.toISOString();

        RHDb.save(db);
        this.calcularFechamento();

        document.getElementById('modal-edit-hora').style.display = 'none';
        this.pontoEmEdicaoId = null;
    },

    excluirHoraPonto: function (idPonto) {
        ModalRH.show('Atenção', 'Deseja excluir permanentemente este horário?', 'confirm', () => {
            const db = RHDb.get();
            db.pontos = db.pontos.filter(p => p.id !== idPonto);
            RHDb.save(db);
            this.calcularFechamento();
        });
    },

    limparHorasPeriodo: function () {
        const idFunc = document.getElementById('fechamento-func').value;
        const mesAno = document.getElementById('fechamento-mes').value;
        ModalRH.show('Limpar Ponto', 'Apagar todos os registros do mês inteiro?', 'confirm', () => {
            const db = RHDb.get();
            db.pontos = db.pontos.filter(p => !(p.idFunc === idFunc && p.entrada.startsWith(mesAno)));
            RHDb.save(db);
            this.calcularFechamento();
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
            <div class="relatorio-mobile" style="display:flex; gap:30px; flex:1; min-height:0;">
                <div class="box-extrato" style="flex:1.8; display:flex; flex-direction:column; background:#020617; border-radius:8px; border:1px solid #1e293b;">
                    <div class="box-extrato-title" style="padding:15px 20px; background:#1e293b; color:#f8fafc; font-weight:bold;">EXTRATO DE JORNADA DIÁRIA (${mes}/${ano})</div>
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
                    <div class="box-descontos" style="background:#020617; border-radius:8px; border:1px solid #1e293b; padding:20px; flex:1; overflow-y:auto;">
                        <h4 style="color:#ef4444; margin-bottom:10px;">DESCONTOS</h4>
                        <table style="width:100%; font-size:13px; color:#94a3b8;">
                            ${data.descontosManuais.map(d => `<tr><td>${d.desc}</td><td align="right">- R$ ${d.valor.toFixed(2)}</td></tr>`).join('')}
                            ${data.descontosFaltas > 0 ? `<tr><td>Faltas/Atrasos</td><td align="right">- R$ ${data.descontosFaltas.toFixed(2)}</td></tr>` : ''}
                        </table>
                    </div>
                    <div class="box-resumo" style="background:#1e293b; border:2px solid #10b981; padding:25px; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:10px;"><span>Total Bruto:</span><span style="color:#f8fafc; font-weight:bold;">R$ ${data.totalVencimentos.toFixed(2).replace('.', ',')}</span></div>
                        <div style="border-top:1px solid rgba(148,163,184,0.1); padding-top:15px;">
                            <div style="color:#10b981; font-size:12px; font-weight:bold; text-transform:uppercase;">Valor Líquido</div>
                            <div class="texto-liquido" style="color:#10b981; font-size:36px; font-weight:800;">R$ ${data.valorLiquido.toFixed(2).replace('.', ',')}</div>
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

        const nomeArquivo = `Holerite - ${data.func.nome} - ${mes}_${ano}`;
        const tituloOriginal = document.title;
        document.title = nomeArquivo;

        let linhasDescontosExtrasHTML = '';
        data.descontosManuais.forEach((desc, index) => {
            const codExibicao = (4 + index).toString().padStart(3, '0');
            linhasDescontosExtrasHTML += `
                <tr>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">${codExibicao}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">${desc.desc.toUpperCase()}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">${desc.ref || ''}</td>
                    <td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;"></td>
                    <td style="padding: 4px; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${desc.valor.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });

        const totalGeralDescontos = data.descontosFaltas + data.somaDescontosManuais;

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
                            <th style="width: 15%; padding: 4px; border-right: 1px solid #000; font-weight: bold; text-align: center; color: #000 !important;">Referência</th>
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
                        ${data.proventosExtras > 0 ? `<tr><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">002</td><td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">HORAS EXTRAS</td><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">${(data.totalHoras - data.func.cargaHoraria).toFixed(2)}</td><td style="padding: 4px; border-right: 1px solid #000; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${data.proventosExtras.toFixed(2).replace('.', ',')}</td><td style="padding: 4px; border-bottom: 1px solid #000; color: #000 !important;"></td></tr>` : ''}
                        ${data.descontosFaltas > 0 ? `<tr><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">003</td><td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;">FALTAS / ATRASOS</td><td style="padding: 4px; border-right: 1px solid #000; text-align: center; border-bottom: 1px solid #000; color: #000 !important;">-</td><td style="padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #000 !important;"></td><td style="padding: 4px; text-align: right; border-bottom: 1px solid #000; color: #000 !important;">${data.descontosFaltas.toFixed(2).replace('.', ',')}</td></tr>` : ''}
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
                            <strong style="color: #000 !important;">${totalGeralDescontos.toFixed(2).replace('.', ',')}</strong>
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

        document.getElementById('print-area-holerite').innerHTML = `
            <div class="print-half-holerite">${generateVia('1ª VIA - EMPRESA')}</div>
            <div class="print-separator-holerite" style="border-top: 1px dashed #000; margin: 15px 0;"></div>
            <div class="print-half-holerite">${generateVia('2ª VIA - FUNCIONÁRIO')}</div>
        `;

        // A MÁGICA DA NOTA NO CELULAR: Apenas adiciona a classe, NÃO apaga ela via setTimeout depois
        document.body.className = 'printing-holerite';

        setTimeout(() => {
            window.print();
            document.title = tituloOriginal;
        }, 500);
    }
};

window.onload = () => RH.init();
