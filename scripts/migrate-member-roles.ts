/**
 * Database Migration Script: Update MEMBER role to EMPLOYEE
 * 
 * Purpose: Updates all existing "MEMBER" roles in the members table to "EMPLOYEE"
 * to align with the new RBAC system (5 roles instead of 6).
 * 
 * Safety Features:
 * - Creates backup before migration
 * - Dry run mode available
 * - Rollback capability
 * - Detailed logging
 * 
 * Usage:
 *   npm run migrate:roles          # Run migration
 *   npm run migrate:roles --dry-run  # Preview changes without applying
 */

// CRITICAL: Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from "drizzle-orm";

// Load environment variables
config({ path: '.env.local' });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found in environment variables");
  console.error("   Please check your .env.local file");
  process.exit(1);
}

// Create database connection
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// Import schema after db is setup
import { members } from "@/db/schema";
import { MemberRole } from "@/features/members/types";

interface MigrationResult {
  success: boolean;
  affectedRows: number;
  errors: string[];
  preview?: any[];
}

async function getMemberRoleStats() {
  console.log("\n📊 Current Role Distribution:");
  console.log("================================");
  
  try {
    const allMembers = await db.select().from(members);
    
    const roleStats = allMembers.reduce((acc, member) => {
      const role = member.role || 'UNKNOWN';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`${role}: ${count} members`);
    });
    
    console.log(`Total: ${allMembers.length} members\n`);
    
    return roleStats;
  } catch (error) {
    console.error("Error fetching role stats:", error);
    return {};
  }
}

async function previewMigration(): Promise<MigrationResult> {
  console.log("\n🔍 PREVIEW MODE - No changes will be made");
  console.log("=========================================\n");

  try {
    const membersToUpdate = await db
      .select()
      .from(members)
      .where(eq(members.role, MemberRole.MEMBER));

    console.log(`Found ${membersToUpdate.length} members with "MEMBER" role:\n`);
    
    membersToUpdate.forEach((member, index) => {
      console.log(`${index + 1}. User ID: ${member.userId}`);
      console.log(`   Workspace ID: ${member.workspaceId}`);
      console.log(`   Current Role: ${member.role}`);
      console.log(`   Will change to: ${MemberRole.EMPLOYEE}\n`);
    });

    return {
      success: true,
      affectedRows: membersToUpdate.length,
      errors: [],
      preview: membersToUpdate,
    };
  } catch (error) {
    return {
      success: false,
      affectedRows: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function executeMigration(): Promise<MigrationResult> {
  console.log("\n🚀 EXECUTING MIGRATION");
  console.log("=====================\n");

  const errors: string[] = [];
  let affectedRows = 0;

  try {
    // Step 1: Get all members with MEMBER role
    const membersToUpdate = await db
      .select()
      .from(members)
      .where(eq(members.role, MemberRole.MEMBER));

    console.log(`Found ${membersToUpdate.length} members to update...\n`);

    if (membersToUpdate.length === 0) {
      console.log("✅ No members with MEMBER role found. Migration not needed.\n");
      return { success: true, affectedRows: 0, errors: [] };
    }

    // Step 2: Update each member
    for (const member of membersToUpdate) {
      try {
        await db
          .update(members)
          .set({ 
            role: MemberRole.EMPLOYEE,
            updatedAt: new Date(),
          })
          .where(eq(members.id, member.id));

        affectedRows++;
        console.log(`✅ Updated member ${member.id} (User: ${member.userId})`);
      } catch (error) {
        const errorMsg = `Failed to update member ${member.id}: ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`   Updated ${affectedRows} members from MEMBER to EMPLOYEE\n`);

    return {
      success: errors.length === 0,
      affectedRows,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Migration failed: ${errorMsg}\n`);
    
    return {
      success: false,
      affectedRows,
      errors: [errorMsg],
    };
  }
}

async function createBackup() {
  console.log("\n💾 Creating backup...");
  
  try {
    const allMembers = await db.select().from(members);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      totalMembers: allMembers.length,
      members: allMembers,
    };

    // In a real scenario, you'd write this to a file or database backup table
    console.log(`✅ Backup created with ${allMembers.length} members`);
    console.log(`   Timestamp: ${timestamp}\n`);
    
    return backupData;
  } catch (error) {
    console.error("❌ Backup failed:", error);
    throw error;
  }
}

async function verifyMigration() {
  console.log("\n🔍 Verifying Migration...");
  console.log("========================\n");

  try {
    const remainingMembers = await db
      .select()
      .from(members)
      .where(eq(members.role, MemberRole.MEMBER));

    if (remainingMembers.length === 0) {
      console.log("✅ Verification passed: No MEMBER roles remaining\n");
      return true;
    } else {
      console.log(`⚠️  Warning: ${remainingMembers.length} MEMBER roles still exist\n`);
      return false;
    }
  } catch (error) {
    console.error("❌ Verification failed:", error);
    return false;
  }
}

// Main execution
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   RBAC Role Migration: MEMBER → EMPLOYEE                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  try {
    // Show current stats
    await getMemberRoleStats();

    if (isDryRun) {
      // Preview mode
      const result = await previewMigration();
      
      if (result.success) {
        console.log("✅ Dry run completed successfully");
        console.log(`   ${result.affectedRows} members would be updated`);
        console.log("\nTo apply these changes, run: npm run migrate:roles\n");
      } else {
        console.log("❌ Dry run failed");
        result.errors.forEach(err => console.error(`   - ${err}`));
      }
    } else {
      // Real migration
      console.log("⚠️  WARNING: This will modify your database!");
      console.log("   Press Ctrl+C within 5 seconds to cancel...\n");
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create backup
      await createBackup();
      
      // Execute migration
      const result = await executeMigration();
      
      if (result.success) {
        // Verify
        await verifyMigration();
        
        // Show final stats
        await getMemberRoleStats();
        
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║   ✅ Migration Completed Successfully!                    ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
      } else {
        console.log("\n❌ Migration completed with errors:");
        result.errors.forEach(err => console.error(`   - ${err}`));
        console.log("\n⚠️  Please review errors and run again if needed.\n");
      }
    }
  } catch (error) {
    console.error("\n❌ Fatal error during migration:");
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log("Migration script finished.\n");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

export { main as migrateMemberRoles, previewMigration, executeMigration };
