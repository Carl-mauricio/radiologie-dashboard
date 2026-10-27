/*
  Die Seite führt die Abfragen selbst aus — PGlite ist echtes PostgreSQL als
  WebAssembly. Das ist der Grund für die ganze Konstruktion: der Knopf "SQL anzeigen"
  zeigt den Text, der eben gelaufen ist, nicht eine Abschrift davon. Eine zweite
  Implementierung in JavaScript gäbe es gar nicht erst, die auseinanderlaufen könnte.
*/
import { PGlite } from './vendor/pglite/index.js';
import { SCHEMA_SQL, QUERIES, PARAMS } from './sql-data.js';
import { MAP, BOUNDS } from './germany.js';

const $ = (id) => document.getElementById(id);
const euro = (n) => (n == null ? '–' : Number(n).toLocaleString('de-DE') + ' €');
const num = (n) => (n == null ? '–' : Number(n).toLocaleString('de-DE'));

let db, schema = 'test';
const charts = {};

// Die Abnahmewerte aus dem Briefing. Sie gelten für den Prüfdatensatz OHNE Filter
// (Aufgabe 2 mit September 2023) — die Seite sagt selbst, ob sie getroffen werden.
// Die Aufgabenstellung steht ueber der Kachel, damit im Interview klar ist, welche
// Frage gerade beantwortet wird — und wo ein Filter dazugehoert, setzt ein Knopf ihn.
// Nur Aufgabe 2 braucht einen: ihre Frage nennt ausdruecklich September 2023. Die
// Bedingung "nicht erschienen" aus Aufgabe 1 steckt in der Abfrage selbst.
// Nur die Aufgabenstellung. Kein Knopf, der die Filter setzt, und auch keine Meldung,
// ob sie richtig stehen: beides nähme dem Filtern oben genau die Arbeit ab, die im
// Interview vorgeführt werden soll.
const FRAGEN = {
  avg_age_no_show:
    'Wie hoch ist das Durchschnittsalter der Patienten am Untersuchungstag, '
  + 'die nicht erschienen sind?',
  geraete_rangliste:
    'Welches Gerät hatte im September 2023 die meisten Untersuchungen?',
  top_patienten:
    'Welche sind die Top 5 Patienten nach Umsatz?',
};

function filterWerte() {
  const v = (id) => ($(id).value || null);
  return [v('f-von'), v('f-bis'),
          v('f-device') ? +v('f-device') : null,
          v('f-type'),
          v('f-examtype') ? +v('f-examtype') : null,
          v('f-insurance'), v('f-status')];
}
const keineFilter = () => filterWerte().every((x) => x === null);

async function run(key, extra = []) {
  const q = QUERIES[key];
  const params = [...filterWerte(), ...extra];
  const res = await db.query(q.sql, params);
  return { rows: res.rows, sql: q.sql, params };
}

// ── Kacheln ─────────────────────────────────────────────────────────────────
function frageBlock(id) {
  return FRAGEN[id] ? `<div class="frage">„${FRAGEN[id]}"</div>` : '';
}

function karte(id, titel, note, inhalt) {
  return `<div class="card" id="c-${id}">
    <h3>${titel}</h3>${frageBlock(id)}${note ? `<p class="note">${note}</p>` : ''}
    <div class="body">${inhalt}</div>
    <button class="sqlbtn" data-sql="${id}">SQL anzeigen</button>
    <div class="sqlbox" hidden></div>
  </div>`;
}

// Aufgabe 2 fragt nach SEPTEMBER 2023. Ohne diesen Filter beantwortet die Kachel eine
// andere Frage — dann ist ein abweichender Wert kein Fehler, und die Seite darf ihn auch
// nicht als solchen ausweisen. Stattdessen ein Knopf, der die Bedingung der Aufgabe setzt.

