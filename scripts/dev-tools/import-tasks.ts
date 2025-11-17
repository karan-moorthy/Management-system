import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from './src/db/index.js';
import { tasks, users, projects, workspaces } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

// CSV parsing function
function parseCSV(csvContent: string) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

// Function to convert date strings to JavaScript Date
function parseDate(dateString: string): Date | null {
  if (!dateString || dateString === '') return null;
  
  // Handle MM/DD/YYYY HH:MM format
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

async function importTasksFromCSV() {
  try {
    console.log('Starting import process...');
    
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'sample-tasks.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    console.log(`Found ${rows.length} rows to import`);
    
    // Get default workspace and project (you'll need these to exist)
    const defaultWorkspaces = await db.select().from(workspaces).limit(1);
    const defaultProjects = await db.select().from(projects).limit(1);
    
    if (!defaultWorkspaces[0] || !defaultProjects[0]) {
      console.log('Please ensure you have at least one workspace and project created first.');
      return;
    }
    
    // Get all users to map assignees/reporters/creators
    const allUsers = await db.select().from(users);
    const userMap = new Map<string, string>();
    allUsers.forEach(user => {
      userMap.set(user.name, user.id);
      userMap.set(user.email, user.id);
    });
    
    let imported = 0;
    let skipped = 0;
    
    for (const row of rows) {
      try {
        // Skip if no summary or issue ID
        if (!row.Summary || !row['Issue id']) {
          console.log(`Skipping row: missing summary or issue ID`);
          skipped++;
          continue;
        }
        
        // Map the CSV columns to our database structure
        const taskData = {
          summary: row.Summary,
          issueId: row['Issue id'],
          issueType: row['Issue Type'] || 'Task',
          status: row.Status || 'To Do',
          projectName: row['Project name'] || 'Default Project',
          priority: row.Priority || 'Medium',
          resolution: row.Resolution || null,
          assigneeId: userMap.get(row.Assignee) || null,
          reporterId: userMap.get(row.Reporter) || null,
          creatorId: userMap.get(row.Creator) || null,
          created: parseDate(row.Created) || new Date(),
          updated: parseDate(row.Updated) || new Date(),
          resolved: parseDate(row.Resolved) || null,
          dueDate: parseDate(row['Due date']) || null,
          labels: row.Labels ? JSON.stringify(row.Labels.split(',').map((l: string) => l.trim())) : null,
          description: row.Summary, // Using summary as description for now
          projectId: defaultProjects[0].id,
          workspaceId: defaultWorkspaces[0].id,
          estimatedHours: null,
          actualHours: 0,
          position: 1000 + imported,
        };
        
        // Insert the task
        await db.insert(tasks).values(taskData);
        imported++;
        
        console.log(`✓ Imported: ${taskData.issueId} - ${taskData.summary}`);
        
      } catch (error) {
        console.error(`✗ Error importing row ${row['Issue id']}:`, error);
        skipped++;
      }
    }
    
    console.log(`\n🎉 Import complete:`);
    console.log(`✓ Imported: ${imported} tasks`);
    console.log(`✗ Skipped: ${skipped} tasks`);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
  }
}

// Run the import
importTasksFromCSV()
  .then(() => {
    console.log('✅ Import process finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });