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
    // Get tenant from query param
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get("tenant") || "attendedge";
    setTenant(tenantId);

    // Fetch branding from Supabase companies table (only name/domain for now)
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
    fetchBranding();

    // Get access_token and refresh_token from hash
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace("#", ""));
    const accessToken = hashParams.get("access_token") || "";
    const refreshToken = hashParams.get("refresh_token") || "";
    setToken(accessToken);
    setRefreshToken(refreshToken);

    // Set session if both tokens are present
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setMessage("Failed to authenticate session: " + error.message);
          else setSessionSet(true);
        });
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionSet) {
      setMessage("Session not established. Please use the link from your email.");
      return;
    }
    if (!password) {
      setMessage("Please enter a new password.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else setMessage("Password updated! You can now log in.");
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