import { useAuth as useClerkAuth, useClerk } from "@clerk/expo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiFetch, type AuthUser } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Bridges Clerk's session state (isSignedIn) with the app's local user
 * record. Clerk owns authentication; once a session exists, the local
 * `/auth/user` bridge (in the API server) resolves/creates the matching
 * `woundence_users` row and returns it here for role-aware UI.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isFetchingLocalUser, setIsFetchingLocalUser] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setUser(null);
      return;
    }
    setIsFetchingLocalUser(true);
    try {
      const me = await apiFetch<AuthUser>("/auth/user");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsFetchingLocalUser(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      refresh();
    }
  }, [isLoaded, isSignedIn, refresh]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, [signOut]);

  const isLoading =
    !isLoaded || (!!isSignedIn && isFetchingLocalUser && !user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!isSignedIn && !!user,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
