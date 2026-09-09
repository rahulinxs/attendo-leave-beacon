# Leave Email Notification Implementation Guide

## Overview

Email notifications have been successfully implemented for leave applications in AttendEase. The system now sends emails in three scenarios:

1. **Leave Application Submitted** - When an employee applies for leave
2. **Leave Approved** - When a reporting manager/admin/super_admin approves a leave request  
3. **Leave Rejected** - When a leave request is rejected

## Architecture

### Components Created

#### 1. **Supabase Edge Function** (`supabase/functions/send-leave-notification/index.ts`)
- **Purpose**: Handles all email sending logic
- **Triggered by**: Frontend application calls via `leaveNotificationService`
- **Recipients**:
  - **On Apply**: Reporting manager + all company admins/super_admins
  - **On Approve**: Employee who submitted the request
  - **On Reject**: Employee who submitted the request

#### 2. **Leave Notification Service** (`src/services/leaveNotificationService.ts`)
- **Purpose**: Utility layer to call the Edge Function from React components
- **Methods**:
  - `sendNotification(action, leaveRequestId, company_id)` - Generic method
  - `notifyLeaveApplied()` - Notify on application submission
  - `notifyLeaveApproved()` - Notify on approval
  - `notifyLeaveRejected()` - Notify on rejection

#### 3. **Updated Components**
- **LeaveRequestForm.tsx**: Calls `leaveNotificationService.notifyLeaveApplied()` after successful submission
- **useLeave.ts hook**: Updated `approveLeaveRequest()` and `rejectLeaveRequest()` to send notifications

## Email Templates

