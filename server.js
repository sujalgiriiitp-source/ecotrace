require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const Web3 = require('web3');


const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// --- City coordinates mapping ---
const cities = {
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  jaunpur: { lat: 25.7463, lng: 82.6833 },
  factory: { lat: 28.7041, lng: 77.1025 }, // Example: Delhi outskirts
  warehouse: { lat: 28.5355, lng: 77.3910 }, // Example: Noida warehouse
  transport: { lat: 28.4595, lng: 77.0266 } // Example: Gurugram transport hub
};

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    console.log('[REQ_BODY]', req.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    console.log(`[RES] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
    return originalJson(payload);
  };

  next();
});

let web3Instance = null;
let contractInstance = null;

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

    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractAbiRaw = process.env.CONTRACT_ABI;
    if (contractAddress && contractAbiRaw) {
      try {
        const parsedAbi = JSON.parse(contractAbiRaw);
        contractInstance = new web3.eth.Contract(parsedAbi, contractAddress);
        console.log('✅ Smart contract loaded:', contractAddress);
      } catch (contractError) {
        contractInstance = null;
        console.warn('⚠️  Contract init failed:', contractError.message);
      }
    }

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
    if (contractInstance) {
      const methodCandidates = [
        () => contractInstance.methods.storeHash(entryData.hash),
        () => contractInstance.methods.recordHash(entryData.hash),
        () => contractInstance.methods.registerRecord(entryData.hash, entryData.id)
      ];

      for (const buildMethod of methodCandidates) {
        try {
          const contractMethod = buildMethod();
          const gas = await contractMethod.estimateGas({ from: account.address });
          const receipt = await contractMethod.send({ from: account.address, gas: Number(gas) + 20000 });
          return receipt.transactionHash;
        } catch (_methodError) {
        }
      }
    }

    const dataString = JSON.stringify(entryData);
    const dataHex = web3.utils.utf8ToHex(dataString);

    const tx = {
      from: account.address,
      to: account.address,
      value: '0',
      data: dataHex,
      gas: 120000
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
    if (!Array.isArray(data.entries)) {
      return { entries: [] };
    }

    data.entries = data.entries.map((entry) => ({
      ...entry,
      journey: normalizeJourney(entry)
    }));

    return data;
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
  const payload = `${entry.companyName}${entry.productName}${entry.co2Emission}${entry.createdAt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function normalizeJourney(entry) {
  if (!Array.isArray(entry.journey) || entry.journey.length === 0) {
    return [];
  }

  return entry.journey.map((step, index) => {
    const rawStatus = String(step.status || 'Pending').trim();
    const normalizedStatus = ['Success', 'Pending', 'Failed'].includes(rawStatus)
      ? rawStatus
      : 'Pending';

    return {
      location: step.location || 'Unknown',
      step: step.step || `Step ${index + 1}`,
      co2: Number(step.co2) || 0,
      timestamp: step.timestamp || entry.createdAt || new Date().toISOString(),
      status: normalizedStatus
    };
  });
}

const STEP_FACTORS = {
  Factory: 0.08,
  Warehouse: 0.05,
  Transport: 0.12,
  Destination: 0.03
};

const ROUTE_STEPS = [
  { step: 'Factory', percent: 0.2, location: 'Factory' },
  { step: 'Warehouse', percent: 0.3, location: 'Warehouse Hub' },
  { step: 'Transport', percent: 0.3, location: 'Transport Corridor' },
  { step: 'Destination', percent: 0.2, location: null }
];

const FALLBACK_CITY_DISTANCE_KM = {
  'factory-warehouse': 24,
  'warehouse-transport': 42,
  'transport-delhi': 36,
  'transport-mumbai': 1415,
  'transport-bangalore': 2110,
  'transport-kolkata': 1510,
  'transport-jaunpur': 760,
  'warehouse-delhi': 30,
  'warehouse-mumbai': 1420,
  'warehouse-bangalore': 2098,
  'warehouse-kolkata': 1498,
  'warehouse-jaunpur': 748
};


// --- Real distance using OpenRouteService API ---
async function getDistance(origin, destination) {
  const apiKey = process.env.ORS_API_KEY;
  const from = String(origin || '').trim().toLowerCase();
  const to = String(destination || '').trim().toLowerCase();
  const directKey = `${from}-${to}`;
  const reverseKey = `${to}-${from}`;

  const fallbackDistance = FALLBACK_CITY_DISTANCE_KM[directKey] || FALLBACK_CITY_DISTANCE_KM[reverseKey] || null;

  if (!apiKey) {
    if (fallbackDistance) return fallbackDistance;
    throw new Error('ORS_API_KEY not set');
  }

  // Accepts city name or {lat, lng} object
  function toCoords(place) {
    if (typeof place === 'string' && cities[place.toLowerCase()]) {
      const c = cities[place.toLowerCase()];
      return [c.lng, c.lat];
    }
    if (typeof place === 'object' && place.lat && place.lng) {
      return [place.lng, place.lat];
    }
    throw new Error('Unknown city or coordinates: ' + JSON.stringify(place));
  }

  let start, end;
  try {
    start = toCoords(origin);
    end = toCoords(destination);
  } catch (e) {
    throw new Error('Invalid origin/destination: ' + e.message);
  }

  const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
  try {
    const resp = await axios.post(url, {
      coordinates: [start, end]
    }, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });
    const meters = resp.data.routes[0].summary.distance;
    return meters / 1000; // km
  } catch (err) {
    if (fallbackDistance) {
      return fallbackDistance;
    }
    throw new Error('OpenRouteService API error: ' + (err.response?.data?.error || err.message));
  }
}

// --- CO2 calculation ---
function calculateCO2(distance, type = 'truck') {
  const factors = {
    truck: 0.12, // kg/km
    train: 0.04,
    air: 0.5
  };
  return Number((distance * (factors[type] || 0.12)).toFixed(2));
}

// --- AI suggestion ---
function getAISuggestion(co2) {
  if (co2 < 50) return 'Eco Friendly 🌱';
  if (co2 < 150) return 'Moderate Emission ⚖️';
  return 'High Emission ⚠️ Optimize logistics';
}

function getEcoRating(totalCo2) {
  if (totalCo2 < 50) return 'Eco Friendly';
  if (totalCo2 <= 150) return 'Moderate';
  return 'High Impact';
}

function getEfficiencyScore(totalCo2, totalDistance) {
  if (!totalDistance || totalDistance <= 0) return 100;
  const intensity = totalCo2 / totalDistance;
  const score = 100 - (intensity * 100);
  return Number(Math.max(0, Math.min(100, score)).toFixed(2));
}

function isHighEmission(totalCo2) {
  return totalCo2 > 150;
}

function getRating(totalCo2) {
  if (totalCo2 < 100) return '🌱 Eco Friendly';
  if (totalCo2 < 400) return '⚠ Moderate';
  return '❌ High Impact';
}


// --- Smart Trace Engine (real distance, modular) ---
async function buildSmartJourney(productId, origin, destination) {
  // Steps: Factory → Warehouse → Transport → Destination
  const normalizedOrigin = String(origin || 'factory').trim().toLowerCase();
  const normalizedDestination = String(destination || '').trim().toLowerCase();

  const steps = [
    { step: 'Factory', location: normalizedOrigin },
    { step: 'Warehouse', location: 'warehouse' },
    { step: 'Transport', location: 'transport' },
    { step: 'Destination', location: normalizedDestination }
  ];

  const segmentModes = ['truck', 'train', 'truck'];

  for (let index = 0; index < steps.length; index += 1) {
    steps[index].distance = 0;
    steps[index].co2 = 0;
  }

  for (let index = 1; index < steps.length; index += 1) {
    const sourceLocation = steps[index - 1].location;
    const targetLocation = steps[index].location;
    const segmentDistance = await getDistance(sourceLocation, targetLocation);
    const segmentMode = segmentModes[index - 1] || 'truck';

    steps[index].distance = Number(segmentDistance.toFixed(2));
    steps[index].co2 = calculateCO2(steps[index].distance, segmentMode);
    steps[index].mode = segmentMode;
  }

  // Timestamps
  const now = Date.now();
  steps.forEach((s, i) => {
    s.timestamp = new Date(now + i * 2 * 60 * 60 * 1000).toISOString();
    s.status = 'Success';
    s.icon = s.step;
    s.productId = productId;
  });
  // Total distance/CO2
  const totalDistance = Number(steps.reduce((sum, step) => sum + (Number(step.distance) || 0), 0).toFixed(2));
  const totalCO2 = Number(steps.reduce((sum, step) => sum + (Number(step.co2) || 0), 0).toFixed(2));
  const aiSuggestion = getAISuggestion(totalCO2);
  const efficiency = getEfficiencyScore(totalCO2, totalDistance);
  const ecoRating = getEcoRating(totalCO2);
  const anomaly = isHighEmission(totalCO2);

  return {
    productId,
    origin: normalizedOrigin,
    destination: normalizedDestination,
    totalDistance,
    totalCO2,
    efficiency,
    ecoRating,
    anomaly,
    aiSuggestion,
    journey: steps
  };
}

function buildSmartJourneyFallback(productId, origin, destination) {
  const normalizedOrigin = String(origin || 'factory').trim().toLowerCase();
  const normalizedDestination = String(destination || '').trim().toLowerCase();
  const now = Date.now();

  const journey = [
    { step: 'Factory', location: normalizedOrigin, distance: 0, co2: 0, mode: 'truck' },
    { step: 'Warehouse', location: 'warehouse', distance: 24, co2: calculateCO2(24, 'truck'), mode: 'truck' },
    { step: 'Transport', location: 'transport', distance: 42, co2: calculateCO2(42, 'train'), mode: 'train' },
    { step: 'Destination', location: normalizedDestination, distance: 120, co2: calculateCO2(120, 'truck'), mode: 'truck' }
  ].map((step, index) => ({
    ...step,
    timestamp: new Date(now + index * 2 * 60 * 60 * 1000).toISOString(),
    status: 'Success',
    icon: step.step,
    productId
  }));

  const totalDistance = Number(journey.reduce((sum, step) => sum + step.distance, 0).toFixed(2));
  const totalCO2 = Number(journey.reduce((sum, step) => sum + step.co2, 0).toFixed(2));

  return {
    productId,
    origin: normalizedOrigin,
    destination: normalizedDestination,
    totalDistance,
    totalCO2,
    efficiency: getEfficiencyScore(totalCO2, totalDistance),
    ecoRating: getEcoRating(totalCO2),
    anomaly: isHighEmission(totalCO2),
    aiSuggestion: getAISuggestion(totalCO2),
    journey,
    fallback: true
  };
}
// --- New Smart Trace API ---
app.post('/smart-trace', async (req, res) => {
  try {
    const { productId, origin, destination } = req.body || {};
    if (!productId || !destination) {
      return res.status(400).json({
        success: false,
        message: 'productId and destination are required.'
      });
    }

    const cleanOrigin = String(origin || 'factory').trim();
    const cleanDestination = String(destination).trim();
    const trace = await buildSmartJourney(String(productId).trim(), cleanOrigin, cleanDestination);

    return res.json({
      success: true,
      ...trace
    });
  } catch (error) {
    console.error('POST /smart-trace error:', error);

    try {
      const fallback = buildSmartJourneyFallback(
        String(req.body?.productId || '').trim(),
        String(req.body?.origin || 'factory').trim(),
        String(req.body?.destination || '').trim()
      );

      return res.status(200).json({
        success: true,
        message: 'Using fallback smart trace data.',
        ...fallback
      });
    } catch (_fallbackError) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate smart trace.'
      });
    }
  }
});

