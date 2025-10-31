# Appwrite CLI Commands to Create Invitations Collection

# First, make sure you're logged in to Appwrite CLI
# appwrite login

# Set your project
# appwrite client setProject 69020ccf002da3f665e6

# Create the collection
appwrite databases createCollection \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --name "Invitations"

# Add string attributes
appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "email" \
    --size 255 \
    --required true

appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "workspaceId" \
    --size 255 \
    --required true

appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "invitedBy" \
    --size 255 \
    --required true

appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "status" \
    --size 20 \
    --required true \
    --default "PENDING"

# Add datetime attribute
appwrite databases createDatetimeAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "expiresAt" \
    --required true

# Create indexes for better performance
appwrite databases createIndex \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "email_idx" \
    --type "key" \
    --attributes "email"

appwrite databases createIndex \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "workspace_idx" \
    --type "key" \
    --attributes "workspaceId"

appwrite databases createIndex \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "status_idx" \
    --type "key" \
    --attributes "status"