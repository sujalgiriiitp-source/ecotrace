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

function greenRating(totalCo2) {
  if (totalCo2 < 100) return '🌱 Eco Friendly';
  if (totalCo2 < 400) return '⚠ Moderate';
  return '❌ High Impact';
}

function aiSuggestion(totalCo2) {
  if (totalCo2 > 400) {
    return '❌ High carbon footprint. Consider optimizing logistics or switching transport mode.';
  }
  if (totalCo2 > 150) {
    return '⚠ Moderate emissions. Improve efficiency by reducing distance or using greener transport.';
  }
  return '🌱 Great! This supply chain is eco-friendly.';
}

function modeIcon(step) {
  const stepText = String(step.step || '').toLowerCase();
  const locationText = String(step.location || '').toLowerCase();
  const iconType = String(step.icon || '').toLowerCase();

  if (iconType.includes('factory') || locationText.includes('factory') || stepText.includes('factory')) return '🏭';
  if (iconType.includes('warehouse') || stepText.includes('warehouse')) return '📦';
  if (iconType.includes('transport') || stepText.includes('transport')) return '🚚';
  if (iconType.includes('destination') || stepText.includes('destination') || locationText.includes('city')) return '🏙️';
  return '📍';
}

function safeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!contentType.includes('application/json')) {
    if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      throw new Error('Server returned HTML instead of JSON.');
    }
    throw new Error('Invalid response format from server.');
  }

  try {
    return JSON.parse(rawText);
  } catch (_error) {
    throw new Error('Unable to parse JSON response.');
  }
}

function buildMockTrace({ productId, destination, origin }) {
  const now = Date.now();
  const journey = [
    { step: 'Factory', location: origin || 'factory', distance: 0, co2: 0, status: 'Success' },
    { step: 'Warehouse', location: 'warehouse', distance: 24, co2: 2.88, status: 'Success' },
    { step: 'Transport', location: 'transport', distance: 42, co2: 1.68, status: 'Success' },
    { step: 'Destination', location: destination || 'unknown', distance: 120, co2: 14.4, status: 'Success' }
  ].map((step, index) => ({
    ...step,
    icon: step.step,
    productId,
    timestamp: new Date(now + index * 2 * 60 * 60 * 1000).toISOString()
  }));

  const totalDistance = Number(journey.reduce((sum, step) => sum + (Number(step.distance) || 0), 0).toFixed(2));
  const totalCO2 = Number(journey.reduce((sum, step) => sum + (Number(step.co2) || 0), 0).toFixed(2));

  return {
    productId,
    destination,
    origin,
    totalDistance,
    totalCO2,
    efficiency: Number((1000 / Math.max(totalCO2, 1)).toFixed(2)),
    ecoRating: totalCO2 < 50 ? 'Eco Friendly' : totalCO2 <= 150 ? 'Moderate' : 'High Impact',
    anomaly: totalCO2 > 150,
    aiSuggestion: totalCO2 > 150 ? 'High emission detected. Consider route or mode optimization.' : 'Good route profile.',
    journey,
    fallback: true
  };
}

function calcMetrics(journey, sourceMeta = {}) {
  const list = Array.isArray(journey) ? journey : [];
  const totalDistance = Number(
    sourceMeta.totalDistance || list.reduce((sum, step) => sum + (Number(step.distance) || 0), 0)
  );
  const totalCO2 = Number(
    sourceMeta.totalCO2 || sourceMeta.totalCo2 || list.reduce((sum, step) => sum + (Number(step.co2) || 0), 0)
  );
  const efficiency = Number.isFinite(Number(sourceMeta.efficiency))
    ? Number(sourceMeta.efficiency)
    : Number((1000 / Math.max(totalCO2, 1)).toFixed(2));
  const rating = sourceMeta.rating || sourceMeta.greenRating || greenRating(totalCO2);

  return {
    totalDistance: Number(totalDistance.toFixed(2)),
    totalCO2: Number(totalCO2.toFixed(2)),
    efficiency: Number(efficiency.toFixed(2)),
    rating
  };
}

