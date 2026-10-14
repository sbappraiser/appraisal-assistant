/* =====================================================================
   Order storage – IndexedDB "aa-orders" on sbappraiser.github.io.
   The comp genie and other desktop modules on the same site read it.
   stores: orders {id,…}, docs {id, orderId, name, type, size, added, blob}, kv {id, v}
   ===================================================================== */
const ODB = (() => {
  let db = null;
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('aa-orders', 2);
    r.onupgradeneeded = () => { const d = r.result; const has = n => d.objectStoreNames.contains(n);
      if (!has('orders')) d.createObjectStore('orders', { keyPath: 'id' });
      if (!has('docs')) { const s = d.createObjectStore('docs', { keyPath: 'id' }); s.createIndex('order', 'orderId'); }
      if (!has('kv')) d.createObjectStore('kv', { keyPath: 'id' }); };
    r.onsuccess = () => { db = r.result; db.onversionchange = () => { try { db.close(); } catch (e) {} }; res(true); };
    r.onerror = () => rej(r.error || new Error('This browser would not open its storage.'));
    r.onblocked = () => rej(new Error('Close the other Appraisal Assistant tabs, then reload this one.'));
  });
  const tx = (st, mode, fn) => new Promise((res, rej) => {
    let t; try { t = db.transaction(st, mode); } catch (e) { rej(e); return; }
    const r = fn(t.objectStore(st)); let out; if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Storage is full or was refused.'));
  });
  return {
    init: open,
    put: (st, o) => tx(st, 'readwrite', s => s.put(o)),
    putMany: (st, list) => tx(st, 'readwrite', s => { list.forEach(o => s.put(o)); }),
    get: (st, id) => tx(st, 'readonly', s => s.get(id)),
    del: (st, id) => tx(st, 'readwrite', s => s.delete(id)),
    all: st => tx(st, 'readonly', s => s.getAll()),
    docsOf: id => tx('docs', 'readonly', s => s.index('order').getAll(id)),
  };
})();
