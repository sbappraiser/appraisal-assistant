/* =====================================================================
   Password lock for her data folder (her ask Oct 21 2026). The automatic backup in her own folder is written
   scrambled (AES-256-GCM, key from her password with PBKDF2-SHA-256, 600,000 rounds) so the files her nightly
   backup copies, OneDrive and a backup drive hold are unreadable without the password.
   - The password itself is never stored. A locked key (one that cannot be read out) stays in this browser so
     backups keep saving without asking; the password is asked only to open a locked backup (restore).
   - File layout: "AAVAULT1" + salt (16 bytes) + iv (12 bytes) + ciphertext – the salt travels with the file,
     so any copy opens on any computer with the password.
   ===================================================================== */
const VAULT = { on: false, key: null, salt: null, keys: new Map() };   // keys: salt (base64) → key typed in this session (restore)
const VMAGIC = new TextEncoder().encode('AAVAULT1');
const b64 = u8 => btoa(String.fromCharCode(...u8)), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function vaultKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
async function vaultLoad() { try { const r = await ODB.get('kv', 'vault'); if (r && r.v && r.v.key) { VAULT.on = true; VAULT.key = r.v.key; VAULT.salt = unb64(r.v.salt); VAULT.keys.set(r.v.salt, r.v.key); } } catch (e) { VAULT.on = false; } }
async function vaultSetup(password) { const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await vaultKey(password, salt);
  await ODB.put('kv', { id: 'vault', v: { key, salt: b64(salt), since: new Date().toISOString() } }); VAULT.on = true; VAULT.key = key; VAULT.salt = salt; VAULT.keys.set(b64(salt), key); }
async function vaultOff() { await ODB.put('kv', { id: 'vault', v: null }); VAULT.on = false; VAULT.key = null; VAULT.salt = null; }
async function vaultEnc(data) { const u8 = data instanceof Uint8Array ? data : new Uint8Array(await (data instanceof Blob ? data.arrayBuffer() : new Blob([data]).arrayBuffer()));
  const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, VAULT.key, u8));
  const out = new Uint8Array(8 + 16 + 12 + ct.length); out.set(VMAGIC, 0); out.set(VAULT.salt, 8); out.set(iv, 24); out.set(ct, 36); return out; }
const vaultIs = u8 => u8 && u8.length > 36 && VMAGIC.every((b, i) => u8[i] === b);
/* open a locked file: the key from this browser if it is the same lock, else asks for the password once per lock */
async function vaultDec(u8) { const salt = u8.slice(8, 24), iv = u8.slice(24, 36), ct = u8.slice(36); const s = b64(salt);
  for (let tries = 0; tries < 3; tries++) { let key = VAULT.keys.get(s);
    if (!key) { const pw = await vaultAsk('This backup is locked. Type its password:'); if (pw === null) throw new Error('Not opened – no password typed.'); key = await vaultKey(pw, salt); }
    try { const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)); VAULT.keys.set(s, key); return plain; }
    catch (e) { VAULT.keys.delete(s); toast('That password does not open this backup.', 5000); } }
  throw new Error('The password did not open the backup.'); }
/* a small password box (the browser's own prompt would show the password as she types) */
function vaultAsk(msg, confirmToo) { return new Promise(res => { const bg = document.createElement('div'); bg.className = 'vaultbg';
  bg.innerHTML = `<div class="vaultbox" role="dialog"><p><b>${h(msg)}</b></p><input type="password" id="vpw1" autocomplete="new-password" placeholder="Password">${confirmToo ? '<input type="password" id="vpw2" autocomplete="new-password" placeholder="Type it again">' : ''}<p class="help" id="vmsg"></p><div class="row"><button type="button" class="btn primary" id="vok">OK</button><button type="button" class="btn" id="vno">Cancel</button></div></div>`;
  document.body.appendChild(bg); const p1 = bg.querySelector('#vpw1'); p1.focus();
  const done = v => { bg.remove(); res(v); };
  bg.querySelector('#vno').onclick = () => done(null);
  const ok = () => { const a = p1.value; if (confirmToo) { const b = bg.querySelector('#vpw2').value; if (a.length < 10) { bg.querySelector('#vmsg').textContent = 'Use at least 10 characters – a short sentence is easiest to remember.'; return; } if (a !== b) { bg.querySelector('#vmsg').textContent = 'The two do not match.'; return; } } if (a) done(a); };
  bg.querySelector('#vok').onclick = ok; bg.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') done(null); }); }); }
async function vaultTurnOn() {
  const pw = await vaultAsk('Choose a password for your data folder. If you forget it, the locked backups cannot be opened by anyone – save it in RoboForm now.', true); if (!pw) return;
  await vaultSetup(pw); toast('Password lock on – the next backup is saved locked.', 6000); if (typeof abRun === 'function') await abRun(true); abRender(); }
/* lock the earlier, unlocked backups and documents in her folder: each one is locked, checked that it opens, then the open copy is removed */
async function vaultLockOld() { if (!VAULT.on || !AB.dir) return; if (!confirm('Lock the earlier backups and documents in “' + AB.dir.name + '”? Each file is locked, checked, and then the unlocked copy is deleted from that folder.')) return;
  let n = 0, bad = 0; const one = async (dir, name, top) => { const fh = await dir.getFileHandle(name); const u8 = new Uint8Array(await (await fh.getFile()).arrayBuffer()); if (vaultIs(u8)) return;
    const enc = await vaultEnc(u8); const back = await vaultDec(enc); if (back.length !== u8.length || back.some((b, i) => b !== u8[i])) { bad++; return; }
    const out = await dir.getFileHandle(top ? name.replace(/\.zip$/i, '.locked') : name + '.locked', { create: true }); const w = await out.createWritable(); await w.write(enc); await w.close();
    await dir.removeEntry(name); n++; };
  try { for await (const [nm, hd] of AB.dir.entries()) if (hd.kind === 'file' && /^Appraisal Assistant backup .*\.zip$/i.test(nm)) await one(AB.dir, nm, true);
    let sub = null; try { sub = await AB.dir.getDirectoryHandle(AB_DOCS); } catch (e) {}
    if (sub) { const L = []; for await (const [nm, hd] of sub.entries()) if (hd.kind === 'file' && !/\.locked$/.test(nm)) L.push(nm); for (const nm of L) await one(sub, nm); }
    toast(`${n} earlier file${n === 1 ? '' : 's'} locked${bad ? ` · ${bad} left as they were (the check failed)` : ''}.`, 7000); } catch (e) { toast('Could not lock them all: ' + (e.message || e), 7000); }
  abRender(); }
try { const bc = new BroadcastChannel('aa-save'); bc.onmessage = () => { if (typeof abSoon === 'function') abSoon(); }; } catch (e) {}   // the Comp genie says when it saved, so its work is backed up too
