const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.resolve(__dirname, 'leaderboard.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const createTable = `CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  category TEXT NOT NULL,
  time INTEGER NOT NULL,
  wpm INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`;

db.run(createTable, (err) => {
  if (err) console.error('Unable to create leaderboard table:', err);
});

app.get('/api/leaderboard', (req, res) => {
  const category = req.query.category || 'gaming';
  const time = parseInt(req.query.time, 10) || 30;

  const query = `SELECT username, wpm, created_at FROM leaderboard WHERE category = ? AND time = ? ORDER BY wpm DESC, created_at ASC LIMIT 5`;
  db.all(query, [category, time], (err, rows) => {
    if (err) {
      console.error('Failed to query leaderboard:', err);
      return res.status(500).json({ error: 'Failed to load leaderboard' });
    }
    res.json(rows);
  });
});

app.post('/api/leaderboard', (req, res) => {
  const { username, category, time, wpm } = req.body;
  if (!username || !category || !time || typeof wpm !== 'number') {
    return res.status(400).json({ error: 'Missing leaderboard fields' });
  }

  const insert = `INSERT INTO leaderboard (username, category, time, wpm) VALUES (?, ?, ?, ?)`;
  db.run(insert, [username, category, time, wpm], function (err) {
    if (err) {
      console.error('Failed to save leaderboard entry:', err);
      return res.status(500).json({ error: 'Failed to save leaderboard entry' });
    }

    const query = `SELECT username, wpm, created_at FROM leaderboard WHERE category = ? AND time = ? ORDER BY wpm DESC, created_at ASC LIMIT 5`;
    db.all(query, [category, time], (err2, rows) => {
      if (err2) {
        console.error('Failed to load leaderboard after insert:', err2);
        return res.status(500).json({ error: 'Failed to load leaderboard' });
      }
      res.json(rows);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
