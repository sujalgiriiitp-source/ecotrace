# EcoTrace – TOP 1% Hackathon Product 🌱

**Carbon Lifecycle Tracking & Blockchain Verification System** – Production-ready, premium UI, enterprise features.

![Status](https://img.shields.io/badge/Status-Production--Ready-00ff9f?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 🚀 What Makes EcoTrace TOP 1%?

### 🎨 **Premium UI/UX**
- **Glassmorphism Design**: Frosted glass cards with backdrop blur effects
- **Particle Animations**: Subtle background particle drift system
- **Gradient Glow Movement**: Animated gradient background that shifts smoothly
- **Card Hover Effects**: Tilt and lift effects on hover with glow shadows
- **Smooth Animations**: `fadeInUp`, `fadeInDown`, `pulseGlow`, `spin` keyframes
- **Dark Neon Theme**: `#0a0a0a` background with `#00ff9f` neon green accents and cyan highlights
- **Responsive Design**: Mobile-first, fully responsive across all breakpoints

### ⛓️ **Blockchain Integration**
- **Ethereum Sepolia Testnet**: Real blockchain transaction support via Web3.js
- **Infura API**: Secure RPC connection with private key management
- **Immutable Records**: SHA256 hashing + blockchain transaction hashes
- **Etherscan Integration**: Direct links to view transactions on Sepolia explorer
- **Smart Encoding**: JSON records encoded as hex and stored on-chain

### 📊 **Data Visualization**
- **Chart.js Integration**: Dual-axis chart showing per-entry and cumulative CO2 emissions
- **Animated Counters**: Smooth number animations when stats update
- **Real-time Updates**: Charts refresh as new entries are added
- **Export to CSV**: Download all records with company, product, CO2, blockchain data

### 🔍 **Advanced Features**
- **Search & Filter**: Live search by company or product name
- **Multi-sort Options**: Sort by newest, oldest, highest CO2, lowest CO2
- **QR Code Generation**: Each entry generates a scannable QR linking to verification
- **Copy-to-Clipboard**: Hash and transaction hash one-click copy
- **Loading Skeletons**: Professional loading states during fetch
- **Toast Notifications**: Success/error messages with smooth animations
- **Data Export**: CSV download with all entry details

### ✅ **Trust & Verification**
- **Verification Page**: Dedicated page showing blockchain proof
- **Immutable Badge**: Visual indicator that records cannot be modified
- **Timestamp Display**: Human-readable creation date/time
- **SHA256 Display**: Full hash visibility for cryptographic verification
- **Blockchain Link**: Direct Etherscan link for on-chain verification
- **QR Sharing**: Generate QR codes for record sharing

---

## 🏗️ Architecture

```
EcoTrace/
├── server.js              # Express backend with Web3.js
├── database.json          # Local persistent storage
├── package.json           # Dependencies: express, web3, dotenv
├── .env.example           # Configuration template
├── .gitignore             # Version control
├── public/
│   ├── index.html         # Dashboard (form + records grid + chart)
│   ├── verify.html        # Verification page with blockchain details
│   ├── style.css          # 800+ lines of premium styling & animations
│   ├── script.js          # Dashboard logic, filtering, charting, export
│   └── verify.js          # Verification logic, copy-to-clipboard
└── README.md              # This file
```

---

## 🎯 Features at a Glance

| Feature | Status | Details |
|---------|--------|---------|
| **Form Submission** | ✅ | Add company, product, CO2 with validation |
| **Dashboard** | ✅ | Grid view of all records with animations |
| **QR Codes** | ✅ | Generated per record, opens verify page |
| **Blockchain** | ✅ | Ethereum Sepolia testnet integration |
| **Chart** | ✅ | Dual-axis emissions timeline with Chart.js |
| **Export** | ✅ | CSV download with all data |
| **Search** | ✅ | Real-time filter by company/product |
| **Sort** | ✅ | 4 sort options (date, CO2) |
| **Verification** | ✅ | Dedicated verification page |
| **Etherscan** | ✅ | Direct links to view txns on blockchain |
| **Copy-Paste** | ✅ | One-click hash/tx hash copy |
| **Responsive** | ✅ | Mobile, tablet, desktop optimized |
| **Loading States** | ✅ | Spinners, skeletons, progress feedback |
| **Animations** | ✅ | Page transitions, card hover, pulse effects |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20+, Express 4.21+ |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Blockchain** | Web3.js 4.8+, Ethereum Sepolia |
| **Storage** | JSON file (local) or PostgreSQL (production) |
| **Visualization** | Chart.js 3.9+ |
| **QR Generation** | qrcode.js 1.5+ |
| **Styling** | Pure CSS (no frameworks) with Poppins font |

---

## 📋 API Endpoints

### `POST /add`
Add a new carbon entry and store on blockchain.

**Request:**
```json
{
  "companyName": "Nike",
  "productName": "Air Max 90",
  "co2Emission": 45.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "hash": "sha256-hash",
    "txHash": "0x...",
    "companyName": "Nike",
    "productName": "Air Max 90",
    "co2Emission": 45.5,
    "createdAt": "2026-03-20T10:30:00Z"
  }
}
```

### `GET /entries`
Retrieve all entries.

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### `GET /get/:id`
Retrieve a specific entry with blockchain verification status.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "hash": "sha256",
    "txHash": "0x...",
    "verificationStatus": "Verified on Blockchain",
    ...
  }
}
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- (Optional) Infura API key for blockchain features

