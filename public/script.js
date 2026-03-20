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
const loadingState = document.getElementById('loadingState');
const toastContainer = document.getElementById('toastContainer');
const exportBtn = document.getElementById('exportBtn');
const emissionsChartCanvas = document.getElementById('emissionsChart');
const filterInput = document.getElementById('filterInput');
const sortSelect = document.getElementById('sortSelect');

let entries = [];
let chartInstance = null;
let displayedEntries = [];

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
}

function animateCounter(element, target) {
  const current = parseInt(element.textContent) || 0;
  const duration = 600;
  const increment = (target - current) / (duration / 16);
  let value = current;

  const timer = setInterval(() => {
    value += increment;
    if (
      (increment > 0 && value >= target) ||
      (increment < 0 && value <= target)
    ) {
      element.textContent = target.toFixed(element === totalEmissions ? 2 : 0);
      clearInterval(timer);
    } else {
      element.textContent = value.toFixed(element === totalEmissions ? 2 : 0);
    }
  }, 16);
}

// ===== CARD CREATION =====
function createEntryCard(entry) {
  const card = document.createElement('article');
  card.className = 'entry-card';

  const verificationLink = `${window.location.origin}/verify.html?id=${encodeURIComponent(entry.id)}`;
  const blockchainBadge = entry.txHash
    ? `<p style="color: var(--accent); font-weight: 600; margin: 8px 0;"><span style="font-size: 1.1rem;">✅</span> Recorded on Blockchain</p>`
    : '';

  card.innerHTML = `
    <p><strong>🏢 Company:</strong> ${entry.companyName}</p>
    <p><strong>📦 Product:</strong> ${entry.productName}</p>
    <p><strong>🌍 CO2:</strong> ${entry.co2Emission} kg</p>
    <p><strong>🆔 ID:</strong> ${entry.id.substring(0, 10)}...</p>
    ${blockchainBadge}
    <p style="margin-top: 12px;"><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">→ Verify & View Details</a></p>
    <div class="qr-box" id="qr-${CSS.escape(entry.id)}"></div>
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

  return card;
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
  const filterText = filterInput.value.toLowerCase();
  const sortValue = sortSelect.value;

  // Filter
  displayedEntries = entries.filter(entry =>
    entry.companyName.toLowerCase().includes(filterText) ||
    entry.productName.toLowerCase().includes(filterText)
  );

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
  entriesContainer.innerHTML = '';

  try {
    const response = await fetch('/entries');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error('Failed to load entries');
    }

    entries = Array.isArray(result.data) ? result.data : [];
    displayedEntries = [...entries];
    calculateTotals();
    renderEntries();
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
      ? '✅ Stored on Blockchain! Record is immutable.'
      : '✅ Entry added successfully!';
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
