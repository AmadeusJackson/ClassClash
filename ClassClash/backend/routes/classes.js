const express = require('express');
const { getDb } = require('../models/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all classes for current user
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();

  db.all(
    'SELECT * FROM classes WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, classes) => {
      if (err) {
        console.error('Error fetching classes:', err);
        return res.status(500).json({ error: 'Failed to fetch classes' });
      }
      res.json({ classes });
    }
  );
});

// Create a new class
router.post('/', authenticateToken, (req, res) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Class name is required' });
  }

  const db = getDb();

  db.run(
    'INSERT INTO classes (user_id, name) VALUES (?, ?)',
    [req.user.id, name.trim()],
    function(err) {
      if (err) {
        console.error('Error creating class:', err);
        return res.status(500).json({ error: 'Failed to create class' });
      }

      res.status(201).json({
        class: {
          id: this.lastID,
          user_id: req.user.id,
          name: name.trim(),
        },
      });
    }
  );
});

// Get a specific class
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const classId = parseInt(req.params.id);

  db.get(
    'SELECT * FROM classes WHERE id = ? AND user_id = ?',
    [classId, req.user.id],
    (err, classItem) => {
      if (err) {
        console.error('Error fetching class:', err);
        return res.status(500).json({ error: 'Failed to fetch class' });
      }

      if (!classItem) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json({ class: classItem });
    }
  );
});

module.exports = router;
