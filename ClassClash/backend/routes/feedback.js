const express = require('express');
const { getDb } = require('../models/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all feedback (sorted by upvotes desc, then date desc)
router.get('/', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT 
       f.id,
       f.user_id,
       f.content,
       f.upvotes,
       f.created_at,
       u.username
     FROM feedback f
     JOIN users u ON f.user_id = u.id
     ORDER BY f.upvotes DESC, f.created_at DESC`,
    [],
    (err, feedback) => {
      if (err) {
        console.error('Error fetching feedback:', err);
        return res.status(500).json({ error: 'Failed to fetch feedback' });
      }

      res.json({ feedback });
    }
  );
});

// Create feedback (protected)
router.post('/', authenticateToken, (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Feedback content is required' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ error: 'Feedback content must be 1000 characters or less' });
  }

  const db = getDb();

  db.run(
    'INSERT INTO feedback (user_id, content) VALUES (?, ?)',
    [req.user.id, content.trim()],
    function(err) {
      if (err) {
        console.error('Error creating feedback:', err);
        return res.status(500).json({ error: 'Failed to create feedback' });
      }

      // Fetch the created feedback with username
      db.get(
        `SELECT 
           f.id,
           f.user_id,
           f.content,
           f.upvotes,
           f.created_at,
           u.username
         FROM feedback f
         JOIN users u ON f.user_id = u.id
         WHERE f.id = ?`,
        [this.lastID],
        (err, feedback) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch created feedback' });
          }

          res.status(201).json({ feedback });
        }
      );
    }
  );
});

// Upvote/unupvote feedback (protected, toggles)
router.post('/:id/upvote', authenticateToken, (req, res) => {
  const db = getDb();
  const feedbackId = parseInt(req.params.id);

  // Check if feedback exists
  db.get('SELECT id, upvotes FROM feedback WHERE id = ?', [feedbackId], (err, feedback) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Check if user already upvoted
    db.get(
      'SELECT id FROM feedback_upvotes WHERE feedback_id = ? AND user_id = ?',
      [feedbackId, req.user.id],
      (err, existingUpvote) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingUpvote) {
          // Remove upvote (unupvote)
          db.run(
            'DELETE FROM feedback_upvotes WHERE feedback_id = ? AND user_id = ?',
            [feedbackId, req.user.id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to remove upvote' });
              }

              // Decrement upvote count
              db.run(
                'UPDATE feedback SET upvotes = upvotes - 1 WHERE id = ?',
                [feedbackId],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to update upvote count' });
                  }

                  res.json({ upvoted: false, message: 'Upvote removed' });
                }
              );
            }
          );
        } else {
          // Add upvote
          db.run(
            'INSERT INTO feedback_upvotes (feedback_id, user_id) VALUES (?, ?)',
            [feedbackId, req.user.id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to add upvote' });
              }

              // Increment upvote count
              db.run(
                'UPDATE feedback SET upvotes = upvotes + 1 WHERE id = ?',
                [feedbackId],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to update upvote count' });
                  }

                  res.json({ upvoted: true, message: 'Upvote added' });
                }
              );
            }
          );
        }
      }
    );
  });
});

// Delete own feedback (protected)
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const feedbackId = parseInt(req.params.id);

  // Verify feedback belongs to user
  db.get(
    'SELECT id FROM feedback WHERE id = ? AND user_id = ?',
    [feedbackId, req.user.id],
    (err, feedback) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!feedback) {
        return res.status(404).json({ error: 'Feedback not found or you do not have permission' });
      }

      db.run('DELETE FROM feedback WHERE id = ?', [feedbackId], function(err) {
        if (err) {
          console.error('Error deleting feedback:', err);
          return res.status(500).json({ error: 'Failed to delete feedback' });
        }

        res.json({ message: 'Feedback deleted successfully' });
      });
    }
  );
});

module.exports = router;
