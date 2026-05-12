const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./models/init');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => console.log(`\n🚀 API running on http://localhost:${PORT}\n`));
  } catch (e) {
    console.error('❌ Failed to start:', e.message);
    process.exit(1);
  }
}
start();
