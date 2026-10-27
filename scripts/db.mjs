/* Eine Stelle bestimmt, in welcher Reihenfolge geladen wird — Test und Seite teilen sie. */
export const SQL_FILES = [
  'sql/00_schema.sql',    // Schemata test + demo
  'sql/01_setup.sql',     // Prüfdatensatz, unverändert wie im Coderbyte-Test
  'sql/02_demo_data.sql', // erzeugte Übungsdaten (scripts/generate.mjs)
  'sql/03_views.sql',     // v_exam_enriched in beiden Schemata
];
