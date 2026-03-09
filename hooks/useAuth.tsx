import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '@/services/AuthService';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '@/services/FirebaseConfig';
import { ref, get } from 'firebase/database';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'operador' | 'cozinheiro';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes to persist login across restarts.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userId = firebaseUser.uid;
          const userRef = ref(database, `usuarios/${userId}`);
          const snapshot = await get(userRef);
          const userData = snapshot.val();

          if (userData && userData.ativo) {
            const current = {
              id: userId,
              email: firebaseUser.email || '',
              nome: userData.nome,
              role: userData.role,
            };
            setUser(current);
            await AsyncStorage.setItem('@auth_user', JSON.stringify(current));
          } else {
            // user not found or inactive in DB — sign out locally
            setUser(null);
            await AsyncStorage.removeItem('@auth_user');
          }
        } catch (error) {
          console.error('Erro ao recuperar estado do usuário:', error);
          setUser(null);
        }
      } else {
        // Not logged in
        setUser(null);
        await AsyncStorage.removeItem('@auth_user');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkAuthState = async () => {
    // Deprecated: auth state is managed by Firebase listener now.
    try {
      const userData = await AsyncStorage.getItem('@auth_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação (fallback):', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userData = await AuthService.signIn(email, password);
      setUser(userData);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      await AsyncStorage.removeItem('@auth_user');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }

    router.replace('/signin');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};