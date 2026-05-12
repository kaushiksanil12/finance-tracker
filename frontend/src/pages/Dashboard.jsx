import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import API from '../services/api';
import { formatCurrency, formatDate, getMonthName } from '../components/UI';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, net_balance: 0, transaction_count: 0 });
  const [trend, setTrend] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [daily, setDaily] = useState([]);
  const [recentTx, setRecentTx] = useState([]);

  useEffect(() => {
    Promise.all([
      API.get('/transactions/summary'),
      API.get('/analytics/monthly-trend'),
      API.get('/analytics/category-breakdown'),
      API.get('/analytics/daily-spending'),
      API.get('/transactions?limit=5')
    ]).then(([s, t, b, d, tx]) => {
      setSummary(s.data.summary);
      setTrend(t.data.trend);
      setBreakdown(b.data.breakdown);
      setDaily(d.data.daily);
      setRecentTx(tx.data.transactions);
    }).catch(console.error);
  }, []);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dailyMap = {};
  daily.forEach(d => dailyMap[d.day] = parseFloat(d.total));

  return (
    <>
      <div className="page-header"><div><h1>Dashboard</h1><p>Your financial overview this month</p></div></div>

      <div className="stats-grid">
        <div className="stat-card income"><div className="stat-icon">💰</div><div className="stat-label">Total Income</div><div className="stat-value">{formatCurrency(summary.total_income)}</div></div>
        <div className="stat-card expense"><div className="stat-icon">💸</div><div className="stat-label">Total Expenses</div><div className="stat-value">{formatCurrency(summary.total_expense)}</div></div>
        <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-label">Net Balance</div><div className="stat-value" style={{color: summary.net_balance >= 0 ? '#10b981' : '#f43f5e'}}>{formatCurrency(summary.net_balance)}</div></div>
        <div className="stat-card"><div className="stat-icon">📋</div><div className="stat-label">Transactions</div><div className="stat-value">{summary.transaction_count}</div></div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Income vs Expenses (Last 6 Months)</h3>
          <div className="chart-container">
            <Line data={{
              labels: trend.map(d => getMonthName(d.month) + ' ' + d.year),
              datasets: [
                { label: 'Income', data: trend.map(d => d.income), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
                { label: 'Expenses', data: trend.map(d => d.expense), borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', fill: true, tension: 0.4 }
              ]
            }} options={{ responsive: true, plugins: { legend: { labels: { color: '#9b97b0' } } }, scales: { x: { ticks: { color: '#6b6880' }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#6b6880' }, grid: { color: 'rgba(255,255,255,0.04)' } } } }} />
          </div>
        </div>
        <div className="chart-card">
          <h3>Expense Breakdown</h3>
          <div className="chart-container">
            {breakdown.length > 0 ? (
              <Doughnut data={{
                labels: breakdown.map(d => d.name),
                datasets: [{ data: breakdown.map(d => d.total), backgroundColor: breakdown.map(d => d.color), borderWidth: 0 }]
              }} options={{ responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#9b97b0', padding: 12, usePointStyle: true } } } }} />
            ) : <p style={{color:'#6b6880',textAlign:'center',paddingTop:40}}>No expense data yet</p>}
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 28 }}>
        <h3>Daily Spending This Month</h3>
        <div className="chart-container">
          <Bar data={{
            labels: dayLabels,
            datasets: [{ label: 'Spending', data: dayLabels.map(d => dailyMap[d] || 0), backgroundColor: 'rgba(139,92,246,0.5)', borderColor: '#8b5cf6', borderWidth: 1, borderRadius: 4 }]
          }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b6880' }, grid: { display: false } }, y: { ticks: { color: '#6b6880' }, grid: { color: 'rgba(255,255,255,0.04)' } } } }} />
        </div>
      </div>

      <div className="table-card">
        <div className="table-header"><h3>Recent Transactions</h3><Link to="/transactions" className="btn btn-secondary btn-sm">View All →</Link></div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
          <tbody>
            {recentTx.length === 0 ? (
              <tr><td colSpan="4" style={{textAlign:'center',color:'#6b6880',padding:32}}>No transactions yet</td></tr>
            ) : recentTx.map(t => (
              <tr key={t.id}>
                <td>{formatDate(t.transaction_date)}</td>
                <td>{t.category_icon || '📁'} {t.description || t.category_name || 'Uncategorized'}</td>
                <td><span className={`badge badge-${t.type}`}>{t.category_name || '—'}</span></td>
                <td className={`amount-${t.type}`}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
