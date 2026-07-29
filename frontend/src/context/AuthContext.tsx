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
    const savedUser = localStorage.getItem('civic_user') || sessionStorage.getItem('civic_user');
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
    return localStorage.getItem('civic_token') || sessionStorage.getItem('civic_token') || localStorage.getItem('civic_jwt') || sessionStorage.getItem('civic_jwt');
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('civic_token') || sessionStorage.getItem('civic_token') || localStorage.getItem('civic_jwt');
    const savedUser = localStorage.getItem('civic_user') || sessionStorage.getItem('civic_user');
    
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
    localStorage.setItem('civic_token', newToken);
    localStorage.setItem('civic_jwt', newToken);
    localStorage.setItem('civic_user', JSON.stringify(newUser));
    sessionStorage.setItem('civic_token', newToken);
    sessionStorage.setItem('civic_jwt', newToken);
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
