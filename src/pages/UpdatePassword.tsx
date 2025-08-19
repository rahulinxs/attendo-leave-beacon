import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card";
import { Loader2, Lock } from "lucide-react";

// Branding component to match Auth.tsx
const Branding = () => (
  <div className="text-center space-y-2">
    <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4">
      <Lock className="w-8 h-8 text-white" />
    </div>
    <div>
      <span 
        className="font-bold text-[38px]" 
        style={{ color: "#1702f9", fontFamily: "Cambria, serif" }}
      >
        Attend
      </span>
      <span 
        className="font-bold text-[38px]" 
        style={{ color: "#39FF14", fontFamily: "Cambria, serif" }}
      >
        Edge
      </span>
    </div>
  </div>
);

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{text: string; type: 'success' | 'error' | 'info'}>();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      try {
        setIsLoading(true);
        setMessage('');
        
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        
        console.log('URL Params:', { accessToken, refreshToken, type });
        
        if (!accessToken || !refreshToken || type !== 'recovery') {
          throw new Error('Invalid or expired reset link. Please request a new one.');
        }
        
        // Set the session with the token
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        console.log('Session data:', data);
        
        if (sessionError) throw sessionError;
        
        // Clear the URL to prevent re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } catch (error: any) {
        console.error('Error verifying session:', error);
        // Don't show the error message to the user
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      setMessage({
        text: "Password must be at least 8 characters long.",
        type: 'error'
      });
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage({
        text: "Passwords do not match.",
        type: 'error'
      });
      return;
    }
    
    setIsLoading(true);
    setMessage(undefined);
    
    try {
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      // Show success message with icon
      setMessage({
        text: "Password updated successfully! Redirecting to login...",
        type: 'success'
      });
      
      // Sign out and redirect to login after a short delay
      await supabase.auth.signOut();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error("Error updating password:", error);
      setMessage({
        text: error.error_description || error.message || "Error updating password. Please try again.",
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="w-full">
          <CardHeader className="text-center space-y-2">
            <Branding />
            <CardTitle className="text-2xl font-semibold">
              Set New Password
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create a strong, unique password
            </p>
        </CardHeader>
        
        <form onSubmit={handleUpdatePassword}>
          <CardContent className="space-y-4">
            {message && (
              <div className={`p-3 rounded-md text-sm ${
                message.type === 'error' ? 'bg-red-100 text-red-800' : 
                message.type === 'success' ? 'bg-green-100 text-green-800' : 
                'bg-blue-100 text-blue-800'
              }`}>
                {message.text}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="h-11 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="h-11 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3 px-6 pb-6">
            <Button 
              type="submit" 
              variant="gradient"
              className="w-full h-12 text-base font-medium transition-all duration-200 hover:shadow-lg"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
            
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-medium text-primary hover:underline"
                disabled={isLoading}
              >
                Back to Sign In
              </button>
            </div>
          </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
