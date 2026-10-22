/* UAD 3.6 starter comments – adding them to her library (the list itself is in cmt36data.js, shared with the iPad app) *//* add the set to her library – shown first, nothing she has is changed (her database rule) */
async function cmt36Add() { const now = new Date().toISOString(); const add = []; CMT36.forEach(([section, title, fid, lim, text]) => { const id = cmtId(section, title + ' (3.6)', text); if (!CMT[id]) add.push({ id, section, title: `${title} – F-1 ${fid}, ${lim.toLocaleString()} characters`, text, ver: '3.6', src: 'UAD 3.6 starter set (Oct 2026)', added: now }); });
  if (!add.length) { toast('The UAD 3.6 starter comments are already in your library'); return; }
  const secs = [...new Set(add.map(x => x.section))];
  if (!confirm(`Add ${add.length} UAD 3.6 comments to your comment library?\n\nSections: ${secs.join(', ')}.\n\nThey are marked UAD 3.6; nothing you already have is changed. You can edit or delete any of them.`)) return;
  add.forEach(x => { CMT[x.id] = x; }); await cmtSave(); toast(`${add.length} UAD 3.6 comments added – open a section to see them`, 6000); if (typeof cmtRender === 'function') cmtRender(); }
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-cmt36]')) cmt36Add(); });
