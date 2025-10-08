import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, get, set, update, push } from 'firebase/database';
import { auth, database } from './FirebaseConfig';

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'operador' | 'cozinheiro';
  ativo: boolean;
  ultimoAcesso?: string;
  createdAt: string;
}

export interface ConfiguracaoApp {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: 'string' | 'number' | 'boolean';
}

export class AdminService {
  static async getUsuarios(): Promise<Usuario[]> {
    try {
      const usuariosRef = ref(database, 'usuarios');
      const snapshot = await get(usuariosRef);
      const usuariosData = snapshot.val() || {};
      
      return Object.keys(usuariosData).map(id => ({
        id,
        ...usuariosData[id]
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  static async criarUsuario(dadosUsuario: {
    email: string;
    nome: string;
    role: Usuario['role'];
    senha: string;
  }): Promise<Usuario> {
    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        dadosUsuario.email,
        dadosUsuario.senha
      );

      const userId = userCredential.user.uid;

      // Salvar dados adicionais no Realtime Database
      const dadosCompletos = {
        email: dadosUsuario.email,
        nome: dadosUsuario.nome,
        role: dadosUsuario.role,
        ativo: true,
        createdAt: new Date().toISOString(),
      };

      const userRef = ref(database, `usuarios/${userId}`);
      await set(userRef, dadosCompletos);

      return {
        id: userId,
        ...dadosCompletos,
      };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  static async atualizarUsuario(userId: string, dadosAtualizacao: Partial<Usuario>): Promise<void> {
    try {
      const userRef = ref(database, `usuarios/${userId}`);
      await update(userRef, dadosAtualizacao);

      // Nota: Atualização de senha deve ser implementada com cuidado em produção
      if (dadosAtualizacao.senha) {
        console.warn('Atualização de senha deve ser implementada com Admin SDK');
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  static async alterarStatusUsuario(userId: string, ativo: boolean): Promise<void> {
    try {
      const statusRef = ref(database, `usuarios/${userId}/ativo`);
      await set(statusRef, ativo);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      throw error;
    }
  }

  static async removerUsuario(userId: string): Promise<void> {
    try {
      // Marcar como inativo ao invés de deletar
      const statusRef = ref(database, `usuarios/${userId}/ativo`);
      await set(statusRef, false);
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      throw error;
    }
  }

  static async getConfiguracoes(): Promise<ConfiguracaoApp[]> {
    try {
      const configRef = ref(database, 'configuracoes');
      const snapshot = await get(configRef);
      const configsData = snapshot.val() || {};
      
      return Object.keys(configsData).map(id => ({
        id,
        ...configsData[id]
      }));
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return [];
    }
  }

  static async exportarDados(): Promise<void> {
    try {
      const rootRef = ref(database, '/');
      const snapshot = await get(rootRef);
      const dados = snapshot.val();
      
      // Em um ambiente real, você salvaria isso em um arquivo ou enviaria para um serviço
      console.log('Dados exportados:', JSON.stringify(dados, null, 2));
      
      // Salvar timestamp da exportação
      const exportRef = ref(database, 'sistema/ultimaExportacao');
      await set(exportRef, new Date().toISOString());
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  }

  static async criarBackup(): Promise<void> {
    try {
      const rootRef = ref(database, '/');
      const snapshot = await get(rootRef);
      const dados = snapshot.val();
      
      const backupId = `backup_${Date.now()}`;
      const backupRef = ref(database, `backups/${backupId}`);
      await set(backupRef, {
        dados,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      throw error;
    }
  }

  static async limparDados(): Promise<void> {
    try {
      // ATENÇÃO: Esta operação é irreversível!
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - 6); // Dados mais antigos que 6 meses

      // Criar backup antes de limpar
      await this.criarBackup();

      // Limpar dados antigos (exemplo: pedidos, movimentos de caixa)
      const pedidosRef = ref(database, 'pedidos');
      const pedidosSnapshot = await get(pedidosRef);
      const pedidosData = pedidosSnapshot.val() || {};

      const pedidosAntigos = Object.keys(pedidosData).filter(key => {
        const pedido = pedidosData[key];
        return new Date(pedido.createdAt) < dataLimite;
      });

      // Remover pedidos antigos
      for (const pedidoId of pedidosAntigos) {
        const pedidoRef = ref(database, `pedidos/${pedidoId}`);
        await set(pedidoRef, null);
      }

      // Registrar operação de limpeza
      const limpezaRef = ref(database, 'sistema/ultimaLimpeza');
      await set(limpezaRef, new Date().toISOString());
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      throw error;
    }
  }
}