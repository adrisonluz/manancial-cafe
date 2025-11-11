import { ref, get, set, push, update, query, orderByChild, startAt, endAt } from 'firebase/database';
import { database } from './FirebaseConfig';

export interface Cliente {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  createdAt: string;
}

export class ClienteService {
  static async getClientes(): Promise<Cliente[]> {
    try {
      const clienteRef = ref(database, 'clientes');
      const clienteQuery = query(clienteRef, orderByChild('createdAt'));
      const snapshot = await get(clienteQuery);
      const clienteData = snapshot.val() || {};
      
      return Object.keys(clienteData).map(id => ({
        id,
        ...clienteData[id]
      })).reverse(); // Mais recentes primeiro
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      return [];
    }
  }

  static async criarCliente(dadosCliente: {
      email: string;
      nome: string;
      telefone: string;
    }): Promise<string>  {
      try {  
        // Salvar dados adicionais no Realtime Database
        const dadosCompletos = {
          email: dadosCliente.email,
          nome: dadosCliente.nome,
          telefone: dadosCliente.telefone,
          ativo: true,
          createdAt: new Date().toISOString(),
        };

        const clientesRef = ref(database, 'clientes');
        const clienteRef = push(clientesRef);
        await set(clienteRef, dadosCompletos);
        
        return clienteRef.key!;
      } catch (error) {
        console.error('Erro ao criar cliente:', error);
        throw error;
      }
    }

  static async atualizarStatus(clienteId: string, novoStatus: Cliente['status']): Promise<void> {
    try {
      const statusRef = ref(database, `clientes/${clienteId}/status`);
      await set(statusRef, novoStatus);
    } catch (error) {
      console.error('Erro ao atualizar status do cliente:', error);
      throw error;
    }
  }

  static async getClientesPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Cliente[]> {
    try {
      const inicioISO = dataInicio.toISOString();
      const fimISO = dataFim.toISOString();
      
      const clientesRef = ref(database, 'clientes');
      const clientesQuery = query(
        clientesRef,
        orderByChild('createdAt'),
        startAt(inicioISO),
        endAt(fimISO)
      );
      
      const snapshot = await get(clientesQuery);
      const clientesData = snapshot.val() || {};
      
      return Object.keys(clientesData).map(id => ({
        id,
        ...clientesData[id]
      }));
    } catch (error) {
      console.error('Erro ao buscar clientes por período:', error);
      return [];
    }
  }
}