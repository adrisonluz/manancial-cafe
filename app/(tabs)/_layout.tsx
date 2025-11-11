import { Tabs } from 'expo-router';
import { ShoppingCart, Package, DollarSign, ChartBar as BarChart, Star, Users } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function TabLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#6b4324',
          height: 90,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#9f795c',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
        <Tabs.Screen
          key="index"
          name="index"
          options={{
            title: "Pedidos",
            tabBarIcon: ({ size, color }) => (  
              <ShoppingCart size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          key="estoque"
          name="estoque"
          options={{
            title: "Estoque",
            tabBarIcon: ({ size, color }) => (  
              <Package size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          key="caixa"
          name="caixa"
          options={{
            title: "Caixa",
            tabBarIcon: ({ size, color }) => (  
              <DollarSign size={size} color={color} />
            ),
          }}
        />
        { 
          user?.role === "admin" 
          ? (<Tabs.Screen
                key="relatorios"
                name="relatorios"
                options={{
                  title: "Relatórios",
                  tabBarIcon: ({ size, color }) => (  
                    <BarChart size={size} color={color} />
                  ),
                }}
              />) 
            : (
              <Tabs.Screen
                name="relatorios"
                options={{
                  href: null
                }}
              />
            )
        }

        { 
          user?.role === "admin" 
          ? (<Tabs.Screen
                key="avaliacoes"
                name="avaliacoes"
                options={{
                  title: "Avaliações",
                  tabBarIcon: ({ size, color }) => (  
                    <Star size={size} color={color} />
                  ),
                }}
              />) 
            : (
              <Tabs.Screen
                name="avaliacoes"
                options={{
                  href: null
                }}
              />
            )
        }

        { 
          user?.role === "admin" 
          ? (<Tabs.Screen
                key="admin"
                name="admin"
                options={{
                  title: "Admin",
                  tabBarIcon: ({ size, color }) => (  
                    <Users size={size} color={color} />
                  ),
                }}
              />) 
            : (
              <Tabs.Screen
                name="admin"
                options={{
                  href: null
                }}
              />
            )
        }
    </Tabs>
  );
}