require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const Web3 = require('web3');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let web3Instance = null;

async function initWeb3() {
  try {
    const infuraKey = process.env.INFURA_API_KEY;
    const privKey = process.env.ETHEREUM_PRIVATE_KEY;

    if (!infuraKey || !privKey) {
      console.warn('⚠️  Blockchain disabled: Missing INFURA_API_KEY or ETHEREUM_PRIVATE_KEY');
      return null;
    }

    const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${infuraKey}`));
    const account = web3.eth.accounts.privateKeyToAccount(privKey);
    web3.eth.accounts.wallet.add(account);

    web3Instance = { web3, account };
    console.log('✅ Blockchain connected:', account.address);
    return web3Instance;
  } catch (error) {
    console.warn('⚠️  Blockchain init failed:', error.message);
    return null;
  }
}

async function storeOnBlockchain(entryData) {
  if (!web3Instance) return null;

  try {
    const { web3, account } = web3Instance;
    const dataString = JSON.stringify(entryData);
    const dataHex = web3.utils.utf8ToHex(dataString);

    const tx = {
      from: account.address,
      to: account.address,
      value: '0',
      data: dataHex,
      gas: 100000
    };

    const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

    return receipt.transactionHash;
  } catch (error) {
    console.error('Blockchain error:', error.message);
    return null;
  }
}

async function ensureDatabase() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ entries: [] }, null, 2));
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');

  try {
    const data = JSON.parse(raw || '{}');
    return Array.isArray(data.entries) ? data : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function generateHash(entry) {
  const payload = `${entry.id}|${entry.companyName}|${entry.productName}|${entry.co2Emission}|${entry.createdAt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

app.post('/add', async (req, res) => {
  try {
    const { companyName, productName, co2Emission } = req.body;

    if (!companyName || !productName || co2Emission === undefined) {
      return res.status(400).json({
        success: false,
        message: 'companyName, productName, and co2Emission are required.'
      });
    }

    const parsedEmission = Number(co2Emission);
    if (Number.isNaN(parsedEmission) || parsedEmission < 0) {
      return res.status(400).json({
        success: false,
        message: 'co2Emission must be a valid non-negative number.'
      });
    }

    const entry = {
      id: generateId(),
      companyName: String(companyName).trim(),
      productName: String(productName).trim(),
      co2Emission: parsedEmission,
      createdAt: new Date().toISOString()
    };

    entry.hash = generateHash(entry);
    entry.txHash = await storeOnBlockchain(entry);

    const db = await readDatabase();
    db.entries.push(entry);
    await writeDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Entry added successfully.',
      data: {
        id: entry.id,
        hash: entry.hash,
        txHash: entry.txHash,
        companyName: entry.companyName,
        productName: entry.productName,
        co2Emission: entry.co2Emission,
        createdAt: entry.createdAt
      }
    });
  } catch (error) {
    console.error('POST /add error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add entry.'
    });
  }
});

app.get('/get/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDatabase();
    const entry = db.entries.find((item) => item.id === id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.'
      });
    }

    return res.json({
      success: true,
      data: {
        ...entry,
        verificationStatus: entry.txHash ? 'Verified on Blockchain' : 'Verified'
      }
    });
  } catch (error) {
    console.error('GET /get/:id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entry.'
    });
  }
});

app.get('/entries', async (req, res) => {
  try {
    const db = await readDatabase();
    return res.json({ success: true, data: db.entries });
  } catch (error) {
    console.error('GET /entries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entries.'
    });
  }
});

app.use((error, req, res) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error.'
  });
});

async function start() {
  await ensureDatabase();
  await initWeb3();

  app.listen(PORT, () => {
    console.log(`\n🌱 EcoTrace running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
  });
}

start();
