# Invitation System Setup

## Overview
The invitation system allows workspace administrators to invite new members via email. When invited, users receive a link that allows them to join the workspace automatically.

## Database Setup (Appwrite)

### IMPORTANT: Create the Collection First!
Before using the invitation system, you **must** create the `invitations` collection in your Appwrite database.

### Step-by-Step Setup:

1. **Go to your Appwrite Console** → Database → Collections
2. **Create New Collection**:
   - Collection ID: `invitations`
   - Collection Name: `Invitations`

3. **Add Attributes** (click "Add Attribute" for each):

   **String Attributes:**
   - `email` (String, 255 chars, Required)
   - `workspaceId` (String, 255 chars, Required) 
   - `invitedBy` (String, 255 chars, Required)
   - `status` (String, 20 chars, Required, Default: "PENDING")
   
   **DateTime Attribute:**
   - `expiresAt` (DateTime, Required)

4. **Create Indexes** (for better performance):
   - Index 1: `email_idx` → Field: `email`
   - Index 2: `workspace_idx` → Field: `workspaceId` 
   - Index 3: `status_idx` → Field: `status`
   - Index 4: `email_workspace_status_idx` → Fields: `email, workspaceId, status`

5. **Set Permissions**:
   - **Create**: `users`
   - **Read**: `users` 
   - **Update**: `users`
   - **Delete**: `users`

### Quick Setup Checklist:
- [ ] Collection `invitations` created with ID `invitations`
- [ ] All 5 attributes added (email, workspaceId, invitedBy, status, expiresAt)
- [ ] Environment variable `NEXT_PUBLIC_APPWRITE_INVITATIONS_ID=invitations` added
- [ ] Collection permissions set to allow `users`

### Alternative: Use Appwrite CLI
If you prefer using the Appwrite CLI:

```bash
# Create collection
appwrite databases createCollection --databaseId [YOUR_DATABASE_ID] --collectionId invitations --name "Invitations"

# Add attributes
appwrite databases createStringAttribute --databaseId [YOUR_DATABASE_ID] --collectionId invitations --key email --size 255 --required true
appwrite databases createStringAttribute --databaseId [YOUR_DATABASE_ID] --collectionId invitations --key workspaceId --size 255 --required true
appwrite databases createStringAttribute --databaseId [YOUR_DATABASE_ID] --collectionId invitations --key invitedBy --size 255 --required true
appwrite databases createStringAttribute --databaseId [YOUR_DATABASE_ID] --collectionId invitations --key status --size 20 --required true --default "PENDING"
appwrite databases createDatetimeAttribute --databaseId [YOUR_DATABASE_ID] --collectionId invitations --key expiresAt --required true
```

## Environment Variables
Add the following to your `.env.local`:
```
NEXT_PUBLIC_APPWRITE_INVITATIONS_ID=invitations
```

## Features Included

### 1. Send Invitations
- **Location**: Members List page → "Add Member" button
- **Functionality**: 
  - Validates email format
  - Checks if user is already a member
  - Prevents duplicate invitations
  - Generates unique invitation link
  - Shows copyable invitation link after sending

### 2. Accept Invitations
- **URL Pattern**: `/invite/[inviteId]`
- **Functionality**:
  - Validates invitation exists and is pending
  - Checks expiration (7 days default)
  - Verifies email matches signed-in user
  - Adds user as workspace member
  - Redirects to workspace

### 3. Security Features
- Email validation on both client and server
- Expiration handling (7 days)
- Duplicate invitation prevention
- Admin-only invitation sending
- Email ownership verification

## API Endpoints

### POST /api/invitations
Send a new invitation
- **Body**: `{ email: string, workspaceId: string }`
- **Returns**: Invitation object with invite link

### GET /api/invitations/[inviteId]
Get invitation details
- **Returns**: Invitation and workspace information

### POST /api/invitations/[inviteId]/accept
Accept an invitation
- **Returns**: Workspace object

## Usage Flow

1. **Admin sends invitation**:
   - Navigate to workspace → Members → "Add Member"
   - Enter email address → "Send Invitation"
   - Copy and share the generated invite link

2. **User accepts invitation**:
   - Click the invitation link
   - Sign in (if not already)
   - Click "Join Workspace"
   - Automatically redirected to workspace

## Future Enhancements

### Email Integration
Currently, the system generates invitation links that need to be manually shared. To add automatic email sending:

1. **Add email service** (SendGrid, Resend, etc.)
2. **Update invitation route** to send emails
3. **Add email templates** for invitation notifications
4. **Add email preferences** in user settings

### Example email integration:
```typescript
// In invitation server route after creating invitation
await sendInvitationEmail({
  to: email,
  inviteLink: `${baseUrl}/invite/${invitation.$id}`,
  workspaceName: workspace.name,
  inviterName: user.name
});
```

## Testing

1. **Test invitation creation**: Ensure only workspace admins can send invitations
2. **Test duplicate prevention**: Try sending multiple invitations to the same email
3. **Test expiration**: Verify invitations expire after 7 days
4. **Test email validation**: Ensure only invited email can accept
5. **Test member addition**: Verify users are properly added to workspace after accepting