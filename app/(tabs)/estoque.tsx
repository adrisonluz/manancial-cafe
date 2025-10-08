import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Plus, CreditCard as Edit, Trash2, Search, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { EstoqueService } from '@/services/EstoqueService';

interface Produto {
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

export default function EstoqueScreen() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [produtoEdicao, setProdutoEdicao] = useState<Produto | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    preco: '',
    quantidade: '',
    estoqueMinimo: '',
    unidade: 'un',
  });

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    try {
      const produtosData = await EstoqueService.getProdutos();
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProdutos = produtos.filter(produto =>
    produto.nome.toLowerCase().includes(searchText.toLowerCase()) ||
    produto.categoria.toLowerCase().includes(searchText.toLowerCase())
  );

  const produtosBaixoEstoque = produtos.filter(
    produto => produto.quantidade <= produto.estoqueMinimo && produto.ativo
  );

  const openModal = (produto?: Produto) => {
    if (produto) {
      setProdutoEdicao(produto);
      setFormData({
        nome: produto.nome,
        categoria: produto.categoria,
        preco: produto.preco.toString(),
        quantidade: produto.quantidade.toString(),
        estoqueMinimo: produto.estoqueMinimo.toString(),
        unidade: produto.unidade,
      });
    } else {
      setProdutoEdicao(null);
      setFormData({
        nome: '',
        categoria: '',
        preco: '',
        quantidade: '',
        estoqueMinimo: '',
        unidade: 'un',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setProdutoEdicao(null);
  };

  const salvarProduto = async () => {
    if (!formData.nome || !formData.preco) {
      Alert.alert('Erro', 'Nome e preço são obrigatórios');
      return;
    }

    const dadosProduto = {
      nome: formData.nome,
      categoria: formData.categoria || 'Geral',
      preco: parseFloat(formData.preco),
      quantidade: parseFloat(formData.quantidade) || 0,
      estoqueMinimo: parseFloat(formData.estoqueMinimo) || 0,
      unidade: formData.unidade,
      ativo: true,
    };

    try {
      if (produtoEdicao) {
        await EstoqueService.atualizarProduto(produtoEdicao.id, dadosProduto);
        setProdutos(prev =>
          prev.map(p => p.id === produtoEdicao.id ? { ...p, ...dadosProduto } : p)
        );
      } else {
        const novoProdutoId = await EstoqueService.criarProduto(dadosProduto);
        const novoProduto = {
          id: novoProdutoId,
          ...dadosProduto,
          criadoEm: new Date().toISOString(),
        };
        setProdutos(prev => [...prev, novoProduto]);
      }
      
      closeModal();
      Alert.alert('Sucesso', 'Produto salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Falha ao salvar produto');
    }
  };

  const removerProduto = async (produto: Produto) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente remover ${produto.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await EstoqueService.removerProduto(produto.id);
              setProdutos(prev => prev.filter(p => p.id !== produto.id));
            } catch (error) {
              console.error('Erro ao remover produto:', error);
              Alert.alert('Erro', 'Falha ao remover produto');
            }
          },
        },
      ]
    );
  };

  const ajustarEstoque = (produto: Produto) => {
    Alert.prompt(
      'Ajustar Estoque',
      `Quantidade atual: ${produto.quantidade} ${produto.unidade}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Atualizar',
          onPress: async (novaQuantidade) => {
            if (novaQuantidade) {
              try {
                const quantidade = parseFloat(novaQuantidade);
                await EstoqueService.atualizarEstoque(produto.id, quantidade, true);
                setProdutos(prev =>
                  prev.map(p => p.id === produto.id ? { ...p, quantidade } : p)
                );
              } catch (error) {
                console.error('Erro ao ajustar estoque:', error);
                Alert.alert('Erro', 'Falha ao ajustar estoque');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estoque</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {produtosBaixoEstoque.length > 0 && (
        <View style={styles.alertContainer}>
          <AlertTriangle size={20} color="#F97316" />
          <Text style={styles.alertText}>
            {produtosBaixoEstoque.length} produto(s) com estoque baixo
          </Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produtos..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredProdutos.map((produto) => (
          <View key={produto.id} style={styles.produtoCard}>
            <View style={styles.produtoHeader}>
              <View style={styles.produtoInfo}>
                <Text style={styles.produtoNome}>{produto.nome}</Text>
                <Text style={styles.produtoCategoria}>{produto.categoria}</Text>
              </View>
              <View style={styles.produtoActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openModal(produto)}
                >
                  <Edit size={16} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => removerProduto(produto)}
                >
                  <Trash2 size={16} color="#F87171" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.produtoDetalhes}>
              <View style={styles.detalheItem}>
                <Text style={styles.detalheLabel}>Preço:</Text>
                <Text style={styles.detalheValor}>R$ {produto.preco.toFixed(2)}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.detalheItem}
                onPress={() => ajustarEstoque(produto)}
              >
                <Text style={styles.detalheLabel}>Estoque:</Text>
                <Text style={[
                  styles.detalheValor,
                  produto.quantidade <= produto.estoqueMinimo && styles.estoqueAlerta
                ]}>
                  {produto.quantidade} {produto.unidade}
                </Text>
              </TouchableOpacity>

              <View style={styles.detalheItem}>
                <Text style={styles.detalheLabel}>Mínimo:</Text>
                <Text style={styles.detalheValor}>
                  {produto.estoqueMinimo} {produto.unidade}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {produtoEdicao ? 'Editar Produto' : 'Novo Produto'}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={formData.nome}
                onChangeText={(text) => setFormData(prev => ({...prev, nome: text}))}
                placeholder="Nome do produto"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categoria</Text>
              <TextInput
                style={styles.input}
                value={formData.categoria}
                onChangeText={(text) => setFormData(prev => ({...prev, categoria: text}))}
                placeholder="Categoria do produto"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Preço *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.preco}
                  onChangeText={(text) => setFormData(prev => ({...prev, preco: text}))}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Unidade</Text>
                <TextInput
                  style={styles.input}
                  value={formData.unidade}
                  onChangeText={(text) => setFormData(prev => ({...prev, unidade: text}))}
                  placeholder="un"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Quantidade</Text>
                <TextInput
                  style={styles.input}
                  value={formData.quantidade}
                  onChangeText={(text) => setFormData(prev => ({...prev, quantidade: text}))}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Estoque Mínimo</Text>
                <TextInput
                  style={styles.input}
                  value={formData.estoqueMinimo}
                  onChangeText={(text) => setFormData(prev => ({...prev, estoqueMinimo: text}))}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={salvarProduto}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#6b4324',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    color: '#e6e6e6',
  },
  addButton: {
    backgroundColor: '#6b4324',
    borderRadius: 25,
    padding: 10,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    padding: 12,
    margin: 15,
    borderRadius: 8,
    gap: 8,
  },
  alertText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    padding: 15,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  produtoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  produtoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  produtoCategoria: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  produtoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  produtoDetalhes: {
    gap: 8,
  },
  detalheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detalheLabel: {
    color: '#888',
    fontSize: 14,
  },
  detalheValor: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  estoqueAlerta: {
    color: '#F87171',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#6b4324',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    color: '#e6e6e6',
  },
  cancelButton: {
    color: '#3B82F6',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b4324',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#9f795c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#e6e6e6',
    fontSize: 16,
    fontWeight: 'bold',
  },
});