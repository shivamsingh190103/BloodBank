const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Schedule a blood donation
router.post('/schedule', async (req, res) => {
  try {
    const {
      donor_id,
      request_id = null,
      donation_date,
      blood_group,
      units_donated = 1,
      donation_center = null,
      notes = null
    } = req.body;

    // Validate required fields
    if (!donor_id || !donation_date || !blood_group) {
      return res.status(400).json({
        success: false,
        message: 'Donor ID, donation date, and blood group are required'
      });
    }

    // Check if donor exists and get their blood group
    const [donors] = await pool.execute(
      'SELECT blood_group FROM users WHERE id = ?',
      [donor_id]
    );

    if (donors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    // Verify blood group matches
    if (donors[0].blood_group !== blood_group) {
      return res.status(400).json({
        success: false,
        message: 'Blood group does not match donor record'
      });
    }

    // Insert donation record
    const [result] = await pool.execute(
      `INSERT INTO blood_donations 
       (donor_id, request_id, donation_date, blood_group, units_donated, donation_center, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [donor_id, request_id, donation_date, blood_group, units_donated, donation_center, notes]
    );

    // Update donor's last donation date
    await pool.execute(
      'UPDATE users SET last_donation_date = ?, is_donor = TRUE WHERE id = ?',
      [donation_date, donor_id]
    );

    res.status(201).json({
      success: true,
      message: 'Blood donation scheduled successfully',
      donation_id: result.insertId
    });

  } catch (error) {
    console.error('Schedule donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complete a blood donation
router.put('/:id/complete', async (req, res) => {
  try {
    const donationId = req.params.id;
    const { notes } = req.body;

    // Update donation status to completed
    const [result] = await pool.execute(
      'UPDATE blood_donations SET status = "Completed", notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [notes, donationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found'
      });
    }

    // Get donation details to update inventory
    const [donations] = await pool.execute(
      'SELECT blood_group, units_donated FROM blood_donations WHERE id = ?',
      [donationId]
    );

    if (donations.length > 0) {
      const donation = donations[0];
      
      // Update blood inventory
      await pool.execute(
        'UPDATE blood_inventory SET available_units = available_units + ? WHERE blood_group = ?',
        [donation.units_donated, donation.blood_group]
      );
    }

    res.json({
      success: true,
      message: 'Blood donation completed successfully'
    });

  } catch (error) {
    console.error('Complete donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all donations
router.get('/all', async (req, res) => {
  try {
    const [donations] = await pool.execute(
      `SELECT bd.*, u.name as donor_name, u.email as donor_email, u.phone as donor_phone,
              br.patient_name, br.hospital_name
       FROM blood_donations bd 
       LEFT JOIN users u ON bd.donor_id = u.id 
       LEFT JOIN blood_requests br ON bd.request_id = br.id
       ORDER BY bd.created_at DESC`
    );

    res.json({
      success: true,
      donations
    });

  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get donations by donor
router.get('/donor/:donorId', async (req, res) => {
  try {
    const donorId = req.params.donorId;

    const [donations] = await pool.execute(
      `SELECT bd.*, br.patient_name, br.hospital_name
       FROM blood_donations bd 
       LEFT JOIN blood_requests br ON bd.request_id = br.id
       WHERE bd.donor_id = ?
       ORDER BY bd.donation_date DESC`,
      [donorId]
    );

    res.json({
      success: true,
      donations
    });

  } catch (error) {
    console.error('Get donations by donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get donations by blood group
router.get('/by-blood-group/:bloodGroup', async (req, res) => {
  try {
    const bloodGroup = req.params.bloodGroup;

    const [donations] = await pool.execute(
      `SELECT bd.*, u.name as donor_name, u.email as donor_email
       FROM blood_donations bd 
       LEFT JOIN users u ON bd.donor_id = u.id 
       WHERE bd.blood_group = ? AND bd.status = 'Completed'
       ORDER BY bd.donation_date DESC`,
      [bloodGroup]
    );

    res.json({
      success: true,
      donations
    });

  } catch (error) {
    console.error('Get donations by blood group error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get donation statistics
router.get('/statistics', async (req, res) => {
  try {
    // Total donations
    const [totalDonations] = await pool.execute(
      'SELECT COUNT(*) as total FROM blood_donations WHERE status = "Completed"'
    );

    // Donations by blood group
    const [donationsByBloodGroup] = await pool.execute(
      `SELECT blood_group, COUNT(*) as count, SUM(units_donated) as total_units
       FROM blood_donations 
       WHERE status = "Completed"
       GROUP BY blood_group`
    );

    // Recent donations (last 30 days)
    const [recentDonations] = await pool.execute(
      `SELECT COUNT(*) as recent_count 
       FROM blood_donations 
       WHERE status = "Completed" 
       AND donation_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    // Top donors
    const [topDonors] = await pool.execute(
      `SELECT u.name, COUNT(bd.id) as donation_count, SUM(bd.units_donated) as total_units
       FROM blood_donations bd
       JOIN users u ON bd.donor_id = u.id
       WHERE bd.status = "Completed"
       GROUP BY bd.donor_id, u.name
       ORDER BY donation_count DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      statistics: {
        totalDonations: totalDonations[0].total,
        donationsByBloodGroup,
        recentDonations: recentDonations[0].recent_count,
        topDonors
      }
    });

  } catch (error) {
    console.error('Get donation statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cancel a donation
router.put('/:id/cancel', async (req, res) => {
  try {
    const donationId = req.params.id;

    const [result] = await pool.execute(
      'UPDATE blood_donations SET status = "Cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [donationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found'
      });
    }

    res.json({
      success: true,
      message: 'Blood donation cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
