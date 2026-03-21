const loading = document.getElementById('verifyLoading');
const errorBox = document.getElementById('verifyError');
const content = document.getElementById('verifyContent');
const qrSection = document.getElementById('qrSection');
const qrDisplay = document.getElementById('qrDisplay');

function generateHash(data) {
  return CryptoJS.SHA256(
    data.company + data.product + data.co2 + data.timestamp
  ).toString();
}

// ===== COPY TO CLIPBOARD =====
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.style.backgroundColor = 'rgba(0, 255, 159, 0.3)';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  }).catch(() => {
    alert('Failed to copy');
  });
}

function renderJourneyTrace(journey = [], createdAt = '') {
  const host = document.getElementById('verifyContent');
  if (!host) {
    return;
  }

  let section = document.getElementById('journeyTraceSection');
  if (!section) {
    section = document.createElement('section');
    section.id = 'journeyTraceSection';
    section.className = 'card';
    section.style.marginTop = '18px';
    section.innerHTML = '<h3 style="margin: 0 0 12px; color: var(--accent);">🧭 Journey Trace</h3><div id="journeyTraceList"></div>';
    host.appendChild(section);
  }

  const list = document.getElementById('journeyTraceList');
  if (!list) {
    return;
  }

  list.innerHTML = '';
  const steps = Array.isArray(journey) ? journey : [];
  if (steps.length === 0) {
    list.innerHTML = '<p class="muted">No journey data available.</p>';
    return;
  }

  steps.forEach((step, index) => {
    const rawStatus = String(step.status || 'Success');
    const isStepVerified = /verified|success/i.test(rawStatus) && !/tampered|failed/i.test(rawStatus);
    const statusText = isStepVerified ? 'Verified' : 'Tampered';
    const statusClass = isStepVerified ? 'valid' : 'invalid';
    const timestamp = step.timestamp || createdAt;
    const row = document.createElement('div');
    row.className = 'verify-row';
    row.style.flexDirection = 'column';
    row.style.alignItems = 'flex-start';
    row.style.gap = '6px';
    row.style.marginBottom = '10px';
    row.innerHTML = `
      <strong>${index + 1}. ${step.step || 'Step'} • ${step.location || 'Unknown'}</strong>
      <span>CO2: ${Number(step.co2 || 0).toFixed(2)} kg</span>
      <span>Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</span>
      <span class="${statusClass}">Status: ${statusText}</span>
    `;
    list.appendChild(row);
  });
}

// ===== LOAD VERIFICATION =====
async function loadVerification() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    loading.style.display = 'none';
    errorBox.textContent = '❌ Missing record ID in URL.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch('/entries');
    const result = await response.json();
    const data = Array.isArray(result?.data) ? result.data : [];
    const item = data.find(d => d.id === id);

    const statusElement = document.getElementById('status') || document.getElementById('vStatus');

    if (!item) {
      if (statusElement) {
        statusElement.innerText = 'Record not found ❌';
      }
      loading.style.display = 'none';
      content.classList.remove('hidden');
      return;
    }

    const verificationData = {
      company: item.company || item.companyName || '',
      product: item.product || item.productName || '',
      co2: String(item.co2 || item.co2Emission || ''),
      timestamp: item.timestamp || item.createdAt || ''
    };

    const newHash = generateHash(verificationData);

    console.log('Stored:', item.hash);
    console.log('New:', newHash);

    if (statusElement) {
      if (newHash === item.hash) {
        statusElement.innerText = 'Verified ✅';
      } else {
        statusElement.innerText = 'Tampered ❌';
      }
    }

    // Populate details
    document.getElementById('vCompany').textContent = item.companyName || item.company || 'N/A';
    document.getElementById('vProduct').textContent = item.productName || item.product || 'N/A';
    document.getElementById('vEmission').textContent = `${item.co2Emission || item.co2 || 'N/A'} kg`;
    document.getElementById('vTimestamp').textContent = new Date(item.createdAt || item.timestamp).toLocaleString();
    document.getElementById('vHash').textContent = item.hash;
    renderJourneyTrace(item.journey, item.createdAt || item.timestamp);

    // Copy hash button
    const copyHashBtn = document.getElementById('copyHashBtn');
    if (copyHashBtn) {
      copyHashBtn.addEventListener('click', () => {
        copyToClipboard(item.hash, copyHashBtn);
      });
    }

    // Blockchain transaction details
    if (item.txHash) {
      const txRow = document.getElementById('txHashRow');
      document.getElementById('vTxHash').textContent = item.txHash;
      txRow.classList.remove('hidden');

      // Etherscan link
      const etherscanLink = document.getElementById('etherscanLink');
      etherscanLink.href = `https://sepolia.etherscan.io/tx/${item.txHash}`;

      // Copy tx button
      const copyTxBtn = document.getElementById('copyTxBtn');
      copyTxBtn.addEventListener('click', () => {
        copyToClipboard(item.txHash, copyTxBtn);
      });
    }

    // Generate QR code for sharing
    if (qrDisplay && window.QRCode) {
      qrDisplay.innerHTML = '';
      const qrLink = `https://ecotrace-ibnh.onrender.com/verify.html?id=${encodeURIComponent(id)}`;
      new QRCode(qrDisplay, {
        text: qrLink,
        width: 180,
        height: 180,
        colorDark: '#00ff9f',
        colorLight: '#0a0a0a'
      });
      qrSection.style.display = 'block';
    }

    // Show content
    loading.style.display = 'none';
    content.classList.remove('hidden');

  } catch (error) {
    loading.style.display = 'none';
    errorBox.textContent = `❌ ${error.message}`;
    errorBox.classList.remove('hidden');
    console.error('Verification error:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadVerification);
