import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  email: string;
  name?: string;
  role: string; // 'CITIZEN', 'OFFICER', 'ADMIN'
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('civic_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role) {
          parsed.role = parsed.role.replace(/^ROLE_/, '');
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('civic_token');
  });

  useEffect(() => {
    const savedToken = sessionStorage.getItem('civic_token');
    const savedUser = sessionStorage.getItem('civic_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role) {
          parsed.role = parsed.role.replace(/^ROLE_/, '');
        }
        setUser(parsed);
      } catch (e) {
        console.error('Error parsing stored user credentials', e);
      }
    }
  }, []);

  const login = (newUser: User, newToken: string) => {
    // Normalize role before saving
    if (newUser.role) {
      newUser.role = newUser.role.replace(/^ROLE_/, '');
    }
    setUser(newUser);
    setToken(newToken);
    
    // We only use sessionStorage now to fix the tab re-opening mock user bug
    // and rely on the HttpOnly cookie for real authentication.
    sessionStorage.setItem('civic_token', newToken);
    sessionStorage.setItem('civic_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('civic_token');
    localStorage.removeItem('civic_jwt');
    localStorage.removeItem('civic_user');
    sessionStorage.removeItem('civic_token');
    sessionStorage.removeItem('civic_jwt');
    sessionStorage.removeItem('civic_user');
    
    // Also notify backend to clear the cookie
    import('../api/client').then(({ apiClient }) => {
      apiClient.post('/auth/logout').catch(() => {});
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
