/* ===== Constantes e utilitários ===== */

// Valores de z da tabela dos slides
const Z = { 90: 1.65, 95: 1.96, 99: 2.58 };

const num = (v) => {
  const s = String(v).trim().replace(',', '.');
  return s === '' ? NaN : Number(s);
};

const fmt = (v, d = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ===== Cálculos (funções puras) ===== */

// Fator de correção finita: só se aplica quando n > 5% de N
function fatorCorrecao(n, N) {
  return Number.isFinite(N) && n / N > 0.05 ? Math.sqrt((N - n) / (N - 1)) : 1;
}

function estimarMedia({ xb, s, n, N, z }) {
  const f = fatorCorrecao(n, N);
  const erro = ((z * s) / Math.sqrt(n)) * f;
  return { pontual: xb, erro, lo: xb - erro, hi: xb + erro, f };
}

function estimarProporcao({ x, n, N, z }) {
  const p = x / n;
  const f = fatorCorrecao(n, N);
  const erro = z * Math.sqrt((p * (1 - p)) / n) * f;
  return { pontual: p, erro, lo: p - erro, hi: p + erro, f };
}

/* ===== Gráfico da normal padrão (SVG) ===== */

function drawChart(id, conf, z, vals) {
  const W = 600, H = 270, L = 30, R = 570, base = 210, top = 30;
  const X = (v) => L + ((v + 4) / 8) * (R - L);
  const pdf = (v) => Math.exp((-v * v) / 2) / Math.sqrt(2 * Math.PI);
  const Y = (v) => base - (pdf(v) / 0.4) * (base - top);

  const pts = (a, b) => {
    const steps = Math.max(2, Math.round((b - a) * 25));
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const v = a + ((b - a) * i) / steps;
      out.push(`${X(v).toFixed(1)},${Y(v).toFixed(1)}`);
    }
    return out;
  };

  const area = (a, b) =>
    `M${X(a).toFixed(1)},${base} L${pts(a, b).join(' L')} L${X(b).toFixed(1)},${base} Z`;

  const alfa2 = (100 - conf) / 2;
  const zTxt = fmt(z);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva normal padrão com área central de ${conf}%">`;
  svg += `<path class="ch-tail" d="${area(-4, -z)}"/>`;
  svg += `<path class="ch-tail" d="${area(z, 4)}"/>`;
  svg += `<path class="ch-mid" d="${area(-z, z)}"/>`;
  svg += `<polyline class="ch-curve" points="${pts(-4, 4).join(' ')}"/>`;
  svg += `<line class="ch-guide" x1="${X(-z)}" y1="${base}" x2="${X(-z)}" y2="${Y(-z)}"/>`;
  svg += `<line class="ch-guide" x1="${X(z)}" y1="${base}" x2="${X(z)}" y2="${Y(z)}"/>`;
  svg += `<line class="ch-axis" x1="${L}" y1="${base}" x2="${R}" y2="${base}"/>`;

  svg += `<text class="ch-conf" x="${X(0)}" y="${base - 55}">${conf}%</text>`;
  svg += `<text class="ch-small" x="${X(0)}" y="${base - 35}">confiança</text>`;
  svg += `<text class="ch-small" x="${X(-(z + 4) / 2)}" y="${base - 12}">${fmt(alfa2, 1)}%</text>`;
  svg += `<text class="ch-small" x="${X((z + 4) / 2)}" y="${base - 12}">${fmt(alfa2, 1)}%</text>`;

  svg += `<text class="ch-text" x="${X(-z)}" y="${base + 22}">−${zTxt}</text>`;
  svg += `<text class="ch-text" x="${X(0)}" y="${base + 22}">0</text>`;
  svg += `<text class="ch-text" x="${X(z)}" y="${base + 22}">+${zTxt}</text>`;

  if (vals) {
    svg += `<text class="ch-val" x="${X(-z)}" y="${base + 44}">${vals.lo}</text>`;
    svg += `<text class="ch-val" x="${X(0)}" y="${base + 44}">${vals.mid}</text>`;
    svg += `<text class="ch-val" x="${X(z)}" y="${base + 44}">${vals.hi}</text>`;
  }

  svg += `</svg>`;
  document.getElementById(id).innerHTML = svg;
}

/* ===== Interface ===== */

const $ = (id) => document.getElementById(id);

function lerConf(prefixo) {
  const el = document.querySelector(`input[name="${prefixo}-conf"]:checked`);
  return Number(el ? el.value : 95);
}

// Mensagem abaixo dos botões. tipo 'erro' = destaque em vermelho (usado ao clicar em Calcular).
function setStatus(id, texto, tipo) {
  const el = $(id);
  el.textContent = texto;
  el.className = 'status' + (tipo === 'erro' ? ' erro' : '');
}

