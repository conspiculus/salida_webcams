const express = require('express');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, 'cameras.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} catch (err) {
  console.error('Failed to read cameras.json:', err.message);
  process.exit(1);
}

const PORT = config.port || 3000;
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  try {
    const freshConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    res.json(freshConfig);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read cameras.json' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webcam dashboard running at http://localhost:${PORT}`);
});
