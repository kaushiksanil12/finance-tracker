const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { type, category_id, start_date, end_date, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE t.user_id = ?';
    const params = [req.user.id];
    if (type) { where += ' AND t.type = ?'; params.push(type); }
    if (category_id) { where += ' AND t.category_id = ?'; params.push(parseInt(category_id)); }
    if (start_date) { where += ' AND t.transaction_date >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND t.transaction_date <= ?'; params.push(end_date); }
    const [cnt] = await pool.query(`SELECT COUNT(*) as total FROM transactions t ${where}`, params);
    const [rows] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
       ${where} ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]);
    res.json({ transactions: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: cnt[0].total, totalPages: Math.ceil(cnt[0].total / parseInt(limit)) } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const m = req.query.month || now.getMonth() + 1, y = req.query.year || now.getFullYear();
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as total_expense,
        COUNT(*) as transaction_count FROM transactions
       WHERE user_id = ? AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?`, [req.user.id, m, y]);
    const r = rows[0];
    r.net_balance = parseFloat(r.total_income) - parseFloat(r.total_expense);
    res.json({ summary: r });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { category_id, type, amount, description, transaction_date } = req.body;
    if (!type || !amount || !transaction_date) return res.status(400).json({ error: 'Type, amount, date required.' });
    if (category_id) {
      const [c] = await pool.query('SELECT id FROM categories WHERE id=? AND user_id=?', [category_id, req.user.id]);
      if (!c.length) return res.status(400).json({ error: 'Invalid category.' });
    }
    const [result] = await pool.query('INSERT INTO transactions (user_id,category_id,type,amount,description,transaction_date) VALUES (?,?,?,?,?,?)',
      [req.user.id, category_id || null, type, amount, description || '', transaction_date]);
    const [row] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?`, [result.insertId]);
    res.status(201).json({ transaction: row[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { category_id, type, amount, description, transaction_date } = req.body;
    const [ex] = await pool.query('SELECT id FROM transactions WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!ex.length) return res.status(404).json({ error: 'Not found.' });
    await pool.query('UPDATE transactions SET category_id=COALESCE(?,category_id),type=COALESCE(?,type),amount=COALESCE(?,amount),description=COALESCE(?,description),transaction_date=COALESCE(?,transaction_date) WHERE id=?',
      [category_id, type, amount, description, transaction_date, req.params.id]);
    const [row] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?`, [req.params.id]);
    res.json({ transaction: row[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM transactions WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
