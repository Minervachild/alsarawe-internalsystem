import { useState } from 'react';
import { Coffee, Lock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signIn } from '@/lib/auth';

interface LoginScreenProps {
  onLogin: () => void;
  onSignupClick: () => void;
}

export function LoginScreen({ onLogin, onSignupClick }: LoginScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passcode.length < 4) {
      toast({
        title: 'Invalid Passcode',
        description: 'Passcode must be at least 4 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await signIn(passcode);
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in.',
      });
      onLogin();
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid passcode. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Coffee className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            RoastFlow
          </h1>
          <p className="text-muted-foreground">
            B2B Orders Management System
          </p>
        </div>

        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Welcome Back</CardTitle>
            <CardDescription>
              Enter your passcode to access the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passcode" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Passcode
                </Label>
                <Input
                  id="passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="Enter your passcode"
                  className="input-passcode"
                  autoFocus
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={onSignupClick}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
