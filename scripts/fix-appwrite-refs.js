const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Only fix in server route files where user.id should be user.$id
    if (filePath.includes('server') && filePath.includes('route')) {
      content = content.replace(/user\.id\b/g, 'user.$id');
      content = content.replace(/currentUser\.id\b/g, 'currentUser.$id');
      content = content.replace(/targetUser\.id\b/g, 'targetUser.$id');
      content = content.replace(/existingUser\.id\b/g, 'existingUser.$id');
      
      // Fix assignee.id to assignee.$id
      content = content.replace(/assignee\.id\b/g, 'assignee.$id');
      
      // Fix task.id in map functions back to task.$id
      content = content.replace(/task\.id\)/g, 'task.$id)');
    }
    
    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, extensions = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        results = results.concat(walkDir(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

console.log('🔍 Fixing Appwrite user.$id references...\n');

const srcDir = path.join(__dirname, '..', 'src');
const files = walkDir(srcDir);

let fixedCount = 0;
files.forEach(file => {
  if (replaceInFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
