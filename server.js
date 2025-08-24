const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const bloodRequestRoutes = require('./routes/bloodRequests');
const donationRoutes = require('./routes/donations');
const contactRoutes = require('./routes/contact');
const inventoryRoutes = require('./routes/inventory');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/inventory', inventoryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'BloodBank API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the main HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'Register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/donate', (req, res) => {
  res.sendFile(path.join(__dirname, 'donate.html'));
});

app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, 'help.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'BloodBank API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'User login',
        'GET /api/auth/profile/:id': 'Get user profile',
        'PUT /api/auth/profile/:id': 'Update user profile'
      },
      bloodRequests: {
        'POST /api/blood-requests/create': 'Create a new blood request',
        'GET /api/blood-requests/all': 'Get all blood requests',
        'GET /api/blood-requests/by-blood-group/:bloodGroup': 'Get requests by blood group',
        'GET /api/blood-requests/by-location': 'Get requests by location',
        'GET /api/blood-requests/:id': 'Get specific blood request',
        'PUT /api/blood-requests/:id/status': 'Update request status',
        'GET /api/blood-requests/urgent/all': 'Get urgent requests',
        'DELETE /api/blood-requests/:id': 'Delete blood request'
      },
      donations: {
        'POST /api/donations/schedule': 'Schedule a blood donation',
        'PUT /api/donations/:id/complete': 'Complete a donation',
        'GET /api/donations/all': 'Get all donations',
        'GET /api/donations/donor/:donorId': 'Get donations by donor',
        'GET /api/donations/by-blood-group/:bloodGroup': 'Get donations by blood group',
        'GET /api/donations/statistics': 'Get donation statistics',
        'PUT /api/donations/:id/cancel': 'Cancel a donation'
      },
      contact: {
        'POST /api/contact/submit': 'Submit contact message',
        'GET /api/contact/all': 'Get all messages',
        'GET /api/contact/unread': 'Get unread messages',
        'PUT /api/contact/:id/read': 'Mark message as read',
        'PUT /api/contact/:id/replied': 'Mark message as replied',
        'GET /api/contact/:id': 'Get specific message',
        'DELETE /api/contact/:id': 'Delete message',
        'GET /api/contact/statistics/overview': 'Get contact statistics'
      },
      inventory: {
        'GET /api/inventory/all': 'Get blood inventory',
        'GET /api/inventory/blood-group/:bloodGroup': 'Get inventory by blood group',
        'PUT /api/inventory/update': 'Update inventory',
        'POST /api/inventory/add': 'Add blood units',
        'POST /api/inventory/reserve': 'Reserve blood units',
        'POST /api/inventory/release': 'Release reserved units',
        'GET /api/inventory/low-stock': 'Get low stock alerts',
        'GET /api/inventory/statistics': 'Get inventory statistics',
        'POST /api/inventory/initialize': 'Initialize blood group'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// 404 handler for frontend routes
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your MySQL configuration.');
      console.log('💡 If deploying to Vercel, make sure to set up a cloud database and environment variables.');
      
      // In production, don't exit - allow the app to start for frontend
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    }

    // For Vercel, we don't need to listen on a port
    if (process.env.NODE_ENV === 'production') {
      console.log(`🚀 BloodBank server is running on Vercel`);
      console.log(`📱 Frontend: Available at deployment URL`);
      console.log(`🔗 API: Available at deployment URL/api`);
      console.log(`📚 API Docs: Available at deployment URL/api`);
    } else {
      app.listen(PORT, () => {
        console.log(`🚀 BloodBank server is running on port ${PORT}`);
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
        console.log(`📚 API Docs: http://localhost:${PORT}/api`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

startServer();
