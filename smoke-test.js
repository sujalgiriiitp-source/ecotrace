const { spawn } = require('child_process');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let ready = false;
  server.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('EcoTrace server running')) {
      ready = true;
    }
  });

  server.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });

  for (let i = 0; i < 30; i += 1) {
    if (ready) break;
    await wait(100);
  }

  if (!ready) {
    server.kill('SIGTERM');
    throw new Error('Server did not start in time.');
  }

  try {
    const addRes = await fetch('http://localhost:3000/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Demo Co',
        productName: 'Demo Product',
        co2Emission: 42.5
      })
    });

    const addData = await addRes.json();
    if (!addRes.ok || !addData.success) {
      throw new Error('POST /add failed');
    }

    const id = addData.data.id;
    const getRes = await fetch(`http://localhost:3000/get/${encodeURIComponent(id)}`);
    const getData = await getRes.json();

    if (!getRes.ok || !getData.success) {
      throw new Error('GET /get/:id failed');
    }

    if (getData.data.verificationStatus !== 'Verified') {
      throw new Error('Verification status mismatch');
    }

    console.log('Smoke test passed.');
  } finally {
    server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
