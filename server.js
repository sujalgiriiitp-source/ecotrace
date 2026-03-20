const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    if (!Array.isArray(data.entries)) {
      return { entries: [] };
    }
    return data;
  } catch {
    return { entries: [] };
  }
}

async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function generateHash(entry) {
  const payload = `${entry.id}|${entry.companyName}|${entry.productName}|${entry.co2Emission}|${entry.createdAt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

app.post('/add', async (req, res, next) => {
  try {
    const { companyName, productName, co2Emission } = req.body;

    if (!companyName || !productName || co2Emission === undefined || co2Emission === null) {
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

    const db = await readDatabase();
    db.entries.push(entry);
    await writeDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Entry added successfully.',
      data: {
        id: entry.id,
        hash: entry.hash,
        companyName: entry.companyName,
        productName: entry.productName,
        co2Emission: entry.co2Emission,
        createdAt: entry.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/get/:id', async (req, res, next) => {
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
        verificationStatus: 'Verified'
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/entries', async (req, res, next) => {
  try {
    const db = await readDatabase();
    return res.json({ success: true, data: db.entries });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error. Please try again later.'
  });
});

app.listen(PORT, async () => {
  await ensureDatabase();
  console.log(`EcoTrace server running at http://localhost:${PORT}`);
});