### Template 1: Leave Application Submitted
- **Color Theme**: Blue (#007bff)
- **Recipients**: Reporting manager, Company admins
- **Content**: Employee name, leave type, dates, duration, reason
- **Action Button**: Link to Leave Management dashboard

### Template 2: Leave Approved
- **Color Theme**: Green (#28a745)
- **Recipients**: Employee
- **Content**: Leave type, dates, approved by, comments (if provided)
- **Badge**: "APPROVED" success badge

### Template 3: Leave Rejected
- **Color Theme**: Red (#dc3545)
- **Recipients**: Employee
- **Content**: Leave type, dates, rejected by, reason (if provided)
- **Badge**: "REJECTED" status badge

## How to Deploy

### Step 1: Deploy the Edge Function

1. Make sure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Navigate to your project directory and deploy the function:
   ```bash
   supabase functions deploy send-leave-notification --project-id YOUR_PROJECT_ID
   ```

3. Verify the function is deployed:
   ```bash
   supabase functions list --project-id YOUR_PROJECT_ID
   ```

### Step 2: Verify SMTP Configuration

1. Go to Supabase Dashboard → Settings → Auth
2. Check that SMTP is configured:
   - SMTP Host
   - SMTP Port
   - SMTP Username
   - SMTP Password
3. Set "Sender Email" to your configured email address

### Step 3: Update Frontend Environment

1. Ensure your `supabase/config.toml` has the Edge Function configuration
2. The frontend should automatically have access to invoke the function

### Step 4: Set APP_URL Environment Variable

In your Supabase Edge Function environment:
- Set `APP_URL` to your application URL (e.g., `https://yourdomain.com`)
- This is used in the email to link to the leave management page

To set this in Supabase Edge Functions:
```bash
supabase secrets set APP_URL=https://yourdomain.com --project-id YOUR_PROJECT_ID
```

## Testing the Implementation

### Test Scenario 1: Employee Applies for Leave

1. **Login** as an employee
2. **Navigate** to Leave Management → Submit Leave Request
3. **Fill in the form**:
   - Leave Type: Select any type
   - Start Date: Select a future date
   - End Date: Select an end date
   - Reason: Enter a test reason
4. **Submit** the request
5. **Check emails**:
   - Employee's reporting manager should receive an email
   - Company admins should receive an email
   - Email should show leave details with "Review Leave Requests" button

### Test Scenario 2: Manager Approves Leave

1. **Login** as a reporting manager or admin
2. **Navigate** to Leave Management
3. **Find** the pending leave request
4. **Click Approve** (with optional comments)
5. **Check email**:
   - Original employee should receive an approval email
   - Email should show green "APPROVED" badge
   - Should display approval reason if comments were added

### Test Scenario 3: Manager Rejects Leave

1. **Login** as a reporting manager or admin
2. **Navigate** to Leave Management
3. **Find** a pending leave request
4. **Click Reject** with reason/comments
5. **Check email**:
   - Original employee should receive a rejection email
   - Email should show red "REJECTED" badge
   - Should display rejection reason

## Email Recipients Logic

### When Employee Applies for Leave:
```
Recipients:
├── Reporting Manager (if assigned)
└── All Company Admins
    ├── admin role users
    └── super_admin role users
```

### When Leave is Approved:
```
Recipients:
└── Employee (the person who applied)
```

### When Leave is Rejected:
```
Recipients:
└── Employee (the person who applied)
```

## Error Handling

- If email sending fails, it won't block the leave application/approval/rejection
- Failures are logged to the browser console
- User won't see email failures since the primary action (apply/approve/reject) succeeded
- To debug: Check browser console → Network tab → Function invocation response

## Troubleshooting

### Issue: No emails are being sent

**Check 1**: Verify SMTP is configured in Supabase
- Go to Supabase Dashboard → Settings → Auth
- Verify SMTP host, port, username, password are set

**Check 2**: Verify the Edge Function is deployed
```bash
supabase functions list --project-id YOUR_PROJECT_ID
```

**Check 3**: Check browser console for errors
- Open Dev Tools (F12)
- Submit a leave request
- Look for error messages in Console tab

**Check 4**: Verify email addresses
- Make sure employees have valid email addresses in their profiles
- Check that reporting managers and admins have valid emails

### Issue: Wrong recipients getting emails

**Check**: Verify user roles in database
```sql
SELECT id, email, name, role, reporting_manager_id FROM profiles LIMIT 10;
```

### Issue: Email template not formatting correctly

The Edge Function uses inline CSS in the email templates. If emails appear poorly formatted:
- Check email client (some clients don't support all CSS)
- Try opening in a different email provider
- The structure is designed to work with Gmail, Outlook, and Apple Mail

## Code Locations Reference

- **Edge Function**: `/supabase/functions/send-leave-notification/index.ts`
- **Service**: `/src/services/leaveNotificationService.ts`
- **Form Updates**: `/src/components/LeaveRequestForm.tsx`
- **Hook Updates**: `/src/hooks/useLeave.ts`

## Future Enhancements

Potential features that could be added:

1. **Email Preferences**: Allow users to opt-in/out of specific notifications
2. **Digest Emails**: Send weekly/daily digest of leave requests instead of individual emails
3. **SMS Notifications**: Send SMS alerts for urgent approvals
4. **Slack Integration**: Post notifications to Slack channels
5. **Calendar Invites**: Send calendar invitations with leave dates
6. **Multiple Language Support**: Send emails in user's preferred language
7. **Email Scheduling**: Schedule approval reminder emails

## Database Schema Notes

The implementation uses these existing database columns:
- `leave_requests.id` - Leave request ID
- `leave_requests.start_date` - Leave start date
- `leave_requests.end_date` - Leave end date
- `leave_requests.total_days` - Total days of leave
- `leave_requests.reason` - Reason provided
- `leave_requests.status` - Current status
- `leave_requests.approved_by` - ID of approver
- `leave_requests.admin_comments` - Comments added during approval/rejection
- `profiles.email` - Email address
- `profiles.name` - Full name
- `profiles.role` - User role
- `profiles.reporting_manager_id` - Reporting manager reference

No database schema changes were required.

## Security Considerations

1. **RLS Policies**: Email function respects existing RLS policies
2. **Authorization**: Only admins/super_admins and reporting managers can trigger approval/rejection
3. **Email Privacy**: No sensitive information (like salary) is included in emails
4. **Audit Trail**: All leave requests and approvals are logged in the database

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check Supabase Edge Function logs
4. Verify SMTP configuration in Supabase dashboard
