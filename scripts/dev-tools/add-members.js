const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, members, workspaces } = require('./src/db/schema.ts');
const { eq } = require('drizzle-orm');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// Employee emails to add as members
const employeeEmails = [
  'aakash.parashar@pms.com',
  'aishwarya.jeevan@pms.com',
  'arunraj@pms.com',
  'chandramohan.reddy@pms.com',
  'karthikeyan.saminathan@pms.com',
  'rajkumar.patil@pms.com',
  'sathish.kumar@pms.com',
  'vinoth.shanmugam@pms.com',
  'francis.xavier@pms.com',
  'arumugam.siva@pms.com',
  'jayasurya.sudhakaran@pms.com',
  'balumohan@pms.com',
];

async function addMembersToWorkspace() {
  try {
    console.log('\n👥 Adding employees as members...\n');

    // Get or create default workspace
    let workspace;
    const allWorkspaces = await db.select().from(workspaces);
    
    if (allWorkspaces.length === 0) {
      console.log('Creating default workspace...');
      // Get any user to own the workspace (preferably admin/manager)
      const allUsers = await db.select().from(users);
      
      if (allUsers.length === 0) {
        console.error('❌ No users found. Please create users first.');
        await client.end();
        process.exit(1);
      }

      // Try to find admin, manager, or lead user
      let ownerUser = allUsers.find(u => 
        u.email?.includes('admin') || 
        u.designation?.toLowerCase().includes('manager') ||
        u.designation?.toLowerCase().includes('lead')
      ) || allUsers[0];

      [workspace] = await db.insert(workspaces).values({
        name: 'Default Workspace',
        inviteCode: 'DEFAULT-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        userId: ownerUser.id,
      }).returning();
      
      console.log(`✅ Created workspace: ${workspace.name} (owned by ${ownerUser.name})`);
    } else {
      workspace = allWorkspaces[0];
      console.log(`Using workspace: ${workspace.name} (${workspace.id})`);
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const email of employeeEmails) {
      try {
        // Find user
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
          console.log(`⚠️  User not found: ${email}`);
          continue;
        }

        // Check if already a member
        const existingMember = await db
          .select()
          .from(members)
          .where((table) => table.userId === user.id && table.workspaceId === workspace.id);

        if (existingMember.length > 0) {
          console.log(`⚠️  Already a member: ${user.name}`);
          skippedCount++;
          continue;
        }

        // Assign role based on designation
        let role = 'MEMBER';
        if (user.designation?.toLowerCase().includes('lead') || 
            user.designation?.toLowerCase().includes('manager')) {
          role = 'ADMIN';
        }

        // Add as member
        const [newMember] = await db.insert(members).values({
          userId: user.id,
          workspaceId: workspace.id,
          role: role,
        }).returning();

        console.log(`✅ Added: ${user.name} (${role})`);
        addedCount++;
      } catch (error) {
        console.error(`❌ Error adding ${email}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully added ${addedCount} members!`);
    console.log(`⚠️  Skipped ${skippedCount} (already members)`);
    console.log(`\n📊 Summary:`);
    console.log(`   Workspace: ${workspace.name}`);
    console.log(`   Workspace ID: ${workspace.id}`);
    console.log(`   Total Members: ${addedCount + skippedCount}`);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

addMembersToWorkspace();
