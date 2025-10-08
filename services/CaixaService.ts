import { ref, get, set, push, update, query, orderByChild, equalTo, limitToLast, startAt, endAt } from 'firebase/database';
import { database } from './FirebaseConfig';

export interface MovimentoCaixa {
  id: string;
  sessaoId: string;
  tipo: 'entrada' | 'saida';
  categoria: 'venda' | 'suprimento' | 'retirada' | 'despesa' | 'outros';
  valor: number;
  descricao: string;
  createdAt: string;
  criadoPor: string;
}

export interface SessaoCaixa {
  id: string;
  dataAbertura: string;
  dataFechamento?: string;
  valorAbertura: number;
  valorFechamento?: number;
  totalVendas: number;
  totalEntradas: number;
  totalSaidas: number;
  status: 'aberto' | 'fechado';
  operadorAbertura: string;
  operadorFechamento?: string;
}

export class CaixaService {
  static async getSessaoAtual(): Promise<SessaoCaixa | null> {
    try {
      const sessoesRef = ref(database, 'sessoesCaixa');
      const sessaoQuery = query(
        sessoesRef,
        orderByChild('status'),
        equalTo('aberto'),
        limitToLast(1)
      );
      
      const snapshot = await get(sessaoQuery);
      const sessoesData = snapshot.val();
      
      if (!sessoesData) return null;
      
      const sessaoId = Object.keys(sessoesData)[0];
      return {
        id: sessaoId,
        ...sessoesData[sessaoId]
      };
    } catch (error) {
      console.error('Erro ao buscar sessão atual:', error);
      return null;
    }
  }

  static async abrirCaixa(valorAbertura: number, operador: string): Promise<SessaoCaixa> {
    try {
      // Verificar se não há caixa aberto
      const sessaoAtual = await this.getSessaoAtual();
      if (sessaoAtual) {
        throw new Error('Já existe um caixa aberto');
      }

      const sessoesRef = ref(database, 'sessoesCaixa');
      const sessaoRef = push(sessoesRef);
      const novaSessao: Omit<SessaoCaixa, 'id'> = {
        dataAbertura: new Date().toISOString(),
        valorAbertura,
        totalVendas: 0,
        totalEntradas: 0,
        totalSaidas: 0,
        status: 'aberto',
        operadorAbertura: operador,
      };

      await set(sessaoRef, novaSessao);
      
      return {
        id: sessaoRef.key!,
        ...novaSessao
      };
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      throw error;
    }
  }

  static async fecharCaixa(sessaoId: string, valorFechamento: number, operador: string): Promise<void> {
    try {
      const sessaoRef = ref(database, `sessoesCaixa/${sessaoId}`);
      const updateData = {
        dataFechamento: new Date().toISOString(),
        valorFechamento,
        status: 'fechado',
        operadorFechamento: operador,
      };

      await update(sessaoRef, updateData);
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      throw error;
    }
  }

  static async getMovimentos(sessaoId: string): Promise<MovimentoCaixa[]> {
    try {
      const movimentosRef = ref(database, 'movimentosCaixa');
      const movimentosQuery = query(
        movimentosRef,
        orderByChild('sessaoId'),
        equalTo(sessaoId)
      );
      
      const snapshot = await get(movimentosQuery);
      const movimentosData = snapshot.val() || {};
      
      return Object.keys(movimentosData)
        .map(id => ({
          id,
          ...movimentosData[id]
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Erro ao buscar movimentos:', error);
      return [];
    }
  }

  static async adicionarMovimento(movimento: Omit<MovimentoCaixa, 'id' | 'createdAt'>): Promise<MovimentoCaixa> {
    try {
      const movimentosRef = ref(database, 'movimentosCaixa');
      const movimentoRef = push(movimentosRef);
      const novoMovimento = {
        ...movimento,
        createdAt: new Date().toISOString(),
      };

      await set(movimentoRef, novoMovimento);

      // Atualizar totais da sessão
      await this.atualizarTotaisSessao(movimento.sessaoId);

      return {
        id: movimentoRef.key!,
        ...novoMovimento
      };
    } catch (error) {
      console.error('Erro ao adicionar movimento:', error);
      throw error;
    }
  }

  private static async atualizarTotaisSessao(sessaoId: string): Promise<void> {
    try {
      const movimentos = await this.getMovimentos(sessaoId);
      
      const totalEntradas = movimentos
        .filter(m => m.tipo === 'entrada')
        .reduce((sum, m) => sum + m.valor, 0);
      
      const totalSaidas = movimentos
        .filter(m => m.tipo === 'saida')
        .reduce((sum, m) => sum + m.valor, 0);
      
      const totalVendas = movimentos
        .filter(m => m.categoria === 'venda')
        .reduce((sum, m) => sum + m.valor, 0);

      const sessaoRef = ref(database, `sessoesCaixa/${sessaoId}`);
      await update(sessaoRef, {
        totalEntradas,
        totalSaidas,
        totalVendas,
      });
    } catch (error) {
      console.error('Erro ao atualizar totais da sessão:', error);
    }
  }

  static async getSessoesPorPeriodo(dataInicio: Date, dataFim: Date): Promise<SessaoCaixa[]> {
    try {
      const inicioISO = dataInicio.toISOString();
      const fimISO = dataFim.toISOString();
      
      const sessoesRef = ref(database, 'sessoesCaixa');
      const sessoesQuery = query(
        sessoesRef,
        orderByChild('dataAbertura'),
        startAt(inicioISO),
        endAt(fimISO)
      );
      
      const snapshot = await get(sessoesQuery);
      const sessoesData = snapshot.val() || {};
      
      return Object.keys(sessoesData).map(id => ({
        id,
        ...sessoesData[id]
      }));
    } catch (error) {
      console.error('Erro ao buscar sessões por período:', error);
      return [];
    }
  }
}