// Retorna true se todos os campos obrigatórios estão preenchidos.
// Caso contrário, esconde o resultado e diz o que falta.
function camposCompletos(campos, statusId, out, submetido) {
  const falta = campos.filter((c) => $(c.id).value.trim() === '').map((c) => c.nome);
  if (falta.length === 0) return true;
  out.hidden = true;
  const texto = falta.length === campos.length
    ? 'Preencha os dados da amostra: o resultado aparece automaticamente quando tudo estiver completo.'
    : `Falta preencher: ${falta.join(', ')}.`;
  setStatus(statusId, texto, submetido ? 'erro' : 'info');
  return false;
}

function notaCorrecao(n, N, f) {
  if (!Number.isFinite(N)) return 'N não informado: população tratada como grande, sem fator de correção.';
  const razao = fmt((n / N) * 100, 1);
  return f !== 1
    ? `n/N = ${razao}% (> 5%): fator de correção finita aplicado (${fmt(f, 4)}).`
    : `n/N = ${razao}% (≤ 5%): sem fator de correção.`;
}

function atualizarMedia(submetido) {
  const out = $('res-media');
  const conf = lerConf('m');
  const z = Z[conf];

  drawChart('chart-media', conf, z, null);

  const campos = [
    { id: 'm-x', nome: 'média amostral (x̄)' },
    { id: 'm-s', nome: 'desvio padrão (s)' },
    { id: 'm-n', nome: 'tamanho da amostra (n)' },
  ];
  if (!camposCompletos(campos, 'status-media', out, submetido)) return;

  const xb = num($('m-x').value);
  const s = num($('m-s').value);
  const n = num($('m-n').value);
  const rawN = $('m-N').value.trim();
  const N = num(rawN);
  const temN = rawN !== '';

  let msg = '';
  if (!Number.isFinite(xb) || !Number.isFinite(s) || !Number.isFinite(n)) msg = 'Use apenas números nos campos (ex.: 12,5).';
  else if (!Number.isInteger(n) || n < 2) msg = 'O tamanho da amostra (n) precisa ser um inteiro maior ou igual a 2.';
  else if (s < 0) msg = 'O desvio padrão (s) não pode ser negativo.';
  else if (temN && (!Number.isInteger(N) || N < n)) msg = 'O tamanho da população (N) precisa ser um inteiro maior ou igual a n.';
  if (msg) {
    out.hidden = true;
    return setStatus('status-media', msg, submetido ? 'erro' : 'info');
  }
  setStatus('status-media', '');

  const r = estimarMedia({ xb, s, n, N: temN ? N : NaN, z });
  const corrigido = r.f !== 1;

  const aviso = n < 30
    ? '<p class="aviso">⚠ Com n &lt; 30, esse método só vale se a população tiver distribuição normal (ou aproximadamente normal).</p>'
    : '';

  const total = temN
    ? `<div class="card"><span>Total estimado na população (N × x̄)</span><strong>${fmt(N * xb)}</strong><small>Intervalo do total: ${fmt(N * r.lo)} a ${fmt(N * r.hi)}</small></div>`
    : '';

  out.hidden = false;
  out.innerHTML = `
    <div class="cards">
      <div class="card"><span>Estimativa pontual</span><strong>${fmt(r.pontual)}</strong></div>
      <div class="card"><span>Intervalo de ${conf}%</span><strong>${fmt(r.lo)} a ${fmt(r.hi)}</strong></div>
      <div class="card"><span>Erro de estimação</span><strong>± ${fmt(r.erro)}</strong></div>
      ${total}
    </div>
    <p class="nota">${notaCorrecao(n, temN ? N : NaN, r.f)}</p>
    ${aviso}
    <details>
      <summary>Passo a passo</summary>
      <ol>
        <li>Pontual: μ = x̄ = ${fmt(xb)}</li>
        <li>Erro: e = z · s/√n${corrigido ? ' · √((N−n)/(N−1))' : ''}</li>
        <li>e = ${fmt(z)} · ${fmt(s)}/√${n}${corrigido ? ` · ${fmt(r.f, 4)}` : ''} = ${fmt(r.erro)}</li>
        <li>Intervalo: ${fmt(xb)} ± ${fmt(r.erro)} → ${fmt(r.lo)} a ${fmt(r.hi)}</li>
      </ol>
    </details>`;

  drawChart('chart-media', conf, z, { lo: fmt(r.lo), mid: fmt(xb), hi: fmt(r.hi) });
}

