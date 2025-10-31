# Appwrite CLI Commands to Create Invitations Collection
# Run these commands in your terminal after installing Appwrite CLI

# 1. First, install Appwrite CLI (if not installed)
# npm install -g appwrite-cli

# 2. Login to Appwrite
# appwrite login

# 3. Set your project ID
# appwrite client setProject 69020ccf002da3f665e6

# 4. Create the collection
appwrite databases createCollection \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --name "Invitations"

# 5. Create all attributes at once

# Email attribute
appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "email" \
    --size 255 \
    --required true

# WorkspaceId attribute  
appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "workspaceId" \
    --size 255 \
    --required true

# InvitedBy attribute
appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "invitedBy" \
    --size 255 \
    --required true

# Status attribute with default value
appwrite databases createStringAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "status" \
    --size 20 \
    --required true \
    --default "PENDING"

# ExpiresAt attribute
appwrite databases createDatetimeAttribute \
    --databaseId "69020de7001c3eacbd10" \
    --collectionId "invitations" \
    --key "expiresAt" \
    --required true

echo "Collection and attributes created successfully!"