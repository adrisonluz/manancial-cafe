import { signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from './FirebaseConfig';

export interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'operador' | 'cozinheiro';
}

export class AuthService {
  static async signIn(email: string, password: string): Promise<User> {
    
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Buscar dados adicionais do usuário no Realtime Database
      const userRef = ref(database, `usuarios/${userId}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();

      console.log(userSnapshot, userData);
    try {
      if (!userData || !userData.ativo) {
        throw new Error('Usuário não encontrado ou inativo');
      }

      // Atualizar último acesso
      const ultimoAcessoRef = ref(database, `usuarios/${userId}/ultimoAcesso`);
      await set(ultimoAcessoRef, new Date().toISOString());

      return {
        id: userId,
        email: userCredential.user.email || '',
        nome: userData.nome,
        role: userData.role,
      };
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  static getCurrentUser(): User | null {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    return {
      id: currentUser.uid,
      email: currentUser.email || '',
      nome: '', // Será preenchido pelo contexto
      role: 'operador', // Será preenchido pelo contexto
    };
  }

  static async resetPassword(email: string): Promise<void> {
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      throw error;
    }
  }
}