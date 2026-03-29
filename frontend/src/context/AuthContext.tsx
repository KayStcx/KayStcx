import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "../api/types";
import { tokenStorage } from "../api/tokens";

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  clearAuth: () => void;
  login: (accessToken: string, refreshToken: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const rawUser = localStorage.getItem("user");
      return rawUser ? (JSON.parse(rawUser) as User) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      return;
    }

    localStorage.removeItem("user");
    tokenStorage.clearTokens();
  }, [user]);

  const setUser = (nextUser: User | null) => setUserState(nextUser);

  const clearAuth = () => {
    setUserState(null);
    tokenStorage.clearTokens();
  };

  const login = (accessToken: string, refreshToken: string, nextUser: User) => {
    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setRefreshToken(refreshToken);
    setUserState(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user && !!tokenStorage.getAccessToken(),
        isLoading,
        clearAuth,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
