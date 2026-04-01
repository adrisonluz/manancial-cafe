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
  Platform
} from 'react-native';
import { Plus, Clock, CircleCheck as CheckCircle, X, CreditCard as Edit, Trash2, SquarePen } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { ClienteService, Cliente } from '@/services/ClienteService';
import { PedidoService } from '@/services/PedidoService';
import { EstoqueService } from '@/services/EstoqueService';
import { styles as stylesOriginal } from '../styles';
// Force styles to any to avoid cross-platform type issues between web/native style shapes
const styles: any = stylesOriginal;

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
  status: 'pendente' | 'em haver' | 'pago' | 'cancelado';
  cliente?: string;
  createdAt: string;
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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteModalVisible, setClienteModalVisible] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [itensEditados, setItensEditados] = useState<ItemPedido[]>([]);
  const [clienteEdicao, setClienteEdicao] = useState('');

  useEffect(() => {
    loadData();
    // Atualizar dados a cada 30 segundos para mostrar tempos atualizados
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pedidosData, produtosData, clientesData] = await Promise.all([
          PedidoService.getPedidos(),
          EstoqueService.getProdutos(),
          ClienteService.getClientes(),
        ]);
      
      // Filtrar pedidos baseado no papel do usuário
      const pedidosFiltrados = filtrarPedidosPorPapel(pedidosData);
      setPedidos(pedidosFiltrados);
      setProdutos(produtosData);

      const clientesOrdenados = clientesData.sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      );
      setClientes(clientesOrdenados);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarPedidosPorPapel = (todosPedidos: Pedido[]) => {
  // Filtrar pedidos do dia atual ou anteriores não pagos
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioOntem = new Date(inicioHoje.getTime() - 24 * 60 * 60 * 1000);

    const pedidosRelevantes = todosPedidos.filter(pedido => {
      const dataPedido = new Date(pedido.createdAt);
      
      // Pedidos de hoje
      if (dataPedido >= inicioHoje) return true;
      
      // Pedidos de ontem que ainda não foram pagos
      if (dataPedido >= inicioOntem && pedido.status !== 'pago') return true;
      
      return false;
    });

    // Ordenar por status na ordem: pendente, em haver, pago
    const ordemStatus = { 'pendente': 1, 'em haver': 2, 'pago': 3 };
    return pedidosRelevantes.sort((a, b) => {
      const ordemA = ordemStatus[a.status as keyof typeof ordemStatus] || 99;
      const ordemB = ordemStatus[b.status as keyof typeof ordemStatus] || 99;

      if (ordemA !== ordemB) return ordemA - ordemB;
      // Se mesmo status, ordenar por data de criação (mais recentes primeiro)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
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
        createdAt: new Date().toISOString(),
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
                ...(novoStatus === 'pago' && { entregueEm: new Date().toISOString() })
              } 
            : pedido
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const cancelarPedido = async (pedido: Pedido) => {
    const confirmar = () =>
      new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          const ok = window.confirm(
            `Deseja cancelar o pedido #${pedido.numero}? Os itens serão devolvidos ao estoque.`
          );
          resolve(ok);
        } else {
          Alert.alert(
            'Cancelar pedido',
            `Deseja cancelar o pedido #${pedido.numero}? Os itens serão devolvidos ao estoque.`,
            [
              { text: 'Voltar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Cancelar pedido', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        }
      });

    const confirmado = await confirmar();
    if (!confirmado) return;

    try {
      await PedidoService.atualizarStatus(pedido.id, 'cancelado');

      for (const item of pedido.itens) {
        await EstoqueService.atualizarEstoque(item.produto.id, +item.quantidade);
      }

      setPedidos(prev => prev.filter(p => p.id !== pedido.id));
      Alert.alert('Sucesso', 'Pedido cancelado e estoque restaurado.');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      Alert.alert('Erro', 'Falha ao cancelar o pedido.');
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

  const podeEditarOuCancelar = (pedido: Pedido) => {
    // Pedidos pagos não podem ser alterados
    if (pedido.status === 'pago') return false;

    // Admin pode sempre; operador só pode cancelar/editar o que ele criou
    if (user?.role === 'admin') return true;
    if (user?.role === 'operador' && pedido.criadoPor === user.email) return true;

    return false;
  };

  const calcularTempoPedido = (pedido: Pedido) => {
    const agora = new Date();
    const criacao = new Date(pedido.createdAt);
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
      case 'em haver': return '#3B82F6';
      case 'pago': return '#10B981';
      default: return '#F97316';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock size={16} color="#FFF" />;
      case 'em haver': return <Edit size={16} color="#FFF" />;
      case 'pago': return <CheckCircle size={16} color="#FFF" />;
      default: return <Clock size={16} color="#FFF" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em haver': return 'Em haver';
      case 'pago': return 'Pago';
      default: return status;
    }
  };

  const podecriarPedido = () => {
    return user?.role === 'admin' || user?.role === 'operador';
  };

  const salvarEdicao = async () => {
    if (!pedidoEditando) return;

    try {
      // Calcula a diferença de quantidade por produto
      const itensAntigos = pedidoEditando.itens;
      const itensNovos = itensEditados;

      // Para cada item antigo, verifica se foi removido ou teve quantidade reduzida → devolve ao estoque
      for (const itemAntigo of itensAntigos) {
        const itemNovo = itensNovos.find(i => i.produto.id === itemAntigo.produto.id);
        const qtdAntiga = itemAntigo.quantidade;
        const qtdNova = itemNovo?.quantidade ?? 0;
        const delta = qtdAntiga - qtdNova; // positivo = devolver; negativo = descontar mais

        if (delta !== 0) {
          await EstoqueService.atualizarEstoque(itemAntigo.produto.id, delta);
        }
      }

      // Para itens NOVOS que não existiam no pedido original → descontar do estoque
      for (const itemNovo of itensNovos) {
        const existiaAntes = itensAntigos.find(i => i.produto.id === itemNovo.produto.id);
        if (!existiaAntes) {
          await EstoqueService.atualizarEstoque(itemNovo.produto.id, -itemNovo.quantidade);
        }
      }

      const novoTotal = itensEditados.reduce(
        (sum, item) => sum + item.produto.preco * item.quantidade, 0
      );

      // Salva pedido atualizado
      await PedidoService.atualizarPedido(pedidoEditando.id, {
        itens: itensEditados,
        total: novoTotal,
        cliente: clienteEdicao,
      });

      setPedidos(prev =>
        prev.map(p =>
          p.id === pedidoEditando.id
            ? { ...p, itens: itensEditados, total: novoTotal, cliente: clienteEdicao }
            : p
        )
      );

      setModalEdicaoVisible(false);
      setPedidoEditando(null);
      Alert.alert('Sucesso', 'Pedido atualizado!');
    } catch (error) {
      console.error('Erro ao editar pedido:', error);
      Alert.alert('Erro', 'Falha ao atualizar o pedido.');
    }
  };

  const abrirEdicao = (pedido: Pedido) => {
    setPedidoEditando(pedido);
    setItensEditados([...pedido.itens]); // cópia dos itens atuais
    setClienteEdicao(pedido.cliente || '');
    setModalEdicaoVisible(true);
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
                  {pedido.status === 'pago' 
                    ? `Pago em ${calcularTempoPedido(pedido)}`
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

              <Text style={styles.pedidoTotal}>Total: R$ {pedido.total.toFixed(2)}</Text>
            </View>

            <View style={styles.pedidoFooter}>
              <View style={styles.statusButtons}>
                {pedido.status === 'pendente' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => atualizarStatusPedido(pedido.id, 'em haver')}
                  >
                    <Edit size={14} color="#fff" />
                    <Text style={styles.statusButtonText}>Em haver</Text>
                  </TouchableOpacity>
                )}

                {pedido.status === 'em haver' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                    onPress={() => atualizarStatusPedido(pedido.id, 'pago')}
                  >
                    <CheckCircle size={14} color="#fff" />
                    <Text style={styles.statusButtonText}>Pagar</Text>
                  </TouchableOpacity>
                )}

                {podeEditarOuCancelar(pedido) && (
                  <>
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#F59E0B' }]}
                      onPress={() => abrirEdicao(pedido)}
                    >
                      <SquarePen size={14} color="#fff" />
                      <Text style={styles.statusButtonText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#EF4444' }]}
                      onPress={() => cancelarPedido(pedido)}
                    >
                      <Trash2 size={14} color="#fff" />
                      <Text style={styles.statusButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                  </>
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

          {/* Cliente selecionado via modal */}
          <TouchableOpacity
              style={[styles.clienteInput, { justifyContent: 'center' }]}
              onPress={() => setClienteModalVisible(true)}
            >
              <Text style={{ color: clienteNome ? '#e6e6e6' : '#9a9a9a' }}>
                {clienteNome || 'Selecionar cliente (opcional)'}
              </Text>
          </TouchableOpacity>

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

      {/* Modal Edição de Pedido */}
      <Modal visible={modalEdicaoVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Pedido #{pedidoEditando?.numero}</Text>
            <TouchableOpacity onPress={() => {
              setModalEdicaoVisible(false);
              setPedidoEditando(null);
            }}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Cliente */}
          <TouchableOpacity
            style={[styles.clienteInput, { justifyContent: 'center' }]}
            onPress={() => setClienteModalVisible(true)}
          >
            <Text style={{ color: clienteEdicao ? '#e6e6e6' : '#9a9a9a' }}>
              {clienteEdicao || 'Selecionar cliente (opcional)'}
            </Text>
          </TouchableOpacity>

          {/* Lista de produtos para adicionar */}
          <ScrollView style={styles.produtosList}>
            <Text style={styles.sectionTitle}>Produtos</Text>
            {produtos.map((produto) => (
              <TouchableOpacity
                key={produto.id}
                style={styles.produtoItem}
                onPress={() => {
                  const existente = itensEditados.find(i => i.produto.id === produto.id);
                  if (existente) {
                    setItensEditados(prev =>
                      prev.map(i =>
                        i.produto.id === produto.id
                          ? { ...i, quantidade: i.quantidade + 1 }
                          : i
                      )
                    );
                  } else {
                    setItensEditados(prev => [...prev, { produto, quantidade: 1 }]);
                  }
                }}
              >
                <Text style={styles.produtoNome}>{produto.nome}</Text>
                <Text style={styles.produtoPreco}>R$ {produto.preco.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Itens atuais do pedido */}
          {itensEditados.length > 0 && (
            <View style={styles.pedidoResumo}>
              <Text style={styles.sectionTitle}>Itens do Pedido</Text>
              {itensEditados.map((item, index) => (
                <View key={index} style={styles.itemResumo}>
                  <Text style={styles.itemResumoText}>
                    {item.quantidade}x {item.produto.nome}
                  </Text>
                  <TouchableOpacity onPress={() =>
                    setItensEditados(prev => prev.filter(i => i.produto.id !== item.produto.id))
                  }>
                    <Trash2 size={16} color="#F87171" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>
                  Total: R$ {itensEditados.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0).toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity style={styles.finalizarButton} onPress={salvarEdicao}>
                <Text style={styles.finalizarButtonText}>Salvar Alterações</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={clienteModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingBottom: 12 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Cliente</Text>
            <TouchableOpacity onPress={() => setClienteModalVisible(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingBottom: 32, paddingHorizontal: 16 }}>
            <TouchableOpacity
              style={[styles.produtoItem, { marginTop: 12, marginBottom: 25, backgroundColor: '#2d2d2d' }]}
              onPress={() => {
                // Nenhum cliente selecionado
                setClienteNome('');
                setSelectedClienteId(null);
                setClienteModalVisible(false);
              }}
            >
              <Text style={{ color: '#fff' }}>Nenhum cliente</Text>
            </TouchableOpacity>

            {clientes.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.clienteItem}
                onPress={() => {
                  const nome = c.nome;
                  if (modalEdicaoVisible) {
                    setClienteEdicao(nome);
                  } else {
                    setClienteNome(nome);
                    setSelectedClienteId(c.id);
                  }
                  setClienteModalVisible(false);
                }}
              >
                <Text style={styles.clienteCliente}>{c.nome}</Text>
                <Text style={{ color: '#9f795c' }}>{c.telefone}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}