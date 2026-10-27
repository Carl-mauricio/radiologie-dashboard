/*
  Jede Kachel besteht aus genau einer SQL-Abfrage, und sie steht HIER — nicht im
  Oberflächencode. Zwei Gründe: der Knopf "SQL anzeigen" kann dann den Text zeigen,
  der tatsächlich ausgeführt wurde (nicht eine Abschrift davon), und der Abnahmetest
  prüft dieselbe Abfrage, die die Seite benutzt.

  $1 .. $n sind die globalen Filter. NULL heißt "nicht filtern" — deshalb überall
  das Muster `($1 IS NULL OR spalte = $1)`, das Postgres sauber wegoptimiert.

  Zeiträume immer halboffen: >= Start AND < Ende. Kein BETWEEN (Briefing, Regel 5).
*/

// Die Filter, die jede Kachel akzeptiert, in dieser Reihenfolge.
export const PARAMS = ['von', 'bis', 'device_id', 'device_type', 'examtype_id',
                       'insurance', 'status'];

const WHERE = `
  WHERE ($1::date IS NULL OR exam_date >= $1::date)
    AND ($2::date IS NULL OR exam_date <  $2::date)
    AND ($3::int  IS NULL OR device_id = $3::int)
    AND ($4::text IS NULL OR device_type = $4::text)
    AND ($5::int  IS NULL OR examtype_id = $5::int)
    AND ($6::text IS NULL OR insurance = $6::text)
    AND ($7::text IS NULL OR status = $7::text)`;

