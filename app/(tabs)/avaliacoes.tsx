import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Star, Search, MessageSquare } from 'lucide-react-native';
import { AvaliacaoService } from '@/services/AvaliacaoService';

interface Avaliacao {
  id: string;
  atendimento: number;
  produtos: number;
  ambiente: number;
  rapidez: number;
  comentario?: string;
  criadoEm: string;
}

export default function AvaliacoesScreen() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [avaliacoesFiltradas, setAvaliacoesFiltradas] = useState<Avaliacao[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadAvaliacoes();
    // Atualizar a cada 30 segundos para pegar novas avaliações
    const interval = setInterval(loadAvaliacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filtrarAvaliacoes();
  }, [searchText, avaliacoes]);

  const loadAvaliacoes = async () => {
    try {
      const avaliacoesData = await AvaliacaoService.getAvaliacoes();
      setAvaliacoes(avaliacoesData);
      setPage(1);
      setHasMore(avaliacoesData.length > ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtrarAvaliacoes = () => {
    let filtradas = avaliacoes;
    
    if (searchText.trim()) {
      filtradas = avaliacoes.filter(avaliacao =>
        avaliacao.comment?.toLowerCase().includes(searchText.toLowerCase()) ||
        avaliacao.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        new Date(avaliacao.createdAt).toLocaleDateString('pt-BR').includes(searchText)
      );
    }
    
    setAvaliacoesFiltradas(filtradas);
    setPage(1);
    setHasMore(filtradas.length > ITEMS_PER_PAGE);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAvaliacoes();
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      const maxItems = nextPage * ITEMS_PER_PAGE;
      setPage(nextPage);
      setHasMore(avaliacoesFiltradas.length > maxItems);
    }
  };

  const getAvaliacoesExibidas = () => {
    return avaliacoesFiltradas.slice(0, page * ITEMS_PER_PAGE);
  };

  const renderStars = (valor: number, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={star <= valor ? '#F97316' : '#333'}
            fill={star <= valor ? '#F97316' : 'none'}
          />
        ))}
      </View>
    );
  };

  const getMediaCategoria = (categoria: string) => {
    if (avaliacoes.length === 0) return 0;
    const soma = avaliacoes.reduce((acc, av) => acc + av[categoria], 0);
    return (soma / avaliacoes.length);
  };

  const getMediaGeral = () => {
    if (avaliacoes.length === 0) return 0;
    const categorias = ['atendimento', 'precosProdutos', 'qualidadeProdutos', 'ambiente', 'tempoPreparo'];
    const somaMedias = categorias.reduce((acc, cat) => acc + getMediaCategoria(cat), 0);
    return somaMedias / categorias.length;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const renderAvaliacaoItem = ({ item }: { item: Avaliacao }) => (
    <View style={styles.avaliacaoCard}>
      <View style={styles.avaliacaoHeader}>
        <View style={styles.avaliacaoData}>
          <Text style={styles.dataText}>{formatDateTime(item.createdAt)}</Text>
          {item.name && (
            <Text style={styles.nomeText}>{item.name}</Text>
          )}
        </View>
        <View style={styles.mediaGeral}>
          <Text style={styles.mediaGeralValor}>
            {((item.atendimento + item.precosProdutos + item.qualidadeProdutos + item.ambiente + item.tempoPreparo) / 5).toFixed(1)}
          </Text>
          {renderStars(Math.round((item.atendimento + item.precosProdutos + item.qualidadeProdutos + item.ambiente + item.tempoPreparo) / 5), 14)}
        </View>
      </View>

      <View style={styles.categoriasGrid}>
        <View style={styles.categoriaItem}>
          <Text style={styles.categoriaLabel}>Atendimento</Text>
          <View style={styles.categoriaValor}>
            <Text style={styles.categoriaNumero}>{item.atendimento.toFixed(1)}</Text>
            {renderStars(item.atendimento, 12)}
          </View>
        </View>

        <View style={styles.categoriaItem}>
          <Text style={styles.categoriaLabel}>Preços</Text>
          <View style={styles.categoriaValor}>
            <Text style={styles.categoriaNumero}>{item.precosProdutos.toFixed(1)}</Text>
            {renderStars(item.precosProdutos, 12)}
          </View>
        </View>

        <View style={styles.categoriaItem}>
          <Text style={styles.categoriaLabel}>Qualidade</Text>
          <View style={styles.categoriaValor}>
            <Text style={styles.categoriaNumero}>{item.qualidadeProdutos.toFixed(1)}</Text>
            {renderStars(item.qualidadeProdutos, 12)}
          </View>
        </View>

        <View style={styles.categoriaItem}>
          <Text style={styles.categoriaLabel}>Ambiente</Text>
          <View style={styles.categoriaValor}>
            <Text style={styles.categoriaNumero}>{item.ambiente.toFixed(1)}</Text>
            {renderStars(item.ambiente, 12)}
          </View>
        </View>

        <View style={styles.categoriaItem}>
          <Text style={styles.categoriaLabel}>Tempo Preparo</Text>
          <View style={styles.categoriaValor}>
            <Text style={styles.categoriaNumero}>{item.tempoPreparo.toFixed(1)}</Text>
            {renderStars(item.tempoPreparo, 12)}
          </View>
        </View>
      </View>

      {item.comment && (
        <View style={styles.comentarioContainer}>
          <MessageSquare size={16} color="#888" />
          <Text style={styles.comentarioTexto}>{item.comment}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Avaliações</Text>
        <Text style={styles.headerSubtitle}>Feedback dos clientes</Text>
      </View>

      {/* Resumo Estatísticas */}
      {avaliacoes.length > 0 && (
        <View style={styles.resumoContainer}>
          <View style={styles.mediaGeralCard}>
            <Text style={styles.mediaGeralLabel}>Média Geral</Text>
            <View style={styles.mediaGeralInfo}>
              <Text style={styles.mediaGeralValorGrande}>
                {getMediaGeral().toFixed(1)}
              </Text>
              <View style={styles.mediaGeralStars}>
                {renderStars(Math.round(getMediaGeral()), 20)}
              </View>
            </View>
            <Text style={styles.totalAvaliacoes}>
              Baseado em {avaliacoes.length} avaliações
            </Text>
          </View>

          <View style={styles.mediasPorCategoria}>
            {[
              { key: 'atendimento', label: 'Atendimento' },
              { key: 'precosProdutos', label: 'Preços' },
              { key: 'qualidadeProdutos', label: 'Qualidade' },
              { key: 'ambiente', label: 'Ambiente' },
              { key: 'tempoPreparo', label: 'Tempo Preparo' },
            ].map(categoria => (
              <View key={categoria.key} style={styles.categoriaResumo}>
                <Text style={styles.categoriaResumoNome}>{categoria.label}</Text>
                <View style={styles.categoriaResumoValor}>
                  <Text style={styles.mediaValor}>
                    {getMediaCategoria(categoria.key).toFixed(1)}
                  </Text>
                  {renderStars(Math.round(getMediaCategoria(categoria.key)), 14)}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome, comentário ou data..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Lista de Avaliações */}
      <FlatList
        data={getAvaliacoesExibidas()}
        renderItem={renderAvaliacaoItem}
        keyExtractor={(item) => item.id}
        style={styles.avaliacoesList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Star size={48} color="#333" />
            <Text style={styles.emptyStateTitle}>Nenhuma avaliação encontrada</Text>
            <Text style={styles.emptyStateText}>
              {searchText 
                ? 'Tente buscar por nome, comentário ou data'
                : 'As avaliações aparecerão aqui quando forem enviadas'
              }
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore && avaliacoesFiltradas.length > page * ITEMS_PER_PAGE ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Carregando mais...</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#6b4324',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    color: '#e6e6e6',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9f795c',
  },
  resumoContainer: {
    padding: 15,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#6b4324',
  },
  mediaGeralCard: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6b4324',
    alignItems: 'center',
    marginBottom: 15,
  },
  mediaGeralLabel: {
    color: '#9f795c',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  mediaGeralInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 5,
  },
  mediaGeralValorGrande: {
    color: '#6b4324',
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  mediaGeralStars: {
    flexDirection: 'row',
    gap: 3,
  },
  totalAvaliacoes: {
    color: '#9f795c',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  mediasPorCategoria: {
    gap: 8,
  },
  categoriaResumo: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b4324',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoriaResumoNome: {
    color: '#e6e6e6',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  categoriaResumoValor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaValor: {
    color: '#6b4324',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    minWidth: 30,
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b4324',
  },
  searchInput: {
    flex: 1,
    color: '#e6e6e6',
    padding: 15,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  avaliacoesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  avaliacaoCard: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6b4324',
  },
  avaliacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  avaliacaoData: {
    flex: 1,
  },
  dataText: {
    color: '#9f795c',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  nomeText: {
    color: '#e6e6e6',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  mediaGeral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaGeralValor: {
    color: '#6b4324',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  categoriasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 15,
  },
  categoriaItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b4324',
  },
  categoriaLabel: {
    color: '#9f795c',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  categoriaValor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoriaNumero: {
    color: '#e6e6e6',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    minWidth: 25,
  },
  comentarioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b4324',
  },
  comentarioTexto: {
    color: '#9f795c',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    color: '#e6e6e6',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#9f795c',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: '#9f795c',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});