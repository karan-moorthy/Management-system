const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace .$id with .id
    content = content.replace(/\.\$id\b/g, '.id');
    
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
      // Skip node_modules and .next
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

console.log('🔍 Searching for files to fix...\n');

const srcDir = path.join(__dirname, '..', 'src');
const files = walkDir(srcDir);

console.log(`Found ${files.length} TypeScript files\n`);

let fixedCount = 0;
files.forEach(file => {
  if (replaceInFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
