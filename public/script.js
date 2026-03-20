const form = document.getElementById('entryForm');
const submitButton = document.getElementById('submitButton');
const entriesContainer = document.getElementById('entriesContainer');
const totalEntries = document.getElementById('totalEntries');
const totalEmissions = document.getElementById('totalEmissions');
const loadingState = document.getElementById('loadingState');
const toastContainer = document.getElementById('toastContainer');

let entries = [];

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function calculateTotals() {
  const total = entries.reduce((sum, entry) => sum + Number(entry.co2Emission || 0), 0);
  totalEntries.textContent = entries.length;
  totalEmissions.textContent = total.toFixed(2);
}

function createEntryCard(entry) {
  const card = document.createElement('article');
  card.className = 'entry-card';

  const verificationLink = `${window.location.origin}/verify.html?id=${encodeURIComponent(entry.id)}`;
  const txHashDisplay = entry.txHash
    ? `<p><strong>Blockchain:</strong> <span style="color: #00ff9f; font-size: 0.8rem;">Recorded ✅</span></p>`
    : '';

  card.innerHTML = `
    <p><strong>🏢 Company:</strong> ${entry.companyName}</p>
    <p><strong>📦 Product:</strong> ${entry.productName}</p>
    <p><strong>🌍 CO2:</strong> ${entry.co2Emission} kg</p>
    <p><strong>🆔 ID:</strong> ${entry.id.substring(0, 12)}...</p>
    ${txHashDisplay}
    <p><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">→ Verify Record</a></p>
    <div class="qr-box" id="qr-${CSS.escape(entry.id)}"></div>
  `;

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
      console.warn('QR generation skipped');
    }
  }

  return card;
}

function renderEntries() {
  entriesContainer.innerHTML = '';

  if (entries.length === 0) {
    entriesContainer.innerHTML = '<p style="color: var(--muted); grid-column: 1/-1; text-align: center; padding: 40px;">No records yet. Add your first carbon entry above.</p>';
    calculateTotals();
    return;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach((entry) => {
    entriesContainer.appendChild(createEntryCard(entry));
  });

  calculateTotals();
}

async function loadEntries() {
  try {
    const response = await fetch('/entries');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error('Failed to load');
    }

    entries = Array.isArray(result.data) ? result.data : [];
    renderEntries();
  } catch (error) {
    entriesContainer.innerHTML = `<p style="color: var(--danger); grid-column: 1/-1;">Error loading records</p>`;
  } finally {
    loadingState.style.display = 'none';
  }
}

async function addEntry(event) {
  event.preventDefault();

  const payload = {
    companyName: document.getElementById('companyName').value.trim(),
    productName: document.getElementById('productName').value.trim(),
    co2Emission: Number(document.getElementById('co2Emission').value)
  };

  if (!payload.companyName || !payload.productName || Number.isNaN(payload.co2Emission)) {
    showToast('Please fill all fields correctly', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Adding...';

  try {
    const response = await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed');
    }

    entries.push({
      id: result.data.id,
      hash: result.data.hash,
      txHash: result.data.txHash,
      companyName: result.data.companyName,
      productName: result.data.productName,
      co2Emission: result.data.co2Emission,
      createdAt: result.data.createdAt
    });

    renderEntries();
    form.reset();

    const msg = result.data.txHash ? '✅ Recorded on blockchain!' : '✅ Entry added!';
    showToast(msg, 'success');
  } catch (error) {
    showToast(error.message || 'Error adding record', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Add & Verify';
  }
}

form.addEventListener('submit', addEntry);
loadEntries();
