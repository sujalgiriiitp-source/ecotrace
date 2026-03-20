# EcoTrace – Carbon Lifecycle Tracking and Verification System

EcoTrace is a demo-ready full-stack web application for creating and verifying immutable-style carbon records.

## Tech Stack

- Backend: Node.js + Express
- Frontend: HTML, CSS, Vanilla JavaScript
- Database: Local JSON file (`database.json`)

## Features

- Add carbon lifecycle entries with `companyName`, `productName`, and `co2Emission`
- Auto-generates unique IDs and SHA256 hashes for each record
- Verification endpoint to fetch and validate record details
- Dashboard with total entries, total emissions, and QR code per record
- Verification page with immutable record label
- Loading states, smooth UI transitions, and responsive dark theme design

## Project Structure

```text
EcoTrace/
  server.js
  database.json
  package.json
  public/
    index.html
    verify.html
    style.css
    script.js
```

## Run Locally

```bash
npm install
npm start
```

Open:
- `http://localhost:3000/` for dashboard
- `http://localhost:3000/verify.html?id=<id>` for record verification

## Quick Smoke Test

```bash
npm run test:smoke
```

This test starts the server, adds a record, verifies it via API, and checks verification status.
