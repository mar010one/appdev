export type UserRole = 'admin' | 'user';

export type AuthUser = {
  email: string;
  role: UserRole;
};

type Credential = {
  email: string;
  password: string;
  role: UserRole;
};

const USERS: Credential[] = [
  { email: 'admin@gmail.com', password: 'marwan001', role: 'admin' },
  { email: 'user@gmail.com', password: 'ilyass001', role: 'user' },
];

const STORAGE_KEY = 'app:auth-user';

export function login(email: string, password: string): AuthUser | null {
  const match = USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
  );
  if (!match) return null;
  const user: AuthUser = { email: match.email, role: match.role };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function canAccess(user: AuthUser | null, pathname: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (pathname.startsWith('/expenses')) return false;
  return true;
}
