/* Rechnet den Deutschland-Umriss einmalig in einen SVG-Pfad um.

   Die Seite lädt damit nichts aus dem Netz — dieselbe Regel wie bei Chart.js und
   PGlite: alles, was angezeigt wird, liegt im Repository.

   Projektion: gleichwinklig, aber die Längengrade werden mit cos(Breite) gestaucht.
   Ohne das wäre Deutschland rund ein Drittel zu breit, weil ein Längengrad auf 51°N
   nur etwa 70 km misst, ein Breitengrad aber 111 km. */
import { readFileSync, writeFileSync } from 'node:fs';

const g = JSON.parse(readFileSync('data/deutschland.geo.json', 'utf8'));
const poly = g.features[0].geometry.coordinates;

let minLon = 99, maxLon = -99, minLat = 99, maxLat = -99;
const walk = (a, fn) => (typeof a[0] === 'number' ? fn(a) : a.forEach((x) => walk(x, fn)));
walk(poly, ([lon, lat]) => {
  minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
  minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
});

const KM_LAT = 111, KM_LON = 111 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
const H = 520;
const W = Math.round(H * ((maxLon - minLon) * KM_LON) / ((maxLat - minLat) * KM_LAT));
const px = ([lon, lat]) => [
  +(((lon - minLon) / (maxLon - minLon)) * W).toFixed(1),
  +(((maxLat - lat) / (maxLat - minLat)) * H).toFixed(1),
];

const ringe = [];
walk(poly, () => {});                      // nur fuer die Bounding box oben
const sammle = (a) => {
  if (typeof a[0][0] === 'number') ringe.push(a);     // ein Ring
  else a.forEach(sammle);
};
sammle(poly);

// Nur die groessten Ringe behalten — die vielen Nordsee-Inselchen kosten Platz
// und sind bei dieser Groesse ohnehin nicht zu sehen.
ringe.sort((a, b) => b.length - a.length);
const d = ringe.filter((r) => r.length > 40).map((ring) => {
  const pts = ring.map(px);
  return 'M' + pts.map(([x, y]) => `${x},${y}`).join('L') + 'Z';
}).join('');

writeFileSync('docs/germany.js',
  '// ERZEUGT von scripts/make_map.mjs aus data/deutschland.geo.json.\n' +
  `export const MAP = { w: ${W}, h: ${H}, d: ${JSON.stringify(d)} };\n` +
  `export const BOUNDS = { minLon: ${minLon}, maxLon: ${maxLon}, ` +
  `minLat: ${minLat}, maxLat: ${maxLat} };\n`);
console.log(`docs/germany.js · ${W}x${H} · ${ringe.filter(r=>r.length>40).length} Ringe · ` +
            `${(d.length / 1024).toFixed(0)} kB Pfad`);
