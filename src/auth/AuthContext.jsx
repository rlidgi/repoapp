import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';

const AuthContext = createContext(null);

function mapFirebaseUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || '',
    email: firebaseUser.email || '',
    picture: firebaseUser.photoURL || '',
    emailVerified: !!firebaseUser.emailVerified,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlanState] = useState('free'); // 'free' | 'pro100' | 'pro200'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const mapped = mapFirebaseUser(firebaseUser);
      setUser(mapped);
      if (mapped?.id) {
        try {
          const saved = localStorage.getItem(`plan_${mapped.id}`);
          if (saved) setPlanState(saved);
          else setPlanState('free');
        } catch {
          setPlanState('free');
        }
      } else {
        setPlanState('free');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name && cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
    if (cred.user) {
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // ignore
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async () => {
    const current = auth.currentUser;
    if (current) {
      await sendEmailVerification(current);
    }
  };

  const setPlan = (nextPlan) => {
    setPlanState(nextPlan);
    if (user?.id) {
      try {
        localStorage.setItem(`plan_${user.id}`, nextPlan);
      } catch {
        // ignore
      }
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      plan,
      setPlan,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      resendVerificationEmail,
      signOut,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

