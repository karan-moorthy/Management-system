const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb',
});

async function testCompanyWide() {
  try {
    console.log('Testing Company-Wide Attendance System...\n');

    // Test 1: All completed records (company-wide)
    console.log('1. ALL COMPLETED ATTENDANCE RECORDS (Company-Wide):');
    const allRecords = await pool.query(`
      SELECT 
        a.id,
        u.name as employee_name,
        u.email,
        w.name as workspace_name,
        p.name as project_name,
        a.shift_start_time,
        a.shift_end_time,
        a.total_duration,
        a.status
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      INNER JOIN workspaces w ON a.workspace_id = w.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.status = 'COMPLETED'
      ORDER BY a.shift_start_time DESC
    `);

    console.log(`Total: ${allRecords.rows.length} completed records across all workspaces\n`);
    
    allRecords.rows.forEach((record, index) => {
      console.log(`${index + 1}. ${record.employee_name} (${record.email})`);
      console.log(`   Workspace: ${record.workspace_name}`);
      console.log(`   Project: ${record.project_name || 'None'}`);
      console.log(`   Date: ${new Date(record.shift_start_time).toLocaleString()}`);
      console.log(`   Duration: ${record.total_duration} minutes`);
      console.log('');
    });

    // Test 2: Group by employee
    console.log('2. SUMMARY BY EMPLOYEE:');
    const summary = await pool.query(`
      SELECT 
        u.name as employee_name,
        u.email,
        COUNT(*) as total_shifts,
        SUM(a.total_duration) as total_minutes
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.status = 'COMPLETED'
      GROUP BY u.id, u.name, u.email
      ORDER BY total_shifts DESC
    `);

    summary.rows.forEach((emp) => {
      const hours = Math.floor(emp.total_minutes / 60);
      const mins = emp.total_minutes % 60;
      console.log(`${emp.employee_name} (${emp.email})`);
      console.log(`  Total Shifts: ${emp.total_shifts}`);
      console.log(`  Total Time: ${hours}h ${mins}m`);
      console.log('');
    });

    // Test 3: Active shifts
    console.log('3. ACTIVE SHIFTS (Company-Wide):');
    const activeShifts = await pool.query(`
      SELECT 
        u.name as employee_name,
        w.name as workspace_name,
        p.name as project_name,
        a.shift_start_time
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      INNER JOIN workspaces w ON a.workspace_id = w.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.status = 'IN_PROGRESS'
    `);

    if (activeShifts.rows.length === 0) {
      console.log('No active shifts currently\n');
    } else {
      activeShifts.rows.forEach((shift) => {
        console.log(`${shift.employee_name} - Started: ${new Date(shift.shift_start_time).toLocaleTimeString()}`);
        console.log(`  Workspace: ${shift.workspace_name}`);
        console.log(`  Project: ${shift.project_name || 'None'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testCompanyWide();
