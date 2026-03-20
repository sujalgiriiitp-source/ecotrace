const form = document.getElementById('entryForm');
const companyNameInput = document.getElementById('companyName');
const productNameInput = document.getElementById('productName');
const co2EmissionInput = document.getElementById('co2Emission');
const submitButton = document.getElementById('submitButton');
const formMessage = document.getElementById('formMessage');
const entriesContainer = document.getElementById('entriesContainer');
const totalEntries = document.getElementById('totalEntries');
const totalEmissions = document.getElementById('totalEmissions');
const loadingState = document.getElementById('loadingState');

let entries = [];

function setMessage(message, type = 'default') {
  formMessage.textContent = message;
  formMessage.classList.remove('error', 'success');
  if (type === 'error') {
    formMessage.classList.add('error');
  }
  if (type === 'success') {
    formMessage.classList.add('success');
  }
}

function calculateTotals() {
  const totalEmissionValue = entries.reduce((sum, entry) => sum + Number(entry.co2Emission || 0), 0);
  totalEntries.textContent = String(entries.length);
  totalEmissions.textContent = totalEmissionValue.toFixed(2);
}

function createEntryCard(entry) {
  const card = document.createElement('article');
  card.className = 'entry-card';

  const verificationLink = `${window.location.origin}/verify.html?id=${encodeURIComponent(entry.id)}`;

  card.innerHTML = `
    <p><strong>Company:</strong> ${entry.companyName}</p>
    <p><strong>Product:</strong> ${entry.productName}</p>
    <p><strong>CO2:</strong> ${entry.co2Emission} kg</p>
    <p><strong>ID:</strong> ${entry.id}</p>
    <p><strong>Hash:</strong> <span class="hash">${entry.hash}</span></p>
    <p><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">Open Verification</a></p>
    <div class="qr-box" id="qr-${entry.id}"></div>
  `;

  const qrContainer = card.querySelector(`#qr-${CSS.escape(entry.id)}`);
  if (qrContainer && window.QRCode) {
    new QRCode(qrContainer, {
      text: verificationLink,
      width: 120,
      height: 120,
      colorDark: '#111111',
      colorLight: '#ffffff'
    });
  }

  return card;
}

function renderEntries() {
  entriesContainer.innerHTML = '';

  if (entries.length === 0) {
    entriesContainer.innerHTML = '<p class="muted">No records yet. Add your first carbon entry.</p>';
    calculateTotals();
    return;
  }

  const sortedEntries = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sortedEntries.forEach((entry) => {
    const card = createEntryCard(entry);
    entriesContainer.appendChild(card);
  });

  calculateTotals();
}

async function loadEntries() {
  loadingState.classList.remove('hidden');
  try {
    const response = await fetch('/entries');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load entries.');
    }

    entries = Array.isArray(result.data) ? result.data : [];
    renderEntries();
  } catch (error) {
    entriesContainer.innerHTML = `<p class="status-message error">${error.message || 'Unable to fetch records.'}</p>`;
  } finally {
    loadingState.classList.add('hidden');
  }
}

async function addEntry(event) {
  event.preventDefault();

  const payload = {
    companyName: companyNameInput.value.trim(),
    productName: productNameInput.value.trim(),
    co2Emission: Number(co2EmissionInput.value)
  };

  if (!payload.companyName || !payload.productName || Number.isNaN(payload.co2Emission)) {
    setMessage('Please fill in all fields with valid values.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Adding...';
  setMessage('Submitting record for verification...');

  try {
    const response = await fetch('/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to add record.');
    }

    const newEntry = {
      id: result.data.id,
      hash: result.data.hash,
      companyName: result.data.companyName,
      productName: result.data.productName,
      co2Emission: result.data.co2Emission,
      createdAt: result.data.createdAt
    };

    entries.push(newEntry);
    renderEntries();

    const verificationLink = `${window.location.origin}/verify.html?id=${encodeURIComponent(newEntry.id)}`;
    setMessage(`Record verified. ID: ${newEntry.id} | Hash: ${newEntry.hash.slice(0, 12)}...`, 'success');

    form.reset();
    console.log('Verification link:', verificationLink);
  } catch (error) {
    setMessage(error.message || 'Something went wrong while adding the record.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Add & Verify';
  }
}

form.addEventListener('submit', addEntry);
loadEntries();
