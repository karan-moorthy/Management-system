#!/usr/bin/env node

/**
 * Pre-Deployment Diagnostic Tool
 * Run this before deploying to catch common issues
 * 
 * Usage: node pre-deploy-check.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running Pre-Deployment Diagnostics...\n');

let errorCount = 0;
let warningCount = 0;

// Check 1: Environment Variables
console.log('1️⃣ Checking Environment Variables...');
const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
const envVars = process.env;

requiredEnvVars.forEach(varName => {
  if (!envVars[varName]) {
    console.log(`   ❌ ERROR: ${varName} is not set`);
    errorCount++;
  } else {
    console.log(`   ✅ ${varName} is set`);
  }
});

// Check 2: Hardcoded Credentials
console.log('\n2️⃣ Checking for Hardcoded Credentials...');
const filesWithCredentials = [
  'check-database.js',
  'verify-storage.js',
  'test-admin-records.js',
  'test-workspaces.js',
  'test-company-wide.js',
  'test-midnight-logic.js',
  'clean-task-data.js',
  'inspect-task-data.js'
];

filesWithCredentials.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Check for hardcoded connection strings
    if (content.includes('postgresql://') && !content.includes('process.env.DATABASE_URL')) {
      console.log(`   ⚠️  WARNING: ${file} may contain hardcoded credentials`);
      warningCount++;
    }
  }
});

if (warningCount === 0) {
  console.log('   ✅ No hardcoded credentials detected');
}

// Check 3: Build Test
console.log('\n3️⃣ Checking Build Configuration...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.scripts.build) {
  console.log('   ✅ Build script found');
} else {
  console.log('   ❌ ERROR: Build script missing in package.json');
  errorCount++;
}

// Check 4: TypeScript Configuration
console.log('\n4️⃣ Checking TypeScript Configuration...');
if (fs.existsSync('tsconfig.json')) {
  console.log('   ✅ tsconfig.json found');
} else {
  console.log('   ❌ ERROR: tsconfig.json missing');
  errorCount++;
}

// Check 5: Database Schema
console.log('\n5️⃣ Checking Database Schema...');
if (fs.existsSync('src/db/schema.ts')) {
  console.log('   ✅ Database schema found');
} else {
  console.log('   ❌ ERROR: Database schema missing');
  errorCount++;
}

// Check 6: .gitignore
console.log('\n6️⃣ Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (gitignore.includes('.env')) {
    console.log('   ✅ .env files are ignored');
  } else {
    console.log('   ⚠️  WARNING: .env files may not be ignored');
    warningCount++;
  }
} else {
  console.log('   ❌ ERROR: .gitignore missing');
  errorCount++;
}

// Check 7: Next.js Configuration
console.log('\n7️⃣ Checking Next.js Configuration...');
if (fs.existsSync('next.config.mjs') || fs.existsSync('next.config.js')) {
  console.log('   ✅ Next.js config found');
} else {
  console.log('   ⚠️  WARNING: Next.js config not found');
  warningCount++;
}

// Check 8: Dependencies
console.log('\n8️⃣ Checking Dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ Dependencies installed');
} else {
  console.log('   ❌ ERROR: node_modules not found. Run: npm install');
  errorCount++;
}

// Check 9: Database Connection (if DATABASE_URL is set)
console.log('\n9️⃣ Checking Database Connection...');
if (envVars.DATABASE_URL) {
  console.log('   ℹ️  Run: npm run db:check to test database connection');
} else {
  console.log('   ⚠️  Skipped (DATABASE_URL not set)');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 DIAGNOSTIC SUMMARY');
console.log('='.repeat(60));

if (errorCount === 0 && warningCount === 0) {
  console.log('✅ All checks passed! You\'re ready to deploy.');
  console.log('\n🚀 Next steps:');
  console.log('   1. Run: npm run build (to test production build)');
  console.log('   2. Commit your changes: git commit -am "Ready for deployment"');
  console.log('   3. Push to your repository: git push');
  console.log('   4. Deploy to your platform (Vercel, Railway, etc.)');
  process.exit(0);
} else {
  console.log(`\n⚠️  Found ${errorCount} error(s) and ${warningCount} warning(s)`);
  
  if (errorCount > 0) {
    console.log('\n❌ CRITICAL ERRORS - Fix these before deploying:');
    console.log('   • Missing environment variables');
    console.log('   • Missing configuration files');
  }
  
  if (warningCount > 0) {
    console.log('\n⚠️  WARNINGS - Review these:');
    console.log('   • Hardcoded credentials detected');
    console.log('   • Configuration issues');
  }
  
  console.log('\n📖 For detailed troubleshooting, see: DEPLOYMENT_CHECKLIST.md');
  process.exit(1);
}
