/*
  SQL-Übung: Nachbau der Coderbyte-Aufgaben (PostgreSQL)
  ------------------------------------------------------
  Dieses Skript legt die vier Tabellen aus dem Test an und füllt sie mit Übungsdaten.
  Tabellen- und Spaltennamen sind wie im Test, die Daten sind nachgebaut.
  Du kannst das Skript jederzeit erneut ausführen, es setzt alles zurück.
*/

DROP TABLE IF EXISTS cinifyug_946d5_Untersuchungen;
DROP TABLE IF EXISTS cinifyug_946d5_patient;
DROP TABLE IF EXISTS cinifyug_946d5_examtype;
DROP TABLE IF EXISTS cinifyug_946d5_devices;

-- Geräte
CREATE TABLE cinifyug_946d5_devices (
    device_id      integer PRIMARY KEY,
    type           text,
    shortname      text,
    longname       text,
    active         boolean,
    purchase_date  timestamp
);

INSERT INTO cinifyug_946d5_devices VALUES
    (1,  'RÖ',  'RÖE',   'RÖ-Essen',       true,  '2012-07-04'),
    (2,  'RÖ',  'RÖB',   'RÖ-berlin',      true,  '2016-04-09'),
    (3,  'MR',  'MRB',   'MR-Bochum',      true,  '2013-04-13'),
    (4,  'MR',  'MRD',   'MR-Darmstadt',   true,  '2017-11-18'),
    (5,  'CT',  'CTB',   'CT-Berlin',      true,  '2012-02-04'),
    (6,  'CT',  'CTBO',  'CT-Bochum',      true,  '2023-05-26'),
    (7,  'CT',  'CTD',   'CT-Darmstadt',   false, '2011-03-11'),
    (8,  'CT',  'CTE',   'CT-Essen',       true,  '2023-05-12'),
    (9,  'RÖ',  'RÖD',   'RÖ-Darmstadt',   true,  '2013-11-21'),
    (10, 'MR',  'MRB2',  'MR-Bochum2',     true,  '2011-12-15'),
    (11, 'RÖ',  'RÖBO',  'RÖ-Bochum',      true,  '2023-05-12'),
    (12, 'NUK', 'NUKH',  'NUK-Hannover',   true,  '2013-11-21');

-- Untersuchungsarten mit Preis je nach Versicherung
CREATE TABLE cinifyug_946d5_examtype (
    cinifyug_946d5_examtype_id  integer PRIMARY KEY,
    description                 text,
    value_privat                integer,
    value_gesetzlich            integer
);

INSERT INTO cinifyug_946d5_examtype VALUES
    (1,  'RÖ-Knie rechts',         120, 80),
    (2,  'RÖ-Knie links',          120, 80),
    (3,  'MRT Abdomen',            300, 150),
    (4,  'MRT Schulter links',     150, 80),
    (5,  'MRT Schulter Rechts',    150, 80),
    (6,  'NUK',                    500, 120),
    (7,  'CT Hand rechts',         210, 90),
    (8,  'CT Hand links',          210, 90),
    (9,  'RÖ Ellenbogen links',    100, 60),
    (10, 'RÖ Ellenbogen rechts',   100, 60);

-- Patienten
-- Die Geburtsdaten der fuenf No-Show-Patienten sind so gesetzt, dass der
-- Durchschnitt aus Aufgabe 1 exakt '47 years 25 days 04:48:00' ergibt — den
-- Wert aus dem Originaltest. Der urspruengliche Nachbau lag bei 52 Jahren.
-- Monate muessen zusammen 2820 ergeben, Tage zusammen 126; innerhalb dieser
-- Summen sind die Alter frei, daher gestreut statt gleich.
CREATE TABLE cinifyug_946d5_patient (
    cinifyug_946d5_patienten_id  integer PRIMARY KEY,
    firstname                    text,
    lastname                     text,
    birthdate                    timestamp,
    zipcode                      integer,
    city                         text,
    address                      text,
    insurance                    text      -- 'Privat' oder 'Gesetzlich'
);

