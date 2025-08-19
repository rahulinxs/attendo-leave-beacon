import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const UpdatePassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const checkRecovery = async () => {
      try {
        // First, sign out any existing sessions to prevent conflicts
        await supabase.auth.signOut();
        
        // Get all URL parameters
        const token = searchParams.get('token') || '';
        const type = searchParams.get('type');
        const accessToken = searchParams.get('access_token') || '';
        const refreshToken = searchParams.get('refresh_token') || '';
        
        console.log('Check recovery params:', { token, type, accessToken, refreshToken });
        
        if (type !== 'recovery' || (!token && !accessToken)) {
          throw new Error('Invalid password reset link. Please use the link from your email.');
        }
        
        // If we have an access token, set the session
        if (accessToken && refreshToken) {
          console.log('Setting session with tokens');
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError || !session) {
            throw sessionError || new Error('Failed to set session');
          }
          
          console.log('Session set successfully');
          return;
        }
        
        // If we have a token, verify it
        if (token) {
          console.log('Verifying OTP token:', token);
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token,
            type: 'recovery',
            email: searchParams.get('email') || undefined,
          });
          
          if (verifyError) throw verifyError;
          
          console.log('OTP verification successful');
          return;
        }
        
      } catch (err: any) {
        console.error('Password reset error:', err);
        setError(err.message || 'Invalid or expired password reset link. Please request a new reset link.');
        toast({
          title: 'Error',
          description: err.message || 'Invalid or expired password reset link',
          variant: 'destructive',
        });
      }
    };

    checkRecovery();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting to update password...');
      
      // First, ensure we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // If no session, try to get the session from URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('Setting session from URL parameters');
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (setSessionError) throw setSessionError;
        } else {
          throw new Error('No active session. Please request a new password reset link.');
        }
      }
      
      // Now update the password
      console.log('Updating password...');
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      
      if (updateError) throw updateError;

      console.log('Password updated successfully');
      
      // Show success message
      toast({
        title: 'Password Updated',
        description: 'Your password has been updated successfully. Redirecting to login...',
      });
      
      // Sign out and redirect to login after a short delay
      await supabase.auth.signOut();
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password. Please try again or request a new reset link.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const accessToken = searchParams.get('access_token');
  const type = searchParams.get('type');
  
  if (error || !accessToken || type !== 'recovery') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error || 'Invalid password reset link. Please use the link from your email.'}
          </p>
          <p className="mt-4 text-sm text-gray-600">
            The password reset link may have expired or is invalid. 
            Please request a new password reset link from the login page.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Return to Home
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/login'}
            className="w-full"
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default UpdatePassword;
