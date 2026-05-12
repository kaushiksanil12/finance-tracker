import { NavLink, useNavigate } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('finance_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('finance_token');
    localStorage.removeItem('finance_user');
    navigate('/');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>💸 FinanceFlow</h2>
          <span>Personal Finance</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/transactions" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">💳</span> Transactions
          </NavLink>
          <NavLink to="/categories" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">🏷️</span> Categories
          </NavLink>
          <NavLink to="/budgets" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">🎯</span> Budgets
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.name?.charAt(0) || 'U'}</div>
            <div>
              <div className="user-name">{user.name || 'User'}</div>
              <div className="user-email">{user.email || ''}</div>
            </div>
          </div>
          <button className="nav-link" onClick={handleLogout} style={{border:'none',background:'none',width:'100%',cursor:'pointer',textAlign:'left'}}>
            <span className="icon">🚪</span> Logout
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
