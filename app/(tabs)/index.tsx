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
import { Plus, Clock, CircleCheck as CheckCircle, X, CreditCard as Edit, Trash2, ChefHat, Truck } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { PedidoService } from '@/services/PedidoService';
import { EstoqueService } from '@/services/EstoqueService';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
}

interface ItemPedido {
  produto: Produto;
  quantidade: number;
  observacoes?: string;
}

interface Pedido {
  id: string;
  numero: number;
  itens: ItemPedido[];
  total: number;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue';
  cliente?: string;
  criadoEm: string;
  criadoPor: string;
  entregueEm?: string;
}

export default function PedidosScreen() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pedidoAtual, setPedidoAtual] = useState<ItemPedido[]>([]);
  const [clienteNome, setClienteNome] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Atualizar dados a cada 30 segundos para mostrar tempos atualizados
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pedidosData, produtosData] = await Promise.all([
        PedidoService.getPedidos(),
        EstoqueService.getProdutos(),
      ]);
      
      // Filtrar pedidos baseado no papel do usuário
      const pedidosFiltrados = filtrarPedidosPorPapel(pedidosData);
      setPedidos(pedidosFiltrados);
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarPedidosPorPapel = (todosPedidos: Pedido[]) => {
    // Filtrar pedidos do dia atual ou anteriores não entregues
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioOntem = new Date(inicioHoje.getTime() - 24 * 60 * 60 * 1000);

    const pedidosRelevantes = todosPedidos.filter(pedido => {
      const dataPedido = new Date(pedido.criadoEm);
      
      // Pedidos de hoje
      if (dataPedido >= inicioHoje) return true;
      
      // Pedidos de ontem que ainda não foram entregues
      if (dataPedido >= inicioOntem && pedido.status !== 'entregue') return true;
      
      return false;
    });

    // Filtrar por papel do usuário
    if (user?.role === 'cozinheiro') {
      const pedidosCozinha = pedidosRelevantes.filter(pedido => 
        ['pendente', 'preparando', 'pronto'].includes(pedido.status)
      );
      
      // Ordenar por status na ordem: pendente, preparando, pronto
      const ordemStatus = { 'pendente': 1, 'preparando': 2, 'pronto': 3 };
      return pedidosCozinha.sort((a, b) => {
        const ordemA = ordemStatus[a.status as keyof typeof ordemStatus];
        const ordemB = ordemStatus[b.status as keyof typeof ordemStatus];
        
        if (ordemA !== ordemB) {
          return ordemA - ordemB;
        }
        
        // Se mesmo status, ordenar por data de criação (mais antigos primeiro)
        return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
      });
    }

    // Admin e operador veem todos os pedidos relevantes
    return pedidosRelevantes.sort((a, b) => 
      new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  };

  const adicionarItem = (produto: Produto) => {
    const itemExistente = pedidoAtual.find(item => item.produto.id === produto.id);
    
    if (itemExistente) {
      setPedidoAtual(prev =>
        prev.map(item =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      );
    } else {
      setPedidoAtual(prev => [...prev, { produto, quantidade: 1 }]);
    }
  };

  const removerItem = (produtoId: string) => {
    setPedidoAtual(prev => prev.filter(item => item.produto.id !== produtoId));
  };

  const finalizarPedido = async () => {
    if (pedidoAtual.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      const total = pedidoAtual.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0);
      
      const novoPedido: Omit<Pedido, 'id'> = {
        numero: pedidos.length + 1,
        itens: pedidoAtual,
        total,
        status: 'pendente',
        cliente: clienteNome,
        criadoEm: new Date().toISOString(),
        criadoPor: user?.email || '',
      };

      const pedidoId = await PedidoService.criarPedido(novoPedido);
      
      // Atualizar estoque
      for (const item of pedidoAtual) {
        await EstoqueService.atualizarEstoque(item.produto.id, -item.quantidade);
      }

      setPedidos(prev => [...prev, { ...novoPedido, id: pedidoId }]);
      setPedidoAtual([]);
      setClienteNome('');
      setModalVisible(false);
      
      Alert.alert('Sucesso', 'Pedido criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      Alert.alert('Erro', 'Falha ao criar pedido');
    }
  };

  const atualizarStatusPedido = async (pedidoId: string, novoStatus: Pedido['status']) => {
    try {
      await PedidoService.atualizarStatus(pedidoId, novoStatus);
      setPedidos(prev =>
        prev.map(pedido =>
          pedido.id === pedidoId 
            ? { 
                ...pedido, 
                status: novoStatus,
                ...(novoStatus === 'entregue' && { entregueEm: new Date().toISOString() })
              } 
            : pedido
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const podeAlterarStatus = (pedido: Pedido, novoStatus: string) => {
    const userRole = user?.role;
    
    switch (novoStatus) {
      case 'preparando':
      case 'pronto':
        return userRole === 'admin' || userRole === 'cozinheiro';
      case 'entregue':
        return userRole === 'admin' || userRole === 'operador';
      default:
        return false;
    }
  };

  const calcularTempoPedido = (pedido: Pedido) => {
    const agora = new Date();
    const criacao = new Date(pedido.criadoEm);
    const fim = pedido.entregueEm ? new Date(pedido.entregueEm) : agora;
    
    const diferencaMs = fim.getTime() - criacao.getTime();
    const minutos = Math.floor(diferencaMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${minutosRestantes}min`;
    }
    return `${minutos}min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#F97316';
      case 'preparando': return '#3B82F6';
      case 'pronto': return '#10B981';
      case 'entregue': return '#6B7280';
      default: return '#F97316';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock size={16} color="#F97316" />;
      case 'preparando': return <ChefHat size={16} color="#3B82F6" />;
      case 'pronto': return <CheckCircle size={16} color="#10B981" />;
      case 'entregue': return <Truck size={16} color="#6B7280" />;
      default: return <Clock size={16} color="#F97316" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'preparando': return 'Preparando';
      case 'pronto': return 'Pronto';
      case 'entregue': return 'Entregue';
      default: return status;
    }
  };

  const podecriarPedido = () => {
    return user?.role === 'admin' || user?.role === 'operador';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pedidos</Text>
          <Text style={styles.headerSubtitle}>
            {user?.role === 'cozinheiro' ? 'Cozinha' : 'Todos os pedidos'}
          </Text>
        </View>
        {podecriarPedido() && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {pedidos.map((pedido) => (
          <View key={pedido.id} style={styles.pedidoCard}>
            <View style={styles.pedidoHeader}>
              <View style={styles.pedidoInfo}>
                <Text style={styles.pedidoNumero}>#{pedido.numero}</Text>
                {pedido.cliente && (
                  <Text style={styles.pedidoCliente}>{pedido.cliente}</Text>
                )}
                <Text style={styles.pedidoTempo}>
                  {pedido.status === 'entregue' 
                    ? `Entregue em ${calcularTempoPedido(pedido)}`
                    : `Há ${calcularTempoPedido(pedido)}`
                  }
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pedido.status) }]}>
                {getStatusIcon(pedido.status)}
                <Text style={styles.statusText}>{getStatusLabel(pedido.status)}</Text>
              </View>
            </View>

            <View style={styles.pedidoItens}>
              {pedido.itens.map((item, index) => (
                <Text key={index} style={styles.itemText}>
                  {item.quantidade}x {item.produto.nome} - R$ {(item.produto.preco * item.quantidade).toFixed(2)}
                </Text>
              ))}
            </View>

            <View style={styles.pedidoFooter}>
              <Text style={styles.pedidoTotal}>Total: R$ {pedido.total.toFixed(2)}</Text>
              <View style={styles.statusButtons}>
                {pedido.status === 'pendente' && podeAlterarStatus(pedido, 'preparando') && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => atualizarStatusPedido(pedido.id, 'preparando')}
                  >
                    <ChefHat size={14} color="#fff" />
                    <Text style={styles.statusButtonText}>Iniciar</Text>
                  </TouchableOpacity>
                )}
                {pedido.status === 'preparando' && podeAlterarStatus(pedido, 'pronto') && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                    onPress={() => atualizarStatusPedido(pedido.id, 'pronto')}
                  >
                    <CheckCircle size={14} color="#fff" />
                    <Text style={styles.statusButtonText}>Finalizar</Text>
                  </TouchableOpacity>
                )}
                {pedido.status === 'pronto' && podeAlterarStatus(pedido, 'entregue') && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#6B7280' }]}
                    onPress={() => atualizarStatusPedido(pedido.id, 'entregue')}
                  >
                    <Truck size={14} color="#fff" />
                    <Text style={styles.statusButtonText}>Entregar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}

        {pedidos.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {user?.role === 'cozinheiro' 
                ? 'Nenhum pedido na cozinha' 
                : 'Nenhum pedido encontrado'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Novo Pedido */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Novo Pedido</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.clienteInput}
            placeholder="Nome do cliente (opcional)"
            placeholderTextColor="#666"
            value={clienteNome}
            onChangeText={setClienteNome}
          />

          <ScrollView style={styles.produtosList}>
            <Text style={styles.sectionTitle}>Produtos</Text>
            {produtos.map((produto) => (
              <TouchableOpacity
                key={produto.id}
                style={styles.produtoItem}
                onPress={() => adicionarItem(produto)}
              >
                <Text style={styles.produtoNome}>{produto.nome}</Text>
                <Text style={styles.produtoPreco}>R$ {produto.preco.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {pedidoAtual.length > 0 && (
            <View style={styles.pedidoResumo}>
              <Text style={styles.sectionTitle}>Itens do Pedido</Text>
              {pedidoAtual.map((item, index) => (
                <View key={index} style={styles.itemResumo}>
                  <Text style={styles.itemResumoText}>
                    {item.quantidade}x {item.produto.nome}
                  </Text>
                  <TouchableOpacity onPress={() => removerItem(item.produto.id)}>
                    <Trash2 size={16} color="#F87171" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>
                  Total: R$ {pedidoAtual.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0).toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity style={styles.finalizarButton} onPress={finalizarPedido}>
                <Text style={styles.finalizarButtonText}>Finalizar Pedido</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9f795c',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#6b4324',
    borderRadius: 25,
    padding: 10,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  pedidoCard: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6b4324',
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pedidoInfo: {
    flex: 1,
  },
  pedidoNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    color: '#e6e6e6',
  },
  pedidoCliente: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9f795c',
    marginTop: 2,
  },
  pedidoTempo: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6b4324',
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    gap: 5,
  },
  statusText: {
    color: '#e6e6e6',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  pedidoItens: {
    marginBottom: 10,
  },
  itemText: {
    color: '#9f795c',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 3,
  },
  pedidoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#6b4324',
  },
  pedidoTotal: {
    color: '#e6e6e6',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  statusButtonText: {
    color: '#e6e6e6',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    color: '#9f795c',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
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
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    color: '#e6e6e6',
  },
  clienteInput: {
    backgroundColor: '#000',
    color: '#e6e6e6',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b4324',
    fontFamily: 'Inter-Regular',
  },
  produtosList: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    color: '#e6e6e6',
    marginBottom: 15,
  },
  produtoItem: {
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b4324',
  },
  produtoNome: {
    color: '#e6e6e6',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  produtoPreco: {
    color: '#6b4324',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  pedidoResumo: {
    backgroundColor: '#000',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#6b4324',
  },
  itemResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemResumoText: {
    color: '#9f795c',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  totalContainer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#6b4324',
    marginTop: 10,
  },
  totalText: {
    color: '#e6e6e6',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  finalizarButton: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  finalizarButtonText: {
    color: '#e6e6e6',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
});