async function pflichtfragen() {
  const out = [];

  // 1 — Durchschnittsalter No-Shows
  const r1 = await run('avg_age_no_show');
  const wert = r1.rows[0]?.wert;
  const stat = $('f-status').value;
  const was = stat === 'no-show' ? 'nicht wahrgenommenen Terminen'
            : stat === 'completed' ? 'wahrgenommenen Terminen' : 'Terminen';
  out.push(karte('avg_age_no_show', '1 · Durchschnittsalter am Untersuchungstag',
    QUERIES.avg_age_no_show.hinweis,
    `<div class="kpi small">${wert ?? '–'}</div>
     <div class="kpi-sub">aus ${num(r1.rows[0]?.termine)} ${was}</div>`));

  // 2 — Geräte-Rangliste
  const r2 = await run('geraete_rangliste');
  out.push(karte('geraete_rangliste', '2 · Geräte nach Anzahl Termine',
    QUERIES.geraete_rangliste.hinweis,
    tabelle('geraete', [
      { k: 'rang', l: 'Rang' },
      { k: 'device_name', l: 'Gerät' },
      { k: 'device_type', l: 'Typ' },
      { k: 'termine', l: 'Termine', n: true, f: (r) => num(r.termine) },
      { k: 'minuten', l: 'Minuten', n: true, f: (r) => num(r.minuten) },
      { k: 'umsatz', l: 'Umsatz', n: true, f: (r) => euro(r.umsatz) },
    ], r2.rows.slice(0, 8).map((r) => ({ ...r, _hl: r.rang === 1 })))));

  // 3 — Top-Patienten
  const n = +($('top-n')?.value || 5);
  const r3 = await run('top_patienten', [n]);
  out.push(karte('top_patienten', '3 · Patienten nach Umsatz',
    QUERIES.top_patienten.hinweis,
    `<label style="font-size:12px;color:var(--muted)">Top
       <select id="top-n">${[3, 5, 10, 20].map((v) =>
         `<option${v === n ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`
    + tabelle('patienten', [
        { k: 'rang', l: 'Rang' },
        { k: 'patient', l: 'Patient', f: (r) =>
            `${r.patient} <span style="color:var(--muted)">#${r.patient_id}</span>` },
        { k: 'insurance', l: 'Vers.' },
        { k: 'termine', l: 'Termine', n: true, f: (r) => num(r.termine) },
        { k: 'umsatz', l: 'Umsatz', n: true, f: (r) => euro(r.umsatz) },
      ], r3.rows)
    + `<div class="chart" style="height:${Math.max(150, 34 * r3.rows.length)}px;margin-top:12px">
         <canvas id="ch-top_patienten"></canvas></div>`));
  patientenBalken = r3.rows;

  sqlCache.avg_age_no_show = r1; sqlCache.geraete_rangliste = r2; sqlCache.top_patienten = r3;
  return out.join('');
}

function auswertungen() {
  return karte('geraete_karte', QUERIES.geraete_karte.titel,
               QUERIES.geraete_karte.hinweis, '<div id="map-box"></div>')
    + ['umsatz_pro_monat', 'entgangener_umsatz', 'no_show_wochentag',
       'umsatz_je_geraetestunde', 'altersverteilung']
      .map((k) => karte(k, QUERIES[k].titel, QUERIES[k].hinweis,
                        `<div class="chart"><canvas id="ch-${k}"></canvas></div>`)).join('');
}

