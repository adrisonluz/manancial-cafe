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
import { styles } from '../styles';

interface MovimentoCaixa {
  id: string;
  tipo: 'entrada' | 'saida';
  categoria: 'venda' | 'suprimento' | 'retirada' | 'despesa' | 'outros';
  valor: number;
  descricao: string;
  createdAt: string;
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
            <DollarSign size={48} color="#9f795c" style={{ alignSelf: 'center' }} />
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
            {formatDateTime(sessaoAtual.dataAbertura)}
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
            style={[styles.actionCaixaButton, styles.entradaButton]}
            onPress={() => {
              setFormMovimento(prev => ({...prev, tipo: 'entrada'}));
              setModalVisible(true);
            }}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Entrada</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCaixaButton, styles.saidaButton]}
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
        <Text style={styles.sectionTitle}>Movimentação</Text>
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
                  {movimento.categoria} • {formatDateTime(movimento.createdAt)}
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