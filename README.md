# SimulaBorsa

Web app di **trading simulato** (paper trading) utilizzabile da smartphone e computer. Installabile come app (PWA), funziona offline con gli strumenti Demo.

## Cosa fa
- **Tutti i mercati con dati gratuiti**: azioni di tutte le borse (Milano `.MI`, USA, Europa, Asia), ETF, indici, forex, futures, materie prime, tassi e cripto.
  - Yahoo Finance (tramite proxy CORS) — copre quasi ogni strumento quotato; spesso ritardato di 15 minuti
  - Binance — cripto in tempo reale
  - Twelve Data — facoltativo, con chiave gratuita
  - Demo — prezzi simulati, sempre disponibili
- **Grafici** a candele, linea o area da 1 minuto a 1 mese, con volumi, medie mobili 20/50, EMA 20, Bande di Bollinger, RSI, CUSUM sulla varianza (segnala i cambi di volatilità) e linee orizzontali. Le linee di entrata, stop e target si possono nascondere con il tasto 👁.
- **Ordini automatici**: a mercato, limite, stop; stop loss, take profit e trailing stop; validità fino a revoca o solo oggi; long e short con leva.
- **Sul grafico**: tocca 📍 e poi il grafico per fissare entrata, SL o TP; trascina le maniglie per spostare stop, target e ordini.
- **Dimensionamento**: per quantità, per importo in euro o per rischio % del capitale (in base allo stop).
- **Recupero automatico**: se chiudi l'app, alla riapertura ricostruisce i movimenti dei prezzi con le candele storiche ed esegue ordini, stop e target al prezzo giusto.
- **Costi**: commissioni (% , fisso, minimo, massimo) per classe di strumento, spread, slippage, Tobin tax italiana, imposta di bollo, costi overnight per leva e short. Profili pronti.
- **Imposte italiane**: regime amministrato o dichiarativo, 26% (azioni, ETF, derivati), 33% cripto (dal 2026), 12,5% titoli di Stato, **zainetto fiscale** con scadenza a 4 anni, ETF come redditi di capitale.
- **Report**: curva del capitale, P/L mensile, % vincenti, profit factor, drawdown, dal lordo al netto, riepilogo fiscale per anno, esportazione CSV.
- **Più conti** per confrontare strategie o broker, backup e ripristino.

## Pubblicazione su GitHub Pages
1. Crea il repository `SimulaBorsa` e carica tutti i file di questa cartella (con le sottocartelle `css`, `js`, `icons`, `proxy`).
2. Settings → Pages → Branch `main`, cartella `/ (root)` → Save.
3. Apri `https://<utente>.github.io/SimulaBorsa/` dallo smartphone e scegli "Aggiungi a schermata Home".

## Aggiornamenti
A ogni modifica aumenta il numero di versione in **due punti**:
- `version.json` → `"version"` (e aggiorna `date` e `notes`)
- `index.html` → `data-version` dello script `aggiornamenti.js`

L'app resta sulla versione installata finché non premi **Aggiorna**: il tasto compare in alto quando `version.json` annuncia una versione nuova, insieme alla notifica con le novità.

## Proxy personale (consigliato)
I proxy pubblici gratuiti possono essere lenti o bloccati. Con un account gratuito Cloudflare puoi creare il tuo in 2 minuti: istruzioni in `proxy/cloudflare-worker.js`. Poi incolla l'indirizzo in Impostazioni → Fonti dati → Proxy personale.

## Note
Simulazione a scopo didattico: nessun ordine reale. I calcoli fiscali sono indicativi e non sostituiscono un commercialista.
Grafici: TradingView Lightweight Charts™ (licenza Apache 2.0, https://www.tradingview.com/).
