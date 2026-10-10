import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  clearStoredSession,
  restoreSession,
  signInRequest,
  signOutRequest,
  signUpRequest,
  updateProfileRequest,
  type ApiSession,
  type ApiUser,
} from '@/lib/api';
import type { Profile, UserType } from '@/lib/types';

interface AuthContextValue {
  session: ApiSession | null;
  user: ApiUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userType: UserType, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ApiSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    restoreSession().then(({ session: restoredSession, profile: restoredProfile }) => {
      if (!active) return;
      setSession(restoredSession);
      setProfile(restoredProfile);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const signUp: AuthContextValue['signUp'] = async (email, password, userType, fullName) => {
    try {
      const result = await signUpRequest(email, password, userType, fullName);
      setSession(result.session);
      setProfile(result.profile);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign-up failed. Please try again.' };
    }
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    try {
      const result = await signInRequest(email, password);
      setSession(result.session);
      setProfile(result.profile);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign-in failed. Please try again.' };
    }
  };

  const signOut = async () => {
    await signOutRequest();
    clearStoredSession();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    const restored = await restoreSession();
    setSession(restored.session);
    setProfile(restored.profile);
  };

  const updateProfile: AuthContextValue['updateProfile'] = async (updates) => {
    if (!session?.user.id) return { error: 'You must be signed in to update your profile.' };
    try {
      const updatedProfile = await updateProfileRequest(session.user.id, updates);
      setProfile(updatedProfile);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Profile update failed. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
