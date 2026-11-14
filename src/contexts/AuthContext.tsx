import { useCallback, useContext, createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  auth,
  createCalendarConsentProvider,
  ensureUserProfileInFirestore,
  googleAuthProvider,
} from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  googleAccessToken: string | null;
  signInWithGoogle: () => Promise<User | null>;
  connectGoogleCalendar: () => Promise<string | null>;
  clearGoogleAccessToken: () => void;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Keep Firebase & Google OAuth tokens strictly in memory, never in localStorage
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          tokenRef.current = await nextUser.getIdToken();
          await ensureUserProfileInFirestore({
            uid: nextUser.uid,
            email: nextUser.email ?? `${nextUser.uid}@zest.local`,
            displayName: nextUser.displayName,
          });
        } catch (err) {
          console.error('Auth profile initialization error:', err);
        }
      } else {
        tokenRef.current = null;
        setGoogleAccessToken(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      tokenRef.current = await result.user.getIdToken();
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
      await ensureUserProfileInFirestore({
        uid: result.user.uid,
        email: result.user.email ?? `${result.user.uid}@zest.local`,
        displayName: result.user.displayName,
      });
      return result.user;
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Google Sign-In did not complete.';
      setAuthError(msg);
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const connectGoogleCalendar = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, createCalendarConsentProvider());
      tokenRef.current = await result.user.getIdToken();
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const oauthToken = credential?.accessToken ?? null;
      if (oauthToken) {
        setGoogleAccessToken(oauthToken);
      }
      await ensureUserProfileInFirestore({
        uid: result.user.uid,
        email: result.user.email ?? `${result.user.uid}@zest.local`,
        displayName: result.user.displayName,
      });
      return oauthToken;
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Google Calendar authorization did not complete.';
      setAuthError(msg);
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const clearGoogleAccessToken = useCallback(() => {
    setGoogleAccessToken(null);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    tokenRef.current = null;
    setGoogleAccessToken(null);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    const freshToken = await auth.currentUser.getIdToken();
    tokenRef.current = freshToken;
    return freshToken;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        googleAccessToken,
        signInWithGoogle,
        connectGoogleCalendar,
        clearGoogleAccessToken,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
