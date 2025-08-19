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
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tenant, setTenant] = useState("");
  const [branding, setBranding] = useState(defaultBranding);
  const [sessionSet, setSessionSet] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      // Get parameters from both query string and hash fragment
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Check for token in both places
      let token = params.get('token') || hashParams.get('access_token');
      const type = params.get('type');
      const tenantId = params.get('tenant') || "attendedge";
      
      // If we got a token from the hash, we might also have a refresh token
      const refreshToken = hashParams.get('refresh_token');
      setToken(token || '');
      setRefreshToken(refreshToken || '');
      
      setTenant(tenantId);

      // Fetch branding from Supabase companies table
      async function fetchBranding() {
        const { data, error } = await supabase
          .from('companies')
          .select('name, domain')
          .or(`domain.eq.${tenantId},name.ilike.%${tenantId}%`)
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
    
    if (!password) {
      setMessage("Please enter a new password.");
      return;
    }
    
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }
    
    try {
      // First try to update the password directly
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        // If direct update fails, try setting session again
        if (token && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken
          });
          
          if (sessionError) throw sessionError;
          
          // Try updating password again after setting session
          const { error: retryError } = await supabase.auth.updateUser({
            password,
          });
          
          if (retryError) throw retryError;
        } else {
          throw updateError;
        }
      }
      
      setMessage("Password updated successfully! You can now log in with your new password.");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
      
    } catch (error: any) {
      console.error('Password update error:', error);
      setMessage(error.message || 'Failed to update password. Please try again.');
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
      }}
    >
      <img src={branding.logo} alt={branding.name} style={{ maxWidth: 180, marginBottom: 24 }} />
      <h2 style={{ color: branding.primaryColor }}>{branding.name}</h2>
      <p style={{ marginBottom: 32 }}>{branding.slogan}</p>
      <form onSubmit={handleReset} style={{ width: 320 }}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 16, padding: 8 }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            background: branding.primaryColor,
            color: "#fff",
            padding: 12,
            border: "none",
            borderRadius: 4,
          }}
        >
          Reset Password
        </button>
      </form>
      {message && <div style={{ marginTop: 16 }}>{message}</div>}
    </div>
  );
} 