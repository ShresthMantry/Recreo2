import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

// Initialize Supabase client
const supabase = createClient(
  "https://ysavghvmswenmddlnshr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjk5NjgzMiwiZXhwIjoyMDU4NTcyODMyfQ.l8m6QdNt0aedvVnsw7Me28mSXoIA2DbWrEpla751yRg"
);

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  user_metadata: {
    name: string;
    role: string;
    activities: string[];
  };
}

export default function Users() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.replace('/(tabs)');
      return;
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(lowercaseQuery) || 
        user.email.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get users from auth
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        // If admin API fails, try getting users from a different approach
        // This is a fallback since the admin API might not be available with anon key
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData && sessionData.session) {
          // Get users from a custom endpoint or table if available
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*');
            
          if (usersError) throw usersError;
          
          const formattedUsers = usersData.map(userData => ({
            id: userData.id,
            email: userData.email || '',
            name: userData.name || '',
            role: userData.role || 'user',
            created_at: userData.created_at,
            user_metadata: {
              name: userData.name || '',
              role: userData.role || 'user',
              activities: userData.activities || []
            }
          }));
          
          setUsers(formattedUsers);
          setFilteredUsers(formattedUsers);
        } else {
          throw error;
        }
      } else if (data && data.users) {
        const formattedUsers = data.users.map(user => ({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || '',
          role: user.user_metadata?.role || 'user',
          created_at: user.created_at,
          user_metadata: user.user_metadata || { name: '', role: 'user', activities: [] }
        }));

        // Filter out the current admin
        const filtered = formattedUsers.filter(profile => 
          profile.id !== user?.id
        );

        setUsers(filtered);
        setFilteredUsers(filtered);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    try {
      setProcessingUserId(userId);
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      
      // First try the admin API
      try {
        const { data, error } = await supabase.auth.admin.updateUserById(
          userId,
          { user_metadata: { role: newRole } }
        );
        
        if (error) throw error;
      } catch (adminError) {
        // Fallback to updating user metadata through a different method
        console.log("Admin API failed, trying alternative method");
        
        // This is a placeholder - you might need a custom endpoint or function
        const { error } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', userId);
          
        if (error) throw error;
      }

      // Update local state
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, role: newRole, user_metadata: { ...u.user_metadata, role: newRole } } : u
      );
      
      setUsers(updatedUsers);
      setFilteredUsers(
        searchQuery.trim() === '' 
          ? updatedUsers 
          : updatedUsers.filter(u => 
              u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              u.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
      );

      Alert.alert('Success', `User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    } finally {
      setProcessingUserId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingUserId(userId);
              // Try admin API first
              try {
                const { error } = await supabase.auth.admin.deleteUser(userId);
                if (error) throw error;
              } catch (adminError) {
                console.log("Admin API failed, trying alternative method");
                
                // Fallback to a custom endpoint or function
                const { error } = await supabase
                  .from('users')
                  .delete()
                  .eq('id', userId);
                  
                if (error) throw error;
              }

              // Update local state
              const updatedUsers = users.filter(u => u.id !== userId);
              setUsers(updatedUsers);
              setFilteredUsers(
                searchQuery.trim() === '' 
                  ? updatedUsers 
                  : updatedUsers.filter(u => 
                      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      u.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
              );
              
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            } finally {
              setProcessingUserId(null);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.cardBackground }]}>User Management</Text>
          <Text style={[styles.headerSubtitle, { color: theme.cardBackground + 'CC' }]}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} in your application
          </Text>
        </View>
      </LinearGradient>
      
      <View style={styles.contentContainer}>
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
          <Ionicons name="search" size={20} color={theme.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name or email..."
            placeholderTextColor={theme.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={searchQuery ? "search-outline" : "people-outline"} 
                size={70} 
                color={theme.secondaryText} 
                style={styles.emptyIcon} 
              />
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                {searchQuery ? "No users match your search" : "No users found"}
              </Text>
              <TouchableOpacity 
                style={[styles.emptyButton, { backgroundColor: theme.primary }]}
                onPress={handleRefresh}
              >
                <Text style={styles.emptyButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.userCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.userAvatarContainer}>
                <LinearGradient
                  colors={item.role === 'admin' ? [theme.primary, theme.secondary] : [isDark ? theme.surface : '#E0E0E0', isDark ? theme.surfaceHover : '#BDBDBD']}
                  style={styles.userAvatar}
                >
                  <Text style={styles.userInitial}>
                    {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </LinearGradient>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {item.name || 'Unnamed User'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
                  {item.email}
                </Text>
                
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      {
                        backgroundColor: item.role === 'admin' 
                          ? `${theme.primary}20` 
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                      }
                    ]}
                    onPress={() => toggleUserRole(item.id, item.role)}
                    disabled={processingUserId === item.id}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      {
                        color: item.role === 'admin' ? theme.primary : isDark ? theme.secondaryText : '#555555'
                      }
                    ]}>
                      {item.role === 'admin' ? 'ADMIN' : 'USER'}
                    </Text>
                    <Ionicons 
                      name={item.role === 'admin' ? 'shield' : 'person'} 
                      size={14} 
                      color={item.role === 'admin' ? theme.primary : isDark ? theme.secondaryText : '#555555'} 
                      style={styles.roleIcon}
                    />
                  </TouchableOpacity>
                  
                  {processingUserId === item.id ? (
                    <ActivityIndicator size="small" color={theme.primary} style={styles.actionIndicator} />
                  ) : (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteUser(item.id)}
                    >
                      <LinearGradient
                        colors={['#FF5252', '#FF1744']}
                        style={styles.deleteButtonGradient}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  clearButton: {
    padding: 6,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  emptyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatarContainer: {
    marginRight: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  roleIcon: {
    marginLeft: 4,
  },
  actionIndicator: {
    marginLeft: 'auto',
    marginRight: 8,
  },
  deleteButton: {
    marginLeft: 'auto',
  },
  deleteButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});