async function handleAddEntry(req, res) {
  try {
    const { companyName, productName, co2Emission, journey } = req.body;

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
      createdAt: new Date().toISOString(),
      journey: Array.isArray(journey) ? journey : []
    };

    entry.journey = normalizeJourney(entry);

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
        createdAt: entry.createdAt,
        journey: entry.journey
      }
    });
  } catch (error) {
    console.error('POST /add-entry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add entry.'
    });
  }
}

app.post('/add-entry', handleAddEntry);
app.post('/add', handleAddEntry);


// --- Improved verification message ---
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
    // Recompute hash for verification
    const recomputedHash = generateHash(entry);
    let verificationStatus = 'Data Integrity Maintained';
    if (recomputedHash !== entry.hash) verificationStatus = 'Data Modified After Storage';
    if (entry.txHash) verificationStatus += ' (Blockchain Verified)';
    return res.json({
      success: true,
      data: {
        ...entry,
        verificationStatus
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

app.get('/entries/:id', async (req, res) => {
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

    return res.json({ success: true, data: entry });
  } catch (error) {
    console.error('GET /entries/:id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entry.'
    });
  }
});

app.post('/verify', async (req, res) => {
  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'id is required.'
      });
    }

    const db = await readDatabase();
    const entry = db.entries.find((item) => item.id === String(id).trim());

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.'
      });
    }

    const recomputedHash = generateHash(entry);
    const verified = recomputedHash === entry.hash;

    return res.json({
      success: true,
      data: {
        id: entry.id,
        verified,
        verificationStatus: verified ? 'Data Integrity Maintained' : 'Data Modified After Storage',
        storedHash: entry.hash,
        recomputedHash,
        txHash: entry.txHash || null,
        entry
      }
    });
  } catch (error) {
    console.error('POST /verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify entry.'
    });
  }
});

app.post('/generate-trace', async (req, res) => {
  try {
    const { productId, origin, destination } = req.body || {};

    if (!productId || !destination) {
      return res.status(400).json({
        success: false,
        message: 'productId and destination are required.'
      });
    }

    const cleanProductId = String(productId).trim();
    const cleanOrigin = String(origin || 'factory').trim();
    const cleanDestination = String(destination).trim();
    const trace = await buildSmartJourney(cleanProductId, cleanOrigin, cleanDestination);

    return res.json({
      success: true,
      totalDistance: trace.totalDistance,
      totalCO2: trace.totalCO2,
      efficiency: trace.efficiency,
      rating: trace.ecoRating,
      aiSuggestion: trace.aiSuggestion,
      anomaly: trace.anomaly,
      journey: trace.journey,
      data: trace
    });
  } catch (error) {
    console.error('POST /generate-trace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate smart trace.'
    });
  }
});

app.get('/trace', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'trace.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

app.use((error, req, res, next) => {
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
