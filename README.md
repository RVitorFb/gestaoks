<p align="center">
  <img src="lg.png" alt="KS Afinações Logo" width="150"/>
</p>

<h1 align="center">Sistema de Gestão - KS Afinações</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Concluído-success?style=for-the-badge&logo=check" alt="Status">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>

<p align="center">
  Um sistema web completo, responsivo e de alta performance criado para a gestão de produtos, clientes, tabelas de preços e emissão de notas. 
  <br>Desenvolvido com foco na usabilidade e compatibilidade total com dispositivos móveis.
</p>

<hr>

## ✨ Funcionalidades

<table>
  <tr>
    <td>📦 <b>Gestão de Produtos</b></td>
    <td>Cadastro, edição completa e exclusão de peças. Controle de variações de acabamento (Cromada, Pintura, Polida).</td>
  </tr>
  <tr>
    <td>👥 <b>Gestão de Clientes</b></td>
    <td>Banco de dados de clientes com Nome, CNPJ, Endereço e Telefone. Edição rápida diretamente na tabela.</td>
  </tr>
  <tr>
    <td>📄 <b>Emissão de Notas</b></td>
    <td>Geração de notas em duas vias com cálculo automático e layout inteligentemente rotacionado via CSS para salvar em PDF pelo celular.</td>
  </tr>
  <tr>
    <td>📈 <b>Tabelas e Reajustes</b></td>
    <td>Criação de tabelas de preços para impressão e ferramenta para aplicação de reajuste em massa (porcentagem) gerando relatórios.</td>
  </tr>
  <tr>
    <td>☁️ <b>Backup em Nuvem</b></td>
    <td>Sincronização nativa com o <b>Google Drive</b> via API para salvar e restaurar dados facilmente.</td>
  </tr>
</table>

## 📱 Destaque Técnico: Impressão Mobile

O sistema resolve um problema clássico de navegadores mobile ao gerar PDFs: a folha de impressão é mantida em orientação *Portrait* (Retrato) para não conflitar com o sistema do celular, mas o conteúdo da nota é perfeitamente dimensionado e rotacionado em 90 graus (`transform: rotate(90deg)`), ocupando a página inteira em modo paisagem sem cortar informações.

## 🚀 Como Executar o Projeto

Por ser um sistema *Single Page Application* (SPA) estático, você não precisa de um servidor complexo ou banco de dados rodando por trás.

1. Faça o clone deste repositório:
   ```bash
   git clone [https://github.com/SEU-USUARIO/ks-afinacoes.git](https://github.com/SEU-USUARIO/ks-afinacoes.git)