// Die Karte ist handgezeichnetes SVG statt einer Kartenbibliothek: fuenf Punkte
// rechtfertigen keine weiteren 200 kB, und der Umriss liegt ohnehin als Pfad vor.
function karteSVG(rows) {
  if (!rows.length) return '<p class="note">Keine Termine in dieser Auswahl.</p>';
  const x = (lon) => ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * MAP.w;
  const y = (lat) => ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP.h;
  const max = Math.max(...rows.map((r) => r.termine));
  // Flaeche proportional zur Anzahl, nicht der Radius — sonst taeuscht ein doppelt so
  // grosser Kreis die vierfache Menge vor.
  const r = (n) => 7 + 24 * Math.sqrt(n / max);

  // Grosse Kreise zuerst zeichnen, damit kleine obenauf sichtbar bleiben.
  const pts = rows.map((d) => ({ d, cx: x(d.lon), cy: y(d.lat), rr: r(d.termine) }))
                  .sort((a, b) => b.rr - a.rr);

  // Essen und Bochum liegen 25 km auseinander, auf dieser Karte also 15 Pixel — ihre
  // Kreise lagen komplett uebereinander. Kartografen schieben solche Punkte leicht
  // auseinander; ein paar Durchlaeufe reichen. Die Verschiebung ist klein genug, dass
  // die Lage noch stimmt, und die Beschriftung nennt ohnehin die Stadt.
  for (let runde = 0; runde < 12; runde++) {
    let bewegt = false;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = b.cx - a.cx, dy = b.cy - a.cy;
        const dist = Math.hypot(dx, dy) || 0.01;
        const soll = a.rr + b.rr + 3;
        if (dist >= soll) continue;
        const schub = (soll - dist) / 2;
        const ux = dx / dist, uy = dy / dist;
        a.cx -= ux * schub; a.cy -= uy * schub;
        b.cx += ux * schub; b.cy += uy * schub;
        bewegt = true;
      }
    if (!bewegt) break;
  }

  // Essen und Bochum liegen 25 km auseinander und ueberlappen bei dieser Groesse.
  // Beschriftungen deshalb nach unten ausweichen lassen, statt sie uebereinander
  // zu stapeln — und wer ausweicht, bekommt eine duenne Linie zum eigenen Kreis.
  const labels = pts.map((p) => ({ ...p, ly: p.cy + p.rr + 13 }))
                    .sort((a, b) => a.ly - b.ly);
  for (let i = 1; i < labels.length; i++) {
    const vor = labels[i - 1];
    if (Math.abs(labels[i].ly - vor.ly) < 14 && Math.abs(labels[i].cx - vor.cx) < 60)
      labels[i].ly = vor.ly + 14;
  }

  const kreise = pts.map((p) => `<g>`
    + `<title>${p.d.stadt}: ${p.d.termine} Termine \u00b7 ${p.d.geraete} Ger\u00e4t(e) \u00b7 ${p.d.typen}</title>`
    + `<circle cx="${p.cx}" cy="${p.cy}" r="${p.rr}" fill="#2563eb" fill-opacity=".3" stroke="#2563eb" stroke-width="1.5"/>`
    + `<text x="${p.cx}" y="${p.cy + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#1e3a8a">${p.d.termine}</text>`
    + `</g>`).join('');

  const texte = labels.map((p) => {
    const versetzt = p.ly > p.cy + p.rr + 14;
    return (versetzt
      ? `<line x1="${p.cx}" y1="${p.cy + p.rr}" x2="${p.cx}" y2="${p.ly - 9}" stroke="#94a3b8" stroke-width="1"/>`
      : '')
      + `<text x="${p.cx}" y="${p.ly}" text-anchor="middle" font-size="11" fill="#334155">${p.d.stadt}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${MAP.w} ${MAP.h}" style="width:100%;max-height:430px" role="img"`
    + ` aria-label="Standorte der Ger\u00e4te in Deutschland">`
    + `<path d="${MAP.d}" fill="#e8edf5" stroke="#cbd5e1" stroke-width="1"/>`
    + kreise + texte + `</svg>`
    + `<p class="note" style="margin:8px 0 0">Kreisfl\u00e4che proportional zur Anzahl der `
    + `Termine. Dieselbe Z\u00e4hlweise wie Aufgabe 2, nur nach Standort.</p>`;
}

// Sortierung je Tabelle. Null bedeutet: Reihenfolge wie die Abfrage sie liefert —
// also die der Aufgabenstellung. Erst ein Klick weicht davon ab.
const SORT = {};
const TABELLEN = {};

function tabelle(id, spalten, zeilen) {
  TABELLEN[id] = { spalten, zeilen };
  return `<div class="tw" id="t-${id}">${tabelleInhalt(id)}</div>`;
}

function tabelleInhalt(id) {
  const { spalten, zeilen } = TABELLEN[id];
  const s = SORT[id];
  let rows = zeilen;
  if (s) {
    const dir = s.dir === 'asc' ? 1 : -1;
    rows = [...zeilen].sort((a, b) => {
      const x = a[s.k], y = b[s.k];
      if (x == null) return 1;
      if (y == null) return -1;
      return dir * (typeof x === 'number' && typeof y === 'number'
        ? x - y : String(x).localeCompare(String(y), 'de'));
    });
  }
  const pfeil = (k) => (s && s.k === k ? (s.dir === 'asc' ? ' ▲' : ' ▼') : '');
  return `<table><thead><tr>${spalten.map((c) =>
      `<th class="s${c.n ? ' n' : ''}" data-t="${id}" data-k="${c.k}">${c.l}${pfeil(c.k)}</th>`
    ).join('')}</tr></thead><tbody>${rows.map((r) =>
      `<tr${r._hl ? ' class="tie"' : ''}>${spalten.map((c) =>
        `<td${c.n ? ' class="n"' : ''}>${c.f ? c.f(r) : (r[c.k] ?? '')}</td>`).join('')}</tr>`
    ).join('')}</tbody></table>`;
}

document.addEventListener('click', (e) => {
  const th = e.target.closest('th.s');
  if (!th) return;
  const id = th.dataset.t, k = th.dataset.k, cur = SORT[id];
  SORT[id] = (cur && cur.k === k && cur.dir === 'desc') ? { k, dir: 'asc' }
           : (cur && cur.k === k && cur.dir === 'asc') ? null
           : { k, dir: 'desc' };
  $(`t-${id}`).innerHTML = tabelleInhalt(id);
});

let patientenBalken = [];
const sqlCache = {};
const BASIS = { responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { boxWidth: 11, font: { size: 11 } } } },
  scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, ticks: { font: { size: 10 } },
                 grid: { color: '#eef2f7' } } } };

