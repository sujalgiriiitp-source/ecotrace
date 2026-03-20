const loading = document.getElementById('verifyLoading');
const errorBox = document.getElementById('verifyError');
const content = document.getElementById('verifyContent');

function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = '✓ Copied';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  });
}

async function loadVerification() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    loading.classList.add('hidden');
    errorBox.textContent = 'Missing record ID in URL.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch(`/get/${encodeURIComponent(id)}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to verify record.');
    }

    const item = result.data;

    document.getElementById('vProduct').textContent = item.productName;
    document.getElementById('vCompany').textContent = item.companyName;
    document.getElementById('vEmission').textContent = `${item.co2Emission} kg`;
    document.getElementById('vHash').textContent = item.hash;
    document.getElementById('vStatus').textContent = item.verificationStatus || 'Verified';

    if (item.txHash) {
      const txRow = document.getElementById('txHashRow');
      document.getElementById('vTxHash').textContent = item.txHash;
      txRow.classList.remove('hidden');

      document.getElementById('copyTxBtn').addEventListener('click', () => {
        copyToClipboard(item.txHash, document.getElementById('copyTxBtn'));
      });
    }

    document.getElementById('copyHashBtn').addEventListener('click', () => {
      copyToClipboard(item.hash, document.getElementById('copyHashBtn'));
    });

    content.classList.remove('hidden');
  } catch (error) {
    errorBox.textContent = error.message || 'Verification failed.';
    errorBox.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

loadVerification();
