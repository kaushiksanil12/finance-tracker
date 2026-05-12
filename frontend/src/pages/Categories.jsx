import { useState, useEffect } from 'react';
import API from '../services/api';
import { Modal, useToast, formatCurrency } from '../components/UI';

const COLORS = ['#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#14b8a6','#64748b'];

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'expense', icon: '', color: COLORS[0] });
  const { showToast, ToastContainer } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await API.get('/categories');
    setCats(data.categories);
  };

  const openAdd = () => { setEditId(null); setForm({ name: '', type: 'expense', icon: '', color: COLORS[0] }); setModal(true); };
  const openEdit = (c) => { setEditId(c.id); setForm({ name: c.name, type: c.type, icon: c.icon, color: c.color }); setModal(true); };

  const handleSave = async () => {
    if (!form.name) { showToast('Name required', 'error'); return; }
    try {
      const body = { ...form, icon: form.icon || '📁' };
      if (editId) { await API.put(`/categories/${editId}`, body); showToast('Updated'); }
      else { await API.post('/categories', body); showToast('Created'); }
      setModal(false); load();
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try { await API.delete(`/categories/${id}`); showToast('Deleted'); load(); }
    catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  return (
    <>
      <ToastContainer />
      <div className="page-header">
        <div><h1>Categories</h1><p>Organize your income and expense types</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Category</button>
      </div>

      {cats.length === 0 ? (
        <div className="empty-state"><div className="icon">🏷️</div><h3>No categories yet</h3><p>Create your first category</p></div>
      ) : (
        <div className="categories-grid">
          {cats.map(c => (
            <div key={c.id} className="category-card">
              <div className="category-card-header">
                <span className="category-icon">{c.icon}</span>
                <div className="category-card-actions">
                  <button className="btn btn-secondary btn-icon" onClick={() => openEdit(c)}>✏️</button>
                  <button className="btn btn-secondary btn-icon" onClick={() => handleDelete(c.id)}>🗑️</button>
                </div>
              </div>
              <div className="category-name"><span className="color-dot" style={{background: c.color}}></span>{c.name}</div>
              <div className="category-type"><span className={`badge badge-${c.type}`}>{c.type}</span></div>
              <div className="category-stats">
                <div className="category-stat">Transactions<strong>{c.transaction_count}</strong></div>
                <div className="category-stat">Total<strong>{formatCurrency(c.total_amount)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Edit Category' : 'Add Category'} footer={
        <><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>
      }>
        <div className="form-group"><label>Name</label><input type="text" placeholder="e.g. Groceries" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="form-group"><label>Type</label>
          <select className="filter-select" style={{width:'100%'}} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="expense">Expense</option><option value="income">Income</option>
          </select>
        </div>
        <div className="form-group"><label>Icon (emoji)</label><input type="text" placeholder="🍕" maxLength={4} value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} /></div>
        <div className="form-group"><label>Color</label>
          <div className="color-options">
            {COLORS.map(c => (
              <div key={c} className={`color-option ${form.color === c ? 'selected' : ''}`} style={{background: c}} onClick={() => setForm({...form, color: c})} />
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
