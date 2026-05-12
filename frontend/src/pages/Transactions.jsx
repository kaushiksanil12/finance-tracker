import { useState, useEffect } from 'react';
import API from '../services/api';
import { Modal, useToast, formatCurrency, formatDate } from '../components/UI';

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ type: '', category_id: '', start_date: '', end_date: '' });
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ type: 'expense', category_id: '', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0] });
  const { showToast, ToastContainer } = useToast();

  useEffect(() => { API.get('/categories').then(r => setCategories(r.data.categories)); }, []);
  useEffect(() => { loadTx(); }, [filters, pagination.page]);

  const loadTx = async () => {
    const params = new URLSearchParams({ page: pagination.page, limit: 15 });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const { data } = await API.get(`/transactions?${params}`);
    setTxs(data.transactions);
    setPagination(p => ({ ...p, ...data.pagination }));
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ type: 'expense', category_id: '', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0] });
    setModal(true);
  };

  const openEdit = (t) => {
    setEditId(t.id);
    setForm({ type: t.type, category_id: t.category_id || '', amount: t.amount, description: t.description || '', transaction_date: t.transaction_date?.split('T')[0] || '' });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.transaction_date) { showToast('Amount and date required', 'error'); return; }
    try {
      const body = { ...form, amount: parseFloat(form.amount), category_id: form.category_id || null };
      if (editId) { await API.put(`/transactions/${editId}`, body); showToast('Updated'); }
      else { await API.post('/transactions', body); showToast('Added'); }
      setModal(false); loadTx();
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try { await API.delete(`/transactions/${id}`); showToast('Deleted'); loadTx(); }
    catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const filteredCats = categories.filter(c => !form.type || c.type === form.type);

  return (
    <>
      <ToastContainer />
      <div className="page-header">
        <div><h1>Transactions</h1><p>Manage your income and expenses</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      <div className="table-card">
        <div className="filters">
          <select className="filter-select" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">All Types</option><option value="income">Income</option><option value="expense">Expense</option>
          </select>
          <select className="filter-select" value={filters.category_id} onChange={e => setFilters({...filters, category_id: e.target.value})}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input type="date" className="filter-input" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} />
          <input type="date" className="filter-input" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} />
        </div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {txs.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center',color:'#6b6880',padding:40}}>No transactions found</td></tr>
            ) : txs.map(t => (
              <tr key={t.id}>
                <td>{formatDate(t.transaction_date)}</td>
                <td>{t.description || '—'}</td>
                <td><span className={`badge badge-${t.type}`}>{t.category_icon || ''} {t.category_name || 'N/A'}</span></td>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td className={`amount-${t.type}`}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</td>
                <td>
                  <button className="btn btn-secondary btn-icon" onClick={() => openEdit(t)}>✏️</button>
                  <button className="btn btn-secondary btn-icon" onClick={() => handleDelete(t.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({...p, page: p.page - 1}))}>← Prev</button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({...p, page: p.page + 1}))}>Next →</button>
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Edit Transaction' : 'Add Transaction'} footer={
        <><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>
      }>
        <div className="form-group"><label>Type</label>
          <select className="filter-select" style={{width:'100%'}} value={form.type} onChange={e => setForm({...form, type: e.target.value, category_id: ''})}>
            <option value="expense">Expense</option><option value="income">Income</option>
          </select>
        </div>
        <div className="form-group"><label>Category</label>
          <select className="filter-select" style={{width:'100%'}} value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
            <option value="">— Select —</option>
            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Amount</label><input type="number" placeholder="0.00" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
        <div className="form-group"><label>Description</label><input type="text" placeholder="What was this for?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div className="form-group"><label>Date</label><input type="date" value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})} /></div>
      </Modal>
    </>
  );
}
