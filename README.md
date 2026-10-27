# Radiologie-Praxis — Auswertung

Ein Dashboard über vier Tabellen einer (erfundenen) Radiologie-Praxis. Es beantwortet die
drei Aufgaben aus einem SQL-Test und ein paar naheliegende Fragen darüber hinaus.

**PostgreSQL läuft in der Seite selbst** — als WebAssembly, ohne Server und ohne
Installation. Die SQL, die eine Kachel unter „SQL anzeigen" zeigt, ist deshalb genau die,
die eben ausgeführt wurde: es gibt keine zweite Implementierung, die davon abweichen
könnte.

## Ansehen

Nichts installieren, einfach die veröffentlichte Adresse öffnen. Lokal geht es mit jedem
Webserver; ein Doppelklick auf `docs/index.html` reicht **nicht**, weil Browser
WebAssembly aus lokalen Dateien blockieren.

```bash
cd docs && python3 -m http.server 8000
# dann http://localhost:8000 aufrufen
```

Der erste Aufruf lädt rund 10 MB (die Postgres-Datei) und dauert etwa sieben Sekunden.
Danach liegt alles im Zwischenspeicher des Browsers.

## Zwei Datenbestände

| Schema | Inhalt | wofür |
|---|---|---|
| `test` | 28 Termine, 14 Patienten | die drei Aufgaben, exakt nachprüfbar |
| `demo` | 820 Termine, 320 Patienten | damit die Grafiken etwas zeigen |

Getrennt, weil die erwarteten Werte für genau die 28 Termine gelten. Tabellen- und
Spaltennamen sind in beiden identisch; die Oberfläche schaltet mit `SET search_path` um,
die angezeigte SQL bleibt dieselbe.

Alle Personen, Namen und Adressen sind erfunden.

## Die drei Aufgaben

| # | Frage | Filter nötig | Ergebnis |
|---|---|---|---|
| 1 | Durchschnittsalter am Untersuchungstag der nicht Erschienenen | Status = nicht erschienen | `47 years 25 days 04:48:00` |
| 2 | Gerät mit den meisten Untersuchungen im September 2023 | Zeitraum 01.09.–30.09.2023 | `MR-Bochum`, 3 |
| 3 | Top 5 Patienten nach Umsatz | keiner | 832 · 327 · 212 · 125 · 205 |

`npm test` prüft diese drei Werte gegen den Prüfdatensatz — mit derselben SQL, die auch
die Seite ausführt.

## Geschäftsregeln

Sie stehen genau einmal, in der Sicht `v_exam_enriched` (`sql/03_views.sql`):

* **Umsatz** = `value_privat` bei Privatversicherten, sonst `value_gesetzlich`. Nie beides.
* **Umsatz nur bei `status = 'completed'`.** `revenue_potential` hält daneben fest, was ein
  Termin gebracht hätte — daraus entsteht der entgangene Umsatz, ohne die Regel aufzuweichen.
* **Auslastung zählt alle Termine**, auch No-Shows: der Termin blockiert das Gerät trotzdem.
* **Alter** = `AGE(exam_date, birthdate)`, gemittelt direkt auf dem Intervall.
* **Zeiträume** immer halboffen (`>= Start AND < Ende`), nie `BETWEEN`.
* **Gleichstände** bleiben sichtbar, über `RANK()` bzw. `FETCH … WITH TIES`.

## Aufbau

```
sql/00_schema.sql      Schemata test + demo
sql/01_setup.sql       Prüfdatensatz
sql/02_demo_data.sql   erzeugte Übungsdaten (nicht von Hand ändern)
sql/03_views.sql       v_exam_enriched + v_device_geo, in beiden Schemata
sql/queries.mjs        eine Abfrage je Kachel — Seite und Test benutzen dieselbe
scripts/               Generator, Kartenbau, Build, Test
docs/                  was veröffentlicht wird
```

## Entwickeln

```bash
npm install
npm run generate   # Übungsdaten neu würfeln (fester Startwert, reproduzierbar)
npm run map        # Deutschland-Umriss neu in einen SVG-Pfad rechnen
npm run build      # SQL in docs/sql-data.js backen
npm test           # die drei Abnahmewerte prüfen
```

Nach jeder Änderung an `sql/` muss `npm run build` laufen, sonst sieht die Seite die alte
Fassung.
