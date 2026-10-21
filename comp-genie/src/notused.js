/* ---------------- why a comp was not used (her ask, Oct 20 2026) ----------------
   Her screening rules (kept on this computer, kv 'nuRules'): 2-story homes, under N sq ft, condition C4 or worse, busy road,
   an ADU, a much larger usable lot. "Fill in reasons" ticks the UAD reasons and writes a short comment for every
   not-used comp that has none yet; and when she takes a comp off the list, a box asks why with those already ticked. */
const NU_RULES0 = { twoStory: true, minGla: 1400, cond: 4, busy: true, adu: true, lotX: 1.5 };
let NU_RULES = { ...NU_RULES0 }; DB.get('kv', 'nuRules').then(r => { if (r && r.v) NU_RULES = { ...NU_RULES0, ...r.v }; }).catch(() => {});
function nuSuggest(J, c) {
  const S = subjFacts(J), C = compFacts(c, J), R = NU_RULES; const why = new Set(), txt = [];
  const sl = num(S.levels), cl = num(C.levels); if (R.twoStory && cl && cl >= 2 && (!sl || sl < 2)) { why.add('DesignOrStyleVariance'); txt.push('two-story'); }
  const g = num(C.gla); if (R.minGla && g && g < R.minGla) { why.add('GrossLivingArea'); txt.push(`${g.toLocaleString()} sq ft (under ${(+R.minGla).toLocaleString()})`); }
  const cn = num(String(C.c || '').replace(/\D/g, '')); if (R.cond && cn && cn >= R.cond) { why.add('Condition'); txt.push(`C${cn} condition`); }
  if (R.busy && /adverse[^;]*busy|busy road/i.test(String(C.loc || ''))) { why.add('SiteInfluence'); txt.push('on a busy road'); }
  const adu = String(C.adu || ''); if (R.adu && (num(C.aduSf) > 0 || (adu.trim() && !/^(none|no)$/i.test(adu.trim()) && /adu|guest|second|cottage/i.test(adu)))) { why.add('AccessoryDwellingUnit'); txt.push('has an ADU / guest unit'); }
  const su = num(S.usable), cu = num(C.usable); if (R.lotX && su && cu && cu >= su * R.lotX) { why.add('LotSize'); txt.push(`usable lot ${cu.toFixed(2)} ac vs the subject’s ${su.toFixed(2)} ac`); }
  const t = txt.length ? (txt.join('; ').replace(/^./, m => m.toUpperCase()) + '.') : '';
  return { reasons: [...why], text: t.slice(0, 360) };
}
function nuRulesHTML() { const R = NU_RULES;
  return `<div class="nurules"><b>My screening rules</b> <label class="inl"><input type="checkbox" data-nurule="twoStory" ${R.twoStory ? 'checked' : ''}> 2-story (subject 1 story)</label>
    <label class="inl">under <input class="txt xs" data-nurule="minGla" value="${esc(R.minGla || '')}" inputmode="numeric"> sq ft</label>
    <label class="inl">condition <select class="fine" data-nurule="cond">${[['', 'off'], [3, 'C3 or worse'], [4, 'C4 or worse'], [5, 'C5 or worse']].map(([v, l]) => `<option value="${v}" ${String(v) === String(R.cond || '') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="inl"><input type="checkbox" data-nurule="busy" ${R.busy ? 'checked' : ''}> busy road</label> <label class="inl"><input type="checkbox" data-nurule="adu" ${R.adu ? 'checked' : ''}> ADU</label>
    <label class="inl">usable lot ≥ <input class="txt xs" data-nurule="lotX" value="${esc(R.lotX || '')}" inputmode="decimal">× the subject’s</label>
    <button class="btn sm primary" data-act="nufill">Fill in reasons from my rules</button><small class="muted"> – only comps with no reason yet; you can change any.</small></div>`; }
function nuFill(J) { let n = 0, none = 0; J.comps.filter(c => c.notUsed && !c.use).forEach(c => { const N = c.notUsed; if (N.reasons.length || (N.text || '').trim()) return; const s = nuSuggest(J, c); if (!s.reasons.length) { none++; return; } N.reasons = s.reasons; N.text = s.text; n++; });
  save(); render(); toast(`Reasons filled in for ${n} comp${n === 1 ? '' : 's'}` + (none ? ` · ${none} did not match your rules – pick their reasons by hand` : ''), 7000); }
/* the box that asks why, right when she takes a comp off */
function nuAskBox(J, cid) { const c = J.comps.find(x => x.id === cid); if (!c || !c.notUsed) return; const N = c.notUsed;
  if (!N.reasons.length && !(N.text || '').trim()) { const s = nuSuggest(J, c); N.reasons = s.reasons; N.text = s.text; }
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const draw = () => { bg.innerHTML = `<div class="sheet"><h2>Why not ${esc(compTitle(c))}?</h2><p class="help">Kept as analyzed – not used (it goes in the report’s “Additional properties analyzed not used”). ${N.reasons.length ? 'Ticked from your screening rules – change anything.' : 'Pick the reason(s).'}</p>
    <div class="nur">${NOTUSED_REASONS.map(([v, l]) => `<label class="chip2"><input type="checkbox" data-nua="${v}" ${N.reasons.includes(v) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>
    <input class="txt" data-nuat="1" maxlength="360" value="${esc(N.text || '')}" placeholder="Comment, e.g. Two-story; superior quality (360 characters)" style="width:100%;margin-top:8px">
    <div class="row" style="margin-top:10px"><label class="inl"><input type="checkbox" data-nuarep="1" ${N.report ? 'checked' : ''}> show in the report</label><span class="grow"></span><button class="btn primary" data-nuaok="1">OK</button></div></div>`; };
  draw(); document.body.appendChild(bg);
  bg.addEventListener('change', e => { const t = e.target; if (t.dataset.nua) { N.reasons = N.reasons.filter(x => x !== t.dataset.nua); if (t.checked) N.reasons.push(t.dataset.nua); } if (t.dataset.nuat) N.text = t.value; if (t.dataset.nuarep) N.report = t.checked; save(); });
  bg.addEventListener('input', e => { if (e.target.dataset.nuat) N.text = e.target.value; });
  const close = () => { save(); bg.remove(); app.nuAsk = null; render(); };
  bg.addEventListener('click', e => { if (e.target.closest('[data-nuaok]') || e.target === bg) close(); });
  setTimeout(() => { const f = bg.querySelector('[data-nuat]'); if (f) f.focus(); }, 30);
}
