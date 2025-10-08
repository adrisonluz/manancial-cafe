import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Calendar, TrendingUp, TrendingDown, Users, DollarSign, ChartBar as BarChart, FileText } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RelatorioService } from '@/services/RelatorioService';

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
  const [relatorioFinanceiro, setRelatorioFinanceiro] = useState<RelatorioFinanceiro | null>(null);
  const [relatorioAdministrativo, setRelatorioAdministrativo] = useState<RelatorioAdministrativo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Definir data inicial como 30 dias atrás
    const dataInicialPadrao = new Date();
    dataInicialPadrao.setDate(dataInicialPadrao.getDate() - 30);
    setDataInicio(dataInicialPadrao);
  }, []);

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      if (tipoRelatorio === 'financeiro') {
        const relatorio = await RelatorioService.getRelatorioFinanceiro(dataInicio, dataFim);
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
        <Text style={styles.headerTitle}>Relatórios</Text>
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

        <View style={styles.dateControls}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker('inicio')}
          >
            <Calendar size={16} color="#3B82F6" />
            <Text style={styles.dateButtonText}>
              De: {formatDate(dataInicio)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker('fim')}
          >
            <Calendar size={16} color="#3B82F6" />
            <Text style={styles.dateButtonText}>
              Até: {formatDate(dataFim)}
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
            <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
            
            <View style={styles.resumoGrid}>
              <View style={styles.resumoCard}>
                <Text style={styles.resumoLabel}>Total Vendas</Text>
                <Text style={[styles.resumoValor, styles.valorPositivo]}>
                  {formatCurrency(relatorioFinanceiro.resumo.totalVendas)}
                </Text>
              </View>

              <View style={styles.resumoCard}>
                <Text style={styles.resumoLabel}>Saldo Líquido</Text>
                <Text style={[
                  styles.resumoValor,
                  relatorioFinanceiro.resumo.saldoLiquido >= 0 
                    ? styles.valorPositivo 
                    : styles.valorNegativo
                ]}>
                  {formatCurrency(relatorioFinanceiro.resumo.saldoLiquido)}
                </Text>
              </View>

              <View style={styles.resumoCard}>
                <Text style={styles.resumoLabel}>Ticket Médio</Text>
                <Text style={styles.resumoValor}>
                  {formatCurrency(relatorioFinanceiro.resumo.ticketMedio)}
                </Text>
              </View>

              <View style={styles.resumoCard}>
                <Text style={styles.resumoLabel}>Pedidos</Text>
                <Text style={styles.resumoValor}>
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
              <Text style={styles.sectionTitle}>Vendas Detalhadas</Text>
              {relatorioFinanceiro.vendas.map((venda, index) => (
                <View key={index} style={styles.vendaItem}>
                  <View style={styles.vendaHeader}>
                    <Text style={styles.vendaPedido}>
                      Pedido #{venda.pedido}
                    </Text>
                    <Text style={styles.vendaTotal}>
                      {formatCurrency(venda.total)}
                    </Text>
                  </View>
                  <Text style={styles.vendaDetalhes}>
                    {new Date(venda.data).toLocaleDateString('pt-BR')} • {venda.itens} itens
                  </Text>
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
                    {relatorioAdministrativo.avaliacoes.mediaGeral.toFixed(1)}⭐
                  </Text>
                </View>
              </View>

              <View style={styles.avaliacoesPorCategoria}>
                <Text style={styles.categoriaTitle}>Por Categoria:</Text>
                {Object.entries(relatorioAdministrativo.avaliacoes.porCategoria).map(([categoria, media]) => (
                  <View key={categoria} style={styles.categoriaItem}>
                    <Text style={styles.categoriaLabel}>{categoria}:</Text>
                    <Text style={styles.categoriaValor}>{media.toFixed(1)}⭐</Text>
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
                        {usuario.avaliacaoMedia.toFixed(1)}⭐
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
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
  controls: {
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tipoButtons: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  tipoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    gap: 8,
  },
  tipoButtonActive: {
    backgroundColor: '#3B82F6',
  },
  tipoButtonText: {
    color: '#888',
    fontWeight: '600',
  },
  tipoButtonTextActive: {
    color: '#fff',
  },
  dateControls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    gap: 8,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  resumoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  resumoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  resumoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  resumoValor: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  valorPositivo: {
    color: '#10B981',
  },
  valorNegativo: {
    color: '#F87171',
  },
  section: {
    marginBottom: 25,
  },
  movimentacaoItem: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  movimentacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  movimentacaoData: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  movimentacaoValor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  movimentacaoDescricao: {
    color: '#888',
    fontSize: 12,
  },
  vendaItem: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  vendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  vendaPedido: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  vendaTotal: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  vendaDetalhes: {
    color: '#888',
    fontSize: 12,
  },
  avaliacoesResumo: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  avaliacaoItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  avaliacaoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  avaliacaoValor: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avaliacoesPorCategoria: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoriaTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  categoriaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  categoriaLabel: {
    color: '#888',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  categoriaValor: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  usuarioCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  usuarioNome: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  usuarioEmail: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  usuarioStats: {
    gap: 8,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  statValor: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  usuarioUltimoAcesso: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
});