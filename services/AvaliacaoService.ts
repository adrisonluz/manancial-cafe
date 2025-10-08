import { ref, get, set, push, query, orderByChild, startAt, endAt } from 'firebase/database';
import { database } from './FirebaseConfig';

export interface Avaliacao {
  id: string;
  ambiente: number;
  atendimento: number;
  comment: string;
  contact: string;
  createdAt: string;
  name: string;
  precosProdutos: number;
  qualidadeProdutos: number;
  tempoPreparo: number;
}

export class AvaliacaoService {
  static async getAvaliacoes(): Promise<Avaliacao[]> {
    try {
      const avaliacoesRef = ref(database, 'avaliacoes');
      const avaliacoesQuery = query(avaliacoesRef, orderByChild('createdAt'));
      const snapshot = await get(avaliacoesQuery);
      
      const avaliacoesData = snapshot.val() || {};
      
      return Object.keys(avaliacoesData)
        .map(id => ({
          id,
          ambiente: avaliacoesData[id].ambiente ?? 0,
          atendimento: avaliacoesData[id].atendimento ?? 0,
          comment: avaliacoesData[id].comment ?? '',
          contact: avaliacoesData[id].contact ?? '',
          createdAt: avaliacoesData[id].createdAt ?? new Date().toISOString(),
          name: avaliacoesData[id].name ?? '',
          precosProdutos: avaliacoesData[id].precosProdutos ?? 0,
          qualidadeProdutos: avaliacoesData[id].qualidadeProdutos ?? 0,
          tempoPreparo: avaliacoesData[id].tempoPreparo ?? 0
        }))
        .reverse(); // Mais recentes primeiro
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      return [];
    }
  }

  static async criarAvaliacao(avaliacaoData: Omit<Avaliacao, 'id' | 'createdAt'>): Promise<string> {
    try {
      const avaliacoesRef = ref(database, 'avaliacoes');
      const avaliacaoRef = push(avaliacoesRef);
      const novaAvaliacao = {
        ...avaliacaoData,
        createdAt: new Date().toISOString(),
      };
      
      await set(avaliacaoRef, novaAvaliacao);
      return avaliacaoRef.key!;
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      throw error;
    }
  }

  static async getAvaliacoesPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Avaliacao[]> {
    try {
      const inicioISO = dataInicio.toISOString();
      const fimISO = dataFim.toISOString();
      
      const avaliacoesRef = ref(database, 'avaliacoes');
      const avaliacoesQuery = query(
        avaliacoesRef,
        orderByChild('createdAt'),
        startAt(inicioISO),
        endAt(fimISO)
      );
      
      const snapshot = await get(avaliacoesQuery);
      const avaliacoesData = snapshot.val() || {};
      
      return Object.keys(avaliacoesData).map(id => ({
        id,
        ambiente: avaliacoesData[id].ambiente ?? 0,
        atendimento: avaliacoesData[id].atendimento ?? 0,
        comment: avaliacoesData[id].comment ?? '',
        contact: avaliacoesData[id].contact ?? '',
        createdAt: avaliacoesData[id].createdAt ?? new Date().toISOString(),
        name: avaliacoesData[id].name ?? '',
        precosProdutos: avaliacoesData[id].precosProdutos ?? 0,
        qualidadeProdutos: avaliacoesData[id].qualidadeProdutos ?? 0,
        tempoPreparo: avaliacoesData[id].tempoPreparo ?? 0
      }));
    } catch (error) {
      console.error('Erro ao buscar avaliações por período:', error);
      return [];
    }
  }

  static async getEstatisticas(): Promise<{
    total: number;
    mediaGeral: number;
    porCategoria: {
      atendimento: number;
      qualidadeProdutos: number;
      ambiente: number;
      rapidez: number;
    };
  }> {
    try {
      const avaliacoes = await this.getAvaliacoes();
      
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

      const somaAtendimento = avaliacoes.reduce((sum, av) => sum + av.atendimento, 0);
      const somaPrecosProdutos = avaliacoes.reduce((sum, av) => sum + av.precosProdutos, 0);
      const somaQualidadeProdutos = avaliacoes.reduce((sum, av) => sum + av.qualidadeProdutos, 0);
      const somaAmbiente = avaliacoes.reduce((sum, av) => sum + av.ambiente, 0);
      const somaTempoPreparo = avaliacoes.reduce((sum, av) => sum + av.tempoPreparo, 0);

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
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
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
  }
}