function setState(message, type = 'loading') {
  const state = document.getElementById('traceState');
  if (!state) return;

  state.style.display = 'block';
  state.className = `trace-${type}`;
  state.textContent = message;
}

function hideState() {
  const state = document.getElementById('traceState');
  if (state) {
    state.style.display = 'none';
  }
}

function renderMeta(item) {
  const meta = document.getElementById('traceMeta');
  if (!meta) return;

  const destination = item.destination || 'N/A';
  meta.innerHTML = `
    <div class="trace-meta-item"><span>Company</span><strong>${safeText(item.companyName || 'Smart Trace Engine')}</strong></div>
    <div class="trace-meta-item"><span>Product</span><strong>${safeText(item.productName || item.productId || 'N/A')}</strong></div>
    <div class="trace-meta-item"><span>ID</span><strong>${safeText(item.id || item.productId || 'N/A')}</strong></div>
    <div class="trace-meta-item"><span>Destination</span><strong>${safeText(destination)}</strong></div>
  `;
}

function renderSummary(journey, sourceMeta = {}) {
  const container = document.getElementById('traceSummary');
  if (!container) return;

  const metrics = calcMetrics(journey, sourceMeta);

  container.innerHTML = `
    <div class="trace-kpi"><span>Total Distance</span><strong>${metrics.totalDistance.toFixed(0)} km</strong></div>
    <div class="trace-kpi"><span>Total CO2</span><strong>${metrics.totalCO2.toFixed(2)} kg</strong></div>
    <div class="trace-kpi"><span>Efficiency Score</span><strong>${metrics.efficiency.toFixed(2)}</strong></div>
    <div class="trace-kpi"><span>Green Rating</span><strong>${safeText(metrics.rating)}</strong></div>
  `;

  const suggestionNode = document.getElementById('aiSuggestion');
  if (suggestionNode) {
    suggestionNode.textContent = aiSuggestion(metrics.totalCO2);
  }

  const comparisonNode = document.getElementById('comparisonInsight');
  if (comparisonNode) {
    const avg = 200;
    const deltaPct = avg > 0 ? ((metrics.totalCO2 - avg) / avg) * 100 : 0;
    const absPct = Math.abs(deltaPct).toFixed(1);
    const relation = deltaPct >= 0 ? 'more' : 'less';
    comparisonNode.textContent = `This shipment emits ${absPct}% ${relation} CO2 than average.`;
  }
}

function renderRouteVisualization(journey) {
  const route = document.getElementById('routeVisualization');
  if (!route) return;

  if (!Array.isArray(journey) || journey.length === 0) {
    route.innerHTML = '<p class="trace-empty-map">No route available</p>';
    return;
  }

  const html = journey.map((step, index) => {
    const node = `
      <div class="trace-map-node">
        <span class="trace-map-dot"></span>
        <span class="trace-map-label">${safeText(step.location || step.step || `Step ${index + 1}`)}</span>
      </div>
    `;

    if (index === journey.length - 1) {
      return node;
    }

    return `${node}<span class="trace-map-line"></span>`;
  }).join('');

  route.innerHTML = `<div class="trace-map-track">${html}</div>`;
}

function renderTimeline(journey) {
  const container = document.getElementById('timeline');
  if (!container) return;

  container.innerHTML = '';
  if (!Array.isArray(journey) || journey.length === 0) {
    setState('No journey available', 'empty');
    return;
  }

  hideState();

  journey.forEach((step, index) => {
    const status = normalizeStatus(step.status);
    const co2Value = Number(step.co2) || 0;
    const distanceValue = Number(step.distance) || 0;
    const formattedTime = step.timestamp ? new Date(step.timestamp).toLocaleString() : 'N/A';
    const icon = modeIcon(step);

    const node = document.createElement('article');
    node.className = 'trace-step';
    node.style.animationDelay = `${index * 0.06}s`;
    node.innerHTML = `
      <span class="trace-step-dot ${dotClass(status)}"></span>
      <div class="trace-step-card">
        <div class="trace-step-header">
          <span class="trace-step-icon" aria-hidden="true">${icon}</span>
          <span class="status-badge ${statusClass(status)}">${status}</span>
        </div>
        <div class="trace-step-row"><span class="trace-step-label">Location</span><strong>${safeText(step.location || 'Unknown')}</strong></div>
        <div class="trace-step-row"><span class="trace-step-label">Step</span><span>${safeText(step.step || 'Unknown')}</span></div>
        <div class="trace-step-row"><span class="trace-step-label">Distance</span><span>${distanceValue.toFixed(0)} km</span></div>
        <div class="trace-step-row"><span class="trace-step-label">CO2</span><span>${co2Value.toFixed(2)} kg</span></div>
        <div class="trace-step-row"><span class="trace-step-label">Timestamp</span><span>${safeText(formattedTime)}</span></div>
      </div>
    `;
    container.appendChild(node);
  });
}