function atualizarProporcao(submetido) {
  const out = $('res-proporcao');
  const conf = lerConf('p');
  const z = Z[conf];

  drawChart('chart-proporcao', conf, z, null);

  const campos = [
    { id: 'p-x', nome: 'itens com a característica (x)' },
    { id: 'p-n', nome: 'tamanho da amostra (n)' },
  ];
  if (!camposCompletos(campos, 'status-proporcao', out, submetido)) return;

  const x = num($('p-x').value);
  const n = num($('p-n').value);
  const rawN = $('p-N').value.trim();
  const N = num(rawN);
  const temN = rawN !== '';

  let msg = '';
  if (!Number.isFinite(x) || !Number.isFinite(n)) msg = 'Use apenas números nos campos.';
  else if (!Number.isInteger(n) || n < 1) msg = 'O tamanho da amostra (n) precisa ser um inteiro maior ou igual a 1.';
  else if (!Number.isInteger(x) || x < 0 || x > n) msg = 'Os itens com a característica (x) precisam ser um inteiro entre 0 e n.';
  else if (temN && (!Number.isInteger(N) || N < n)) msg = 'O tamanho da população (N) precisa ser um inteiro maior ou igual a n.';
  if (msg) {
    out.hidden = true;
    return setStatus('status-proporcao', msg, submetido ? 'erro' : 'info');
  }
  setStatus('status-proporcao', '');

  const r = estimarProporcao({ x, n, N: temN ? N : NaN, z });
  const corrigido = r.f !== 1;
  const lo = Math.max(0, r.lo);
  const hi = Math.min(1, r.hi);
  const ajustado = lo !== r.lo || hi !== r.hi;
  const pct = (v) => fmt(v * 100);

  const total = temN
    ? `<div class="card"><span>Total estimado na população (N × p̄)</span><strong>${fmt(N * r.pontual, 0)}</strong><small>Intervalo do total: ${fmt(N * lo, 0)} a ${fmt(N * hi, 0)}</small></div>`
    : '';

  const aviso = ajustado
    ? '<p class="aviso">⚠ O intervalo passou de 0% ou de 100% e foi limitado a esse intervalo.</p>'
    : '';

  out.hidden = false;
  out.innerHTML = `
    <div class="cards">
      <div class="card"><span>Estimativa pontual</span><strong>${pct(r.pontual)}%</strong></div>
      <div class="card"><span>Intervalo de ${conf}%</span><strong>${pct(lo)}% a ${pct(hi)}%</strong></div>
      <div class="card"><span>Erro de estimação</span><strong>± ${pct(r.erro)}%</strong></div>
      ${total}
    </div>
    <p class="nota">${notaCorrecao(n, temN ? N : NaN, r.f)}</p>
    ${aviso}
    <details>
      <summary>Passo a passo</summary>
      <ol>
        <li>Pontual: p = p̄ = x/n = ${x}/${n} = ${fmt(r.pontual, 4)}</li>
        <li>Erro: e = z · √(p̄(1−p̄)/n)${corrigido ? ' · √((N−n)/(N−1))' : ''}</li>
        <li>e = ${fmt(z)} · √(${fmt(r.pontual, 4)} · ${fmt(1 - r.pontual, 4)}/${n})${corrigido ? ` · ${fmt(r.f, 4)}` : ''} = ${fmt(r.erro, 4)}</li>
        <li>Intervalo: ${fmt(r.pontual, 4)} ± ${fmt(r.erro, 4)} → ${pct(lo)}% a ${pct(hi)}%</li>
      </ol>
    </details>`;

  drawChart('chart-proporcao', conf, z, { lo: `${pct(lo)}%`, mid: `${pct(r.pontual)}%`, hi: `${pct(hi)}%` });
}

function init() {
  // abas
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn);
      });
      document.querySelectorAll('.panel').forEach((p) => {
        p.classList.toggle('active', p.id === btn.dataset.tab);
      });
    });
  });

  // Calcula quando os campos obrigatórios estão completos e o usuário para de digitar
  // (ou sai do campo). "Calcular" força o cálculo na hora; "Limpar" zera tudo.
  const ligar = (formId, atualizar) => {
    const form = $(formId);
    let timer;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(timer);
      atualizar(true);
    });

    form.addEventListener('input', (e) => {
      clearTimeout(timer);
      if (e.target.type === 'radio') atualizar(false);
      else timer = setTimeout(() => atualizar(false), 700);
    });

    form.addEventListener('change', () => {
      clearTimeout(timer);
      atualizar(false);
    });

    form.querySelector('[data-limpar]').addEventListener('click', () => {
      clearTimeout(timer);
      form.reset();
      atualizar(false);
      form.querySelector('input[type="text"]').focus();
    });

    atualizar(false);
  };

  ligar('form-media', atualizarMedia);
  ligar('form-proporcao', atualizarProporcao);
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { estimarMedia, estimarProporcao, Z };