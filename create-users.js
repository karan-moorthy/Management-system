const { Client } = require('pg');

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  user: 'postgres',
  password: 'postgres',
});

async function createUsers() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Check if users already exist
    const existingUsers = await client.query(
      'SELECT name FROM users WHERE name IN ($1, $2, $3, $4)',
      ['Arunraj', 'Aishwarya', 'Chandramohan', 'Vinoth']
    );

    const existingNames = existingUsers.rows.map(row => row.name);
    console.log('Existing users:', existingNames);

    const usersToCreate = [
      { name: 'Arunraj', email: 'arunraj@example.com' },
      { name: 'Aishwarya', email: 'aishwarya@example.com' },
      { name: 'Chandramohan', email: 'chandramohan@example.com' },
      { name: 'Vinoth', email: 'vinoth@example.com' }
    ].filter(user => !existingNames.includes(user.name));

    if (usersToCreate.length === 0) {
      console.log('All required users already exist');
      return;
    }

    console.log('Creating users:', usersToCreate.map(u => u.name));

    for (const user of usersToCreate) {
      await client.query(`
        INSERT INTO users (name, email, created_at, updated_at) 
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `, [user.name, user.email]);
    }

    console.log('✅ Users created successfully');

    // Show all users
    const allUsers = await client.query('SELECT id, name, email FROM users ORDER BY name');
    console.log('All users in database:');
    allUsers.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) [ID: ${user.id}]`);
    });

  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await client.end();
  }
}

createUsers();