async function zeichne() {
  const defs = {
    umsatz_pro_monat: (r) => ({ type: 'line',
      data: { labels: r.map((x) => x.monat), datasets: [
        { label: 'Privat', data: r.map((x) => x.privat ?? 0), borderColor: '#2563eb',
          backgroundColor: '#2563eb22', tension: .3, fill: true },
        { label: 'Gesetzlich', data: r.map((x) => x.gesetzlich ?? 0), borderColor: '#059669',
          backgroundColor: '#05966922', tension: .3, fill: true }] } }),
    entgangener_umsatz: (r) => ({ type: 'bar',
      data: { labels: r.map((x) => x.monat), datasets: [
        { label: 'entgangen (€)', data: r.map((x) => x.entgangen ?? 0),
          backgroundColor: '#dc2626', borderRadius: 3 }] } }),
    no_show_wochentag: (r) => ({ type: 'bar',
      data: { labels: r.map((x) => x.tag), datasets: [
        { label: 'No-Show-Quote (%)', data: r.map((x) => +x.quote),
          backgroundColor: '#d97706', borderRadius: 3 }] } }),
    umsatz_je_geraetestunde: (r) => ({ type: 'bar',
      data: { labels: r.map((x) => x.device_name), datasets: [
        { label: '€ je Gerätestunde', data: r.map((x) => x.je_stunde),
          backgroundColor: '#2563eb', borderRadius: 3 }] },
      options: { indexAxis: 'y' } }),
    altersverteilung: (r) => ({ type: 'bar',
      data: { labels: r.map((x) => `${x.dekade}–${x.dekade + 9}`), datasets: [
        { label: 'erschienen', data: r.map((x) => x.erschienen), backgroundColor: '#2563eb',
          stack: 'a', borderRadius: 3 },
        { label: 'nicht erschienen', data: r.map((x) => x.nicht_erschienen),
          backgroundColor: '#dc2626', stack: 'a', borderRadius: 3 }] } }),
  };
  // Aufgabe 3 als Balken. Ein Patient hat genau EINE Versicherung, also faerbt sich
  // jeder Balken ganz — kein Stapel, der eine Aufteilung vortaeuschen wuerde.
  const pe = document.getElementById('ch-top_patienten');
  if (pe && patientenBalken.length) {
    charts.top_patienten?.destroy();
    charts.top_patienten = new Chart(pe, { type: 'bar',
      data: { labels: patientenBalken.map((r) => r.patient),
        datasets: [{ label: 'Umsatz', data: patientenBalken.map((r) => r.umsatz),
          backgroundColor: patientenBalken.map((r) =>
            r.insurance === 'Privat' ? '#2563eb' : '#059669'), borderRadius: 3 }] },
      options: { ...BASIS, indexAxis: 'y',
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: (c) =>
            `${euro(c.parsed.x)} \u00b7 ${patientenBalken[c.dataIndex].insurance}` } } } } });
  }

  const kr = await run('geraete_karte');
  sqlCache.geraete_karte = kr;
  const mb = document.getElementById('map-box');
  if (mb) mb.innerHTML = karteSVG(kr.rows);

  for (const [key, bauen] of Object.entries(defs)) {
    const res = await run(key);
    sqlCache[key] = res;
    const cfg = bauen(res.rows);
    cfg.options = { ...BASIS, ...(cfg.options || {}) };
    charts[key]?.destroy();
    const el = document.getElementById(`ch-${key}`);
    if (el) charts[key] = new Chart(el, cfg);
  }
}

