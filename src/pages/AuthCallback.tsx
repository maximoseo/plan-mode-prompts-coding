import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus('error');
          setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          setStatus('success');
          setTimeout(() => navigate('/', { replace: true }), 800);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
        const retry = await supabase.auth.getSession();

        if (retry.data.session) {
          setStatus('success');
          setTimeout(() => navigate('/', { replace: true }), 800);
        } else {
          setStatus('error');
          setErrorMsg('Could not establish session. Please try signing in again.');
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => navigate('/auth', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Confirming your account...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-lg text-muted-foreground">Welcome! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-lg text-destructive">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
}
