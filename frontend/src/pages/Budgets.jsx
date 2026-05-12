import { useState, useEffect } from 'react';
import API from '../services/api';
import { Modal, useToast, formatCurrency } from '../components/UI';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [overview, setOverview] = useState({ total_budget: 0, total_spent: 0, remaining: 0, usage_percent: 0 });
  const [expenseCats, setExpenseCats] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category_id: '', monthly_limit: '' });
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    API.get('/categories').then(r => setExpenseCats(r.data.categories.filter(c => c.type === 'expense')));
    load();
  }, []);

  const load = async () => {
    const { data } = await API.get('/budgets/status');
    setBudgets(data.budgets);
    setOverview(data.overview);
  };

  const handleSave = async () => {
    if (!form.category_id || !form.monthly_limit) { showToast('Select category and set limit', 'error'); return; }
    try {
      await API.post('/budgets', { category_id: parseInt(form.category_id), monthly_limit: parseFloat(form.monthly_limit) });
      showToast('Budget saved'); setModal(false); load();
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this budget?')) return;
    try { await API.delete(`/budgets/${id}`); showToast('Removed'); load(); }
    catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  return (
    <>
      <ToastContainer />
      <div className="page-header">
        <div><h1>Budgets</h1><p>Set monthly spending limits by category</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ category_id: '', monthly_limit: '' }); setModal(true); }}>+ Set Budget</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-label">Total Budget</div><div className="stat-value">{formatCurrency(overview.total_budget)}</div></div>
        <div className="stat-card expense"><div className="stat-icon">💸</div><div className="stat-label">Total Spent</div><div className="stat-value">{formatCurrency(overview.total_spent)}</div></div>
        <div className="stat-card income"><div className="stat-icon">💰</div><div className="stat-label">Remaining</div><div className="stat-value">{formatCurrency(overview.remaining)}</div></div>
        <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-label">Usage</div><div className="stat-value">{overview.usage_percent}%</div></div>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state"><div className="icon">🎯</div><h3>No budgets set</h3><p>Set spending limits for your categories</p></div>
      ) : (
        <div className="budgets-grid">
          {budgets.map(b => {
            const spent = parseFloat(b.spent), limit = parseFloat(b.monthly_limit);
            const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
            const status = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'ok';
            const barColor = status === 'danger' ? 'var(--expense)' : status === 'warning' ? 'var(--warning)' : 'var(--income)';
            const label = pct >= 100 ? '⚠️ Over budget!' : pct >= 75 ? '⚡ Approaching limit' : '✅ On track';
            return (
              <div key={b.id} className="budget-card">
                <div className="budget-card-header">
                  <div className="budget-category"><span className="budget-category-icon">{b.category_icon}</span><span className="budget-category-name">{b.category_name}</span></div>
                  <button className="btn btn-secondary btn-icon" onClick={() => handleDelete(b.id)}>🗑️</button>
                </div>
                <div className="budget-amounts"><span>Spent: <strong>{formatCurrency(spent)}</strong></span><span>Limit: <strong>{formatCurrency(limit)}</strong></span></div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`, background: barColor}}></div></div>
                <div className={`budget-status ${status}`}>{label} — {pct}% used</div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Set Monthly Budget" footer={
        <><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>
      }>
        <div className="form-group"><label>Expense Category</label>
          <select className="filter-select" style={{width:'100%'}} value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
            <option value="">— Select —</option>
            {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Monthly Limit (₹)</label>
          <input type="number" placeholder="5000" min="1" step="100" value={form.monthly_limit} onChange={e => setForm({...form, monthly_limit: e.target.value})} />
        </div>
      </Modal>
    </>
  );
}
