import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Filter, Calendar, TrendingUp, TrendingDown, Users, DollarSign, ChartBar as BarChart, X } from 'lucide-react-native';
import { ClienteService, Cliente } from '@/services/ClienteService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RelatorioService } from '@/services/RelatorioService';
import { styles as stylesOriginal } from '../styles';
const styles: any = stylesOriginal;

interface RelatorioFinanceiro {
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
    cliente?: string;
    clienteNome?: string;
    status?: 'pendente' | 'em haver' | 'pago' | string;
  }>;
}

interface RelatorioAdministrativo {
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

export default function RelatoriosScreen() {
  const [tipoRelatorio, setTipoRelatorio] = useState<'financeiro' | 'administrativo'>('financeiro');
  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState<'inicio' | 'fim' | null>(null);
  const [dateFilterModalVisible, setDateFilterModalVisible] = useState(false);
  const [relatorioFinanceiro, setRelatorioFinanceiro] = useState<RelatorioFinanceiro | null>(null);
  const [relatorioAdministrativo, setRelatorioAdministrativo] = useState<RelatorioAdministrativo | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [clienteFilterId, setClienteFilterId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'em haver' | 'pago'>('todos');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  useEffect(() => {
    // Definir data inicial como 30 dias atrás
    const dataInicialPadrao = new Date();
    dataInicialPadrao.setDate(dataInicialPadrao.getDate() - 30);
    setDataInicio(dataInicialPadrao);
    // carregar clientes para filtro
    (async () => {
      try {
        const cs = await ClienteService.getClientes();
        setClientes(cs);
      } catch (err) {
        console.error('Erro ao carregar clientes:', err);
      }
    })();
  }, []);

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      if (tipoRelatorio === 'financeiro') {
        // Passar filtros: cliente (nome) e status. Se clienteFilterId estiver definido,
        // buscar o nome correspondente nos clientes carregados.
        const clienteNomeFiltro = clienteFilterId ? (clientes.find(c => c.id === clienteFilterId)?.nome ?? null) : null;
        const statusFiltro = statusFilter === 'todos' ? null : statusFilter;
        const relatorio = await RelatorioService.getRelatorioFinanceiro(dataInicio, dataFim, clienteNomeFiltro, statusFiltro);
        // Redundância: aplicar filtro adicional no frontend caso o serviço não retorne filtros aplicados
        if (clienteNomeFiltro || statusFiltro) {
          relatorio.vendas = relatorio.vendas.filter(v => {
            if (clienteNomeFiltro && (v.cliente || '') !== clienteNomeFiltro) return false;
            if (statusFiltro && (v.status || '') !== statusFiltro) return false;
            return true;
          });
        }
        setRelatorioFinanceiro(relatorio);
        setRelatorioAdministrativo(null);
      } else {
        const relatorio = await RelatorioService.getRelatorioAdministrativo(dataInicio, dataFim);
        setRelatorioAdministrativo(relatorio);
        setRelatorioFinanceiro(null);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pendente': return '#F97316';
      case 'em haver': return '#3B82F6';
      case 'pago': return '#10B981';
      default: return '#999';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em haver': return 'Em haver';
      case 'pago': return 'Pago';
      default: return status || '';
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate) {
      if (showDatePicker === 'inicio') {
        setDataInicio(selectedDate);
      } else {
        setDataFim(selectedDate);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Relatórios</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setDateFilterModalVisible(true)}>
          <Filter size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.tipoButtons}>
          <TouchableOpacity
            style={[
              styles.tipoButton,
              tipoRelatorio === 'financeiro' && styles.tipoButtonActive
            ]}
            onPress={() => setTipoRelatorio('financeiro')}
          >
            <DollarSign size={20} color={tipoRelatorio === 'financeiro' ? '#fff' : '#888'} />
            <Text style={[
              styles.tipoButtonText,
              tipoRelatorio === 'financeiro' && styles.tipoButtonTextActive
            ]}>
              Financeiro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tipoButton,
              tipoRelatorio === 'administrativo' && styles.tipoButtonActive
            ]}
            onPress={() => setTipoRelatorio('administrativo')}
          >
            <Users size={20} color={tipoRelatorio === 'administrativo' ? '#fff' : '#888'} />
            <Text style={[
              styles.tipoButtonText,
              tipoRelatorio === 'administrativo' && styles.tipoButtonTextActive
            ]}>
              Administrativo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date filters moved to header modal */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={gerarRelatorio}
          disabled={loading}
        >
          <BarChart size={20} color="#fff" />
          <Text style={styles.generateButtonText}>
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {relatorioFinanceiro && (
          <View>
            <Text style={[styles.sectionTitle, { marginBottom: 10}]}>Resumo Financeiro</Text>
            
            <View style={styles.resumoGrid}>
              <View style={[styles.resumoCard, styles.resumoRelatorioCard]}>
                <Text style={styles.resumoLabel}>Total Vendas</Text>
                <Text style={[styles.resumoValor, styles.resumoRelatorioValor, styles.valorPositivo]}>
                  {formatCurrency(relatorioFinanceiro.resumo.totalVendas)}
                </Text>
              </View>

              <View style={[styles.resumoCard, styles.resumoRelatorioCard]}>
                <Text style={styles.resumoLabel}>Saldo Líquido</Text>
                <Text style={[
                  styles.resumoValor,
                  styles.resumoRelatorioValor,
                  relatorioFinanceiro.resumo.saldoLiquido >= 0 
                    ? styles.valorPositivo 
                    : styles.valorNegativo
                ]}>
                  {formatCurrency(relatorioFinanceiro.resumo.saldoLiquido)}
                </Text>
              </View>

              <View style={[styles.resumoCard, styles.resumoRelatorioCard]}>
                <Text style={styles.resumoLabel}>Ticket Médio</Text>
                <Text style={[styles.resumoValor, styles.resumoRelatorioValor]}>
                  {formatCurrency(relatorioFinanceiro.resumo.ticketMedio)}
                </Text>
              </View>

              <View style={[styles.resumoCard, styles.resumoRelatorioCard]}>
                <Text style={styles.resumoLabel}>Pedidos</Text>
                <Text style={[styles.resumoValor, styles.resumoRelatorioValor]}>
                  {relatorioFinanceiro.resumo.quantidadePedidos}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Movimentações</Text>
              {relatorioFinanceiro.movimentacoes.map((mov, index) => (
                <View key={index} style={styles.movimentacaoItem}>
                  <View style={styles.movimentacaoHeader}>
                    <Text style={styles.movimentacaoData}>
                      {new Date(mov.data).toLocaleDateString('pt-BR')}
                    </Text>
                    <Text style={[
                      styles.movimentacaoValor,
                      mov.tipo === 'entrada' ? styles.valorPositivo : styles.valorNegativo
                    ]}>
                      {mov.tipo === 'entrada' ? '+' : '-'}
                      {formatCurrency(mov.valor)}
                    </Text>
                  </View>
                  <Text style={styles.movimentacaoDescricao}>
                    {mov.descricao} • {mov.categoria}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: 10}]}>Vendas Detalhadas</Text>
              {relatorioFinanceiro.vendas.map((venda, index) => (
                <View key={index} style={styles.vendaItem}>
                  <View style={[styles.vendaHeader, { alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vendaPedido}>
                        {venda.cliente || `Pedido #${venda.pedido}`}
                      </Text>
                      <Text style={[styles.vendaDetalhes, { marginTop: 2}]}>
                        {new Date(venda.data).toLocaleDateString('pt-BR')} • {venda.itens} itens
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.vendaTotal}>
                        {formatCurrency(venda.total)}
                      </Text>
                      {venda.status && (
                        <Text style={[styles.vendaDetalhes, { color: getStatusColor(venda.status), marginTop: 2 }]}>
                          {getStatusLabel(venda.status)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {relatorioAdministrativo && (
          <View>
            <Text style={styles.sectionTitle}>Resumo Administrativo</Text>

            <View style={styles.section}>
              <Text style={styles.sectionSubtitle}>Avaliações</Text>
              <View style={styles.avaliacoesResumo}>
                <View style={styles.avaliacaoItem}>
                  <Text style={styles.avaliacaoLabel}>Total de Avaliações</Text>
                  <Text style={styles.avaliacaoValor}>
                    {relatorioAdministrativo.avaliacoes.total}
                  </Text>
                </View>
                
                <View style={styles.avaliacaoItem}>
                  <Text style={styles.avaliacaoLabel}>Média Geral</Text>
                  <Text style={styles.avaliacaoValor}>
                    {relatorioAdministrativo.avaliacoes.mediaGeral.toFixed(1)} ⭐
                  </Text>
                </View>
              </View>

              <View style={styles.avaliacoesPorCategoria}>
                <Text style={styles.categoriaTitle}>Por Categoria:</Text>
                {Object.entries(relatorioAdministrativo.avaliacoes.porCategoria).map(([categoria, media]) => (
                  <View key={categoria} style={styles.categoriaItem}>
                    <Text style={styles.categoriaLabel}>{categoria}:</Text>
                    <Text style={styles.categoriaValor}>{media.toFixed(1)} ⭐</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionSubtitle}>Usuários</Text>
              {relatorioAdministrativo.usuarios.map((usuario, index) => (
                <View key={index} style={styles.usuarioCard}>
                  <Text style={styles.usuarioNome}>{usuario.nome}</Text>
                  <Text style={styles.usuarioEmail}>{usuario.email}</Text>
                  
                  <View style={styles.usuarioStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Dias Trabalhados:</Text>
                      <Text style={styles.statValor}>{usuario.diasTrabalhados}</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Pedidos Criados:</Text>
                      <Text style={styles.statValor}>{usuario.pedidosCriados}</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Avaliação Média:</Text>
                      <Text style={styles.statValor}>
                        {usuario.avaliacaoMedia.toFixed(1)} ⭐
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.usuarioUltimoAcesso}>
                    Último acesso: {new Date(usuario.ultimoAcesso).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'inicio' ? dataInicio : dataFim}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Date filter modal */}
      <Modal visible={dateFilterModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros de Data</Text>
            <TouchableOpacity onPress={() => setDateFilterModalVisible(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            {/* Data Início - styled like standard input */}
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker('inicio')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#9f795c" />
                <Text style={styles.inputText}>De: {formatDate(dataInicio)}</Text>
              </View>
            </TouchableOpacity>

            {/* Data Fim - styled like standard input */}
            <TouchableOpacity style={[styles.input, { marginTop: 12 }]} onPress={() => setShowDatePicker('fim')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#9f795c" />
                <Text style={styles.inputText}>Até: {formatDate(dataFim)}</Text>
              </View>
            </TouchableOpacity>

            {/* Cliente select */}
            <TouchableOpacity style={[styles.input, { marginTop: 12 }]} onPress={() => setClienteDropdownOpen(!clienteDropdownOpen)}>
              <Text style={styles.inputText}>{clienteFilterId ? (clientes.find(c => c.id === clienteFilterId)?.nome ?? 'Selecionar cliente') : 'Todos os clientes'}</Text>
            </TouchableOpacity>
            {clienteDropdownOpen && (
              <View style={{ backgroundColor: '#6b4324', borderRadius: 8, marginTop: 8, maxHeight: 200 }}>
                <ScrollView>
                  <TouchableOpacity style={{ padding: 10 }} onPress={() => { setClienteFilterId(null); setClienteDropdownOpen(false); }}>
                    <Text style={styles.inputText}>Todos os clientes</Text>
                  </TouchableOpacity>
                  {clientes.map(c => (
                    <TouchableOpacity key={c.id} style={{ padding: 10 }} onPress={() => { setClienteFilterId(c.id); setClienteDropdownOpen(false); }}>
                      <Text style={styles.inputText}>{c.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Status select */}
            <TouchableOpacity style={[styles.input, { marginTop: 12 }]} onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}>
              <Text style={styles.inputText}>{statusFilter === 'todos' ? 'Todos os status' : statusFilter}</Text>
            </TouchableOpacity>
            {statusDropdownOpen && (
              <View style={{ backgroundColor: '#6b4324', borderRadius: 8, marginTop: 8 }}>
                {['todos','pendente','em haver','pago'].map(s => (
                  <TouchableOpacity key={s} style={{ padding: 10 }} onPress={() => { setStatusFilter(s as any); setStatusDropdownOpen(false); }}>
                    <Text style={styles.inputText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
              <TouchableOpacity style={[styles.generateButton, { backgroundColor: '#6b4324' }]} onPress={() => { gerarRelatorio(); setDateFilterModalVisible(false); }}>
                <BarChart size={18} color="#6b4324" />
                <Text style={styles.generateButtonText}>{loading ? 'Gerando...' : 'Aplicar'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.generateButton, { backgroundColor: '#444' }]} onPress={() => setDateFilterModalVisible(false)}>
                <Text style={styles.generateButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}