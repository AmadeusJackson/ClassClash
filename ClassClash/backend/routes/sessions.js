const express = require('express');
const { getDb } = require('../models/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to get Monday of the week for a given date
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

// Record a study session
router.post('/', authenticateToken, (req, res) => {
  const { classId, seconds, weekStart } = req.body;

  if (!classId || seconds === undefined || seconds < 0) {
    return res.status(400).json({ error: 'classId and seconds (>= 0) are required' });
  }

  const db = getDb();
  const week = weekStart || getWeekStart();

  // Verify class belongs to user
  db.get(
    'SELECT id FROM classes WHERE id = ? AND user_id = ?',
    [classId, req.user.id],
    (err, classItem) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!classItem) {
        return res.status(404).json({ error: 'Class not found' });
      }

      db.run(
        'INSERT INTO study_sessions (user_id, class_id, seconds, week_start) VALUES (?, ?, ?, ?)',
        [req.user.id, classId, seconds, week],
        function(err) {
          if (err) {
            console.error('Error recording session:', err);
            return res.status(500).json({ error: 'Failed to record session' });
          }

          res.status(201).json({
            session: {
              id: this.lastID,
              user_id: req.user.id,
              class_id: classId,
              seconds,
              week_start: week,
            },
          });
        }
      );
    }
  );
});

// Get weekly total for a specific class
router.get('/weekly/:classId', authenticateToken, (req, res) => {
  const db = getDb();
  const classId = parseInt(req.params.classId);
  const weekStart = req.query.weekStart || getWeekStart();

  db.get(
    `SELECT COALESCE(SUM(seconds), 0) as total_seconds 
     FROM study_sessions 
     WHERE user_id = ? AND class_id = ? AND week_start = ?`,
    [req.user.id, classId, weekStart],
    (err, result) => {
      if (err) {
        console.error('Error fetching weekly total:', err);
        return res.status(500).json({ error: 'Failed to fetch weekly total' });
      }

      res.json({
        classId,
        weekStart,
        totalSeconds: result.total_seconds || 0,
      });
    }
  );
});

// Get weekly totals for all classes
router.get('/weekly', authenticateToken, (req, res) => {
  const db = getDb();
  const weekStart = req.query.weekStart || getWeekStart();

  db.all(
    `SELECT class_id, COALESCE(SUM(seconds), 0) as total_seconds 
     FROM study_sessions 
     WHERE user_id = ? AND week_start = ?
     GROUP BY class_id`,
    [req.user.id, weekStart],
    (err, results) => {
      if (err) {
        console.error('Error fetching weekly totals:', err);
        return res.status(500).json({ error: 'Failed to fetch weekly totals' });
      }

      const totals = {};
      results.forEach((row) => {
        totals[row.class_id] = row.total_seconds || 0;
      });

      res.json({
        weekStart,
        totals,
      });
    }
  );
});

module.exports = router;
