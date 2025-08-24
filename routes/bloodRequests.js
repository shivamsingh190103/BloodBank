const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Create a new blood request
router.post('/create', async (req, res) => {
  try {
    const {
      requester_id,
      patient_name,
      blood_group,
      units_required,
      hospital_name = null,
      hospital_address = null,
      urgency_level = 'Medium',
      contact_person = null,
      contact_phone = null,
      reason = null,
      required_date = null
    } = req.body;

    // Validate required fields
    if (!patient_name || !blood_group || !units_required) {
      return res.status(400).json({
        success: false,
        message: 'Patient name, blood group, and units required are mandatory'
      });
    }

    // Insert blood request
    const [result] = await pool.execute(
      `INSERT INTO blood_requests 
       (requester_id, patient_name, blood_group, units_required, hospital_name, 
        hospital_address, urgency_level, contact_person, contact_phone, reason, required_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [requester_id, patient_name, blood_group, units_required, hospital_name,
       hospital_address, urgency_level, contact_person, contact_phone, reason, required_date]
    );

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      request_id: result.insertId
    });

  } catch (error) {
    console.error('Create blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all blood requests
router.get('/all', async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT br.*, u.name as requester_name, u.email as requester_email 
       FROM blood_requests br 
       LEFT JOIN users u ON br.requester_id = u.id 
       ORDER BY br.created_at DESC`
    );

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Get blood requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get blood requests by blood group
router.get('/by-blood-group/:bloodGroup', async (req, res) => {
  try {
    const bloodGroup = req.params.bloodGroup;

    const [requests] = await pool.execute(
      `SELECT br.*, u.name as requester_name, u.email as requester_email 
       FROM blood_requests br 
       LEFT JOIN users u ON br.requester_id = u.id 
       WHERE br.blood_group = ? AND br.status = 'Pending'
       ORDER BY br.urgency_level DESC, br.created_at DESC`,
      [bloodGroup]
    );

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Get blood requests by blood group error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get blood requests by location
router.get('/by-location', async (req, res) => {
  try {
    const { city, state } = req.query;

    let query = `SELECT br.*, u.name as requester_name, u.email as requester_email 
                 FROM blood_requests br 
                 LEFT JOIN users u ON br.requester_id = u.id 
                 WHERE br.status = 'Pending'`;
    let params = [];

    if (city) {
      query += ` AND u.city = ?`;
      params.push(city);
    }

    if (state) {
      query += ` AND u.state = ?`;
      params.push(state);
    }

    query += ` ORDER BY br.urgency_level DESC, br.created_at DESC`;

    const [requests] = await pool.execute(query, params);

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Get blood requests by location error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get blood request by ID
router.get('/:id', async (req, res) => {
  try {
    const requestId = req.params.id;

    const [requests] = await pool.execute(
      `SELECT br.*, u.name as requester_name, u.email as requester_email, u.phone as requester_phone 
       FROM blood_requests br 
       LEFT JOIN users u ON br.requester_id = u.id 
       WHERE br.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    res.json({
      success: true,
      request: requests[0]
    });

  } catch (error) {
    console.error('Get blood request by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update blood request status
router.put('/:id/status', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const [result] = await pool.execute(
      'UPDATE blood_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    res.json({
      success: true,
      message: 'Blood request status updated successfully'
    });

  } catch (error) {
    console.error('Update blood request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get urgent blood requests
router.get('/urgent/all', async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT br.*, u.name as requester_name, u.email as requester_email 
       FROM blood_requests br 
       LEFT JOIN users u ON br.requester_id = u.id 
       WHERE br.urgency_level IN ('High', 'Emergency') AND br.status = 'Pending'
       ORDER BY br.urgency_level DESC, br.created_at ASC`
    );

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Get urgent blood requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete blood request
router.delete('/:id', async (req, res) => {
  try {
    const requestId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM blood_requests WHERE id = ?',
      [requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    res.json({
      success: true,
      message: 'Blood request deleted successfully'
    });

  } catch (error) {
    console.error('Delete blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
