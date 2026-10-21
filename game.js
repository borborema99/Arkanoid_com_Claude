'use strict';
// Constantes do jogo
const L = 960, A = 640, PAREDE = 8, TOPO = 72, BW = 44, BH = 20, PX = 46, PY = 22, BTOPO = 110;
const RH = 16, RY = 580, RAIO = 6, V0 = 375, CHANCE_BUFF = 0.15, TIPOS = 'MVGLT$', RW0 = 100;
let RW = RW0;
const PAUSA = { x: 480, y: 26, r: 22 }, BTN = { x: 360, y: 470, w: 240, h: 56 };
const BPM_BASE = 100, BPM_MAX = 180, GANHO_MUSICA = 0.04;
const LEAD = 'A4 C5 E5 C5 A4 C5 E5 - G4 B4 D5 B4 G4 B4 D5 - F4 A4 C5 A4 F4 A4 C5 A4 E4 G#4 B4 G#4 E4 B4 E5 -'.split(' ');
const BAIXO = ['A2', 'G2', 'F2', 'E2'];
let gm;
const mus = { id: null, passo: 0, prox: 0 };
const COR_BUFF = { M: '#a030d0', V: '#20c020', G: '#2080f0', L: '#f08020', T: '#ff4040', $: '#f0e020' };
// Cor e pontos de cada letra de bloco
const BLOCOS = { R: ['#d8321f', 90], O: ['#e8731a', 60], Y: ['#d4c11b', 120], G: ['#2fb344', 80], B: ['#0b78c9', 100], P: ['#9a82e6', 70], S: ['#b8bcc4', 100] };
const FASES = [
  { nome: 'Borboleta', mapa: [
    '....RRRRRPPRRRRR....',
    '..RRRYYYYPPYYYYRRR..',
    'RYYYYYYYRPPRYYYYYYYR',
    'RYYYYYYBPPPPBYYYYYYR',
    'PPPPPPPPPBBPPPPPPPPP',
    'PPPBBBBPPPPPPBBBBPPP',
    '..PBBBBBPPPPBBBBBP..',
    '....PPPPPPPPPPPP....'] },
  { nome: 'Pirâmide', mapa: [
    '.........RR.........',
    '........OOOO........',
    '.......YYYYYY.......',
    '......GGGGGGGG......',
    '.....BBBBBBBBBB.....',
    '....PPPPPPPPPPPP....',
    '...SSSSSSSSSSSSSS...',
    '..SSSSSSSSSSSSSSSS..'] },
  { nome: 'Losango', mapa: [
    '.........YY.........',
    '.......RRRRRR.......',
    '.....OOOOOOOOOO.....',
    '...YYYYYYYYYYYYYY...',
    '.GGGGGGGGGGGGGGGGGG.',
    '.BBBBBBBPPPPBBBBBBB.',
    '...PPPPPPPPPPPPPP...',
    '.....SSSSSSSSSS.....',
    '.......SSSSSS.......',
    '.........SS.........'] },
  { nome: 'Coração', mapa: [
    '..RRRRRR....RRRRRR..',
    '.RPPRRRRR..RRRRRRRR.',
    'RRRRRRRRRRRRRRRRRRRR',
    '.RRRRRRRRRRRRRRRRRR.',
    '..RRRRRRRRRRRRRRRR..',
    '...RRRRRRRRRRRRRR...',
    '.....RRRRRRRRRR.....',
    '.......SSSSSS.......',
    '.........SS.........'] }
];
// Rachaduras de lava da raquete (frações da largura e da altura)
const RACHA = [[[.10, .2], [.18, .55], [.14, .85]], [[.35, .1], [.42, .45], [.38, .7], [.46, .92]], [[.62, .9], [.68, .5], [.76, .6], [.8, .15]], [[.88, .3], [.92, .7]]];
const cv = document.getElementById('tela'), ctx = cv.getContext('2d');
let estado = 'inicio', blocos, raq, bolas, caps = [], tiros = [], buffs = { G: 0, L: 0, T: 0 }, cd = 0, anuncio = false, totalBlocos = 1, ac, mudo = false, pontos = 0, vidas = 3, round = 1, quebrados = 0, vel = V0, recorde, ultimo, teclas = {}, estrelas = [], sprites = {}, fundo;
recorde = +localStorage.getItem('arkanoidRecorde') || 0;

