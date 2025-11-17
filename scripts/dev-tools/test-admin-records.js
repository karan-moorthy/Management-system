const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb',
});

async function testAdminRecords() {
  try {
    console.log('Testing Admin Attendance Records Query...\n');

    const result = await pool.query(`
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.status = 'COMPLETED'
      ORDER BY a.shift_start_time DESC
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} completed records\n`);
    
    result.rows.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Employee: ${record.user_name} (${record.user_email})`);
      console.log(`  Start: ${record.shift_start_time}`);
      console.log(`  End: ${record.shift_end_time}`);
      console.log(`  Duration: ${record.total_duration} minutes`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Tasks: ${JSON.stringify(record.daily_tasks)}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testAdminRecords();
