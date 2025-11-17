/**
 * Test Custom Batch ID Formats
 * 
 * Run this to see examples of all 4 batch ID formats
 */

// Simulate data
const projectName = "Benz Automobile";
const userName = "Admin Karanm";
const projectId = "proj_12345";

console.log('🎯 Custom Batch ID Format Examples\n');
console.log('='.repeat(80));

// Option 1: Human-Readable
function generateReadableBatchId(projectName) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 3 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  const cleanName = projectName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10);
  return `${cleanName}_${date}_${time}_${suffix}`;
}

// Option 2: Sequential (simulated)
function generateSequentialBatchId(batchNumber) {
  return `BATCH_${String(batchNumber).padStart(6, '0')}`;
}

// Option 3: Custom (Project + User + Time)
function generateCustomBatchId(projectName, userName) {
  const now = new Date();
  const projectCode = projectName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
  const nameParts = userName.split(' ');
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : userName.slice(0, 2).toUpperCase();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  return `${projectCode}-${initials}-${timestamp}`;
}

// Option 4: UUID (simulated)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate examples
console.log('\n📋 OPTION 1: HUMAN-READABLE (Currently Active)');
console.log('Format: PROJECTNAME_YYYYMMDD_HHMMSS_XXX\n');
for (let i = 0; i < 3; i++) {
  console.log(`   ${generateReadableBatchId(projectName)}`);
}

console.log('\n📋 OPTION 2: SEQUENTIAL');
console.log('Format: BATCH_NNNNNN\n');
console.log(`   ${generateSequentialBatchId(1)}`);
console.log(`   ${generateSequentialBatchId(234)}`);
console.log(`   ${generateSequentialBatchId(12345)}`);

console.log('\n📋 OPTION 3: CUSTOM (Project + User + Time)');
console.log('Format: [PROJECT_CODE]-[USER_INITIALS]-[TIMESTAMP]\n');
console.log(`   ${generateCustomBatchId(projectName, userName)}`);
console.log(`   ${generateCustomBatchId("Spine Medical", "John Doe")}`);
console.log(`   ${generateCustomBatchId("ERP System", "Mary Jane")}`);

console.log('\n📋 OPTION 4: UUID');
console.log('Format: Standard UUID v4\n');
for (let i = 0; i < 3; i++) {
  console.log(`   ${generateUUID()}`);
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 TO CHANGE FORMAT:');
console.log('   Edit: src/features/tasks/server/route.ts');
console.log('   Line: ~569 (after "Get project to verify it exists")');
console.log('   Change the uploadBatchId line to your preferred format\n');

console.log('📚 DOCUMENTATION:');
console.log('   See CUSTOM_BATCH_ID_GUIDE.md for detailed instructions\n');
