/* =========================================================
   SimulaBorsa — app.js (interfaccia)
   ========================================================= */
(function () {
  'use strict';
  var SB = window.SB, M = SB.motore, D = SB.dati;
  var S = M.carica();
  SB.impostazioniDati = function () { return S.imp.dati; };

  var fmt = M.fmt, fmtP = M.fmtP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function segno(x) { return x > 0 ? 'pos' : x < 0 ? 'neg' : ''; }
  function pm(x, dec) { return (x > 0 ? '+' : '') + fmt(x, dec); }
  function data(sec, ora) { var d = new Date(sec * 1000); return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) + (ora === false ? '' : ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })); }
  function durata(sec) { if (sec < 3600) return Math.round(sec / 60) + ' min'; if (sec < 86400) return (sec / 3600).toFixed(1).replace('.', ',') + ' h'; return (sec / 86400).toFixed(1).replace('.', ',') + ' g'; }

  /* ---------- Cataloghi ---------- */
  var CAT = [
    ['preferiti', 'Preferiti'], ['italia', 'Italia'], ['usa', 'USA'], ['europa', 'Europa'], ['asia', 'Asia'], ['etf', 'ETF'],
    ['forex', 'Forex'], ['materie', 'Materie prime'], ['futures', 'Futures'], ['tassi', 'Tassi e bond'], ['cripto', 'Cripto'], ['demo', 'Demo']
  ];
  var LISTE = {
    italia: 'FTSEMIB.MI ENI.MI ENEL.MI ISP.MI UCG.MI STLAM.MI RACE.MI G.MI LDO.MI PST.MI MB.MI TIT.MI',
    usa: '^GSPC ^NDX ^DJI AAPL MSFT NVDA AMZN GOOGL META TSLA JPM KO',
    europa: '^STOXX50E ^GDAXI ^FCHI ^FTSE ^IBEX ASML.AS SAP.DE MC.PA NESN.SW SHEL.L',
    asia: '^N225 ^HSI 000001.SS ^BSESN 7203.T 6758.T 0700.HK 9988.HK TSM 005930.KS',
    etf: 'SWDA.MI VWCE.DE CSSPX.MI EQQQ.MI EIMI.MI SPY QQQ GLD TLT',
    forex: 'EURUSD=X GBPUSD=X USDJPY=X EURCHF=X EURGBP=X AUDUSD=X USDCAD=X EURJPY=X USDCHF=X NZDUSD=X',
    materie: 'GC=F SI=F CL=F BZ=F NG=F HG=F PL=F ZW=F ZC=F KC=F',
    futures: 'ES=F NQ=F YM=F RTY=F ZB=F ZN=F 6E=F',
    tassi: '^TNX ^TYX ^FVX ^IRX TLT IEF SHY',
    cripto: 'B:BTCUSDT B:ETHUSDT B:SOLUSDT B:BNBUSDT B:XRPUSDT B:ADAUSDT B:DOGEUSDT B:AVAXUSDT B:LINKUSDT B:BTCEUR B:ETHEUR',
    demo: 'D:DEMO_AZ D:DEMO_US D:DEMO_CR D:DEMO_FX D:DEMO_ETF'
  };
  var MULT = { 'ES=F': 50, 'NQ=F': 20, 'YM=F': 5, 'RTY=F': 50, 'GC=F': 100, 'SI=F': 5000, 'CL=F': 1000, 'BZ=F': 1000, 'NG=F': 10000, 'HG=F': 25000, 'PL=F': 50, 'ZW=F': 50, 'ZC=F': 50, 'KC=F': 375, 'ZB=F': 1000, 'ZN=F': 1000, '6E=F': 125000 };
  var NOMI = {
    'FTSEMIB.MI': 'FTSE MIB', 'ENI.MI': 'Eni', 'ENEL.MI': 'Enel', 'ISP.MI': 'Intesa Sanpaolo', 'UCG.MI': 'UniCredit', 'STLAM.MI': 'Stellantis', 'RACE.MI': 'Ferrari', 'G.MI': 'Generali', 'LDO.MI': 'Leonardo', 'PST.MI': 'Poste Italiane', 'MB.MI': 'Mediobanca', 'TIT.MI': 'Telecom Italia',
    '^GSPC': 'S&P 500', '^NDX': 'Nasdaq 100', '^DJI': 'Dow Jones', AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'Nvidia', AMZN: 'Amazon', GOOGL: 'Alphabet', META: 'Meta Platforms', TSLA: 'Tesla', JPM: 'JPMorgan Chase', KO: 'Coca-Cola',
    '^STOXX50E': 'Euro Stoxx 50', '^GDAXI': 'DAX', '^FCHI': 'CAC 40', '^FTSE': 'FTSE 100', '^IBEX': 'IBEX 35', 'ASML.AS': 'ASML', 'SAP.DE': 'SAP', 'MC.PA': 'LVMH', 'NESN.SW': 'Nestlé', 'SHEL.L': 'Shell',
    '^N225': 'Nikkei 225', '^HSI': 'Hang Seng', '000001.SS': 'Shanghai Composite', '^BSESN': 'BSE Sensex', '7203.T': 'Toyota', '6758.T': 'Sony', '0700.HK': 'Tencent', '9988.HK': 'Alibaba', TSM: 'TSMC', '005930.KS': 'Samsung Electronics',
    'SWDA.MI': 'iShares Core MSCI World', 'VWCE.DE': 'Vanguard FTSE All-World', 'CSSPX.MI': 'iShares Core S&P 500', 'EQQQ.MI': 'Invesco Nasdaq-100', 'EIMI.MI': 'iShares MSCI EM IMI', SPY: 'SPDR S&P 500', QQQ: 'Invesco QQQ', GLD: 'SPDR Gold Shares', TLT: 'iShares 20+Y Treasury',
    'EURUSD=X': 'Euro / Dollaro', 'GBPUSD=X': 'Sterlina / Dollaro', 'USDJPY=X': 'Dollaro / Yen', 'EURCHF=X': 'Euro / Franco', 'EURGBP=X': 'Euro / Sterlina', 'AUDUSD=X': 'Dollaro australiano / USD', 'USDCAD=X': 'Dollaro / Dollaro canadese', 'EURJPY=X': 'Euro / Yen', 'USDCHF=X': 'Dollaro / Franco', 'NZDUSD=X': 'Dollaro neozelandese / USD',
    'GC=F': 'Oro', 'SI=F': 'Argento', 'CL=F': 'Petrolio WTI', 'BZ=F': 'Petrolio Brent', 'NG=F': 'Gas naturale', 'HG=F': 'Rame', 'PL=F': 'Platino', 'ZW=F': 'Grano', 'ZC=F': 'Mais', 'KC=F': 'Caffè',
    'ES=F': 'E-mini S&P 500', 'NQ=F': 'E-mini Nasdaq 100', 'YM=F': 'Mini Dow', 'RTY=F': 'E-mini Russell 2000', 'ZB=F': 'T-Bond USA 30 anni', 'ZN=F': 'T-Note USA 10 anni', '6E=F': 'Futures Euro FX',
    '^TNX': 'Rendimento Treasury 10 anni', '^TYX': 'Rendimento Treasury 30 anni', '^FVX': 'Rendimento Treasury 5 anni', '^IRX': 'Rendimento T-Bill 13 settimane', IEF: 'iShares 7-10Y Treasury', SHY: 'iShares 1-3Y Treasury',
    BTCUSDT: 'Bitcoin / USDT', ETHUSDT: 'Ethereum / USDT', SOLUSDT: 'Solana / USDT', BNBUSDT: 'BNB / USDT', XRPUSDT: 'XRP / USDT', ADAUSDT: 'Cardano / USDT', DOGEUSDT: 'Dogecoin / USDT', AVAXUSDT: 'Avalanche / USDT', LINKUSDT: 'Chainlink / USDT', BTCEUR: 'Bitcoin / Euro', ETHEUR: 'Ethereum / Euro'
  };
  var TIPO_DEF = function (s) { return /=X$/.test(s) ? 'forex' : /=F$/.test(s) ? 'futures' : /^\^/.test(s) ? 'indice' : /^(SWDA|VWCE|CSSPX|EQQQ|EIMI|SPY|QQQ|GLD|TLT|IEF|SHY)\b/.test(s) ? 'etf' : 'azione'; };
  function ids(cat) { return LISTE[cat].split(' ').map(function (s) { return /^[A-Z]:/.test(s) ? s : 'Y:' + s; }); }
  var PROV = { Y: 'Yahoo', B: 'Binance', T: 'Twelve', D: 'Demo' };
  var TIPI = { azione: 'Azione', etf: 'ETF', fondo: 'Fondo', indice: 'Indice', forex: 'Forex', futures: 'Futures', cripto: 'Cripto', obbligazione: 'Obbligazione', opzione: 'Opzione' };

  function strumento(id) {
    var i = M.info(id), k = D.parseId(id);
    var s = { id: id, s: i.s || k.s, n: i.n || NOMI[k.s] || k.s, t: i.t || (k.p === 'B' ? 'cripto' : TIPO_DEF(k.s)), c: i.c || (k.p === 'B' ? (/EUR$/.test(k.s) ? 'EUR' : 'USD') : /\.(MI|DE|PA|AS|MC)$/.test(k.s) ? 'EUR' : 'USD'), x: i.x || '', m: i.m || MULT[k.s] || 1 };
    if (i.fisc) s.fisc = i.fisc;
    if (k.p === 'D' && D.DEMO[k.s]) { s.n = D.DEMO[k.s].n; s.t = D.DEMO[k.s].t; s.c = D.DEMO[k.s].c; }
    return s;
  }

  /* ---------- UI di base ---------- */
  var ui = { tab: 'mercati', cat: 'preferiti', sid: null, tf: '15m', gr: null, quote: {}, pannello: 'ordine', ticket: null, prezzo: null, prev: null, fx: 1 };
  try { var u0 = JSON.parse(localStorage.getItem('sb.ui') || '{}'); ['tab', 'cat', 'sid', 'tf'].forEach(function (k) { if (u0[k]) ui[k] = u0[k]; }); ui.ind = u0.ind; ui.tipoGr = u0.tipoGr; } catch (e) { /* no */ }
  if (!ui.sid) ui.sid = 'D:DEMO_AZ';
  function salvaUi() { try { localStorage.setItem('sb.ui', JSON.stringify({ tab: ui.tab, cat: ui.cat, sid: ui.sid, tf: ui.tf, ind: ui.gr ? ui.gr.ind : ui.ind, tipoGr: ui.gr ? ui.gr.tipo : ui.tipoGr })); } catch (e) { /* no */ } }

  function toast(msg, tipo) {
    var t = $('#toast');
    var d = document.createElement('div');
    d.className = 'toast ' + (tipo || '');
    d.textContent = msg;
    t.appendChild(d);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 400); }, 3800);
  }
  function sheet(html, onOpen) {
    var root = $('#sheets');
    var w = document.createElement('div');
    w.className = 'sheet-wrap';
    w.innerHTML = '<div class="sheet" role="dialog"><div class="sheet-grip"></div>' + html + '</div>';
    root.appendChild(w);
    var close = function () { w.classList.add('out'); setTimeout(function () { w.remove(); }, 220); };
    w.addEventListener('click', function (e) { if (e.target === w || e.target.closest('[data-close]')) close(); });
    if (onOpen) onOpen(w.querySelector('.sheet'), close);
    return close;
  }
  function conferma(testo, ok, etichetta) {
    sheet('<h3>' + esc(testo) + '</h3><div class="row-btn"><button class="btn ghost" data-close>Annulla</button><button class="btn danger" id="cf-ok">' + esc(etichetta || 'Conferma') + '</button></div>', function (el, close) {
      $('#cf-ok', el).onclick = function () { close(); ok(); };
    });
  }

  var ICON = {
    mercati: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
    grafico: '<svg viewBox="0 0 24 24"><path d="M8 4v16M16 4v16"/><rect x="5" y="8" width="6" height="7" rx="1"/><rect x="13" y="6" width="6" height="9" rx="1"/></svg>',
    portafoglio: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18M7 6V4h10v2"/></svg>',
    report: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    impostazioni: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
    stella: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    cerca: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'
  };
  var TABS = [['mercati', 'Mercati'], ['grafico', 'Grafico'], ['portafoglio', 'Portafoglio'], ['report', 'Report'], ['impostazioni', 'Impostazioni']];

  function renderTabbar() {
    $('#tabbar').innerHTML = TABS.map(function (t) {
      return '<button class="tab ' + (ui.tab === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + ICON[t[0]] + '<span>' + t[1] + '</span></button>';
    }).join('');
  }
  function renderHeader() {
    var c = M.conto(), r = M.riepilogo(c);
    $('#hdr-conto').innerHTML = '<button class="acc" data-act="conti"><span class="acc-n">' + esc(c.nome) + '</span><b>' + fmt(r.equity) + ' ' + c.valuta + '</b><em class="' + segno(r.rendimento) + '">' + pm(r.rendimento) + '%</em></button>';
  }

  function vai(tab) {
    if (ui.gr && tab !== 'grafico') { ui.gr.distruggi(); ui.gr = null; }
    if (ui.miniCh) { ui.miniCh.forEach(function (c) { c.remove(); }); ui.miniCh = null; }
    ui.tab = tab; salvaUi();
    renderTabbar(); renderHeader();
    var v = $('#view');
    v.scrollTop = 0;
    ({ mercati: viewMercati, grafico: viewGrafico, portafoglio: viewPortafoglio, report: viewReport, impostazioni: viewImpostazioni })[tab](v);
  }

  /* =========================================================
     MERCATI
     ========================================================= */
  function viewMercati(v) {
    v.innerHTML = '<div class="pad"><div class="search">' + ICON.cerca + '<input id="q" type="search" placeholder="Cerca azioni, ETF, indici, forex, futures, cripto…" autocomplete="off"></div>' +
      '<div class="chips" id="cats">' + CAT.map(function (c) { return '<button class="chip ' + (ui.cat === c[0] ? 'on' : '') + '" data-cat="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<div id="lista" class="lista"></div><p class="nota">Dati gratuiti: Yahoo Finance (spesso ritardati di 15 min), Binance (cripto in tempo reale), Twelve Data (con chiave). Gli strumenti Demo funzionano sempre, anche offline.</p></div>';
    var q = $('#q'), tmr;
    q.addEventListener('input', function () {
      clearTimeout(tmr);
      var val = q.value.trim();
      if (!val) { listaCat(); return; }
      tmr = setTimeout(function () { cerca(val); }, 350);
    });
    listaCat();
  }
  function idsCat() { return ui.cat === 'preferiti' ? S.watch.map(function (w) { return w.id; }) : ids(ui.cat); }
  function listaCat() {
    var arr = idsCat();
    if (!arr.length) { $('#lista').innerHTML = '<div class="vuoto">Nessun preferito. Cerca uno strumento e tocca la stella.</div>'; return; }
    renderLista(arr.map(function (id) { return strumento(id); }));
    aggiornaQuote(arr);
  }
  function renderLista(items, ricerca) {
    var w = {};
    S.watch.forEach(function (x) { w[x.id] = 1; });
    $('#lista').innerHTML = items.map(function (s) {
      var q = ui.quote[s.id] || {}, ch = q.price && q.prev ? (q.price / q.prev - 1) * 100 : null;
      return '<div class="riga" data-open="' + esc(s.id) + '">' +
        '<div class="r-main"><div class="r-sym">' + esc(s.s.replace(/^\^/, '')) + ' <span class="badge b-' + D.parseId(s.id).p + '">' + PROV[D.parseId(s.id).p] + '</span></div>' +
        '<div class="r-name">' + esc(s.n) + (ricerca ? ' · ' + esc(TIPI[s.t] || s.t) + (s.x ? ' · ' + esc(s.x) : '') : '') + '</div></div>' +
        '<div class="r-px" data-px="' + esc(s.id) + '">' + (q.price != null ? '<b>' + fmtP(q.price) + '</b><em class="' + segno(ch) + '">' + (ch != null ? pm(ch) + '%' : '') + '</em>' : '<span class="sk"></span>') + '</div>' +
        '<button class="star ' + (w[s.id] ? 'on' : '') + '" data-star="' + esc(s.id) + '" aria-label="Preferito">' + ICON.stella + '</button></div>';
    }).join('');
  }
  function aggiornaQuote(arr) {
    D.quotazioni(arr).then(function (q) {
      Object.keys(q).forEach(function (k) { ui.quote[k] = q[k]; });
      if (ui.tab !== 'mercati') return;
      arr.forEach(function (id) {
        var el = document.querySelector('[data-px="' + CSS.escape(id) + '"]'), x = q[id];
        if (!el) return;
        if (!x || x.price == null) { el.innerHTML = '<em class="muted">n.d.</em>'; return; }
        var ch = x.prev ? (x.price / x.prev - 1) * 100 : null;
        el.innerHTML = '<b>' + fmtP(x.price) + '</b><em class="' + segno(ch) + '">' + (ch != null ? pm(ch) + '%' : '') + '</em>';
      });
    });
  }
  function cerca(val) {
    $('#lista').innerHTML = '<div class="vuoto">Ricerca in corso…</div>';
    D.cerca(val).then(function (r) {
      if (($('#q') || {}).value !== val) return;
      r.forEach(function (s) { if (!S.info[s.id]) S.info[s.id] = { id: s.id, s: s.s, n: s.n, t: s.t, x: s.x, c: s.c, m: MULT[s.s] || 1 }; });
      if (!r.length) { $('#lista').innerHTML = '<div class="vuoto">Nessun risultato. Prova con il ticker (es. ENI.MI, AAPL, BTCUSDT, EURUSD=X) oppure controlla la connessione ai dati nelle Impostazioni.</div>'; return; }
      renderLista(r.map(function (s) { return strumento(s.id); }), true);
      aggiornaQuote(r.slice(0, 20).map(function (s) { return s.id; }));
    });
  }
  function stella(id) {
    var i = S.watch.findIndex(function (w) { return w.id === id; });
    if (i >= 0) S.watch.splice(i, 1); else S.watch.push({ id: id });
    M.salva();
    return i < 0;
  }

  /* =========================================================
     GRAFICO + TICKET
     ========================================================= */
  var pollT = null;
  function viewGrafico(v) {
    var s = strumento(ui.sid), fav = S.watch.some(function (w) { return w.id === s.id; });
    v.innerHTML =
      '<div class="g-head"><div class="g-title"><div class="g-sym">' + esc(s.s.replace(/^\^/, '')) + ' <span class="badge b-' + D.parseId(s.id).p + '">' + PROV[D.parseId(s.id).p] + '</span></div><div class="g-name" id="g-name">' + esc(s.n) + '</div></div>' +
      '<div class="g-price"><b id="g-px">–</b><em id="g-ch"></em></div>' +
      '<button class="icon-btn star ' + (fav ? 'on' : '') + '" id="g-star" aria-label="Preferito">' + ICON.stella + '</button><button class="icon-btn" id="g-info" aria-label="Dettagli strumento">' + ICON.info + '</button></div>' +
      '<div class="tf-row"><div class="chips sm">' + D.TF_LIST.map(function (t) { return '<button class="chip ' + (ui.tf === t ? 'on' : '') + '" data-tf="' + t + '">' + t + '</button>'; }).join('') + '</div>' +
      '<button class="chip" id="g-ind">Indicatori</button><button class="chip" id="g-line" title="Disegna una linea orizzontale">─ Linea</button></div>' +
      '<div class="chart-wrap"><div id="chart" class="chart"></div><div class="legend" id="legend"></div><div class="pick-hint" id="pick-hint"></div><div class="chart-msg" id="chart-msg">Caricamento…</div></div>' +
      '<div class="seg g-tabs"><button data-pan="ordine">Nuovo ordine</button><button data-pan="pos">Posizioni <span id="n-pos"></span></button><button data-pan="ord">In attesa <span id="n-ord"></span></button></div>' +
      '<div id="g-panel" class="pad"></div>';
    ui.gr = new SB.Grafico($('#chart'), {
      ind: ui.ind,
      onLegend: function (d) {
        var el = $('#legend');
        if (!d || d.open == null) { el.textContent = ''; return; }
        el.innerHTML = 'A <b>' + fmtP(d.open) + '</b> M <b>' + fmtP(d.high) + '</b> m <b>' + fmtP(d.low) + '</b> C <b>' + fmtP(d.close) + '</b>';
      }
    });
    if (ui.tipoGr && ui.tipoGr !== 'candele') ui.gr.setTipo(ui.tipoGr);
    ui.ticket = ui.ticket && ui.ticket.sid === ui.sid ? ui.ticket : nuovoTicket();
    setPannello(ui.pannello);
    caricaGrafico();
  }

  function caricaGrafico() {
    var sid = ui.sid, tf = ui.tf;
    $('#chart-msg').textContent = 'Caricamento…'; $('#chart-msg').style.display = '';
    clearInterval(pollT);
    D.grafico(sid, tf).then(function (r) {
      if (!ui.gr || ui.sid !== sid || ui.tf !== tf) return;
      var info = M.setInfo(sid, Object.assign({ m: M.info(sid).m || MULT[D.parseId(sid).s] || 1 }, r.meta));
      $('#g-name').textContent = info.n + (info.x ? ' · ' + info.x : '') + ' · ' + info.c;
      if (!r.candles.length) throw new Error('Nessun dato per questo intervallo');
      ui.gr.set(r.candles, M.decimali(r.price || r.candles[r.candles.length - 1].close));
      $('#chart-msg').style.display = 'none';
      ui.prev = r.candles.length > 1 ? r.candles[r.candles.length - 2].close : null;
      var prevDay = null;
      if (tf === '1D') prevDay = ui.prev;
      ui.prevDay = prevDay || (ui.quote[sid] && ui.quote[sid].prev) || null;
      if (!ui.prevDay) D.quotazioni([sid]).then(function (q) { if (q[sid] && q[sid].prev && ui.sid === sid) { ui.prevDay = q[sid].prev; nuovoPrezzo(ui.prezzo, true); } });
      return D.cambio(info.c, M.conto().valuta).then(function (fx) { ui.fx = fx; }).catch(function () { ui.fx = 1; toast('Cambio ' + info.c + ' non disponibile: uso 1', 'warn'); })
        .then(function () { nuovoPrezzo(r.price != null ? r.price : r.candles[r.candles.length - 1].close, true); disegnaLinee(); markers(); });
    }).catch(function (e) {
      if (!ui.gr) return;
      $('#chart-msg').innerHTML = 'Dati non disponibili: ' + esc(e.message) + '<br><small>Prova un altro intervallo, oppure verifica la connessione dati nelle Impostazioni.</small>';
    });
    var per = D.parseId(sid).p === 'B' || D.parseId(sid).p === 'D' ? 4 : Math.max(10, +S.imp.dati.refresh || 15);
    pollT = setInterval(function () {
      if (document.hidden || !ui.gr || ui.sid !== sid) return;
      D.prezzo(sid).then(function (p) { if (ui.gr && ui.sid === sid) nuovoPrezzo(p); }).catch(function () {});
    }, per * 1000);
  }

  function nuovoPrezzo(p, primo) {
    if (p == null || isNaN(p)) return;
    var old = ui.prezzo;
    ui.prezzo = p;
    ui.quote[ui.sid] = { price: p, prev: ui.prevDay || (ui.quote[ui.sid] && ui.quote[ui.sid].prev) };
    if (!primo) ui.gr.tick(p, M.now(), D.TF[ui.tf].sec);
    var el = $('#g-px');
    if (el) {
      el.textContent = fmtP(p);
      if (old != null && p !== old) { el.classList.remove('fl-up', 'fl-dn'); void el.offsetWidth; el.classList.add(p > old ? 'fl-up' : 'fl-dn'); }
      var pr = ui.quote[ui.sid].prev, ch = pr ? (p / pr - 1) * 100 : null;
      $('#g-ch').className = segno(ch); $('#g-ch').textContent = ch != null ? pm(ch) + '%' : '';
    }
    // il motore controlla ordini e stop su ogni prezzo nuovo
    var ev = 0;
    Object.keys(S.conti).forEach(function (k) { ev += M.processa(S.conti[k], ui.sid, [{ time: M.now(), open: p, high: p, low: p, close: p }], ui.fx); });
    if (ev) { disegnaLinee(); markers(); renderHeader(); }
    aggiornaPannello();
  }

  function disegnaLinee() {
    if (!ui.gr) return;
    var c = M.conto(), L = [], sid = ui.sid;
    c.posizioni.forEach(function (p) {
      if (p.str.id !== sid) return;
      var nome = (p.lato === 'buy' ? 'Long ' : 'Short ') + p.qta;
      L.push({ id: 'pe' + p.id, prezzo: p.entrata, colore: '#5b8cff', titolo: nome, stile: 0, spessore: 1 });
      var addSL = function (campo, colore, tit) {
        L.push({ id: campo + p.id, prezzo: p[campo], colore: colore, titolo: tit, etichetta: tit, drag: function (np) {
          var o = {}; o[campo] = np;
          var e = M.modificaPos(p.id, o);
          if (e) { toast(e, 'err'); return false; }
          toast(tit + ' spostato a ' + fmtP(np)); aggiornaPannello(); return true;
        } });
      };
      if (p.sl != null) addSL('sl', '#ff5d6c', 'SL');
      if (p.tp != null) addSL('tp', '#22c38e', 'TP');
      if (p.trail) {
        var ts = p.lato === 'buy' ? p.best * (1 - p.trail / 100) : p.best * (1 + p.trail / 100);
        L.push({ id: 'tr' + p.id, prezzo: ts, colore: '#ff9f43', titolo: 'Trailing ' + fmt(p.trail, 1) + '%', stile: 1, spessore: 1 });
      }
    });
    c.ordini.forEach(function (o) {
      if (o.str.id !== sid) return;
      var tit = (o.lato === 'buy' ? 'Buy ' : 'Sell ') + (o.tipo === 'limit' ? 'limit' : 'stop') + ' ' + o.qta;
      L.push({ id: 'o' + o.id, prezzo: o.prezzo, colore: '#f5b942', titolo: tit, etichetta: 'Ordine', drag: function (np) {
        var e = M.modificaOrd(o.id, { prezzo: np });
        if (e) { toast(e, 'err'); return false; }
        toast('Ordine spostato a ' + fmtP(np)); aggiornaPannello(); return true;
      } });
      ['sl', 'tp'].forEach(function (k) {
        if (o[k] == null) return;
        L.push({ id: 'o' + k + o.id, prezzo: o[k], colore: k === 'sl' ? 'rgba(255,93,108,.7)' : 'rgba(34,195,142,.7)', titolo: k.toUpperCase() + ' ordine', etichetta: k.toUpperCase(), drag: function (np) {
          var x = {}; x[k] = np; var e = M.modificaOrd(o.id, x);
          if (e) { toast(e, 'err'); return false; } aggiornaPannello(); return true;
        } });
      });
    });
    // anteprima del ticket
    var t = ui.ticket;
    if (t && ui.pannello === 'ordine') {
      var live = function (campo) { return function (np) { t[campo] = np; var inp = $('#t-' + campo); if (inp) inp.value = arrot(np); aggiornaRiepilogo(); }; };
      var fine = function (campo) { return function (np) { t[campo] = np; var inp = $('#t-' + campo); if (inp) inp.value = arrot(np); aggiornaRiepilogo(); return true; }; };
      if (t.tipo !== 'market' && t.prezzo) L.push({ id: 'tk-p', prezzo: t.prezzo, colore: '#f5b942', titolo: 'Entrata', etichetta: 'Entrata', live: live('prezzo'), drag: fine('prezzo') });
      if (t.sl) L.push({ id: 'tk-sl', prezzo: t.sl, colore: '#ff5d6c', titolo: 'Stop loss', etichetta: 'SL', live: live('sl'), drag: fine('sl') });
      if (t.tp) L.push({ id: 'tk-tp', prezzo: t.tp, colore: '#22c38e', titolo: 'Take profit', etichetta: 'TP', live: live('tp'), drag: fine('tp') });
    }
    (S.linee[sid] || []).forEach(function (pz, i) {
      L.push({ id: 'ln' + i, prezzo: pz, colore: '#9aa6c0', titolo: '', etichetta: '✕', stile: 0, spessore: 1, drag: function (np) { S.linee[sid][i] = np; M.salva(); return true; },
        tap: function () { S.linee[sid].splice(i, 1); M.salva(); disegnaLinee(); } });
    });
    L.forEach(function (x) { if (x.id.indexOf('ln') !== 0) x.scala = true; });
    ui.gr.linee_(L);
    $('#n-pos') && ($('#n-pos').textContent = c.posizioni.filter(function (p) { return p.str.id === sid; }).length || '');
    $('#n-ord') && ($('#n-ord').textContent = c.ordini.filter(function (o) { return o.str.id === sid; }).length || '');
  }
  function arrot(p) { var d = M.decimali(p); return Math.round(p * Math.pow(10, d)) / Math.pow(10, d); }

  function markers() {
    if (!ui.gr) return;
    var c = M.conto(), m = [];
    c.chiusi.forEach(function (t) {
      if (t.str.id !== ui.sid) return;
      m.push({ time: Math.floor(t.aperto), position: t.lato === 'buy' ? 'belowBar' : 'aboveBar', color: '#5b8cff', shape: t.lato === 'buy' ? 'arrowUp' : 'arrowDown', text: t.lato === 'buy' ? 'B' : 'S' });
      m.push({ time: Math.floor(t.chiuso), position: t.lato === 'buy' ? 'aboveBar' : 'belowBar', color: t.netto >= 0 ? '#22c38e' : '#ff5d6c', shape: 'circle', text: (t.netto >= 0 ? '+' : '') + fmt(t.netto, 0) });
    });
    c.posizioni.forEach(function (p) {
      if (p.str.id !== ui.sid) return;
      m.push({ time: Math.floor(p.aperto), position: p.lato === 'buy' ? 'belowBar' : 'aboveBar', color: '#5b8cff', shape: p.lato === 'buy' ? 'arrowUp' : 'arrowDown', text: p.lato === 'buy' ? 'B' : 'S' });
    });
    ui.gr.markers(m);
  }

  function setPannello(p) {
    ui.pannello = p;
    $$('.g-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.pan === p); });
    aggiornaPannello(true);
    disegnaLinee();
  }
  function aggiornaPannello(full) {
    var el = $('#g-panel');
    if (!el) return;
    if (ui.pannello === 'ordine') { if (full || !$('#ticket')) renderTicket(el); else aggiornaRiepilogo(); return; }
    if (ui.pannello === 'pos') el.innerHTML = listaPosizioni(M.conto().posizioni.filter(function (p) { return p.str.id === ui.sid; }), true);
    if (ui.pannello === 'ord') el.innerHTML = listaOrdini(M.conto().ordini.filter(function (o) { return o.str.id === ui.sid; }));
  }

  /* ---------- Ticket ordine ---------- */
  function nuovoTicket() { return { sid: ui.sid, lato: 'buy', tipo: 'market', modo: 'importo', val: 1000, prezzo: null, sl: null, tp: null, trail: null, leva: 1, scad: 'gtc' }; }

  function renderTicket(el) {
    var t = ui.ticket, s = strumento(ui.sid), c = M.conto();
    var seg = function (name, opts, cur) { return '<div class="seg" data-seg="' + name + '">' + opts.map(function (o) { return '<button class="' + (cur === o[0] ? 'on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
    var unit = s.t === 'forex' ? 'unità' : s.t === 'futures' || s.t === 'indice' ? 'contratti' : s.t === 'cripto' ? s.s.replace(/(USDT|USDC|EUR|USD|BTC)$/, '') : 'pezzi';
    el.innerHTML = '<div id="ticket" class="ticket">' +
      seg('lato', [['buy', 'Compra · Long'], ['sell', 'Vendi · Short']], t.lato) +
      seg('tipo', [['market', 'Mercato'], ['limit', 'Limite'], ['stop', 'Stop']], t.tipo) +
      (t.tipo !== 'market' ? campo('prezzo', 'Prezzo ' + (t.tipo === 'limit' ? 'limite' : 'stop'), t.prezzo, true) : '') +
      '<div class="lbl">Dimensione</div>' + seg('modo', [['qta', 'Quantità'], ['importo', 'Importo ' + c.valuta], ['rischio', 'Rischio %']], t.modo) +
      '<div class="fld"><input id="t-val" type="number" inputmode="decimal" step="any" value="' + (t.val != null ? t.val : '') + '"><span class="suf">' + (t.modo === 'qta' ? esc(unit) : t.modo === 'importo' ? c.valuta : '% del capitale') + '</span></div>' +
      '<div class="hint" id="t-qta-h"></div>' +
      '<div class="grid2">' + campo('sl', 'Stop loss', t.sl, true) + campo('tp', 'Take profit', t.tp, true) + '</div>' +
      '<div class="chips sm" id="t-quick"><button class="chip" data-q="sl1">SL −1%</button><button class="chip" data-q="sl2">SL −2%</button><button class="chip" data-q="sl5">SL −5%</button><button class="chip" data-q="rr1">TP 1:1</button><button class="chip" data-q="rr2">TP 1:2</button><button class="chip" data-q="rr3">TP 1:3</button><button class="chip" data-q="clr">Togli SL/TP</button></div>' +
      '<div class="grid2"><div><div class="lbl">Trailing stop %</div><div class="fld"><input id="t-trail" type="number" inputmode="decimal" step="any" placeholder="no" value="' + (t.trail || '') + '"><span class="suf">%</span></div></div>' +
      '<div><div class="lbl">Leva</div><select id="t-leva" class="sel">' + [1, 2, 3, 5, 10, 20, 30, 50, 100].map(function (l) { return '<option value="' + l + '"' + (+t.leva === l ? ' selected' : '') + '>' + (l === 1 ? 'Nessuna (1:1)' : '1:' + l) + '</option>'; }).join('') + '</select></div></div>' +
      (t.tipo !== 'market' ? '<div class="lbl">Validità</div>' + seg('scad', [['gtc', 'Fino a revoca'], ['day', 'Solo oggi']], t.scad) : '') +
      '<div class="riep" id="t-riep"></div>' +
      '<button class="btn big ' + (t.lato === 'buy' ? 'buy' : 'sell') + '" id="t-invia">' + (t.lato === 'buy' ? 'Compra' : 'Vendi') + '</button>' +
      '<p class="nota">Tocca 📍 e poi un punto del grafico per fissare entrata, stop o target. Le linee sul grafico si possono trascinare con la maniglia.</p></div>';
    aggiornaRiepilogo();
  }
  function campo(id, label, val, pin) {
    return '<div><div class="lbl">' + label + '</div><div class="fld"><input id="t-' + id + '" type="number" inputmode="decimal" step="any" placeholder="' + (id === 'prezzo' ? 'prezzo' : 'facoltativo') + '" value="' + (val != null ? arrot(val) : '') + '">' +
      (pin ? '<button class="pin" data-pin="' + id + '" aria-label="Scegli sul grafico">' + ICON.pin + '</button>' : '') + '</div><div class="hint" id="h-' + id + '"></div></div>';
  }

  function calcola() {
    var t = ui.ticket, s = strumento(ui.sid), c = M.conto(), r = M.riepilogo(c);
    var ref = t.tipo === 'market' ? ui.prezzo : t.prezzo;
    var out = { s: s, ref: ref, qta: 0 };
    if (!ref) return out;
    var fx = ui.fx || 1, m = s.m || 1, leva = +t.leva || 1;
    var px = M.prezzoEseguito(c, s, ref, t.lato, t.tipo !== 'limit');
    var q = 0;
    if (t.modo === 'qta') q = +t.val || 0;
    else if (t.modo === 'importo') q = (+t.val || 0) * leva / (px * m * fx);
    else if (t.modo === 'rischio') {
      if (t.sl) q = r.equity * (+t.val || 0) / 100 / (Math.abs(px - t.sl) * m * fx);
      else out.serveSL = true;
    }
    var intero = s.t === 'azione' || s.t === 'etf' || s.t === 'fondo' || s.t === 'futures' || (s.t === 'indice' && m > 1);
    q = intero ? Math.floor(q + 1e-9) : Math.floor(q * 1e6) / 1e6;
    out.qta = q; out.px = px;
    var noz = M.nozionale(s, q, px, fx);
    out.noz = noz; out.margine = noz / leva;
    out.commIn = q ? M.commissione(c, s, noz) : 0;
    out.tobin = c.costi.tobin && M.italiana(s) && t.lato === 'buy' ? noz * 0.001 : 0;
    var dir = t.lato === 'buy' ? 1 : -1, uscitaLato = t.lato === 'buy' ? 'sell' : 'buy';
    if (t.sl) {
      var pxSl = M.prezzoEseguito(c, s, t.sl, uscitaLato, true);
      var nSl = M.nozionale(s, q, pxSl, fx);
      out.perdita = dir * (pxSl - px) * q * m * fx - out.commIn - M.commissione(c, s, nSl);
    }
    if (t.tp) {
      var pxTp = M.prezzoEseguito(c, s, t.tp, uscitaLato, false);
      var nTp = M.nozionale(s, q, pxTp, fx);
      var lordo = dir * (pxTp - px) * q * m * fx - out.commIn - M.commissione(c, s, nTp);
      var cl = M.classeFiscale(s), f = c.fisco, aliq = f.regime === 'nessuno' ? 0 : cl === 'cripto' ? f.aliquotaCripto : cl === 'stato' ? f.aliquotaStato : f.aliquota;
      var zain = cl === 'capitale' || !f.zainetto ? 0 : r.zainetto;
      out.guadagno = lordo;
      out.imposta = Math.max(0, lordo - zain) * aliq / 100;
      out.guadagnoNetto = lordo - out.imposta;
    }
    if (out.perdita != null && out.guadagno != null && out.perdita < 0) out.rr = out.guadagno / -out.perdita;
    out.disp = r.disponibile; out.equity = r.equity;
    return out;
  }
  function aggiornaRiepilogo() {
    var el = $('#t-riep');
    if (!el) return;
    var t = ui.ticket, x = calcola(), c = M.conto(), v = c.valuta;
    var dir = t.lato === 'buy' ? 1 : -1;
    $('#t-qta-h').innerHTML = x.serveSL ? '<span class="neg">Per dimensionare sul rischio imposta prima lo stop loss</span>' : (x.qta ? 'Quantità: <b>' + fmt(x.qta, x.qta % 1 ? 6 : 0).replace(/,?0+$/, '') + '</b>' + (x.s.m > 1 ? ' · moltiplicatore ' + x.s.m : '') : '');
    var dist = function (p) { return x.ref && p ? pm((p / x.ref - 1) * 100) + '%' : ''; };
    var hs = $('#h-sl'), ht = $('#h-tp'), hp = $('#h-prezzo');
    if (hs) hs.textContent = t.sl ? dist(t.sl) : '';
    if (ht) ht.textContent = t.tp ? dist(t.tp) : '';
    if (hp) hp.textContent = t.prezzo && ui.prezzo ? 'attuale ' + fmtP(ui.prezzo) + ' · ' + pm((t.prezzo / ui.prezzo - 1) * 100) + '%' : '';
    if (!x.ref) { el.innerHTML = '<div class="muted">' + (t.tipo === 'market' ? 'In attesa del prezzo…' : 'Indica il prezzo dell\'ordine') + '</div>'; return; }
    var riga = function (k, val, cls) { return '<div><span>' + k + '</span><b class="' + (cls || '') + '">' + val + '</b></div>'; };
    var err = M.valida({ lato: t.lato, tipo: t.tipo, qta: x.qta || 1, prezzo: t.prezzo, sl: t.sl, tp: t.tp, trail: t.trail }, ui.prezzo);
    el.innerHTML =
      riga('Prezzo stimato (con spread)', fmtP(x.px) + ' ' + x.s.c) +
      riga('Controvalore', fmt(x.noz) + ' ' + v) +
      (+t.leva > 1 ? riga('Margine richiesto', fmt(x.margine) + ' ' + v) : '') +
      riga('Commissione apertura', fmt(x.commIn) + ' ' + v) +
      (x.tobin ? riga('Tobin tax (se non chiudi in giornata)', fmt(x.tobin) + ' ' + v) : '') +
      (x.perdita != null ? riga('Perdita allo stop (comm. incluse)', fmt(x.perdita) + ' ' + v + ' · ' + fmt(x.perdita / x.equity * 100) + '%', 'neg') : '') +
      (x.guadagno != null ? riga('Utile al target (netto comm.)', pm(x.guadagno) + ' ' + v, 'pos') + riga('Imposte stimate · utile netto', fmt(x.imposta) + ' · ' + pm(x.guadagnoNetto) + ' ' + v, 'pos') : '') +
      (x.rr ? riga('Rapporto rischio/rendimento', '1 : ' + fmt(x.rr, 2)) : '') +
      riga('Liquidità disponibile', fmt(x.disp) + ' ' + v) +
      (err ? '<p class="neg small">' + esc(err) + '</p>' : '') +
      (x.margine + x.commIn > x.disp ? '<p class="neg small">Liquidità insufficiente per questo ordine</p>' : '');
    var b = $('#t-invia');
    b.textContent = (t.lato === 'buy' ? 'Compra ' : 'Vendi ') + (x.qta ? fmt(x.qta, x.qta % 1 ? 4 : 0) + ' ' : '') + x.s.s.replace(/^\^/, '') + (t.tipo === 'market' ? ' a mercato' : t.tipo === 'limit' ? ' (limite)' : ' (stop)');
    b.disabled = !x.qta || !!err;
    void dir;
  }

  function inviaOrdine() {
    var t = ui.ticket, x = calcola();
    if (!x.qta) return toast('Quantità non valida', 'err');
    var s = x.s;
    var o = { str: s, lato: t.lato, tipo: t.tipo, qta: x.qta, prezzo: t.tipo === 'market' ? null : t.prezzo, sl: t.sl || null, tp: t.tp || null, trail: t.trail || null, leva: +t.leva || 1, scad: t.scad };
    var go = function () {
      var r = M.invia(o, ui.prezzo, ui.fx);
      if (r.errore) return toast(r.errore, 'err');
      var cc = M.conto();
      if (!cc.ultimoControllo[s.id]) cc.ultimoControllo[s.id] = M.now();
      if (navigator.vibrate) navigator.vibrate(30);
      ui.ticket = Object.assign(nuovoTicket(), { lato: t.lato, modo: t.modo, val: t.val, leva: t.leva });
      ui.pannello = r.pos ? 'pos' : 'ord';
      setPannello(ui.pannello); markers(); renderHeader();
    };
    if (t.tipo === 'market') {
      D.prezzo(ui.sid).then(function (p) { nuovoPrezzo(p); go(); }).catch(go);
    } else go();
  }

  function scegliDalGrafico(campo) {
    var nomi = { prezzo: 'il prezzo di entrata', sl: 'lo stop loss', tp: 'il take profit' };
    var hint = $('#pick-hint');
    hint.innerHTML = 'Tocca il grafico per ' + nomi[campo] + ' <button data-act="pick-off">Annulla</button>';
    hint.classList.add('on');
    $('.chart-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    ui.gr.scegliPrezzo(function (p) {
      hint.classList.remove('on');
      p = arrot(p);
      ui.ticket[campo] = p;
      if (campo === 'prezzo' && ui.ticket.tipo !== 'market' && ui.prezzo) {
        // sceglie da solo limite o stop in base alla posizione del prezzo
        var sopra = p > ui.prezzo, buy = ui.ticket.lato === 'buy';
        ui.ticket.tipo = (buy ? sopra : !sopra) ? 'stop' : 'limit';
      }
      renderTicket($('#g-panel')); disegnaLinee();
      setTimeout(function () { var i = $('#t-' + campo); if (i) i.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
    });
  }

  function disegnaLinea() {
    var hint = $('#pick-hint');
    hint.innerHTML = 'Tocca il grafico per disegnare una linea orizzontale <button data-act="pick-off">Annulla</button>';
    hint.classList.add('on');
    ui.gr.scegliPrezzo(function (p) {
      hint.classList.remove('on');
      (S.linee[ui.sid] = S.linee[ui.sid] || []).push(arrot(p));
      M.salva(); disegnaLinee();
      toast('Linea aggiunta: trascinala con la maniglia, toccala per eliminarla');
    });
  }

  function sheetIndicatori() {
    var I = ui.gr.ind, tipo = ui.gr.tipo;
    var opt = [['volume', 'Volumi'], ['sma20', 'Media mobile 20'], ['sma50', 'Media mobile 50'], ['ema20', 'Media esponenziale 20'], ['bb', 'Bande di Bollinger'], ['rsi', 'RSI 14']];
    sheet('<h3>Grafico</h3><div class="seg" data-seg="gtipo">' + [['candele', 'Candele'], ['linea', 'Linea'], ['area', 'Area']].map(function (o) { return '<button class="' + (tipo === o[0] ? 'on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="lista-check">' + opt.map(function (o) { return '<label class="sw"><input type="checkbox" data-ind="' + o[0] + '"' + (I[o[0]] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div><button class="btn" data-close>Fatto</button>',
      function (el) {
        el.addEventListener('change', function (e) { var k = e.target.dataset.ind; if (!k) return; var o = {}; o[k] = e.target.checked; ui.gr.setInd(o); salvaUi(); });
        el.addEventListener('click', function (e) {
          var b = e.target.closest('[data-seg="gtipo"] button'); if (!b) return;
          $$('[data-seg="gtipo"] button', el).forEach(function (x) { x.classList.toggle('on', x === b); });
          ui.gr.setTipo(b.dataset.v); markers(); salvaUi();
        });
      });
  }

  function sheetStrumento() {
    var s = strumento(ui.sid), i = M.info(ui.sid);
    var fc = M.classeFiscale(s);
    sheet('<h3>' + esc(s.n) + '</h3><p class="muted">' + esc(s.s) + ' · ' + esc(PROV[D.parseId(s.id).p]) + ' · ' + esc(s.x) + '</p>' +
      '<div class="lbl">Tipo di strumento</div><select id="si-t" class="sel">' + Object.keys(TIPI).map(function (k) { return '<option value="' + k + '"' + (s.t === k ? ' selected' : '') + '>' + TIPI[k] + '</option>'; }).join('') + '</select>' +
      '<div class="grid2"><div><div class="lbl">Valuta</div><input id="si-c" class="inp" value="' + esc(s.c) + '"></div><div><div class="lbl">Moltiplicatore contratto</div><input id="si-m" class="inp" type="number" inputmode="decimal" value="' + s.m + '"></div></div>' +
      '<div class="lbl">Classe fiscale</div><select id="si-f" class="sel">' +
      [['diverso', 'Reddito diverso (azioni, derivati, ETC): compensa le minus'], ['capitale', 'Reddito di capitale (ETF, fondi): non compensa'], ['stato', 'Titoli di Stato (12,5%)'], ['cripto', 'Cripto-attività']].map(function (o) { return '<option value="' + o[0] + '"' + (fc === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<p class="nota">Il moltiplicatore serve per futures e contratti (es. ES=F vale 50 $ a punto). Per azioni, ETF, forex e cripto lascia 1.</p>' +
      '<div class="row-btn"><button class="btn ghost" data-close>Chiudi</button><button class="btn" id="si-ok">Salva</button></div>', function (el, close) {
      $('#si-ok', el).onclick = function () {
        i.t = $('#si-t', el).value; i.c = $('#si-c', el).value.trim().toUpperCase() || s.c; i.m = +$('#si-m', el).value || 1;
        var f = $('#si-f', el).value; i.fisc = f;
        S.info[ui.sid] = i; M.salva(); close();
        D.cambio(i.c, M.conto().valuta).then(function (fx) { ui.fx = fx; aggiornaPannello(true); });
        toast('Dettagli salvati');
      };
    });
  }

  /* =========================================================
     POSIZIONI E ORDINI
     ========================================================= */
  function listaPosizioni(arr, compatta) {
    var c = M.conto();
    M.riepilogo(c);
    if (!arr.length) return '<div class="vuoto">Nessuna posizione aperta' + (compatta ? ' su questo strumento' : '') + '.</div>';
    return arr.map(function (p) {
      var px = p.ultimo || p.entrata, ch = (px / p.entrata - 1) * 100 * (p.lato === 'buy' ? 1 : -1);
      return '<div class="card poscard">' +
        '<div class="pos-top"' + (compatta ? '' : ' data-open="' + esc(p.str.id) + '"') + '><div><span class="side ' + p.lato + '">' + (p.lato === 'buy' ? 'LONG' : 'SHORT') + '</span> <b>' + esc(p.str.s.replace(/^\^/, '')) + '</b>' + (p.leva > 1 ? ' <span class="badge">1:' + p.leva + '</span>' : '') + '<div class="muted small">' + fmt(p.qta, p.qta % 1 ? 4 : 0) + ' @ ' + fmtP(p.entrata) + ' → ' + fmtP(px) + ' ' + esc(p.str.c) + '</div></div>' +
        '<div class="right"><b class="' + segno(p.upnl) + '">' + pm(p.upnl) + ' ' + c.valuta + '</b><div class="small ' + segno(ch) + '">' + pm(ch) + '%</div></div></div>' +
        '<div class="pos-mid small"><span>SL <b class="neg">' + (p.sl != null ? fmtP(p.sl) : '–') + '</b></span><span>TP <b class="pos">' + (p.tp != null ? fmtP(p.tp) : '–') + '</b></span><span>Trail <b>' + (p.trail ? fmt(p.trail, 1) + '%' : '–') + '</b></span><span class="muted">' + data(p.aperto) + '</span></div>' +
        '<div class="row-btn sm"><button class="btn ghost" data-mod="' + p.id + '">Modifica SL/TP</button><button class="btn danger-soft" data-chiudi="' + p.id + '">Chiudi</button></div></div>';
    }).join('');
  }
  function listaOrdini(arr) {
    if (!arr.length) return '<div class="vuoto">Nessun ordine in attesa.</div>';
    return arr.map(function (o) {
      return '<div class="card"><div class="pos-top"><div><span class="side ' + o.lato + '">' + (o.lato === 'buy' ? 'BUY' : 'SELL') + ' ' + (o.tipo === 'limit' ? 'LIMIT' : o.tipo === 'stop' ? 'STOP' : 'MKT') + '</span> <b>' + esc(o.str.s) + '</b><div class="muted small">' + fmt(o.qta, o.qta % 1 ? 4 : 0) + ' @ ' + fmtP(o.prezzo) + (o.leva > 1 ? ' · leva 1:' + o.leva : '') + ' · ' + (o.scad === 'day' ? 'solo oggi' : 'fino a revoca') + '</div></div>' +
        '<div class="right small">SL ' + (o.sl ? fmtP(o.sl) : '–') + '<br>TP ' + (o.tp ? fmtP(o.tp) : '–') + (o.trail ? '<br>Trail ' + o.trail + '%' : '') + '</div></div>' +
        '<div class="row-btn sm"><button class="btn ghost" data-modord="' + o.id + '">Modifica</button><button class="btn danger-soft" data-annulla="' + o.id + '">Annulla</button></div></div>';
    }).join('');
  }

  function sheetModifica(posId) {
    var p = M.conto().posizioni.find(function (x) { return x.id === posId; });
    if (!p) return;
    sheet('<h3>Modifica ' + esc(p.str.s) + '</h3><p class="muted">Prezzo attuale ' + fmtP(p.ultimo || p.entrata) + ' · entrata ' + fmtP(p.entrata) + '</p>' +
      '<div class="grid2"><div><div class="lbl">Stop loss</div><input id="m-sl" class="inp" type="number" step="any" inputmode="decimal" value="' + (p.sl != null ? arrot(p.sl) : '') + '"></div><div><div class="lbl">Take profit</div><input id="m-tp" class="inp" type="number" step="any" inputmode="decimal" value="' + (p.tp != null ? arrot(p.tp) : '') + '"></div></div>' +
      '<div class="lbl">Trailing stop %</div><input id="m-tr" class="inp" type="number" step="any" inputmode="decimal" value="' + (p.trail || '') + '">' +
      '<div class="chips sm"><button class="chip" id="m-be">Stop a pareggio</button></div>' +
      '<div class="row-btn"><button class="btn ghost" data-close>Annulla</button><button class="btn" id="m-ok">Salva</button></div>', function (el, close) {
      $('#m-be', el).onclick = function () { $('#m-sl', el).value = arrot(p.entrata); };
      $('#m-ok', el).onclick = function () {
        var e = M.modificaPos(posId, { sl: $('#m-sl', el).value === '' ? '' : +$('#m-sl', el).value, tp: $('#m-tp', el).value === '' ? '' : +$('#m-tp', el).value, trail: $('#m-tr', el).value === '' ? '' : +$('#m-tr', el).value });
        if (e) return toast(e, 'err');
        close(); toast('Posizione aggiornata'); refresh();
      };
    });
  }
  function sheetModOrd(id) {
    var o = M.conto().ordini.find(function (x) { return x.id === id; });
    if (!o) return;
    sheet('<h3>Ordine ' + esc(o.str.s) + '</h3>' +
      '<div class="grid2"><div><div class="lbl">Prezzo</div><input id="o-p" class="inp" type="number" step="any" value="' + arrot(o.prezzo) + '"></div><div><div class="lbl">Quantità</div><input id="o-q" class="inp" type="number" step="any" value="' + o.qta + '"></div></div>' +
      '<div class="grid2"><div><div class="lbl">Stop loss</div><input id="o-sl" class="inp" type="number" step="any" value="' + (o.sl ? arrot(o.sl) : '') + '"></div><div><div class="lbl">Take profit</div><input id="o-tp" class="inp" type="number" step="any" value="' + (o.tp ? arrot(o.tp) : '') + '"></div></div>' +
      '<div class="row-btn"><button class="btn ghost" data-close>Annulla</button><button class="btn" id="o-ok">Salva</button></div>', function (el, close) {
      $('#o-ok', el).onclick = function () {
        var e = M.modificaOrd(id, { prezzo: +$('#o-p', el).value, qta: +$('#o-q', el).value, sl: +$('#o-sl', el).value || null, tp: +$('#o-tp', el).value || null });
        if (e) return toast(e, 'err');
        close(); toast('Ordine aggiornato'); refresh();
      };
    });
  }
  function sheetChiudi(posId) {
    var c = M.conto(), p = c.posizioni.find(function (x) { return x.id === posId; });
    if (!p) return;
    sheet('<h3>Chiudi ' + esc(p.str.s) + '</h3><p class="muted">' + (p.lato === 'buy' ? 'Long ' : 'Short ') + p.qta + ' @ ' + fmtP(p.entrata) + ' · P/L aperto <b class="' + segno(p.upnl) + '">' + pm(p.upnl) + ' ' + c.valuta + '</b></p>' +
      '<div class="lbl">Quantità da chiudere</div><input id="c-q" class="inp" type="number" step="any" inputmode="decimal" value="' + p.qta + '">' +
      '<div class="chips sm"><button class="chip" data-pct="25">25%</button><button class="chip" data-pct="50">50%</button><button class="chip" data-pct="100">Tutto</button></div>' +
      '<div class="row-btn"><button class="btn ghost" data-close>Annulla</button><button class="btn danger" id="c-ok">Chiudi a mercato</button></div>', function (el, close) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pct]'); if (!b) return;
        var q = p.qta * b.dataset.pct / 100, intero = p.qta % 1 === 0;
        $('#c-q', el).value = intero ? Math.max(1, Math.floor(q)) : +q.toFixed(6);
      });
      $('#c-ok', el).onclick = function () {
        var q = +$('#c-q', el).value;
        if (!(q > 0) || q > p.qta + 1e-9) return toast('Quantità non valida', 'err');
        var b = $('#c-ok', el); b.disabled = true; b.textContent = 'Recupero prezzo…';
        Promise.all([D.prezzo(p.str.id), D.cambio(p.str.c, c.valuta).catch(function () { return p.fxIn; })]).then(function (r) {
          var t = M.chiudi(c, posId, r[0], r[1], M.now(), 'manuale', q);
          M.salva(true); close();
          refresh();
        }).catch(function (e) { b.disabled = false; b.textContent = 'Chiudi a mercato'; toast('Prezzo non disponibile: ' + e.message, 'err'); });
      };
    });
  }

  /* =========================================================
     PORTAFOGLIO
     ========================================================= */
  function viewPortafoglio(v) {
    var c = M.conto(), r = M.riepilogo(c);
    var kpi = function (k, val, cls, sub) { return '<div class="kpi"><span>' + k + '</span><b class="' + (cls || '') + '">' + val + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>'; };
    v.innerHTML = '<div class="pad">' +
      '<div class="kpis">' + kpi('Patrimonio', fmt(r.equity) + ' ' + c.valuta, '', 'capitale iniziale ' + fmt(c.capitale)) +
      kpi('Rendimento', pm(r.rendimento) + '%', segno(r.rendimento), pm(r.equity - c.capitale) + ' ' + c.valuta) +
      kpi('Liquidità disponibile', fmt(r.disponibile)) + kpi('Margine impegnato', fmt(r.margine)) +
      kpi('P/L aperto', pm(r.upnl), segno(r.upnl)) + kpi('Realizzato netto', pm(r.realizzato), segno(r.realizzato)) +
      kpi('Commissioni pagate', fmt(r.commissioni)) + kpi(c.fisco.regime === 'dichiarativo' ? 'Imposte da versare (anno)' : 'Imposte trattenute', fmt(c.fisco.regime === 'dichiarativo' ? r.daVersare : r.imposte)) + '</div>' +
      '<div class="sec-h"><h3>Posizioni aperte</h3><button class="link" data-act="aggiorna-pos">Aggiorna prezzi</button></div>' +
      '<div id="pf-pos">' + listaPosizioni(c.posizioni) + '</div>' +
      '<h3>Ordini in attesa</h3><div id="pf-ord">' + listaOrdini(c.ordini) + '</div>' +
      '<details class="card"><summary>Storico ordini (' + (c.storicoOrdini || []).length + ')</summary>' + ((c.storicoOrdini || []).slice().reverse().slice(0, 60).map(function (o) {
        return '<div class="mov"><span>' + data(o.chiuso || o.creato) + '</span><span>' + (o.lato === 'buy' ? 'Buy ' : 'Sell ') + o.tipo + ' ' + esc(o.str.s) + ' ' + o.qta + '</span><b class="' + (o.stato === 'eseguito' ? 'pos' : 'muted') + '">' + esc(o.esito || o.stato) + '</b></div>';
      }).join('') || '<div class="vuoto">Nessuno</div>') + '</details>' +
      '<details class="card"><summary>Movimenti di cassa (' + c.movimenti.length + ')</summary>' + c.movimenti.slice().reverse().slice(0, 100).map(function (m) {
        return '<div class="mov"><span>' + data(m.t) + '</span><span>' + esc(m.desc) + '</span><b class="' + segno(m.importo) + '">' + pm(m.importo) + '</b></div>';
      }).join('') + '</details></div>';
  }

  /* =========================================================
     REPORT
     ========================================================= */
  function viewReport(v) {
    var c = M.conto(), st = M.statistiche(c), r = M.riepilogo(c), y = new Date().getFullYear();
    var kpi = function (k, val, cls) { return '<div class="kpi"><span>' + k + '</span><b class="' + (cls || '') + '">' + val + '</b></div>'; };
    var anni = {};
    c.chiusi.forEach(function (t) { var a = new Date(t.chiuso * 1000).getFullYear(); var x = anni[a] = anni[a] || { plus: 0, minus: 0, imposta: 0, comp: 0, netto: 0, lordo: 0 }; if (t.imponibile > 0) x.plus += t.imponibile; else x.minus += -t.imponibile; x.imposta += t.imposta; x.comp += t.zainettoUsato || 0; x.netto += t.netto; x.lordo += t.lordo; });
    var reg = { amministrato: 'Risparmio amministrato (il broker trattiene le imposte)', dichiarativo: 'Regime dichiarativo (imposte in dichiarazione)', nessuno: 'Nessuna imposta', personalizzato: 'Aliquota personalizzata' }[c.fisco.regime];
    v.innerHTML = '<div class="pad">' +
      '<div class="kpis">' + kpi('Operazioni chiuse', st.n) + kpi('% vincenti', fmt(st.winRate, 1) + '%') +
      kpi('Profit factor', st.profitFactor === Infinity ? '∞' : fmt(st.profitFactor)) + kpi('Max drawdown', fmt(st.maxDD, 1) + '%', st.maxDD ? 'neg' : '') +
      kpi('Media vincite', pm(st.mediaVinti), 'pos') + kpi('Media perdite', fmt(st.mediaPersi), 'neg') +
      kpi('Aspettativa / trade', pm(st.aspettativa), segno(st.aspettativa)) + kpi('Durata media', st.n ? durata(st.durataMedia) : '–') + '</div>' +
      '<div class="card"><h3>Curva del capitale</h3><div class="mini" id="eq"></div></div>' +
      '<div class="card"><h3>Risultato per mese</h3><div class="mini" id="mesi"></div></div>' +
      '<div class="card"><h3>Dal lordo al netto</h3><div class="waterfall">' +
      wf('Profitto lordo dei trade', st.lordo) + wf('Commissioni', -st.comm) + wf('Tobin tax', -st.tobin) + wf('Imposta di bollo (stima)', -st.bollo) + wf('Costi overnight', -st.overnight) + wf('Imposte', -st.imposte) +
      '<div class="wf tot"><span>Risultato netto</span><b class="' + segno(st.netto) + '">' + pm(st.netto) + ' ' + c.valuta + '</b></div></div>' +
      '<p class="nota">Costi totali: ' + fmt(st.comm + st.tobin + st.bollo + st.overnight) + ' ' + c.valuta + (st.lordo > 0 ? ' (' + fmt((st.comm + st.tobin + st.bollo + st.overnight) / st.lordo * 100, 1) + '% del lordo)' : '') + '</p></div>' +
      '<div class="card"><h3>Fisco</h3><p class="muted small">' + esc(reg) + ' · aliquota ' + c.fisco.aliquota + '% · cripto ' + c.fisco.aliquotaCripto + '% · titoli di Stato ' + c.fisco.aliquotaStato + '%</p>' +
      '<table class="tab"><tr><th>Anno</th><th>Plus</th><th>Minus</th><th>Compensate</th><th>Imposte</th></tr>' +
      (Object.keys(anni).sort().reverse().map(function (a) { var x = anni[a]; return '<tr><td>' + a + '</td><td class="pos">' + fmt(x.plus) + '</td><td class="neg">' + fmt(x.minus) + '</td><td>' + fmt(x.comp) + '</td><td>' + fmt(x.imposta) + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="muted">Nessun dato</td></tr>') + '</table>' +
      '<h4>Zainetto fiscale (minusvalenze da recuperare)</h4><table class="tab"><tr><th>Anno</th><th>Minus</th><th>Residuo</th><th>Scade</th></tr>' +
      ((c.zainetto || []).filter(function (z) { return z.residuo > 0; }).map(function (z) { var scad = z.anno + 4; return '<tr><td>' + z.anno + '</td><td>' + fmt(z.importo) + '</td><td>' + fmt(z.residuo) + '</td><td class="' + (scad < y ? 'muted' : '') + '">31/12/' + scad + (scad < y ? ' (scaduta)' : '') + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="muted">Vuoto</td></tr>') + '</table>' +
      '<p class="small">Disponibile oggi: <b>' + fmt(r.zainetto) + ' ' + c.valuta + '</b></p>' +
      '<p class="nota">Simulazione indicativa, non è consulenza fiscale. Le plusvalenze da ETF e fondi sono redditi di capitale: si tassano sempre e non usano lo zainetto, ma le loro minus ci entrano. Le minus scadono il 31/12 del quarto anno successivo. Commissioni e costi di finanziamento riducono l\'imponibile; Tobin e bollo no.</p></div>' +
      '<div class="card"><h3>Per strumento</h3><table class="tab"><tr><th>Strumento</th><th>Trade</th><th>% vinc.</th><th>Netto</th></tr>' +
      (st.perStr.map(function (x) { return '<tr><td>' + esc(x.s) + '</td><td>' + x.n + '</td><td>' + fmt(x.vinti / x.n * 100, 0) + '%</td><td class="' + segno(x.netto) + '">' + pm(x.netto) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="muted">Nessun dato</td></tr>') + '</table></div>' +
      '<div class="sec-h"><h3>Operazioni chiuse</h3><button class="link" data-act="csv">Esporta CSV</button></div>' +
      (c.chiusi.slice().reverse().map(function (t) {
        return '<details class="card trade"><summary><div><span class="side ' + t.lato + '">' + (t.lato === 'buy' ? 'L' : 'S') + '</span> <b>' + esc(t.str.s) + '</b> <span class="muted small">' + esc(M.nomeMotivo(t.motivo)) + '</span><div class="muted small">' + data(t.chiuso) + '</div></div><b class="' + segno(t.netto) + '">' + pm(t.netto) + '</b></summary>' +
          '<div class="det">' + [['Quantità', fmt(t.qta, t.qta % 1 ? 4 : 0) + (t.leva > 1 ? ' · leva 1:' + t.leva : '')], ['Entrata', fmtP(t.entrata) + ' ' + t.str.c + ' · ' + data(t.aperto)], ['Uscita', fmtP(t.uscita) + ' ' + t.str.c + ' · ' + data(t.chiuso)], ['Durata', durata(t.chiuso - t.aperto)],
            t.str.c !== c.valuta ? ['Cambio entrata/uscita', fmt(t.fxIn, 4) + ' / ' + fmt(t.fxOut, 4)] : null,
            ['P/L lordo', pm(t.lordo)], ['Commissioni', fmt(t.commIn + t.commOut)], t.tobin ? ['Tobin tax', fmt(t.tobin)] : null, t.bollo ? ['Bollo (stima)', fmt(t.bollo)] : null, t.overnight ? ['Overnight', fmt(t.overnight)] : null,
            ['Imponibile', pm(t.imponibile)], t.zainettoUsato ? ['Compensato con zainetto', fmt(t.zainettoUsato)] : null, t.minusvalenza ? ['Minus a zainetto', fmt(t.minusvalenza)] : null, ['Imposta', fmt(t.imposta)], ['Netto', pm(t.netto)]]
            .filter(Boolean).map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div></details>';
      }).join('') || '<div class="vuoto">Ancora nessuna operazione chiusa.</div>') + '</div>';
    ui.miniCh = [];
    if (st.curva.length > 1) ui.miniCh.push(SB.miniGrafico($('#eq'), st.curva));
    else $('#eq').innerHTML = '<div class="vuoto">Comparirà dopo la prima operazione chiusa.</div>';
    var mesi = Object.keys(st.mesi).sort();
    if (mesi.length) ui.miniCh.push(SB.miniGrafico($('#mesi'), mesi.map(function (m) { var val = st.mesi[m]; return { time: m + '-01', value: Math.round(val * 100) / 100, color: val >= 0 ? '#22c38e' : '#ff5d6c' }; }), 'barre'));
    else $('#mesi').innerHTML = '<div class="vuoto">Nessun dato</div>';
  }
  function wf(k, val) { return '<div class="wf"><span>' + k + '</span><b class="' + segno(val) + '">' + pm(val) + '</b></div>'; }

  /* =========================================================
     IMPOSTAZIONI
     ========================================================= */
  function viewImpostazioni(v) {
    var c = M.conto(), co = c.costi, f = c.fisco, d = S.imp.dati;
    var classi = [['azione', 'Azioni'], ['etf', 'ETF e fondi'], ['obbligazione', 'Obbligazioni'], ['futures', 'Futures e indici'], ['forex', 'Forex'], ['cripto', 'Cripto']];
    var num = function (id, val, step) { return '<input class="inp n" data-k="' + id + '" type="number" step="' + (step || 'any') + '" inputmode="decimal" value="' + val + '">'; };
    v.innerHTML = '<div class="pad">' +
      '<div class="card"><h3>Conto</h3><div class="lbl">Nome</div><input class="inp" id="i-nome" value="' + esc(c.nome) + '">' +
      '<div class="grid2"><div><div class="lbl">Capitale iniziale</div><input class="inp" id="i-cap" type="number" value="' + c.capitale + '" disabled></div><div><div class="lbl">Valuta del conto</div><input class="inp" value="' + c.valuta + '" disabled></div></div>' +
      '<label class="sw"><input type="checkbox" id="i-so"' + (c.stopOut ? ' checked' : '') + '><span>Stop out automatico se il patrimonio scende sotto il 50% del margine</span></label>' +
      '<div class="row-btn"><button class="btn ghost" data-act="conti">Cambia o crea conto</button><button class="btn ghost" data-act="deposito">Deposita/preleva</button></div>' +
      '<button class="btn danger-soft wide" data-act="azzera">Azzera questo conto</button></div>' +

      '<div class="card"><h3>Commissioni e costi</h3><div class="lbl">Profilo rapido</div><select class="sel" id="i-preset"><option value="">— scegli per applicare —</option>' +
      Object.keys(M.COSTI_PRESET).map(function (k) { return '<option value="' + k + '">' + M.COSTI_PRESET[k].nome + '</option>'; }).join('') + '</select>' +
      '<div class="tbl-wrap"><table class="tab ed"><tr><th></th><th>% sul controvalore</th><th>Fisso ' + c.valuta + '</th><th>Minimo</th><th>Massimo</th><th>Spread %</th><th>Slippage %</th></tr>' +
      classi.map(function (cl) { var p = co[cl[0]]; return '<tr><td>' + cl[1] + '</td><td>' + num(cl[0] + '.pct', p.pct) + '</td><td>' + num(cl[0] + '.fisso', p.fisso) + '</td><td>' + num(cl[0] + '.min', p.min) + '</td><td>' + num(cl[0] + '.max', p.max) + '</td><td>' + num(cl[0] + '.spread', p.spread) + '</td><td>' + num(cl[0] + '.slip', p.slip) + '</td></tr>'; }).join('') + '</table></div>' +
      '<p class="nota">Massimo 0 = nessun tetto. Lo spread si paga a metà in entrata e a metà in uscita; lo slippage si applica a ordini a mercato e stop.</p>' +
      '<label class="sw"><input type="checkbox" id="i-tobin"' + (co.tobin ? ' checked' : '') + '><span>Tobin tax 0,1% sugli acquisti di azioni italiane (.MI), esclusi i trade chiusi in giornata</span></label>' +
      '<label class="sw"><input type="checkbox" id="i-bollo"' + (co.bollo ? ' checked' : '') + '><span>Imposta di bollo 0,2% annuo (calcolata pro-rata sul periodo di detenzione)</span></label>' +
      '<div class="lbl">Costo overnight per leva e short (% annuo)</div><input class="inp" id="i-ov" type="number" step="any" value="' + co.overnight + '"></div>' +

      '<div class="card"><h3>Imposte</h3><div class="lbl">Regime</div><select class="sel" id="i-reg">' +
      [['amministrato', 'Amministrato (trattenute a ogni chiusura)'], ['dichiarativo', 'Dichiarativo (stima da versare)'], ['personalizzato', 'Aliquota unica personalizzata'], ['nessuno', 'Nessuna imposta']].map(function (o) { return '<option value="' + o[0] + '"' + (f.regime === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<div class="grid3"><div><div class="lbl">Aliquota %</div><input class="inp" id="i-al" type="number" step="any" value="' + f.aliquota + '"></div><div><div class="lbl">Cripto %</div><input class="inp" id="i-alc" type="number" step="any" value="' + f.aliquotaCripto + '"></div><div><div class="lbl">Titoli Stato %</div><input class="inp" id="i-als" type="number" step="any" value="' + f.aliquotaStato + '"></div></div>' +
      '<label class="sw"><input type="checkbox" id="i-zai"' + (f.zainetto ? ' checked' : '') + '><span>Zainetto fiscale: le minus compensano le plus future per 4 anni</span></label>' +
      '<p class="nota">Valori italiani 2026: 26% su azioni, ETF e derivati; 33% sulle cripto-attività dal 1° gennaio 2026; 12,5% su titoli di Stato e equiparati.</p></div>' +

      '<div class="card"><h3>Fonti dati</h3>' +
      '<div class="lbl">Proxy personale (consigliato, gratuito su Cloudflare)</div><input class="inp" id="i-px" placeholder="https://tuo-proxy.workers.dev/?url=" value="' + esc(d.proxyPersonale || '') + '">' +
      '<div class="lbl">Chiave Twelve Data (facoltativa, piano gratuito)</div><input class="inp" id="i-td" placeholder="chiave API" value="' + esc(d.twelveKey || '') + '">' +
      '<div class="lbl">Aggiornamento prezzi Yahoo (secondi)</div><input class="inp" id="i-rf" type="number" min="10" value="' + (d.refresh || 15) + '">' +
      '<button class="btn ghost wide" data-act="prova">Prova connessione ai dati</button><div id="prova-out" class="small"></div>' +
      '<p class="nota">Yahoo Finance non permette l\'accesso diretto dal browser: l\'app passa da proxy pubblici gratuiti (' + D.DEFAULT_PROXIES.map(function (p) { return p.split('/')[2]; }).join(', ') + '). Se sono lenti o bloccati, crea il tuo proxy con il file <b>proxy/cloudflare-worker.js</b> (istruzioni nel README).</p></div>' +

      '<div class="card"><h3>Notifiche</h3><label class="sw"><input type="checkbox" id="i-not"' + (S.imp.notifiche ? ' checked' : '') + '><span>Avvisami quando un ordine viene eseguito o scatta uno stop/target</span></label>' +
      '<p class="nota">Il motore controlla gli ordini mentre l\'app è aperta. Quando la riapri, ricostruisce cosa è successo nel frattempo usando le candele storiche, ed esegue ordini, stop e target ai prezzi corretti.</p></div>' +

      '<div class="card"><h3>Backup</h3><div class="row-btn"><button class="btn ghost" data-act="esporta">Esporta backup</button><button class="btn ghost" data-act="importa">Importa backup</button></div><input type="file" id="i-file" accept="application/json" hidden></div>' +

      '<div class="card"><h3>Informazioni</h3><p class="small">SimulaBorsa versione <b>' + esc((window.AppUpdate && AppUpdate.current) || '') + '</b>. Trading simulato a scopo didattico: nessun ordine reale, nessun denaro reale.</p>' +
      '<p class="small muted">Grafici: <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a>. Dati: Yahoo Finance, Binance, Twelve Data, BCE/Frankfurter. I dati possono essere ritardati o incompleti.</p>' +
      '<button class="btn ghost wide" data-act="check-upd">Controlla aggiornamenti</button></div></div>';

    var saveCosti = function () {
      $$('.tab.ed input', v).forEach(function (i) { var k = i.dataset.k.split('.'); co[k[0]][k[1]] = +i.value || 0; });
      co.tobin = $('#i-tobin').checked; co.bollo = $('#i-bollo').checked; co.overnight = +$('#i-ov').value || 0;
      f.regime = $('#i-reg').value; f.aliquota = +$('#i-al').value || 0; f.aliquotaCripto = +$('#i-alc').value || 0; f.aliquotaStato = +$('#i-als').value || 0; f.zainetto = $('#i-zai').checked;
      c.nome = $('#i-nome').value.trim() || c.nome; c.stopOut = $('#i-so').checked;
      d.proxyPersonale = $('#i-px').value.trim(); d.twelveKey = $('#i-td').value.trim(); d.refresh = Math.max(10, +$('#i-rf').value || 15);
      M.salva(); renderHeader();
    };
    v.addEventListener('change', function (e) {
      if (e.target.id === 'i-preset' && e.target.value) {
        var p = JSON.parse(JSON.stringify(M.COSTI_PRESET[e.target.value]));
        delete p.nome; Object.assign(c.costi, p); M.salva(); toast('Profilo applicato'); vai('impostazioni'); return;
      }
      if (e.target.id === 'i-not') {
        S.imp.notifiche = e.target.checked; M.salva();
        if (e.target.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
        return;
      }
      if (e.target.id === 'i-file') return;
      saveCosti();
      if (e.target.closest('.tab.ed') || e.target.id.indexOf('i-') === 0) toast('Salvato');
    });
    $('#i-file').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      file.text().then(function (txt) {
        var j = JSON.parse(txt);
        if (!j.conti) throw new Error('File non valido');
        conferma('Sostituire tutti i dati con il backup?', function () { localStorage.setItem('sb.stato', JSON.stringify(j)); location.reload(); }, 'Importa');
      }).catch(function (er) { toast('Import non riuscito: ' + er.message, 'err'); });
    });
  }

  function sheetConti() {
    var cur = S.contoAttivo;
    sheet('<h3>Conti</h3><p class="muted small">Crea più conti per confrontare strategie o broker diversi.</p>' +
      Object.keys(S.conti).map(function (k) { var c = S.conti[k], r = M.riepilogo(c); return '<button class="riga acc-row ' + (k === cur ? 'on' : '') + '" data-conto="' + k + '"><div class="r-main"><div class="r-sym">' + esc(c.nome) + '</div><div class="r-name">' + c.chiusi.length + ' trade · ' + c.posizioni.length + ' aperte</div></div><div class="r-px"><b>' + fmt(r.equity) + '</b><em class="' + segno(r.rendimento) + '">' + pm(r.rendimento) + '%</em></div></button>'; }).join('') +
      '<h4>Nuovo conto</h4><div class="grid2"><input class="inp" id="nc-n" placeholder="Nome"><input class="inp" id="nc-c" type="number" placeholder="Capitale" value="10000"></div>' +
      '<select class="sel" id="nc-p">' + Object.keys(M.COSTI_PRESET).map(function (k) { return '<option value="' + k + '">' + M.COSTI_PRESET[k].nome + '</option>'; }).join('') + '</select>' +
      '<div class="row-btn">' + (Object.keys(S.conti).length > 1 ? '<button class="btn danger-soft" id="nc-del">Elimina conto attivo</button>' : '') + '<button class="btn" id="nc-ok">Crea conto</button></div>', function (el, close) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-conto]'); if (!b) return;
        S.contoAttivo = b.dataset.conto; M.salva(true); close(); vai(ui.tab);
      });
      $('#nc-ok', el).onclick = function () {
        var c = M.nuovoConto($('#nc-n', el).value.trim() || 'Conto ' + (Object.keys(S.conti).length + 1), +$('#nc-c', el).value || 10000, $('#nc-p', el).value);
        S.conti[c.id] = c; S.contoAttivo = c.id; M.salva(true); close(); vai(ui.tab); toast('Conto creato');
      };
      var del = $('#nc-del', el);
      if (del) del.onclick = function () {
        conferma('Eliminare il conto "' + M.conto().nome + '" e tutto il suo storico?', function () {
          delete S.conti[S.contoAttivo]; S.contoAttivo = Object.keys(S.conti)[0]; M.salva(true); close(); vai(ui.tab);
        }, 'Elimina');
      };
    });
  }
  function sheetDeposito() {
    var c = M.conto();
    sheet('<h3>Deposita o preleva</h3><input class="inp" id="dp-v" type="number" inputmode="decimal" placeholder="Importo ' + c.valuta + '">' +
      '<div class="row-btn"><button class="btn ghost" id="dp-out">Preleva</button><button class="btn" id="dp-in">Deposita</button></div>', function (el, close) {
      var mov = function (s) {
        var v = +$('#dp-v', el).value; if (!(v > 0)) return toast('Importo non valido', 'err');
        if (s < 0 && v > M.riepilogo(c).disponibile) return toast('Liquidità insufficiente', 'err');
        c.cassa += s * v; c.capitale += s * v;
        c.movimenti.push({ t: M.now(), tipo: s > 0 ? 'deposito' : 'prelievo', importo: s * v, desc: s > 0 ? 'Deposito' : 'Prelievo' });
        M.salva(true); close(); vai(ui.tab);
      };
      $('#dp-in', el).onclick = function () { mov(1); };
      $('#dp-out', el).onclick = function () { mov(-1); };
    });
  }

  function scarica(nome, testo, tipo) {
    var b = new Blob([testo], { type: tipo }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* =========================================================
     MOTORE IN BACKGROUND
     ========================================================= */
  var ciclando = false;
  function ciclo() {
    if (ciclando || !navigator.onLine && !Object.keys(S.conti).some(function (k) { return S.conti[k].posizioni.concat(S.conti[k].ordini).some(function (x) { return D.parseId(x.str.id).p === 'D'; }); })) return Promise.resolve();
    ciclando = true;
    var mappa = {};
    Object.keys(S.conti).forEach(function (k) {
      var c = S.conti[k];
      c.ordini.concat(c.posizioni).forEach(function (x) {
        var m = (mappa[x.str.id] = mappa[x.str.id] || { str: x.str, conti: {} });
        m.conti[k] = Math.min(m.conti[k] || Infinity, c.ultimoControllo[x.str.id] || x.creato || x.aperto);
      });
    });
    var sids = Object.keys(mappa), eventi = 0;
    var uno = function (sid) {
      var m = mappa[sid], since = Math.min.apply(null, Object.keys(m.conti).map(function (k) { return m.conti[k]; }));
      return Promise.all([D.candeleDa(sid, since), D.cambio(m.str.c, 'EUR').catch(function () { return null; })]).then(function (r) {
        var candles = r[0] || [];
        Object.keys(m.conti).forEach(function (k) {
          var c = S.conti[k], fx = c.valuta === 'EUR' ? r[1] : null;
          if (fx == null) fx = D.cambioNoto(m.str.c, c.valuta) || (c.posizioni.find(function (p) { return p.str.id === sid; }) || {}).fxIn || 1;
          var from = (c.ultimoControllo[sid] || m.conti[k]) - 60;
          eventi += M.processa(c, sid, candles.filter(function (x) { return x.time >= from; }), fx);
          if (candles.length) c.ultimoControllo[sid] = candles[candles.length - 1].time;
        });
      }).catch(function () { /* riprova al prossimo giro */ });
    };
    var p = Promise.resolve();
    sids.forEach(function (sid) { p = p.then(function () { return uno(sid); }); });
    return p.then(function () {
      ciclando = false;
      M.salva();
      renderHeader();
      if (ui.tab === 'portafoglio') vai('portafoglio');
      else if (ui.tab === 'grafico' && eventi) { disegnaLinee(); markers(); aggiornaPannello(true); }
    });
  }

  M.on(function (tipo, d) {
    if (tipo === 'inviato') return toast(d.testo);
    var cls = tipo === 'chiusa' ? (d.trade.netto >= 0 ? 'ok' : 'err') : tipo === 'rifiutato' ? 'err' : 'ok';
    toast((d.conto.id !== S.contoAttivo ? '[' + d.conto.nome + '] ' : '') + d.testo, cls);
    if (S.imp.notifiche && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      var opts = { body: d.testo, tag: 'sb-' + Date.now(), icon: 'icons/icon-192.png' };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(function (r) { r.showNotification('SimulaBorsa', opts); });
      else try { new Notification('SimulaBorsa', opts); } catch (e) { /* no */ }
    }
  });
  M.on(function (tipo, d) { if (tipo === 'errore') toast(d, 'err'); });

  function refresh() { renderHeader(); if (ui.tab === 'grafico') { disegnaLinee(); markers(); aggiornaPannello(true); } else vai(ui.tab); }

  /* =========================================================
     EVENTI
     ========================================================= */
  document.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-tab]'))) return vai(b.dataset.tab);
    if ((b = e.target.closest('[data-star]'))) { e.stopPropagation(); var on = stella(b.dataset.star); b.classList.toggle('on', on); toast(on ? 'Aggiunto ai preferiti' : 'Tolto dai preferiti'); return; }
    if ((b = e.target.closest('[data-open]'))) { var id = b.dataset.open; if (id !== ui.sid) ui.ticket = null; ui.sid = id; ui.pannello = 'ordine'; return vai('grafico'); }
    if ((b = e.target.closest('[data-cat]'))) { ui.cat = b.dataset.cat; salvaUi(); $$('#cats .chip').forEach(function (x) { x.classList.toggle('on', x === b); }); $('#q').value = ''; return listaCat(); }
    if ((b = e.target.closest('[data-tf]'))) { ui.tf = b.dataset.tf; salvaUi(); $$('[data-tf]').forEach(function (x) { x.classList.toggle('on', x === b); }); return caricaGrafico(); }
    if ((b = e.target.closest('[data-pan]'))) return setPannello(b.dataset.pan);
    if ((b = e.target.closest('#ticket [data-seg] button'))) {
      var segn = b.parentNode.dataset.seg, t = ui.ticket;
      t[segn] = b.dataset.v;
      if (segn === 'tipo' && t.tipo !== 'market' && !t.prezzo && ui.prezzo) t.prezzo = arrot(ui.prezzo * (t.tipo === 'limit' ? (t.lato === 'buy' ? 0.99 : 1.01) : (t.lato === 'buy' ? 1.01 : 0.99)));
      if (segn === 'modo') t.val = t.modo === 'rischio' ? 1 : t.modo === 'importo' ? 1000 : 1;
      if (segn === 'lato') { t.sl = null; t.tp = null; }
      renderTicket($('#g-panel')); disegnaLinee(); return;
    }
    if ((b = e.target.closest('[data-pin]'))) return scegliDalGrafico(b.dataset.pin);
    if ((b = e.target.closest('[data-q]'))) {
      var tk = ui.ticket, ref = tk.tipo === 'market' ? ui.prezzo : tk.prezzo, dir = tk.lato === 'buy' ? 1 : -1, q = b.dataset.q;
      if (!ref) return toast('Prezzo non disponibile', 'err');
      if (q === 'clr') { tk.sl = null; tk.tp = null; }
      else if (q.indexOf('sl') === 0) tk.sl = arrot(ref * (1 - dir * +q.slice(2) / 100));
      else { if (!tk.sl) tk.sl = arrot(ref * (1 - dir * 0.02)); tk.tp = arrot(ref + (ref - tk.sl) * +q.slice(2)); }
      renderTicket($('#g-panel')); disegnaLinee(); return;
    }
    if (e.target.closest('#t-invia')) return inviaOrdine();
    if (e.target.closest('#g-star')) { var on2 = stella(ui.sid); $('#g-star').classList.toggle('on', on2); return toast(on2 ? 'Aggiunto ai preferiti' : 'Tolto dai preferiti'); }
    if (e.target.closest('#g-info')) return sheetStrumento();
    if (e.target.closest('#g-ind')) return sheetIndicatori();
    if (e.target.closest('#g-line')) return disegnaLinea();
    if ((b = e.target.closest('[data-mod]'))) return sheetModifica(b.dataset.mod);
    if ((b = e.target.closest('[data-chiudi]'))) return sheetChiudi(b.dataset.chiudi);
    if ((b = e.target.closest('[data-modord]'))) return sheetModOrd(b.dataset.modord);
    if ((b = e.target.closest('[data-annulla]'))) { M.annulla(M.conto(), b.dataset.annulla); return refresh(); }
    if ((b = e.target.closest('[data-act]'))) {
      var a = b.dataset.act;
      if (a === 'pick-off') { ui.gr && ui.gr.scegliPrezzo(null); $('#pick-hint').classList.remove('on'); }
      if (a === 'conti') sheetConti();
      if (a === 'deposito') sheetDeposito();
      if (a === 'aggiorna-pos') { toast('Aggiornamento prezzi…'); ciclo(); }
      if (a === 'csv') scarica('simulaborsa-operazioni.csv', M.csv(), 'text/csv;charset=utf-8');
      if (a === 'esporta') scarica('simulaborsa-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(S), 'application/json');
      if (a === 'importa') $('#i-file').click();
      if (a === 'check-upd') { if (window.AppUpdate) AppUpdate.check().then(function (n) { if (!n) toast('Hai già l\'ultima versione'); }); }
      if (a === 'azzera') conferma('Azzerare il conto? Posizioni, ordini e storico verranno cancellati.', function () {
        var c = M.conto(), n = M.nuovoConto(c.nome, c.capitale); n.id = c.id; n.costi = c.costi; n.fisco = c.fisco;
        S.conti[c.id] = n; M.salva(true); vai(ui.tab); toast('Conto azzerato');
      }, 'Azzera');
      if (a === 'prova') {
        var out = $('#prova-out'); out.textContent = 'Verifica in corso…';
        D.prova().then(function (r) { out.innerHTML = '<div class="mov"><span>Yahoo</span><b>' + esc(r.yahoo) + '</b></div><div class="mov"><span>Binance</span><b>' + esc(r.binance) + '</b></div><div class="mov"><span>Twelve Data</span><b>' + esc(r.twelve) + '</b></div><div class="mov"><span>Cambi</span><b>' + esc(r.cambi) + '</b></div>'; });
      }
    }
  });
  document.addEventListener('input', function (e) {
    var id = e.target.id;
    if (!ui.ticket || !/^t-/.test(id)) return;
    var v = e.target.value === '' ? null : +e.target.value;
    if (id === 't-val') ui.ticket.val = v;
    else if (id === 't-leva') ui.ticket.leva = +e.target.value;
    else ui.ticket[id.slice(2)] = v;
    aggiornaRiepilogo();
    clearTimeout(ui._lt); ui._lt = setTimeout(disegnaLinee, 250);
  });
  document.addEventListener('change', function (e) { if (e.target.id === 't-leva') { ui.ticket.leva = +e.target.value; aggiornaRiepilogo(); } });

  document.addEventListener('visibilitychange', function () { if (!document.hidden) ciclo(); });
  window.addEventListener('online', ciclo);
  // prezzi della lista e motore
  setInterval(function () { if (!document.hidden) ciclo(); }, 60000);
  setInterval(function () { if (!document.hidden && ui.tab === 'mercati' && !($('#q') || {}).value) aggiornaQuote(idsCat()); }, 30000);

  /* ---------- Avvio ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  renderTabbar();
  vai(ui.tab);
  setTimeout(ciclo, 1500);
  SB.ui = ui;
})();
