/* =========================================================
   SimulaBorsa — grafico.js
   Grafico a candele (TradingView Lightweight Charts) con volumi,
   medie mobili, Bollinger, RSI, linee di prezzo trascinabili
   (entrata, stop loss, take profit, ordini) e tocco per scegliere un prezzo.
   ========================================================= */
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var LWC = window.LightweightCharts;
  var TZ = -new Date().getTimezoneOffset() * 60; // il grafico mostra l'ora locale

  function sma(c, n) { var o = [], s = 0; for (var i = 0; i < c.length; i++) { s += c[i].close; if (i >= n) s -= c[i - n].close; if (i >= n - 1) o.push({ time: c[i].time, value: s / n }); } return o; }
  function ema(c, n) { var o = [], k = 2 / (n + 1), e = null; for (var i = 0; i < c.length; i++) { e = e == null ? c[i].close : c[i].close * k + e * (1 - k); if (i >= n - 1) o.push({ time: c[i].time, value: e }); } return o; }
  function boll(c, n, m) {
    var up = [], lo = [];
    for (var i = n - 1; i < c.length; i++) {
      var s = 0, q = 0;
      for (var j = i - n + 1; j <= i; j++) s += c[j].close;
      var mu = s / n;
      for (j = i - n + 1; j <= i; j++) q += Math.pow(c[j].close - mu, 2);
      var sd = Math.sqrt(q / n);
      up.push({ time: c[i].time, value: mu + m * sd }); lo.push({ time: c[i].time, value: mu - m * sd });
    }
    return [up, lo];
  }
  function rsi(c, n) {
    var o = [], g = 0, l = 0;
    for (var i = 1; i < c.length; i++) {
      var d = c[i].close - c[i - 1].close, gu = Math.max(d, 0), ld = Math.max(-d, 0);
      if (i <= n) { g += gu / n; l += ld / n; if (i < n) continue; }
      else { g = (g * (n - 1) + gu) / n; l = (l * (n - 1) + ld) / n; }
      o.push({ time: c[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
    }
    return o;
  }

  /* CUSUM sulla varianza (a due lati) sui rendimenti logaritmici.
     z = r² / σ²base − 1, con σ²base = media di r² nelle n candele precedenti.
     S+ = max(0, S+ + z − k)  → la volatilità aumenta
     S− = max(0, S− − z − k)  → la volatilità diminuisce
     Quando una delle due supera h si segnala un cambio e si azzera. */
  function cusumVar(c, n, k, h) {
    var up = [], dn = [], alarms = [], r2 = [], sp = 0, sm = 0, sum = 0;
    for (var i = 1; i < c.length; i++) {
      var a = c[i - 1].close, b = c[i].close;
      var r = a > 0 && b > 0 ? Math.log(b / a) : 0, q = r * r;
      if (r2.length >= n) {
        var base = sum / n;
        if (base > 0) {
          var z = Math.min(q / base - 1, 50); // limita i salti estremi (gap)
          sp = Math.max(0, sp + z - k); sm = Math.max(0, sm - z - k);
          up.push({ time: c[i].time, value: sp }); dn.push({ time: c[i].time, value: sm });
          if (sp > h) { alarms.push({ time: c[i].time, su: true }); sp = 0; sm = 0; }
          else if (sm > h) { alarms.push({ time: c[i].time, su: false }); sp = 0; sm = 0; }
        }
        sum -= r2[r2.length - n];
      }
      r2.push(q); sum += q;
    }
    return { up: up, dn: dn, alarms: alarms };
  }

  function Grafico(el, opzioni) {
    var self = this;
    this.el = el; this.op = opzioni || {};
    this.ind = Object.assign({ volume: true, sma20: false, sma50: false, ema20: false, bb: false, rsi: false, cusum: false, cusumN: 50, cusumK: 0.5, cusumH: 5 }, this.op.ind || {});
    this._mkUtente = []; this._mkCusum = [];
    this.tipo = 'candele';
    this.dati = [];
    this.linee = {}; // id -> {line, cfg, handle}
    this.pick = null;
    var css = getComputedStyle(document.documentElement);
    var col = function (v, d) { return (css.getPropertyValue(v) || d).trim() || d; };
    this.col = { up: col('--up', '#22c38e'), down: col('--down', '#ff5d6c'), text: col('--muted', '#9aa6c0'), grid: col('--grid', 'rgba(140,160,200,.08)'), bg: col('--panel', '#121a2b') };
    this.chart = LWC.createChart(el, {
      autoSize: true,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: this.col.text, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      grid: { vertLines: { color: this.col.grid }, horzLines: { color: this.col.grid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.2 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: LWC.CrosshairMode.Normal },
      handleScale: { axisPressedMouseMove: { time: true, price: true } },
      // il formato dei prezzi è sulla serie principale (così RSI e CUSUM hanno il loro)
      localization: { locale: 'it-IT' }
    });
    this._serie();
    this.chart.subscribeClick(function (param) {
      if (!self.pick || !param.point) return;
      var price = self.main.coordinateToPrice(param.point.y);
      if (price == null) return;
      var f = self.pick; self.pick = null; el.classList.remove('picking');
      f(price);
    });
    this.chart.subscribeCrosshairMove(function (param) {
      if (!self.op.onLegend) return;
      var d = param && param.seriesData && param.seriesData.get(self.main);
      self.op.onLegend(d || null);
    });
    // contenitore delle maniglie trascinabili
    this.hl = document.createElement('div');
    this.hl.className = 'chart-handles';
    el.appendChild(this.hl);
    var loop = function () { self._posiziona(); self._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  }

  Grafico.prototype._serie = function () {
    var ch = this.chart, c = this.col;
    if (this.main) ch.removeSeries(this.main);
    if (this.tipo === 'linea') this.main = ch.addLineSeries({ color: '#5b8cff', lineWidth: 2 });
    else if (this.tipo === 'area') this.main = ch.addAreaSeries({ lineColor: '#5b8cff', topColor: 'rgba(91,140,255,.35)', bottomColor: 'rgba(91,140,255,0)', lineWidth: 2 });
    else this.main = ch.addCandlestickSeries({ upColor: c.up, downColor: c.down, borderVisible: false, wickUpColor: c.up, wickDownColor: c.down });
    if (this._pf) this.main.applyOptions({ priceFormat: this._pf });
    // la scala dei prezzi include sempre entrata, stop loss e take profit
    var self = this;
    this.main.applyOptions({ autoscaleInfoProvider: function (orig) {
      var r = orig();
      if (!r || !r.priceRange) return r;
      Object.keys(self.linee).forEach(function (k) {
        var L = self.linee[k];
        if (!L.cfg.scala || L.dragging) return;
        r.priceRange.minValue = Math.min(r.priceRange.minValue, L.cfg.prezzo);
        r.priceRange.maxValue = Math.max(r.priceRange.maxValue, L.cfg.prezzo);
      });
      return r;
    } });
    // le linee di prezzo appartengono alla serie: vanno ricreate
    var old = this.linee; this.linee = {};
    Object.keys(old).forEach(function (k) { if (old[k].handle) old[k].handle.remove(); });
    this._ultimeLinee && this.linee_(this._ultimeLinee);
  };

  Grafico.prototype.setTipo = function (t) { this.tipo = t; this._serie(); this._disegna(); };

  Grafico.prototype.set = function (candles, decimali) {
    this.dati = candles.map(function (k) { return { time: k.time + TZ, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume }; });
    var d = decimali == null ? 2 : decimali;
    this.prec = d;
    this._mkUtente = []; // i marker vanno riagganciati alle nuove candele (li rimette app.js)
    this._pf = { type: 'custom', minMove: Math.pow(10, -d), formatter: function (p) { return SB.motore.fmtP(p); } };
    this.main.applyOptions({ priceFormat: this._pf });
    this._disegna();
    this.chart.timeScale().fitContent();
    var n = this.dati.length;
    if (n > 150) this.chart.timeScale().setVisibleLogicalRange({ from: n - 120, to: n + 5 });
  };

  Grafico.prototype._mainData = function () {
    if (this.tipo === 'candele') return this.dati;
    return this.dati.map(function (k) { return { time: k.time, value: k.close }; });
  };

  Grafico.prototype._disegna = function () {
    var ch = this.chart, self = this, c = this.dati;
    this.main.setData(this._mainData());
    (this.extra || []).forEach(function (s) { ch.removeSeries(s); });
    this.extra = [];
    var add = function (data, color, opts) { var s = ch.addLineSeries(Object.assign({ color: color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, opts || {})); s.setData(data); self.extra.push(s); return s; };
    var I = this.ind;
    if (I.sma20) add(sma(c, 20), '#f5b942');
    if (I.sma50) add(sma(c, 50), '#c77dff');
    if (I.ema20) add(ema(c, 20), '#3ad1e6');
    if (I.bb) { var b = boll(c, 20, 2); add(b[0], 'rgba(160,170,200,.7)', { lineStyle: 2 }); add(b[1], 'rgba(160,170,200,.7)', { lineStyle: 2 }); }
    // riquadri inferiori (dal basso): CUSUM, RSI
    var pane = [];
    if (I.cusum) pane.push('cusum');
    if (I.rsi) pane.push('rsi');
    var PH = pane.length > 1 ? 0.17 : 0.24, np = pane.length;
    var margini = function (id) { var i = pane.indexOf(id); return { top: 1 - (i + 1) * PH + 0.025, bottom: i * PH + 0.01 }; };
    if (I.volume) {
      var v = ch.addHistogramSeries({ priceScaleId: 'vol', priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false });
      v.setData(c.map(function (k) { return { time: k.time, value: k.volume || 0, color: k.close >= k.open ? 'rgba(34,195,142,.35)' : 'rgba(255,93,108,.35)' }; }));
      ch.priceScale('vol').applyOptions({ scaleMargins: np ? { top: 1 - np * PH - 0.12, bottom: np * PH + 0.01 } : { top: 0.84, bottom: 0 } });
      this.extra.push(v); this.vol = v;
    } else this.vol = null;
    if (I.rsi) {
      var r = add(rsi(c, 14), '#ff9f43', { priceScaleId: 'rsi', lastValueVisible: true, title: 'RSI', priceFormat: { type: 'custom', minMove: 0.1, formatter: function (v) { return v.toFixed(1).replace('.', ','); } } });
      ch.priceScale('rsi').applyOptions({ scaleMargins: margini('rsi') });
      r.createPriceLine({ price: 70, color: 'rgba(255,93,108,.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      r.createPriceLine({ price: 30, color: 'rgba(34,195,142,.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    }
    this._mkCusum = [];
    if (I.cusum) {
      var cs = cusumVar(c, Math.max(5, Math.round(I.cusumN) || 50), +I.cusumK >= 0 ? +I.cusumK : 0.5, +I.cusumH > 0 ? +I.cusumH : 5);
      var fmt2 = { type: 'custom', minMove: 0.01, formatter: function (v) { return v.toFixed(2).replace('.', ','); } };
      var su = add(cs.up, '#ff5d6c', { priceScaleId: 'cusum', lastValueVisible: true, title: 'CUSUM+', priceFormat: fmt2 });
      add(cs.dn, '#22c38e', { priceScaleId: 'cusum', lastValueVisible: true, title: 'CUSUM−', priceFormat: fmt2 });
      su.createPriceLine({ price: +I.cusumH || 5, color: 'rgba(245,185,66,.7)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'h' });
      ch.priceScale('cusum').applyOptions({ scaleMargins: margini('cusum') });
      this._mkCusum = cs.alarms.map(function (a) {
        return { time: a.time, position: a.su ? 'aboveBar' : 'belowBar', color: a.su ? '#ff9f43' : '#3ad1e6', shape: 'square', text: a.su ? 'σ↑' : 'σ↓', size: 0.6 };
      });
    }
    ch.priceScale('right').applyOptions({ scaleMargins: { top: 0.08, bottom: np ? np * PH + (I.volume ? 0.06 : 0.04) : (I.volume ? 0.2 : 0.06) } });
    this._applicaMarker();
  };

  Grafico.prototype.setInd = function (ind) { Object.assign(this.ind, ind); this._disegna(); };

  /* aggiorna l'ultima candela con un prezzo in tempo reale */
  Grafico.prototype.tick = function (price, sec, tfSec) {
    if (!this.dati.length || price == null) return;
    var t = sec + TZ, last = this.dati[this.dati.length - 1];
    var bucket = tfSec >= 86400 ? last.time : Math.floor(t / tfSec) * tfSec;
    if (bucket > last.time && tfSec < 86400) {
      last = { time: bucket, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price, volume: 0 };
      this.dati.push(last);
    } else { last.close = price; last.high = Math.max(last.high, price); last.low = Math.min(last.low, price); }
    this.main.update(this.tipo === 'candele' ? last : { time: last.time, value: last.close });
  };

  /* linee: [{id, prezzo, colore, titolo, stile, drag:fn(prezzo), tap:fn}] */
  Grafico.prototype.linee_ = function (arr) {
    var self = this, keep = {};
    this._ultimeLinee = arr;
    arr.forEach(function (cfg) {
      keep[cfg.id] = 1;
      var L = self.linee[cfg.id];
      var opts = { price: cfg.prezzo, color: cfg.colore, lineWidth: cfg.spessore || 2, lineStyle: cfg.stile == null ? 2 : cfg.stile, axisLabelVisible: true, title: cfg.titolo || '' };
      if (L) { if (!L.dragging) L.line.applyOptions(opts); L.cfg = cfg; }
      else { L = self.linee[cfg.id] = { line: self.main.createPriceLine(opts), cfg: cfg }; }
      if (cfg.drag && !L.handle) self._maniglia(L);
      if (!cfg.drag && L.handle) { L.handle.remove(); L.handle = null; }
      if (L.handle) { L.handle.querySelector('span').textContent = cfg.etichetta || cfg.titolo || ''; L.handle.style.setProperty('--c', cfg.colore); }
    });
    Object.keys(this.linee).forEach(function (k) {
      if (keep[k]) return;
      self.main.removePriceLine(self.linee[k].line);
      if (self.linee[k].handle) self.linee[k].handle.remove();
      delete self.linee[k];
    });
  };

  Grafico.prototype._maniglia = function (L) {
    var self = this, h = document.createElement('div');
    h.className = 'chart-handle';
    h.innerHTML = '<i>⇕</i><span></span>';
    h.style.setProperty('--c', L.cfg.colore);
    this.hl.appendChild(h);
    L.handle = h;
    var startY = 0, startPrice = 0, moved = false;
    h.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      h.setPointerCapture(e.pointerId);
      L.dragging = true; moved = false;
      startY = e.clientY; startPrice = L.cfg.prezzo;
      h.classList.add('drag');
      self.chart.applyOptions({ handleScroll: false, handleScale: false });
    });
    h.addEventListener('pointermove', function (e) {
      if (!L.dragging) return;
      var rect = self.el.getBoundingClientRect();
      var p = self.main.coordinateToPrice(e.clientY - rect.top);
      if (p == null) return;
      if (Math.abs(e.clientY - startY) > 3) moved = true;
      var d = self.prec == null ? 2 : self.prec;
      p = Math.round(p * Math.pow(10, d)) / Math.pow(10, d);
      L.cfg.prezzo = p;
      L.line.applyOptions({ price: p });
      if (L.cfg.live) L.cfg.live(p);
    });
    var end = function () {
      if (!L.dragging) return;
      L.dragging = false; h.classList.remove('drag');
      self.chart.applyOptions({ handleScroll: true, handleScale: true });
      if (moved && L.cfg.drag) {
        var ok = L.cfg.drag(L.cfg.prezzo);
        if (ok === false) { L.cfg.prezzo = startPrice; L.line.applyOptions({ price: startPrice }); }
      } else if (!moved && L.cfg.tap) L.cfg.tap();
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  };

  Grafico.prototype._posiziona = function () {
    var self = this, w = this.el.clientWidth;
    if (!w) return;
    var ps = 0;
    try { ps = this.chart.priceScale('right').width(); } catch (e) { ps = 60; }
    var h = this.el.clientHeight;
    Object.keys(this.linee).forEach(function (k) {
      var L = self.linee[k];
      if (!L.handle) return;
      var y = self.main.priceToCoordinate(L.cfg.prezzo);
      if (y == null || y < -10 || y > h + 10) { L.handle.style.display = 'none'; return; }
      L.handle.style.display = '';
      L.handle.style.transform = 'translate(' + (w - ps - L.handle.offsetWidth - 6) + 'px,' + (y - 13) + 'px)';
    });
  };

  Grafico.prototype.markers = function (m) {
    var mk = (m || []).map(function (x) { return Object.assign({}, x, { time: x.time + TZ }); });
    // i marker devono cadere su una candela esistente
    var times = this.dati.map(function (k) { return k.time; });
    mk = mk.map(function (x) {
      var t = x.time, lo = 0, hi = times.length - 1, best = null;
      while (lo <= hi) { var mid = (lo + hi) >> 1; if (times[mid] <= t) { best = times[mid]; lo = mid + 1; } else hi = mid - 1; }
      return best == null ? null : Object.assign(x, { time: best });
    }).filter(Boolean);
    this._mkUtente = mk;
    this._applicaMarker();
  };

  Grafico.prototype._applicaMarker = function () {
    if (!this.main) return;
    var all = (this._mkUtente || []).concat(this.ind.cusum ? (this._mkCusum || []) : []);
    all.sort(function (a, b) { return a.time - b.time; });
    this.main.setMarkers(all);
  };

  Grafico.prototype.scegliPrezzo = function (fn) {
    this.pick = fn;
    this.el.classList.toggle('picking', !!fn);
  };

  Grafico.prototype.distruggi = function () { cancelAnimationFrame(this._raf); this.chart.remove(); };

  SB.Grafico = Grafico;

  /* grafico semplice (curva del capitale, P/L mensile) */
  SB.miniGrafico = function (el, serie, tipo) {
    var css = getComputedStyle(document.documentElement);
    var ch = LWC.createChart(el, {
      autoSize: true,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: (css.getPropertyValue('--muted') || '#9aa6c0').trim(), fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(140,160,200,.08)' } },
      rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false },
      handleScroll: false, handleScale: false,
      localization: { locale: 'it-IT', priceFormatter: function (p) { return SB.motore.fmt(p, 0); } }
    });
    var s;
    if (tipo === 'barre') {
      s = ch.addHistogramSeries({ priceLineVisible: false });
      s.setData(serie);
    } else {
      s = ch.addAreaSeries({ lineColor: '#5b8cff', topColor: 'rgba(91,140,255,.3)', bottomColor: 'rgba(91,140,255,0)', lineWidth: 2, priceLineVisible: false });
      s.setData(serie.map(function (x) { return { time: x.time + TZ, value: x.value }; }));
    }
    ch.timeScale().fitContent();
    return ch;
  };
})();