export const QUERIES = {
  // ── Pflichtfrage 1 ────────────────────────────────────────────────────────
  avg_age_no_show: {
    titel: 'Durchschnittsalter am Untersuchungstag',
    hinweis: '',
    sql: `
-- Auf ganze Sekunden gestutzt: AVG liefert Mikrosekunden, die niemand lesen will.
-- DATE_TRUNC statt Runden, damit aus 04:47:59,6 nie 04:48:00 wird.
SELECT DATE_TRUNC('second', AVG(age_at_exam))::text AS wert,
       COUNT(*)::int          AS termine
FROM v_exam_enriched
${WHERE}`,
  },

  // ── Pflichtfrage 2 ────────────────────────────────────────────────────────
  geraete_rangliste: {
    titel: 'Geräte nach Anzahl Termine',
    hinweis: 'Zählt ALLE Termine, auch No-Shows — ein nicht wahrgenommener Termin '
           + 'blockiert das Gerät trotzdem. Gleichstand bleibt sichtbar über RANK().',
    sql: `
SELECT device_name,
       device_type,
       COUNT(*)::int                                  AS termine,
       SUM(duration_min)::int                         AS minuten,
       SUM(revenue)::int                              AS umsatz,
       RANK() OVER (ORDER BY COUNT(*) DESC)::int      AS rang
FROM v_exam_enriched
${WHERE}
GROUP BY device_name, device_type
ORDER BY termine DESC, device_name`,
  },

  // ── Pflichtfrage 3 ────────────────────────────────────────────────────────
  top_patienten: {
    titel: 'Patienten nach Umsatz',
    hinweis: 'Nur abgeschlossene Termine zählen (Regel 2). Preis je nach Versicherung, '
           + 'nie beide Spalten addiert (Regel 1). FETCH … WITH TIES zeigt Gleichstände, '
           + 'statt sie willkürlich abzuschneiden.',
    sql: `
SELECT patient_id,
       firstname || ' ' || lastname                        AS patient,
       insurance,
       COUNT(*) FILTER (WHERE NOT is_no_show)::int         AS termine,
       SUM(revenue)::int                                   AS umsatz,
       RANK() OVER (ORDER BY SUM(revenue) DESC)::int       AS rang
FROM v_exam_enriched
${WHERE}
GROUP BY patient_id, firstname, lastname, insurance
HAVING SUM(revenue) > 0
ORDER BY umsatz DESC
FETCH FIRST $8 ROWS WITH TIES`,
    extraParams: ['top_n'],
  },

  // ── Weitere Auswertungen ──────────────────────────────────────────────────
  umsatz_pro_monat: {
    titel: 'Umsatz pro Monat, Privat gegen Gesetzlich',
    hinweis: 'DATE_TRUNC auf den Monat. No-Shows stehen mit 0 € drin, verschieben die '
           + 'Summe also nicht — sie tauchen in der nächsten Kachel auf.',
    sql: `
SELECT TO_CHAR(DATE_TRUNC('month', exam_date), 'YYYY-MM') AS monat,
       SUM(revenue) FILTER (WHERE insurance = 'Privat')::int     AS privat,
       SUM(revenue) FILTER (WHERE insurance = 'Gesetzlich')::int AS gesetzlich
FROM v_exam_enriched
${WHERE}
GROUP BY 1
ORDER BY 1`,
  },

  entgangener_umsatz: {
    titel: 'Entgangener Umsatz durch No-Shows',
    hinweis: 'revenue_potential ist der Preis, den der Termin gebracht HÄTTE. Die Sicht '
           + 'führt ihn getrennt von revenue, damit Regel 2 (kein Umsatz ohne Besuch) '
           + 'gilt und der Verlust trotzdem sichtbar wird.',
    sql: `
SELECT TO_CHAR(DATE_TRUNC('month', exam_date), 'YYYY-MM') AS monat,
       SUM(revenue_potential) FILTER (WHERE is_no_show)::int AS entgangen,
       COUNT(*) FILTER (WHERE is_no_show)::int               AS no_shows
FROM v_exam_enriched
${WHERE}
GROUP BY 1
ORDER BY 1`,
  },

  no_show_wochentag: {
    titel: 'No-Show-Quote nach Wochentag',
    hinweis: 'Die Frage, die ein Praxismanager zuerst stellt: an welchem Tag bleiben '
           + 'die Stühle leer. ISODOW liefert Montag = 1.',
    sql: `
SELECT TO_CHAR(exam_date, 'Dy')                                      AS tag,
       EXTRACT(ISODOW FROM exam_date)::int                           AS nr,
       COUNT(*)::int                                                 AS termine,
       COUNT(*) FILTER (WHERE is_no_show)::int                       AS no_shows,
       ROUND(100.0 * COUNT(*) FILTER (WHERE is_no_show) / COUNT(*), 1) AS quote
FROM v_exam_enriched
${WHERE}
GROUP BY 1, 2
ORDER BY 2`,
  },

  umsatz_je_geraetestunde: {
    titel: 'Umsatz je Gerätestunde',
    hinweis: 'Verbindet drei Tabellen und beantwortet eine Steuerungsfrage: welches '
           + 'Gerät verdient pro Betriebsminute am meisten. Nur Geräte mit Laufzeit.',
    sql: `
SELECT device_name,
       device_type,
       SUM(duration_min)::int                                      AS minuten,
       SUM(revenue)::int                                           AS umsatz,
       ROUND(60.0 * SUM(revenue) / NULLIF(SUM(duration_min), 0), 0)::int AS je_stunde
FROM v_exam_enriched
${WHERE}
GROUP BY device_name, device_type
HAVING SUM(duration_min) > 0
ORDER BY je_stunde DESC`,
  },

  altersverteilung: {
    titel: 'Altersverteilung, erschienen gegen nicht erschienen',
    hinweis: 'Alter in Zehnerschritten am Untersuchungstag. EXTRACT(YEAR FROM AGE(...)) '
           + 'nur fürs Histogramm — die Pflichtfrage 1 rechnet weiter auf dem Intervall.',
    sql: `
SELECT (FLOOR(EXTRACT(YEAR FROM age_at_exam) / 10) * 10)::int AS dekade,
       COUNT(*) FILTER (WHERE NOT is_no_show)::int            AS erschienen,
       COUNT(*) FILTER (WHERE is_no_show)::int                AS nicht_erschienen
FROM v_exam_enriched
${WHERE}
GROUP BY 1
ORDER BY 1`,
  },

  geraete_karte: {
    titel: 'Wo die Geräte stehen',
    hinweis: 'Dieselbe Zählweise wie in Aufgabe 2 — alle Termine, No-Shows eingeschlossen '
           + '— nur nach Standort zusammengefasst. Die Koordinaten kommen aus v_device_geo, '
           + 'das den Ort aus dem Gerätenamen schneidet; die Testtabellen kennen keine.',
    sql: `
SELECT g.stadt, g.lat, g.lon,
       COUNT(DISTINCT g.device_id)::int AS geraete,
       COUNT(*)::int                    AS termine,
       SUM(v.revenue)::int              AS umsatz,
       STRING_AGG(DISTINCT g.type, ', ' ORDER BY g.type) AS typen
FROM v_exam_enriched v
JOIN v_device_geo   g ON g.device_id = v.device_id
${WHERE.replace(/exam_date/g, 'v.exam_date').replace(/device_id = /g, 'v.device_id = ')
       .replace(/device_type/g, 'v.device_type').replace(/examtype_id/g, 'v.examtype_id')
       .replace(/insurance/g, 'v.insurance').replace(/status/g, 'v.status')}
GROUP BY g.stadt, g.lat, g.lon
ORDER BY termine DESC`,
  },
};