INSERT INTO cinifyug_946d5_patient VALUES
    (89,  'Paul',       'Weber',      '1981-12-09', 59768, 'Peine',        'Mühlestraße 36',                 'Privat'),
    (105, 'Maximilian', 'Mueller',    '1970-08-29', 7338,  'Wolfenbüttel', 'Zorbachweg 3',                   'Privat'),
    (125, 'Lukas',      'Wagner',     '1995-05-03', 95472, 'Waren',        'Hermannplatz 762',               'Privat'),
    (151, 'Alexander',  'Schneider',  '1964-09-14', 79296, 'Kamenz',       'Kühnertstr. 491',                'Privat'),
    (155, 'Sophie',     'Schmidt',    '1965-03-14', 64658, 'Feuchtwangen', 'Adelheid-Noack-Platz 03',        'Gesetzlich'),
    (205, 'Julia',      'Klein',      '1990-04-17', 50667, 'Köln',         'Domstraße 12',                   'Gesetzlich'),
    (207, 'Elias',      'Schulz',     '1981-10-22', 74015, 'Peine',        'Hörlestr. 8',                    'Gesetzlich'),
    (212, 'Jonas',      'Wolf',       '1977-02-10', 20095, 'Hamburg',      'Mönckebergstraße 7',             'Privat'),
    (234, 'Mia',        'Neumann',    '1985-08-18', 4109,  'Leipzig',      'Grimmaische Straße 2',           'Gesetzlich'),
    (327, 'Leonie',     'Meyer',      '1987-08-01', 86542, 'Stuttgart',    'Barthstraße 51',                 'Privat'),
    (418, 'Emilia',     'Becker',     '1979-08-31', 81434, 'Lübeck',       'Hansjoachim-Christoph-Allee 93', 'Gesetzlich'),
    (434, 'Marie',      'Fischer',    '1972-08-23', 13290, 'Lippstadt',    'Kohlstraße 528',                 'Privat'),
    (483, 'Hannah',     'Hoffmann',   '1965-06-04', 83222, 'Grimmen',      'Sylvie-Mohaupt-Allee 24',        'Gesetzlich'),
    (832, 'Felix',      'Braun',      '1969-03-25', 80331, 'München',      'Sendlinger Straße 40',           'Privat');

-- Untersuchungen
-- Achtung: ohne Anführungszeichen angelegt, PostgreSQL speichert den Namen daher klein
-- (cinifyug_946d5_untersuchungen). Genau wie im Test.
CREATE TABLE cinifyug_946d5_Untersuchungen (
    exam_id       integer PRIMARY KEY,
    exam_date     timestamp,
    device_id     integer REFERENCES cinifyug_946d5_devices (device_id),
    examtype_id   integer REFERENCES cinifyug_946d5_examtype (cinifyug_946d5_examtype_id),
    patient_id    integer REFERENCES cinifyug_946d5_patient (cinifyug_946d5_patienten_id),
    duration_min  integer,
    status        text      -- 'completed' oder 'no-show'
);

INSERT INTO cinifyug_946d5_Untersuchungen VALUES
    (2001340, '2023-07-14', 3,  3,  151, 32, 'completed'),
    (7883767, '2023-06-16', 10, 3,  234, 35, 'completed'),
    (7008118, '2023-08-08', 9,  2,  418, 9,  'completed'),
    (7419830, '2023-09-01', 3,  3,  327, 30, 'completed'),
    (7033117, '2023-09-05', 9,  1,  832, 11, 'completed'),
    (5577243, '2023-09-12', 3,  3,  234, 0,  'no-show'),
    (3959395, '2023-09-14', 1,  2,  155, 10, 'completed'),
    (2185196, '2023-09-19', 9,  9,  89,  7,  'completed'),
    (4263155, '2023-09-21', 12, 6,  483, 45, 'completed'),
    (2223896, '2023-09-25', 3,  5,  418, 0,  'no-show'),
    (6120457, '2023-09-28', 5,  7,  327, 18, 'completed'),
    (6120458, '2023-10-01', 5,  8,  212, 17, 'completed'),
    (6120459, '2023-10-01', 5,  7,  212, 16, 'completed'),
    (6120460, '2023-10-01', 5,  7,  205, 19, 'completed'),
    (3307712, '2023-11-08', 4,  3,  205, 33, 'completed'),
    (8812045, '2023-12-04', 11, 10, 155, 8,  'completed'),
    (5104488, '2024-01-16', 12, 6,  205, 50, 'completed'),
    (9035521, '2024-01-23', 2,  2,  89,  12, 'completed'),
    (4417096, '2024-02-14', 12, 6,  832, 48, 'completed'),
    (3959396, '2024-02-29', 10, 5,  125, 15, 'completed'),
    (7750213, '2024-03-07', 12, 6,  212, 0,  'no-show'),
    (2690884, '2024-04-10', 1,  1,  234, 9,  'completed'),
    (1188530, '2024-05-21', 4,  4,  434, 22, 'completed'),
    (6634127, '2024-06-12', 1,  9,  105, 6,  'completed'),
    (8203316, '2024-09-03', 6,  8,  125, 14, 'completed'),
    (8203317, '2024-09-10', 6,  7,  207, 21, 'completed'),
    (8203318, '2024-09-17', 6,  8,  434, 0,  'no-show'),
    (8203319, '2024-09-24', 6,  7,  105, 0,  'no-show');

-- Kurzer Check: sollte 4 Zeilen mit Anzahl > 0 zeigen
SELECT 'devices' AS tabelle, COUNT(*) FROM cinifyug_946d5_devices
UNION ALL SELECT 'examtype', COUNT(*) FROM cinifyug_946d5_examtype
UNION ALL SELECT 'patient', COUNT(*) FROM cinifyug_946d5_patient
UNION ALL SELECT 'Untersuchungen', COUNT(*) FROM cinifyug_946d5_Untersuchungen;
