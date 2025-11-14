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
  Linking 
} from 'react-native';
import { Button } from 'react-native-elements';
import { Plus, Clock, CircleCheck as CheckCircle, X, CreditCard as Edit, Trash2, ChefHat, Truck } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { ClienteService } from '@/services/ClienteService';
import { PhoneOutgoing } from 'lucide-react-native';
import { styles } from '../styles';

interface Cliente {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  createdAt: string;
}

export default function ClientesScreen() {
    const { user } = useAuth();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteEdicao, setClienteEdicao] = useState<Cliente | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [clienteNome, setClienteNome] = useState('');
    const [loading, setLoading] = useState(true);
    const wpUrl = `https://wa.me/55`;

    const [formCliente, setFormCliente] = useState({
        email: '',
        nome: '',
        telefone: '',
    });

  useEffect(() => {
    loadData();
    // Atualizar dados a cada 30 segundos para mostrar tempos atualizados
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [clientesData] = await Promise.all([
        ClienteService.getClientes(),
      ]);

      setClientes(clientesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarCliente = async () => {
      if (!formCliente.email || !formCliente.nome) {
          Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
          return;
      }
  
      try {
          if (clienteEdicao) {
          await ClienteService.atualizarCliente(clienteEdicao.id, {
              nome: formCliente.nome,
          });
          setClientes(prev =>
              prev.map(u => u.id === clienteEdicao.id 
              ? { ...u, nome: formCliente.nome }
              : u
              )
          );
          } else {
              const novoCliente = await ClienteService.criarCliente({
                  email: formCliente.email,
                  nome: formCliente.nome,
                  telefone: formCliente.telefone
              });

              setClientes(prev => [...prev, novoCliente]);
          }
          
          setModalVisible(false);
          Alert.alert('Sucesso', 'Usuário salvo com sucesso!');
      } catch (error) {
          console.error('Erro ao salvar usuário:', error);
          Alert.alert('Erro', 'Falha ao salvar usuário');
      }
  };

  const openWhatsApp = async (phone: string) => {
    const phoneFormatted = phone.replace(/\D/g, "");
    try {
      const supported = await Linking.canOpenURL(wpUrl + phoneFormatted);
      if (supported) {
        await Linking.openURL(wpUrl + phoneFormatted);
      } else {
        Alert.alert(`Não foi possível encontrar o contato em questão.`);
      }
    } catch (error) {
      Alert.alert(`Erro ao tentar encontrar o contato. Erro: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clientes</Text>
          <Text style={styles.headerSubtitle}>
            Todos os clientes
          </Text>
        </View>
        <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {clientes.map((cliente) => (
          <View key={cliente.id} style={styles.clienteCard}>
            <View style={styles.clienteHeader}>
              <View style={styles.clienteInfo}>
                <Text style={styles.clienteNumero}>{cliente.nome}</Text>
                {cliente.id && (
                  <Text style={styles.clienteCliente}>{cliente.email}</Text>
                )}
                <Text style={styles.clienteTempo}>
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>

            <View style={styles.pedidoFooter}>
              <Text style={styles.pedidoTotal}>{cliente.telefone}</Text>
              <View style={styles.statusButtons}>
                <Button 
                  style={styles.statusButton}
                  color="#51CE70"
                  icon={
                    <PhoneOutgoing
                      size={15}
                      color="white"
                    />
                  }
                  onPress={() => openWhatsApp(cliente.telefone)}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

        {/* Modal Novo Cliente */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                {clienteEdicao ? 'Editar Cliente' : 'Novo Cliente'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
                <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome*</Text>
                <TextInput
                    style={styles.input}
                    value={formCliente.nome}
                    onChangeText={(text) => setFormCliente(prev => ({...prev, nome: text}))}
                    placeholder="Nome do usuário"
                    placeholderTextColor="#666"
                />
                </View>

                <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email*</Text>
                <TextInput
                    style={[styles.input, clienteEdicao && styles.inputDisabled]}
                    value={formCliente.email}
                    onChangeText={(text) => setFormCliente(prev => ({...prev, email: text}))}
                    placeholder="email@exemplo.com"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    editable={!clienteEdicao}
                />
                </View>

                <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefone*</Text>
                <TextInput
                    style={[styles.input, clienteEdicao && styles.inputDisabled]}
                    value={formCliente.telefone}
                    onChangeText={(text) => setFormCliente(prev => ({...prev, telefone: text}))}
                    placeholder="(51) 99999-9999"
                    placeholderTextColor="#666"
                    keyboardType='numeric'
                    editable={!clienteEdicao}
                />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={salvarCliente}>
                <Text style={styles.saveButtonText}>Salvar</Text>
                </TouchableOpacity>
            </ScrollView>
            </View>
        </Modal>
    </View>
  );
}