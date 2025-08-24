const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Submit contact message
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone = null, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Insert contact message
    const [result] = await pool.execute(
      'INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)',
      [name, email, phone, message]
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      message_id: result.insertId
    });

  } catch (error) {
    console.error('Submit contact message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all contact messages (admin only)
router.get('/all', async (req, res) => {
  try {
    const [messages] = await pool.execute(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get unread messages
router.get('/unread', async (req, res) => {
  try {
    const [messages] = await pool.execute(
      'SELECT * FROM contact_messages WHERE status = "Unread" ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Get unread messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
  try {
    const messageId = req.params.id;

    const [result] = await pool.execute(
      'UPDATE contact_messages SET status = "Read" WHERE id = ?',
      [messageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark message as replied
router.put('/:id/replied', async (req, res) => {
  try {
    const messageId = req.params.id;

    const [result] = await pool.execute(
      'UPDATE contact_messages SET status = "Replied" WHERE id = ?',
      [messageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message marked as replied'
    });

  } catch (error) {
    console.error('Mark message as replied error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const messageId = req.params.id;

    const [messages] = await pool.execute(
      'SELECT * FROM contact_messages WHERE id = ?',
      [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: messages[0]
    });

  } catch (error) {
    console.error('Get message by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    const messageId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM contact_messages WHERE id = ?',
      [messageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get contact statistics
router.get('/statistics/overview', async (req, res) => {
  try {
    // Total messages
    const [totalMessages] = await pool.execute(
      'SELECT COUNT(*) as total FROM contact_messages'
    );

    // Unread messages
    const [unreadMessages] = await pool.execute(
      'SELECT COUNT(*) as unread FROM contact_messages WHERE status = "Unread"'
    );

    // Read messages
    const [readMessages] = await pool.execute(
      'SELECT COUNT(*) as read FROM contact_messages WHERE status = "Read"'
    );

    // Replied messages
    const [repliedMessages] = await pool.execute(
      'SELECT COUNT(*) as replied FROM contact_messages WHERE status = "Replied"'
    );

    // Recent messages (last 7 days)
    const [recentMessages] = await pool.execute(
      'SELECT COUNT(*) as recent FROM contact_messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    res.json({
      success: true,
      statistics: {
        total: totalMessages[0].total,
        unread: unreadMessages[0].unread,
        read: readMessages[0].read,
        replied: repliedMessages[0].replied,
        recent: recentMessages[0].recent
      }
    });

  } catch (error) {
    console.error('Get contact statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
