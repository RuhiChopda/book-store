const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // serve your html & css from /public

// Initialize SQLite DB (creates file if it doesn't exist)
const db = new sqlite3.Database('./books.db', (err) => {
  if (err) return console.error('DB connection error:', err.message);
  console.log('Connected to SQLite database.');
});

// Create books table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    price REAL NOT NULL,
    publishedDate TEXT NOT NULL
  )
`);

// Serve the frontend HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET /books — list all books
app.get('/books', (req, res) => {
  db.all('SELECT * FROM books', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /books — add new book
app.post('/books', (req, res) => {
  const { title, author, price, publishedDate } = req.body;

  if (!title || !author || !price || !publishedDate) {
    return res.status(400).json({ error: 'Please provide title, author, price, and publishedDate' });
  }

  const sql = 'INSERT INTO books (title, author, price, publishedDate) VALUES (?, ?, ?, ?)';
  const params = [title, author, price, publishedDate];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});

// PUT /books/:id — update a book
app.put('/books/:id', (req, res) => {
  const { id } = req.params;
  const { title, author, price, publishedDate } = req.body;

  if (!title || !author || !price || !publishedDate) {
    return res.status(400).json({ error: 'Please provide title, author, price, and publishedDate' });
  }

  const sql = `
    UPDATE books
    SET title = ?, author = ?, price = ?, publishedDate = ?
    WHERE id = ?
  `;
  const params = [title, author, price, publishedDate, id];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ id: Number(id), title, author, price, publishedDate });
  });
});

// DELETE /books/:id — delete a book
app.delete('/books/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM books WHERE id = ?';

  db.run(sql, id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted', id: Number(id) });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
