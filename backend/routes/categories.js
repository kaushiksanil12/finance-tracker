const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(t.id) as transaction_count, COALESCE(SUM(t.amount),0) as total_amount
       FROM categories c LEFT JOIN transactions t ON t.category_id = c.id
       WHERE c.user_id = ? GROUP BY c.id ORDER BY c.type, c.name`, [req.user.id]);
    res.json({ categories: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type required.' });
    const [result] = await pool.query('INSERT INTO categories (user_id,name,type,color,icon) VALUES (?,?,?,?,?)',
      [req.user.id, name, type, color || '#6366f1', icon || '📁']);
    const [row] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ category: row[0] });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Category already exists.' });
    console.error(e); res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    const [ex] = await pool.query('SELECT id FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!ex.length) return res.status(404).json({ error: 'Not found.' });
    await pool.query('UPDATE categories SET name=COALESCE(?,name),type=COALESCE(?,type),color=COALESCE(?,color),icon=COALESCE(?,icon) WHERE id=?',
      [name, type, color, icon, req.params.id]);
    const [row] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json({ category: row[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
