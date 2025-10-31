interface InvitationEmailData {
  inviteeEmail: string;
  workspaceName: string;
  inviterName: string;
  inviteLink: string;
  expiresAt: string;
}

export const createInvitationEmailTemplate = (data: InvitationEmailData): string => {
  const { inviteeEmail, workspaceName, inviterName, inviteLink, expiresAt } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited to join ${workspaceName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            🎉 You're Invited!
        </h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">
            Join your team workspace
        </p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <p style="font-size: 18px; margin-bottom: 20px;">
            Hi there! 👋
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace in our Project Management System.
        </p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Workspace:</strong> ${workspaceName}<br>
                <strong>Invited by:</strong> ${inviterName}<br>
                <strong>Your email:</strong> ${inviteeEmail}
            </p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
            Click the button below to accept the invitation and join the workspace:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s;">
                Join ${workspaceName}
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Or copy and paste this link in your browser:
        </p>
        <p style="background: #f1f3f4; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #333;">
            ${inviteLink}
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #888; margin-bottom: 10px;">
            ⏰ <strong>This invitation expires on:</strong> ${new Date(expiresAt).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}
        </p>
        
        <p style="font-size: 14px; color: #888;">
            If you don't want to join this workspace, you can safely ignore this email. The invitation will expire automatically.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">
                This email was sent from the PMS Project Management System.<br>
                If you believe this email was sent to you by mistake, please ignore it.
            </p>
        </div>
    </div>
</body>
</html>
`;
};

export const createInvitationEmailSubject = (workspaceName: string, inviterName: string): string => {
  return `${inviterName} invited you to join ${workspaceName}`;
};

export type { InvitationEmailData };