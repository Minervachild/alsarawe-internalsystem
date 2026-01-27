import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetupScreen } from '@/components/auth/SetupScreen';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { SignupScreen } from '@/components/auth/SignupScreen';
import { useAuth } from '@/contexts/AuthContext';
import { checkSystemInitialized } from '@/lib/auth';

type AuthView = 'loading' | 'setup' | 'login' | 'signup';

const Index = () => {
  const [view, setView] = useState<AuthView>('loading');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      navigate('/dashboard');
      return;
    }

    // Check if system is initialized
    checkSystemInitialized().then((initialized) => {
      setView(initialized ? 'login' : 'setup');
    });
  }, [user, isLoading, navigate]);

  if (view === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (view === 'setup') {
    return <SetupScreen onComplete={() => navigate('/dashboard')} />;
  }

  if (view === 'signup') {
    return (
      <SignupScreen 
        onSignup={() => navigate('/dashboard')} 
        onBackToLogin={() => setView('login')} 
      />
    );
  }

  return (
    <LoginScreen 
      onLogin={() => navigate('/dashboard')} 
      onSignupClick={() => setView('signup')} 
    />
  );
};

export default Index;
