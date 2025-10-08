import { ref, get, set, push, update } from 'firebase/database';
import { database } from './FirebaseConfig';

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  quantidade: number;
  estoqueMinimo: number;
  unidade: string;
  ativo: boolean;
  criadoEm: string;
}

export class EstoqueService {
  static async getProdutos(): Promise<Produto[]> {
    try {
      const produtosRef = ref(database, 'produtos');
      const snapshot = await get(produtosRef);
      const produtosData = snapshot.val() || {};
      
      return Object.keys(produtosData)
        .map(id => ({
          id,
          ...produtosData[id]
        }))
        .filter(produto => produto.ativo)
        .sort((a, b) => a.nome.localeCompare(b.nome));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  static async criarProduto(produtoData: Omit<Produto, 'id' | 'criadoEm'>): Promise<string> {
    try {
      const produtosRef = ref(database, 'produtos');
      const produtoRef = push(produtosRef);
      const novoProduto = {
        ...produtoData,
        criadoEm: new Date().toISOString(),
      };
      
      await set(produtoRef, novoProduto);
      return produtoRef.key!;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  static async atualizarProduto(produtoId: string, dadosAtualizacao: Partial<Produto>): Promise<void> {
    try {
      const produtoRef = ref(database, `produtos/${produtoId}`);
      await update(produtoRef, dadosAtualizacao);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  static async removerProduto(produtoId: string): Promise<void> {
    try {
      const ativoRef = ref(database, `produtos/${produtoId}/ativo`);
      await set(ativoRef, false);
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      throw error;
    }
  }

  static async atualizarEstoque(produtoId: string, quantidade: number, absoluto: boolean = false): Promise<void> {
    try {
      if (absoluto) {
        const quantidadeRef = ref(database, `produtos/${produtoId}/quantidade`);
        await set(quantidadeRef, quantidade);
      } else {
        const quantidadeRef = ref(database, `produtos/${produtoId}/quantidade`);
        const snapshot = await get(quantidadeRef);
        const quantidadeAtual = snapshot.val() || 0;
        const novaQuantidade = Math.max(0, quantidadeAtual + quantidade);
        
        await set(quantidadeRef, novaQuantidade);
      }
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      throw error;
    }
  }

  static async getProdutosBaixoEstoque(): Promise<Produto[]> {
    try {
      const produtos = await this.getProdutos();
      return produtos.filter(produto => produto.quantidade <= produto.estoqueMinimo);
    } catch (error) {
      console.error('Erro ao buscar produtos em baixo estoque:', error);
      return [];
    }
  }
}