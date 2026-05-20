import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { Filter, Calendar, Users, DollarSign, ChartBar as BarChart, X, CheckSquare, Square, MessageCircle } from 'lucide-react-native';
import { ClienteService, Cliente } from '@/services/ClienteService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RelatorioService } from '@/services/RelatorioService';
import { PedidoService } from '@/services/PedidoService';
import { styles as stylesOriginal } from '../styles';
const styles: any = stylesOriginal;

interface RelatorioFinanceiro {
  periodo: { inicio: string; fim: string };
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
    id?: string;
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
  periodo: { inicio: string; fim: string };
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

const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const toInputDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

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

  const [modoAlterarStatus, setModoAlterarStatus] = useState(false);
  const [pedidosSelecionados, setPedidosSelecionados] = useState<string[]>([]);
  const [novoStatusEmLote, setNovoStatusEmLote] = useState<'pendente' | 'em haver' | 'pago' | ''>('');
  const [statusEmLoteDropdownOpen, setStatusEmLoteDropdownOpen] = useState(false);
  const [loadingAlterarStatus, setLoadingAlterarStatus] = useState(false);

  useEffect(() => {
    const dataInicialPadrao = new Date();
    dataInicialPadrao.setDate(dataInicialPadrao.getDate() - 30);
    setDataInicio(dataInicialPadrao);
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
    setPedidosSelecionados([]);
    try {
      if (tipoRelatorio === 'financeiro') {
        const clienteNomeFiltro = clienteFilterId
          ? (clientes.find(c => c.id === clienteFilterId)?.nome ?? null)
          : null;
        const statusFiltro = statusFilter === 'todos' ? null : statusFilter;
        const relatorio = await RelatorioService.getRelatorioFinanceiro(dataInicio, dataFim, clienteNomeFiltro, statusFiltro);
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

  const enviarRelatorioWhatsApp = () => {
    if (!relatorioFinanceiro || !clienteFilterId) return;
    const cliente = clientes.find(c => c.id === clienteFilterId);
    if (!cliente) return;

    const periodoInicio = new Date(relatorioFinanceiro.periodo.inicio).toLocaleDateString('pt-BR');
    const periodoFim = new Date(relatorioFinanceiro.periodo.fim).toLocaleDateString('pt-BR');

    const linhasPedidos = relatorioFinanceiro.vendas
      .map(v =>
        `- ${new Date(v.data).toLocaleDateString('pt-BR')}: ${formatCurrency(v.total)} (${getStatusLabel(v.status)})`
      )
      .join('\n');

    const totalEfetuado = relatorioFinanceiro.vendas.reduce((sum, v) => sum + v.total, 0);
    const totalPago = relatorioFinanceiro.vendas
      .filter(v => v.status === 'pago')
      .reduce((sum, v) => sum + v.total, 0);
    const totalEmHaver = relatorioFinanceiro.vendas
      .filter(v => v.status === 'em haver')
      .reduce((sum, v) => sum + v.total, 0);

    const mensagem =
      `Olá ${cliente.nome}, tudo bem?\n\n` +
      `Passando para informar o valor das compras na Manancial Café:\n\n` +
      `Período: ${periodoInicio} à ${periodoFim}\n` +
      `Pedidos: ${relatorioFinanceiro.resumo.quantidadePedidos}\n` +
      `Valor em haver: ${formatCurrency(totalEmHaver)}\n\n` +
      `Detalhes:\n${linhasPedidos}\n\n` +
      `Formas de pagamento:\n` +
      `- Pix: giovanareisdj@gmail.com\n` +
      `- Cartão de crédito: aceitamos parcelamento (com juros).\n` +
      `- Link de pagamento: envio um link para você.\n\n` +
      `Deus abençoe!`;

    const digitos = cliente.telefone.replace(/\D/g, '');
    const telefone = digitos.length <= 11 ? `55${digitos}` : digitos;
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const togglePedidoSelecionado = (id: string) => {
    setPedidosSelecionados(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const alterarStatusEmLote = async () => {
    if (!novoStatusEmLote || pedidosSelecionados.length === 0) return;
    setLoadingAlterarStatus(true);
    try {
      await Promise.all(
        pedidosSelecionados.map(id =>
          PedidoService.atualizarStatus(id, novoStatusEmLote as any)
        )
      );
      setRelatorioFinanceiro(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          vendas: prev.vendas.map(v =>
            v.id && pedidosSelecionados.includes(v.id)
              ? { ...v, status: novoStatusEmLote }
              : v
          ),
        };
      });
      setPedidosSelecionados([]);
      setNovoStatusEmLote('');
      setModoAlterarStatus(false);
      if (Platform.OS === 'web') {
        window.alert('Status atualizado com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Status atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      if (Platform.OS === 'web') {
        window.alert('Erro ao alterar status dos pedidos.');
      } else {
        Alert.alert('Erro', 'Erro ao alterar status dos pedidos.');
      }
    } finally {
      setLoadingAlterarStatus(false);
    }
  };

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  const formatDate = (date: Date) => date.toLocaleDateString('pt-BR');

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
      if (showDatePicker === 'inicio') setDataInicio(selectedDate);
      else setDataFim(selectedDate);
    }
  };

  const clientesOrdenados = [...clientes].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );

  const clienteSelecionado = clientes.find(c => c.id === clienteFilterId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Relatórios</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {relatorioFinanceiro && (
            <TouchableOpacity
              style={[styles.addButton, modoAlterarStatus && { backgroundColor: '#6b4324' }]}
              onPress={() => {
                setModoAlterarStatus(prev => !prev);
                setPedidosSelecionados([]);
                setNovoStatusEmLote('');
              }}
            >
              <CheckSquare size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => setDateFilterModalVisible(true)}>
            <Filter size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.tipoButtons}>
          <TouchableOpacity
            style={[styles.tipoButton, tipoRelatorio === 'financeiro' && styles.tipoButtonActive]}
            onPress={() => setTipoRelatorio('financeiro')}
          >
            <DollarSign size={20} color={tipoRelatorio === 'financeiro' ? '#fff' : '#888'} />
            <Text style={[styles.tipoButtonText, tipoRelatorio === 'financeiro' && styles.tipoButtonTextActive]}>
              Financeiro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tipoButton, tipoRelatorio === 'administrativo' && styles.tipoButtonActive]}
            onPress={() => setTipoRelatorio('administrativo')}
          >
            <Users size={20} color={tipoRelatorio === 'administrativo' ? '#fff' : '#888'} />
            <Text style={[styles.tipoButtonText, tipoRelatorio === 'administrativo' && styles.tipoButtonTextActive]}>
              Administrativo
            </Text>
          </TouchableOpacity>
        </View>

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
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Resumo Financeiro</Text>

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
                  relatorioFinanceiro.resumo.saldoLiquido >= 0 ? styles.valorPositivo : styles.valorNegativo,
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

            {clienteFilterId && clienteSelecionado && (
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: '#25D366', marginBottom: 16 }]}
                onPress={enviarRelatorioWhatsApp}
              >
                <MessageCircle size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Enviar relatório para cliente</Text>
              </TouchableOpacity>
            )}

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
                      mov.tipo === 'entrada' ? styles.valorPositivo : styles.valorNegativo,
                    ]}>
                      {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                    </Text>
                  </View>
                  <Text style={styles.movimentacaoDescricao}>
                    {mov.descricao} • {mov.categoria}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Vendas Detalhadas</Text>
              {relatorioFinanceiro.vendas.map((venda, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.vendaItem,
                    modoAlterarStatus && venda.id && pedidosSelecionados.includes(venda.id) && {
                      borderColor: '#6b4324',
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    if (modoAlterarStatus && venda.id) togglePedidoSelecionado(venda.id);
                  }}
                  activeOpacity={modoAlterarStatus ? 0.7 : 1}
                >
                  <View style={[styles.vendaHeader, { alignItems: 'flex-start' }]}>
                    {modoAlterarStatus && (
                      <View style={{ marginRight: 10, justifyContent: 'center', paddingTop: 2 }}>
                        {venda.id && pedidosSelecionados.includes(venda.id)
                          ? <CheckSquare size={20} color="#6b4324" />
                          : <Square size={20} color="#666" />
                        }
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vendaPedido}>
                        {venda.cliente || `Pedido #${venda.pedido}`}
                      </Text>
                      <Text style={[styles.vendaDetalhes, { marginTop: 2 }]}>
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
                </TouchableOpacity>
              ))}

              {modoAlterarStatus && (
                <View style={{ marginTop: 16, padding: 12, backgroundColor: '#111', borderRadius: 12 }}>
                  <Text style={{ color: '#e6e6e6', marginBottom: 10, fontFamily: 'Inter-Regular' }}>
                    {pedidosSelecionados.length} pedido(s) selecionado(s)
                  </Text>

                  <TouchableOpacity
                    style={[styles.input, { marginBottom: 8 }]}
                    onPress={() => setStatusEmLoteDropdownOpen(!statusEmLoteDropdownOpen)}
                  >
                    <Text style={styles.inputText}>
                      {novoStatusEmLote ? capitalizeFirst(novoStatusEmLote) : 'Selecionar novo status'}
                    </Text>
                  </TouchableOpacity>

                  {statusEmLoteDropdownOpen && (
                    <View style={{ backgroundColor: '#6b4324', borderRadius: 8, marginBottom: 8 }}>
                      {(['pendente', 'em haver', 'pago'] as const).map(s => (
                        <TouchableOpacity
                          key={s}
                          style={{ padding: 10 }}
                          onPress={() => { setNovoStatusEmLote(s); setStatusEmLoteDropdownOpen(false); }}
                        >
                          <Text style={styles.inputText}>{capitalizeFirst(s)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.generateButton,
                      (!novoStatusEmLote || pedidosSelecionados.length === 0 || loadingAlterarStatus) && { opacity: 0.5 },
                    ]}
                    onPress={alterarStatusEmLote}
                    disabled={!novoStatusEmLote || pedidosSelecionados.length === 0 || loadingAlterarStatus}
                  >
                    <Text style={styles.generateButtonText}>
                      {loadingAlterarStatus ? 'Alterando...' : 'Confirmar alteração'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
                  <Text style={styles.avaliacaoValor}>{relatorioAdministrativo.avaliacoes.total}</Text>
                </View>
                <View style={styles.avaliacaoItem}>
                  <Text style={styles.avaliacaoLabel}>Média Geral</Text>
                  <Text style={styles.avaliacaoValor}>{relatorioAdministrativo.avaliacoes.mediaGeral.toFixed(1)} ⭐</Text>
                </View>
              </View>

              <View style={styles.avaliacoesPorCategoria}>
                <Text style={styles.categoriaTitle}>Por Categoria:</Text>
                {Object.entries(relatorioAdministrativo.avaliacoes.porCategoria).map(([categoria, media]) => (
                  <View key={categoria} style={styles.categoriaItem}>
                    <Text style={styles.categoriaLabel}>{categoria}:</Text>
                    <Text style={styles.categoriaValor}>{(media as number).toFixed(1)} ⭐</Text>
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
                      <Text style={styles.statValor}>{usuario.avaliacaoMedia.toFixed(1)} ⭐</Text>
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

      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={showDatePicker === 'inicio' ? dataInicio : dataFim}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <Modal visible={dateFilterModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setDateFilterModalVisible(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            {/* Data Início */}
            {Platform.OS === 'web' ? (
              <View style={[styles.input, { justifyContent: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input
                    type="date"
                    value={toInputDate(dataInicio)}
                    onChange={(e: any) => { if (e.target.value) setDataInicio(parseInputDate(e.target.value)); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e6e6e6',
                      fontSize: 16,
                      fontFamily: 'Inter-Regular',
                      outline: 'none',
                      cursor: 'pointer',
                      colorScheme: 'dark',
                      width: '100%'
                    } as any}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker('inicio')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Calendar size={16} color="#9f795c" />
                  <Text style={styles.inputText}>De: {formatDate(dataInicio)}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Data Fim */}
            {Platform.OS === 'web' ? (
              <View style={[styles.input, { marginTop: 12, justifyContent: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input
                    type="date"
                    value={toInputDate(dataFim)}
                    onChange={(e: any) => { if (e.target.value) setDataFim(parseInputDate(e.target.value)); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e6e6e6',
                      fontSize: 16,
                      fontFamily: 'Inter-Regular',
                      outline: 'none',
                      cursor: 'pointer',
                      colorScheme: 'dark',
                      width: '100%'
                    } as any}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[styles.input, { marginTop: 12 }]} onPress={() => setShowDatePicker('fim')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Calendar size={16} color="#9f795c" />
                  <Text style={styles.inputText}>Até: {formatDate(dataFim)}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cliente select */}
            <TouchableOpacity
              style={[styles.input, { marginTop: 12 }]}
              onPress={() => setClienteDropdownOpen(!clienteDropdownOpen)}
            >
              <Text style={styles.inputText}>
                {clienteFilterId
                  ? (clientes.find(c => c.id === clienteFilterId)?.nome ?? 'Selecionar cliente')
                  : 'Todos os clientes'}
              </Text>
            </TouchableOpacity>
            {clienteDropdownOpen && (
              <View style={{ backgroundColor: '#6b4324', borderRadius: 8, marginTop: 8, maxHeight: 200 }}>
                <ScrollView>
                  <TouchableOpacity
                    style={{ padding: 10 }}
                    onPress={() => { setClienteFilterId(null); setClienteDropdownOpen(false); }}
                  >
                    <Text style={styles.inputText}>Todos os clientes</Text>
                  </TouchableOpacity>
                  {clientesOrdenados.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={{ padding: 10 }}
                      onPress={() => { setClienteFilterId(c.id); setClienteDropdownOpen(false); }}
                    >
                      <Text style={styles.inputText}>{c.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Status select */}
            <TouchableOpacity
              style={[styles.input, { marginTop: 12 }]}
              onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
            >
              <Text style={styles.inputText}>
                {statusFilter === 'todos' ? 'Todos os status' : capitalizeFirst(statusFilter)}
              </Text>
            </TouchableOpacity>
            {statusDropdownOpen && (
              <View style={{ backgroundColor: '#6b4324', borderRadius: 8, marginTop: 8 }}>
                {(['todos', 'pendente', 'em haver', 'pago'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={{ padding: 10 }}
                    onPress={() => { setStatusFilter(s); setStatusDropdownOpen(false); }}
                  >
                    <Text style={styles.inputText}>{s === 'todos' ? 'Todos' : capitalizeFirst(s)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: '#6b4324' }]}
                onPress={() => { gerarRelatorio(); setDateFilterModalVisible(false); }}
              >
                <BarChart size={18} color="#fff" />
                <Text style={styles.generateButtonText}>{loading ? 'Gerando...' : 'Aplicar'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: '#9f795c' }]}
                onPress={() => {
                  const hoje = new Date();
                  const trintaDiasAtras = new Date();
                  trintaDiasAtras.setDate(hoje.getDate() - 30);
                  setDataInicio(trintaDiasAtras);
                  setDataFim(hoje);
                  setClienteFilterId(null);
                  setStatusFilter('todos');
                }}
              >
                <Text style={[styles.generateButtonText, { textAlign: 'center', color: '#ffffff' }]}>Limpar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: '#444' }]}
                onPress={() => setDateFilterModalVisible(false)}
              >
                <Text style={styles.generateButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
