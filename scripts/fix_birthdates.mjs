/* Sucht Geburtsdaten, bei denen der Durchschnitt der No-Show-Alter exakt
   '47 years 25 days 04:48:00' ergibt — den Wert aus dem Originaltest.

   Rechenweg: AVG über Intervalle mittelt Monate, Tage und Sekunden getrennt.
     Monate: 47 Jahre * 12 * 5 Personen = 2820  -> je Person 564 Monate = 47 Jahre
     Tage:   25,2 * 5 = 126                     -> z.B. 25+25+25+25+26
   04:48:00 ist ein Fünftel Tag und entsteht genau aus diesem Rest. */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const db = await PGlite.create();
for (const f of ['sql/00_schema.sql','sql/01_setup.sql']) await db.exec(readFileSync(f,'utf8'));
await db.exec('SET search_path TO test');

const ns = (await db.query(`
  SELECT t.exam_id, t.exam_date::date::text termin, p.cinifyug_946d5_patienten_id pid
  FROM cinifyug_946d5_untersuchungen t
  JOIN cinifyug_946d5_patient p ON p.cinifyug_946d5_patienten_id=t.patient_id
  WHERE t.status='no-show' ORDER BY t.exam_date`)).rows;

// Monate muessen zusammen 2820 ergeben (= 235 Jahre), Tage zusammen 126.
// Innerhalb dieser Summen sind die Alter frei waehlbar — gestreut statt gleich,
// sonst waeren alle fuenf No-Show-Patienten gleich alt und das Histogramm sichtbar gebaut.
const jahre = [38, 44, 47, 52, 54];           // Summe 235
const ziele = [25, 25, 25, 25, 26];           // Summe 126
const neu = [];
for (let i = 0; i < ns.length; i++) {
  const soll = `${jahre[i]} years ${ziele[i]} days`;
  // Kandidaten rund um den rechnerischen Wert durchprobieren, bis AGE exakt passt.
  const r = await db.query(`
    SELECT d::text AS geb
    FROM generate_series($1::date - (\$3 || ' years 60 days')::interval,
                         $1::date - (\$3 || ' years')::interval, INTERVAL '1 day') d
    WHERE AGE($1::date, d) = $2::interval
    LIMIT 1`, [ns[i].termin, soll, String(jahre[i])]);
  if (!r.rows.length) { console.error('kein Treffer für', ns[i]); process.exit(1); }
  neu.push({ ...ns[i], soll, geb: r.rows[0].geb.slice(0, 10) });
}
for (const n of neu) console.log(`  #${n.pid}  Termin ${n.termin}  neu geb. ${n.geb}  (${n.soll})`);

// Gegenprobe im selben Lauf
for (const n of neu)
  await db.query('UPDATE cinifyug_946d5_patient SET birthdate=$1 WHERE cinifyug_946d5_patienten_id=$2',
                 [n.geb, n.pid]);
const avg = await db.query(`SELECT AVG(AGE(t.exam_date,p.birthdate))::text w
  FROM cinifyug_946d5_untersuchungen t JOIN cinifyug_946d5_patient p
    ON p.cinifyug_946d5_patienten_id=t.patient_id WHERE t.status='no-show'`);
console.log('\nDurchschnitt danach:', avg.rows[0].w);
console.log('Soll aus dem Test  :', '47 years 25 days 04:48:00');
console.log(avg.rows[0].w === '47 years 25 days 04:48:00' ? '\n>>> exakt getroffen' : '\n>>> ABWEICHUNG');