// ── SQL sichtbar machen ─────────────────────────────────────────────────────
function sqlText(key) {
  const c = sqlCache[key];
  if (!c) return '';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const werte = c.params.map((v, i) =>
    `-- $${i + 1} = ${v === null ? 'NULL  (kein Filter)' : JSON.stringify(v)}`).join('\n');
  return `<pre>SET search_path TO ${schema};\n\n${esc(c.sql.trim())}\n\n${esc(werte)}</pre>`;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('.sqlbtn');
  if (!b || !b.dataset.sql) return;
  const box = b.nextElementSibling;
  box.hidden = !box.hidden;
  box.innerHTML = box.hidden ? '' : sqlText(b.dataset.sql);
  b.textContent = box.hidden ? 'SQL anzeigen' : 'SQL ausblenden';
});

// ── Filter füllen ───────────────────────────────────────────────────────────
async function fuelleFilter() {
  const opt = (rows, val, txt, leer) =>
    `<option value="">${leer}</option>` +
    rows.map((r) => `<option value="${r[val]}">${r[txt]}</option>`).join('');
  const d = await db.query('SELECT device_id, longname FROM cinifyug_946d5_devices ORDER BY longname');
  $('f-device').innerHTML = opt(d.rows, 'device_id', 'longname', 'alle');
  const t = await db.query('SELECT DISTINCT type FROM cinifyug_946d5_devices ORDER BY type');
  $('f-type').innerHTML = `<option value="">alle</option>` +
    t.rows.map((r) => `<option>${r.type}</option>`).join('');
  const e = await db.query(
    'SELECT cinifyug_946d5_examtype_id id, description FROM cinifyug_946d5_examtype ORDER BY description');
  $('f-examtype').innerHTML = opt(e.rows, 'id', 'description', 'alle');
  $('f-insurance').innerHTML =
    '<option value="">alle</option><option>Privat</option><option>Gesetzlich</option>';
  $('f-status').innerHTML =
    '<option value="">alle</option><option value="completed">erschienen</option>' +
    '<option value="no-show">nicht erschienen</option>';
}

// ── Start ───────────────────────────────────────────────────────────────────
async function render() {
  $('app').innerHTML =
    `<div class="sh">Die drei Aufgaben aus dem Test</div><div class="grid">${await pflichtfragen()}</div>` +
    `<div class="sh">Weitere Auswertungen</div><div class="grid">${auswertungen()}</div>`;
  await zeichne();
  $('app').addEventListener('change', (e) => {
    if (e.target.id === 'top-n') render();
  }, { once: true });
}

async function wechsle(s) {
  schema = s;
  for (const id of ['f-von', 'f-bis']) $(id).value = '';
  $('ds-test').classList.toggle('on', s === 'test');
  $('ds-demo').classList.toggle('on', s === 'demo');
  await db.exec(`SET search_path TO ${s}`);
  await fuelleFilter();
  await render();
}

try {
  db = await PGlite.create();
  await db.exec(SCHEMA_SQL);
  const v = await db.query('SELECT version()');
  $('pgver').textContent = v.rows[0].version.split(' ').slice(0, 2).join(' ') + ' · in der Seite';
  await wechsle('test');
  $('loading').hidden = true;
  $('app').hidden = false;
  $('filters').hidden = false;
  for (const id of ['f-von', 'f-bis', 'f-device', 'f-type', 'f-examtype',
                    'f-insurance', 'f-status'])
    $(id).addEventListener('change', render);
  $('reset').addEventListener('click', () => {
    for (const id of ['f-von', 'f-bis', 'f-device', 'f-type', 'f-examtype',
                      'f-insurance', 'f-status']) $(id).value = '';
    render();
  });
  $('ds-test').addEventListener('click', () => wechsle('test'));
  $('ds-demo').addEventListener('click', () => wechsle('demo'));
} catch (err) {
  $('loading').innerHTML = `<div class="err"><b>Start fehlgeschlagen.</b><br>${err.message}</div>`;
  throw err;
}
