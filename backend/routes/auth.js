const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { seedDefaultCategories } = require('../models/init');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars.' });
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)', [name, email, hash]);
    await seedDefaultCategories(result.insertId);
    const token = jwt.sign({ id: result.insertId, name, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.insertId, name, email } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(401).json({ error: 'Invalid credentials.' });
    const valid = await bcrypt.compare(password, users[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
    const u = users[0];
    const token = jwt.sign({ id: u.id, name: u.name, email: u.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: u.id, name: u.name, email: u.email } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id,name,email,created_at FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) return res.status(404).json({ error: 'Not found.' });
    res.json({ user: users[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
