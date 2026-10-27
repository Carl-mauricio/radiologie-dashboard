import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { SQL_FILES } from './db.mjs';
import { QUERIES } from '../sql/queries.mjs';
const db = await PGlite.create();
for (const f of SQL_FILES) await db.exec(readFileSync(f, 'utf8'));
const N = [null,null,null,null,null,null,null];

for (const s of ['test','demo']) {
  await db.exec(`SET search_path TO ${s}`);
  const g = await db.query('SELECT COUNT(*)::int n FROM v_exam_enriched');
  console.log(`\n=== ${s.toUpperCase()}  (${g.rows[0].n} Termine)`);
  const wd = await db.query(QUERIES.no_show_wochentag.sql, N);
  console.log('  No-Show-Quote je Wochentag:',
    wd.rows.map(r => `${r.tag} ${r.quote}%`).join('  ') || '(leer)');
  const m = await db.query(QUERIES.umsatz_pro_monat.sql, N);
  console.log(`  Umsatz-Monate: ${m.rows.length}`);
  const leer = m.rows.filter(r => !r.privat && !r.gesetzlich).length;
  console.log(`  davon ohne Umsatz: ${leer}`);
  const a = await db.query(QUERIES.altersverteilung.sql, N);
  console.log('  Alters-Dekaden:', a.rows.map(r => `${r.dekade}er:${r.erschienen+r.nicht_erschienen}`).join(' '));
}
