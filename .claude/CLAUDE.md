# Total Trac · Constituição de Design Engineering

Este arquivo governa **qualquer** trabalho visual, de front-end ou de UX neste
repositório. Ele não é decorativo: antes de escrever HTML/CSS/JS de interface,
releia as regras abaixo. O objetivo é que nenhuma implementação futura pareça
"gerada por IA genérica" — todas devem parecer uma peça oficial da marca Total
Trac, fiel ao Manual de Identidade Visual v1.0/2026.

## 1. O que é este projeto

- **Produto**: gerador estático do relatório executivo comercial ("Reunião de
  Indicadores") da Total Trac, empresa de rastreamento e telemetria veicular.
  O público é diretoria/liderança comercial, não usuários de um SaaS de
  consumo.
- **Stack real**: HTML + CSS + JavaScript **vanilla**, sem framework, sem
  bundler, sem `package.json`, sem dependências npm — mesma decisão de
  arquitetura do projeto irmão AtlasGR (`Reuni-o-de-Indicadores`). O único
  código de build é `src/build-report.mjs` (Node puro, ESM), que lê
  `Docs/vendas-2026.json` e escreve `assets/report-data.js` + o HTML final na
  raiz (`index.html`).
- **Runtime**: `assets/report.css` (design tokens + componentes) e
  `assets/report.js` (IIFE que monta o DOM via strings de template a partir
  de `window.TOTALTRAC_DATA`). Sem React, sem Vue, sem build step no
  navegador.
- **Modos de uso**: apresentação (slide a slide), relatório (scroll
  contínuo) e impressão/PDF (`@media print`). Os três são cidadãos de
  primeira classe — nenhuma mudança visual pode quebrar qualquer um deles.
- **Dado é o produto**: cada elemento visual deve ser rastreável a
  `Docs/vendas-2026.json` (extraído e verificado a partir de
  `Vendas 2026.xlsx`). Nunca inventar número, meta ou classificação sem
  evidência na planilha de origem.
- **Modelo de negócio real** (não confundir com o funil de CRM do AtlasGR):
  Total Trac vende **locação recorrente** de dispositivos de rastreamento
  (gera `mensalidade`, medida contra a meta mensal) e **venda** pontual,
  cobrando opcionalmente uma **adesão** (taxa de implantação, sem meta
  formal). Não existe funil de leads/oportunidades nesta base — apenas
  vendas já realizadas, por vendedor, produto e cliente (novo ou carteira
  existente). Nunca fabricar estágios de funil, pipeline ou forecast que não
  existem na planilha.

## 2. Identidade de marca (Manual v1.0/2026 — não reinventar)

Paleta oficial, já disponível como tokens prontos em
`Packs de Identidade Visual - TotalTrac/TotalTrac/tokens/` (CSS/JSON/TS) —
reutilizar sempre, nunca duplicar valores soltos:

| Token | Papel |
|---|---|
| `--tt-azul` `#374898` | Primária — ação, identidade |
| `--tt-ciano` `#008FCE` | Primária — destaque, gradiente |
| `--tt-azul-profundo` `#2D3B78` | Secundária — fundos escuros, capa |
| `--tt-grafite` `#1E2F37` | Secundária — texto, superfícies escuras |
| `--tt-azul-claro` `#93DBF2` | Secundária — destaque claro |
| `--tt-branco` `#FFFFFF` | Superfície |
| `--good` `#15803d`, `--warn` `#b77900`, `--bad` `#c93c34` | Status semântico (mesma convenção do AtlasGR — nunca usar azul/ciano da marca para status) |

Gradiente de marca oficial (uso em capa/superfícies de destaque):
`linear-gradient(135deg, #2d3b78 0%, #374898 56%, #008fce 100%)` — diagonal,
azul profundo → azul → ciano. **Nunca** usar gradiente laranja/roxo genérico.

Tipografia: **Fivo Sans** (Heavy = títulos grandes, Medium = subtítulos,
Regular = texto longo/web). Os binários não estão neste repositório — o
Manual autoriza uso pessoal/comercial gratuito, mas a licença deve ser obtida
e hospedada pelo time antes de trocar o fallback. Até lá, usar a pilha
`"Fivo Sans", Arial, sans-serif` exatamente como definida em
`tokens/totaltrac.css` — Arial é um fallback legível, não um substituto
permanente. Números monetários/percentuais sempre com
`font-variant-numeric: tabular-nums`.

Logos: usar os PNGs oficiais do pack (`assets/img/`), nunca recriar o
símbolo em CSS/SVG à mão. Regras do manual, não negociáveis:
- Área de proteção mínima de 1 módulo `X` (altura do símbolo) ao redor da
  marca.
- Largura mínima: principal com tagline 140px; sem tagline 110px; vertical
  70px; símbolo 20px.
- Nunca distorcer, comprimir, rotacionar, aplicar filtro ou reflitir.
- Usar a variante cujo nome indica o fundo real do layout (`positivo` para
  branco, `negativo-azul-escuro` para fundo `#2D3B78`, etc.) — nunca a
  variante errada "porque combina visualmente".

## 3. Regras visuais inegociáveis

1. **Nunca produzir "AI slop"**: layouts genéricos, sem identidade, que
   poderiam pertencer a qualquer produto. Toda tela deve ser reconhecível
   como Total Trac mesmo sem o logo.
2. **Nunca usar hero centralizada como padrão.** A capa segue o gradiente
   diagonal oficial com conteúdo alinhado à esquerda — não o clichê
   "título + subtítulo centralizados".
3. **Nunca usar laranja/verde/roxo como cor de marca.** A identidade
   cromática é azul → ciano. Verde/âmbar/vermelho são exclusivos para status
   semântico real (meta batida/próxima/não batida), nunca decoração.
4. **Nunca criar cards ou páginas de preenchimento.** Todo card representa
   um dado real de `Docs/vendas-2026.json`; grids usam `auto-fit`/`auto-fill`
   quando o número de itens varia, não uma contagem arbitrária. Se o
   relatório tem 20 páginas e não 30, é porque 20 páginas têm conteúdo real
   — não adicionar página só para bater um número.
5. **Nunca usar sombra, blur ou glassmorphism sem propósito.** Sombra aqui é
   "elevação editorial" discreta, não decoração.
6. **Nunca animar de graça.** Toda animação precisa justificar uma mudança
   de estado, hierarquia ou atenção real.
7. **Nunca adicionar 3D como decoração.**
8. **Nunca sacrificar UX por estética.** Densidade de informação e
   navegação (drill-down, filtros, modos) vêm antes do capricho visual.
9. **Nunca sacrificar performance por motion.**
10. **Nunca destruir funcionalidade existente para melhorar aparência.**
    Modo apresentação, modo relatório, impressão e drill-down são contratos
    com o usuário — validar os três modos após qualquer mudança de CSS/JS.
11. **Nunca inventar dado de funil/pipeline/forecast.** Esta base contém
    apenas vendas realizadas. Se uma pergunta exige dado de pipeline
    (oportunidades em aberto, propostas, etc.), a resposta correta é "esse
    dado não existe nesta planilha", não uma estimativa inventada.

## 4. Metas de normalização (Health Score e afins)

Sempre que um score normalizar um dado real contra uma meta (ex.: "aquisição
de clientes novos vale 100 pontos em 40%"), essa meta é um **parâmetro de
gestão explícito**, documentado na própria página, nunca um dado observado
ou um benchmark de mercado inventado sem aviso. Mesmo padrão do AtlasGR:
tabela com dado real → meta de referência → cálculo exato, sempre visível
(não escondida só no código-fonte).

## 5. Motion

- Motion é bem-vindo quando comunica hierarquia, estado ou continuidade —
  nunca como enfeite.
- Priorizar CSS nativo (`transition`, `@keyframes`) e `IntersectionObserver`.
  **Não adicionar GSAP, ScrollTrigger, Three.js ou qualquer biblioteca de
  animação por padrão.** Este projeto não tem bundler nem `package.json`;
  qualquer dependência externa entraria via `<script src>` de CDN.
- Sempre envolver motion não essencial em
  `@media (prefers-reduced-motion: no-preference)` ou oferecer variante
  estática sob `prefers-reduced-motion: reduce`.
- Nunca animar propriedades de layout (`width`, `height`, `top`, `left`);
  usar `transform`/`opacity`.

## 6. Acessibilidade

Barra mínima para qualquer entrega, desde a primeira versão (não é um débito
para depois, como foi no AtlasGR):

- Navegável 100% por teclado (`<details>`/`<summary>` nativo para
  drill-down/accordion).
- `:focus-visible` explícito em todo elemento interativo, com anel visível
  (nunca só cor).
- Contraste AA mínimo — cuidado especial com texto sobre o gradiente de
  marca (`--tt-azul-profundo`→`--tt-ciano`): validar contraste real, não
  assumir. Usar variantes `-text` mais escuras quando o token de superfície
  não atingir 4.5:1 para texto (mesmo padrão do `--orange-text` do AtlasGR).
- Semântica correta (`<h1>` único por página/seção, landmarks `<header>`,
  `<main>`, `<nav>`, `<footer>`).
- Labels reais em filtros/selects, `aria-label` em botões só-ícone.
- Estados de erro/vazio/carregando comunicados por texto, não só por cor.
- Respeitar `prefers-reduced-motion`.
- Responsividade a até 320px de largura sem scroll horizontal.
- Fallback de resiliência: se `report.js` falhar ao montar o relatório, o
  usuário vê uma mensagem clara, não uma tela em branco (`try/catch` +
  `noscript` + bootstrap inline, mesmo padrão do AtlasGR).

## 7. Performance

- Sem dependências novas por padrão. Se algo parecer "precisar de uma lib",
  a primeira pergunta é "dá para fazer em CSS/vanilla JS?".
- `assets/report.js` monta DOM via `innerHTML` de templates de string;
  atenção a custo de parsing/reflow se o volume de linhas de venda crescer
  muito além do que a planilha atual tem.
- Nenhum loop de `requestAnimationFrame` contínuo, nenhuma renderização 3D
  contínua, nenhum polling desnecessário.
- Performance mobile é prioridade: os executivos frequentemente abrem isso
  no celular antes de uma reunião.
- Logos são PNG (não há SVG vetorial oficial da marca ainda) — usar o
  arquivo de maior resolução disponível no pack e dimensionar por CSS, nunca
  redimensionar/recomprimir o PNG fora do pack oficial.

## 8. O que explicitamente NÃO fazer sem pedido explícito do usuário

- Instalar GSAP, Three.js, React, qualquer framework, bundler ou
  `package.json` com dependências de runtime.
- Adicionar 3D/WebGL em qualquer forma.
- Adicionar bibliotecas de scrollytelling (parallax pesado, scroll-jacking).
- Trocar Fivo Sans/Arial ou a paleta azul/ciano por outra identidade.
- Reescrever o pipeline de build (`src/build-report.mjs`) para um bundler.
- Extrair binários de fonte do manual em PDF ou de fontes de terceiros sem
  confirmar a licença com o usuário.
