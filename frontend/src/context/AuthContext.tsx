import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

type User = {
  id: string;
  email: string;
  name?: string;
  role: string; // 'CITIZEN', 'OFFICER', 'ADMIN'
  token?: string;
};

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
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

  useEffect(() => {
    const savedUser = sessionStorage.getItem('civic_user');
    if (savedUser) {
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

  const login = (newUser: User) => {
    // Normalize role before saving
    if (newUser.role) {
      newUser.role = newUser.role.replace(/^ROLE_/, '');
    }
    setUser(newUser);
    
    // We only use sessionStorage now to fix the tab re-opening mock user bug
    // and rely on the HttpOnly cookie for real authentication.
    sessionStorage.setItem('civic_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('civic_user');
    sessionStorage.removeItem('civic_user');
    
    // Also notify backend to clear the cookie
    apiClient.post('/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
