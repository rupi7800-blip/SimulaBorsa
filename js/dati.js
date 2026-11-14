/* =========================================================
   SimulaBorsa — dati.js
   Fonti dati gratuite dal web:
   - Yahoo Finance (azioni, ETF, indici, forex, futures, materie prime,
     tassi, cripto) tramite proxy CORS
   - Binance (cripto in tempo reale, CORS nativo)
   - Twelve Data (facoltativo, con chiave gratuita)
   - Demo (dati simulati, funziona sempre anche offline)
   - Frankfurter/BCE per i cambi valuta
   ========================================================= */
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  var TF = {
    '1m':  { y: ['1m', '5d'],   b: '1m',  t: '1min',   sec: 60 },
    '5m':  { y: ['5m', '1mo'],  b: '5m',  t: '5min',   sec: 300 },
    '15m': { y: ['15m', '1mo'], b: '15m', t: '15min',  sec: 900 },
    '1h':  { y: ['60m', '1y'],  b: '1h',  t: '1h',     sec: 3600 },
    '4h':  { y: ['60m', '2y'],  b: '4h',  t: '4h',     sec: 14400, agg: 4 },
    '1D':  { y: ['1d', '5y'],   b: '1d',  t: '1day',   sec: 86400 },
    '1W':  { y: ['1wk', '10y'], b: '1w',  t: '1week',  sec: 604800 },
    '1M':  { y: ['1mo', 'max'], b: '1M',  t: '1month', sec: 2592000 }
  };
  var TF_LIST = Object.keys(TF);

  var DEFAULT_PROXIES = [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.cors.lol/?url=',
    'https://whateverorigin.org/get?url='
  ];
  var BINANCE = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];

  function cfg() { return (SB.impostazioniDati && SB.impostazioniDati()) || {}; }
  function proxies() {
    var c = cfg(), list = [];
    if (c.proxyPersonale) list.push(c.proxyPersonale);
    (c.proxies && c.proxies.length ? c.proxies : DEFAULT_PROXIES).forEach(function (p) { if (list.indexOf(p) < 0) list.push(p); });
    return list;
  }

  function timeout(ms) {
    if (window.AbortController) { var a = new AbortController(); setTimeout(function () { a.abort(); }, ms); return a.signal; }
    return undefined;
  }
  function getJSON(url, ms) {
    var stato = 0;
    return fetch(url, { signal: timeout(ms || 12000), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }).then(function (r) {
      stato = r.status;
      return r.text();
    }).then(function (t) {
      var j = null;
      try { j = JSON.parse(t); } catch (e) { /* non JSON */ }
      // errori di Yahoo (es. simbolo inesistente) arrivano come JSON con stato 404
      if (stato >= 200 && stato < 300 && j) return j;
      if (j && ((j.chart && j.chart.error) || (j.finance && j.finance.error))) return j;
      throw new Error(stato >= 300 || stato < 200 ? 'HTTP ' + stato : 'risposta non valida');
    }, function (e) {
      if (e && e.name === 'AbortError') throw new Error('tempo scaduto');
      if (e && /fetch|network|Load failed/i.test(e.message)) throw new Error('bloccato (rete, CORS o blocco pubblicità)');
      throw e;
    });
  }
  function anyOf(promises) {
    return new Promise(function (ok, ko) {
      var n = promises.length, errs = [];
      if (!n) return ko(new Error('Nessun proxy configurato'));
      promises.forEach(function (p, i) { p.then(ok, function (e) { errs[i] = e; if (--n === 0) ko(errs[errs.length - 1] || e); }); });
    });
  }
  function bust(url) { return url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Math.floor(Date.now() / 5000); }

  // proxy migliore ricordato tra una sessione e l'altra
  var bestProxyUrl = null;
  try { bestProxyUrl = localStorage.getItem('sb.proxy'); } catch (e) { /* no */ }
  var inVolo = {};
  function unProxy(p, url, ms) {
    return getJSON(p + encodeURIComponent(bust(url)), ms).then(function (j) {
      if (j && typeof j.contents === 'string') j = JSON.parse(j.contents);
      if (!j || typeof j !== 'object') throw new Error('risposta vuota');
      return j;
    });
  }
  function ricorda(p) { if (bestProxyUrl === p) return; bestProxyUrl = p; try { localStorage.setItem('sb.proxy', p); } catch (e) { /* no */ } }
  /* Prima il proxy che ha funzionato l'ultima volta (risposta veloce);
     se fallisce, tutti gli altri in parallelo: vince il primo che risponde. */
  function viaProxy(url) {
    if (inVolo[url]) return inVolo[url];
    var list = proxies();
    // il proxy personale ha sempre la precedenza
    var first = cfg().proxyPersonale || (list.indexOf(bestProxyUrl) >= 0 ? bestProxyUrl : list[0]);
    var rest = list.filter(function (p) { return p !== first; });
    var gara = function () {
      return anyOf(rest.map(function (p) { return unProxy(p, url, 12000).then(function (j) { ricorda(p); return j; }); }));
    };
    var pr = unProxy(first, url, 7000).then(function (j) { ricorda(first); return j; }, function (e) {
      return rest.length ? gara() : Promise.reject(e);
    }).catch(function (e) {
      throw new Error(navigator.onLine === false ? 'Sei offline' : 'Nessun proxy raggiungibile (' + (e && e.message) + ')');
    });
    inVolo[url] = pr;
    var pulisci = function () { delete inVolo[url]; };
    pr.then(pulisci, pulisci);
    return pr;
  }

  /* ---------- Cache dei grafici (ultimo scaricamento riuscito) ---------- */
  var CACHE_KEY = 'sb.cache', CACHE_MAX = 25;
  function cacheLeggi() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; } }
  function cacheSalva(k, r) {
    var c = cacheLeggi();
    c[k] = { t: Date.now(), r: { candles: r.candles.slice(-600), price: r.price, meta: r.meta } };
    var keys = Object.keys(c).sort(function (a, b) { return c[b].t - c[a].t; });
    keys.slice(CACHE_MAX).forEach(function (x) { delete c[x]; });
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {
      try { localStorage.removeItem(CACHE_KEY); } catch (e2) { /* no */ }
    }
  }

  /* ---------- Normalizzazione ---------- */
  function fixCcy(c) {
    if (c === 'GBp' || c === 'GBX') return { c: 'GBP', div: 100 };
    if (c === 'ZAc') return { c: 'ZAR', div: 100 };
    if (c === 'ILA') return { c: 'ILS', div: 100 };
    return { c: (c || 'USD').toUpperCase(), div: 1 };
  }
  var YTYPE = { EQUITY: 'azione', ETF: 'etf', INDEX: 'indice', CURRENCY: 'forex', FUTURE: 'futures', CRYPTOCURRENCY: 'cripto', MUTUALFUND: 'fondo', BOND: 'obbligazione', OPTION: 'opzione' };

  function aggrega(c, n) {
    if (n <= 1) return c;
    var out = [], cur = null, step = 3600 * n;
    c.forEach(function (k) {
      var b = Math.floor(k.time / step) * step;
      if (!cur || cur.time !== b) { cur = { time: b, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume || 0 }; out.push(cur); }
      else { cur.high = Math.max(cur.high, k.high); cur.low = Math.min(cur.low, k.low); cur.close = k.close; cur.volume += k.volume || 0; }
    });
    return out;
  }

  /* ---------- Yahoo ---------- */
  // Yahoo ha due server equivalenti: se uno è bloccato si prova l'altro
  function yahoo(u) {
    return viaProxy(u).catch(function (e) {
      var alt = u.indexOf('//query1.') > 0 ? u.replace('//query1.', '//query2.') : u.replace('//query2.', '//query1.');
      return viaProxy(alt).catch(function () { throw e; });
    });
  }
  var Y = {
    chart: function (sym, interval, range) {
      var u = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=' + interval + '&range=' + range + '&includePrePost=false';
      return yahoo(u).then(function (j) {
        var r = j && j.chart && j.chart.result && j.chart.result[0];
        if (!r) throw new Error((j && j.chart && j.chart.error && j.chart.error.description) || 'Simbolo non trovato');
        var m = r.meta || {}, f = fixCcy(m.currency), q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
        var ts = r.timestamp || [], out = [];
        for (var i = 0; i < ts.length; i++) {
          var o = q.open && q.open[i], h = q.high && q.high[i], l = q.low && q.low[i], c = q.close && q.close[i];
          if (o == null || h == null || l == null || c == null) continue;
          out.push({ time: ts[i], open: o / f.div, high: h / f.div, low: l / f.div, close: c / f.div, volume: (q.volume && q.volume[i]) || 0 });
        }
        // timestamp duplicati (ultima candela live)
        var clean = [];
        out.forEach(function (k) { if (clean.length && clean[clean.length - 1].time >= k.time) clean[clean.length - 1] = k; else clean.push(k); });
        return {
          candles: clean,
          price: m.regularMarketPrice != null ? m.regularMarketPrice / f.div : (clean.length ? clean[clean.length - 1].close : null),
          meta: { c: f.c, n: m.longName || m.shortName || m.symbol, t: YTYPE[m.instrumentType] || 'azione', x: m.fullExchangeName || m.exchangeName || '' }
        };
      });
    },
    search: function (q) {
      var u = 'https://query2.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(q) + '&quotesCount=20&newsCount=0&listsCount=0';
      return yahoo(u).then(function (j) {
        return ((j && j.quotes) || []).filter(function (x) { return x.symbol; }).map(function (x) {
          return { id: 'Y:' + x.symbol, p: 'Y', s: x.symbol, n: x.longname || x.shortname || x.symbol, t: YTYPE[x.quoteType] || 'azione', x: x.exchDisp || x.exchange || '' };
        });
      });
    }
  };

  /* ---------- Binance ---------- */
  var bestBin = 0;
  function binGet(path) {
    var idx = 0;
    function next(err) {
      if (idx >= BINANCE.length) return Promise.reject(err || new Error('Binance non raggiungibile'));
      var k = (bestBin + idx++) % BINANCE.length;
      return getJSON(BINANCE[k] + path, 10000).then(function (j) { bestBin = k; return j; }).catch(next);
    }
    return next();
  }
  var QUOTES = ['USDT', 'USDC', 'FDUSD', 'TUSD', 'BUSD', 'EUR', 'BTC', 'ETH', 'BNB', 'TRY', 'BRL', 'JPY', 'GBP'];
  function binQuote(sym) {
    for (var i = 0; i < QUOTES.length; i++) if (sym.length > QUOTES[i].length && sym.slice(-QUOTES[i].length) === QUOTES[i]) return QUOTES[i];
    return 'USDT';
  }
  function binCcy(q) { return /^(USDT|USDC|FDUSD|TUSD|BUSD)$/.test(q) ? 'USD' : q; }
  var binList = null;
  var B = {
    klines: function (sym, interval, opts) {
      var u = '/api/v3/klines?symbol=' + sym + '&interval=' + interval + '&limit=' + ((opts && opts.limit) || 1000) + (opts && opts.start ? '&startTime=' + opts.start : '');
      return binGet(u).then(function (a) {
        return a.map(function (k) { return { time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }; });
      });
    },
    chart: function (sym, tf) {
      return B.klines(sym, TF[tf].b).then(function (c) {
        var q = binQuote(sym);
        return { candles: c, price: c.length ? c[c.length - 1].close : null, meta: { c: binCcy(q), n: sym.slice(0, -q.length) + '/' + q, t: 'cripto', x: 'Binance' } };
      });
    },
    price: function (sym) { return binGet('/api/v3/ticker/price?symbol=' + sym).then(function (j) { return +j.price; }); },
    search: function (q) {
      var load = binList ? Promise.resolve(binList) : binGet('/api/v3/ticker/price').then(function (a) { binList = a.map(function (x) { return x.symbol; }); return binList; });
      q = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return load.then(function (list) {
        var res = list.filter(function (s) { return s.indexOf(q) === 0; });
        res.sort(function (a, b) {
          var pa = /USDT$|EUR$/.test(a) ? 0 : 1, pb = /USDT$|EUR$/.test(b) ? 0 : 1;
          return pa - pb || a.length - b.length;
        });
        return res.slice(0, 12).map(function (s) {
          var qq = binQuote(s);
          return { id: 'B:' + s, p: 'B', s: s, n: s.slice(0, -qq.length) + '/' + qq, t: 'cripto', x: 'Binance', c: binCcy(qq) };
        });
      });
    }
  };

  /* ---------- Twelve Data (chiave gratuita) ---------- */
  var T = {
    key: function () { var k = cfg().twelveKey; if (!k) throw new Error('Inserisci la chiave Twelve Data nelle Impostazioni'); return k; },
    chart: function (sym, tf) {
      var u = 'https://api.twelvedata.com/time_series?symbol=' + encodeURIComponent(sym) + '&interval=' + TF[tf].t + '&outputsize=1000&timezone=UTC&apikey=' + T.key();
      return getJSON(u).then(function (j) {
        if (j.status === 'error') throw new Error(j.message || 'Errore Twelve Data');
        var c = (j.values || []).map(function (v) {
          return { time: Math.floor(Date.parse(v.datetime.replace(' ', 'T') + 'Z') / 1000), open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +(v.volume || 0) };
        }).reverse();
        var m = j.meta || {};
        var t = /ETF/i.test(m.type) ? 'etf' : /Physical Currency|Forex/i.test(m.type) ? 'forex' : /Digital Currency/i.test(m.type) ? 'cripto' : /Index/i.test(m.type) ? 'indice' : 'azione';
        return { candles: c, price: c.length ? c[c.length - 1].close : null, meta: { c: (m.currency || m.currency_quote || 'USD').toUpperCase(), n: sym, t: t, x: m.exchange || '' } };
      });
    },
    search: function (q) {
      return getJSON('https://api.twelvedata.com/symbol_search?symbol=' + encodeURIComponent(q) + '&outputsize=15').then(function (j) {
        return (j.data || []).map(function (x) {
          return { id: 'T:' + x.symbol + (x.exchange ? '|' + x.exchange : ''), p: 'T', s: x.symbol, n: x.instrument_name, t: /ETF/i.test(x.instrument_type) ? 'etf' : 'azione', x: x.exchange, c: x.currency };
        });
      });
    }
  };

  /* ---------- Demo: prezzi simulati deterministici ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function noise(seed, x) { var n = Math.sin(seed * 0.0001 + x * 12.9898) * 43758.5453; return n - Math.floor(n); }
  function smooth(seed, t, period) {
    var x = t / period, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return (noise(seed, i) * (1 - u) + noise(seed, i + 1) * u) - 0.5;
  }
  var DEMO = {
    DEMO_AZ: { n: 'Demo Azione SpA', t: 'azione', c: 'EUR', base: 25, vol: 1 },
    DEMO_US: { n: 'Demo Tech Inc.', t: 'azione', c: 'USD', base: 180, vol: 1.3 },
    DEMO_CR: { n: 'Demo Coin / USD', t: 'cripto', c: 'USD', base: 60000, vol: 2.5 },
    DEMO_FX: { n: 'Demo EUR/USD', t: 'forex', c: 'USD', base: 1.08, vol: 0.25 },
    DEMO_ETF: { n: 'Demo ETF Mondo', t: 'etf', c: 'EUR', base: 100, vol: 0.6 }
  };
  function demoPrice(sym, t) {
    var d = DEMO[sym] || DEMO.DEMO_AZ, s = hash(sym), v = d.vol;
    var lg = 0.18 * v * smooth(s, t, 86400 * 40) + 0.07 * v * smooth(s + 1, t, 86400 * 6) + 0.025 * v * smooth(s + 2, t, 3600 * 8) +
      0.008 * v * smooth(s + 3, t, 3600) + 0.003 * v * smooth(s + 4, t, 300) + 0.0012 * v * smooth(s + 5, t, 45);
    return d.base * Math.exp(lg);
  }
  var D = {
    candles: function (sym, sec, from, to) {
      var out = [], start = Math.floor(from / sec) * sec, step = Math.max(15, sec / 8);
      for (var b = start; b <= to; b += sec) {
        var o = demoPrice(sym, b), h = o, l = o, c = o;
        for (var t = b + step; t < b + sec && t <= to; t += step) { c = demoPrice(sym, t); if (c > h) h = c; if (c < l) l = c; }
        if (b + sec <= to) { c = demoPrice(sym, b + sec - 1); h = Math.max(h, c); l = Math.min(l, c); }
        else { c = demoPrice(sym, to); h = Math.max(h, c); l = Math.min(l, c); }
        out.push({ time: b, open: o, high: h, low: l, close: c, volume: Math.round(1000 + 9000 * noise(hash(sym), b)) });
      }
      return out;
    },
    chart: function (sym, tf) {
      var d = DEMO[sym] || DEMO.DEMO_AZ, now = Math.floor(Date.now() / 1000), sec = TF[tf].sec;
      var c = D.candles(sym, sec, now - sec * 400, now);
      return Promise.resolve({ candles: c, price: demoPrice(sym, now), meta: { c: d.c, n: d.n, t: d.t, x: 'Simulato' } });
    }
  };

  /* ---------- API pubblica ---------- */
  function parseId(id) {
    var p = id.slice(0, 1), s = id.slice(2), ex = '';
    if (p === 'T' && s.indexOf('|') > 0) { ex = s.split('|')[1]; s = s.split('|')[0]; }
    return { p: p, s: s, ex: ex };
  }
  function tdSym(id) { var k = parseId(id); return k.s + (k.ex ? ':' + k.ex : ''); }

  SB.dati = {
    TF: TF, TF_LIST: TF_LIST, DEFAULT_PROXIES: DEFAULT_PROXIES, DEMO: DEMO,

    /* candele per il grafico */
    grafico: function (id, tf) {
      var k = parseId(id), def = TF[tf], p;
      if (k.p === 'D') return D.chart(k.s, tf);
      if (k.p === 'B') p = B.chart(k.s, tf);
      else if (k.p === 'T') p = T.chart(tdSym(id), tf);
      else p = Y.chart(k.s, def.y[0], def.y[1]).then(function (r) { if (def.agg) r.candles = aggrega(r.candles, def.agg); return r; });
      var key = id + '|' + tf;
      return p.then(function (r) {
        if (r.candles && r.candles.length) cacheSalva(key, r);
        return r;
      }, function (e) {
        // se il download fallisce mostro l'ultimo grafico salvato
        var c = cacheLeggi()[key];
        if (!c) throw e;
        var r = c.r; r.cache = c.t; r.errore = e.message;
        return r;
      });
    },

    /* ultimo prezzo */
    prezzo: function (id) {
      var k = parseId(id);
      if (k.p === 'B') return B.price(k.s);
      if (k.p === 'D') return Promise.resolve(demoPrice(k.s, Date.now() / 1000));
      if (k.p === 'T') return getJSON('https://api.twelvedata.com/price?symbol=' + encodeURIComponent(tdSym(id)) + '&apikey=' + T.key()).then(function (j) { if (!j.price) throw new Error(j.message || 'Prezzo non disponibile'); return +j.price; });
      return Y.chart(k.s, '1m', '1d').then(function (r) { return r.price; });
    },

    /* candele a partire da un istante (per eseguire ordini mentre l'app era chiusa) */
    candeleDa: function (id, sinceSec) {
      var k = parseId(id), now = Date.now() / 1000, gap = now - sinceSec;
      var filt = function (c) { return c.filter(function (x) { return x.time + 1 > sinceSec - 60; }); };
      if (k.p === 'D') {
        var sec = gap < 16 * 3600 ? 60 : gap < 10 * 86400 ? 900 : 3600;
        return Promise.resolve(D.candles(k.s, sec, Math.max(sinceSec, now - sec * 2000), now));
      }
      if (k.p === 'B') {
        var iv = gap < 16 * 3600 ? '1m' : gap < 10 * 86400 ? '15m' : gap < 40 * 86400 ? '1h' : '1d';
        return B.klines(k.s, iv, { start: Math.floor(sinceSec * 1000) - 60000 });
      }
      if (k.p === 'T') {
        var tf = gap < 16 * 3600 ? '1m' : gap < 10 * 86400 ? '15m' : '1h';
        return T.chart(tdSym(id), tf).then(function (r) { return filt(r.candles); });
      }
      var y = gap < 5 * 86400 ? ['1m', '5d'] : gap < 55 * 86400 ? ['15m', '60d'] : ['1d', '2y'];
      return Y.chart(k.s, y[0], y[1]).then(function (r) { return filt(r.candles); });
    },

    /* quotazioni per la lista: {id: {price, prev}} */
    quotazioni: function (ids) {
      var out = {}, y = [], b = [], jobs = [];
      ids.forEach(function (id) {
        var k = parseId(id);
        if (k.p === 'Y') y.push(k.s);
        else if (k.p === 'B') b.push(k.s);
        else if (k.p === 'D') { var n = Date.now() / 1000; out[id] = { price: demoPrice(k.s, n), prev: demoPrice(k.s, n - 86400) }; }
        else jobs.push(SB.dati.prezzo(id).then(function (p) { out[id] = { price: p, prev: null }; }).catch(function () {}));
      });
      if (b.length) {
        jobs.push(binGet('/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(b))).then(function (a) {
          a.forEach(function (x) { out['B:' + x.symbol] = { price: +x.lastPrice, prev: +x.prevClosePrice || (+x.lastPrice - +x.priceChange) }; });
        }).catch(function () {}));
      }
      for (var i = 0; i < y.length; i += 20) (function (chunk) {
        var u = 'https://query1.finance.yahoo.com/v7/finance/spark?symbols=' + chunk.map(encodeURIComponent).join(',') + '&range=1d&interval=5m';
        jobs.push(yahoo(u).then(function (j) {
          if (j && j.spark && j.spark.result) {
            j.spark.result.forEach(function (r) {
              var m = r.response && r.response[0] && r.response[0].meta; if (!m) return;
              var f = fixCcy(m.currency);
              out['Y:' + r.symbol] = { price: m.regularMarketPrice / f.div, prev: (m.chartPreviousClose || m.previousClose) / f.div };
            });
          } else if (j) {
            Object.keys(j).forEach(function (s) {
              var r = j[s]; if (!r || !r.close) return;
              var cl = r.close.filter(function (x) { return x != null; });
              out['Y:' + s] = { price: cl[cl.length - 1], prev: r.chartPreviousClose || r.previousClose };
            });
          }
        }).catch(function () {
          // ripiego: una richiesta per simbolo
          return Promise.all(chunk.map(function (s) {
            return Y.chart(s, '1d', '5d').then(function (r) {
              var c = r.candles; out['Y:' + s] = { price: r.price, prev: c.length > 1 ? c[c.length - 2].close : null };
            }).catch(function () {});
          }));
        }));
      })(y.slice(i, i + 20));
      return Promise.all(jobs).then(function () { return out; });
    },

    cerca: function (q) {
      q = (q || '').trim();
      if (!q) return Promise.resolve([]);
      var jobs = [
        Y.search(q).catch(function () { return []; }),
        B.search(q).catch(function () { return []; })
      ];
      if (cfg().twelveKey) jobs.push(T.search(q).catch(function () { return []; }));
      var demo = Object.keys(DEMO).filter(function (s) { return (s + ' ' + DEMO[s].n).toLowerCase().indexOf(q.toLowerCase()) >= 0; })
        .map(function (s) { return { id: 'D:' + s, p: 'D', s: s, n: DEMO[s].n, t: DEMO[s].t, x: 'Simulato', c: DEMO[s].c }; });
      return Promise.all(jobs).then(function (r) {
        var all = demo.concat(r[0], r[1], r[2] || []), seen = {};
        return all.filter(function (x) { if (seen[x.id]) return false; seen[x.id] = 1; return true; });
      });
    },

    /* cambio: 1 unità di "da" = ? unità di "a" */
    cambio: function (da, a) {
      da = (da || 'EUR').toUpperCase(); a = (a || 'EUR').toUpperCase();
      if (da === a) return Promise.resolve(1);
      var key = da + a, c = FX[key];
      if (c && Date.now() - c.t < 3600 * 1000) return Promise.resolve(c.v);
      function save(v) { if (!(v > 0)) throw new Error('cambio'); FX[key] = { v: v, t: Date.now() }; saveFx(); return v; }
      var fiat = /^(USD|EUR|GBP|CHF|JPY|CAD|AUD|NZD|SEK|NOK|DKK|PLN|CZK|HUF|HKD|SGD|CNY|INR|KRW|BRL|MXN|ZAR|TRY|ILS|TWD|THB|IDR|MYR|PHP|RON|ISK)$/;
      var p;
      if (fiat.test(da) && fiat.test(a)) {
        p = getJSON('https://api.frankfurter.dev/v1/latest?base=' + da + '&symbols=' + a, 8000)
          .catch(function () { return getJSON('https://api.frankfurter.app/latest?from=' + da + '&to=' + a, 8000); })
          .then(function (j) { return j.rates[a]; })
          .catch(function () { return Y.chart(da + a + '=X', '1d', '5d').then(function (r) { return r.price; }); });
      } else {
        // valute cripto (es. BTC) via Binance
        p = B.price(da + a).catch(function () {
          return B.price(da + 'USDT').then(function (usd) { return SB.dati.cambio('USD', a).then(function (r) { return usd * r; }); });
        });
      }
      return p.then(save).catch(function () {
        if (c) return c.v;
        var st = { USDEUR: 0.92, GBPEUR: 1.17, CHFEUR: 1.05, JPYEUR: 0.0062 };
        if (st[key]) return st[key];
        throw new Error('Cambio ' + da + '/' + a + ' non disponibile');
      });
    },
    cambioNoto: function (da, a) { if (da === a) return 1; var c = FX[(da || '') + (a || '')]; return c ? c.v : null; },

    /* prova ogni proxy separatamente: {proxy: [{nome, esito, ms}], ...} */
    prova: function () {
      var t0 = Date.now();
      var yu = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5d';
      var px = Promise.all(proxies().map(function (p) {
        var t = Date.now();
        return unProxy(p, yu, 12000).then(function (j) {
          if (!(j.chart && j.chart.result)) throw new Error('risposta inattesa');
          return { nome: p.split('/')[2], esito: 'ok', ms: Date.now() - t, ok: true, url: p };
        }).catch(function (e) { return { nome: p.split('/')[2], esito: e.message, ms: Date.now() - t, ok: false, url: p }; });
      })).then(function (a) {
        var best = a.filter(function (x) { return x.ok; }).sort(function (x, y) { return x.ms - y.ms; })[0];
        if (best) ricorda(best.url);
        return a;
      });
      return Promise.all([
        px,
        B.price('BTCUSDT').then(function () { return 'ok'; }).catch(function (e) { return 'errore: ' + e.message; }),
        cfg().twelveKey ? T.chart('AAPL', '1D').then(function () { return 'ok'; }).catch(function (e) { return 'errore: ' + e.message; }) : Promise.resolve('chiave non inserita'),
        SB.dati.cambio('USD', 'EUR').then(function (v) { return 'ok (1 USD = ' + v.toFixed(4) + ' EUR)'; }).catch(function (e) { return 'errore: ' + e.message; })
      ]).then(function (r) {
        var ok = r[0].filter(function (x) { return x.ok; }).length;
        return { proxy: r[0], yahoo: ok ? 'ok (' + ok + ' proxy su ' + r[0].length + ')' : 'errore: nessun proxy funziona', binance: r[1], twelve: r[2], cambi: r[3], online: navigator.onLine !== false, ms: Date.now() - t0 };
      });
    },
    parseId: parseId
  };

  var FX = {};
  try { FX = JSON.parse(localStorage.getItem('sb.fx') || '{}'); } catch (e) { FX = {}; }
  function saveFx() { try { localStorage.setItem('sb.fx', JSON.stringify(FX)); } catch (e) { /* pieno */ } }
})();
