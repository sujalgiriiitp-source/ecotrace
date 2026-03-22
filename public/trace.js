function normalizeStatus(status) {
  const value = String(status || 'Pending').trim();
  if (value === 'Success' || value === 'Pending' || value === 'Failed') {
    return value;
  }
  return 'Pending';
}

function statusClass(status) {
  if (status === 'Success') return 'status-success';
  if (status === 'Failed') return 'status-failed';
  return 'status-pending';
}

function dotClass(status) {
  if (status === 'Failed') return 'failed';
  if (status === 'Pending') return 'pending';
  return '';
}

function renderMeta(item) {
  const meta = document.getElementById('traceMeta');
  if (!meta) return;

  meta.innerHTML = `
    <div class="trace-meta-item"><span>Company</span><strong>${item.companyName || 'N/A'}</strong></div>
    <div class="trace-meta-item"><span>Product</span><strong>${item.productName || 'N/A'}</strong></div>
    <div class="trace-meta-item"><span>ID</span><strong>${item.id || 'N/A'}</strong></div>
  `;
}

function setState(message, type = 'loading') {
  const state = document.getElementById('traceState');
  if (!state) return;

  state.className = `trace-${type}`;
  state.textContent = message;
}

function renderTimeline(journey) {
  const container = document.getElementById('timeline');
  if (!container) return;

  container.innerHTML = '';
  if (!Array.isArray(journey) || journey.length === 0) {
    setState('No journey available', 'empty');
    return;
  }

  setState('', 'loading');
  const state = document.getElementById('traceState');
  if (state) {
    state.style.display = 'none';
  }

  journey.forEach((step, index) => {
    const status = normalizeStatus(step.status);
    const co2Value = Number(step.co2) || 0;
    const formattedTime = step.timestamp ? new Date(step.timestamp).toLocaleString() : 'N/A';

    const node = document.createElement('article');
    node.className = 'trace-step';
    node.style.animationDelay = `${index * 0.06}s`;
    node.innerHTML = `
      <span class="trace-step-dot ${dotClass(status)}"></span>
      <div class="trace-step-card">
        <div class="trace-step-row"><span class="trace-step-label">Location</span><strong>${step.location || 'Unknown'}</strong></div>
        <div class="trace-step-row"><span class="trace-step-label">Step</span><span>${step.step || 'Unknown'}</span></div>
        <div class="trace-step-row"><span class="trace-step-label">CO2</span><span>${co2Value.toFixed(2)} kg</span></div>
        <div class="trace-step-row"><span class="trace-step-label">Timestamp</span><span>${formattedTime}</span></div>
        <div class="trace-step-row"><span class="trace-step-label">Status</span><span class="status-badge ${statusClass(status)}">${status}</span></div>
      </div>
    `;
    container.appendChild(node);
  });
}

async function loadTraceJourney() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    setState('Record not found', 'error');
    return;
  }

  setState('Loading trace journey...', 'loading');

  try {
    const response = await fetch('/entries');
    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error('Failed to load entries');
    }

    const entries = Array.isArray(payload.data) ? payload.data : [];
    const item = entries.find((entry) => entry.id === id);

    if (!item) {
      setState('Record not found', 'error');
      return;
    }

    renderMeta(item);
    renderTimeline(item.journey || []);
  } catch (error) {
    setState(error.message || 'Something went wrong while loading trace', 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadTraceJourney);
