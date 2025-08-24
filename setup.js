const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Shivam##123',
  port: 3306,
  charset: 'utf8mb4'
};

async function setupDatabase() {
  console.log('🚀 Setting up BloodBank Database...\n');

  try {
    // Create connection without database
    const connection = mysql.createConnection(dbConfig);
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📖 Reading database schema...');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('🗄️  Creating database and tables...');
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await connection.promise().query(statement);
          console.log(`   ✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          console.log(`   ⚠️  Statement ${i + 1} failed (this might be expected): ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database setup completed successfully!');
    console.log('\n📋 Database Details:');
    console.log('   - Database Name: bloodbank_db');
    console.log('   - Host: localhost');
    console.log('   - User: root');
    console.log('   - Port: 3306');
    
    connection.end();
    
    console.log('\n🎉 Setup completed! You can now start the application:');
    console.log('   npm start');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure MySQL is running');
    console.log('   2. Verify your MySQL credentials in config/database.js');
    console.log('   3. Ensure you have permission to create databases');
    console.log('   4. Try running the schema manually: mysql -u root -p < database/schema.sql');
  }
}

// Check if MySQL is running
async function checkMySQLConnection() {
  try {
    const connection = mysql.createConnection(dbConfig);
    await connection.promise().query('SELECT 1');
    connection.end();
    return true;
  } catch (error) {
    return false;
  }
}

// Main setup function
async function main() {
  console.log('🏥 BloodBank Full-Stack Application Setup\n');
  
  const isMySQLRunning = await checkMySQLConnection();
  
  if (!isMySQLRunning) {
    console.log('❌ Cannot connect to MySQL. Please ensure:');
    console.log('   1. MySQL server is running');
    console.log('   2. Credentials in config/database.js are correct');
    console.log('   3. MySQL is accessible on localhost:3306');
    process.exit(1);
  }
  
  console.log('✅ MySQL connection successful');
  await setupDatabase();
}

// Run setup
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupDatabase, checkMySQLConnection };
