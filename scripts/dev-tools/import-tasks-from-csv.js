import { db } from './src/db/index.js';
import { tasks, users, projects, workspaces } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// CSV parsing function
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = [];
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
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

// Function to convert Excel date serial number to JavaScript Date
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === '') return null;
  
  // If it's already a date string, try to parse it
  if (excelDate.includes('/') || excelDate.includes('-')) {
    const date = new Date(excelDate);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // If it's an Excel serial number
  const serial = parseFloat(excelDate);
  if (isNaN(serial)) return null;
  
  // Excel epoch is January 1, 1900 (but Excel incorrectly treats 1900 as a leap year)
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
  const jsDate = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  
  return jsDate;
}

async function importTasksFromCSV() {
  try {
    // Read CSV file (you'll need to export your Excel as CSV first)
    const csvPath = path.join(__dirname, '../sample-tasks.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found. Please create sample-tasks.csv from your Excel file.');
      console.log('Expected path:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    console.log(`Found ${rows.length} rows to import`);
    
    // Get default workspace and project (you'll need these to exist)
    const defaultWorkspace = await db.select().from(workspaces).limit(1);
    const defaultProject = await db.select().from(projects).limit(1);
    
    if (!defaultWorkspace[0] || !defaultProject[0]) {
      console.log('Please ensure you have at least one workspace and project created first.');
      return;
    }
    
    // Get all users to map assignees/reporters/creators
    const allUsers = await db.select().from(users);
    const userMap = new Map();
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
          created: excelDateToJSDate(row.Created) || new Date(),
          updated: excelDateToJSDate(row.Updated) || new Date(),
          resolved: excelDateToJSDate(row.Resolved) || null,
          dueDate: excelDateToJSDate(row['Due date']) || null,
          labels: row.Labels ? JSON.stringify(row.Labels.split(',').map(l => l.trim())) : null,
          description: row.Summary, // Using summary as description for now
          projectId: defaultProject[0].id,
          workspaceId: defaultWorkspace[0].id,
          estimatedHours: null,
          actualHours: 0,
          position: 1000 + imported,
        };
        
        // Insert the task
        await db.insert(tasks).values(taskData);
        imported++;
        
        console.log(`Imported: ${taskData.issueId} - ${taskData.summary}`);
        
      } catch (error) {
        console.error(`Error importing row:`, error);
        skipped++;
      }
    }
    
    console.log(`\nImport complete:`);
    console.log(`- Imported: ${imported} tasks`);
    console.log(`- Skipped: ${skipped} tasks`);
    
  } catch (error) {
    console.error('Error during import:', error);
  }
}

// Run the import
importTasksFromCSV().then(() => {
  console.log('Import process finished');
  process.exit(0);
}).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});