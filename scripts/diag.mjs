import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const db = await PGlite.create();
for (const f of ['sql/00_schema.sql','sql/01_setup.sql']) await db.exec(readFileSync(f,'utf8'));
await db.exec('SET search_path TO test');
const r = await db.query(`
  SELECT u.exam_id, u.exam_date::date::text AS termin, p.cinifyug_946d5_patienten_id AS pid,
         p.firstname||' '||p.lastname AS name, p.birthdate::date::text AS geboren,
         AGE(u.exam_date, p.birthdate)::text AS alter_text,
         EXTRACT(EPOCH FROM AGE(u.exam_date,p.birthdate))::bigint AS sek
  FROM cinifyug_946d5_untersuchungen u
  JOIN cinifyug_946d5_patient p ON p.cinifyug_946d5_patienten_id=u.patient_id
  WHERE u.status='no-show' ORDER BY u.exam_date`);
console.log('No-Shows im nachgebauten Datensatz:', r.rows.length);
for (const x of r.rows) console.log(`  ${x.termin}  ${x.name} (#${x.pid}, geb. ${x.geboren})  -> ${x.alter_text}`);
const avg = await db.query(`SELECT AVG(AGE(u.exam_date,p.birthdate))::text t
  FROM cinifyug_946d5_untersuchungen u JOIN cinifyug_946d5_patient p
    ON p.cinifyug_946d5_patienten_id=u.patient_id WHERE u.status='no-show'`);
console.log('\nDurchschnitt jetzt :', avg.rows[0].t);
console.log('Soll laut Mauricio :', '47 years 25 days 04:48:00');
