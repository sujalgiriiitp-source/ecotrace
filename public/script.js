// ===== ELEMENTS =====
const form = document.getElementById('entryForm');
const submitButton = document.getElementById('submitButton');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.querySelector('.btn-loader');
const entriesContainer = document.getElementById('entriesContainer');
const totalEntries = document.getElementById('totalEntries');
const totalEmissions = document.getElementById('totalEmissions');
const blockchainCount = document.getElementById('blockchainCount');
const avgEmission = document.getElementById('avgEmission');
const companyRanking = document.getElementById('companyRanking');
const loadingState = document.getElementById('loadingState');
const toastContainer = document.getElementById('toastContainer');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const csvInput = document.getElementById('csvInput');
const emissionsChartCanvas = document.getElementById('emissionsChart');
const filterInput = document.getElementById('filterInput');
const sortSelect = document.getElementById('sortSelect');
const minEmissionInput = document.getElementById('minEmission');
const maxEmissionInput = document.getElementById('maxEmission');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const anomalyOnly = document.getElementById('anomalyOnly');

let entries = [];
let chartInstance = null;
let displayedEntries = [];
let anomalyMap = new Map();

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => toast.remove(), 300);
  }, 3700);
}

// ===== CALCULATIONS =====
function calculateTotals() {
  const total = entries.reduce((sum, entry) => sum + Number(entry.co2Emission || 0), 0);
  const blockchain = entries.filter(e => e.txHash).length;
  const avg = entries.length > 0 ? total / entries.length : 0;
  
  animateCounter(totalEntries, entries.length);
  animateCounter(totalEmissions, parseFloat(total.toFixed(2)));
  animateCounter(blockchainCount, blockchain);
  animateCounter(avgEmission, parseFloat(avg.toFixed(2)));
  
  updateChart();
  updateCompanyRanking();
}

function buildAnomalyMap(records) {
  const values = records
    .map((record) => Number(record.co2Emission))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length < 2) {
    return new Map();
  }

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const threshold = stdDev > 0 ? avg + (1.4 * stdDev) : avg * 1.4;
  const result = new Map();

  records.forEach((record) => {
    const value = Number(record.co2Emission);
    if (!Number.isFinite(value)) {
      return;
    }
    result.set(record.id, {
      isAnomaly: value >= threshold,
      threshold,
      avg,
      stdDev
    });
  });

  return result;
}

function animateCounter(element, target) {
  const current = parseFloat(element.textContent) || 0;
  const duration = 600;
  const increment = (target - current) / (duration / 16);
  let value = current;

  const timer = setInterval(() => {
    value += increment;
    if (
      (increment > 0 && value >= target) ||
      (increment < 0 && value <= target)
    ) {
      element.textContent = target.toFixed(element === totalEmissions || element === avgEmission ? 2 : 0);
      clearInterval(timer);
    } else {
      element.textContent = value.toFixed(element === totalEmissions || element === avgEmission ? 2 : 0);
    }
  }, 16);
}

function updateCompanyRanking() {
  if (!companyRanking) {
    return;
  }

  const aggregate = new Map();
  entries.forEach((entry) => {
    const current = aggregate.get(entry.companyName) || { total: 0, count: 0 };
    current.total += Number(entry.co2Emission) || 0;
    current.count += 1;
    aggregate.set(entry.companyName, current);
  });

  const ranked = [...aggregate.entries()]
    .map(([name, meta]) => ({
      name,
      total: meta.total,
      average: meta.total / meta.count
    }))
    .sort((a, b) => a.total - b.total)
    .slice(0, 5);

  if (ranked.length === 0) {
    companyRanking.innerHTML = '<p class="muted">No ranking data available yet.</p>';
    return;
  }

  companyRanking.innerHTML = ranked
    .map((item, index) => `
      <div class="ranking-item">
        <strong>#${index + 1} ${item.name}</strong>
        <span>${item.total.toFixed(2)} kg total · ${item.average.toFixed(2)} avg</span>
      </div>
    `)
    .join('');
}

