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
import { styles } from '../styles';

interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'operador' | 'cozinheiro';
  ativo: boolean;
  ultimoAcesso?: string;
  createdAt: string;
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
              <Users size={20} color="#9f795c" />
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
            <View key={usuario.id} style={styles.usuarioAdminCard}>
              <View style={styles.usuarioAdminInfo}>
                <Text style={styles.usuarioAdminNome}>{usuario.nome}</Text>
                <Text style={styles.usuarioAdminEmail}>{usuario.email}</Text>
                <Text style={styles.usuarioAdminRole}>{usuario.role}</Text>
              </View>

              <View style={styles.usuarioAdminActions}>
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
            <Database size={20} color="#9f795c" />
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
            <Settings size={20} color="#9f795c" />
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