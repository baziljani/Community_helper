// ...existing code...

// ...existing code...

// ...existing code...

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());


const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secure_secret';
const PORT = process.env.PORT || 5000;

// MySQL connection
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'community_helper'
};
let pool;
(async function initMySQL() {
  pool = await mysql.createPool(MYSQL_CONFIG);
  // Create tables if not exist
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    passwordHash VARCHAR(255),
    role VARCHAR(32) DEFAULT 'user'
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    formId VARCHAR(255),
    formName VARCHAR(255),
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Seed admin
  const [rows] = await pool.query('SELECT * FROM users WHERE username=?', ['admin']);
  if (rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
    console.log('Created admin user: admin/admin123');
  }
  console.log('Connected to MySQL');
})();

// Sample forms (could be moved to DB if desired)
const sampleForms = [
  { id: 'reg-1', name: 'Basic Registration Form', fields: ['Full Name', 'Email', 'Phone'] },
  { id: 'leave-1', name: 'Leave Application', fields: ['Employee Name', 'From Date', 'To Date', 'Reason'] },
  { id: 'address-1', name: 'Address Change Form', fields: ['Full Name', 'Old Address', 'New Address'] },
  { id: 'job-application', name: 'Job Application Form', fields: [
    'Full Name',
    'Email',
    'Phone',
    'Date of Birth',
    'Highest Qualification',
    'Degree',
    'Branch',
    'Year of Graduation',
    'Year of Passing',
    'CGPA/Percentage',
    'Experience (years)',
    'Skills',
    'Resume Link'
  ] }
];
console.log('Sample forms loaded:', sampleForms);

// Auth middleware
function authMiddleware(roles = []) {
  return async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: 'Missing token' });
    const token = auth.startsWith('Bearer ') ? auth.replace(/^Bearer\s+/, '') : auth;
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

// Routes
app.get('/status', (req, res) => res.json({ ok: true }));


app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing fields' });
  const [rows] = await pool.query('SELECT * FROM users WHERE username=?', [username]);
  if (rows.length > 0) return res.status(400).json({ message: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)', [username, hash, 'user']);
  res.json({ message: 'User created' });
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing fields' });
  const [rows] = await pool.query('SELECT * FROM users WHERE username=?', [username]);
  if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Wrong password' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.role, username: user.username });
});

app.get('/forms', authMiddleware(), (req, res) => {
  res.json(sampleForms);
});


app.post('/generate', authMiddleware(), async (req, res) => {
  const { formId, values } = req.body;
  const tpl = sampleForms.find(f => f.id === formId);
  if (!tpl) return res.status(404).json({ message: 'Form not found' });

  const inputsHtml = tpl.fields.map(field => {
    const key = field.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const val = (values && values[key]) ? values[key] : '';
    const safeVal = String(val).replace(/"/g, '&quot;');
    return `<label>${field}</label><input name="${key}" value="${safeVal}" style="display:block;margin-bottom:8px;padding:6px;width:100%"/>`;
  }).join('\n');

  const formHtml = `<!doctype html>\n<html>\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width,initial-scale=1" />\n    <title>${tpl.name}</title>\n  </head>\n  <body>\n    <form onsubmit="event.preventDefault(); alert('Form submitted (demo)');">\n      <h3>${tpl.name}</h3>\n      ${inputsHtml}\n      <button type=\"submit\">Submit</button>\n    </form>\n  </body>\n</html>`;

  // save log to DB
  await pool.query('INSERT INTO logs (username, formId, formName) VALUES (?, ?, ?)', [req.user.username, tpl.id, tpl.name]);

  const iframeCode = `<iframe srcdoc="${formHtml.replace(/"/g, '&quot;')}" width="600" height="400"></iframe>`;
  res.json({ formHtml, iframeCode });
});


app.get('/admin/logs', authMiddleware(['admin']), async (req, res) => {
  const [logs] = await pool.query('SELECT * FROM logs ORDER BY date DESC LIMIT 200');
  res.json(logs);
});

// Admin: Get all users (for /admin/users)
app.get('/admin/users', authMiddleware(['admin']), async (req, res) => {
  const [users] = await pool.query('SELECT id, username, role FROM users ORDER BY id');
  res.json(users);
});

app.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));
