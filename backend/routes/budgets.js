const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month || now.getMonth() + 1, year = req.query.year || now.getFullYear();
    const [rows] = await pool.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
        COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id=b.category_id AND t.user_id=b.user_id AND t.type='expense' AND MONTH(t.transaction_date)=b.month AND YEAR(t.transaction_date)=b.year),0) as spent
       FROM budgets b JOIN categories c ON b.category_id=c.id WHERE b.user_id=? AND b.month=? AND b.year=? ORDER BY c.name`,
      [req.user.id, month, year]);
    res.json({ budgets: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/status', auth, async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month || now.getMonth() + 1, year = req.query.year || now.getFullYear();
    const [rows] = await pool.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
        COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id=b.category_id AND t.user_id=b.user_id AND t.type='expense' AND MONTH(t.transaction_date)=b.month AND YEAR(t.transaction_date)=b.year),0) as spent
       FROM budgets b JOIN categories c ON b.category_id=c.id WHERE b.user_id=? AND b.month=? AND b.year=? ORDER BY c.name`,
      [req.user.id, month, year]);
    const tb = rows.reduce((s,b) => s + parseFloat(b.monthly_limit), 0);
    const ts = rows.reduce((s,b) => s + parseFloat(b.spent), 0);
    res.json({ budgets: rows, overview: { total_budget: tb, total_spent: ts, remaining: tb - ts, usage_percent: tb > 0 ? Math.round((ts/tb)*100) : 0 } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { category_id, monthly_limit, month, year } = req.body;
    if (!category_id || !monthly_limit) return res.status(400).json({ error: 'Category and limit required.' });
    const now = new Date();
    const m = month || now.getMonth() + 1, y = year || now.getFullYear();
    const [cat] = await pool.query('SELECT id,type FROM categories WHERE id=? AND user_id=?', [category_id, req.user.id]);
    if (!cat.length) return res.status(400).json({ error: 'Invalid category.' });
    if (cat[0].type !== 'expense') return res.status(400).json({ error: 'Only expense categories.' });
    await pool.query('INSERT INTO budgets (user_id,category_id,monthly_limit,month,year) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE monthly_limit=VALUES(monthly_limit)',
      [req.user.id, category_id, monthly_limit, m, y]);
    const [row] = await pool.query('SELECT b.*,c.name as category_name,c.color as category_color,c.icon as category_icon FROM budgets b JOIN categories c ON b.category_id=c.id WHERE b.user_id=? AND b.category_id=? AND b.month=? AND b.year=?',
      [req.user.id, category_id, m, y]);
    res.status(201).json({ budget: row[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM budgets WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
