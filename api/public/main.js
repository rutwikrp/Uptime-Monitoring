// api/public/main.js

const API_ROOT = '/api/monitors';
const pollInterval = 10000; // 10s

async function fetchMonitors() {
  try {
    const r = await fetch(API_ROOT);
    if (!r.ok) throw new Error('fetch failed');
    return await r.json();
  } catch (e) {
    console.error('fetchMonitors', e);
    return [];
  }
}

function render(monitors) {
  const tbody = document.querySelector('#monitors tbody');
  tbody.innerHTML = '';
  monitors.forEach(m => {
    const last = m.last_check;
    const status = last ? (last.status === 'UP' ? 'UP' : 'DOWN') : '—';
    const statusClass = last ? (last.status === 'UP' ? 'up' : 'down') : '';
    const checkedAt = last ? new Date(last.checked_at).toLocaleString() : '—';
    const rt = last ? (last.response_time_ms ?? '-') : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${escapeHtml(m.name || '')}</td>
      <td><a href="${escapeAttr(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.url)}</a></td>
      <td class="${statusClass}">${status}</td>
      <td>${checkedAt}</td>
      <td>${rt}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}
function escapeAttr(s){ return escapeHtml(s); }

async function loop() {
  const monitors = await fetchMonitors();
  render(monitors);
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const url = document.getElementById('url').value.trim();
  const interval = parseInt(document.getElementById('interval').value, 10) || undefined;
  if (!url) return alert('url required');
  try {
    const r = await fetch(API_ROOT, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, url, interval_seconds: interval })
    });
    if (!r.ok) {
      const j = await r.json().catch(()=>({error:'unknown'}));
      return alert('add failed: ' + (j.error || r.statusText));
    }
    document.getElementById('name').value = '';
    document.getElementById('url').value = '';
    document.getElementById('interval').value = '';
    await loop();
  } catch (err) {
    console.error(err);
    alert('network error');
  }
});

loop();
setInterval(loop, pollInterval);
