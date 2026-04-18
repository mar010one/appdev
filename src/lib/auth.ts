import { createClient } from '@/lib/supabase/client';

export type UserRole = 'admin' | 'user';

export type AuthUser = {
  email: string;
  role: UserRole;
};

export async function login(email: string, password: string): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  const role = (data.user.user_metadata?.role as UserRole) ?? 'user';
  return { email: data.user.email!, role };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = (user.user_metadata?.role as UserRole) ?? 'user';
  return { email: user.email!, role };
}

export function canAccess(user: AuthUser | null, pathname: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (pathname.startsWith('/expenses') || pathname.startsWith('/nitch')) return false;
  return true;
}
