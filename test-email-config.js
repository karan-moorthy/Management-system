require('dotenv').config({ path: '.env.local' });

console.log('Email Configuration Check:');
console.log('==========================\n');

console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || '❌ NOT SET (will default to http://localhost:3000)');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET (will default to "PMS Team <noreply@yourdomain.com>")');
console.log('\nEmail Service Options:');
console.log('1. Gmail SMTP:');
console.log('   - GMAIL_USER:', process.env.GMAIL_USER ? '✅ SET' : '❌ NOT SET');
console.log('   - GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ SET (length: ' + process.env.GMAIL_APP_PASSWORD.length + ')' : '❌ NOT SET');
console.log('\n2. Resend API:');
console.log('   - RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ SET' : '❌ NOT SET');

console.log('\n📝 Notes:');
console.log('- You need either Gmail credentials OR Resend API key (not both)');
console.log('- For Gmail: Use App Password, not your regular password');
console.log('- Generate App Password: https://myaccount.google.com/apppasswords');
console.log('- NEXT_PUBLIC_APP_URL should include https:// for production');
console.log('\n✨ Current Email Service:');
if (process.env.RESEND_API_KEY) {
  console.log('Using: Resend API');
} else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  console.log('Using: Gmail SMTP');
} else {
  console.log('⚠️ NO EMAIL SERVICE CONFIGURED - Emails will fail to send!');
}
