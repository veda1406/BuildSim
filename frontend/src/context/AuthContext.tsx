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
  connectionError: boolean;
  sessionExpired: boolean;
  login: (token: string, userData: User) => void;
  logout: (expired?: boolean) => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isValidating: true,
  connectionError: false,
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
  const [connectionError, setConnectionError] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      return;
    }

    console.log("[Auth] Validating token...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch("http://127.0.0.1:8000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Token invalid");
        const data = await res.json();
        setUser(data);
        setConnectionError(false);
        console.log("[Auth] Token validated successfully.");
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error("[Auth] Validation error:", err);
        if (err.name === 'AbortError' || err.message === 'Failed to fetch') {
          setConnectionError(true);
        } else {
          logout();
        }
      })
      .finally(() => {
        setIsValidating(false);
      });
      
    return () => clearTimeout(timeoutId);
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
    <AuthContext.Provider value={{ token, user, isValidating, connectionError, sessionExpired, login, logout, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
