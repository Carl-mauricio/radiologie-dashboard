import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = await PGlite.create();
await db.exec(readFileSync('sql/01_setup.sql', 'utf8'));

const q1 = `
SELECT AVG(AGE(u.exam_date, p.birthdate))::text AS avg_age
FROM cinifyug_946d5_untersuchungen u
JOIN cinifyug_946d5_patient p ON p.cinifyug_946d5_patienten_id = u.patient_id
WHERE u.status = 'no-show'`;

const q2 = `
SELECT d.longname, COUNT(*)::int AS exams
FROM cinifyug_946d5_untersuchungen u
JOIN cinifyug_946d5_devices d ON d.device_id = u.device_id
WHERE u.exam_date >= DATE '2023-09-01' AND u.exam_date < DATE '2023-10-01'
GROUP BY d.longname
ORDER BY exams DESC
FETCH FIRST 1 ROWS WITH TIES`;

const q3 = `
SELECT p.cinifyug_946d5_patienten_id AS patient_id,
       SUM(CASE WHEN p.insurance = 'Privat' THEN e.value_privat
                ELSE e.value_gesetzlich END)::int AS revenue
FROM cinifyug_946d5_untersuchungen u
JOIN cinifyug_946d5_patient  p ON p.cinifyug_946d5_patienten_id = u.patient_id
JOIN cinifyug_946d5_examtype e ON e.cinifyug_946d5_examtype_id = u.examtype_id
WHERE u.status = 'completed'
GROUP BY p.cinifyug_946d5_patienten_id
ORDER BY revenue DESC
FETCH FIRST 5 ROWS WITH TIES`;

console.log('PostgreSQL:', (await db.query('SELECT version()')).rows[0].version.split(',')[0]);
console.log('\n1) Durchschnittsalter No-Shows:');
console.log('   ', (await db.query(q1)).rows[0].avg_age);
console.log('   erwartet: 52 years 5 mons 41 days 14:24:00');
console.log('\n2) Gerät mit den meisten Terminen, September 2023:');
for (const r of (await db.query(q2)).rows) console.log('   ', r.longname, r.exams);
console.log('   erwartet: MR-Bochum 3');
console.log('\n3) Top 5 Patienten nach Umsatz:');
for (const r of (await db.query(q3)).rows) console.log('   ', r.patient_id, r.revenue);
console.log('   erwartet: 832:620  327:510  212:420  125:360  205:360');
