import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Default branding
const defaultBranding = {
  name: "AttendEdge",
  logo: "/attendedge-logo.png",
  primaryColor: "#1976D2",
  background: "#E3F2FD",
  slogan: "Smart Attendance & Leave Management",
};

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [tenant, setTenant] = useState("");
  const [branding, setBranding] = useState(defaultBranding);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetRequest, setIsResetRequest] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        setIsLoading(true);
        
        // Get parameters from both query string and hash fragment
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for token and type in both places
        const token = hashParams.get('access_token') || params.get('access_token');
        const type = hashParams.get('type') || params.get('type');
        const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');
        const email = params.get('email') || '';
        
        // Set email if available
        if (email) {
          setEmail(email);
        }
        
        // If we have a token and type, it's a password reset link
        if (token && type === 'recovery' && refreshToken) {
          console.log('Processing password reset link');
          
          try {
            // Try to set the session with the token
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: refreshToken
            });
            
            if (sessionError) throw sessionError;
            
            console.log('Session set successfully, showing password reset form');
            setIsResetRequest(false);
            
            // Clean up the URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
          } catch (error) {
            console.error('Error setting session:', error);
            throw new Error('Invalid or expired reset link. Please request a new one.');
          }
        } else {
          // No token, show the initial reset password request form
          setIsResetRequest(true);
        }
      } catch (error: any) {
        console.error('Error in verifyToken:', error);
        setMessage(error.message || 'Invalid or expired reset link. Please request a new one.');
      } finally {
        setIsLoading(false);
      }

      // Fetch branding from Supabase companies table
      async function fetchBranding() {
        const { data, error } = await supabase
          .from('companies')
          .select('name, domain')
          .or(`domain.eq.${tenant},name.ilike.%${tenant}%`)
          .maybeSingle();
        if (!error && data) {
          setBranding({
            ...defaultBranding,
            name: data.name || defaultBranding.name,
          });
        } else {
          setBranding(defaultBranding);
        }
      }
      await fetchBranding();

      if (type === 'recovery') {
        // Check if there's an error in the URL (like expired token)
        const errorParam = params.get('error') || hashParams.get('error');
        if (errorParam) {
          const errorCode = params.get('error_code') || hashParams.get('error_code');
          const errorDesc = params.get('error_description') || hashParams.get('error_description');
          
          if (errorCode === 'otp_expired') {
            throw new Error('The password reset link has expired. Please request a new one.');
          }
          throw new Error(errorDesc || 'An error occurred during password reset');
        }

        if (!token) {
          throw new Error('Invalid password reset link. Missing token.');
        }

        try {
          // If we have a refresh token, set the session first
          if (refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: refreshToken
            });
            if (sessionError) throw sessionError;
          }
          
          // Verify the OTP token
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          
          if (error) {
            console.error('OTP verification error:', error);
            if (error.status === 400) {
              throw new Error('The password reset link is invalid or has expired.');
            }
            throw error;
          }
          
          // If we get here, the token is valid and session is set
          setSessionSet(true);
          setMessage('Please enter your new password');
          
        } catch (error) {
          console.error('Password reset error:', error);
          setMessage('Invalid or expired password reset link. Please request a new one.');
        }
      } else {
        setMessage('Invalid password reset link. Please use the link from your email.');
      }
    };

    verifyToken();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isResetRequest) {
      // Handle initial password reset request
      if (!email) {
        setMessage("Please enter your email address.");
        return;
      }
      
      setIsLoading(true);
      setMessage('');
      
      try {
        const redirectUrl = `${window.location.origin}/reset-password`;
        console.log('Sending password reset email to:', email);
        console.log('Redirect URL:', redirectUrl);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        
        if (error) throw error;
        
        setMessage('Password reset link sent! Please check your email.');
      } catch (error: any) {
        console.error('Error sending reset email:', error);
        setMessage(error.message || 'Failed to send reset email. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle password update
      if (password.length < 8) {
        setMessage("Password must be at least 8 characters long.");
        return;
      }
      
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }
      
      setIsLoading(true);
      setMessage('');
      
      try {
        // Check if we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Your session has expired. Please request a new password reset link.');
        }
        
        // Update the password
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) throw updateError;

        // Show success message
        setMessage("Password updated successfully! Redirecting to login...");
        
        // Sign out and redirect to login after a short delay
        await supabase.auth.signOut();
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        
      } catch (error: any) {
        console.error("Error updating password:", error);
        setMessage(error.error_description || error.message || "Error updating password. The link may have expired.");
        
        // Clear the URL hash to prevent re-triggering the reset flow
        window.history.replaceState({}, document.title, window.location.pathname);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        background: branding.background,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img
              src={branding.logo}
              alt={`${branding.name} Logo`}
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-center text-2xl">
            {isResetRequest ? 'Reset Password' : 'Set New Password'}
          </CardTitle>
          <p className="text-center text-muted-foreground">
            {branding.slogan}
          </p>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            {message && (
              <div className={`p-3 rounded-md ${
                message.toLowerCase().includes('success') || message.includes('sent') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            {isResetRequest ? (
              // Initial reset password request form
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  We'll send you a link to reset your password.
                </p>
              </div>
            ) : (
              // Password update form
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading 
                ? (isResetRequest ? 'Sending...' : 'Updating...') 
                : (isResetRequest ? 'Send Reset Link' : 'Update Password')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/login"}
              disabled={isLoading}
            >
              Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;