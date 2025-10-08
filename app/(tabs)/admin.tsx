import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { Users, Settings, Database, Download, Upload, Shield, X, Plus, CreditCard as Edit, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { AdminService } from '@/services/AdminService';

interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'operador' | 'cozinheiro';
  ativo: boolean;
  ultimoAcesso?: string;
  criadoEm: string;
}

interface ConfiguracaoApp {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: 'string' | 'number' | 'boolean';
}

export default function AdminScreen() {
  const { user, signOut } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoApp[]>([]);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalConfig, setModalConfig] = useState(false);
  const [usuarioEdicao, setUsuarioEdicao] = useState<Usuario | null>(null);
  const [configEdicao, setConfigEdicao] = useState<ConfiguracaoApp | null>(null);
  const [loading, setLoading] = useState(true);

  const [formUsuario, setFormUsuario] = useState({
    email: '',
    nome: '',
    role: 'operador' as Usuario['role'],
    senha: '',
  });

  const [formConfig, setFormConfig] = useState({
    chave: '',
    valor: '',
    descricao: '',
    tipo: 'string' as ConfiguracaoApp['tipo'],
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Acesso Negado', 'Você não tem permissão para acessar esta área');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [usuariosData, configsData] = await Promise.all([
        AdminService.getUsuarios(),
        AdminService.getConfiguracoes(),
      ]);
      setUsuarios(usuariosData);
      setConfiguracoes(configsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModalUsuario = (usuario?: Usuario) => {
    if (usuario) {
      setUsuarioEdicao(usuario);
      setFormUsuario({
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
        senha: '',
      });
    } else {
      setUsuarioEdicao(null);
      setFormUsuario({
        email: '',
        nome: '',
        role: 'operador',
        senha: '',
      });
    }
    setModalUsuario(true);
  };

  const salvarUsuario = async () => {
    if (!formUsuario.email || !formUsuario.nome) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (!usuarioEdicao && !formUsuario.senha) {
      Alert.alert('Erro', 'Senha é obrigatória para novos usuários');
      return;
    }

    try {
      if (usuarioEdicao) {
        await AdminService.atualizarUsuario(usuarioEdicao.id, {
          nome: formUsuario.nome,
          role: formUsuario.role,
          ...(formUsuario.senha && { senha: formUsuario.senha }),
        });
        setUsuarios(prev =>
          prev.map(u => u.id === usuarioEdicao.id 
            ? { ...u, nome: formUsuario.nome, role: formUsuario.role }
            : u
          )
        );
      } else {
        const novoUsuario = await AdminService.criarUsuario({
          email: formUsuario.email,
          nome: formUsuario.nome,
          role: formUsuario.role,
          senha: formUsuario.senha,
        });
        setUsuarios(prev => [...prev, novoUsuario]);
      }
      
      setModalUsuario(false);
      Alert.alert('Sucesso', 'Usuário salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      Alert.alert('Erro', 'Falha ao salvar usuário');
    }
  };

  const alterarStatusUsuario = async (usuarioId: string, ativo: boolean) => {
    try {
      await AdminService.alterarStatusUsuario(usuarioId, ativo);
      setUsuarios(prev =>
        prev.map(u => u.id === usuarioId ? { ...u, ativo } : u)
      );
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      Alert.alert('Erro', 'Falha ao alterar status do usuário');
    }
  };

  const removerUsuario = async (usuario: Usuario) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente remover ${usuario.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.removerUsuario(usuario.id);
              setUsuarios(prev => prev.filter(u => u.id !== usuario.id));
            } catch (error) {
              console.error('Erro ao remover usuário:', error);
              Alert.alert('Erro', 'Falha ao remover usuário');
            }
          },
        },
      ]
    );
  };

  const exportarDados = async () => {
    Alert.alert(
      'Exportar Dados',
      'Deseja exportar todos os dados do sistema?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar',
          onPress: async () => {
            try {
              await AdminService.exportarDados();
              Alert.alert('Sucesso', 'Dados exportados com sucesso!');
            } catch (error) {
              console.error('Erro ao exportar:', error);
              Alert.alert('Erro', 'Falha ao exportar dados');
            }
          },
        },
      ]
    );
  };

  const backupDados = async () => {
    Alert.alert(
      'Backup de Dados',
      'Deseja criar um backup dos dados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Criar Backup',
          onPress: async () => {
            try {
              await AdminService.criarBackup();
              Alert.alert('Sucesso', 'Backup criado com sucesso!');
            } catch (error) {
              console.error('Erro ao criar backup:', error);
              Alert.alert('Erro', 'Falha ao criar backup');
            }
          },
        },
      ]
    );
  };

  const limparDados = async () => {
    Alert.alert(
      'ATENÇÃO - Limpeza de Dados',
      'Esta ação irá remover TODOS os dados antigos. Esta operação NÃO pode ser desfeita!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'LIMPAR TUDO',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmação Final',
              'Tem certeza absoluta? Todos os dados serão perdidos!',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'SIM, LIMPAR',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await AdminService.limparDados();
                      Alert.alert('Concluído', 'Dados limpos com sucesso!');
                    } catch (error) {
                      console.error('Erro ao limpar dados:', error);
                      Alert.alert('Erro', 'Falha ao limpar dados');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Shield size={48} color="#F87171" />
          <Text style={styles.accessDeniedTitle}>Acesso Restrito</Text>
          <Text style={styles.accessDeniedText}>
            Você não tem permissão para acessar esta área.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administração</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={signOut}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Seção Usuários */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Users size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Usuários</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openModalUsuario()}
            >
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {usuarios.map((usuario) => (
            <View key={usuario.id} style={styles.usuarioCard}>
              <View style={styles.usuarioInfo}>
                <Text style={styles.usuarioNome}>{usuario.nome}</Text>
                <Text style={styles.usuarioEmail}>{usuario.email}</Text>
                <Text style={styles.usuarioRole}>{usuario.role}</Text>
              </View>

              <View style={styles.usuarioActions}>
                <Switch
                  value={usuario.ativo}
                  onValueChange={(valor) => alterarStatusUsuario(usuario.id, valor)}
                  trackColor={{ false: '#333', true: '#10B981' }}
                  thumbColor={usuario.ativo ? '#fff' : '#888'}
                />
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openModalUsuario(usuario)}
                >
                  <Edit size={16} color="#3B82F6" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => removerUsuario(usuario)}
                >
                  <Trash2 size={16} color="#F87171" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Seção Dados */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Database size={20} color="#F97316" />
            <Text style={styles.sectionTitle}>Gerenciamento de Dados</Text>
          </View>

          <View style={styles.dataActions}>
            <TouchableOpacity style={styles.dataButton} onPress={exportarDados}>
              <Download size={20} color="#fff" />
              <Text style={styles.dataButtonText}>Exportar Dados</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dataButton} onPress={backupDados}>
              <Upload size={20} color="#fff" />
              <Text style={styles.dataButtonText}>Criar Backup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dataButton, styles.dangerButton]}
              onPress={limparDados}
            >
              <Trash2 size={20} color="#fff" />
              <Text style={styles.dataButtonText}>Limpar Dados</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informações do Sistema */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Settings size={20} color="#888" />
            <Text style={styles.sectionTitle}>Informações do Sistema</Text>
          </View>

          <View style={styles.systemInfo}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Versão:</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total de Usuários:</Text>
              <Text style={styles.infoValue}>{usuarios.length}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Usuários Ativos:</Text>
              <Text style={styles.infoValue}>
                {usuarios.filter(u => u.ativo).length}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal Usuário */}
      <Modal visible={modalUsuario} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {usuarioEdicao ? 'Editar Usuário' : 'Novo Usuário'}
            </Text>
            <TouchableOpacity onPress={() => setModalUsuario(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={formUsuario.nome}
                onChangeText={(text) => setFormUsuario(prev => ({...prev, nome: text}))}
                placeholder="Nome do usuário"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={[styles.input, usuarioEdicao && styles.inputDisabled]}
                value={formUsuario.email}
                onChangeText={(text) => setFormUsuario(prev => ({...prev, email: text}))}
                placeholder="email@exemplo.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                editable={!usuarioEdicao}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Função</Text>
              <View style={styles.roleButtons}>
                {[
                  { key: 'admin', label: 'Administrador' },
                  { key: 'operador', label: 'Operador' },
                  { key: 'cozinheiro', label: 'Cozinheiro' },
                ].map((role) => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleButton,
                      formUsuario.role === role.key && styles.roleButtonActive
                    ]}
                    onPress={() => setFormUsuario(prev => ({...prev, role: role.key as Usuario['role']}))}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formUsuario.role === role.key && styles.roleButtonTextActive
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Senha {!usuarioEdicao && '*'}
              </Text>
              <TextInput
                style={styles.input}
                value={formUsuario.senha}
                onChangeText={(text) => setFormUsuario(prev => ({...prev, senha: text}))}
                placeholder={usuarioEdicao ? "Deixe vazio para manter a senha atual" : "Digite a senha"}
                placeholderTextColor="#666"
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={salvarUsuario}>
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
  logoutButton: {
    backgroundColor: '#F87171',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    color: '#F87171',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  accessDeniedText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 15,
    padding: 8,
  },
  usuarioCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNome: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  usuarioEmail: {
    color: '#888',
    fontSize: 14,
    marginBottom: 2,
  },
  usuarioRole: {
    color: '#3B82F6',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  usuarioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  dataActions: {
    gap: 10,
  },
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  dangerButton: {
    backgroundColor: '#F87171',
  },
  dataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  systemInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  inputDisabled: {
    backgroundColor: '#333',
    color: '#888',
  },
  roleButtons: {
    gap: 8,
  },
  roleButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
  },
  roleButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtonTextActive: {
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
});