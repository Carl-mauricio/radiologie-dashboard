/*
  Erzeugt zusätzliche Übungsdaten — reproduzierbar, fester Startwert.

  WARUM EIN ZWEITES SCHEMA statt mehr Zeilen in denselben Tabellen: die drei
  Abnahmewerte aus dem Test gelten für GENAU die 28 Termine aus 01_setup.sql.
  Kämen 800 weitere dazu, stimmte keiner mehr, und der schönste Beweis im
  Interview wäre weg. Also liegen die Übungsdaten in `demo`, die Prüfdaten in
  `test`, und die Oberfläche schaltet mit `SET search_path` dazwischen um.
  Tabellen- und Spaltennamen bleiben in beiden identisch, die angezeigte SQL also auch.

  EHRLICHKEITSHINWEIS: die Muster in den Demo-Daten sind von mir hineingelegt
  (No-Show-Quoten je Versicherung und Wochentag, Dauer je Gerätetyp). Wer sie in
  einer Grafik "entdeckt", entdeckt meine Annahmen. Für eine Demo ist das richtig
  so, aber man sollte es wissen, bevor man daraus im Gespräch eine These macht.
*/
import { writeFileSync } from 'node:fs';

// mulberry32 — kurz, deterministisch, reicht völlig.
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261025);
const pick = (a) => a[Math.floor(rand() * a.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// Untersuchungsart -> Gerätetyp. Eine RÖ-Aufnahme läuft nicht auf einem MRT.
const EXAMTYPE = {
  1: { type: 'RÖ',  min: [6, 14] },   2: { type: 'RÖ',  min: [6, 14] },
  3: { type: 'MR',  min: [25, 45] },  4: { type: 'MR',  min: [18, 32] },
  5: { type: 'MR',  min: [18, 32] },  6: { type: 'NUK', min: [35, 60] },
  7: { type: 'CT',  min: [12, 24] },  8: { type: 'CT',  min: [12, 24] },
  9: { type: 'RÖ',  min: [5, 12] },  10: { type: 'RÖ',  min: [5, 12] },
};
// Gerät 7 (CT-Darmstadt) ist inaktiv und bekommt keine neuen Termine.
const DEVICES = {
  'RÖ':  [1, 2, 9, 11],
  'MR':  [3, 4, 10],
  'CT':  [5, 6, 8],
  'NUK': [12],
};

const FIRST = ['Anna','Ben','Clara','David','Emma','Finn','Greta','Henrik','Ida','Jonas',
  'Katharina','Lars','Marlene','Noah','Olivia','Paul','Quirin','Rosa','Simon','Theresa',
  'Ulrich','Vera','Wilhelm','Xenia','Yannick','Zoe','Beate','Carsten','Doris','Erik'];
const LAST = ['Albrecht','Bauer','Clausen','Dietrich','Engel','Förster','Gruber','Hartmann',
  'Ibisch','Jansen','Köhler','Lehmann','Moser','Nowak','Ostermann','Pfeiffer','Quandt',
  'Reinhardt','Stein','Thiel','Ulrich','Vogt','Winkler','Zimmermann'];
const CITIES = [['Berlin',10115],['Hamburg',20095],['München',80331],['Köln',50667],
  ['Essen',45127],['Bochum',44787],['Darmstadt',64283],['Hannover',30159],
  ['Leipzig',4109],['Dortmund',44135],['Peine',31224],['Lübeck',23552]];

const esc = (s) => String(s).replace(/'/g, "''");
const iso = (d) => d.toISOString().slice(0, 10);

// ── Patienten ───────────────────────────────────────────────────────────────
const N_PATIENTS = 320;
const patients = [];
for (let i = 0; i < N_PATIENTS; i++) {
  const [city, zip] = pick(CITIES);
  const born = new Date(Date.UTC(between(1945, 2006), between(0, 11), between(1, 28)));
  patients.push({
    id: 10000 + i,
    first: pick(FIRST), last: pick(LAST),
    birth: iso(born), zip, city,
    address: `${pick(LAST)}straße ${between(1, 180)}`,
    // Etwa ein Drittel privat — grob das deutsche Verhältnis.
    insurance: rand() < 0.32 ? 'Privat' : 'Gesetzlich',
  });
}

// ── Termine ─────────────────────────────────────────────────────────────────
const N_EXAMS = 820;
const START = Date.UTC(2023, 0, 2), END = Date.UTC(2024, 11, 20);
const exams = [];
for (let i = 0; i < N_EXAMS; i++) {
  let day;
  do {                                   // Praxis hat am Wochenende zu.
    day = new Date(START + Math.floor(rand() * (END - START)));
  } while (day.getUTCDay() === 0 || day.getUTCDay() === 6);

  const examtypeId = between(1, 10);
  const spec = EXAMTYPE[examtypeId];
  const deviceId = pick(DEVICES[spec.type]);
  const patient = pick(patients);

  // No-Show-Wahrscheinlichkeit: Grundrate, montags höher, freitags höher,
  // gesetzlich Versicherte etwas häufiger. Bewusst gesetzte Annahmen.
  let p = 0.09;
  if (day.getUTCDay() === 1) p += 0.04;
  if (day.getUTCDay() === 5) p += 0.03;
  if (patient.insurance === 'Gesetzlich') p += 0.02;
  const noShow = rand() < p;

  exams.push({
    id: 100000 + i,
    date: iso(day),
    deviceId, examtypeId, patientId: patient.id,
    minutes: noShow ? 0 : between(spec.min[0], spec.min[1]),
    status: noShow ? 'no-show' : 'completed',
  });
}
exams.sort((a, b) => a.date.localeCompare(b.date));

// ── Ausgabe ─────────────────────────────────────────────────────────────────
const L = [];
L.push('-- ERZEUGT von scripts/generate.mjs — nicht von Hand ändern.');
L.push(`-- Startwert 20261025 · ${N_PATIENTS} Patienten · ${N_EXAMS} Termine · 2023-2024`);
L.push('-- Alle Personen sind erfunden.');
L.push('');
L.push('CREATE SCHEMA IF NOT EXISTS demo;');
L.push('SET search_path TO demo;');
L.push('');
L.push("-- Stammdaten identisch zum Testdatensatz, damit Geräte und Preise vergleichbar bleiben.");
for (const t of ['devices', 'examtype']) {
  L.push(`CREATE TABLE cinifyug_946d5_${t} (LIKE test.cinifyug_946d5_${t} INCLUDING ALL);`);
  L.push(`INSERT INTO cinifyug_946d5_${t} SELECT * FROM test.cinifyug_946d5_${t};`);
}
L.push('CREATE TABLE cinifyug_946d5_patient (LIKE test.cinifyug_946d5_patient INCLUDING ALL);');
L.push('CREATE TABLE cinifyug_946d5_untersuchungen (LIKE test.cinifyug_946d5_untersuchungen INCLUDING ALL);');
L.push('');
L.push('INSERT INTO cinifyug_946d5_patient VALUES');
L.push(patients.map((p) =>
  `  (${p.id},'${esc(p.first)}','${esc(p.last)}','${p.birth}',${p.zip},'${esc(p.city)}','${esc(p.address)}','${p.insurance}')`
).join(',\n') + ';');
L.push('');
L.push('INSERT INTO cinifyug_946d5_untersuchungen VALUES');
L.push(exams.map((e) =>
  `  (${e.id},'${e.date}',${e.deviceId},${e.examtypeId},${e.patientId},${e.minutes},'${e.status}')`
).join(',\n') + ';');
L.push('');
writeFileSync('sql/02_demo_data.sql', L.join('\n'));

const noShows = exams.filter((e) => e.status === 'no-show').length;
console.log(`sql/03_demo_data.sql · ${N_PATIENTS} Patienten · ${N_EXAMS} Termine · ` +
            `${noShows} No-Shows (${(100 * noShows / N_EXAMS).toFixed(1)} %)`);