function buildReportText(source, metrics, journey) {
  const productId = source.productId || source.id || 'N/A';
  const destination = source.destination || 'N/A';
  const stepsText = (journey || [])
    .map((step, index) => `${index + 1}. ${step.step || 'Step'} | ${step.location || 'Unknown'} | ${Number(step.distance || 0).toFixed(0)} km | ${Number(step.co2 || 0).toFixed(2)} kg CO2`)
    .join('\n');

  return [
    'EcoTrace Smart Trace Report',
    '==========================',
    `Product ID: ${productId}`,
    `Destination: ${destination}`,
    `Total CO2: ${metrics.totalCO2.toFixed(2)} kg`,
    `Efficiency Score: ${metrics.efficiency.toFixed(2)}`,
    `Green Rating: ${metrics.rating}`,
    '',
    'Journey Steps:',
    stepsText
  ].join('\n');
}

function bindDownloadReport(source, journey) {
  const button = document.getElementById('downloadReportBtn');
  if (!button) return;

  button.onclick = () => {
    const metrics = calcMetrics(journey, source);
    const text = buildReportText(source, metrics, journey);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ecotrace-report-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
}

function parseDataFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('data');

  if (!encoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encoded));
    if (!parsed || !Array.isArray(parsed.journey)) {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

async function loadStoredTrace(id) {
  const response = await fetch(`/entries/${encodeURIComponent(id)}`);
  const payload = await parseApiResponse(response);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || 'Record not found');
  }
  return payload.data;
}


// --- Direct minimal data rendering: reconstruct journey from API 🔥 ---
async function loadTraceJourney() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');

  // 🔥 Direct minimal data (productId, destination, totalCO2)
  if (!dataParam) {
    document.body.innerHTML = '<h2 style="color: #ff5579; text-align: center; margin-top: 40px;">❌ No trace data found. Please generate a trace first.</h2>';
    return;
  }

  setState('Loading trace...', 'loading');

  try {
    let minimalData = null;
    try {
      minimalData = JSON.parse(decodeURIComponent(dataParam));
    } catch (parseError) {
      console.error('URL data parse failed:', parseError.message);
      throw new Error('Invalid trace data format in URL');
    }

    // Validate minimal data has required fields
    if (!minimalData || typeof minimalData !== 'object' || !minimalData.productId || !minimalData.destination) {
      throw new Error('Trace data missing required fields');
    }

    // Call API to get full trace data
    const resp = await fetch('/generate-trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: minimalData.productId,
        destination: minimalData.destination
      })
    });

    const payload = await parseApiResponse(resp);
    if (!resp.ok || !payload?.success) {
      throw new Error(payload?.message || 'Failed to generate trace');
    }

    // Render full trace from API response
    const fullTrace = payload.data || payload;
    renderMeta(fullTrace);
    renderSummary(fullTrace.journey || [], fullTrace);
    renderRouteVisualization(fullTrace.journey || []);
    renderTimeline(fullTrace.journey || []);
    bindDownloadReport(fullTrace, fullTrace.journey || []);
    hideState();
  } catch (error) {
    setState(error.message || 'Something went wrong while loading trace', 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadTraceJourney);
