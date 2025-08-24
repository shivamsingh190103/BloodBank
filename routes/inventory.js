const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Get blood inventory
router.get('/all', async (req, res) => {
  try {
    const [inventory] = await pool.execute(
      'SELECT * FROM blood_inventory ORDER BY blood_group'
    );

    res.json({
      success: true,
      inventory
    });

  } catch (error) {
    console.error('Get blood inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get inventory by blood group
router.get('/blood-group/:bloodGroup', async (req, res) => {
  try {
    const bloodGroup = req.params.bloodGroup;

    const [inventory] = await pool.execute(
      'SELECT * FROM blood_inventory WHERE blood_group = ?',
      [bloodGroup]
    );

    if (inventory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood group not found in inventory'
      });
    }

    res.json({
      success: true,
      inventory: inventory[0]
    });

  } catch (error) {
    console.error('Get inventory by blood group error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update blood inventory
router.put('/update', async (req, res) => {
  try {
    const { blood_group, available_units, reserved_units } = req.body;

    if (!blood_group || available_units === undefined || reserved_units === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Blood group, available units, and reserved units are required'
      });
    }

    const [result] = await pool.execute(
      'UPDATE blood_inventory SET available_units = ?, reserved_units = ?, last_updated = CURRENT_TIMESTAMP WHERE blood_group = ?',
      [available_units, reserved_units, blood_group]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood group not found in inventory'
      });
    }

    res.json({
      success: true,
      message: 'Blood inventory updated successfully'
    });

  } catch (error) {
    console.error('Update blood inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add blood units to inventory
router.post('/add', async (req, res) => {
  try {
    const { blood_group, units } = req.body;

    if (!blood_group || !units) {
      return res.status(400).json({
        success: false,
        message: 'Blood group and units are required'
      });
    }

    const [result] = await pool.execute(
      'UPDATE blood_inventory SET available_units = available_units + ?, last_updated = CURRENT_TIMESTAMP WHERE blood_group = ?',
      [units, blood_group]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood group not found in inventory'
      });
    }

    res.json({
      success: true,
      message: `${units} units of ${blood_group} blood added to inventory`
    });

  } catch (error) {
    console.error('Add blood units error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reserve blood units
router.post('/reserve', async (req, res) => {
  try {
    const { blood_group, units } = req.body;

    if (!blood_group || !units) {
      return res.status(400).json({
        success: false,
        message: 'Blood group and units are required'
      });
    }

    // Check if enough units are available
    const [inventory] = await pool.execute(
      'SELECT available_units FROM blood_inventory WHERE blood_group = ?',
      [blood_group]
    );

    if (inventory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood group not found in inventory'
      });
    }

    if (inventory[0].available_units < units) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${blood_group} blood units. Available: ${inventory[0].available_units}`
      });
    }

    // Reserve the units
    await pool.execute(
      `UPDATE blood_inventory 
       SET available_units = available_units - ?, 
           reserved_units = reserved_units + ?, 
           last_updated = CURRENT_TIMESTAMP 
       WHERE blood_group = ?`,
      [units, units, blood_group]
    );

    res.json({
      success: true,
      message: `${units} units of ${blood_group} blood reserved successfully`
    });

  } catch (error) {
    console.error('Reserve blood units error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Release reserved blood units
router.post('/release', async (req, res) => {
  try {
    const { blood_group, units } = req.body;

    if (!blood_group || !units) {
      return res.status(400).json({
        success: false,
        message: 'Blood group and units are required'
      });
    }

    // Check if enough units are reserved
    const [inventory] = await pool.execute(
      'SELECT reserved_units FROM blood_inventory WHERE blood_group = ?',
      [blood_group]
    );

    if (inventory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blood group not found in inventory'
      });
    }

    if (inventory[0].reserved_units < units) {
      return res.status(400).json({
        success: false,
        message: `Insufficient reserved ${blood_group} blood units. Reserved: ${inventory[0].reserved_units}`
      });
    }

    // Release the units
    await pool.execute(
      `UPDATE blood_inventory 
       SET available_units = available_units + ?, 
           reserved_units = reserved_units - ?, 
           last_updated = CURRENT_TIMESTAMP 
       WHERE blood_group = ?`,
      [units, units, blood_group]
    );

    res.json({
      success: true,
      message: `${units} units of ${blood_group} blood released successfully`
    });

  } catch (error) {
    console.error('Release blood units error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get low stock alerts
router.get('/low-stock', async (req, res) => {
  try {
    const threshold = req.query.threshold || 10; // Default threshold of 10 units

    const [lowStock] = await pool.execute(
      'SELECT * FROM blood_inventory WHERE available_units <= ? ORDER BY available_units ASC',
      [threshold]
    );

    res.json({
      success: true,
      lowStock,
      threshold
    });

  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get inventory statistics
router.get('/statistics', async (req, res) => {
  try {
    // Total available units
    const [totalAvailable] = await pool.execute(
      'SELECT SUM(available_units) as total FROM blood_inventory'
    );

    // Total reserved units
    const [totalReserved] = await pool.execute(
      'SELECT SUM(reserved_units) as total FROM blood_inventory'
    );

    // Blood group with highest availability
    const [highestAvailable] = await pool.execute(
      'SELECT blood_group, available_units FROM blood_inventory ORDER BY available_units DESC LIMIT 1'
    );

    // Blood group with lowest availability
    const [lowestAvailable] = await pool.execute(
      'SELECT blood_group, available_units FROM blood_inventory ORDER BY available_units ASC LIMIT 1'
    );

    // Critical stock (less than 5 units)
    const [criticalStock] = await pool.execute(
      'SELECT COUNT(*) as count FROM blood_inventory WHERE available_units < 5'
    );

    res.json({
      success: true,
      statistics: {
        totalAvailable: totalAvailable[0].total || 0,
        totalReserved: totalReserved[0].total || 0,
        highestAvailable: highestAvailable[0] || null,
        lowestAvailable: lowestAvailable[0] || null,
        criticalStockCount: criticalStock[0].count
      }
    });

  } catch (error) {
    console.error('Get inventory statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Initialize inventory for a blood group
router.post('/initialize', async (req, res) => {
  try {
    const { blood_group, available_units = 0, reserved_units = 0 } = req.body;

    if (!blood_group) {
      return res.status(400).json({
        success: false,
        message: 'Blood group is required'
      });
    }

    // Check if blood group already exists
    const [existing] = await pool.execute(
      'SELECT id FROM blood_inventory WHERE blood_group = ?',
      [blood_group]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Blood group already exists in inventory'
      });
    }

    // Insert new blood group
    await pool.execute(
      'INSERT INTO blood_inventory (blood_group, available_units, reserved_units) VALUES (?, ?, ?)',
      [blood_group, available_units, reserved_units]
    );

    res.status(201).json({
      success: true,
      message: `Blood group ${blood_group} initialized in inventory`
    });

  } catch (error) {
    console.error('Initialize inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
