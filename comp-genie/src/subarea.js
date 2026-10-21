/* ---------------- her market sub-areas (Oct 20 2026, Montecito first) ----------------
   Her archive spells one sub-area many ways ("GldnQdrnglE", "Golden Quadrangle E", "Montecito - Golden Quadrangle East" …);
   saNorm() reads them all as one name. Her relationships say how a comp's sub-area compares with the subject's
   (similar / superior / inferior, or "may use" when she pairs areas without a rating). She sets or changes them on the
   Market area name line; they are kept on this computer (kv 'subAreas') for the next assignment.
   Her rules: Birnam Wood – always stay in the community (many amenities no other development has).
   Ennisbrook – stay in it; go outside only for lack of data. */
const SA_WORDS = [[/\b(golden|gldn|goldn|gold)\s*(quadrangle|qdrngle?|qdrng|quad)\b/g, 'golden quadrangle'], [/\bsb\s*prphry\b|\bsbprphry\b/g, 'santa barbara periphery'], [/\bprphry|periph(ery)?\b/g, 'periphery'], [/\bmntcto|mntc|mont\b/g, 'montecito'],
  [/\brvra\b/g, 'riviera'], [/\blwr\b/g, 'lower'], [/\bcyn\b/g, 'canyon'], [/\bfthll?s?\b/g, 'foothills'], [/\bcnt|cent\b/g, 'central'], [/\bsb\b/g, 'santa barbara'], [/eucalypts/g, 'eucalyptus'], [/\bbch\b/g, 'beach'], [/\bpnt\b|\bpt\b/g, 'point'], [/\bpdro\b/g, 'padaro'], [/\bblff\b/g, 'bluff'], [/\bknl\b/g, 'knoll'], [/\bbeachfront\b|\bbeach frnt\b/g, 'beach front'], [/\bcarp\b/g, 'carpinteria']];
