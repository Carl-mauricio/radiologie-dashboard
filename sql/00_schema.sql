/*
  Zwei Schemata, ein Grund: die drei Abnahmewerte aus dem Test gelten für genau die
  28 Termine aus 01_setup.sql. Lägen die Übungsdaten in denselben Tabellen, stimmte
  keiner mehr — und der überzeugendste Moment im Interview wäre weg.

    test  = der Prüfdatensatz, unverändert aus 01_setup.sql
    demo  = erzeugte Übungsdaten, damit die Grafiken etwas zu zeigen haben

  Tabellen- und Spaltennamen sind in beiden identisch. Die Oberfläche schaltet mit
  SET search_path um, die angezeigte SQL bleibt also in beiden Fällen dieselbe.
*/
CREATE SCHEMA IF NOT EXISTS test;
SET search_path TO test;
