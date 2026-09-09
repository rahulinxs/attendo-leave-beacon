# Supabase Edge Function Manual Deployment Guide

Since the CLI deployment has permission issues, use this guide to deploy via Supabase Dashboard.

## Steps to Deploy via Supabase Dashboard

### 1. Access Supabase Dashboard
- Go to https://app.supabase.com
- Select your project

### 2. Navigate to Edge Functions
- In left sidebar, click **"Edge Functions"**
- You should see existing functions listed

### 3. Deploy send-leave-notification Function

#### Option A: Delete and Recreate (Recommended)
1. Click on **"send-leave-notification"** function
2. Click the **3-dot menu** → **Delete**
3. Confirm deletion
4. Click **"Create a new function"**
5. Name it: `send-leave-notification`
6. Keep default TypeScript
7. Click **"Create function"**
8. Copy the entire content from `/supabase/functions/send-leave-notification/index.ts` in your project
9. Paste it into the Supabase editor
10. Click **"Deploy"**

#### Option B: Edit Existing (If delete not working)
1. Click on **"send-leave-notification"** function
2. Click the **Edit** button (pencil icon)
3. Clear all current code
4. Copy the entire content from `/supabase/functions/send-leave-notification/index.ts`
5. Paste it
6. Click **"Save"** or **"Deploy"**

### 4. Verify Deployment
After deployment completes:
- Status should show green checkmark
- URL should be active
- Last deployment should show recent date

## Issues & Fixes

### If emails still not working after deployment:

**Check 1: SMTP Configuration**
```
Dashboard → Settings → Auth Providers → Email Configuration
```
Verify:
- SMTP Host is set
- SMTP Port is set (587 or 465)
- SMTP Username configured
- SMTP Password configured
- Sender Email configured (e.g., noreply@attendease.com)

**Check 2: Function Logs**
```
Dashboard → Edge Functions → send-leave-notification → View Logs
```
Look for:
- Any error messages
- Whether emails were attempted to send
- Database connection errors

**Check 3: Test the Function**
1. Go to function details
2. Click "Invoke Function"
3. Send test request:
```json
{
  "action": "apply",
  "leaveRequestId": "test-id",
  "company_id": "your-company-id"
}
```

**Check 4: User Profiles**
Verify email addresses exist:
```sql
SELECT id, email, name, role FROM profiles 
WHERE email IS NOT NULL 
LIMIT 10;
```

### Common Error Messages

**"Leave request not found"**
- Verify leaveRequestId exists in leave_requests table
- Verify company_id matches the leave request's company_id
- Check RLS policies aren't blocking access

**"Error sending email"**
- Verify SMTP is configured
- Check email addresses are valid
- Review function logs for specific error

**"Missing required fields"**
- Ensure JSON request includes: action, leaveRequestId, company_id
- Check action is one of: 'apply', 'approve', 'reject'

## Testing Workflow

1. **Deploy the function** using steps above
2. **Submit a test leave request** as employee
3. **Check reporting manager email** for notification
4. **Check admin email** for notification
5. **Approve or reject** the leave request
6. **Check employee email** for approval/rejection notification
7. **Review function logs** if emails don't arrive

## Next Steps After Deployment

1. Verify in function logs that emails are being sent
2. Check email inboxes for notifications
3. If no emails, check SMTP configuration
4. Monitor function logs for any errors
5. Test approve/reject workflow

## Support Troubleshooting Checklist

- [ ] Edge function deployed successfully
- [ ] SMTP configured in Supabase Dashboard
- [ ] Test leave request sent
- [ ] Reporting manager received email
- [ ] Admin received email
- [ ] Approve action received email
- [ ] Reject action received email
- [ ] Email formatting displays correctly
- [ ] Links in emails are clickable
- [ ] No errors in function logs
