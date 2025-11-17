const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb',
});

async function testMidnightLogic() {
  try {
    console.log('Testing Midnight Auto-End Logic...\n');

    // Test 1: Check current active shifts
    console.log('1. Current Active Shifts:');
    const activeShifts = await pool.query(`
      SELECT 
        a.id,
        u.name as employee_name,
        a.shift_start_time,
        a.status,
        CURRENT_TIMESTAMP as now,
        (DATE(a.shift_start_time) + INTERVAL '1 day') as midnight_cutoff
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.status = 'IN_PROGRESS'
    `);

    if (activeShifts.rows.length === 0) {
      console.log('No active shifts found\n');
    } else {
      activeShifts.rows.forEach((shift) => {
        console.log(`Employee: ${shift.employee_name}`);
        console.log(`  Started: ${shift.shift_start_time}`);
        console.log(`  Current Time: ${shift.now}`);
        console.log(`  Will auto-end at: ${shift.midnight_cutoff}`);
        
        const now = new Date(shift.now);
        const midnight = new Date(shift.midnight_cutoff);
        const isPastMidnight = now >= midnight;
        
        console.log(`  Past Midnight? ${isPastMidnight ? 'YES - SHOULD AUTO-END!' : 'No'}`);
        console.log('');
      });
    }

    // Test 2: Simulate midnight calculation
    console.log('2. Midnight Calculation Test:');
    const testTime = new Date('2025-11-12T14:30:00'); // 2:30 PM
    const midnight = new Date(testTime);
    midnight.setHours(24, 0, 0, 0);
    
    console.log(`Shift Start: ${testTime.toISOString()}`);
    console.log(`Next Midnight: ${midnight.toISOString()}`);
    console.log(`Duration until midnight: ${Math.floor((midnight.getTime() - testTime.getTime()) / (1000 * 60))} minutes\n`);

    // Test 3: Check if any shifts need auto-ending
    console.log('3. Shifts That Need Auto-Ending:');
    const needAutoEnd = await pool.query(`
      SELECT 
        a.id,
        u.name as employee_name,
        a.shift_start_time,
        (DATE(a.shift_start_time) + INTERVAL '1 day') as midnight_cutoff,
        EXTRACT(EPOCH FROM ((DATE(a.shift_start_time) + INTERVAL '1 day') - a.shift_start_time)) / 60 as duration_minutes
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.status = 'IN_PROGRESS'
      AND CURRENT_TIMESTAMP >= (DATE(a.shift_start_time) + INTERVAL '1 day')
    `);

    if (needAutoEnd.rows.length === 0) {
      console.log('No shifts need auto-ending at this time\n');
    } else {
      console.log(`Found ${needAutoEnd.rows.length} shifts to auto-end:\n`);
      needAutoEnd.rows.forEach((shift) => {
        console.log(`Employee: ${shift.employee_name}`);
        console.log(`  Shift ID: ${shift.id}`);
        console.log(`  Started: ${shift.shift_start_time}`);
        console.log(`  Should end at: ${shift.midnight_cutoff}`);
        console.log(`  Duration: ${Math.floor(shift.duration_minutes)} minutes`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testMidnightLogic();
