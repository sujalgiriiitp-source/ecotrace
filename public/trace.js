async function loadTrace() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const errorEl = document.getElementById('traceError');
  const contentEl = document.getElementById('traceContent');
  const journeyList = document.getElementById('journeyList');

  if (!errorEl || !contentEl || !journeyList) {
    return;
  }

  if (!id) {
    errorEl.textContent = '❌ Missing record ID in URL.';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch('/entries');
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error('Failed to load trace entries.');
    }

    const entries = Array.isArray(result.data) ? result.data : [];
    const item = entries.find((entry) => entry.id === id);

    if (!item) {
      errorEl.textContent = 'Record not found ❌';
      errorEl.classList.remove('hidden');
      return;
    }

    document.getElementById('tCompany').textContent = item.companyName || 'N/A';
    document.getElementById('tProduct').textContent = item.productName || 'N/A';

    const journey = Array.isArray(item.journey) ? item.journey : [];
    const totalFromJourney = journey.reduce((sum, step) => sum + (Number(step.co2) || 0), 0);
    const total = totalFromJourney > 0 ? totalFromJourney : Number(item.co2Emission || 0);
    document.getElementById('tTotalCo2').textContent = `${total.toFixed(2)} kg`;

    journeyList.innerHTML = '';
    if (journey.length === 0) {
      journeyList.innerHTML = '<p class="muted">No journey data available.</p>';
    } else {
      journey.forEach((step) => {
        const co2 = Number(step.co2) || 0;
        const status = String(step.status || 'Success');
        const isStepVerified = /verified|success/i.test(status) && !/tampered|failed/i.test(status);
        const statusClass = isStepVerified ? 'verified' : 'tampered';
        const timeValue = step.timestamp ? new Date(step.timestamp).toLocaleString() : 'N/A';

        const itemEl = document.createElement('div');
        itemEl.className = 'timeline-item';
        itemEl.innerHTML = `
          <span class="timeline-dot ${isStepVerified ? '' : 'tampered'}"></span>
          <div class="timeline-card">
            <div class="timeline-row"><span class="timeline-label">Location</span><strong>${step.location || 'Unknown'}</strong></div>
            <div class="timeline-row"><span class="timeline-label">Step</span><span>${step.step || 'Unknown'}</span></div>
            <div class="timeline-row"><span class="timeline-label">CO2</span><span>${co2.toFixed(2)} kg</span></div>
            <div class="timeline-row"><span class="timeline-label">Timestamp</span><span>${timeValue}</span></div>
            <div class="timeline-row"><span class="timeline-label">Status</span><span class="timeline-status ${statusClass}">${isStepVerified ? 'Verified' : 'Tampered'}</span></div>
          </div>
        `;
        journeyList.appendChild(itemEl);
      });
    }

    contentEl.classList.remove('hidden');
  } catch (error) {
    errorEl.textContent = `❌ ${error.message}`;
    errorEl.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', loadTrace);
