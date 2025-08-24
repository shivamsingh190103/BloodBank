const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone = null, 
      blood_group, 
      location = null, 
      city = null, 
      state = null 
    } = req.body;
    


    // Validate required fields
    if (!name || !email || !password || !blood_group) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, password, and blood group are required' 
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, phone, blood_group, location, city, state) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, phone, blood_group, location, city, state]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        name,
        email,
        blood_group,
        location
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user by email
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Remove password from response
    delete user.password;

    res.json({
      success: true,
      message: 'Login successful',
      user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get user profile
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await pool.execute(
      'SELECT id, name, email, phone, blood_group, location, city, state, is_donor, is_recipient, last_donation_date, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update user profile
router.put('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, phone, location, city, state, is_donor, is_recipient } = req.body;

    const [result] = await pool.execute(
      `UPDATE users SET name = ?, phone = ?, location = ?, city = ?, state = ?, 
       is_donor = ?, is_recipient = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, phone, location, city, state, is_donor, is_recipient, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get all users (for admin/dashboard purposes)
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, blood_group, location, city, state, is_donor, is_recipient, last_donation_date FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;
