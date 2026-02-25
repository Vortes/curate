import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  isLoading: true,
  isSignedIn: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load persisted token on mount
    window.electronAPI.getToken().then((t) => {
      setToken(t);
      setIsLoading(false);
    });

    // Listen for fresh tokens from deep-link exchange
    const cleanup = window.electronAPI.onAuthToken((newToken) => {
      setToken(newToken);
      setIsLoading(false);
    });

    return cleanup;
  }, []);

  const signIn = useCallback(() => {
    window.electronAPI.signIn();
  }, []);

  const signOut = useCallback(() => {
    window.electronAPI.signOut();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, isLoading, isSignedIn: !!token, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
