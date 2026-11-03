import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './config';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileCity: (city: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'convidado@vamo.ai',
              displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Explorador vamo.AI' : 'Usuário'),
              photoURL: currentUser.photoURL || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
              city: 'São Paulo',
              defaultVibe: 'gastronomia',
              favoriteCategories: ['restaurantes', 'bares'],
            };
            await setDoc(userDocRef, initialProfile);
            setProfile(initialProfile);
          }
        } catch (error) {
          console.warn('Could not sync user profile to firestore, using local profile fallback', error);
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || 'convidado@vamo.ai',
            displayName: currentUser.displayName || 'Explorador vamo.AI',
            photoURL: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            city: 'São Paulo',
            defaultVibe: 'gastronomia',
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      // Fallback to anonymous if popup blocked or configured for dev
      await signInAnonymously(auth);
    }
  };

  const signInGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Guest Sign In Error:', error);
      // Local fallback
      setUser({
        uid: 'guest-' + Date.now(),
        email: 'explorador@vamo.ai',
        displayName: 'Explorador VIP',
        isAnonymous: true,
      } as unknown as User);
      setProfile({
        uid: 'guest-' + Date.now(),
        email: 'explorador@vamo.ai',
        displayName: 'Explorador VIP',
        city: 'São Paulo',
        defaultVibe: 'gastronomia',
      });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  const updateProfileCity = async (city: string) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { city }, { merge: true });
      setProfile(prev => prev ? { ...prev, city } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signInWithGoogle,
      signInGuest,
      logout,
      updateProfileCity,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
