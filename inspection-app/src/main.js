/* ---------------- Boot ---------------- */
function showFatal(msg, where) {
  const root = document.getElementById('app'); if (!root || document.getElementById('fatal')) return;
  const box = document.createElement('div'); box.id = 'fatal'; box.className = 'fatal';
  box.innerHTML = `<h2>Something went wrong</h2><p>Your inspections are still saved on this iPad. <b>Do not delete the app icon</b> – that would erase them.</p>
    <p class="fatal-msg">${esc(String(msg || 'Unknown error'))}${where ? ' · ' + esc(where) : ''}</p>
    <div class="row"><button class="btn primary" id="fatalHome">Go to my inspections</button><button class="btn" id="fatalReload">Reload app</button></div>
    <p class="help">Take a screenshot of this box and send it to Claude.</p>`;
  root.prepend(box); window.scrollTo(0, 0);
  box.querySelector('#fatalHome').onclick = async () => { try { await saveNow(); } catch (e) {} box.remove(); renderHome(); };
  box.querySelector('#fatalReload').onclick = () => location.reload();
}
window.addEventListener('error', e => { if (!e.message || e.message === 'Script error.' || /ResizeObserver/.test(e.message)) return; showFatal(e.message, (e.filename ? 'line ' + e.lineno : '')); });
window.addEventListener('unhandledrejection', e => showFatal(e.reason && (e.reason.message || e.reason), 'promise'));

(async function boot() {
  try { hcInit(); } catch (e) {}
  try { if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|anthropic/.test(location.host)) navigator.serviceWorker.register('sw.js'); } catch (e) {}
  const msg = document.getElementById('bootMsg'); if (msg) msg.textContent = 'Opening saved inspections…';
  // never wait forever on storage
  const ok = await Promise.race([DB.ready, new Promise(r => setTimeout(() => r('timeout'), 15000))]);
  if (ok !== true) {
    $('#app').innerHTML = `<div class="fatal"><h2>The iPad's storage is not responding</h2><p>Your inspections are still saved. <b>Do not delete the app icon.</b></p>
      <p>Close the app fully (swipe up and flick it away), wait 10 seconds and open it again. If this keeps happening, restart the iPad.</p>
      <div class="row"><button class="btn primary" onclick="location.reload()">Try again</button></div></div>`;
    return;
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
  try { if (typeof APP_CFG !== 'undefined' && APP_CFG.test) { document.documentElement.classList.add('testcopy'); const f = document.createElement('div'); f.className = 'testflag'; f.textContent = 'TEST COPY – separate storage, not for real inspections · version ' + (typeof BUILD !== 'undefined' ? BUILD : '?'); document.body.prepend(f); } } catch (e) {}
  const q = new URLSearchParams(location.search); const openId = q.get('open');
  if (openId) { history.replaceState(null, '', location.pathname); const rec = await DB.get('inspections', openId); if (rec) { openInspection(openId, q.get('tab')); return; } }
  renderHome();
})();
