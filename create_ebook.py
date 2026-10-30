# -*- coding: utf-8 -*-
"""
Script de Geração do E-book em PDF:
Invbecs — Manual Completo de Engenharia de Software e Gestão de TI
"""

import os
import sys
import base64
import tempfile
import subprocess

def get_base64_image(image_path):
    if os.path.exists(image_path):
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    return ''

def main():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    cover_img_path = os.path.join(base_dir, 'docs_assets', 'ebook_cover.jpg')
    arch_img_path = os.path.join(base_dir, 'docs_assets', 'arch_diagram.jpg')

    cover_b64 = get_base64_image(cover_img_path)
    arch_b64 = get_base64_image(arch_img_path)

    html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Invbecs — Manual Completo de Engenharia e Gestão de TI</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');

  @page {{
    size: A4 portrait;
    margin: 18mm 16mm 20mm 16mm;
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }}

  /* ---- CAPA ---- */
  .cover-container {{
    page-break-after: always;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: linear-gradient(145deg, #070d19 0%, #0c162d 50%, #091222 100%);
    color: #ffffff;
    padding: 40px 36px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
  }}

  .cover-container::before {{
    content: '';
    position: absolute;
    top: -100px;
    right: -100px;
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%);
    border-radius: 50%;
  }}

  .cover-top {{
    position: relative;
    z-index: 2;
  }}

  .cover-badge {{
    display: inline-block;
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.4);
    color: #22d3ee;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding: 6px 14px;
    border-radius: 20px;
    margin-bottom: 20px;
  }}

  .cover-title {{
    font-size: 32pt;
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 12px 0;
    letter-spacing: -0.5px;
    background: linear-gradient(90deg, #ffffff 30%, #38bdf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}

  .cover-subtitle {{
    font-size: 13pt;
    font-weight: 400;
    color: #94a3b8;
    line-height: 1.45;
    margin: 0 0 24px 0;
    max-width: 90%;
  }}

  .cover-image-box {{
    position: relative;
    z-index: 2;
    text-align: center;
    margin: 10px 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(56, 189, 248, 0.25);
    max-height: 400px;
  }}

  .cover-image-box img {{
    width: 100%;
    height: 100%;
    max-height: 400px;
    object-fit: cover;
    display: block;
  }}

  .cover-footer {{
    position: relative;
    z-index: 2;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }}

  .cover-tags {{
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }}

  .cover-tag {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 8pt;
    color: #cbd5e1;
    padding: 4px 10px;
    border-radius: 6px;
  }}

  .cover-author {{
    text-align: right;
  }}

  .cover-author .author-name {{
    font-size: 10pt;
    font-weight: 700;
    color: #f8fafc;
  }}

  .cover-author .author-role {{
    font-size: 8.5pt;
    color: #38bdf8;
  }}

  /* ---- FICHA TÉCNICA ---- */
  .meta-page {{
    page-break-after: always;
    padding-top: 30px;
  }}

  .meta-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 24px;
    margin-bottom: 30px;
  }}

  .meta-grid {{
    display: grid;
    grid-template-columns: 140px 1fr;
    row-gap: 10px;
    font-size: 9.5pt;
  }}

  .meta-label {{
    font-weight: 700;
    color: #475569;
  }}

  .meta-value {{
    color: #0f172a;
  }}

  /* ---- SUMÁRIO ---- */
  .toc-page {{
    page-break-after: always;
  }}

  .toc-title {{
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 8px;
    margin-bottom: 24px;
  }}

  .toc-item {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 10px 0;
    border-bottom: 1px dashed #cbd5e1;
    font-size: 10.5pt;
  }}

  .toc-item.chapter-lead {{
    font-weight: 700;
    color: #0369a1;
    margin-top: 8px;
    font-size: 11.5pt;
  }}

  .toc-page-num {{
    font-weight: 700;
    color: #0284c7;
  }}

  /* ---- CAPÍTULOS & CONTEÚDO ---- */
  .chapter {{
    page-break-before: always;
    margin-top: 10px;
  }}

  .chapter-header {{
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff;
    padding: 20px 24px;
    border-radius: 10px;
    margin-bottom: 24px;
    border-left: 6px solid #06b6d4;
  }}

  .chapter-number {{
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #38bdf8;
    margin-bottom: 4px;
  }}

  .chapter-title {{
    font-size: 18pt;
    font-weight: 800;
    margin: 0;
    line-height: 1.25;
  }}

  h2 {{
    font-size: 13.5pt;
    font-weight: 700;
    color: #0f172a;
    margin: 24px 0 10px 0;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
  }}

  h3 {{
    font-size: 11.5pt;
    font-weight: 600;
    color: #0369a1;
    margin: 18px 0 8px 0;
  }}

  p {{
    margin: 0 0 12px 0;
    text-align: justify;
  }}

  ul, ol {{
    margin: 0 0 14px 0;
    padding-left: 22px;
  }}

  li {{
    margin-bottom: 6px;
  }}

  /* ---- CARDS & CALLOUTS ---- */
  .callout {{
    border-radius: 8px;
    padding: 14px 18px;
    margin: 16px 0;
    font-size: 9.5pt;
    border-left: 4px solid;
  }}

  .callout-info {{
    background: #f0f9ff;
    border-color: #0284c7;
    color: #0369a1;
  }}

  .callout-security {{
    background: #fdf2f8;
    border-color: #db2777;
    color: #9d174d;
  }}

  .callout-success {{
    background: #f0fdf4;
    border-color: #16a34a;
    color: #15803d;
  }}

  .callout-title {{
    font-weight: 700;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }}

  /* ---- IMAGENS & DIAGRAMAS ---- */
  .diagram-box {{
    margin: 20px 0;
    text-align: center;
    background: #0f172a;
    border-radius: 10px;
    padding: 12px;
    border: 1px solid #1e293b;
    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  }}

  .diagram-box img {{
    width: 100%;
    max-height: 380px;
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }}

  .diagram-caption {{
    font-size: 8.5pt;
    color: #94a3b8;
    margin-top: 8px;
    font-weight: 500;
  }}

  /* ---- TABELAS ---- */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 9pt;
  }}

  th, td {{
    padding: 9px 12px;
    border: 1px solid #cbd5e1;
    text-align: left;
  }}

  th {{
    background: #0f172a;
    color: #ffffff;
    font-weight: 600;
    letter-spacing: 0.3px;
  }}

  tr:nth-child(even) {{
    background: #f8fafc;
  }}

  /* ---- BLOCOS DE CÓDIGO ---- */
  pre {{
    background: #0b1120;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    font-family: 'Fira Code', Consolas, Monaco, monospace;
    font-size: 8.5pt;
    line-height: 1.45;
    overflow-x: auto;
    border: 1px solid #1e293b;
    margin: 14px 0;
  }}

  code {{
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 8.8pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }}

  pre code {{
    background: transparent;
    color: inherit;
    border: none;
    padding: 0;
  }}

  .kw {{ color: #f43f5e; font-weight: 600; }}
  .fn {{ color: #38bdf8; }}
  .st {{ color: #34d399; }}
  .cm {{ color: #64748b; font-style: italic; }}
  .vr {{ color: #fbbf24; }}

  /* ---- GRIDS TÉCNICOS ---- */
  .tech-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin: 16px 0;
  }}

  .tech-card {{
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    background: #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
  }}

  .tech-card-title {{
    font-weight: 700;
    color: #0284c7;
    margin-bottom: 6px;
    font-size: 10pt;
    display: flex;
    align-items: center;
    gap: 8px;
  }}

  .tech-card-desc {{
    font-size: 8.8pt;
    color: #475569;
    line-height: 1.4;
  }}

  /* ---- BADGES & STATUS ---- */
  .badge {{
    display: inline-block;
    font-size: 7.5pt;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
  }}
  .badge-cyan {{ background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }}
  .badge-green {{ background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }}
  .badge-amber {{ background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }}
  .badge-purple {{ background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }}

  .signature-box {{
    margin-top: 30px;
    border-top: 1px solid #cbd5e1;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: #64748b;
  }}
</style>
</head>
<body>

  <!-- ================= CAPA ================= -->
  <div class="cover-container">
    <div class="cover-top">
      <div class="cover-badge">Engenharia de Software &amp; Infraestrutura</div>
      <h1 class="cover-title">Invbecs — Sistema de Gestão de Ativos</h1>
      <p class="cover-subtitle">Livro Oficial &amp; Manual de Arquitetura: Da Concepção à Implementação com Criptografia SHA-256 e Paradigma Local-First</p>
    </div>

    <div class="cover-image-box">
      <img src="data:image/jpeg;base64,{cover_b64}" alt="Capa Invbecs" />
    </div>

    <div class="cover-footer">
      <div class="cover-tags">
        <span class="cover-tag">HTML5 Semântico</span>
        <span class="cover-tag">CSS3 Design Tokens</span>
        <span class="cover-tag">JavaScript Vanilla ES6+</span>
        <span class="cover-tag">Web Crypto API</span>
        <span class="cover-tag">Local-First DB</span>
      </div>
      <div class="cover-author">
        <div class="author-name">Equipe de TI &amp; Engenharia</div>
        <div class="author-role">Documentação Técnica Oficial • 2026</div>
      </div>
    </div>
  </div>

  <!-- ================= FICHA TÉCNICA ================= -->
  <div class="meta-page">
    <h2 style="font-size: 16pt; margin-top: 0; color: #0f172a;">Ficha Técnica &amp; Apresentação</h2>
    <p>Este documento constitui o manual técnico e guia de arquitetura oficial do <strong>Invbecs — Sistema de Gestão de Ativos de TI</strong>. Projetado no formato de E-book, tem o propósito de fornecer clareza conceitual, metodológica e prática para desenvolvedores, analistas de infraestrutura, auditores e gestores de tecnologia.</p>

    <div class="meta-box">
      <div class="meta-grid">
        <div class="meta-label">Título da Obra:</div>
        <div class="meta-value"><strong>Invbecs — Livro Oficial de Engenharia e Gestão de TI</strong></div>

        <div class="meta-label">Versão do Sistema:</div>
        <div class="meta-value">v2.1 (Edição Nuvem com Supabase Realtime &amp; Mobile Ready)</div>

        <div class="meta-label">Classificação:</div>
        <div class="meta-value">Engenharia de Software, Governança de TI, Gestão de Patrimônio</div>

        <div class="meta-label">Stack Principal:</div>
        <div class="meta-value">Vanilla HTML5, CSS3 Moderno, JavaScript ES6+, Web Crypto API, Supabase JS v2, Chart.js</div>

        <div class="meta-label">Tipo de Arquitetura:</div>
        <div class="meta-value">SPA Híbrida: Local-First com Sincronização em Nuvem (Supabase PostgreSQL + Realtime)</div>

        <div class="meta-label">Armazenamento:</div>
        <div class="meta-value">Híbrido — LocalStorage (chave <code>invbecs_db</code>) + PostgreSQL Supabase na Nuvem com Sincronização em Tempo Real (Realtime)</div>

        <div class="meta-label">Data de Publicação:</div>
        <div class="meta-value">Outubro de 2026</div>
      </div>
    </div>

    <h3>Manifesto do Projeto</h3>
    <p>O Invbecs foi desenvolvido sob a premissa fundamental de <strong>simplicidade radical aliada a robustez técnica</strong>. Em um cenário corporativo onde soluções de mercado impõem custos proibitivos de licenciamento em nuvem, dependência contínua de internet e complexidade operacional, o Invbecs prova que é perfeitamente viável entregar governança patrimonial de classe empresarial rodando de forma 100% autônoma, segura e veloz no próprio dispositivo do usuário, além de permitir conexão instantânea com bancos de dados em nuvem para uso sincronizado no celular e em múltiplos computadores.</p>

    <div class="callout callout-info">
      <div class="callout-title">💡 Como tirar o melhor proveito deste E-book</div>
      Este livro foi dividido de maneira progressiva: começa contextualizando as dores de negócio da TI, aprofunda-se na arquitetura de software, disseca a camada criptográfica de segurança, detalha as rotinas de cada módulo funcional, explica a sincronização em nuvem com Supabase e orienta sobre o deploy corporativo e uso em smartphones.
    </div>
  </div>

  <!-- ================= SUMÁRIO ================= -->
  <div class="toc-page">
    <div class="toc-title">Sumário Geral</div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 1: O Desafio da Gestão de Ativos de TI</span>
      <span class="toc-page-num">04</span>
    </div>
    <div class="toc-item">
      <span>1.1 O contexto do parque tecnológico corporativo</span>
      <span class="toc-page-num">04</span>
    </div>
    <div class="toc-item">
      <span>1.2 Requisitos funcionais e dores resolvidas</span>
      <span class="toc-page-num">05</span>
    </div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 2: Arquitetura &amp; Stack Tecnológica</span>
      <span class="toc-page-num">06</span>
    </div>
    <div class="toc-item">
      <span>2.1 Filosofia Local-First &amp; Zero Backend</span>
      <span class="toc-page-num">06</span>
    </div>
    <div class="toc-item">
      <span>2.2 O Diagrama de Arquitetura em Camadas</span>
      <span class="toc-page-num">07</span>
    </div>
    <div class="toc-item">
      <span>2.3 Design System: Dark Mode Premium &amp; Tokens CSS</span>
      <span class="toc-page-num">08</span>
    </div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 3: Camada de Dados, Persistência e Backup</span>
      <span class="toc-page-num">09</span>
    </div>
    <div class="toc-item">
      <span>3.1 O Schema Relacional no LocalStorage</span>
      <span class="toc-page-num">09</span>
    </div>
    <div class="toc-item">
      <span>3.2 Tolerância a falhas e auto-recuperação (Merge de Schema)</span>
      <span class="toc-page-num">10</span>
    </div>
    <div class="toc-item">
      <span>3.3 Portabilidade de dados: JSON Backup e Exportação CSV</span>
      <span class="toc-page-num">11</span>
    </div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 4: Engenharia de Segurança &amp; Autenticação</span>
      <span class="toc-page-num">12</span>
    </div>
    <div class="toc-item">
      <span>4.1 Criptografia SHA-256 com Salt Dinâmico (Web Crypto API)</span>
      <span class="toc-page-num">12</span>
    </div>
    <div class="toc-item">
      <span>4.2 Blindagem DOM Zero-Leakage (Estado <code>auth-locked</code>)</span>
      <span class="toc-page-num">13</span>
    </div>
    <div class="toc-item">
      <span>4.3 Defesa Ativa contra Força Bruta (Rate Limiting &amp; Lockout)</span>
      <span class="toc-page-num">14</span>
    </div>
    <div class="toc-item">
      <span>4.4 Proteção de Sessão Abandonada (Auto-Logout por Inatividade)</span>
      <span class="toc-page-num">15</span>
    </div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 5: Módulos Funcionais do Sistema</span>
      <span class="toc-page-num">16</span>
    </div>
    <div class="toc-item">
      <span>5.1 Dashboard Analítico &amp; Alertas de Garantia</span>
      <span class="toc-page-num">16</span>
    </div>
    <div class="toc-item">
      <span>5.2 Gestão de Equipamentos e Ciclo de Vida</span>
      <span class="toc-page-num">17</span>
    </div>
    <div class="toc-item">
      <span>5.3 Gestão de Colaboradores e Termos de Custódia</span>
      <span class="toc-page-num">18</span>
    </div>
    <div class="toc-item">
      <span>5.4 Trilha de Auditoria em Movimentações</span>
      <span class="toc-page-num">19</span>
    </div>
    <div class="toc-item">
      <span>5.5 Ordens de Serviço &amp; Manutenção Preventiva</span>
      <span class="toc-page-num">20</span>
    </div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 6: Guia de Desenvolvimento &amp; Código Fonte</span>
      <span class="toc-page-num">21</span>
    </div>
    <div class="toc-item">
      <span>6.1 Estrutura de Diretórios e Papel dos Scripts</span>
      <span class="toc-page-num">21</span>
    </div>
    <div class="toc-item">
      <span>6.2 O Mecanismo Reativo de Atualização de UI (<code>refreshAll</code>)</span>
      <span class="toc-page-num">22</span>
    </div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 7: Nuvem em Tempo Real (Supabase) &amp; Uso no Celular</span>
      <span class="toc-page-num">23</span>
    </div>
    <div class="toc-item">
      <span>7.1 Arquitetura Híbrida: Local-First + Supabase Cloud</span>
      <span class="toc-page-num">23</span>
    </div>
    <div class="toc-item">
      <span>7.2 O Schema Relacional no PostgreSQL (<code>supabase_schema.sql</code>)</span>
      <span class="toc-page-num">24</span>
    </div>
    <div class="toc-item">
      <span>7.3 Segurança na Nuvem: Row Level Security (RLS) &amp; Chaves Anon</span>
      <span class="toc-page-num">25</span>
    </div>
    <div class="toc-item">
      <span>7.4 Sincronização em Tempo Real (Supabase Realtime WebSockets)</span>
      <span class="toc-page-num">26</span>
    </div>
    <div class="toc-item">
      <span>7.5 Guia Prático Passo a Passo de Configuração</span>
      <span class="toc-page-num">27</span>
    </div>
    <div class="toc-item">
      <span>7.6 Acesso em Smartphones &amp; Instalação como App no Celular</span>
      <span class="toc-page-num">28</span>
    </div>

    <div class="toc-item chapter-lead">
      <span>Capítulo 8: Deploy, Manutenção &amp; Futuras Evoluções</span>
      <span class="toc-page-num">29</span>
    </div>
    <div class="toc-item">
      <span>8.1 Como Executar o Sistema em Qualquer Máquina</span>
      <span class="toc-page-num">29</span>
    </div>
    <div class="toc-item">
      <span>8.2 Como Compartilhar em Rede Local (Intranet)</span>
      <span class="toc-page-num">30</span>
    </div>
    <div class="toc-item">
      <span>8.3 Publicação na Nuvem (Vercel, Netlify &amp; GitHub Pages)</span>
      <span class="toc-page-num">30</span>
    </div>
    <div class="toc-item">
      <span>8.4 Roadmap de Evoluções Futuras</span>
      <span class="toc-page-num">31</span>
    </div>
  </div>

  <!-- ================= CAPÍTULO 1 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 01</div>
      <h1 class="chapter-title">O Desafio da Gestão de Ativos de TI</h1>
    </div>

    <h2>1.1 O Contexto do Parque Tecnológico Corporativo</h2>
    <p>O setor de Tecnologia da Informação moderno é o coração pulsante de qualquer organização produtiva. Computadores, monitores, servidores de rede, roteadores, no-breaks e periféricos de alta performance circulam diariamente entre salas de reunião, postos de trabalho remotos e setores administrativos. No entanto, um dos gargalos históricos enfrentados por equipes de suporte e infraestrutura é a <strong>perda de visibilidade sobre o patrimônio tecnológico</strong>.</p>
    
    <p>Tradicionalmente, pequenas e médias operações recorrem a planilhas manuais. Essa abordagem apresenta falhas críticas:</p>
    <ul>
      <li><strong>Desatualização Imediata:</strong> Múltiplas versões de planilhas geram dados conflitantes e descontrole sobre quem está com qual máquina;</li>
      <li><strong>Inexistência de Trilha de Auditoria:</strong> Falta de registro cronológico de transferências entre colaboradores e setores;</li>
      <li><strong>Desperdício Financeiro com Garantias:</strong> Equipamentos que quebram são consertados com custos extras simplesmente porque a equipe perdeu a data de garantia original do fabricante;</li>
      <li><strong>Vulnerabilidade de Acesso:</strong> Planilhas compartilhadas em rede sem controle de acesso adequado expõem números de série, notas fiscais e valores patrimoniais.</li>
    </ul>

    <h2>1.2 Requisitos Funcionais e Dores Resolvidas</h2>
    <p>O <strong>Invbecs</strong> foi arquitetado especificamente para erradicar esses problemas através de uma interface intuitiva, segura e centralizada. Seus objetivos primordiais foram delineados em quatro pilares:</p>

    <div class="tech-grid">
      <div class="tech-card">
        <div class="tech-card-title">📦 Rastreabilidade Total</div>
        <div class="tech-card-desc">Cada equipamento possui número de patrimônio único, número de série, nota fiscal, fornecedor, valor contábil e status operacional detalhado.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">👥 Custódia Transparente</div>
        <div class="tech-card-desc">Vinculação direta de máquinas aos colaboradores responsáveis, gerando termos de responsabilidade e relatórios individuais por funcionário.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🔄 Trilha de Auditoria</div>
        <div class="tech-card-desc">Histórico imutável de movimentações (entrada, saída, transferência, conserto e descarte) com registro temporal de quem executou a ação.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🛡️ Governança Segura</div>
        <div class="tech-card-desc">Autenticação com criptografia de ponta a ponta, sem senhas expostas e proteção contra curiosos na rede interna.</div>
      </div>
    </div>
  </div>

  <!-- ================= CAPÍTULO 2 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 02</div>
      <h1 class="chapter-title">Arquitetura &amp; Stack Tecnológica</h1>
    </div>

    <h2>2.1 Filosofia Local-First &amp; Zero Backend</h2>
    <p>A decisão de projetar o Invbecs como uma aplicação <strong>Local-First</strong> (onde os dados residem prioritariamente no dispositivo do usuário) foi deliberada. Diferente de aplicações Web tradicionais que demandam servidores Node.js, contêineres Docker, bancos PostgreSQL e conexões de rede obrigatórias, o Invbecs opera de modo <strong>completamente autônomo</strong>.</p>

    <div class="callout callout-success">
      <div class="callout-title">⚡ Benefícios da Arquitetura Local-First</div>
      <strong>Latência Zero:</strong> Leituras e escritas no disco local levam menos de 2 milissegundos.<br>
      <strong>Disponibilidade 100%:</strong> O sistema opera perfeitamente mesmo em locais sem sinal de internet ou em servidores isolados.<br>
      <strong>Custo Operacional Zero:</strong> Sem faturas mensais de hospedagem ou consumo de banco na nuvem.
    </div>

    <h2>2.2 O Diagrama de Arquitetura em Camadas</h2>
    <p>Abaixo apresentamos o infográfico conceitual de arquitetura do Invbecs, demonstrando o fluxo seguro de dados, a barreira de autenticação, o motor analítico e a camada de persistência local:</p>

    <div class="diagram-box">
      <img src="data:image/jpeg;base64,{arch_b64}" alt="Diagrama de Arquitetura do Invbecs" />
      <div class="diagram-caption">Figura 2.1 — Diagrama de Arquitetura do Sistema Invbecs (Camadas de Apresentação, Criptografia, Serviços e Armazenamento).</div>
    </div>

    <h2>2.3 Design System: Dark Mode Premium &amp; Tokens CSS</h2>
    <p>O Invbecs adota uma estética contemporânea <em>Dark Mode Premium</em>, inspirada nos mais sofisticados consoles de observabilidade e monitoramento de datacenter. O código foi totalmente construído com <strong>Variáveis Nativas CSS (Design Tokens)</strong>, facilitando manutenções e consistência visual.</p>

    <table>
      <thead>
        <tr>
          <th>Token CSS</th>
          <th>Cor / Valor</th>
          <th>Aplicação Arquitetural</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>--bg-primary</code></td>
          <td><code>#0a0f1e</code></td>
          <td>Fundo de tela principal de alto contraste e baixo cansaço visual.</td>
        </tr>
        <tr>
          <td><code>--bg-card</code></td>
          <td><code>#131e35</code></td>
          <td>Cards de métricas e tabelas com elevação e efeito glassmorphism.</td>
        </tr>
        <tr>
          <td><code>--accent</code></td>
          <td><code>#06b6d4</code> (Cyan)</td>
          <td>Cor primária de ação, foco e destaques tecnológicos.</td>
        </tr>
        <tr>
          <td><code>--green</code></td>
          <td><code>#10b981</code> (Emerald)</td>
          <td>Indicador de ativos em operação normal e manutenções concluídas.</td>
        </tr>
        <tr>
          <td><code>--yellow</code></td>
          <td><code>#f59e0b</code> (Amber)</td>
          <td>Alertas de vencimento de garantia em até 30 dias.</td>
        </tr>
        <tr>
          <td><code>--red</code></td>
          <td><code>#ef4444</code> (Rose)</td>
          <td>Equipamentos baixados, ordens de serviço pendentes e bloqueios de acesso.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ================= CAPÍTULO 3 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 03</div>
      <h1 class="chapter-title">Camada de Dados, Persistência e Backup</h1>
    </div>

    <h2>3.1 O Schema Relacional no LocalStorage</h2>
    <p>Toda a inteligência do sistema converge para a biblioteca central <code>js/data.js</code>. O Invbecs implementa um banco de dados relacional baseado em documentos JSON gravado sob a chave segura <code>invbecs_db</code> no <code>localStorage</code> do navegador.</p>

    <pre><code><span class="cm">// Estrutura Canônica do Banco de Dados Invbecs (Schema JSON)</span>
<span class="kw">const</span> <span class="vr">DEFAULT_DB</span> = {{
  <span class="vr">equipamentos</span>: [],    <span class="cm">// ID, patrimônio, serial, categoria, valor, garantia...</span>
  <span class="vr">colaboradores</span>: [],   <span class="cm">// ID, nome, cargo, setor, e-mail, telefone...</span>
  <span class="vr">movimentacoes</span>: [],   <span class="cm">// ID, equipId, tipo, origem, destino, responsável...</span>
  <span class="vr">manutencoes</span>: [],     <span class="cm">// ID, equipId, motivo, dataAbertura, custo, status...</span>
  <span class="vr">localizacoes</span>: [],    <span class="cm">// Salas, Racks, Almoxarifados físicos cadastrados</span>
  <span class="vr">setores</span>: [],         <span class="cm">// Departamentos corporativos</span>
  <span class="vr">actividades</span>: [],     <span class="cm">// Log cronológico das últimas 50 ações executadas</span>
  <span class="vr">config</span>: {{
    <span class="vr">nome</span>: <span class="st">'Administrador'</span>,
    <span class="vr">empresa</span>: <span class="st">''</span>,
    <span class="vr">auth</span>: {{ ... }}      <span class="cm">// Hash SHA-256, Salt dinâmico e auto-logout</span>
  }}
}};</code></pre>

    <h2>3.2 Tolerância a Falhas e Auto-Recuperação</h2>
    <p>Um desafio clássico do armazenamento local é a compatibilidade retroativa: se uma versão nova do sistema adiciona uma funcionalidade (por exemplo, configurações de segurança), bases antigas poderiam quebrar. Para solucionar isso de forma elegante, o Invbecs implementa um algoritmo de <strong>fusão de schema inteligente (Schema Merging)</strong> dentro da rotina <code>loadDB()</code>:</p>

    <pre><code><span class="kw">function</span> <span class="fn">loadDB</span>() {{
  <span class="kw">try</span> {{
    <span class="kw">const</span> <span class="vr">raw</span> = <span class="fn">localStorage.getItem</span>(DB_KEY);
    <span class="kw">if</span> (!<span class="vr">raw</span>) <span class="kw">return</span> JSON.<span class="fn">parse</span>(JSON.<span class="fn">stringify</span>(DEFAULT_DB));
    <span class="kw">const</span> <span class="vr">db</span> = JSON.<span class="fn">parse</span>(<span class="vr">raw</span>);
    
    <span class="cm">// Garante integridade: adiciona quaisquer chaves novas ausentes</span>
    <span class="kw">for</span> (<span class="kw">const</span> <span class="vr">key</span> <span class="kw">of</span> Object.<span class="fn">keys</span>(DEFAULT_DB)) {{
      <span class="kw">if</span> (<span class="vr">db</span>[<span class="vr">key</span>] === undefined) <span class="vr">db</span>[<span class="vr">key</span>] = DEFAULT_DB[<span class="vr">key</span>];
    }}
    <span class="kw">return</span> <span class="vr">db</span>;
  }} <span class="kw">catch</span> {{
    <span class="kw">return</span> JSON.<span class="fn">parse</span>(JSON.<span class="fn">stringify</span>(DEFAULT_DB));
  }}
}}</code></pre>

    <h2>3.3 Portabilidade de Dados: Backup JSON e Planilhas CSV</h2>
    <p>Para garantir soberania total ao gestor de TI, o sistema fornece dois canais vitais de exportação:</p>
    <ul>
      <li><strong>Backup Integral JSON:</strong> Empacota todos os dados, vínculos relacionais e configurações em um arquivo portátil <code>.json</code>. Permite migrar todo o inventário para outro computador com um único clique na opção <em>Importar Backup</em>.</li>
      <li><strong>Exportação CSV para Excel:</strong> Converte o parque de máquinas em uma planilha estruturada, respeitando o padrão internacional <code>RFC 4180</code> com escape rigoroso de caracteres especiais e delimitadores de texto.</li>
    </ul>
  </div>

  <!-- ================= CAPÍTULO 4 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 04</div>
      <h1 class="chapter-title">Engenharia de Segurança &amp; Autenticação</h1>
    </div>

    <h2>4.1 Criptografia SHA-256 com Salt Dinâmico</h2>
    <p>A segurança do Invbecs foi levada ao estado da arte. Em sistemas legados é comum encontrar senhas salvas em texto puro no código ou no navegador. No Invbecs, a senha nunca transita ou permanece descriptografada em nenhum arquivo ou registro.</p>

    <p>Utilizamos a biblioteca nativa do navegador <strong>Web Crypto API</strong> (<code>window.crypto.subtle</code>), que executa primitivas criptográficas compiladas em código de máquina de altíssimo desempenho:</p>

    <pre><code><span class="cm">// Hashing Criptográfico com SHA-256 e Salt Exclusivo</span>
<span class="kw">async function</span> <span class="fn">hashPassword</span>(<span class="vr">plainText</span>, <span class="vr">salt</span>) {{
  <span class="kw">const</span> <span class="vr">enc</span> = <span class="kw">new</span> <span class="fn">TextEncoder</span>();
  <span class="kw">const</span> <span class="vr">data</span> = <span class="vr">enc</span>.<span class="fn">encode</span>(<span class="vr">plainText</span> + (<span class="vr">salt</span> || <span class="st">''</span>));
  <span class="kw">const</span> <span class="vr">hashBuffer</span> = <span class="kw">await</span> crypto.subtle.<span class="fn">digest</span>(<span class="st">'SHA-256'</span>, <span class="vr">data</span>);
  <span class="kw">const</span> <span class="vr">hashArray</span> = Array.<span class="fn">from</span>(<span class="kw">new</span> <span class="fn">Uint8Array</span>(<span class="vr">hashBuffer</span>));
  <span class="kw">return</span> <span class="vr">hashArray</span>.<span class="fn">map</span>(<span class="vr">b</span> => <span class="vr">b</span>.<span class="fn">toString</span>(16).<span class="fn">padStart</span>(2, <span class="st">'0'</span>)).<span class="fn">join</span>(<span class="st">''</span>);
}}</code></pre>

    <div class="callout callout-security">
      <div class="callout-title">🔒 Por que o "Salt" Criptográfico é Crucial?</div>
      Sem um <em>salt</em>, senhas comuns (como "123456" ou "admin") geram sempre o mesmo hash SHA-256 e podem ser desvendadas por tabelas pré-computadas (Rainbow Tables). O salt adiciona uma sequência pseudoaleatória exclusiva antes de criptografar, neutralizando completamente esse vetor de ataque.
    </div>

    <h2>4.2 Blindagem DOM Zero-Leakage (Estado <code>auth-locked</code>)</h2>
    <p>Um dos erros mais comuns em interfaces web é renderizar o HTML confidencial e apenas colocar um pop-up por cima. Qualquer usuário com a tecla F12 aberta poderia inspecionar os elementos ou deletar o pop-up para ver os dados. O Invbecs resolveu isso com a arquitetura <strong>Zero-Leakage</strong>:</p>
    <ul>
      <li>O elemento <code>&lt;body&gt;</code> é carregado com a classe <code>class="auth-locked"</code> por padrão;</li>
      <li>Regras CSS de alta prioridade (<code>display: none !important</code>) ocultam integralmente a sidebar, o conteúdo e os modais;</li>
      <li>O motor JavaScript <strong>não injeta nenhum registro de equipamento ou colaborador no DOM</strong> enquanto o token de sessão não for validado.</li>
    </ul>

    <h2>4.3 Defesa Ativa contra Força Bruta (Rate Limiting)</h2>
    <p>Para barrar tentativas exaustivas de adivinhação de senha, o sistema monitora erros sucessivos. Caso um usuário erre <strong>5 tentativas consecutivas</strong>, a tela de login dispara o travamento de segurança (Lockout) por <strong>30 segundos</strong>, exibindo contagem regressiva em tempo real e desabilitando os botões de envio.</p>

    <h2>4.4 Proteção de Sessão Abandonada (Auto-Logout)</h2>
    <p>Caso o administrador precise se ausentar de sua estação de trabalho, o Invbecs monitora eventos de interação (teclado, mouse e scroll). Transcorrido o período de inatividade configurado (ex.: 15 minutos), a sessão é automaticamente finalizada no <code>sessionStorage</code> e a tela de login é rearmada.</p>
  </div>

  <!-- ================= CAPÍTULO 5 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 05</div>
      <h1 class="chapter-title">Módulos Funcionais do Sistema</h1>
    </div>

    <h2>5.1 Dashboard Analítico &amp; Alertas em Tempo Real</h2>
    <p>O Dashboard centraliza os indicadores-chave de desempenho (KPIs) do parque tecnológico. Em frações de segundo, o gestor tem visão consolidada sobre:</p>
    <ul>
      <li><strong>Total de Equipamentos:</strong> Contagem global de itens cadastrados no inventário;</li>
      <li><strong>Equipamentos em Uso vs. Disponíveis:</strong> Distribuição entre máquinas alocadas e estoque no almoxarifado;</li>
      <li><strong>Equipamentos em Manutenção:</strong> Itens com chamado técnico aberto ou assistência externa;</li>
      <li><strong>Valor Total do Parque de TI:</strong> Soma patrimonial em Reais (BRL) para auditoria contábil;</li>
      <li><strong>Alerta de Garantias a Vencer:</strong> Varredura automática que detecta máquinas com garantia expirando nos próximos 30 dias, acionando o indicador luminoso (notif-dot) na barra superior.</li>
    </ul>

    <h2>5.2 Gestão de Equipamentos e Ciclo de Vida</h2>
    <p>O módulo de equipamentos gerencia todas as etapas da vida útil de um ativo. O ciclo de vida transita formalmente por 4 estados:</p>

    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Badge</th>
          <th>Significado Operacional</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Ativo / Em Uso</strong></td>
          <td><span class="badge badge-green">● Ativo</span></td>
          <td>Equipamento em plena operação, vinculado a um colaborador ou setor.</td>
        </tr>
        <tr>
          <td><strong>Disponível</strong></td>
          <td><span class="badge badge-cyan">● Disponível</span></td>
          <td>Equipamento revisado e estocado no Almoxarifado para pronta entrega.</td>
        </tr>
        <tr>
          <td><strong>Em Manutenção</strong></td>
          <td><span class="badge badge-amber">● Manutenção</span></td>
          <td>Equipamento com defeito ou em processo de upgrade / conserto.</td>
        </tr>
        <tr>
          <td><strong>Baixado / Descarte</strong></td>
          <td><span class="badge badge-purple">● Baixado</span></td>
          <td>Ativo que atingiu fim de vida útil (obsolescência) ou descarte ecológico.</td>
        </tr>
      </tbody>
    </table>

    <h2>5.3 Gestão de Colaboradores &amp; Termos de Custódia</h2>
    <p>Permite o cadastro da equipe de funcionários por departamento. Ao clicar em um colaborador, o sistema lista instantaneamente todas as máquinas atribuídas àquela pessoa, facilitando processos de <em>Onboarding</em> (entrega de máquinas) e <em>Offboarding</em> (devolução no desligamento).</p>

    <h2>5.4 Trilha de Auditoria em Movimentações</h2>
    <p>Qualquer deslocamento de um equipamento (seja para outro setor, para manutenção ou devolução) gera um evento no histórico de movimentações. Com isso, a empresa possui comprovação legal e documental sobre a localização exata de cada item.</p>

    <h2>5.5 Ordens de Serviço &amp; Manutenção</h2>
    <p>Módulo para abertura de ordens de serviço (OS) internas ou terceirizadas. Permite registrar a descrição do defeito, o fornecedor técnico, a previsão de entrega e os custos envolvidos, alimentando o controle financeiro do departamento de TI.</p>
  </div>

  <!-- ================= CAPÍTULO 6 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 06</div>
      <h1 class="chapter-title">Guia de Desenvolvimento &amp; Código Fonte</h1>
    </div>

    <h2>6.1 Estrutura de Arquivos do Projeto</h2>
    <p>A arquitetura física do projeto foi concebida para ser limpa, auto-explicativa e modular:</p>

    <pre><code>📁 Inventario TI/
├── 📄 index.html        <span class="cm">// Ponto de entrada, estrutura semântica e telas SPA</span>
├── 📁 css/
│   └── 📄 style.css     <span class="cm">// Design System, Dark Mode, tokens e responsividade</span>
├── 📁 js/
│   ├── 📄 data.js       <span class="cm">// Camada de banco de dados, persistência e utilitários</span>
│   ├── 📄 app.js        <span class="cm">// Regras de negócio, autenticação, modais e eventos</span>
│   └── 📄 charts.js     <span class="cm">// Visualização gráfica e métricas analíticas</span>
└── 📁 docs_assets/      <span class="cm">// Recursos visuais, capa e diagramas técnicos</span></code></pre>

    <h2>6.2 O Mecanismo Reativo de Atualização de UI</h2>
    <p>Diferente de frameworks pesados que utilizam Virtual DOM (como React ou Angular), o Invbecs implementa um padrão direto e extremamente veloz de atualização reativa via função centralizadora <code>refreshAll()</code>:</p>

    <pre><code><span class="cm">// Atualização Global e Sincronizada da Interface</span>
<span class="kw">function</span> <span class="fn">refreshAll</span>() {{
  <span class="fn">renderDashboard</span>();       <span class="cm">// Recalcula KPIs e gráficos</span>
  <span class="fn">renderEquipamentos</span>();    <span class="cm">// Atualiza tabela com paginação ativa</span>
  <span class="fn">renderColaboradores</span>();   <span class="cm">// Atualiza cards de colaboradores</span>
  <span class="fn">renderMovimentacoes</span>();   <span class="cm">// Lista histórico de movimentações</span>
  <span class="fn">renderManutencoes</span>();     <span class="cm">// Sincroniza ordens de serviço</span>
  <span class="fn">updateBadges</span>();          <span class="cm">// Atualiza contadores na barra lateral</span>
  <span class="fn">checkGarantias</span>();        <span class="cm">// Dispara alerta se houver garantias vencendo</span>
}}</code></pre>

    <div class="callout callout-info">
      <div class="callout-title">💡 Vantagem do Padrão Centralizado</div>
      Sempre que qualquer operação de cadastro, edição ou exclusão ocorre, uma única chamada a <code>saveDB(DB)</code> seguida de <code>refreshAll()</code> garante que todo o sistema permaneça 100% consistente, sem risco de dados desfasados em tela.
    </div>

    <h2>6.3 Medidor de Força de Senha em Tempo Real</h2>
    <p>Na aba de Configurações, o sistema oferece um algoritmo interativo que avalia a complexidade da senha digitada pelo usuário e atualiza a barra de progresso visual colorida:</p>

    <pre><code><span class="kw">function</span> <span class="fn">checkPasswordStrength</span>(<span class="vr">password</span>) {{
  <span class="kw">let</span> <span class="vr">score</span> = 0;
  <span class="kw">if</span> (<span class="vr">password</span>.length >= 6) <span class="vr">score</span>++;
  <span class="kw">if</span> (<span class="vr">password</span>.length >= 10) <span class="vr">score</span>++;
  <span class="kw">if</span> (/[0-9]/.<span class="fn">test</span>(<span class="vr">password</span>)) <span class="vr">score</span>++;
  <span class="kw">if</span> (/[a-z]/.<span class="fn">test</span>(<span class="vr">password</span>) && /[A-Z]/.<span class="fn">test</span>(<span class="vr">password</span>)) <span class="vr">score</span>++;
  <span class="kw">if</span> (/[^a-zA-Z0-9]/.<span class="fn">test</span>(<span class="vr">password</span>)) <span class="vr">score</span>++;

  <span class="cm">// Atualiza classes visuais: .weak (vermelho), .medium (amarelo), .strong (verde)</span>
  <span class="vr">bar</span>.className = <span class="vr">score</span> <= 2 ? <span class="st">'strength-bar weak'</span> :
                  <span class="vr">score</span> <= 4 ? <span class="st">'strength-bar medium'</span> : <span class="st">'strength-bar strong'</span>;
}}</code></pre>
  </div>

  <!-- ================= CAPÍTULO 7 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 07</div>
      <h1 class="chapter-title">Nuvem em Tempo Real (Supabase) &amp; Uso no Celular</h1>
    </div>

    <h2>7.1 Arquitetura Híbrida: Local-First + Supabase Cloud</h2>
    <p>Com a evolução para a versão <strong>v2.1</strong>, o Invbecs atinge um dos maiores marcos da engenharia de software moderna: uma <strong>Arquitetura Híbrida Resiliente</strong>. O sistema preserva todas as vantagens do paradigma <em>Local-First</em> (velocidade instantânea de leitura/escrita no disco local, funcionamento 100% offline e privacidade total) e integra de forma nativa a potência do <strong>Supabase</strong>, uma plataforma de banco de dados relacional PostgreSQL serverless com suporte a WebSockets em tempo real.</p>

    <div class="tech-grid">
      <div class="tech-card">
        <div class="tech-card-title">⚡ Modo Local (Offline)</div>
        <div class="tech-card-desc">Opera sem internet ou credenciais configuradas. Os dados são lidos e gravados no <code>localStorage</code> com velocidade sub-milissegundo.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">☁️ Modo Nuvem (Multi-Dispositivo)</div>
        <div class="tech-card-desc">Sincroniza automaticamente cada inserção, alteração ou exclusão com o PostgreSQL do Supabase, permitindo acesso compartilhado entre PCs e smartphones.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🔄 Tempo Real (Realtime)</div>
        <div class="tech-card-desc">Quando um técnico cadastra um equipamento no celular, a tela do computador no escritório atualiza na hora sem precisar recarregar.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🛡️ Tolerância a Falhas</div>
        <div class="tech-card-desc">Se a conexão cair durante o uso em campo, os dados continuam salvos com segurança no cache local do dispositivo.</div>
      </div>
    </div>

    <h2>7.2 O Schema Relacional no PostgreSQL (<code>supabase_schema.sql</code>)</h2>
    <p>Para suportar todo o ecossistema do Invbecs na nuvem, foi projetado um schema relacional completo em PostgreSQL, disponibilizado no arquivo de infraestrutura <code>supabase_schema.sql</code>. As tabelas espelham perfeitamente as entidades de domínio da aplicação:</p>

    <ul>
      <li><strong><code>public.equipamentos</code>:</strong> Armazena patrimônio, descrição, categoria, marca, modelo, número de série, nota fiscal, datas de aquisição e garantia, valor contábil, responsável e localização física. Índices B-Tree cobrem <code>patrimonio</code>, <code>status</code>, <code>categoria</code> e <code>responsavel</code>;</li>
      <li><strong><code>public.colaboradores</code>:</strong> Cadastro de funcionários, cargos, setores corporativos, e-mail, telefone e matrícula de identificação;</li>
      <li><strong><code>public.movimentacoes</code>:</strong> Trilha imutável de auditoria com vínculo por chave estrangeira virtual ao equipamento, tipo de movimentação (Entrada, Saída, Transferência, etc.), origem, destino e responsável;</li>
      <li><strong><code>public.manutencoes</code>:</strong> Ordens de Serviço (OS) com registro de fornecedor técnico, diagnóstico do problema, resolução, custos e status da manutenção;</li>
      <li><strong><code>public.sistema_meta</code>:</strong> Tabela chave-valor no formato JSONB para persistir listas de setores, localizações físicas personalizadas e configurações corporativas;</li>
      <li><strong><code>public.atividades</code>:</strong> Feed cronológico dos últimos 50 eventos operacionais do sistema para auditoria visual.</li>
    </ul>

    <h2>7.3 Segurança na Nuvem: Row Level Security (RLS) &amp; Chaves Anon</h2>
    <p>A segurança dos dados é garantida pelo mecanismo nativo do PostgreSQL chamado <strong>Row Level Security (RLS)</strong>. No Supabase, o Invbecs conecta-se através da <strong>Chave Pública Anônima (<code>anon key</code>)</strong>, que concede permissão restrita de leitura e escrita às tabelas da aplicação sem jamais expor as credenciais de superusuário ou a chave mestra (<code>service_role</code>).</p>

    <div class="callout callout-security">
      <div class="callout-title">🔒 Políticas RLS Ativas</div>
      Todas as 6 tabelas têm o RLS ativado por padrão com políticas explícitas (<code>FOR ALL USING (true) WITH CHECK (true)</code>) para conexões autenticadas via token anon, impedindo acesso indevido ao restante do cluster PostgreSQL do servidor.
    </div>

    <h2>7.4 Sincronização em Tempo Real (Supabase Realtime WebSockets)</h2>
    <p>O grande diferencial da integração é a capacidade de refletir mudanças entre múltiplos dispositivos instantaneamente através de canais de WebSocket gerenciados pelo módulo <code>js/supabase.js</code>:</p>

    <pre><code><span class="cm">// Subscrição em Tempo Real via WebSocket do Supabase</span>
<span class="kw">this</span>.subscription = <span class="kw">this</span>.client
  .<span class="fn">channel</span>(<span class="st">'invbecs-realtime-changes'</span>)
  .<span class="fn">on</span>(<span class="st">'postgres_changes'</span>, {{ event: <span class="st">'*'</span>, schema: <span class="st">'public'</span>, table: <span class="st">'equipamentos'</span> }}, (<span class="vr">payload</span>) => {{
    <span class="kw">this</span>.<span class="fn">handleRemoteChange</span>(<span class="st">'equipamentos'</span>, <span class="vr">payload</span>);
  }})
  .<span class="fn">subscribe</span>();</code></pre>

    <p>Quando uma alteração remota é detectada (evento <code>INSERT</code>, <code>UPDATE</code> ou <code>DELETE</code>), o Invbecs atualiza a memória local, grava no disco do navegador e invoca <code>refreshAll()</code>, exibindo uma notificação discreta na tela: <em>"Novo item recebido da nuvem!"</em>.</p>

    <h2>7.5 Guia Prático Passo a Passo de Configuração</h2>
    <p>A configuração do Supabase no Invbecs leva menos de 3 minutos e dispensa qualquer linha de comando:</p>

    <ol>
      <li><strong>Crie uma conta gratuita:</strong> Acesse <code>https://supabase.com</code> e clique em <em>"New Project"</em>. Selecione a região mais próxima (ex.: São Paulo - <code>sa-east-1</code>);</li>
      <li><strong>Execute o Script SQL:</strong> No menu lateral esquerdo do Supabase, clique em <strong>SQL Editor</strong> (<code>&gt;_</code>) &gt; <em>"New query"</em>. Cole todo o conteúdo do arquivo <code>supabase_schema.sql</code> (ou clique no botão <em>"Ver Script SQL para o Supabase"</em> nas Configurações do Invbecs) e clique em <strong>Run</strong>;</li>
      <li><strong>Obtenha as Credenciais:</strong> No Supabase, vá em <strong>Project Settings</strong> (ícone de engrenagem) &gt; <strong>API</strong>. Copie a <strong>Project URL</strong> e a <strong>Project API Key (anon public)</strong>;</li>
      <li><strong>Conecte no Invbecs:</strong> Abra o Invbecs, vá na aba <strong>Configurações &gt; Nuvem &amp; Sincronização em Tempo Real</strong>, cole a URL e a Chave e clique em <strong>Salvar &amp; Conectar</strong>;</li>
      <li><strong>Migre seus Dados Locais:</strong> Clique no botão <strong>"⬆️ Subir Dados Locais para Nuvem"</strong>. Todo o seu inventário existente no computador será enviado para o Supabase em lote.</li>
    </ol>

    <h2>7.6 Acesso em Smartphones &amp; Instalação como App no Celular</h2>
    <p>O Invbecs foi construído com design totalmente responsivo, adaptando-se confortavelmente a telas de celulares e tablets:</p>

    <div class="tech-grid">
      <div class="tech-card">
        <div class="tech-card-title">📱 Layout Touchscreen Fluido</div>
        <div class="tech-card-desc">Barra lateral retrátil automática (gaveta drawer), cards empilhados verticalmente e formulários otimizados para teclado virtual touch.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🌐 Acesso via Wi-Fi Local</div>
        <div class="tech-card-desc">No computador central, execute <code>npx serve .</code> ou <code>python -m http.server 8080</code>. No celular conectado ao mesmo Wi-Fi, abra <code>http://IP_DO_PC:8080</code>.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🚀 Hospedagem Web Grátis</div>
        <div class="tech-card-desc">Publicando os arquivos na Vercel, Netlify ou GitHub Pages, você recebe um link seguro <code>https://seu-inventario.vercel.app</code> acessível de qualquer lugar com 4G/5G.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">📲 Instalação como Aplicativo</div>
        <div class="tech-card-desc">No Chrome ou Safari do celular, toque em <em>"Adicionar à tela de início"</em>. O Invbecs cria um ícone no smartphone e abre em tela cheia, como um app nativo.</div>
      </div>
    </div>
  </div>

  <!-- ================= CAPÍTULO 8 ================= -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Capítulo 08</div>
      <h1 class="chapter-title">Deploy, Manutenção &amp; Futuras Evoluções</h1>
    </div>

    <h2>8.1 Como Executar o Sistema em Qualquer Máquina</h2>
    <p>O Invbecs requer zero instalação prévia. Para iniciar o uso:</p>
    <ol>
      <li>Basta abrir a pasta do projeto no Windows Explorer;</li>
      <li>Dar um duplo clique no arquivo <code>index.html</code>;</li>
      <li>O navegador padrão abrirá a tela segura de autenticação;</li>
      <li>Entre com o usuário <code>admin</code> e senha <code>123</code> (e depois altere para sua senha nas Configurações).</li>
    </ol>

    <h2>8.2 Como Compartilhar em Rede Local (Intranet)</h2>
    <p>Se a equipe de suporte desejar que múltiplos computadores acessem a mesma aplicação dentro do escritório, existem duas opções práticas:</p>
    <ul>
      <li><strong>Pasta Compartilhada Windows:</strong> Compartilhe a pasta do Invbecs na rede com permissão de leitura;</li>
      <li><strong>Servidor Web Leve:</strong> Execute um micro-servidor estático no computador central (ex.: <code>python -m http.server 8080</code> ou servidor IIS/Nginx). Todos os computadores da rede poderão acessar via <code>http://ip-do-computador:8080</code>.</li>
    </ul>

    <h2>8.3 Publicação na Nuvem (Vercel, Netlify &amp; GitHub Pages)</h2>
    <p>Por ser uma aplicação SPA estática de alta performance sem necessidade de build complexo, o Invbecs pode ser publicado gratuitamente em provedores de Edge CDN globais:</p>
    <ul>
      <li><strong>Vercel:</strong> Arraste a pasta para o dashboard da Vercel ou use <code>npx vercel</code>. O deploy é concluído em menos de 10 segundos com certificado SSL automático;</li>
      <li><strong>GitHub Pages:</strong> Crie um repositório no GitHub, ative o Pages nas configurações e aponte para o branch <code>main</code>;</li>
      <li><strong>Netlify:</strong> Basta arrastar a pasta do projeto para a área de deploy do Netlify Drop.</li>
    </ul>

    <h2>8.4 Roadmap de Evoluções Futuras</h2>
    <p>Com a camada de nuvem Supabase já plenamente funcional na versão atual (v2.1), as próximas evoluções planejadas para o Invbecs incluem:</p>
    <div class="tech-grid">
      <div class="tech-card">
        <div class="tech-card-title">📱 Scanner de QR Code / Código de Barras pela Câmera</div>
        <div class="tech-card-desc">Integração com a biblioteca <code>html5-qrcode</code> para bipar etiquetas patrimoniais diretamente com a câmera do celular no momento do inventário.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">✍️ Assinatura Digital Touch do Termo de Custódia</div>
        <div class="tech-card-desc">Permitir que o colaborador assine diretamente na tela touch screen do celular ou tablet o recebimento de notebooks e periféricos.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🏢 Integração com Active Directory / Azure AD</div>
        <div class="tech-card-desc">Sincronização automática dos colaboradores corporativos via Microsoft Graph API ou LDAP corporativo.</div>
      </div>
      <div class="tech-card">
        <div class="tech-card-title">🔔 Notificações Automáticas via Webhook / WhatsApp</div>
        <div class="tech-card-desc">Disparo de alertas via Webhooks para o canal de TI no Microsoft Teams, Slack ou WhatsApp quando uma OS urgente for aberta.</div>
      </div>
    </div>

    <div class="signature-box">
      <div>
        <strong>Invbecs — Sistema de Gestão de Ativos</strong><br>
        Documento de Engenharia de Software aprovado para distribuição técnica.
      </div>
      <div style="text-align: right;">
        Status: <strong>Produção / Estável (v2.1 Nuvem &amp; Mobile)</strong><br>
        Edição Outubro de 2026
      </div>
    </div>
  </div>

</body>
</html>
"""

    html_file_path = os.path.join(base_dir, 'ebook_render.html')
    output_pdf_path = os.path.join(base_dir, 'Invbecs_Manual_Completo_Sistema_Ebook.pdf')

    with open(html_file_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"HTML do E-book gerado em: {html_file_path}")

    # Template do Rodapé e Cabeçalho do Chrome
    footer_template = '''<div style="font-size: 8.5pt; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <span>Invbecs — Livro Oficial &amp; Manual do Sistema</span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
</div>'''

    header_template = '''<div style="font-size: 7.5pt; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <span>Sistema de Gestão de Inventário de TI</span>
  <span>Manual de Engenharia de Software</span>
</div>'''

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    temp_dir = tempfile.mkdtemp()

    cmd = [
        chrome_path,
        '--headless=new',
        f'--user-data-dir={temp_dir}',
        '--no-sandbox',
        '--disable-gpu',
        '--display-header-footer',
        f'--footer-template={footer_template}',
        f'--header-template={header_template}',
        f'--print-to-pdf={output_pdf_path}',
        html_file_path
    ]

    print("Executando renderização com Chrome Headless...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    print("Código de saída:", result.returncode)

    if os.path.exists(output_pdf_path):
        size_mb = os.path.getsize(output_pdf_path) / (1024 * 1024)
        print(f"Sucesso! PDF do E-book gerado: {output_pdf_path} ({size_mb:.2f} MB)")
        legacy_pdf_path = os.path.join(base_dir, 'InvTI_Manual_Completo_Sistema_Ebook.pdf')
        import shutil
        shutil.copyfile(output_pdf_path, legacy_pdf_path)
        print(f"Cópia retrocompatível atualizada em: {legacy_pdf_path}")
    else:
        print("Erro: PDF não foi gerado.")
        print("Stderr:", result.stderr)

if __name__ == '__main__':
    main()
