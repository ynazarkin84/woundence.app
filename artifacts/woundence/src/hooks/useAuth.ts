import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import type { User } from "@/types/schema";

export function useAuth() {
  const { isSignedIn, isLoaded } = useUser();

  const { data: user, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isSignedIn === true,
    retry: false,
  });

  return {
    user,
    isLoading: !isLoaded || (isSignedIn === true && isUserLoading),
    isAuthenticated: isSignedIn === true && !!user,
  };
}