// ===== CARD CREATION =====
function createEntryCard(entry) {
  const card = document.createElement('article');
  card.className = 'entry-card';

  const verificationLink = `${window.location.origin}/verify.html?id=${encodeURIComponent(entry.id)}`;
  const createdAt = new Date(entry.createdAt).toLocaleString();
  const shortHash = entry.hash ? `${entry.hash.slice(0, 12)}...${entry.hash.slice(-6)}` : 'N/A';
  const shortTx = entry.txHash ? `${entry.txHash.slice(0, 10)}...${entry.txHash.slice(-8)}` : null;
  const explorerUrl = entry.txHash ? `https://sepolia.etherscan.io/tx/${entry.txHash}` : null;
  const anomalyMeta = anomalyMap.get(entry.id);
  const anomalyBadge = anomalyMeta?.isAnomaly
    ? `<p class="anomaly-badge" title="High emission outlier detected">⚠️ AI Flag: High CO2 Anomaly</p>`
    : '';
  const blockchainBadge = entry.txHash
    ? `<p style="color: var(--accent); font-weight: 600; margin: 8px 0;"><span style="font-size: 1.1rem;">✅</span> Recorded on Blockchain</p>`
    : '';
  const blockchainMeta = entry.txHash
    ? `
      <p><strong>⛓️ Tx:</strong> <span class="tx-short" title="${entry.txHash}">${shortTx}</span></p>
      <div class="entry-actions">
        <button type="button" class="copy-btn mini-copy" data-copy="${entry.txHash}">📋 Copy Tx</button>
        <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="etherscan-btn">🔍 View on Blockchain</a>
      </div>
    `
    : '';

  card.innerHTML = `
    <p><strong>🏢 Company:</strong> ${entry.companyName}</p>
    <p><strong>📦 Product:</strong> ${entry.productName}</p>
    <p><strong>🌍 CO2:</strong> ${entry.co2Emission} kg</p>
    <p><strong>🆔 ID:</strong> ${entry.id.substring(0, 10)}...</p>
    <p><strong>🕒 Timestamp:</strong> ${createdAt}</p>
    <p><strong>🔐 SHA256:</strong> <span class="tx-short" title="${entry.hash}">${shortHash}</span></p>
    ${anomalyBadge}
    ${blockchainBadge}
    ${blockchainMeta}
    <p class="immutable-mini">Immutable Record – Cannot be Modified</p>
    <p style="margin-top: 12px;"><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">→ Verify & View Details</a></p>
    <div class="qr-box" id="qr-${CSS.escape(entry.id)}"></div>
    <p class="qr-label">Scan to Verify</p>
    <div class="entry-actions">
      <button type="button" class="copy-btn mini-copy share-qr">📤 Share QR</button>
      <button type="button" class="copy-btn mini-copy download-qr">⬇️ Download QR</button>
    </div>
  `;

  // Generate QR Code
  const qrContainer = card.querySelector(`#qr-${CSS.escape(entry.id)}`);
  if (qrContainer && window.QRCode) {
    try {
      new QRCode(qrContainer, {
        text: verificationLink,
        width: 120,
        height: 120,
        colorDark: '#111111',
        colorLight: '#ffffff'
      });
    } catch (e) {
      console.warn('QR generation error', e);
    }
  }

  attachTilt(card);

  return card;
}