// Cria ou retoma o AudioContext (só dentro de evento do usuário)
function audio() {
  if (!ac) { ac = new AudioContext(); gm = ac.createGain(); gm.connect(ac.destination); volMusica(); }
  if (ac.state === 'suspended') ac.resume();
}
// Ajusta o ganho da música (zero com o som desligado)
function volMusica() { if (gm) gm.gain.value = mudo ? 0 : GANHO_MUSICA; }
// Toca um tom (ou ruído) com queda/subida opcional de frequência
function bip(freq, dur, onda, vol, freqFinal, atraso = 0, destino = ac && ac.destination) {
  if (!ac || mudo) return;
  const t = ac.currentTime + atraso, g = ac.createGain();
  let o;
  if (onda === 'ruido') {
    o = ac.createBufferSource(); o.buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    o.buffer.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });
  } else {
    o = ac.createOscillator(); o.type = onda; o.frequency.setValueAtTime(freq, t);
    if (freqFinal) o.frequency.exponentialRampToValueAtTime(freqFinal, t + dur);
  }
  g.gain.setValueAtTime(Math.min(vol, destino === gm ? 1 : 0.15), t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur);
}
// Toca uma sequência de notas, uma após a outra
function notas(freqs, dur, onda) { freqs.forEach((f, i) => bip(f, dur, onda, 0.1, 0, i * dur)); }
const SONS = {
  bloco: () => { bip(0, 0.08, 'ruido', 0.12); bip(500, 0.08, 'square', 0.08, 80); },
  tink: () => bip(2600, 0.06, 'square', 0.06, 2000),
  raquete: () => bip(110, 0.08, 'square', 0.15, 70),
  buff: () => { bip(988, 0.07, 'square', 0.1); bip(1976, 0.25, 'square', 0.1, 0, 0.07); },
  parede: () => bip(300, 0.05, 'triangle', 0.12),
  lancar: () => bip(300, 0.15, 'square', 0.1, 900),
  vida: () => notas([440, 370, 311, 262], 0.15, 'square'),
  round: () => notas([523, 659, 784, 1047], 0.12, 'square'),
  fim: () => notas([392, 330, 262], 0.3, 'triangle'),
  pausa: () => bip(600, 0.06, 'square', 0.1),
  laser: () => bip(900, 0.1, 'square', 0.1, 200)
};
// Toca um som pelo nome
function tocar(nome) { SONS[nome](); }
// Converte nome de nota (ex.: G#4) em frequência, com A4 = 440 Hz
function freqNota(n) {
  const [, letra, sus, oit] = /^([A-G])(#?)(\d)$/.exec(n);
  return 440 * 2 ** ((12 * (+oit + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letra] + (sus ? 1 : 0) - 69) / 12);
}
// Andamento da música: sobe com o round e com o progresso dos blocos
function bpmAtual() { return Math.min(BPM_MAX, BPM_BASE + 5 * (round - 1) + 70 * quebrados / totalBlocos); }
// Agenda um passo (colcheia) do lead e, a cada 2 passos, do baixo
function agendarPasso() {
  const dur = 60 / bpmAtual() / 2, atraso = Math.max(0, mus.prox - ac.currentTime), p = mus.passo;
  if (LEAD[p] !== '-') bip(freqNota(LEAD[p]), dur, 'square', 1, 0, atraso, gm);
  if (p % 2 === 0) bip(freqNota(BAIXO[p >> 3]), dur * 0.8, 'triangle', 1, 0, atraso, gm);
  mus.prox += dur; mus.passo = (p + 1) % LEAD.length;
}
// Agenda os passos que caem nos próximos 0.1 s
function agendarMusica() { while (mus.prox < ac.currentTime + 0.1) agendarPasso(); }
// Inicia a música se ainda não houver agendador ativo
function iniciarMusica() {
  if (!ac || mus.id) return;
  mus.prox = ac.currentTime + 0.05; mus.id = setInterval(agendarMusica, 25);
}
// Para a música; zera o passo se pedido
function pararMusica(zerar) {
  clearInterval(mus.id); mus.id = null;
  if (zerar) mus.passo = 0;
}
// Retoma a música se a partida está rodando com bola lançada
function retomarMusica() { if (estado === 'jogando' && bolas.some(b => !b.presa)) iniciarMusica(); }

// Zera a partida e começa o round 1
function iniciar() {
  audio(); pontos = 0; vidas = 3; round = 1; zerarBuffs(); novoRound(true); estado = 'jogando';
}
// Remove os buffs temporários e os tiros
function zerarBuffs() { buffs = { G: 0, L: 0, T: 0 }; RW = RW0; tiros = []; cd = 0; }
// Monta a lista de blocos de uma fase a partir do mapa
function montarBlocos(f) {
  const lista = [], x0 = (L - (20 * PX - 2)) / 2;
  FASES[f].mapa.forEach((lin, r) => [...lin].forEach((ch, c) => {
    if (ch !== '.') lista.push({ x: x0 + c * PX, y: BTOPO + r * PY, t: ch, vida: ch === 'S' ? 2 : 1 });
  }));
  return lista;
}
// Monta a fase do round e recoloca a bola; aplica o aumento de 10% por round
function novoRound(primeiro) {
  vel = primeiro ? V0 : Math.min(vel * 1.1, V0 * 2);
  if (!primeiro) { round++; tocar('round'); }
  pararMusica(true); quebrados = 0; caps = []; tiros = []; anuncio = true;
  blocos = montarBlocos((round - 1) % FASES.length); totalBlocos = blocos.length;
  raq = { x: (L - RW) / 2 };
  colar();
}
// Cola a bola na raquete
function colar() { bolas = [{ x: raq.x + RW / 2, y: RY - RAIO, vx: 0, vy: 0, presa: true, lat: 0 }]; }
// Velocidade efetiva: regra de dificuldade vezes bola lenta
function velEf() { return vel * (buffs.L > 0 ? 0.6 : 1); }
// Lança a bola presa para cima com leve inclinação
function lancar() {
  const b = bolas.find(x => x.presa);
  b.presa = false; b.vx = velEf() * 0.3; b.vy = -velEf() * 0.95; normalizar(b); anuncio = false; tocar('lancar'); iniciarMusica();
}
// Ação do Espaço ou clique: lança a bola presa ou atira o laser
function acao() {
  audio();
  if (bolas.some(b => b.presa)) lancar(); else atirar();
}
// Dispara dois tiros (um por ponta) se o laser estiver ativo e sem cooldown
function atirar() {
  if (buffs.T <= 0 || cd > 0) return;
  tiros.push({ x: raq.x + 5, y: RY }, { x: raq.x + RW - 5, y: RY }); cd = 0.25; tocar('laser');
}
// Força o módulo à velocidade alvo e |vy| >= 40% dele, preservando os sinais
function normalizar(b) {
  const m = velEf(), h = Math.hypot(b.vx, b.vy) || 1;
  b.vx *= m / h; b.vy *= m / h;
  if (Math.abs(b.vy) >= 0.4 * m) return;
  b.vy = (b.vy > 0 ? 1 : -1) * 0.4 * m; b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(m * m - b.vy * b.vy);
}
// Mantém as bolas presas centradas na raquete
function grudar() { bolas.forEach(b => { if (b.presa) b.x = raq.x + RW / 2; }); }
// Move a raquete pelo teclado e mantém dentro da área
function moverRaquete(dt) {
  if (teclas.ArrowLeft || teclas.a) raq.x -= 500 * dt;
  if (teclas.ArrowRight || teclas.d) raq.x += 500 * dt;
  raq.x = Math.max(PAREDE, Math.min(L - PAREDE - RW, raq.x));
  grudar();
}
// Conta o tempo dos buffs temporários e ajusta a raquete
function atualizarBuffs(dt) {
  ['G', 'L', 'T'].forEach(k => { buffs[k] = Math.max(0, buffs[k] - dt); });
  cd = Math.max(0, cd - dt); RW = buffs.G > 0 ? RW0 * 1.5 : RW0;
}
// Faz as cápsulas caírem e aplica as que tocam a raquete
function atualizarCapsulas(dt) {
  caps = caps.filter(c => {
    c.y += 120 * dt;
    if (c.x < raq.x + RW && c.x + 32 > raq.x && c.y + 14 > RY && c.y < RY + RH) { aplicarBuff(c.t); tocar('buff'); return false; }
    return c.y < A;
  });
}
// Aplica o efeito de uma cápsula
function aplicarBuff(t) {
  if (t === 'M') multibola();
  if (t === 'V') vidas = Math.min(5, vidas + 1);
  if (t === 'G') buffs.G = 12;
  if (t === 'L') buffs.L = 8;
  if (t === 'T') buffs.T = 10;
  if (t === '$') somar(500);
}
// Cada bola solta gera mais duas a ±25°, até 6 no total
function multibola() {
  const novas = [];
  bolas.filter(b => !b.presa).forEach(b => [-1, 1].forEach(s => {
    if (bolas.length + novas.length >= 6) return;
    const a = s * 25 * Math.PI / 180, c = Math.cos(a), n = Math.sin(a);
    const nb = { x: b.x, y: b.y, vx: b.vx * c - b.vy * n, vy: b.vx * n + b.vy * c, presa: false, lat: 0 };
    normalizar(nb); novas.push(nb);
  }));
  bolas.push(...novas);
}
// Move uma bola em subpassos curtos testando colisões
function moverBola(b, dt) {
  const passos = Math.ceil(velEf() * dt / 2);
  for (let i = 0; i < passos && bolas.includes(b); i++) {
    b.x += b.vx * dt / passos; b.y += b.vy * dt / passos;
    colidirParedes(b); colidirRaquete(b); colidirBlocos(b);
  }
}
// Sobe os tiros e destrói o primeiro bloco que cada um tocar
function atualizarTiros(dt) {
  const lista = tiros, vivos = [];
  for (const t of lista) {
    if (tiros !== lista) break;
    t.y -= 600 * dt;
    const k = blocos.find(k => t.x + 1.5 > k.x && t.x - 1.5 < k.x + BW && t.y < k.y + BH && t.y + 14 > k.y);
    if (k) acertarBloco(k, true); else if (t.y + 14 > TOPO) vivos.push(t);
  }
  if (tiros === lista) tiros = vivos;
}
// Atualiza o estado do jogo a cada quadro
function atualizar(dt) {
  atualizarBuffs(dt); moverRaquete(dt); atualizarCapsulas(dt); atualizarTiros(dt);
  bolas.filter(b => !b.presa).forEach(b => { normalizar(b); moverBola(b, dt); });
  bolas = bolas.filter(b => b.presa || b.y - RAIO <= A);
  if (!bolas.length) perderVida();
}
// Colisão com paredes esquerda, direita e topo
function colidirParedes(b) {
  if (b.x - RAIO < PAREDE) { b.x = PAREDE + RAIO; b.vx = Math.abs(b.vx); tocarLado(b); }
  if (b.x + RAIO > L - PAREDE) { b.x = L - PAREDE - RAIO; b.vx = -Math.abs(b.vx); tocarLado(b); }
  if (b.y - RAIO < TOPO) { b.y = TOPO + RAIO; b.vy = Math.abs(b.vy); b.lat = 0; normalizar(b); tocar('parede'); }
}
// Conta batida lateral; no 6º toque seguido força a bola a descer
function tocarLado(b) {
  normalizar(b); tocar('parede');
  if (++b.lat < 6) return;
  const m = velEf(); b.lat = 0; b.vy = 0.7 * m; b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(m * m - b.vy * b.vy);
}
// Colisão com a raquete: ângulo (até ±60°) depende do ponto de impacto
function colidirRaquete(b) {
  if (b.vy <= 0 || b.y + RAIO < RY || b.y - RAIO > RY + RH) return;
  if (b.x + RAIO < raq.x || b.x - RAIO > raq.x + RW) return;
  const p = Math.max(-1, Math.min(1, (b.x - raq.x - RW / 2) / (RW / 2))), ang = p * 60 * Math.PI / 180;
  b.vx = Math.sin(ang) * velEf(); b.vy = -Math.cos(ang) * velEf(); b.y = RY - RAIO; b.lat = 0; normalizar(b); tocar('raquete');
}
// Colisão com blocos: reposiciona a bola fora e inverte só o eixo de menor penetração
function colidirBlocos(b) {
  for (const k of blocos) {
    const cx = Math.max(k.x, Math.min(b.x, k.x + BW)), cy = Math.max(k.y, Math.min(b.y, k.y + BH));
    if ((b.x - cx) ** 2 + (b.y - cy) ** 2 > RAIO * RAIO) continue;
    const dx = Math.min(b.x + RAIO - k.x, k.x + BW - b.x + RAIO), dy = Math.min(b.y + RAIO - k.y, k.y + BH - b.y + RAIO);
    const esq = b.x < k.x + BW / 2, cima = b.y < k.y + BH / 2;
    if (dx < dy) { b.x = esq ? k.x - RAIO : k.x + BW + RAIO; b.vx = esq ? -Math.abs(b.vx) : Math.abs(b.vx); }
    else { b.y = cima ? k.y - RAIO : k.y + BH + RAIO; b.vy = cima ? -Math.abs(b.vy) : Math.abs(b.vy); }
    b.lat = 0; normalizar(b); acertarBloco(k);
    return;
  }
}
// Soma pontos e atualiza o recorde
function somar(p) {
  pontos += p;
  if (pontos > recorde) { recorde = pontos; localStorage.setItem('arkanoidRecorde', recorde); }
}
// Aplica dano ao bloco (ou destrói se forçado), soma pontos, sorteia buff e acelera a bola
function acertarBloco(k, forcar) {
  if (!forcar && --k.vida > 0) { tocar('tink'); return; }
  tocar('bloco'); blocos.splice(blocos.indexOf(k), 1); somar(BLOCOS[k.t][1]); quebrados++;
  if (Math.random() < CHANCE_BUFF) caps.push({ x: k.x + BW / 2 - 16, y: k.y, t: TIPOS[Math.floor(Math.random() * TIPOS.length)] });
  if (quebrados % 5 === 0) vel = Math.min(vel * 1.03, V0 * 2);
  if (!blocos.length) novoRound(false);
}
// Perde uma vida, remove buffs e cápsulas, e termina o jogo se acabarem
function perderVida() {
  pararMusica(true); zerarBuffs(); caps = [];
  if (--vidas > 0) { tocar('vida'); colar(); return; }
  tocar('fim'); estado = 'fim';
}
// Escreve texto alinhado
function texto(t, x, y, cor, al, tam, fam) {
  ctx.fillStyle = cor; ctx.textAlign = al || 'left'; ctx.font = 'bold ' + (tam || 16) + 'px ' + (fam || 'monospace'); ctx.fillText(t, x, y);
}
// Texto do HUD: sans-serif amarelo-esverdeado com sombra escura
function hud(t, x, y, tam, al) {
  ctx.shadowColor = '#000'; ctx.shadowBlur = 4; texto(t, x, y, '#d8f23a', al, tam, 'sans-serif'); ctx.shadowBlur = 0;
}
// Pré-renderiza o sprite 3D de cada cor de bloco
function criarSprites() {
  for (const [ch, [cor]] of Object.entries(BLOCOS)) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = BW; c.height = BH;
    g.fillStyle = cor; g.fillRect(0, 0, BW, BH);
    const gr = g.createLinearGradient(0, 0, 0, BH);
    gr.addColorStop(0, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(0,0,0,.3)');
    g.fillStyle = gr; g.fillRect(0, 0, BW, BH);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, 0, BW, 2); g.fillRect(0, 0, 2, BH);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, BH - 2, BW, 2); g.fillRect(BW - 2, 0, 2, BH);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(4, 3, BW - 8, 1);
    sprites[ch] = c;
  }
}
// Pré-renderiza gradiente e nebulosas do fundo e sorteia as estrelas
function criarFundo() {
  fundo = document.createElement('canvas'); fundo.width = L; fundo.height = A;
  const g = fundo.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, A);
  gr.addColorStop(0, '#050a2a'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, L, A);
  [[200, 180, 260, '150,60,220'], [720, 300, 300, '40,90,230'], [480, 520, 240, '110,50,200']].forEach(([x, y, r, c]) => {
    const n = g.createRadialGradient(x, y, 0, x, y, r);
    n.addColorStop(0, 'rgba(' + c + ',.28)'); n.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = n; g.fillRect(0, 0, L, A);
  });
  for (let i = 0; i < 90; i++) estrelas.push({ x: Math.random() * L, y: Math.random() * A, v: 10 + Math.random() * 20, r: 0.6 + Math.random() });
}
// Desce as estrelas em loop
function moverEstrelas(dt) { estrelas.forEach(s => { s.y = (s.y + s.v * dt) % A; }); }
// Desenha o fundo espacial com as estrelas
function desenharFundo() {
  ctx.drawImage(fundo, 0, 0); ctx.fillStyle = '#fff';
  estrelas.forEach(s => ctx.fillRect(s.x, s.y, s.r, s.r));
}
// Desenha os blocos (com rachadura no prata danificado)
function desenharBlocos() {
  blocos.forEach(k => {
    ctx.drawImage(sprites[k.t], k.x, k.y);
    if (k.t !== 'S' || k.vida !== 1) return;
    ctx.strokeStyle = 'rgba(30,30,40,.85)'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(k.x + 8, k.y + 2); ctx.lineTo(k.x + 20, k.y + 10); ctx.lineTo(k.x + 15, k.y + 13); ctx.lineTo(k.x + 30, k.y + 19); ctx.stroke();
  });
}
// Desenha a raquete de lava com rachaduras e os canhões do laser
function desenharRaquete() {
  ctx.fillStyle = '#2a2220'; ctx.beginPath(); ctx.roundRect(raq.x, RY, RW, RH, RH / 2); ctx.fill();
  ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 1.5; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 6;
  RACHA.forEach(l => { ctx.beginPath(); l.forEach(([fx, fy], i) => ctx[i ? 'lineTo' : 'moveTo'](raq.x + fx * RW, RY + fy * RH)); ctx.stroke(); });
  ctx.shadowBlur = 0;
  if (buffs.T > 0) { ctx.fillStyle = '#e02020'; ctx.fillRect(raq.x + 2, RY - 7, 6, 9); ctx.fillRect(raq.x + RW - 8, RY - 7, 6, 9); }
}
// Desenha a bola com gradiente radial
function desenharBola(b) {
  const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, RAIO);
  g.addColorStop(0, '#fff'); g.addColorStop(1, '#8fc8ff');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, RAIO, 0, 7); ctx.fill();
}
// Desenha um tiro de laser com brilho
function desenharTiro(t) {
  ctx.shadowColor = '#ff4040'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff9090'; ctx.fillRect(t.x - 1.5, t.y, 3, 14); ctx.shadowBlur = 0;
}
// Desenha paredes, blocos, raquete, bolas, cápsulas e tiros
function desenharArena() {
  ctx.fillStyle = '#7a8aa0'; ctx.fillRect(0, 64, L, 8); ctx.fillRect(0, 64, PAREDE, A); ctx.fillRect(L - PAREDE, 64, PAREDE, A);
  desenharBlocos(); desenharRaquete(); bolas.forEach(desenharBola); caps.forEach(desenharCapsula); tiros.forEach(desenharTiro);
}
// Desenha uma cápsula de buff com a letra
function desenharCapsula(c) {
  ctx.fillStyle = COR_BUFF[c.t]; ctx.beginPath(); ctx.roundRect(c.x, c.y, 32, 14, 6); ctx.fill();
  ctx.textBaseline = 'middle'; texto(c.t, c.x + 16, c.y + 8, '#000', 'center'); ctx.textBaseline = 'alphabetic';
}
// Desenha uma estrela dourada de 5 pontas
function estrela(cx, cy, r) {
  ctx.fillStyle = '#ffc400'; ctx.strokeStyle = '#a06800'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
// Desenha o botão redondo de pausa (vira play quando pausado)
function desenharBotaoPausa() {
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(PAUSA.x, PAUSA.y, PAUSA.r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  if (estado === 'pausa') { ctx.beginPath(); ctx.moveTo(PAUSA.x - 6, PAUSA.y - 11); ctx.lineTo(PAUSA.x + 11, PAUSA.y); ctx.lineTo(PAUSA.x - 6, PAUSA.y + 11); ctx.fill(); }
  else { ctx.fillRect(PAUSA.x - 9, PAUSA.y - 10, 6, 20); ctx.fillRect(PAUSA.x + 3, PAUSA.y - 10, 6, 20); }
}
// Desenha o HUD: pontos, recorde, pausa, fase, vidas, buffs ativos e som
function desenharHud() {
  hud('PONTOS', 24, 18, 14); hud(String(pontos), 24, 46, 28); hud('RECORDE ' + recorde, 24, 62, 14);
  desenharBotaoPausa(); hud('FASE ' + round, PAUSA.x, 62, 14, 'center');
  hud('VIDAS', L - 24, 18, 14, 'right');
  for (let i = 0; i < Math.min(vidas, 5); i++) estrela(L - 36 - i * 28, 42, 11);
  ['G', 'L', 'T'].filter(k => buffs[k] > 0).forEach((k, i) => texto(k + ' ' + Math.ceil(buffs[k]) + 's', 16, 628 - i * 20, '#ff0'));
  if (mudo) texto('SOM OFF', L - 16, 628, '#ff0', 'right');
}
// Faixa preta translúcida atrás dos textos centrais
function faixa(y, h) { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, y, L, h); }
// Desenha o botão arredondado das telas inicial e final
function desenharBotao(rotulo) {
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(BTN.x, BTN.y, BTN.w, BTN.h, 28); ctx.fill(); ctx.stroke();
  texto(rotulo, BTN.x + BTN.w / 2, BTN.y + 37, '#ff0', 'center', 24);
}
// Tela inicial com título e controles sobre a fase 1 esmaecida
function telaInicio() {
  ctx.globalAlpha = 0.35; desenharBlocos(); ctx.globalAlpha = 1;
  ctx.shadowColor = '#ff0'; ctx.shadowBlur = 30; texto('ARKANOID', L / 2, 230, '#ff0', 'center', 100); ctx.shadowBlur = 0;
  ['Setas, A/D ou mouse: mover a raquete', 'Espaço ou clique: lançar a bola / atirar', 'P ou botão de pausa: pausar', 'F1 ou botão Jogar: começar']
    .forEach((t, i) => texto(t, L / 2, 310 + i * 32, '#fff', 'center', 20));
  desenharBotao('Jogar');
}
// Tela de pausa
function telaPausa() { faixa(260, 100); texto('PAUSADO', L / 2, 325, '#ff0', 'center', 48); }
// Tela de resultado ao fim da partida
function telaFim() {
  faixa(110, 330); texto('FIM DE JOGO', L / 2, 190, '#ff0', 'center', 56);
  texto('Pontos: ' + pontos, L / 2, 260, '#fff', 'center', 24); texto('Fase alcançada: ' + round, L / 2, 300, '#fff', 'center', 24);
  texto('Recorde: ' + recorde, L / 2, 340, '#fff', 'center', 24); texto('F1 ou botão: jogar de novo', L / 2, 395, '#ff0', 'center', 20);
  desenharBotao('Jogar de novo');
}
// Anúncio da fase enquanto a bola está colada no início do round
function telaAnuncio() {
  faixa(250, 100); texto('FASE ' + round, L / 2, 295, '#ff0', 'center', 36);
  texto(FASES[(round - 1) % FASES.length].nome, L / 2, 333, '#fff', 'center', 22);
}
// Desenha o quadro conforme o estado atual
function desenhar() {
  desenharFundo();
  if (estado === 'inicio') return telaInicio();
  desenharArena(); desenharHud();
  if (estado === 'pausa') telaPausa();
  if (estado === 'fim') telaFim();
  if (estado === 'jogando' && anuncio) telaAnuncio();
}
// Laço principal com delta time limitado a 50 ms
function laco(t) {
  const dt = Math.min((t - ultimo) / 1000, 0.05); ultimo = t;
  moverEstrelas(dt);
  if (estado === 'jogando') atualizar(dt);
  desenhar(); requestAnimationFrame(laco);
}
// Pausa ou retoma a partida (tecla P e botão de pausa)
function alternarPausa() {
  if (estado !== 'jogando' && estado !== 'pausa') return;
  estado = estado === 'jogando' ? 'pausa' : 'jogando'; tocar('pausa');
  if (estado === 'pausa') pararMusica(false); else retomarMusica();
}
// Teclado: F1 inicia, P pausa, espaço lança ou atira
addEventListener('keydown', e => {
  if (e.key === 'F1') { e.preventDefault(); if (estado === 'inicio' || estado === 'fim') iniciar(); return; }
  teclas[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
  if (e.key === ' ') { e.preventDefault(); if (estado === 'jogando') acao(); }
  if (e.key.toLowerCase() === 'p') alternarPausa();
  if (e.key.toLowerCase() === 'm') { mudo = !mudo; volMusica(); }
});
addEventListener('keyup', e => { delete teclas[e.key.length === 1 ? e.key.toLowerCase() : e.key]; });
// Converte o mouse para coordenadas do canvas (que escala com a janela)
function posMouse(e) {
  const r = cv.getBoundingClientRect(), k = cv.width / r.width;
  return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
}
// Mouse move a raquete
cv.addEventListener('mousemove', e => {
  if (estado !== 'jogando') return;
  raq.x = Math.max(PAREDE, Math.min(L - PAREDE - RW, posMouse(e).x - RW / 2)); grudar();
});
// Clique: botão de pausa, botões das telas ou ação do jogo
cv.addEventListener('mousedown', e => {
  const p = posMouse(e);
  if ((estado === 'jogando' || estado === 'pausa') && Math.hypot(p.x - PAUSA.x, p.y - PAUSA.y) <= PAUSA.r) return alternarPausa();
  if (estado === 'inicio' || estado === 'fim') { if (p.x > BTN.x && p.x < BTN.x + BTN.w && p.y > BTN.y && p.y < BTN.y + BTN.h) iniciar(); return; }
  if (estado === 'jogando') acao();
});
// Para a música com a aba oculta e retoma ao voltar
document.addEventListener('visibilitychange', () => { if (document.hidden) pararMusica(false); else retomarMusica(); });
criarSprites(); criarFundo(); blocos = montarBlocos(0);
requestAnimationFrame(t => { ultimo = t; laco(t); });
