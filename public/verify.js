const loading = document.getElementById('verifyLoading');
const errorBox = document.getElementById('verifyError');
const content = document.getElementById('verifyContent');
const qrSection = document.getElementById('qrSection');
const qrDisplay = document.getElementById('qrDisplay');

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
    let item = null;

    // Try to fetch from server first
    try {
      const response = await fetch(`/get/${encodeURIComponent(id)}`);
      const result = await response.json();

      if (response.ok && result.success) {
        item = result.data;
      }
    } catch (serverError) {
      // Fallback to localStorage if server fails
      const data = JSON.parse(localStorage.getItem('ecoData')) || [];
      item = data.find(d => d.id === id);
      
      if (!item) {
        throw new Error('Record not found in local storage.');
      }
    }

    if (!item) {
      throw new Error('Unable to verify record.');
    }

    // Populate details
    document.getElementById('vCompany').textContent = item.companyName;
    document.getElementById('vProduct').textContent = item.productName;
    document.getElementById('vEmission').textContent = `${item.co2Emission} kg`;
    document.getElementById('vTimestamp').textContent = new Date(item.createdAt).toLocaleString();
    document.getElementById('vHash').textContent = item.hash;
    document.getElementById('vStatus').textContent = item.txHash ? 'Verified on Blockchain' : 'Hash Verified';

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
      const qrLink = `${window.location.href}`;
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
