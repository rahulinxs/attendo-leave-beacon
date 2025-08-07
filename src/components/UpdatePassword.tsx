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
      const accessToken = searchParams.get('access_token');
      const type = searchParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        try {
          // First, sign out any existing sessions to prevent conflicts
          await supabase.auth.signOut();
          
          // Try to verify the OTP token
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: accessToken,
            type: 'recovery',
          });
          
          if (error) {
            console.error('OTP verification error:', error);
            throw error;
          }
          
          console.log('OTP verification successful:', data);
          
          // If we get here, the token is valid
          toast({
            title: 'Set a new password',
            description: 'Please enter and confirm your new password.',
          });
          
        } catch (err: any) {
          console.error('Password reset error:', err);
          setError('Invalid or expired password reset link. Please request a new reset link.');
          toast({
            title: 'Error',
            description: err.message || 'Invalid or expired password reset link',
            variant: 'destructive',
          });
        }
      } else {
        setError('Invalid password reset link. Please use the link from your email.');
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
      // First try to update the password directly
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        // If direct update fails, try to sign in with the recovery token first
        const accessToken = searchParams.get('access_token');
        if (accessToken) {
          // Sign in with the recovery token
          const { error: signInError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
          });
          
          if (signInError) throw signInError;
          
          // Now try updating the password again
          const { error: secondUpdateError } = await supabase.auth.updateUser({
            password,
          });
          
          if (secondUpdateError) throw secondUpdateError;
        } else {
          throw updateError;
        }
      }

      toast({
        title: 'Password Updated',
        description: 'Your password has been updated successfully.',
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
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