function attachTilt(card) {
  card.addEventListener('mousemove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -8;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
}

function renderSkeletonCards(count = 6) {
  entriesContainer.innerHTML = '';
  for (let index = 0; index < count; index += 1) {
    const skeleton = document.createElement('article');
    skeleton.className = 'entry-card skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-line w-70"></div>
      <div class="skeleton-line w-60"></div>
      <div class="skeleton-line w-40"></div>
      <div class="skeleton-box"></div>
    `;
    entriesContainer.appendChild(skeleton);
  }
}

// ===== CHART VISUALIZATION =====
function updateChart() {
  if (!emissionsChartCanvas) return;

  const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const labels = sorted.map(e => new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const data = sorted.map(e => e.co2Emission);
  const cumulativeData = [];
  let sum = 0;
  data.forEach(d => {
    sum += d;
    cumulativeData.push(sum);
  });

  const ctx = emissionsChartCanvas.getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'CO2 per Entry',
          data,
          borderColor: '#00ff9f',
          backgroundColor: 'rgba(0, 255, 159, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00ff9f',
          pointBorderColor: '#0a0a0a',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y'
        },
        {
          label: 'Cumulative CO2',
          data: cumulativeData,
          borderColor: '#00c3ff',
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#00c3ff',
          pointBorderColor: '#0a0a0a',
          pointBorderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: '#a2b3ab',
            font: { family: "'Poppins', sans-serif", size: 12 }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#a2b3ab' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#00ff9f' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#00c3ff' }
        }
      }
    }
  });
}

// ===== EXPORT FUNCTIONALITY =====
function exportToCSV() {
  if (entries.length === 0) {
    showToast('No data to export', 'error');
    return;
  }

  const headers = ['ID', 'Company', 'Product', 'CO2 (kg)', 'Date', 'Hash', 'Blockchain TX'];
  const rows = entries.map(e => [
    e.id,
    e.companyName,
    e.productName,
    e.co2Emission,
    new Date(e.createdAt).toISOString(),
    e.hash,
    e.txHash || 'N/A'
  ]);

  const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ecotrace-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  showToast('✅ Data exported successfully', 'success');
}

// ===== FILTER & SORT =====
function filterAndSort() {
  const filterText = filterInput ? filterInput.value.toLowerCase() : '';
  const sortValue = sortSelect ? sortSelect.value : 'newest';
  const minEmission = minEmissionInput?.value ? Number(minEmissionInput.value) : null;
  const maxEmission = maxEmissionInput?.value ? Number(maxEmissionInput.value) : null;
  const startDate = startDateInput?.value ? new Date(`${startDateInput.value}T00:00:00`) : null;
  const endDate = endDateInput?.value ? new Date(`${endDateInput.value}T23:59:59`) : null;
  const anomalyOnlyEnabled = anomalyOnly ? anomalyOnly.checked : false;

  // Filter
  displayedEntries = entries.filter(entry =>
    entry.companyName.toLowerCase().includes(filterText) ||
    entry.productName.toLowerCase().includes(filterText)
  );

  if (anomalyOnlyEnabled) {
    displayedEntries = displayedEntries.filter((entry) => anomalyMap.get(entry.id)?.isAnomaly);
  }

  if (minEmission !== null && Number.isFinite(minEmission)) {
    displayedEntries = displayedEntries.filter((entry) => Number(entry.co2Emission) >= minEmission);
  }

  if (maxEmission !== null && Number.isFinite(maxEmission)) {
    displayedEntries = displayedEntries.filter((entry) => Number(entry.co2Emission) <= maxEmission);
  }

  if (startDate) {
    displayedEntries = displayedEntries.filter((entry) => new Date(entry.createdAt) >= startDate);
  }

  if (endDate) {
    displayedEntries = displayedEntries.filter((entry) => new Date(entry.createdAt) <= endDate);
  }

  // Sort
  displayedEntries.sort((a, b) => {
    switch (sortValue) {
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'co2-high':
        return b.co2Emission - a.co2Emission;
      case 'co2-low':
        return a.co2Emission - b.co2Emission;
      case 'newest':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  renderEntries();
}

function renderEntries() {
  entriesContainer.innerHTML = '';

  if (displayedEntries.length === 0) {
    entriesContainer.innerHTML =
      '<p style="color: var(--muted); grid-column: 1/-1; text-align: center; padding: 40px; font-size: 1rem;">📋 No records found. Add your first carbon entry to get started.</p>';
    return;
  }

  displayedEntries.forEach((entry, index) => {
    const card = createEntryCard(entry);
    card.style.animationDelay = `${index * 0.05}s`;
    entriesContainer.appendChild(card);
  });
}

// ===== FETCH ENTRIES =====
async function loadEntries() {
  loadingState.style.display = 'block';
  renderSkeletonCards();

  try {
    const response = await fetch('/entries');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error('Failed to load entries');
    }

    entries = Array.isArray(result.data) ? result.data : [];
    anomalyMap = buildAnomalyMap(entries);
    displayedEntries = [...entries];
    calculateTotals();
    filterAndSort();
  } catch (error) {
    entriesContainer.innerHTML = `
      <p style="color: var(--danger); grid-column: 1/-1; text-align: center; padding: 40px;">
        ⚠️ Error loading records. Please refresh.
      </p>
    `;
    console.error('Load error:', error);
  } finally {
    loadingState.style.display = 'none';
  }
}

function parseCsvText(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const rows = lines.slice(1);
  return rows
    .map((line) => {
      const [companyName, productName, co2Emission] = line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''));
      return {
        companyName,
        productName,
        co2Emission: Number(co2Emission)
      };
    })
    .filter((record) => record.companyName && record.productName && Number.isFinite(record.co2Emission) && record.co2Emission > 0);
}

async function importCsvRecords(file) {
  const text = await file.text();
  const records = parseCsvText(text);

  if (records.length === 0) {
    showToast('No valid rows found. Expected CSV: companyName,productName,co2Emission', 'error');
    return;
  }

  importBtn.disabled = true;
  importBtn.textContent = 'Importing...';

  let successCount = 0;
  for (const record of records) {
    try {
      const response = await fetch('/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      const result = await response.json();
      if (response.ok && result.success) {
        successCount += 1;
      }
    } catch (_error) {
    }
  }

  await loadEntries();
  showToast(`Imported ${successCount}/${records.length} records`, successCount > 0 ? 'success' : 'error');
  importBtn.disabled = false;
  importBtn.textContent = '📤 Import CSV';
}

// ===== SUBMIT FORM =====
async function addEntry(event) {
  event.preventDefault();

  const companyName = document.getElementById('companyName').value.trim();
  const productName = document.getElementById('productName').value.trim();
  const co2Emission = parseFloat(document.getElementById('co2Emission').value);

  if (!companyName || !productName || Number.isNaN(co2Emission) || co2Emission <= 0) {
    showToast('❌ Please fill all fields with valid values', 'error');
    return;
  }

  submitButton.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'flex';

  try {
    const response = await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        productName,
        co2Emission
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to add entry');
    }

    // Add to entries array
    entries.unshift({
      id: result.data.id,
      hash: result.data.hash,
      txHash: result.data.txHash || null,
      companyName: result.data.companyName,
      productName: result.data.productName,
      co2Emission: result.data.co2Emission,
      createdAt: result.data.createdAt
    });

    displayedEntries = [...entries];
    
    // Reset form and render
    form.reset();
    calculateTotals();
    renderEntries();

    // Show success message
    const message = result.data.txHash
      ? `✅ Stored on Blockchain! Hash: ${result.data.hash.slice(0, 10)}...`
      : `✅ Entry added! Hash: ${result.data.hash.slice(0, 10)}...`;
    showToast(message, 'success');

    // Scroll to new entry
    setTimeout(() => {
      entriesContainer.firstChild?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

  } catch (error) {
    showToast(`❌ ${error.message || 'Error adding entry'}`, 'error');
    console.error('Submit error:', error);
  } finally {
    submitButton.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
}

// ===== EVENT LISTENERS =====
form.addEventListener('submit', addEntry);

if (exportBtn) {
  exportBtn.addEventListener('click', exportToCSV);
}

if (filterInput) {
  filterInput.addEventListener('input', filterAndSort);
}

if (sortSelect) {
  sortSelect.addEventListener('change', filterAndSort);
}

if (minEmissionInput) {
  minEmissionInput.addEventListener('input', filterAndSort);
}

if (maxEmissionInput) {
  maxEmissionInput.addEventListener('input', filterAndSort);
}

if (startDateInput) {
  startDateInput.addEventListener('change', filterAndSort);
}

if (endDateInput) {
  endDateInput.addEventListener('change', filterAndSort);
}

if (anomalyOnly) {
  anomalyOnly.addEventListener('change', filterAndSort);
}

if (importBtn && csvInput) {
  importBtn.addEventListener('click', () => csvInput.click());
  csvInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await importCsvRecords(file);
    csvInput.value = '';
  });
}

entriesContainer.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.matches('.mini-copy[data-copy]')) {
    const value = target.getAttribute('data-copy');
    if (!value) {
      return;
    }
    navigator.clipboard.writeText(value)
      .then(() => {
        const previous = target.textContent;
        target.textContent = '✓ Copied';
        setTimeout(() => {
          target.textContent = previous;
        }, 1600);
      })
      .catch(() => {
        showToast('Failed to copy transaction hash', 'error');
      });
  }

  if (target.matches('.download-qr')) {
    const card = target.closest('.entry-card');
    const canvas = card?.querySelector('.qr-box canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      showToast('QR not ready yet', 'error');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `ecotrace-qr-${Date.now()}.png`;
    anchor.click();
    showToast('QR downloaded', 'success');
  }

  if (target.matches('.share-qr')) {
    const card = target.closest('.entry-card');
    const link = card?.querySelector('a[href*="verify.html"]')?.getAttribute('href');
    if (!link) {
      showToast('Verification link unavailable', 'error');
      return;
    }
    const absoluteLink = link.startsWith('http') ? link : `${window.location.origin}${link}`;
    if (navigator.share) {
      navigator.share({
        title: 'EcoTrace Verification QR',
        text: 'Don’t trust claims. Verify emissions.',
        url: absoluteLink
      }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(absoluteLink)
      .then(() => showToast('Verification link copied', 'success'))
      .catch(() => showToast('Failed to share link', 'error'));
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadEntries();
});

// Reload entries periodically
setInterval(() => {
  if (document.visibilityState === 'visible') {
    loadEntries();
  }
}, 30000);
