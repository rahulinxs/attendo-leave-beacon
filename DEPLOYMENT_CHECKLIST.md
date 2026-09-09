# Leave Email Notifications - Deployment Checklist

## Pre-Deployment Verification

- [ ] **Verify SMTP Configuration**
  - [ ] Go to Supabase Dashboard → Settings → Auth
  - [ ] Confirm SMTP Host is set
  - [ ] Confirm SMTP Port is set (usually 587 or 465)
  - [ ] Confirm SMTP Username is set
  - [ ] Confirm SMTP Password is set
  - [ ] Confirm Sender Email is configured
  - [ ] Note: This should already be done per your message

- [ ] **Verify Code Changes Are Merged**
  - [ ] Verify `supabase/functions/send-leave-notification/index.ts` exists
  - [ ] Verify `src/services/leaveNotificationService.ts` exists
  - [ ] Verify `src/components/LeaveRequestForm.tsx` has the import
  - [ ] Verify `src/hooks/useLeave.ts` has the import

## Deployment Steps

### Step 1: Deploy the Edge Function (Required)

```bash
# Navigate to your project root
cd "c:\Users\NYTP\OneDrive - nytp.com\Desktop\AttendEase\attendease-main\attendease-main"

# Deploy the function to Supabase
supabase functions deploy send-leave-notification
```

**Expected Output:**
```
Deploying function 'send-leave-notification'...
✓ Function 'send-leave-notification' deployed successfully
```

### Step 2: Verify Function Deployment

```bash
# List all deployed functions
supabase functions list
```

You should see:
```
send-leave-notification
```

### Step 3: Set Environment Variable (Optional but Recommended)

This sets the link in emails to your app URL:

```bash
supabase secrets set APP_URL=https://your-domain.com
```

If using localhost for testing:
```bash
supabase secrets set APP_URL=http://localhost:5173
```

### Step 4: Build and Deploy Frontend

```bash
# Install dependencies (if not already done)
npm install

# Build the frontend
npm run build

# Deploy to your hosting (e.g., Netlify, Vercel, etc.)
# Commands vary by hosting provider
```

## Testing After Deployment

### Test 1: Basic Leave Application
- [ ] Login as an Employee
- [ ] Navigate to Leave Management
- [ ] Submit a Leave Request
- [ ] Check email inbox of the reporting manager
- [ ] Verify email received with:
  - [ ] Employee name
  - [ ] Leave type
  - [ ] Start and end dates
  - [ ] Total days
  - [ ] Reason
  - [ ] Review button linking to app

### Test 2: Leave Approval
- [ ] Login as Admin/Manager
- [ ] Find the pending leave request from Test 1
- [ ] Click "Approve" with optional comment
- [ ] Check email inbox of the Employee
- [ ] Verify email received with:
  - [ ] "APPROVED" badge
  - [ ] All leave details
  - [ ] Approver name
  - [ ] Comments (if added)

### Test 3: Leave Rejection
- [ ] Login as Admin/Manager
- [ ] Find another pending leave request
- [ ] Click "Reject" with optional reason
- [ ] Check email inbox of the Employee
- [ ] Verify email received with:
  - [ ] "REJECTED" badge
  - [ ] Leave details
  - [ ] Rejector name
  - [ ] Reason (if added)

## Troubleshooting During Testing

### No emails received

**Check 1 - Function Status**
```bash
supabase functions list
```
The function should show as deployed.

**Check 2 - Browser Console**
- Open Developer Tools (F12)
- Go to Console tab
- Submit a leave request
- Look for errors mentioning "send-leave-notification"

**Check 3 - Supabase Function Logs**
```bash
# View real-time function logs
supabase functions logs send-leave-notification --follow
```

**Check 4 - Email Addresses**
- Verify the employee has a valid email in their profile
- Verify reporting manager has a valid email
- Verify admin users have valid emails
- SQL Query to check:
  ```sql
  SELECT id, email, name, role FROM profiles 
  WHERE email IS NOT NULL AND email != '';
  ```

### Wrong emails being sent

- Verify the recipient's role and reporting_manager_id
- Check the database for correct role assignments
- For Admins: Should have role = 'admin' or 'super_admin'
- For Managers: Should have employees with reporting_manager_id pointing to them

### Email formatting issues

- Different email clients render CSS differently
- Try opening in Gmail, Outlook, and Apple Mail
- The templates use inline CSS which should work in modern email clients
- If severely broken, the email content is still readable

## Rollback Procedure (If Needed)

If the emails are causing issues:

### Option 1: Disable Function Calls Only
Edit `src/services/leaveNotificationService.ts` and wrap the function call in a try-catch that silently fails:
```typescript
try {
  // existing code
} catch (error) {
  console.log('Email notification failed - continuing anyway');
  return { success: false, error: 'Disabled' };
}
```

### Option 2: Delete the Function
```bash
supabase functions delete send-leave-notification
```

The frontend will still try to call it but will fail gracefully (leave requests still work).

## Performance Notes

- Email sending is **asynchronous** and non-blocking
- Leave applications/approvals/rejections happen **immediately**
- Emails may take **1-5 seconds** to send
- Even if email fails, the leave request action completes successfully

## Configuration Files Reference

- **Function Code**: `/supabase/functions/send-leave-notification/index.ts`
- **Service Code**: `/src/services/leaveNotificationService.ts`
- **Component Update**: `/src/components/LeaveRequestForm.tsx` (line ~20 import)
- **Hook Update**: `/src/hooks/useLeave.ts` (line ~7 import)
- **Full Documentation**: `/LEAVE_EMAIL_NOTIFICATIONS_README.md`

## Support / Issues

1. **Check logs first**: Browser console + Supabase function logs
2. **Review config**: SMTP settings in Supabase Dashboard
3. **Verify deployment**: Ensure Edge Function is deployed
4. **Test with different email**: Try with your own email instead of user emails
5. **Check network**: Ensure API calls can reach Supabase

## Production Deployment Checklist

- [ ] SMTP credentials are production-ready
- [ ] APP_URL environment variable is set to production domain
- [ ] Edge Function is deployed to production project
- [ ] Tested with real email addresses
- [ ] Verified emails arrive in production email client
- [ ] Documented for team members who maintain the system
- [ ] Added to incident runbook if needed
