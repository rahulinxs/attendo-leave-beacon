import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Clock } from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const success = await login(email, password);
    
    if (!success) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Successfully logged in",
      });
    }
  };

  const demoCredentials = [
    { role: 'Admin', email: 'admin@company.com', password: 'admin123' },
    { role: 'Employee', email: 'employee@company.com', password: 'emp123' },
    { role: 'Employee', email: 'alice@company.com', password: 'alice123' },
    { role: 'Employee', email: 'bob@company.com', password: 'bob123' },
    { role: 'Employee', email: 'carol@company.com', password: 'carol123' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            AttendEase
          </h1>
          <p className="text-gray-600">
            Smart Attendance & Leave Management
          </p>
        </div>

        {/* Login Form */}
        <Card className="card-hover border-0 shadow-xl glass-effect">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                <Input
                  id="password"
                    type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-200 px-2 py-1 rounded"
                  >
                    EYE
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 gradient-primary text-white border-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            {/* Demo Credentials (moved here, compact) */}
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2 text-gray-700">Demo Credentials</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {demoCredentials.map((cred, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded border text-xs flex flex-col gap-0.5">
                    <span className="font-medium text-gray-800">{cred.role}</span>
                    <span>Email: {cred.email}</span>
                    <span>Password: {cred.password}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <Clock className="w-6 h-6 mx-auto text-blue-600" />
            <p className="text-xs text-gray-600">Track Time</p>
          </div>
          <div className="space-y-2">
            <Users className="w-6 h-6 mx-auto text-blue-600" />
            <p className="text-xs text-gray-600">Manage Team</p>
          </div>
          <div className="space-y-2">
            <Building2 className="w-6 h-6 mx-auto text-blue-600" />
            <p className="text-xs text-gray-600">Enterprise Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
