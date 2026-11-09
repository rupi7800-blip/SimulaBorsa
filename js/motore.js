/* =========================================================
   SimulaBorsa — motore.js
   Stato, conti, ordini (mercato/limite/stop), stop loss, take profit,
   trailing stop, leva e margini, commissioni, spread, slippage,
   Tobin tax, bollo, costi overnight, imposte italiane con zainetto.
   ========================================================= */
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var KEY = 'sb.stato';

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function now() { return Math.floor(Date.now() / 1000); }
  function r2(x) { return Math.round(x * 100) / 100; }
  function giorno(sec) { var d = new Date(sec * 1000); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function anno(sec) { return new Date(sec * 1000).getFullYear(); }

  /* ---------- Profili predefiniti ---------- */
  var COSTI_PRESET = {
    standard: {
      nome: 'Broker tradizionale',
      azione: { pct: 0.19, fisso: 0, min: 2.95, max: 19, spread: 0.05, slip: 0.02 },
      etf: { pct: 0.19, fisso: 0, min: 2.95, max: 19, spread: 0.08, slip: 0.02 },
      obbligazione: { pct: 0.19, fisso: 0, min: 2.95, max: 19, spread: 0.1, slip: 0.02 },
      futures: { pct: 0, fisso: 3, min: 0, max: 0, spread: 0.02, slip: 0.02 },
      forex: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0.01, slip: 0.005 },
      cripto: { pct: 0.1, fisso: 0, min: 0, max: 0, spread: 0.02, slip: 0.02 },
      tobin: true, bollo: true, overnight: 5
    },
    fisso: {
      nome: 'Commissione fissa',
      azione: { pct: 0, fisso: 5, min: 0, max: 0, spread: 0.05, slip: 0.02 },
      etf: { pct: 0, fisso: 5, min: 0, max: 0, spread: 0.08, slip: 0.02 },
      obbligazione: { pct: 0, fisso: 5, min: 0, max: 0, spread: 0.1, slip: 0.02 },
      futures: { pct: 0, fisso: 3, min: 0, max: 0, spread: 0.02, slip: 0.02 },
      forex: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0.01, slip: 0.005 },
      cripto: { pct: 0.1, fisso: 0, min: 0, max: 0, spread: 0.02, slip: 0.02 },
      tobin: true, bollo: true, overnight: 5
    },
    zero: {
      nome: 'Neo-broker (zero commissioni)',
      azione: { pct: 0, fisso: 1, min: 0, max: 0, spread: 0.1, slip: 0.03 },
      etf: { pct: 0, fisso: 1, min: 0, max: 0, spread: 0.12, slip: 0.03 },
      obbligazione: { pct: 0, fisso: 1, min: 0, max: 0, spread: 0.15, slip: 0.03 },
      futures: { pct: 0, fisso: 2, min: 0, max: 0, spread: 0.03, slip: 0.02 },
      forex: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0.015, slip: 0.005 },
      cripto: { pct: 0.25, fisso: 0, min: 0, max: 0, spread: 0.1, slip: 0.03 },
      tobin: true, bollo: true, overnight: 6
    },
    nessuno: {
      nome: 'Senza costi (solo didattica)',
      azione: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0, slip: 0 },
      etf: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0, slip: 0 },
      obbligazione: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0, slip: 0 },
      futures: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0, slip: 0 },
      forex: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0, slip: 0 },
      cripto: { pct: 0, fisso: 0, min: 0, max: 0, spread: 0, slip: 0 },
      tobin: false, bollo: false, overnight: 0
    }
  };
  var FISCO_DEF = { regime: 'amministrato', aliquota: 26, aliquotaCripto: 33, aliquotaStato: 12.5, zainetto: true };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nuovoConto(nome, capitale, preset) {
    var c = {
      id: uid(), nome: nome || 'Conto principale', valuta: 'EUR', capitale: +capitale || 10000, cassa: +capitale || 10000,
      creato: now(), ordini: [], posizioni: [], chiusi: [], movimenti: [], zainetto: [], ultimoControllo: {},
      costi: clone(COSTI_PRESET[preset || 'standard']), fisco: clone(FISCO_DEF), stopOut: true
    };
    c.movimenti.push({ t: now(), tipo: 'deposito', importo: c.cassa, desc: 'Capitale iniziale' });
    return c;
  }

  var WATCH_DEF = [
    'D:DEMO_AZ', 'Y:FTSEMIB.MI', 'Y:ENI.MI', 'Y:ISP.MI', 'Y:^GSPC', 'Y:AAPL', 'Y:NVDA', 'Y:EURUSD=X', 'Y:GC=F', 'Y:CL=F', 'Y:SWDA.MI', 'B:BTCUSDT', 'B:ETHUSDT'
  ];

  var S = null;
  function carica() {
    try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
    if (!S || !S.conti) {
      var c = nuovoConto('Conto principale', 10000, 'standard');
      S = { v: 1, contoAttivo: c.id, conti: {}, watch: WATCH_DEF.map(function (id) { return { id: id }; }), info: {}, linee: {}, imp: { dati: { proxies: [], proxyPersonale: '', twelveKey: '', refresh: 15 }, tema: 'scuro', notifiche: true } };
      S.conti[c.id] = c;
    }
    return S;
  }
  var saveT = null;
  function salva(subito) {
    clearTimeout(saveT);
    var f = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { SB.emit && SB.emit('errore', 'Memoria piena: esporta un backup e cancella lo storico'); } };
    if (subito) f(); else saveT = setTimeout(f, 300);
  }
  function conto() { return S.conti[S.contoAttivo]; }

  /* ---------- Strumenti ---------- */
  function info(id) { return S.info[id] || { id: id }; }
  function setInfo(id, meta) {
    var cur = S.info[id] || { id: id };
    Object.keys(meta || {}).forEach(function (k) { if (meta[k] != null && meta[k] !== '') cur[k] = meta[k]; });
    var k = SB.dati.parseId(id);
    if (!cur.s) cur.s = k.s;
    if (!cur.m) cur.m = 1;
    S.info[id] = cur; salva();
    return cur;
  }
  function classeCosti(t) {
    return ({ azione: 'azione', etf: 'etf', fondo: 'etf', cripto: 'cripto', forex: 'forex', futures: 'futures', indice: 'futures', obbligazione: 'obbligazione' })[t] || 'azione';
  }
  function classeFiscale(str) {
    if (str.fisc) return str.fisc;
    if (str.t === 'cripto') return 'cripto';
    if (str.t === 'etf' || str.t === 'fondo') return 'capitale';
    return 'diverso';
  }
  function italiana(str) { return str.t === 'azione' && /\.MI$/i.test(str.s || str.id); }

  /* ---------- Costi ---------- */
  function profilo(c, str) { return c.costi[classeCosti(str.t)] || c.costi.azione; }
  function commissione(c, str, nozEur) {
    var p = profilo(c, str), v = (p.fisso || 0) + (p.pct || 0) / 100 * nozEur;
    if (p.min) v = Math.max(v, p.min);
    if (p.max) v = Math.min(v, p.max);
    return r2(v);
  }
  function prezzoEseguito(c, str, base, lato, conSlip) {
    var p = profilo(c, str), d = ((p.spread || 0) / 2 + (conSlip ? (p.slip || 0) : 0)) / 100;
    return lato === 'buy' ? base * (1 + d) : base * (1 - d);
  }
  function molt(str) { return +(str.m || 1); }
  function nozionale(str, qta, prezzo, fx) { return Math.abs(qta) * molt(str) * prezzo * fx; }

  /* ---------- Saldi ---------- */
  function pnlPos(p, prezzo, fx) {
    var dir = p.lato === 'buy' ? 1 : -1, m = molt(p.str);
    if (p.leva <= 1 && p.lato === 'buy') return p.qta * m * (prezzo * fx - p.entrata * p.fxIn);
    return dir * (prezzo - p.entrata) * p.qta * m * fx;
  }
  function riepilogo(c) {
    c = c || conto();
    var marg = 0, upnl = 0, valore = 0;
    var commAperte = 0;
    c.posizioni.forEach(function (p) {
      marg += p.margine; commAperte += p.commIn;
      var px = p.ultimo || p.entrata, fx = SB.dati.cambioNoto(p.str.c, c.valuta) || p.fxIn;
      p.upnl = pnlPos(p, px, fx);
      upnl += p.upnl;
      valore += nozionale(p.str, p.qta, px, fx);
    });
    var equity = c.cassa + upnl;
    var chiusi = c.chiusi, netto = 0, comm = 0, tasse = 0, altri = 0;
    chiusi.forEach(function (t) { netto += t.netto; comm += t.commIn + t.commOut; tasse += t.imposta; altri += (t.tobin || 0) + (t.bollo || 0) + (t.overnight || 0); });
    var daVersare = 0;
    if (c.fisco.regime === 'dichiarativo') chiusi.forEach(function (t) { if (anno(t.chiuso) === new Date().getFullYear()) daVersare += t.imposta; });
    return {
      cassa: c.cassa, margine: marg, disponibile: c.cassa - marg + Math.min(0, upnl), upnl: upnl, equity: equity, valore: valore,
      rendimento: (equity - c.capitale) / c.capitale * 100, realizzato: netto, commissioni: comm + commAperte, imposte: tasse, altriCosti: altri,
      zainetto: zainettoDisponibile(c), daVersare: daVersare
    };
  }

  /* ---------- Zainetto fiscale ---------- */
  function zainettoDisponibile(c, quando) {
    var y = anno(quando || now());
    return (c.zainetto || []).reduce(function (s, z) { return s + (z.anno + 4 >= y ? z.residuo : 0); }, 0);
  }
  function usaZainetto(c, importo, quando) {
    var y = anno(quando), usato = 0;
    c.zainetto.sort(function (a, b) { return a.anno - b.anno; });
    c.zainetto.forEach(function (z) {
      if (importo <= 0 || z.anno + 4 < y || z.residuo <= 0) return;
      var u = Math.min(z.residuo, importo);
      z.residuo = r2(z.residuo - u); importo -= u; usato += u;
    });
    return usato;
  }
  function calcolaImposte(c, t) {
    var f = c.fisco, cl = classeFiscale(t.str), base = t.lordo - t.commIn - t.commOut - (t.overnight || 0);
    t.imponibile = r2(base); t.imposta = 0; t.zainettoUsato = 0; t.minusvalenza = 0; t.classe = cl;
    if (f.regime === 'nessuno') return;
    var aliq = cl === 'cripto' ? f.aliquotaCripto : cl === 'stato' ? f.aliquotaStato : f.aliquota;
    if (f.regime === 'personalizzato') aliq = f.aliquota;
    if (base > 0) {
      if (cl === 'capitale' || !f.zainetto) { t.imposta = r2(base * aliq / 100); return; }
      // titoli di stato: la base equivalente è ridotta (12,5/26 = 48,08%)
      var equiv = cl === 'stato' ? base * f.aliquotaStato / f.aliquota : base;
      var rate = cl === 'stato' ? f.aliquota : aliq;
      var usato = usaZainetto(c, equiv, t.chiuso);
      t.zainettoUsato = r2(usato);
      t.imposta = r2((equiv - usato) * rate / 100);
    } else if (base < 0 && f.zainetto) {
      t.minusvalenza = r2(-base);
      c.zainetto.push({ anno: anno(t.chiuso), importo: r2(-base), residuo: r2(-base), da: t.str.s });
    }
  }

  /* ---------- Eventi ---------- */
  var listeners = [];
  function emit(tipo, dati) { listeners.forEach(function (f) { try { f(tipo, dati); } catch (e) { console.error(e); } }); }
  SB.emit = emit;

  /* ---------- Apertura posizione ---------- */
  function apri(c, ord, prezzoBase, fx, quando, conSlip) {
    var str = ord.str, px = prezzoEseguito(c, str, prezzoBase, ord.lato, conSlip);
    var noz = nozionale(str, ord.qta, px, fx), leva = Math.max(1, +ord.leva || 1);
    var margine = noz / leva, comm = commissione(c, str, noz);
    var disp = riepilogo(c).disponibile;
    if (margine + comm > disp + 1e-6) {
      return { errore: 'Liquidità insufficiente: servono ' + fmt(margine + comm) + ' ' + c.valuta + ', disponibili ' + fmt(disp) };
    }
    var tobin = (c.costi.tobin && italiana(str) && ord.lato === 'buy') ? r2(noz * 0.001) : 0;
    var p = {
      id: uid(), str: str, lato: ord.lato, qta: ord.qta, entrata: px, aperto: quando, fxIn: fx, noz: noz, margine: margine,
      commIn: comm, tobin: tobin, sl: ord.sl || null, tp: ord.tp || null, trail: ord.trail || null, leva: leva,
      best: px, ultimo: prezzoBase, da: ord.tipo, nota: ord.nota || ''
    };
    c.cassa -= comm + tobin;
    c.posizioni.push(p);
    c.movimenti.push({ t: quando, tipo: 'apertura', importo: -(comm + tobin), desc: (ord.lato === 'buy' ? 'Acquisto ' : 'Vendita allo scoperto ') + ord.qta + ' ' + str.s + ' @ ' + fmtP(px) + ' · comm. ' + fmt(comm) + (tobin ? ' · Tobin ' + fmt(tobin) : '') });
    emit('aperta', { conto: c, pos: p, testo: (ord.lato === 'buy' ? 'Comprato ' : 'Venduto ') + ord.qta + ' ' + str.s + ' a ' + fmtP(px) });
    return { pos: p };
  }

  /* ---------- Chiusura (anche parziale) ---------- */
  function chiudi(c, posId, prezzoBase, fx, quando, motivo, qtaParz, conSlip) {
    var i = c.posizioni.findIndex(function (p) { return p.id === posId; });
    if (i < 0) return null;
    var p = c.posizioni[i], qta = qtaParz && qtaParz < p.qta ? qtaParz : p.qta, frac = qta / p.qta;
    var latoUscita = p.lato === 'buy' ? 'sell' : 'buy';
    var px = prezzoEseguito(c, p.str, prezzoBase, latoUscita, conSlip !== false);
    var parte = { lato: p.lato, qta: qta, entrata: p.entrata, fxIn: p.fxIn, leva: p.leva, str: p.str };
    var lordo = pnlPos(parte, px, fx);
    var nozOut = nozionale(p.str, qta, px, fx);
    var commOut = commissione(c, p.str, nozOut);
    var commIn = r2(p.commIn * frac), noz = p.noz * frac;
    var giorni = Math.max(0, (quando - p.aperto) / 86400);
    var notti = Math.floor(giorni);
    // costo di finanziamento overnight solo per posizioni a leva o allo scoperto
    var overnight = (p.leva > 1 || p.lato === 'sell') && c.costi.overnight ? r2(noz * c.costi.overnight / 100 * notti / 365) : 0;
    var bollo = c.costi.bollo ? r2(noz * 0.002 * giorni / 365) : 0;
    var tobinAp = r2(p.tobin * frac), tobinOra = 0, tobin;
    var stessoGiorno = giorno(p.aperto) === giorno(quando);
    if (stessoGiorno) { c.cassa += tobinAp; tobin = 0; } // operazione intraday: Tobin non dovuta, si restituisce
    else {
      if (c.costi.tobin && italiana(p.str) && p.lato === 'sell') tobinOra = r2(nozOut * 0.001); // ricopertura di uno scoperto = acquisto
      tobin = r2(tobinAp + tobinOra);
    }
    var t = {
      id: p.id + (frac < 1 ? '-' + uid().slice(-3) : ''), str: p.str, lato: p.lato, qta: qta, entrata: p.entrata, uscita: px, aperto: p.aperto, chiuso: quando,
      fxIn: p.fxIn, fxOut: fx, leva: p.leva, lordo: r2(lordo), commIn: commIn, commOut: commOut, tobin: tobin, bollo: bollo, overnight: overnight,
      motivo: motivo || 'manuale', sl: p.sl, tp: p.tp
    };
    calcolaImposte(c, t);
    var trattenuta = c.fisco.regime === 'amministrato' ? t.imposta : 0;
    t.netto = r2(t.lordo - commIn - commOut - tobin - bollo - overnight - t.imposta);
    // la Tobin dell'apertura era già stata addebitata: in cassa si toglie solo la parte nuova
    c.cassa += t.lordo - commOut - bollo - overnight - tobinOra - trattenuta;
    c.movimenti.push({ t: quando, tipo: 'chiusura', importo: r2(t.lordo - commOut - bollo - overnight - tobinOra - trattenuta),
      desc: 'Chiusura ' + qta + ' ' + p.str.s + ' @ ' + fmtP(px) + ' (' + motivo + ') · P/L lordo ' + fmt(t.lordo) + (trattenuta ? ' · imposta ' + fmt(trattenuta) : '') + (t.minusvalenza ? ' · minus nello zainetto ' + fmt(t.minusvalenza) : '') });
    c.chiusi.push(t);
    if (frac < 1) {
      p.qta = r2(p.qta - qta) || +(p.qta - qta).toFixed(8);
      p.commIn = r2(p.commIn - commIn); p.noz -= noz; p.margine *= (1 - frac); p.tobin = r2(p.tobin - p.tobin * frac);
    } else c.posizioni.splice(i, 1);
    emit('chiusa', { conto: c, trade: t, testo: nomeMotivo(motivo) + ': ' + p.str.s + ' ' + (t.netto >= 0 ? '+' : '') + fmt(t.netto) + ' ' + c.valuta });
    return t;
  }
  function nomeMotivo(m) { return ({ sl: 'Stop loss', tp: 'Take profit', trailing: 'Trailing stop', manuale: 'Chiusa', stopout: 'Stop out (margine)' })[m] || m; }

  /* ---------- Elaborazione candele / tick ---------- */
  function processa(c, sid, candles, fx) {
    if (!candles || !candles.length) return 0;
    var eventi = 0;
    candles.forEach(function (k) {
      // ordini in attesa
      c.ordini.slice().forEach(function (o) {
        if (o.str.id !== sid || o.stato !== 'attivo') return;
        if (k.time < o.creato) return;
        if (o.scad === 'day' && giorno(k.time) !== giorno(o.creato)) { annulla(c, o.id, 'scaduto'); eventi++; return; }
        var fill = null, slip = false;
        if (o.tipo === 'market') { fill = k.open; slip = true; }
        else if (o.tipo === 'limit') {
          if (o.lato === 'buy' && k.low <= o.prezzo) fill = Math.min(k.open, o.prezzo);
          if (o.lato === 'sell' && k.high >= o.prezzo) fill = Math.max(k.open, o.prezzo);
        } else if (o.tipo === 'stop') {
          if (o.lato === 'buy' && k.high >= o.prezzo) { fill = Math.max(k.open, o.prezzo); slip = true; }
          if (o.lato === 'sell' && k.low <= o.prezzo) { fill = Math.min(k.open, o.prezzo); slip = true; }
        }
        if (fill == null) return;
        var r = apri(c, o, fill, fx, Math.max(k.time, o.creato), slip);
        o.stato = r.errore ? 'rifiutato' : 'eseguito';
        o.esito = r.errore || ('Eseguito a ' + fmtP(r.pos.entrata));
        c.ordini = c.ordini.filter(function (x) { return x.id !== o.id; });
        c.storicoOrdini = (c.storicoOrdini || []).concat([Object.assign({}, o, { chiuso: k.time })]).slice(-300);
        if (r.errore) emit('rifiutato', { conto: c, testo: 'Ordine ' + o.str.s + ' rifiutato: ' + r.errore });
        else r.pos.aperto = Math.max(k.time, o.creato) + 1; // le uscite si controllano dalla candela successiva
        eventi++;
      });
      // posizioni aperte
      c.posizioni.slice().forEach(function (p) {
        if (p.str.id !== sid || k.time < p.aperto) return;
        var long = p.lato === 'buy', stop = p.sl, motivo = 'sl';
        if (p.trail) {
          var ts = long ? p.best * (1 - p.trail / 100) : p.best * (1 + p.trail / 100);
          if (stop == null || (long ? ts > stop : ts < stop)) { stop = ts; motivo = 'trailing'; }
        }
        var exit = null, why = null;
        if (stop != null && (long ? k.low <= stop : k.high >= stop)) { exit = long ? Math.min(k.open, stop) : Math.max(k.open, stop); why = motivo; }
        else if (p.tp != null && (long ? k.high >= p.tp : k.low <= p.tp)) { exit = long ? Math.max(k.open, p.tp) : Math.min(k.open, p.tp); why = 'tp'; }
        if (exit != null) { chiudi(c, p.id, exit, fx, Math.max(k.time, p.aperto), why, null, why !== 'tp'); eventi++; return; }
        p.best = long ? Math.max(p.best, k.high) : Math.min(p.best, k.low);
        p.ultimo = k.close;
      });
    });
    // stop out sul margine
    if (c.stopOut) {
      var rr = riepilogo(c);
      while (c.posizioni.length && rr.margine > 0 && rr.equity < rr.margine * 0.5) {
        var worst = c.posizioni.slice().sort(function (a, b) { return a.upnl - b.upnl; })[0];
        chiudi(c, worst.id, worst.ultimo || worst.entrata, SB.dati.cambioNoto(worst.str.c, c.valuta) || worst.fxIn, now(), 'stopout');
        rr = riepilogo(c); eventi++;
      }
    }
    if (eventi) salva();
    return eventi;
  }

  function annulla(c, ordId, motivo) {
    var o = c.ordini.find(function (x) { return x.id === ordId; });
    if (!o) return;
    c.ordini = c.ordini.filter(function (x) { return x.id !== ordId; });
    o.stato = motivo || 'annullato';
    c.storicoOrdini = (c.storicoOrdini || []).concat([Object.assign({}, o, { chiuso: now() })]).slice(-300);
    emit('annullato', { conto: c, testo: 'Ordine ' + o.str.s + ' ' + (motivo || 'annullato') });
    salva();
  }

  /* ---------- Validazione e invio ordini ---------- */
  function valida(o, rif) {
    if (!(o.qta > 0)) return 'Inserisci una quantità maggiore di zero';
    if (o.tipo !== 'market' && !(o.prezzo > 0)) return 'Inserisci il prezzo dell\'ordine';
    var e = o.tipo === 'market' ? rif : o.prezzo;
    if (o.tipo === 'limit' && rif) {
      if (o.lato === 'buy' && o.prezzo > rif * 1.0000001) return 'Un limite in acquisto va sotto il prezzo attuale (usa uno stop per comprare sopra)';
      if (o.lato === 'sell' && o.prezzo < rif * 0.9999999) return 'Un limite in vendita va sopra il prezzo attuale (usa uno stop per vendere sotto)';
    }
    if (o.tipo === 'stop' && rif) {
      if (o.lato === 'buy' && o.prezzo < rif) return 'Uno stop in acquisto va sopra il prezzo attuale';
      if (o.lato === 'sell' && o.prezzo > rif) return 'Uno stop in vendita va sotto il prezzo attuale';
    }
    if (e) {
      if (o.sl && (o.lato === 'buy' ? o.sl >= e : o.sl <= e)) return 'Lo stop loss deve stare ' + (o.lato === 'buy' ? 'sotto' : 'sopra') + ' il prezzo di entrata';
      if (o.tp && (o.lato === 'buy' ? o.tp <= e : o.tp >= e)) return 'Il take profit deve stare ' + (o.lato === 'buy' ? 'sopra' : 'sotto') + ' il prezzo di entrata';
    }
    if (o.trail && !(o.trail > 0 && o.trail < 90)) return 'Il trailing stop va indicato in % (es. 2)';
    return null;
  }

  function invia(o, rif, fx) {
    var c = conto();
    var err = valida(o, rif);
    if (err) return { errore: err };
    o.id = uid(); o.creato = now(); o.stato = 'attivo';
    if (o.tipo === 'market') {
      if (!rif) return { errore: 'Prezzo attuale non disponibile' };
      var r = apri(c, o, rif, fx, o.creato, true);
      if (r.errore) return r;
      c.storicoOrdini = (c.storicoOrdini || []).concat([Object.assign({}, o, { stato: 'eseguito', esito: 'Eseguito a ' + fmtP(r.pos.entrata), chiuso: o.creato })]).slice(-300);
      salva(true);
      return r;
    }
    c.ordini.push(o);
    if (!c.ultimoControllo[o.str.id]) c.ultimoControllo[o.str.id] = o.creato;
    emit('inviato', { conto: c, testo: 'Ordine ' + (o.tipo === 'limit' ? 'limite' : 'stop') + ' ' + o.str.s + ' a ' + fmtP(o.prezzo) + ' in attesa' });
    salva(true);
    return { ordine: o };
  }

  function modificaPos(posId, campi) {
    var c = conto(), p = c.posizioni.find(function (x) { return x.id === posId; });
    if (!p) return 'Posizione non trovata';
    var ref = p.ultimo || p.entrata, long = p.lato === 'buy';
    if (campi.sl != null && campi.sl !== '' && (long ? campi.sl >= ref : campi.sl <= ref)) return 'Lo stop loss deve stare ' + (long ? 'sotto' : 'sopra') + ' il prezzo attuale';
    if (campi.tp != null && campi.tp !== '' && (long ? campi.tp <= ref : campi.tp >= ref)) return 'Il take profit deve stare ' + (long ? 'sopra' : 'sotto') + ' il prezzo attuale';
    ['sl', 'tp', 'trail'].forEach(function (k) { if (k in campi) p[k] = campi[k] === '' || campi[k] == null ? null : +campi[k]; });
    if (p.trail) p.best = long ? Math.max(p.best, ref) : Math.min(p.best, ref);
    salva(true);
    return null;
  }
  function modificaOrd(ordId, campi) {
    var c = conto(), o = c.ordini.find(function (x) { return x.id === ordId; });
    if (!o) return 'Ordine non trovato';
    var nuovo = Object.assign({}, o, campi);
    var err = valida(nuovo, null);
    if (err) return err;
    Object.assign(o, campi);
    salva(true);
    return null;
  }

  /* ---------- Statistiche ---------- */
  function statistiche(c) {
    c = c || conto();
    var t = c.chiusi.slice().sort(function (a, b) { return a.chiuso - b.chiuso; });
    var vinti = t.filter(function (x) { return x.netto > 0; }), persi = t.filter(function (x) { return x.netto <= 0; });
    var sv = vinti.reduce(function (s, x) { return s + x.netto; }, 0), sp = persi.reduce(function (s, x) { return s + x.netto; }, 0);
    var eq = c.capitale, peak = eq, dd = 0, curva = [{ time: c.creato, value: eq }];
    var mesi = {}, perStr = {}, durata = 0;
    t.forEach(function (x) {
      eq += x.netto; peak = Math.max(peak, eq); dd = Math.max(dd, (peak - eq) / peak * 100);
      var tt = Math.max(Math.floor(x.chiuso), curva[curva.length - 1].time + 1);
      curva.push({ time: tt, value: r2(eq) });
      var d = new Date(x.chiuso * 1000), m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      mesi[m] = (mesi[m] || 0) + x.netto;
      var s = perStr[x.str.s] = perStr[x.str.s] || { s: x.str.s, n: 0, netto: 0, vinti: 0 };
      s.n++; s.netto += x.netto; if (x.netto > 0) s.vinti++;
      durata += x.chiuso - x.aperto;
    });
    var somma = function (k) { return t.reduce(function (s, x) { return s + (x[k] || 0); }, 0); };
    return {
      n: t.length, vinti: vinti.length, persi: persi.length, winRate: t.length ? vinti.length / t.length * 100 : 0,
      profitFactor: sp ? sv / -sp : (sv ? Infinity : 0), mediaVinti: vinti.length ? sv / vinti.length : 0, mediaPersi: persi.length ? sp / persi.length : 0,
      aspettativa: t.length ? (sv + sp) / t.length : 0, maxDD: dd, curva: curva, mesi: mesi,
      perStr: Object.keys(perStr).map(function (k) { return perStr[k]; }).sort(function (a, b) { return b.netto - a.netto; }),
      migliore: t.reduce(function (m, x) { return !m || x.netto > m.netto ? x : m; }, null), peggiore: t.reduce(function (m, x) { return !m || x.netto < m.netto ? x : m; }, null),
      durataMedia: t.length ? durata / t.length : 0,
      lordo: somma('lordo'), comm: somma('commIn') + somma('commOut'), tobin: somma('tobin'), bollo: somma('bollo'), overnight: somma('overnight'), imposte: somma('imposta'), netto: sv + sp,
      zainettoUsato: somma('zainettoUsato'), minus: somma('minusvalenza')
    };
  }

  /* ---------- Formattazione ---------- */
  function fmt(x, dec) { if (x == null || isNaN(x)) return '–'; return Number(x).toLocaleString('it-IT', { minimumFractionDigits: dec == null ? 2 : dec, maximumFractionDigits: dec == null ? 2 : dec }); }
  function decimali(p) { p = Math.abs(p); return p >= 1000 ? 2 : p >= 10 ? 2 : p >= 1 ? 4 : p >= 0.01 ? 5 : 8; }
  function fmtP(p) { if (p == null || isNaN(p)) return '–'; return fmt(p, decimali(p)); }

  /* ---------- Esportazioni ---------- */
  function csv(c) {
    c = c || conto();
    var head = ['Apertura', 'Chiusura', 'Simbolo', 'Nome', 'Lato', 'Quantità', 'Leva', 'Prezzo entrata', 'Prezzo uscita', 'Valuta', 'Cambio entrata', 'Cambio uscita', 'P/L lordo', 'Comm. entrata', 'Comm. uscita', 'Tobin', 'Bollo', 'Overnight', 'Imponibile', 'Zainetto usato', 'Minus a zainetto', 'Imposta', 'Netto', 'Motivo'];
    var d = function (s) { return new Date(s * 1000).toLocaleString('it-IT'); };
    var n = function (x) { return String(Math.round((x || 0) * 1e6) / 1e6).replace('.', ','); };
    var rows = c.chiusi.map(function (t) {
      return [d(t.aperto), d(t.chiuso), t.str.s, (t.str.n || '').replace(/;/g, ','), t.lato === 'buy' ? 'Long' : 'Short', n(t.qta), t.leva, n(t.entrata), n(t.uscita), t.str.c, n(t.fxIn), n(t.fxOut), n(t.lordo), n(t.commIn), n(t.commOut), n(t.tobin), n(t.bollo), n(t.overnight), n(t.imponibile), n(t.zainettoUsato), n(t.minusvalenza), n(t.imposta), n(t.netto), t.motivo].join(';');
    });
    return '﻿' + head.join(';') + '\n' + rows.join('\n');
  }

  SB.motore = {
    carica: carica, salva: salva, stato: function () { return S; }, conto: conto, nuovoConto: nuovoConto, COSTI_PRESET: COSTI_PRESET, FISCO_DEF: FISCO_DEF,
    info: info, setInfo: setInfo, classeFiscale: classeFiscale, classeCosti: classeCosti, commissione: commissione, prezzoEseguito: prezzoEseguito, nozionale: nozionale,
    riepilogo: riepilogo, processa: processa, invia: invia, annulla: annulla, chiudi: chiudi, modificaPos: modificaPos, modificaOrd: modificaOrd,
    statistiche: statistiche, zainettoDisponibile: zainettoDisponibile, csv: csv, valida: valida, pnlPos: pnlPos, italiana: italiana,
    on: function (f) { listeners.push(f); }, fmt: fmt, fmtP: fmtP, decimali: decimali, uid: uid, now: now, nomeMotivo: nomeMotivo
  };
})();
