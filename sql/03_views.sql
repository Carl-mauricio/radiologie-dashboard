/*
  Zentrale Sicht: jede Kachel rechnet hierauf, keine Kachel wiederholt die Regeln.

  Die vier Geschäftsregeln aus dem Briefing stecken genau einmal hier drin:
    1. Umsatz = value_privat bei Privat, sonst value_gesetzlich. Nie beides addieren.
    2. Umsatz nur bei status = 'completed'. No-Shows bringen 0 €.
    3. revenue_potential hält fest, was der Termin GEBRACHT HÄTTE — damit lässt sich
       entgangener Umsatz zeigen, ohne die Regel 2 aufzuweichen.
    4. age_at_exam = AGE(exam_date, birthdate), als Intervall. Nicht in Jahre runden:
       der Abnahmewert der Aufgabe 1 ist ein Intervall mit Monaten und Tagen, und
       jedes Runden hier würde ihn zerstören.
*/
SET search_path TO test;
CREATE OR REPLACE VIEW v_exam_enriched AS
SELECT
    u.exam_id,
    u.exam_date,
    u.duration_min,
    u.status,
    u.status = 'no-show'                      AS is_no_show,
    d.device_id,
    d.type                                    AS device_type,
    d.shortname                               AS device_short,
    d.longname                                AS device_name,
    d.active                                  AS device_active,
    d.purchase_date,
    e.cinifyug_946d5_examtype_id              AS examtype_id,
    e.description                             AS examtype,
    p.cinifyug_946d5_patienten_id             AS patient_id,
    p.firstname, p.lastname, p.city, p.zipcode,
    p.insurance,
    p.birthdate,
    AGE(u.exam_date, p.birthdate)             AS age_at_exam,
    -- Was der Termin wert ist, unabhängig davon ob er stattfand.
    CASE WHEN p.insurance = 'Privat' THEN e.value_privat
         ELSE e.value_gesetzlich END          AS revenue_potential,
    -- Was er tatsächlich eingebracht hat.
    CASE WHEN u.status = 'completed'
         THEN CASE WHEN p.insurance = 'Privat' THEN e.value_privat
                   ELSE e.value_gesetzlich END
         ELSE 0 END                           AS revenue
FROM cinifyug_946d5_untersuchungen u
JOIN cinifyug_946d5_devices  d ON d.device_id = u.device_id
JOIN cinifyug_946d5_examtype e ON e.cinifyug_946d5_examtype_id = u.examtype_id
JOIN cinifyug_946d5_patient  p ON p.cinifyug_946d5_patienten_id = u.patient_id;


/*
  Standort je Gerät. Die Testtabellen kennen keine Koordinaten — der Ort steckt nur im
  Gerätenamen ("MR-Bochum", "RÖ-berlin", "MR-Bochum2"). Statt die Originaltabelle um
  Spalten zu erweitern (das Briefing verlangt sie unverändert), hängt die Zuordnung in
  dieser Sicht: Ortsteil aus dem Namen schneiden, Ziffern abschneiden, kleinschreiben,
  und gegen eine kleine Koordinatenliste joinen. Die Koordinaten sind echt, die Praxis
  ist erfunden.
*/
CREATE OR REPLACE VIEW v_device_geo AS
WITH orte(stadt, lat, lon) AS (VALUES
    ('berlin',    52.520, 13.405),
    ('bochum',    51.482,  7.216),
    ('darmstadt', 49.872,  8.651),
    ('essen',     51.456,  7.012),
    ('hannover',  52.374,  9.738))
SELECT d.device_id,
       d.longname,
       d.type,
       INITCAP(o.stadt) AS stadt,
       o.lat, o.lon
FROM cinifyug_946d5_devices d
JOIN orte o
  ON o.stadt = LOWER(REGEXP_REPLACE(SPLIT_PART(d.longname, '-', 2), '\d+$', ''));

SET search_path TO demo;
CREATE OR REPLACE VIEW v_exam_enriched AS
SELECT
    u.exam_id,
    u.exam_date,
    u.duration_min,
    u.status,
    u.status = 'no-show'                      AS is_no_show,
    d.device_id,
    d.type                                    AS device_type,
    d.shortname                               AS device_short,
    d.longname                                AS device_name,
    d.active                                  AS device_active,
    d.purchase_date,
    e.cinifyug_946d5_examtype_id              AS examtype_id,
    e.description                             AS examtype,
    p.cinifyug_946d5_patienten_id             AS patient_id,
    p.firstname, p.lastname, p.city, p.zipcode,
    p.insurance,
    p.birthdate,
    AGE(u.exam_date, p.birthdate)             AS age_at_exam,
    -- Was der Termin wert ist, unabhängig davon ob er stattfand.
    CASE WHEN p.insurance = 'Privat' THEN e.value_privat
         ELSE e.value_gesetzlich END          AS revenue_potential,
    -- Was er tatsächlich eingebracht hat.
    CASE WHEN u.status = 'completed'
         THEN CASE WHEN p.insurance = 'Privat' THEN e.value_privat
                   ELSE e.value_gesetzlich END
         ELSE 0 END                           AS revenue
FROM cinifyug_946d5_untersuchungen u
JOIN cinifyug_946d5_devices  d ON d.device_id = u.device_id
JOIN cinifyug_946d5_examtype e ON e.cinifyug_946d5_examtype_id = u.examtype_id
JOIN cinifyug_946d5_patient  p ON p.cinifyug_946d5_patienten_id = u.patient_id;

/*
  Standort je Gerät. Die Testtabellen kennen keine Koordinaten — der Ort steckt nur im
  Gerätenamen ("MR-Bochum", "RÖ-berlin", "MR-Bochum2"). Statt die Originaltabelle um
  Spalten zu erweitern (das Briefing verlangt sie unverändert), hängt die Zuordnung in
  dieser Sicht: Ortsteil aus dem Namen schneiden, Ziffern abschneiden, kleinschreiben,
  und gegen eine kleine Koordinatenliste joinen. Die Koordinaten sind echt, die Praxis
  ist erfunden.
*/
CREATE OR REPLACE VIEW v_device_geo AS
WITH orte(stadt, lat, lon) AS (VALUES
    ('berlin',    52.520, 13.405),
    ('bochum',    51.482,  7.216),
    ('darmstadt', 49.872,  8.651),
    ('essen',     51.456,  7.012),
    ('hannover',  52.374,  9.738))
SELECT d.device_id,
       d.longname,
       d.type,
       INITCAP(o.stadt) AS stadt,
       o.lat, o.lon
FROM cinifyug_946d5_devices d
JOIN orte o
  ON o.stadt = LOWER(REGEXP_REPLACE(SPLIT_PART(d.longname, '-', 2), '\d+$', ''));

SET search_path TO test;
