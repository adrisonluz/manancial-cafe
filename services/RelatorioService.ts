import { ref, get } from 'firebase/database';
import { database } from './FirebaseConfig';
import { PedidoService } from './PedidoService';
import { CaixaService } from './CaixaService';
import { AvaliacaoService } from './AvaliacaoService';

export interface RelatorioFinanceiro {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    totalVendas: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoLiquido: number;
    ticketMedio: number;
    quantidadePedidos: number;
  };
  movimentacoes: Array<{
    data: string;
    tipo: string;
    descricao: string;
    valor: number;
    categoria: string;
  }>;
  vendas: Array<{
    data: string;
    pedido: number;
    total: number;
    itens: number;
  }>;
}

export interface RelatorioAdministrativo {
  periodo: {
    inicio: string;
    fim: string;
  };
  usuarios: Array<{
    nome: string;
    email: string;
    diasTrabalhados: number;
    pedidosCriados: number;
    avaliacaoMedia: number;
    ultimoAcesso: string;
  }>;
  avaliacoes: {
    total: number;
    mediaGeral: number;
    porCategoria: {
      atendimento: number;
      produtos: number;
      ambiente: number;
      rapidez: number;
    };
  };
}

export class RelatorioService {
  static async getRelatorioFinanceiro(dataInicio: Date, dataFim: Date): Promise<RelatorioFinanceiro> {
    try {
      const [pedidos, sessoes] = await Promise.all([
        PedidoService.getPedidosPorPeriodo(dataInicio, dataFim),
        CaixaService.getSessoesPorPeriodo(dataInicio, dataFim),
      ]);

      // Buscar movimentações de todas as sessões do período
      const movimentacoes = [];
      for (const sessao of sessoes) {
        const movimentosSessao = await CaixaService.getMovimentos(sessao.id);
        movimentacoes.push(...movimentosSessao);
      }

      const totalVendas = pedidos.reduce((sum, pedido) => sum + pedido.total, 0);
      const totalEntradas = movimentacoes
        .filter(m => m.tipo === 'entrada')
        .reduce((sum, m) => sum + m.valor, 0);
      const totalSaidas = movimentacoes
        .filter(m => m.tipo === 'saida')
        .reduce((sum, m) => sum + m.valor, 0);

      const ticketMedio = pedidos.length > 0 ? totalVendas / pedidos.length : 0;
      const saldoLiquido = totalEntradas - totalSaidas;

      return {
        periodo: {
          inicio: dataInicio.toISOString(),
          fim: dataFim.toISOString(),
        },
        resumo: {
          totalVendas,
          totalEntradas,
          totalSaidas,
          saldoLiquido,
          ticketMedio,
          quantidadePedidos: pedidos.length,
        },
        movimentacoes: movimentacoes.map(m => ({
          data: m.criadoEm,
          tipo: m.tipo,
          descricao: m.descricao,
          valor: m.valor,
          categoria: m.categoria,
        })),
        vendas: pedidos.map(p => ({
          data: p.criadoEm,
          pedido: p.numero,
          total: p.total,
          itens: p.itens.length,
        })),
      };
    } catch (error) {
      console.error('Erro ao gerar relatório financeiro:', error);
      throw error;
    }
  }

