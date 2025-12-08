// api/public/main.js
const API_ROOT = '/api/monitors';
const POLL_INTERVAL = 10000;

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}
function escapeAttr(s){ return escapeHtml(s); }

async function fetchMonitors() {
  try {
    const r = await fetch(API_ROOT, { cache: 'no-store' });
    if (!r.ok) throw new Error('fetch monitors failed: ' + r.status);
    return await r.json();
  } catch (e) {
    console.error('fetchMonitors error', e);
    return { success: false, data: [] };
  }
}

function render(monitorsResp) {
  const tbody = document.querySelector('#monitors tbody');
  tbody.innerHTML = '';
  const arr = (monitorsResp && monitorsResp.data) ? monitorsResp.data : [];
  arr.forEach(m => {
    const last = m.last_check || {};
    const status = last.status ? (last.status === 'UP' ? 'UP' : 'DOWN') : (m.last_status || 'UNKNOWN');
    const statusClass = (status === 'UP') ? 'up' : (status === 'DOWN' ? 'down' : '');
    const checkedAt = last.checked_at || m.last_checked_at || '—';
    const rt = (last.response_time_ms || last.response_time || '-') ;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${escapeHtml(m.name || '')}</td>
      <td><a href="${escapeAttr(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.url)}</a></td>
      <td class="${statusClass}">${status}</td>
      <td>${checkedAt ? new Date(checkedAt).toLocaleString() : '—'}</td>
      <td>${rt}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function refreshLoop() {
  const monitors = await fetchMonitors();
  render(monitors);
}

// Robust submit: attach to button click and log everything
async function submitHandler() {
  const name = document.getElementById('name').value.trim();
  const url = document.getElementById('url').value.trim();
  const interval = parseInt(document.getElementById('interval').value, 10) || undefined;

  if (!url) {
    alert('URL is required');
    return;
  }

  const payload = { name, url, checkInterval: interval };
  console.log('Submitting payload:', payload);

  try {
    const resp = await fetch(API_ROOT, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(payload)
    });

    console.log('POST status:', resp.status, resp.statusText);
    const text = await resp.text().catch(() => null);
    console.log('POST body (raw):', text);

    if (!resp.ok) {
      let msg = text;
      try { const j = JSON.parse(text); msg = j.error || j.message || text; } catch(e){}
      alert('Add failed: ' + (msg || resp.status));
      return;
    }

    // success
    try {
      const json = JSON.parse(text);
      console.log('Created monitor:', json);
    } catch (e) { console.warn('created but failed to parse JSON', e); }
    // clear form and refresh
    document.getElementById('name').value = '';
    document.getElementById('url').value = '';
    document.getElementById('interval').value = '';
    await refreshLoop();
  } catch (err) {
    console.error('POST threw exception:', err);
    alert('Network error: ' + (err && err.message ? err.message : err));
  }
}

function attachHandlers() {
  const addBtn = document.getElementById('addBtn');
  if (!addBtn) {
    console.error('addBtn not found; script loaded before DOM?');
    return;
  }
  addBtn.addEventListener('click', submitHandler);

  // also attach Enter key on URL input to click button (prevent form submit)
  const urlInput = document.getElementById('url');
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitHandler();
    }
  });
}

window.addEventListener('load', () => {
  try {
    attachHandlers();
    refreshLoop();
    setInterval(refreshLoop, POLL_INTERVAL);
  } catch (e) {
    console.error('startup failed', e);
  }
});
