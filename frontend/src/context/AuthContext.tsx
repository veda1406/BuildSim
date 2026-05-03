import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isValidating: boolean;
  sessionExpired: boolean;
  login: (token: string, userData: User) => void;
  logout: (expired?: boolean) => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isValidating: true,
  sessionExpired: false,
  login: () => {},
  logout: () => {},
  clearSessionExpired: () => {},
});

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [isValidating, setIsValidating] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (token) {
      // Validate token on load
      fetch("http://127.0.0.1:8000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Token invalid");
          const data = await res.json();
          setUser(data);
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setSessionExpired(false);
    setIsValidating(false);
  };

  const logout = (expired = false) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    if (expired) setSessionExpired(true);
  };

  const clearSessionExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider value={{ token, user, isValidating, sessionExpired, login, logout, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
