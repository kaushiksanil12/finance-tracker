const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/monthly-trend', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT YEAR(transaction_date) as year, MONTH(transaction_date) as month,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense
       FROM transactions WHERE user_id=? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY YEAR(transaction_date), MONTH(transaction_date) ORDER BY year, month`, [req.user.id]);
    res.json({ trend: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/category-breakdown', auth, async (req, res) => {
  try {
    const now = new Date();
    const m = req.query.month || now.getMonth()+1, y = req.query.year || now.getFullYear();
    const [rows] = await pool.query(
      `SELECT c.name,c.color,c.icon,SUM(t.amount) as total FROM transactions t
       JOIN categories c ON t.category_id=c.id WHERE t.user_id=? AND t.type='expense'
       AND MONTH(t.transaction_date)=? AND YEAR(t.transaction_date)=?
       GROUP BY c.id,c.name,c.color,c.icon ORDER BY total DESC`, [req.user.id, m, y]);
    res.json({ breakdown: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/daily-spending', auth, async (req, res) => {
  try {
    const now = new Date();
    const m = req.query.month || now.getMonth()+1, y = req.query.year || now.getFullYear();
    const [rows] = await pool.query(
      `SELECT DAY(transaction_date) as day, SUM(amount) as total FROM transactions
       WHERE user_id=? AND type='expense' AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?
       GROUP BY DAY(transaction_date) ORDER BY day`, [req.user.id, m, y]);
    res.json({ daily: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
