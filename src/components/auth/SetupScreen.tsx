import { useState } from 'react';
import { Coffee, User, Mail, Lock, CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { signUp } from '@/lib/auth';

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdPasscode, setCreatedPasscode] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || passcode.length < 4) {
      toast({
        title: 'Validation Error',
        description: 'Username and passcode (4+ characters) are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(username.trim(), email.trim() || null, passcode, true);
      setCreatedPasscode(result.passcode);
      setShowSuccess(true);
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to create admin account.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPasscode = () => {
    navigator.clipboard.writeText(createdPasscode);
    toast({
      title: 'Copied!',
      description: 'Passcode copied to clipboard.',
    });
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Coffee className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Welcome to RoastFlow
          </h1>
          <p className="text-muted-foreground">
            Let's set up your B2B orders management system
          </p>
        </div>

        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Create Admin Account</CardTitle>
            <CardDescription>
              This will be the first administrator with full access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your display name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passcode" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Passcode <span className="text-muted-foreground text-xs">(4+ characters)</span>
                </Label>
                <Input
                  id="passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="Enter your secret passcode"
                  className="input-passcode"
                  minLength={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is your login credential. Keep it safe!
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Setting up...' : 'Create Admin Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <DialogTitle className="text-center font-display">Setup Complete!</DialogTitle>
            <DialogDescription className="text-center">
              Your admin account has been created successfully.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-2">Your passcode:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold tracking-widest text-center py-2 px-4 bg-background rounded border">
                  {createdPasscode}
                </code>
                <Button size="icon" variant="outline" onClick={copyPasscode}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button className="w-full" onClick={handleSuccessClose}>
              Continue to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
