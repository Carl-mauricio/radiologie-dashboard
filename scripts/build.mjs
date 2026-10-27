/* Backt die SQL-Dateien in eine JS-Datei für die Seite.
   Eine Quelle der Wahrheit: sql/ wird bearbeitet, docs/sql-data.js ist erzeugt. */
import { readFileSync, writeFileSync } from 'node:fs';
import { SQL_FILES } from './db.mjs';
import { QUERIES, PARAMS } from '../sql/queries.mjs';

const dump = SQL_FILES.map((f) => readFileSync(f, 'utf8')).join('\n');
writeFileSync('docs/sql-data.js',
  '// ERZEUGT von scripts/build.mjs — nicht von Hand ändern.\n' +
  `export const SCHEMA_SQL = ${JSON.stringify(dump)};\n` +
  `export const QUERIES = ${JSON.stringify(QUERIES, null, 2)};\n` +
  `export const PARAMS = ${JSON.stringify(PARAMS)};\n`);
console.log(`docs/sql-data.js · ${(dump.length / 1024).toFixed(0)} kB SQL · ` +
            `${Object.keys(QUERIES).length} Abfragen`);
