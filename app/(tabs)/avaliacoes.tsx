import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
  Alert
} from 'react-native';
import { Star, Search, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { AvaliacaoService } from '@/services/AvaliacaoService';
import { styles } from '../styles';

interface Avaliacao {
  id: string;
  atendimento: number;
  qualidadeProdutos: number;
  precosProdutos: number;
  tempoPreparo: number;
  ambiente: number;
  comment?: string;
  name?: string;
  contact?: string;
  createdAt: string;
}

export default function AvaliacoesScreen() {
  const { user } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [avaliacoesFiltradas, setAvaliacoesFiltradas] = useState<Avaliacao[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Acesso Negado', 'Você não tem permissão para acessar esta área');
      return;
    }

    loadAvaliacoes();
    // Atualizar a cada 30 segundos para pegar novas avaliações
    const interval = setInterval(loadAvaliacoes, 30000);
    return () => clearInterval(interval);
  }, [user]);

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