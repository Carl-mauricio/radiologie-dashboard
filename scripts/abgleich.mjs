import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const db = await PGlite.create();
for (const f of ['sql/00_schema.sql','sql/01_setup.sql']) await db.exec(readFileSync(f,'utf8'));
await db.exec('SET search_path TO test');

console.log('Umsatz je Patient (alle mit > 0), aus 01_setup.sql:');
const u = await db.query(`
  SELECT p.cinifyug_946d5_patienten_id pid,
         SUM(CASE WHEN p.insurance='Privat' THEN e.value_privat ELSE e.value_gesetzlich END)::int umsatz
  FROM cinifyug_946d5_untersuchungen t
  JOIN cinifyug_946d5_patient p  ON p.cinifyug_946d5_patienten_id=t.patient_id
  JOIN cinifyug_946d5_examtype e ON e.cinifyug_946d5_examtype_id=t.examtype_id
  WHERE t.status='completed'
  GROUP BY 1 ORDER BY umsatz DESC, pid`);
for (const r of u.rows) console.log(`  ${r.pid}: ${r.umsatz}` + (r.pid===151?'   <-- laut Test ebenfalls 360':''));

console.log('\nNo-Show-Termine und aktuelle Geburtsdaten:');
const n = await db.query(`
  SELECT t.exam_id, t.exam_date::date::text termin, p.cinifyug_946d5_patienten_id pid,
         p.birthdate::date::text geboren, AGE(t.exam_date,p.birthdate)::text alter_ist
  FROM cinifyug_946d5_untersuchungen t
  JOIN cinifyug_946d5_patient p ON p.cinifyug_946d5_patienten_id=t.patient_id
  WHERE t.status='no-show' ORDER BY t.exam_date`);
for (const r of n.rows) console.log(`  ${r.termin}  #${r.pid}  geb. ${r.geboren}  -> ${r.alter_ist}`);
