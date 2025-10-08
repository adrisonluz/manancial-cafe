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
import { DollarSign, Plus, Minus, Clock, CircleCheck as CheckCircle, X, Eye, Calendar } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { CaixaService } from '@/services/CaixaService';

interface MovimentoCaixa {
  id: string;
  tipo: 'entrada' | 'saida';
  categoria: 'venda' | 'suprimento' | 'retirada' | 'despesa' | 'outros';
  valor: number;
  descricao: string;
  criadoEm: string;
  criadoPor: string;
}

interface SessaoCaixa {
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

export default function CaixaScreen() {
  const { user } = useAuth();
  const [sessaoAtual, setSessaoAtual] = useState<SessaoCaixa | null>(null);
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFechamento, setModalFechamento] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [valorAbertura, setValorAbertura] = useState('');
  const [valorFechamento, setValorFechamento] = useState('');
  
  const [formMovimento, setFormMovimento] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    categoria: 'outros',
    valor: '',
    descricao: '',
  });

  useEffect(() => {
    loadCaixaData();
  }, []);

  const loadCaixaData = async () => {
    try {
      const sessao = await CaixaService.getSessaoAtual();
      if (sessao) {
        setSessaoAtual(sessao);
        const movimentosData = await CaixaService.getMovimentos(sessao.id);
        setMovimentos(movimentosData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do caixa:', error);
    }
  };

  const abrirCaixa = async () => {
    if (!valorAbertura || parseFloat(valorAbertura) < 0) {
      Alert.alert('Erro', 'Informe um valor válido para abertura do caixa');
      return;
    }

    try {
      const novaSessao = await CaixaService.abrirCaixa(
        parseFloat(valorAbertura),
        user?.email || ''
      );
      setSessaoAtual(novaSessao);
      setValorAbertura('');
      Alert.alert('Sucesso', 'Caixa aberto com sucesso!');
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      Alert.alert('Erro', 'Falha ao abrir caixa');
    }
  };

  const fecharCaixa = async () => {
    if (!sessaoAtual || !valorFechamento) {
      Alert.alert('Erro', 'Informe o valor de fechamento');
      return;
    }

    const valorInformado = parseFloat(valorFechamento);
    const valorCalculado = calcularSaldoAtual();

    try {
      await CaixaService.fecharCaixa(
        sessaoAtual.id,
        valorInformado,
        user?.email || ''
      );
      
      setSessaoAtual(prev => prev ? {
        ...prev,
        status: 'fechado',
        valorFechamento: valorInformado,
        dataFechamento: new Date().toISOString(),
        operadorFechamento: user?.email || '',
      } : null);
      
      setModalFechamento(false);
      setValorFechamento('');
      
      const diferenca = valorInformado - valorCalculado;
      if (Math.abs(diferenca) > 0.01) {
        Alert.alert(
          'Divergência no Caixa',
          `Diferença de R$ ${diferenca.toFixed(2)}\nCalculado: R$ ${valorCalculado.toFixed(2)}\nInformado: R$ ${valorInformado.toFixed(2)}`
        );
      } else {
        Alert.alert('Sucesso', 'Caixa fechado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      Alert.alert('Erro', 'Falha ao fechar caixa');
    }
  };

  const adicionarMovimento = async () => {
    if (!sessaoAtual || !formMovimento.valor || !formMovimento.descricao) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      const novoMovimento = await CaixaService.adicionarMovimento({
        sessaoId: sessaoAtual.id,
        tipo: formMovimento.tipo,
        categoria: formMovimento.categoria,
        valor: parseFloat(formMovimento.valor),
        descricao: formMovimento.descricao,
        criadoPor: user?.email || '',
      });

      setMovimentos(prev => [novoMovimento, ...prev]);
      setFormMovimento({
        tipo: 'entrada',
        categoria: 'outros',
        valor: '',
        descricao: '',
      });
      setModalVisible(false);
      
      Alert.alert('Sucesso', 'Movimento registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar movimento:', error);
      Alert.alert('Erro', 'Falha ao registrar movimento');
    }
  };

  const calcularSaldoAtual = () => {
    if (!sessaoAtual) return 0;
    
    const totalEntradas = movimentos
      .filter(m => m.tipo === 'entrada')
      .reduce((sum, m) => sum + m.valor, 0);
    
    const totalSaidas = movimentos
      .filter(m => m.tipo === 'saida')
      .reduce((sum, m) => sum + m.valor, 0);

    return sessaoAtual.valorAbertura + totalEntradas - totalSaidas;
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  if (!sessaoAtual) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Caixa</Text>
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.openCaixaCard}>
            <DollarSign size={48} color="#3B82F6" style={{ alignSelf: 'center' }} />
            <Text style={styles.openCaixaTitle}>Abrir Caixa</Text>
            <Text style={styles.openCaixaSubtitle}>
              Informe o valor inicial para abertura do caixa
            </Text>
            
            <TextInput
              style={styles.valorInput}
              placeholder="Valor inicial (R$)"
              placeholderTextColor="#666"
              value={valorAbertura}
              onChangeText={setValorAbertura}
              keyboardType="numeric"
            />
            
            <TouchableOpacity style={styles.openButton} onPress={abrirCaixa}>
              <Text style={styles.openButtonText}>Abrir Caixa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Caixa</Text>
          <Text style={styles.headerSubtitle}>
            Aberto em {formatDateTime(sessaoAtual.dataAbertura)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.detalhesButton}
            onPress={() => setModalDetalhes(true)}
          >
            <Eye size={20} color="#fff" />
          </TouchableOpacity>
          {sessaoAtual.status === 'aberto' && (
            <TouchableOpacity
              style={styles.fecharButton}
              onPress={() => setModalFechamento(true)}
            >
              <Text style={styles.fecharButtonText}>Fechar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.resumoContainer}>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>Saldo Atual</Text>
          <Text style={styles.resumoValor}>
            {formatCurrency(calcularSaldoAtual())}
          </Text>
        </View>
      </View>

      {sessaoAtual.status === 'aberto' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.entradaButton]}
            onPress={() => {
              setFormMovimento(prev => ({...prev, tipo: 'entrada'}));
              setModalVisible(true);
            }}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Entrada</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saidaButton]}
            onPress={() => {
              setFormMovimento(prev => ({...prev, tipo: 'saida'}));
              setModalVisible(true);
            }}
          >
            <Minus size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Saída</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.movimentosList}>
        <Text style={styles.sectionTitle}>Movimentos</Text>
        {movimentos.map((movimento) => (
          <View key={movimento.id} style={styles.movimentoCard}>
            <View style={styles.movimentoHeader}>
              <View style={[
                styles.tipoIndicator,
                movimento.tipo === 'entrada' 
                  ? styles.tipoEntrada 
                  : styles.tipoSaida
              ]}>
                {movimento.tipo === 'entrada' 
                  ? <Plus size={16} color="#fff" />
                  : <Minus size={16} color="#fff" />
                }
              </View>
              
              <View style={styles.movimentoInfo}>
                <Text style={styles.movimentoDescricao}>
                  {movimento.descricao}
                </Text>
                <Text style={styles.movimentoCategoria}>
                  {movimento.categoria} • {formatDateTime(movimento.criadoEm)}
                </Text>
              </View>
              
              <Text style={[
                styles.movimentoValor,
                movimento.tipo === 'entrada' 
                  ? styles.valorPositivo 
                  : styles.valorNegativo
              ]}>
                {movimento.tipo === 'entrada' ? '+' : '-'}
                {formatCurrency(movimento.valor)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal Adicionar Movimento */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {formMovimento.tipo === 'entrada' ? 'Nova Entrada' : 'Nova Saída'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categoria</Text>
              <View style={styles.categoriaButtons}>
                {['venda', 'suprimento', 'retirada', 'despesa', 'outros'].map((categoria) => (
                  <TouchableOpacity
                    key={categoria}
                    style={[
                      styles.categoriaButton,
                      formMovimento.categoria === categoria && styles.categoriaButtonActive
                    ]}
                    onPress={() => setFormMovimento(prev => ({...prev, categoria}))}
                  >
                    <Text style={[
                      styles.categoriaButtonText,
                      formMovimento.categoria === categoria && styles.categoriaButtonTextActive
                    ]}>
                      {categoria}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Valor</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#666"
                value={formMovimento.valor}
                onChangeText={(text) => setFormMovimento(prev => ({...prev, valor: text}))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={styles.input}
                placeholder="Descrição do movimento"
                placeholderTextColor="#666"
                value={formMovimento.descricao}
                onChangeText={(text) => setFormMovimento(prev => ({...prev, descricao: text}))}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={adicionarMovimento}>
              <Text style={styles.saveButtonText}>Registrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Fechar Caixa */}
      <Modal visible={modalFechamento} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fechar Caixa</Text>
            <TouchableOpacity onPress={() => setModalFechamento(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.fechamentoInfo}>
              <Text style={styles.fechamentoLabel}>Valor Calculado:</Text>
              <Text style={styles.fechamentoValor}>
                {formatCurrency(calcularSaldoAtual())}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Valor Contado</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#666"
                value={valorFechamento}
                onChangeText={setValorFechamento}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={fecharCaixa}>
              <Text style={styles.saveButtonText}>Fechar Caixa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Detalhes */}
      <Modal visible={modalDetalhes} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalhes da Sessão</Text>
            <TouchableOpacity onPress={() => setModalDetalhes(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detalheItem}>
              <Text style={styles.detalheLabel}>Status:</Text>
              <Text style={[
                styles.detalheValor,
                sessaoAtual.status === 'aberto' ? styles.statusAberto : styles.statusFechado
              ]}>
                {sessaoAtual.status}
              </Text>
            </View>

            <View style={styles.detalheItem}>
              <Text style={styles.detalheLabel}>Abertura:</Text>
              <Text style={styles.detalheValor}>
                {formatDateTime(sessaoAtual.dataAbertura)}
              </Text>
            </View>

            {sessaoAtual.dataFechamento && (
              <View style={styles.detalheItem}>
                <Text style={styles.detalheLabel}>Fechamento:</Text>
                <Text style={styles.detalheValor}>
                  {formatDateTime(sessaoAtual.dataFechamento)}
                </Text>
              </View>
            )}

            <View style={styles.detalheItem}>
              <Text style={styles.detalheLabel}>Valor Abertura:</Text>
              <Text style={styles.detalheValor}>
                {formatCurrency(sessaoAtual.valorAbertura)}
              </Text>
            </View>

            {sessaoAtual.valorFechamento && (
              <View style={styles.detalheItem}>
                <Text style={styles.detalheLabel}>Valor Fechamento:</Text>
                <Text style={styles.detalheValor}>
                  {formatCurrency(sessaoAtual.valorFechamento)}
                </Text>
              </View>
            )}

            <View style={styles.detalheItem}>
              <Text style={styles.detalheLabel}>Total Entradas:</Text>
              <Text style={styles.valorPositivo}>
                +{formatCurrency(movimentos
                  .filter(m => m.tipo === 'entrada')
                  .reduce((sum, m) => sum + m.valor, 0)
                )}
              </Text>
            </View>

            <View style={styles.detalheItem}>
              <Text style={styles.detalheLabel}>Total Saídas:</Text>
              <Text style={styles.valorNegativo}>
                -{formatCurrency(movimentos
                  .filter(m => m.tipo === 'saida')
                  .reduce((sum, m) => sum + m.valor, 0)
                )}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detalhesButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 8,
  },
  fecharButton: {
    backgroundColor: '#F87171',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fecharButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  openCaixaCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  openCaixaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  openCaixaSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 25,
  },
  valorInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    width: '100%',
  },
  openButton: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumoContainer: {
    padding: 15,
  },
  resumoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  resumoLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  resumoValor: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  entradaButton: {
    backgroundColor: '#10B981',
  },
  saidaButton: {
    backgroundColor: '#F87171',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  movimentosList: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  movimentoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  movimentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipoIndicator: {
    borderRadius: 20,
    padding: 6,
  },
  tipoEntrada: {
    backgroundColor: '#10B981',
  },
  tipoSaida: {
    backgroundColor: '#F87171',
  },
  movimentoInfo: {
    flex: 1,
  },
  movimentoDescricao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  movimentoCategoria: {
    color: '#888',
    fontSize: 12,
  },
  movimentoValor: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  valorPositivo: {
    color: '#10B981',
  },
  valorNegativo: {
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
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
  },
  categoriaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoriaButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoriaButtonActive: {
    backgroundColor: '#3B82F6',
  },
  categoriaButtonText: {
    color: '#888',
    fontSize: 14,
  },
  categoriaButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fechamentoInfo: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  fechamentoLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 5,
  },
  fechamentoValor: {
    color: '#3B82F6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  detalheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
  statusAberto: {
    color: '#10B981',
  },
  statusFechado: {
    color: '#888',
  },
});