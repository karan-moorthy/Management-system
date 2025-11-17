// Migration script to create invitations collection
// Run with: node create-invitations-migration.js

const { Client, Databases, ID } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('69020ccf002da3f665e6')
    .setKey('standard_2cbbbd4f05a1ee300f76e6e5e6a28163b3265ee09f9481eb2ec641c865b9cb9aafa25b57d1c5365b08d59fe59ce0097008d7e86e066f26553cd19d61ebb2c94ee46b41f9143f1abbfb1aec287c52542b3ae189128c73d82ca8aa2fd2aa5291b93ffe80b3dae227afcb7cf548a92ee18ec3ae375aea9b74b268c1cfcb50771684');

const databases = new Databases(client);

async function createInvitationsCollection() {
    try {
        console.log('Creating invitations collection...');
        
        // Create collection
        const collection = await databases.createCollection(
            '69020de7001c3eacbd10', // Database ID
            'invitations', // Collection ID
            'Invitations' // Collection Name
        );
        
        console.log('Collection created:', collection.$id);
        
        // Create string attributes
        await databases.createStringAttribute('69020de7001c3eacbd10', 'invitations', 'email', 255, true);
        console.log('Email attribute created');
        
        await databases.createStringAttribute('69020de7001c3eacbd10', 'invitations', 'workspaceId', 255, true);
        console.log('WorkspaceId attribute created');
        
        await databases.createStringAttribute('69020de7001c3eacbd10', 'invitations', 'invitedBy', 255, true);
        console.log('InvitedBy attribute created');
        
        await databases.createStringAttribute('69020de7001c3eacbd10', 'invitations', 'status', 20, true, 'PENDING');
        console.log('Status attribute created');
        
        // Create datetime attribute
        await databases.createDatetimeAttribute('69020de7001c3eacbd10', 'invitations', 'expiresAt', true);
        console.log('ExpiresAt attribute created');
        
        console.log('✅ Invitations collection created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating collection:', error.message);
    }
}

createInvitationsCollection();