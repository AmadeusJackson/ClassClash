const express = require('express');
const { getDb } = require('../models/db');

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

// Get leaderboard for a specific class
router.get('/:classId', (req, res) => {
  const db = getDb();
  const classId = parseInt(req.params.classId);
  const weekStart = req.query.weekStart || getWeekStart();

  db.all(
    `SELECT 
       u.id as user_id,
       u.username,
       COALESCE(SUM(ss.seconds), 0) as total_seconds
     FROM users u
     LEFT JOIN study_sessions ss ON u.id = ss.user_id 
       AND ss.class_id = ? 
       AND ss.week_start = ?
     GROUP BY u.id, u.username
     HAVING total_seconds > 0
     ORDER BY total_seconds DESC
     LIMIT 100`,
    [classId, weekStart],
    (err, results) => {
      if (err) {
        console.error('Error fetching leaderboard:', err);
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }

      const leaderboard = results.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        totalSeconds: row.total_seconds || 0,
      }));

      res.json({
        classId,
        weekStart,
        leaderboard,
      });
    }
  );
});

module.exports = router;