### Local Development

```bash
# Clone & setup
git clone https://github.com/sujalgiriiitp-source/ecotrace.git
cd ecotrace

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Infura API key (optional)

# Start server
npm start

# Open browser
# http://localhost:3000
```

### Environment Variables

Create `.env` file:

```env
PORT=3000
NODE_ENV=development

# Blockchain (optional - app works without)
INFURA_API_KEY=your_infura_key_here
ETHEREUM_PRIVATE_KEY=your_private_key_here
```

---

## 🧪 Testing

### Smoke Tests
```bash
npm run test:smoke
```

### Manual Testing
1. Visit `http://localhost:3000`
2. Fill form: Company, Product, CO2
3. Submit → See success toast
4. View in dashboard grid
5. Click "Verify & View Details" → Opens verification page
6. Scan QR code → Redirects to verification
7. Export data → Downloads CSV file

---

## 🚀 Deployment

### Deploy to Render.com

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables in dashboard
4. Deploy branch: `main`
5. Live at: `https://ecotrace.onrender.com`

### Deploy to Vercel (Frontend Only)
```bash
npm i -g vercel
vercel
```

### Deploy to AWS / DigitalOcean
Use Docker for containerization.

---

## 📊 Dashboard Features

### Stats Section
- **Total Entries**: Count of all records
- **Total CO2 Tracked**: Sum of all emissions in kg
- **Blockchain Verified**: Count of records with tx hash
- **Avg CO2 Per Entry**: Average emissions across records

### Chart Visualization
- **Per-Entry CO2** (green line): Individual record emissions
- **Cumulative CO2** (cyan line): Running total over time
- Hover for detailed data
- Responsive to screen size

### Records Grid
- **Search Bar**: Filter by company or product name
- **Sort Dropdown**: 4 options for ordering
- **Entry Cards**: Show company, product, CO2, ID, blockchain status, QR code
- **Verification Link**: Direct to verification page
- **Export Button**: Download all records as CSV

---

## 🔐 Security & Best Practices

- **Environment Variables**: Never commit `.env` file
- **Private Keys**: Stored in `.env`, never exposed in code
- **Input Validation**: All form inputs validated server & client side
- **CORS**: Configured for localhost (update for production)
- **Content Security**: No eval, no inline scripts
- **HTTPS**: Required for production deployment

---

## 📱 Mobile Responsiveness

Breakpoints:
- **Desktop**: 1200px+ (full featured)
- **Tablet**: 768px-1199px (optimized layout)
- **Mobile**: <768px (single column, touch-friendly)

All animations disabled on `prefers-reduced-motion`.

---

## 🎨 Design System

### Colors
- **Background**: `#0a0a0a` (true black)
- **Accent**: `#00ff9f` (neon green)
- **Secondary**: `#00c3ff` (cyan)
- **Text**: `#f5fff9` (off-white)
- **Muted**: `#a2b3ab` (gray)
- **Danger**: `#ff5579` (red)

### Typography
- **Font**: Poppins (Google Fonts)
- **Weights**: 300 (light), 400 (regular), 600 (semibold), 700 (bold)
- **Base Size**: 1rem (16px)

### Shadows & Effects
- **Blur**: `backdrop-filter: blur(12px)`
- **Glow**: `box-shadow: 0 0 20px rgba(0, 255, 159, 0.2)`
- **Borders**: 1px with `rgba(0, 255, 159, 0.2)` color

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m "Add amazing feature"`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📝 License

MIT License – See LICENSE file

---

## 🙋 Support

For issues, questions, or feature requests:
- **GitHub Issues**: [Open an issue](https://github.com/sujalgiriiitp-source/ecotrace/issues)
- **Email**: support@ecotrace.dev

---

**Built with ❤️ for the hackathon. Top 1% product quality.** 🚀

This test starts the server, adds a record, verifies it via API, and checks verification status.
