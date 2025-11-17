const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb',
});

async function checkWorkspaces() {
  try {
    console.log('Checking Workspaces and Attendance Records...\n');

    // Get all workspaces
    const workspaces = await pool.query('SELECT id, name FROM workspaces');
    console.log('Available Workspaces:');
    workspaces.rows.forEach((ws) => {
      console.log(`  - ${ws.name} (${ws.id})`);
    });
    console.log('');

    // Get attendance count per workspace
    for (const ws of workspaces.rows) {
      const count = await pool.query(`
        SELECT COUNT(*) as count 
        FROM attendance 
        WHERE workspace_id = $1 AND status = 'COMPLETED'
      `, [ws.id]);
      
      console.log(`Workspace "${ws.name}": ${count.rows[0].count} completed records`);
      
      // Show sample records
      if (count.rows[0].count > 0) {
        const samples = await pool.query(`
          SELECT a.*, u.name as user_name, u.email as user_email
          FROM attendance a
          INNER JOIN users u ON a.user_id = u.id
          WHERE a.workspace_id = $1 AND a.status = 'COMPLETED'
          ORDER BY a.shift_start_time DESC
          LIMIT 3
        `, [ws.id]);
        
        samples.rows.forEach((record, i) => {
          console.log(`  ${i + 1}. ${record.user_name} - ${new Date(record.shift_start_time).toLocaleString()} (${record.total_duration}m)`);
        });
      }
      console.log('');
    }

    // Check user roles in workspaces
    console.log('User Roles:');
    const members = await pool.query(`
      SELECT m.role, m.workspace_id, u.name as user_name, u.email, w.name as workspace_name
      FROM members m
      INNER JOIN users u ON m.user_id = u.id
      INNER JOIN workspaces w ON m.workspace_id = w.id
      ORDER BY w.name, m.role
    `);
    
    members.rows.forEach((m) => {
      console.log(`  ${m.workspace_name}: ${m.user_name} (${m.email}) - ${m.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkWorkspaces();