const SA_DIR = { e: 'East', east: 'East', eastern: 'East', w: 'West', west: 'West', western: 'West', s: 'South', south: 'South', n: 'North', north: 'North', ne: 'NE', nw: 'NW', central: 'Central' };
function saNorm(name) {
  if (!String(name || '').trim()) return ''; let t;
  t = String(name || '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/\(adjacent\)|\(|\)/g, ' ').replace(/[-–,/.]+/g, ' ').replace(/\s+/g, ' ').trim();
  SA_WORDS.forEach(([re, w]) => { t = t.replace(re, w); });
  t = t.replace(/\bgolden quadrangle(?=[a-z])/g, 'golden quadrangle ').replace(/\bdistrict\b/g, '').replace(/\s+/g, ' ').trim();
  if (/^montecito\b/.test(t) && t !== 'montecito' && !/^montecito (periphery|foothills|shores|beach|west|east|w|e|eastern|western|north|south)\b/.test(t)) t = t.replace(/^montecito\s*/, '');   // "Montecito - Hedgerow District" → Hedgerow
  if (t === 'montecito' || t === 'central montecito' || t === 'montecito central' || t === 'central') return 'Central Montecito';
  const w = t.split(' '); let dir = ''; if (w.length > 1 && SA_DIR[w[w.length - 1]]) dir = SA_DIR[w.pop()]; else if (w.length > 1 && SA_DIR[w[0]] && w[0] !== 'central') dir = SA_DIR[w.shift()];
  const base = w.join(' ').replace(/\b\w/g, m => m.toUpperCase()).replace(/\bSanta Barbara Periphery\b/, 'SB Periphery');
  return base + (dir ? ' ' + dir : '');
}
/* her relationships as she described them; keyed by the subject's sub-area */
const SA_SEED = {
  'Golden Quadrangle East': { 'Golden Quadrangle West': 'similar', 'Hedgerow': 'similar', 'Lower Village': 'similar', 'Golden Quadrangle Central': 'superior', 'Central Montecito': 'inferior' },
  'Golden Quadrangle West': { 'Golden Quadrangle East': 'similar', 'Hedgerow': 'similar', 'Lower Village': 'similar', 'Golden Quadrangle Central': 'superior', 'Central Montecito': 'inferior', 'Eucalyptus Hill': 'use' },
  'Eucalyptus Hill': { 'Golden Quadrangle West': 'use', 'Pepper Hill': 'use', 'Riviera East': 'use', 'SB Periphery East': 'use' },
};
const SA_ONLY = { 'Birnam Wood': 'always', 'Ennisbrook': 'prefer' };
/* waterfront (her note Oct 20 2026): Montecito waterfront is not comparable to the rest of Montecito; Padaro is Carpinteria's */
const SA_WATER = { 'Miramar Beach': 'Montecito waterfront', 'Butterfly Beach': 'Montecito waterfront', 'Fernald Point': 'Montecito waterfront', 'Beach Front': 'Montecito waterfront', 'Montecito Beach': 'Montecito waterfront', 'Montecito Beach Front': 'Montecito waterfront',
  'Padaro Beach': 'Padaro (Carpinteria waterfront)', 'Padaro Bluff': 'Padaro (Carpinteria waterfront)', 'Padaro Knoll': 'Padaro (Carpinteria waterfront)', 'Padaro': 'Padaro (Carpinteria waterfront)', 'Padaro Lane': 'Padaro (Carpinteria waterfront)' };
let MYSA = {}; DB.get('kv', 'subAreas').then(r => { MYSA = (r && r.v) || {}; }).catch(() => {});
const SA_LABEL = { similar: 'Similar', superior: 'Superior', inferior: 'Inferior', use: 'May use' };
function saRel(J, C) { const s = saNorm(subjFacts(J).nbhd), k = saNorm(C.nbhd); if (!s || !k) return null; if (s === k) return { rel: 'same', s, k };
  const mine = (MYSA[s] || {})[k]; if (mine) return { rel: mine, s, k, src: 'yours' }; const seed = (SA_SEED[s] || {})[k]; if (seed) return { rel: seed, s, k, src: 'seed' }; return { rel: '', s, k }; }
function saSel(J, c, C) { const R = saRel(J, C); if (!R) return ''; if (R.rel === 'same') return `<small class="muted rdays">${esc(R.k)} – same sub-area</small>`;
  const ws = SA_WATER[R.s], wk = SA_WATER[R.k]; const water = (ws || wk) && ws !== wk ? `<small class="overcall">${ws && !wk ? esc(R.k) + ' is not waterfront – not comparable to ' + esc(ws) : !ws && wk ? esc(R.k) + ' is ' + esc(wk) + ' – not comparable to the subject’s area' : esc(R.k) + ' (' + esc(wk) + ') vs ' + esc(ws)}</small>` : '';
  const out = SA_ONLY[R.s] ? `<small class="${SA_ONLY[R.s] === 'always' ? 'overcall' : 'muted rdays'}">${SA_ONLY[R.s] === 'always' ? 'Outside ' + esc(R.s) + ' – you stay in the community' : 'Outside ' + esc(R.s) + ' – explain the lack of data'}</small>` : '';
  return `<small class="muted rdays">${esc(R.k)} vs ${esc(R.s)}:</small><select class="fine${R.src === 'yours' ? '' : ' arch'}" data-gsa="${c.id}" title="How this comp's sub-area compares with the subject's – remembered for your next assignment">${[['', '—'], ['similar', 'Similar'], ['superior', 'Superior'], ['inferior', 'Inferior'], ['use', 'May use']].map(([v, l]) => `<option value="${v}" ${v === R.rel ? 'selected' : ''}>${l}${v === R.rel && R.src === 'seed' ? ' (your rule)' : ''}</option>`).join('')}</select>${out}${water}`; }
function saSet(J, cid, v) { const c = J.comps.find(x => x.id === cid); if (!c) return; const R = saRel(J, compFacts(c, J)); if (!R || R.rel === 'same') return;
  MYSA[R.s] = MYSA[R.s] || {}; if (v) MYSA[R.s][R.k] = v; else delete MYSA[R.s][R.k]; DB.put('kv', { id: 'subAreas', v: MYSA }); }
