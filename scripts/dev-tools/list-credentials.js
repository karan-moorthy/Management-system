console.log('=== EMPLOYEE LOGIN CREDENTIALS ===\n');

const employees = [
  { name: 'Aakash Ravi Shankar Parashar', email: 'aakash.parashar@pms.com' },
  { name: 'Aishwarya Jeevan', email: 'aishwarya.jeevan@pms.com' },
  { name: 'Arunraj', email: 'arunraj@pms.com' },
  { name: 'Chandramohan Reddy', email: 'chandramohan.reddy@pms.com' },
  { name: 'Karthikeyan Saminathan', email: 'karthikeyan.saminathan@pms.com' },
  { name: 'Rajkumar Patil', email: 'rajkumar.patil@pms.com' },
  { name: 'Sathish Kumar P', email: 'sathish.kumar@pms.com' },
  { name: 'Vinoth Kumar Shanmugam', email: 'vinoth.shanmugam@pms.com' },
  { name: 'Francis Xavier S', email: 'francis.xavier@pms.com' },
  { name: 'Arumugam Sivasubramaniyan', email: 'arumugam.siva@pms.com' },
  { name: 'Jayasurya Sudhakaran', email: 'jayasurya.sudhakaran@pms.com' },
  { name: 'Balumohan', email: 'balumohan@pms.com' }
];

const defaultPassword = 'Password@123';

employees.forEach((emp, i) => {
  console.log(`${i + 1}. ${emp.name}`);
  console.log(`   Email (Username): ${emp.email}`);
  console.log(`   Password: ${defaultPassword}`);
  console.log('');
});

console.log('\n⚠️  IMPORTANT: All users should change their password after first login');
console.log('📧 Use the email address as the username for login\n');
