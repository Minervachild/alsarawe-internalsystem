import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signOut } from '@/lib/auth';

interface PendingApprovalScreenProps {
  username: string;
}

export function PendingApprovalScreen({ username }: PendingApprovalScreenProps) {
  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-border/50 shadow-card text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <CardTitle className="font-display text-xl">Account Pending Approval</CardTitle>
            <CardDescription>
              Welcome <span className="font-medium text-foreground">{username}</span>! Your account has been created but is not yet active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              An administrator needs to activate your account before you can access the system. Please contact your admin.
            </p>
            <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
