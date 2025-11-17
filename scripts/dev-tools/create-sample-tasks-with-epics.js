const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function createSampleTasksWithEpics() {
  try {
    console.log('🎯 Creating sample tasks linked to epics...');

    // Get existing data
    const workspace = await sql`SELECT id FROM workspaces LIMIT 1`.then(res => res[0]);
    const project = await sql`SELECT id FROM projects LIMIT 1`.then(res => res[0]);
    const users = await sql`SELECT id, name FROM users ORDER BY name`;
    const epics = await sql`SELECT id, name FROM epics ORDER BY name`;

    if (!workspace || !project || users.length === 0 || epics.length === 0) {
      console.log('❌ Need workspace, project, users, and epics to create sample tasks');
      return;
    }

    console.log(`📍 Found ${epics.length} epics and ${users.length} users`);

    // Sample tasks for each epic
    const sampleTasks = [
      // Parts Epic Tasks
      {
        name: 'Legacy Data Migration - Heavy Duty Models',
        description: 'Migrate existing parts data for heavy duty vehicle models to new system',
        epicName: 'Parts',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimatedHours: 120,
        progress: 35,
        type: 'EPIC',
        category: 'Data Migration'
      },
      {
        name: 'SPINE Application Development',
        description: 'Develop parts management application interface',
        epicName: 'Parts',
        status: 'TODO',
        priority: 'HIGH',
        estimatedHours: 200,
        progress: 0,
        type: 'FEATURE',
        category: 'Application Development'
      },
      {
        name: 'Interactive 3D Parts Catalog',
        description: 'Create 3D visualization for parts catalog',
        epicName: 'Parts',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 160,
        progress: 0,
        type: 'FEATURE',
        category: 'UI/UX'
      },

      // Service Epic Tasks
      {
        name: 'Operator Manuals Digitization',
        description: 'Convert operator manuals to digital format with search functionality',
        epicName: 'Service',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimatedHours: 80,
        progress: 50,
        type: 'TASK',
        category: 'Documentation'
      },
      {
        name: 'Shop Manuals Integration',
        description: 'Integrate shop manuals with diagnostic tools',
        epicName: 'Service',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 100,
        progress: 0,
        type: 'TASK',
        category: 'Integration'
      },
      {
        name: 'AI Assistant for Service',
        description: 'Implement AI-powered service assistance features',
        epicName: 'Service',
        status: 'BACKLOG',
        priority: 'LOW',
        estimatedHours: 150,
        progress: 0,
        type: 'FEATURE',
        category: 'AI/ML'
      },

      // Diagnostics Epic Tasks
      {
        name: 'Wiring Manual System',
        description: 'Develop comprehensive wiring manual system',
        epicName: 'Diagnostics',
        status: 'IN_REVIEW',
        priority: 'HIGH',
        estimatedHours: 90,
        progress: 80,
        type: 'FEATURE',
        category: 'Documentation'
      },
      {
        name: 'DTC Manual Integration',
        description: 'Integrate Diagnostic Trouble Code manuals',
        epicName: 'Diagnostics',
        status: 'DONE',
        priority: 'HIGH',
        estimatedHours: 60,
        progress: 100,
        type: 'TASK',
        category: 'Integration'
      },
      {
        name: 'Remote Assistant Setup',
        description: 'Configure remote diagnostic assistance tools',
        epicName: 'Diagnostics',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 70,
        progress: 0,
        type: 'TASK',
        category: 'Tools'
      },

      // Training Epic Tasks
      {
        name: 'Driver Training Manual',
        description: 'Create comprehensive driver training materials',
        epicName: 'Training',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimatedHours: 100,
        progress: 25,
        type: 'TASK',
        category: 'Training Materials'
      },
      {
        name: '3D Learning Videos',
        description: 'Produce 3D animated learning videos',
        epicName: 'Training',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 180,
        progress: 0,
        type: 'FEATURE',
        category: 'Video Production'
      },
      {
        name: 'Technical Training Manuals',
        description: 'Develop technical training manuals for service technicians',
        epicName: 'Training',
        status: 'BACKLOG',
        priority: 'MEDIUM',
        estimatedHours: 120,
        progress: 0,
        type: 'TASK',
        category: 'Training Materials'
      }
    ];

    console.log('\n📝 Creating sample tasks...');

    for (let i = 0; i < sampleTasks.length; i++) {
      const task = sampleTasks[i];
      
      // Find the epic
      const epic = epics.find(e => e.name === task.epicName);
      if (!epic) {
        console.log(`⚠️  Epic "${task.epicName}" not found for task "${task.name}"`);
        continue;
      }

      // Assign to random user
      const assignee = users[Math.floor(Math.random() * users.length)];
      
      // Calculate due date (2-4 weeks from now based on task size)
      const weeksToAdd = Math.max(2, Math.ceil(task.estimatedHours / 40));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (weeksToAdd * 7));

      const startDate = new Date();
      if (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW' || task.status === 'DONE') {
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 10));
      }

      const completedDate = task.status === 'DONE' ? new Date() : null;

      try {
        const newTask = await sql`
          INSERT INTO tasks (
            name, description, status, priority, importance, category, type,
            epic_id, estimated_hours, progress, position, start_date, due_date,
            completed_date, assignee_id, project_id, workspace_id, reporter_id,
            remaining_hours, custom_fields
          )
          VALUES (
            ${task.name},
            ${task.description},
            ${task.status},
            ${task.priority},
            ${task.priority}, -- Using priority for importance too
            ${task.category},
            ${task.type},
            ${epic.id},
            ${task.estimatedHours},
            ${task.progress},
            ${(i + 1) * 1000},
            ${task.status === 'TODO' || task.status === 'BACKLOG' ? null : startDate},
            ${dueDate},
            ${completedDate},
            ${assignee.id},
            ${project.id},
            ${workspace.id},
            ${assignee.id}, -- Reporter same as assignee for sample data
            ${Math.max(0, task.estimatedHours - Math.floor(task.estimatedHours * task.progress / 100))},
            ${JSON.stringify({
              epicName: task.epicName,
              createdBy: 'System',
              sampleData: true
            })}
          )
          RETURNING id
        `;
        
        console.log(`✅ Created: "${task.name}" (${task.epicName}) - ${task.status} - Assigned to: ${assignee.name}`);
        
      } catch (error) {
        console.log(`❌ Failed to create task "${task.name}": ${error.message}`);
      }
    }

    // Show summary
    console.log('\n📊 Tasks Summary by Epic:');
    const tasksSummary = await sql`
      SELECT 
        e.name as epic_name,
        e.color,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) as todo_count,
        COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN t.status = 'IN_REVIEW' THEN 1 END) as in_review_count,
        COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as done_count,
        SUM(t.estimated_hours) as total_estimated_hours,
        AVG(t.progress) as avg_progress
      FROM epics e
      LEFT JOIN tasks t ON t.epic_id = e.id
      WHERE e.project_id = ${project.id}
      GROUP BY e.id, e.name, e.color
      ORDER BY e.name
    `;

    tasksSummary.forEach(summary => {
      console.log(`\n📋 ${summary.epic_name} (${summary.color}):`);
      console.log(`   • Total Tasks: ${summary.task_count}`);
      console.log(`   • To Do: ${summary.todo_count} | In Progress: ${summary.in_progress_count} | In Review: ${summary.in_review_count} | Done: ${summary.done_count}`);
      console.log(`   • Estimated Hours: ${summary.total_estimated_hours}`);
      console.log(`   • Average Progress: ${Math.round(summary.avg_progress || 0)}%`);
    });

    console.log('\n🎉 Sample tasks created successfully!');
    console.log('\n💡 You can now:');
    console.log('   • View tasks organized by epics in your board');
    console.log('   • Track progress by epic categories');
    console.log('   • Create custom board views for different epic types');
    console.log('   • Generate epic-based reports and analytics');

  } catch (error) {
    console.error('❌ Error creating sample tasks:', error.message);
  } finally {
    await sql.end();
  }
}

createSampleTasksWithEpics();