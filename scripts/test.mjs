/*
  Abnahmetest: die drei Pflichtfragen müssen auf dem PRÜFdatensatz exakt die Werte
  aus dem Briefing liefern. Geprüft wird die Abfrage, die auch die Seite ausführt —
  importiert aus sql/queries.mjs, nicht hier abgeschrieben.
*/
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { SQL_FILES } from './db.mjs';
import { QUERIES } from '../sql/queries.mjs';

const db = await PGlite.create();
for (const f of SQL_FILES) await db.exec(readFileSync(f, 'utf8'));
await db.exec('SET search_path TO test');

const N = [null, null, null, null, null, null, null];   // keine Filter
let fehler = 0;
const pruefe = (name, ist, soll) => {
  const ok = ist === soll;
  if (!ok) fehler++;
  console.log(`${ok ? '  ok  ' : '  FEHLER'} ${name}`);
  if (!ok) console.log(`         ist:  ${ist}\n         soll: ${soll}`);
};

// 1 — Durchschnittsalter der No-Shows. Der Status ist ein FILTER, kein Teil der
// Abfrage: genau so stellt man es im Dashboard ein, und genau das wird hier geprüft.
const r1 = await db.query(QUERIES.avg_age_no_show.sql,
  [null, null, null, null, null, null, 'no-show']);
pruefe('Durchschnittsalter No-Shows', r1.rows[0].wert, '47 years 25 days 04:48:00');

// 2 — Gerät mit den meisten Terminen im September 2023
const r2 = await db.query(QUERIES.geraete_rangliste.sql,
  ['2023-09-01', '2023-10-01', null, null, null, null, null]);
const erste = r2.rows.filter((r) => r.rang === 1);
pruefe('September 2023, Spitzenreiter',
  erste.map((r) => `${r.device_name}:${r.termine}`).join(' '), 'MR-Bochum:3');

// 3 — Top 5 Patienten nach Umsatz
const r3 = await db.query(QUERIES.top_patienten.sql, [...N, 5]);
pruefe('Top 5 Patienten nach Umsatz',
  r3.rows.map((r) => `${r.patient_id}:${r.umsatz}`).join(' '),
  '832:620 327:510 212:420 125:360 205:360');

// Die Demo-Daten dürfen den Prüfdatensatz nicht berühren.
const n = await db.query('SELECT COUNT(*)::int c FROM test.cinifyug_946d5_untersuchungen');
pruefe('Prüfdatensatz unverändert', String(n.rows[0].c), '28');

console.log(fehler ? `\n${fehler} Abweichung(en)` : '\nAlle Abnahmewerte stimmen.');
process.exit(fehler ? 1 : 0);
