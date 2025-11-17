const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function createEpicsFromData() {
  try {
    console.log('🎯 Creating epics from your imported data structure...');

    // Get existing workspace and project
    const workspaces = await sql`
      SELECT id, name FROM workspaces LIMIT 1
    `;

    const projects = await sql`
      SELECT id, name, workspace_id FROM projects LIMIT 1  
    `;

    if (workspaces.length === 0 || projects.length === 0) {
      console.log('❌ Need at least one workspace and project. Please create them first.');
      return;
    }

    const workspaceId = workspaces[0].id;
    const projectId = projects[0].id;
    const ownerId = await sql`SELECT id FROM users LIMIT 1`.then(users => users[0]?.id);

    console.log(`📍 Using workspace: ${workspaces[0].name} (${workspaceId})`);
    console.log(`📍 Using project: ${projects[0].name} (${projectId})`);

    // Define epics based on your data
    const epicsData = [
      {
        name: 'Parts',
        description: 'Parts management and catalog development including data migration, applications, and search functionality',
        color: '#FF6B6B', // Red theme
        icon: 'Package',
        estimatedHours: 2080, // Estimated from your data
        tasks: [
          'Legacy Data Migration (HD)',
          'Legacy Data Migration (All models except HD)',
          'SPINE Application (Parts Management)',
          'Interactive 3D Parts Catalog',
          'Collision Search',
          'Flat Rate Manual (HD)',
          'Flat Rate Manual (All models except HD)',
          'Parts - GenAI Assist',
          'Parts - Content management System'
        ]
      },
      {
        name: 'Service',
        description: 'Service documentation and support systems including manuals, tools, and AI assistance',
        color: '#4ECDC4', // Teal theme
        icon: 'Wrench',
        estimatedHours: 1560, // Estimated from your data
        tasks: [
          'Operator\'s Manuals',
          'Shop Manuals',
          'Special Tool Manuals',
          'Service Bulletins',
          'Service AR',
          'AI Assist',
          'Service - Content management System',
          'Service - GenAI Assist for Content Creation'
        ]
      },
      {
        name: 'Diagnostics',
        description: 'Diagnostic tools and troubleshooting systems for technical support',
        color: '#45B7D1', // Blue theme
        icon: 'Search',
        estimatedHours: 1040, // Estimated from your data
        tasks: [
          'Wiring Manual',
          'DTC Manual',
          'Symptom Based Troubleshooting',
          'Remote Assistant',
          'Diagnostics - Content management System',
          'Diagnostics - GenAI Assist for Content Creation'
        ]
      },
      {
        name: 'Training',
        description: 'Training materials and educational content development',
        color: '#96CEB4', // Green theme
        icon: 'BookOpen',
        estimatedHours: 1300, // Estimated from your data
        tasks: [
          'Driver Training Manual',
          'Technical Training Manual',
          'Wallcharts',
          'Pocket guides',
          'Special Tool Manuals',
          '3D Learning Videos'
        ]
      }
    ];

    console.log('\n📝 Creating epics...');

    for (let i = 0; i < epicsData.length; i++) {
      const epic = epicsData[i];
      
      // Check if epic already exists
      const existingEpic = await sql`
        SELECT id FROM epics WHERE name = ${epic.name} AND project_id = ${projectId}
      `;

      let epicId;

      if (existingEpic.length > 0) {
        epicId = existingEpic[0].id;
        console.log(`ℹ️  Epic "${epic.name}" already exists`);
      } else {
        const newEpic = await sql`
          INSERT INTO epics (
            name, description, color, icon, project_id, workspace_id, owner_id, 
            estimated_hours, position, status
          )
          VALUES (
            ${epic.name}, ${epic.description}, ${epic.color}, ${epic.icon},
            ${projectId}, ${workspaceId}, ${ownerId},
            ${epic.estimatedHours}, ${(i + 1) * 1000}, 'ACTIVE'
          )
          RETURNING id
        `;
        
        epicId = newEpic[0].id;
        console.log(`✅ Created epic: ${epic.name} (${epic.tasks.length} related tasks)`);
      }

      // Update existing tasks to link them to epics
      console.log(`🔗 Linking tasks to "${epic.name}" epic...`);
      
      for (const taskName of epic.tasks) {
        const taskUpdate = await sql`
          UPDATE tasks 
          SET epic_id = ${epicId}, category = ${epic.name}
          WHERE name ILIKE ${`%${taskName}%`}
        `;
        
        if (taskUpdate.count > 0) {
          console.log(`   • Linked: ${taskName}`);
        }
      }
    }

    // Show summary
    console.log('\n📊 Epic Creation Summary:');
    const epicsSummary = await sql`
      SELECT 
        e.name,
        e.color,
        e.estimated_hours,
        COUNT(t.id) as task_count,
        SUM(t.estimated_hours) as total_task_hours
      FROM epics e
      LEFT JOIN tasks t ON t.epic_id = e.id
      WHERE e.project_id = ${projectId}
      GROUP BY e.id, e.name, e.color, e.estimated_hours
      ORDER BY e.position
    `;

    epicsSummary.forEach(epic => {
      console.log(`📋 ${epic.name}:`);
      console.log(`   • Tasks: ${epic.task_count}`);
      console.log(`   • Estimated Hours: ${epic.estimated_hours}`);
      console.log(`   • Color: ${epic.color}`);
    });

    console.log('\n🎉 Epic creation completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Update your board views to show epics');
    console.log('   2. Create custom dashboards for epic-based reporting');
    console.log('   3. Set up notifications for epic progress tracking');
    console.log('   4. Configure time tracking for better project insights');

  } catch (error) {
    console.error('❌ Error creating epics:', error.message);
  } finally {
    await sql.end();
  }
}

createEpicsFromData();