import { ref, get, set, push, update, query, orderByChild, startAt, endAt } from 'firebase/database';
import { database } from './FirebaseConfig';
import { EstoqueService } from './EstoqueService';

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
}

export interface ItemPedido {
  produto: Produto;
  quantidade: number;
  observacoes?: string;
}

export interface Pedido {
  id: string;
  numero: number;
  itens: ItemPedido[];
  total: number;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue';
  cliente?: string;
  createdAt: string;
  criadoPor: string;
}

export class PedidoService {
  static async getPedidos(): Promise<Pedido[]> {
    try {
      const pedidosRef = ref(database, 'pedidos');
      const pedidosQuery = query(pedidosRef, orderByChild('createdAt'));
      const snapshot = await get(pedidosQuery);
      const pedidosData = snapshot.val() || {};
      
      return Object.keys(pedidosData).map(id => ({
        id,
        ...pedidosData[id]
      })).reverse(); // Mais recentes primeiro
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      return [];
    }
  }

  static async criarPedido(pedidoData: Omit<Pedido, 'id'>): Promise<string> {
    try {
      const pedidosRef = ref(database, 'pedidos');
      const pedidoRef = push(pedidosRef);
      await set(pedidoRef, pedidoData);
      
      // Atualizar estoque
      for (const item of pedidoData.itens) {
        await EstoqueService.atualizarEstoque(item.produto.id, -item.quantidade);
      }
      
      return pedidoRef.key!;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  static async atualizarStatus(pedidoId: string, novoStatus: Pedido['status']): Promise<void> {
    try {
      const statusRef = ref(database, `pedidos/${pedidoId}/status`);
      await set(statusRef, novoStatus);
      
      if (novoStatus === 'entregue') {
        const entregueRef = ref(database, `pedidos/${pedidoId}/entregueEm`);
        await set(entregueRef, new Date().toISOString());
      }
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      throw error;
    }
  }

  static async getPedidosPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Pedido[]> {
    try {
      const inicioISO = dataInicio.toISOString();
      const fimISO = dataFim.toISOString();
      
      const pedidosRef = ref(database, 'pedidos');
      const pedidosQuery = query(
        pedidosRef,
        orderByChild('createdAt'),
        startAt(inicioISO),
        endAt(fimISO)
      );
      
      const snapshot = await get(pedidosQuery);
      const pedidosData = snapshot.val() || {};
      
      return Object.keys(pedidosData).map(id => ({
        id,
        ...pedidosData[id]
      }));
    } catch (error) {
      console.error('Erro ao buscar pedidos por período:', error);
      return [];
    }
  }
}