  static async getRelatorioAdministrativo(dataInicio: Date, dataFim: Date): Promise<RelatorioAdministrativo> {
    try {
      const [avaliacoes, pedidos] = await Promise.all([
        AvaliacaoService.getAvaliacoesPorPeriodo(dataInicio, dataFim),
        PedidoService.getPedidosPorPeriodo(dataInicio, dataFim),
      ]);

      // Buscar usuários
      const usuariosRef = ref(database, 'usuarios');
      const usuariosSnapshot = await get(usuariosRef);
      const usuariosData = usuariosSnapshot.val() || {};

      const usuarios = Object.keys(usuariosData).map(id => {
        const usuario = usuariosData[id];
        const pedidosUsuario = pedidos.filter(p => p.criadoPor === usuario.email);
        
        // Calcular dias trabalhados no período
        const diasTrabalhados = this.calcularDiasTrabalhados(usuario.email, pedidos, dataInicio, dataFim);
        
        // Calcular avaliação média (simulada - poderia ser implementada com base em avaliações específicas)
        const avaliacaoMedia = this.calcularAvaliacaoUsuario(usuario.email, avaliacoes);

        return {
          nome: usuario.nome,
          email: usuario.email,
          diasTrabalhados,
          pedidosCriados: pedidosUsuario.length,
          avaliacaoMedia,
          ultimoAcesso: usuario.ultimoAcesso || '',
        };
      });

      // Estatísticas das avaliações
      const estatisticasAvaliacoes = await this.calcularEstatisticasAvaliacoes(avaliacoes);

      return {
        periodo: {
          inicio: dataInicio.toISOString(),
          fim: dataFim.toISOString(),
        },
        usuarios,
        avaliacoes: estatisticasAvaliacoes,
      };
    } catch (error) {
      console.error('Erro ao gerar relatório administrativo:', error);
      throw error;
    }
  }

  private static calcularDiasTrabalhados(email: string, pedidos: any[], dataInicio: Date, dataFim: Date): number {
    const pedidosUsuario = pedidos.filter(p => p.criadoPor === email);
    const diasUnicos = new Set(
      pedidosUsuario.map(p => new Date(p.criadoEm).toDateString())
    );
    return diasUnicos.size;
  }

  private static calcularAvaliacaoUsuario(email: string, avaliacoes: any[]): number {
    // Implementação simplificada - poderia ser mais complexa baseada em dados reais
    if (avaliacoes.length === 0) return 0;
    
    const somaTotal = avaliacoes.reduce((sum, av) => {
      return sum + (av.atendimento ?? 0) + (av.produtos ?? 0) + (av.ambiente ?? 0) + (av.rapidez ?? 0);
    }, 0);
    
    return somaTotal / (avaliacoes.length * 4);
  }

  private static async calcularEstatisticasAvaliacoes(avaliacoes: any[]): Promise<any> {
    if (avaliacoes.length === 0) {
      return {
        total: 0,
        mediaGeral: 0,
        porCategoria: {
          atendimento: 0,
          precosProdutos: 0,
          qualidadeProdutos: 0,
          ambiente: 0,
          tempoPreparo: 0,
        },
      };
    }

    const somaAtendimento = avaliacoes.reduce((sum, av) => sum + (av.atendimento ?? 0), 0);
    const somaPrecosProdutos = avaliacoes.reduce((sum, av) => sum + (av.precosProdutos ?? 0), 0);
    const somaQualidadeProdutos = avaliacoes.reduce((sum, av) => sum + (av.qualidadeProdutos ?? 0), 0);
    const somaAmbiente = avaliacoes.reduce((sum, av) => sum + (av.ambiente ?? 0), 0);
    const somaTempoPreparo = avaliacoes.reduce((sum, av) => sum + (av.tempoPreparo ?? 0), 0);

    const mediaAtendimento = somaAtendimento / avaliacoes.length;
    const mediaPrecosProdutos = somaPrecosProdutos / avaliacoes.length;
    const mediaQualidadeProdutos = somaQualidadeProdutos / avaliacoes.length;
    const mediaAmbiente = somaAmbiente / avaliacoes.length;
    const mediaTempoPreparo = somaTempoPreparo / avaliacoes.length;

    const mediaGeral = (mediaAtendimento + mediaPrecosProdutos + mediaQualidadeProdutos + mediaAmbiente + mediaTempoPreparo) / 5;

    return {
      total: avaliacoes.length,
      mediaGeral,
      porCategoria: {
        atendimento: mediaAtendimento,
        precosProdutos: mediaPrecosProdutos,
        qualidadeProdutos: mediaQualidadeProdutos,
        ambiente: mediaAmbiente,
        tempoPreparo: mediaTempoPreparo,
      },
    };
  }
}