const { drizzle } = require('drizzle-orm/postgres-js');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');
const { users } = require('./src/db/schema.ts');
const { hash } = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// Employee data - you can modify these details as needed
const employees = [
  {
    name: 'Aakash Ravi Shankar Parashar',
    email: 'aakash.parashar@pms.com',
    designation: 'Software Engineer',
    department: 'Engineering',
    mobileNo: '9876543201',
    native: 'Mumbai',
    experience: 3,
    skills: ['JavaScript', 'React', 'Node.js'],
    dateOfJoining: new Date('2024-01-15'),
  },
  {
    name: 'Aishwarya Jeevan',
    email: 'aishwarya.jeevan@pms.com',
    designation: 'UI/UX Designer',
    department: 'Design',
    mobileNo: '9876543202',
    native: 'Bangalore',
    experience: 4,
    skills: ['Figma', 'Adobe XD', 'UI Design'],
    dateOfJoining: new Date('2023-06-10'),
  },
  {
    name: 'Arunraj',
    email: 'arunraj@pms.com',
    designation: 'Senior Developer',
    department: 'Engineering',
    mobileNo: '9876543203',
    native: 'Chennai',
    experience: 6,
    skills: ['Java', 'Spring Boot', 'Microservices'],
    dateOfJoining: new Date('2022-03-20'),
  },
  {
    name: 'Chandramohan Reddy',
    email: 'chandramohan.reddy@pms.com',
    designation: 'DevOps Engineer',
    department: 'Operations',
    mobileNo: '9876543204',
    native: 'Hyderabad',
    experience: 5,
    skills: ['AWS', 'Docker', 'Kubernetes'],
    dateOfJoining: new Date('2023-01-10'),
  },
  {
    name: 'Karthikeyan Saminathan',
    email: 'karthikeyan.saminathan@pms.com',
    designation: 'Team Lead',
    department: 'Engineering',
    mobileNo: '9876543205',
    native: 'Coimbatore',
    experience: 8,
    skills: ['Python', 'Django', 'PostgreSQL'],
    dateOfJoining: new Date('2021-07-15'),
  },
  {
    name: 'Rajkumar Patil',
    email: 'rajkumar.patil@pms.com',
    designation: 'QA Engineer',
    department: 'Quality Assurance',
    mobileNo: '9876543206',
    native: 'Pune',
    experience: 4,
    skills: ['Selenium', 'Jest', 'Testing'],
    dateOfJoining: new Date('2023-02-20'),
  },
  {
    name: 'Sathish Kumar P',
    email: 'sathish.kumar@pms.com',
    designation: 'Backend Developer',
    department: 'Engineering',
    mobileNo: '9876543207',
    native: 'Madurai',
    experience: 5,
    skills: ['Node.js', 'Express', 'MongoDB'],
    dateOfJoining: new Date('2022-11-05'),
  },
  {
    name: 'Vinoth Kumar Shanmugam',
    email: 'vinoth.shanmugam@pms.com',
    designation: 'Full Stack Developer',
    department: 'Engineering',
    mobileNo: '9876543208',
    native: 'Salem',
    experience: 4,
    skills: ['React', 'TypeScript', 'Next.js'],
    dateOfJoining: new Date('2023-04-12'),
  },
  {
    name: 'Francis Xavier S',
    email: 'francis.xavier@pms.com',
    designation: 'Project Manager',
    department: 'Management',
    mobileNo: '9876543209',
    native: 'Kochi',
    experience: 10,
    skills: ['Project Management', 'Agile', 'Scrum'],
    dateOfJoining: new Date('2020-05-18'),
  },
  {
    name: 'Arumugam Sivasubramaniyan',
    email: 'arumugam.siva@pms.com',
    designation: 'Database Administrator',
    department: 'IT',
    mobileNo: '9876543210',
    native: 'Trichy',
    experience: 7,
    skills: ['PostgreSQL', 'MySQL', 'Database Design'],
    dateOfJoining: new Date('2021-09-22'),
  },
  {
    name: 'Jayasurya Sudhakaran',
    email: 'jayasurya.sudhakaran@pms.com',
    designation: 'Frontend Developer',
    department: 'Engineering',
    mobileNo: '9876543211',
    native: 'Trivandrum',
    experience: 3,
    skills: ['Vue.js', 'JavaScript', 'CSS'],
    dateOfJoining: new Date('2024-02-14'),
  },
  {
    name: 'Balumohan',
    email: 'balumohan@pms.com',
    designation: 'Data Analyst',
    department: 'Analytics',
    mobileNo: '9876543212',
    native: 'Vellore',
    experience: 4,
    skills: ['Python', 'Pandas', 'Data Visualization'],
    dateOfJoining: new Date('2023-08-30'),
  },
];

async function createEmployees() {
  try {
    console.log('\n📋 Creating employees...\n');

    // Default password for all users (they should change it later)
    const defaultPassword = 'Password@123';
    const hashedPassword = await hash(defaultPassword, 10);

    const createdUsers = [];

    for (const employee of employees) {
      try {
        // Check if user already exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, employee.email))
          .limit(1);

        if (existingUser) {
          console.log(`⚠️  User already exists: ${employee.name} (${employee.email})`);
          continue;
        }

        // Create user
        const [newUser] = await db.insert(users).values({
          name: employee.name,
          email: employee.email,
          password: hashedPassword,
          designation: employee.designation,
          department: employee.department,
          mobileNo: employee.mobileNo,
          native: employee.native,
          experience: employee.experience,
          skills: employee.skills,
          dateOfJoining: employee.dateOfJoining,
        }).returning();

        createdUsers.push(newUser);
        console.log(`✅ Created: ${newUser.name} (${newUser.email})`);
      } catch (error) {
        console.error(`❌ Error creating ${employee.name}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully created ${createdUsers.length} employees!`);
    console.log('\n📝 Login Credentials:');
    console.log('   Email: <employee-email>');
    console.log(`   Password: ${defaultPassword}`);
    console.log('\n⚠️  Note: Users should change their password after first login');

    console.log('\n👥 Created Users List:');
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Department: ${user.department}`);
      console.log(`   Designation: ${user.designation}`);
      console.log('');
    });

    // Save user IDs to a file for easy reference in bulk import
    const fs = require('fs');
    const userMapping = createdUsers.map(u => ({
      name: u.name,
      email: u.email,
      id: u.id,
      department: u.department,
      designation: u.designation,
    }));
    
    fs.writeFileSync(
      'employee-user-mapping.json',
      JSON.stringify(userMapping, null, 2)
    );
    console.log('💾 User mapping saved to: employee-user-mapping.json');
    console.log('   Use this file for bulk import CSV mapping\n');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

createEmployees();
