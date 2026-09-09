# Test Email Function - Quick Setup

## What This Does

Simple edge function that sends you a test email when you "clock in" or "clock out". No database needed, no complex logic - just tests if Gmail SMTP works.

## Deploy It

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **Create New Function**
3. Name: `test-email`
4. Copy entire content from: `/supabase/functions/test-email/index.ts`
5. Paste & **Deploy**

## Test It

### Using Browser Console

```javascript
// Open your app, go to browser DevTools → Console, paste:

const { data, error } = await supabase.functions.invoke('test-email', {
  body: {
    action: 'clock-in',
    recipient_email: 'your-email@gmail.com'  // Change this!
  }
});

console.log(data, error);
```

### Using cURL

```bash
curl -X POST https://pntrnltwvclbdmsnxlpy.supabase.co/functions/v1/test-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "clock-in",
    "recipient_email": "your-email@gmail.com"
  }'
```

### Using Postman

1. **Method:** POST
2. **URL:** `https://pntrnltwvclbdmsnxlpy.supabase.co/functions/v1/test-email`
3. **Headers:**
   - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
   - `Content-Type: application/json`
4. **Body (raw JSON):**
   ```json
   {
     "action": "clock-in",
     "recipient_email": "your-email@gmail.com"
   }
   ```
5. Click **Send**

## Expected Response

### Success (200)
```json
{
  "success": true,
  "message": "Email sent successfully!",
  "details": {
    "to": "your-email@gmail.com",
    "from": "your-email@gmail.com",
    "subject": "⏰ Clock-In Confirmation",
    "action": "clock-in",
    "timestamp": "10:30:45 AM"
  }
}
```

### Error (500)
```json
{
  "error": "Failed to send email",
  "message": "[specific error from Gmail]",
  "troubleshooting": [
    "1. Check GMAIL_EMAIL and GMAIL_PASSWORD are set in Supabase secrets",
    "2. If using app password, make sure it's 16 characters",
    "3. Check Gmail 2FA is enabled and app password was generated",
    "4. Verify recipient email address is valid"
  ]
}
```

## What to Look For

✅ **Success:** Email arrives in your inbox within 1 minute
✅ **See timestamp:** Email shows exact time sent  
✅ **Function logs:** Edge Functions → test-email → View Logs → Should show ✅ markers

❌ **No email?** Check spam folder
❌ **Auth error?** Verify GMAIL_EMAIL and GMAIL_PASSWORD in secrets
❌ **Connection error?** Network/firewall issue blocking Gmail SMTP

## If It Works

Great! Now you know:
- ✅ Gmail credentials are correct
- ✅ Supabase can reach Gmail SMTP
- ✅ Edge Functions are deployed properly
- ✅ Can safely deploy the full `send-leave-notification` function

## If It Fails

1. **Check logs:** Edge Functions → test-email → View Logs
2. **Verify secrets:** Settings → Edge Functions → Check GMAIL_EMAIL & GMAIL_PASSWORD exist
3. **Test Gmail:** Go to https://accounts.google.com/signin and verify login works
4. **Check app password:** If 2FA enabled, verify 16-char password (no spaces)

---

**Actions:**
- `clock-in` → sends Clock-In Confirmation
- `clock-out` → sends Clock-Out Confirmation
- Change `recipient_email` to any valid email address
