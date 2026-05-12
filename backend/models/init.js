const pool = require('../config/db');

async function initializeDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(100) NOT NULL,
      type ENUM('income','expense') NOT NULL, color VARCHAR(7) DEFAULT '#6366f1',
      icon VARCHAR(50) DEFAULT '📁', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_category (user_id, name, type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, category_id INT,
      type ENUM('income','expense') NOT NULL, amount DECIMAL(12,2) NOT NULL,
      description VARCHAR(500), transaction_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      INDEX idx_user_date (user_id, transaction_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS budgets (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, category_id INT NOT NULL,
      monthly_limit DECIMAL(12,2) NOT NULL, month INT NOT NULL, year INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE KEY unique_budget (user_id, category_id, month, year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log('✅ Database tables initialized');
  } finally { conn.release(); }
}

async function seedDefaultCategories(userId) {
  const cats = [
    {name:'Salary',type:'income',color:'#10b981',icon:'💰'},
    {name:'Freelance',type:'income',color:'#06b6d4',icon:'💻'},
    {name:'Investments',type:'income',color:'#8b5cf6',icon:'📈'},
    {name:'Other Income',type:'income',color:'#f59e0b',icon:'🎁'},
    {name:'Food & Dining',type:'expense',color:'#ef4444',icon:'🍔'},
    {name:'Transportation',type:'expense',color:'#f97316',icon:'🚗'},
    {name:'Shopping',type:'expense',color:'#ec4899',icon:'🛍️'},
    {name:'Bills & Utilities',type:'expense',color:'#6366f1',icon:'📱'},
    {name:'Entertainment',type:'expense',color:'#a855f7',icon:'🎬'},
    {name:'Health',type:'expense',color:'#14b8a6',icon:'🏥'},
    {name:'Education',type:'expense',color:'#3b82f6',icon:'📚'},
    {name:'Rent',type:'expense',color:'#64748b',icon:'🏠'},
  ];
  for (const c of cats) {
    await pool.query('INSERT IGNORE INTO categories (user_id,name,type,color,icon) VALUES (?,?,?,?,?)',
      [userId, c.name, c.type, c.color, c.icon]);
  }
}

module.exports = { initializeDatabase, seedDefaultCategories };
