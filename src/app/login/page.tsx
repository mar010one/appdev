'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, Mail } from 'lucide-react';
import { getCurrentUser, login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) router.replace('/');
    });
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const user = await login(email, password);
    if (!user) {
      setError('Invalid email or password.');
      setSubmitting(false);
      return;
    }
    router.replace('/');
  }

  return (
    <div className="login-shell">
      <form className="login-card glass-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="logo-icon">A</div>
          <h1>
            AppManager<span className="gold">Pro</span>
          </h1>
          <p className="login-sub">Sign in to your dashboard</p>
        </div>

        <label className="login-field">
          <span>Email</span>
          <div className="login-input-wrap">
            <Mail size={16} />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
        </label>

        <label className="login-field">
          <span>Password</span>
          <div className="login-input-wrap">
            <Lock size={16} />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-button" disabled={submitting}>
          <LogIn size={16} />
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
