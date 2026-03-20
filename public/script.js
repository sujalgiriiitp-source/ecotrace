// ===== ELEMENTS =====
const form = document.getElementById('entryForm');
const submitButton = document.getElementById('submitButton');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.querySelector('.btn-loader');
const entriesContainer = document.getElementById('entriesContainer');
const totalEntries = document.getElementById('totalEntries');
const totalEmissions = document.getElementById('totalEmissions');
const blockchainCount = document.getElementById('blockchainCount');
const loadingState = document.getElementById('loadingState');
const toastContainer = document.getElementById('toastContainer');

let entries = [];

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
  
  animateCounter(totalEntries, entries.length);
  animateCounter(totalEmissions, parseFloat(total.toFixed(2)));
  animateCounter(blockchainCount, blockchain);
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

// ===== RENDERING =====
function renderEntries() {
  entriesContainer.innerHTML = '';

  if (entries.length === 0) {
    entriesContainer.innerHTML =
      '<p style="color: var(--muted); grid-column: 1/-1; text-align: center; padding: 40px; font-size: 1rem;">📋 No records yet. Add your first carbon entry to get started.</p>';
    calculateTotals();
    return;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach((entry, index) => {
    const card = createEntryCard(entry);
    card.style.animationDelay = `${index * 0.05}s`;
    entriesContainer.appendChild(card);
  });

  calculateTotals();
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

    // Reset form and render
    form.reset();
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
