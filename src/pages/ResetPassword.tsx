import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const [message, setMessage] = useState("");
  const [branding, setBranding] = useState(defaultBranding);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Check if we have a token in the URL (handled by the UpdatePassword page)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    // If we have a recovery token, redirect to the UpdatePassword page
    if (type === 'recovery' && accessToken && refreshToken) {
      navigate(`/update-password?access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`);
    }
  }, [navigate]);
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
    
    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      // Redirect to the reset-password page (Supabase will append the token)
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
            Reset Password
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
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