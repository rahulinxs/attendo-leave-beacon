import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Clock, UserPlus, LogIn } from 'lucide-react';

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    name: '', 
    role: 'employee' as 'employee' | 'admin' 
  });
  const { login, signup, isLoading } = useAuth();
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const result = await login(loginData.email, loginData.password);
    
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid email or password",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Successfully logged in",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.email || !signupData.password || !signupData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    const result = await signup(signupData.email, signupData.password, signupData.name, signupData.role);
    
    if (!result.success) {
      toast({
        title: "Signup Failed",
        description: result.error || "Failed to create account",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account",
      });
      // Reset form
      setSignupData({ email: '', password: '', confirmPassword: '', name: '', role: 'employee' });
    }
  };

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

        {/* Demo Credentials */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800">Demo Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <strong className="text-blue-900">Super Admin:</strong>
              <div className="text-blue-700">Email: rahul@nytp.com</div>
            </div>
            <div>
              <strong className="text-blue-900">Admin:</strong>
              <div className="text-blue-700">Email: admin@company.com</div>
            </div>
            <div>
              <strong className="text-blue-900">Employee:</strong>
              <div className="text-blue-700">Email: employee@company.com</div>
            </div>
            <div className="text-blue-600 mt-2">Password: password123</div>
          </CardContent>
        </Card>

        {/* Auth Forms */}
        <Card className="card-hover border-0 shadow-xl glass-effect">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@company.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="show-login-password"
                      type="checkbox"
                      checked={showLoginPassword}
                      onChange={() => setShowLoginPassword(v => !v)}
                    />
                    <label htmlFor="show-login-password" className="text-sm text-gray-700 select-none cursor-pointer">Show Password</label>
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
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupData.name}
                      onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@company.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <Select value={signupData.role} onValueChange={(value: 'employee' | 'admin') => 
                      setSignupData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="show-signup-password"
                      type="checkbox"
                      checked={showSignupPassword}
                      onChange={() => setShowSignupPassword(v => !v)}
                    />
                    <label htmlFor="show-signup-password" className="text-sm text-gray-700 select-none cursor-pointer">Show Password</label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 gradient-primary text-white border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
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

export default Auth;
