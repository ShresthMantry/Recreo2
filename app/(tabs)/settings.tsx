import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Switch,
  Animated,
  ScrollView,
  Modal
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const activitiesList = [
  "Music",
  "Drawing",
  "Books",
  "Journal",
  "Community Sharing",
  "Games",
  "Yoga"
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { theme, isDark, toggleTheme, themeMode, setThemeMode } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(user?.activities || []);
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Animation for success modal
  useEffect(() => {
    if (showSuccessModal) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide the modal after 2 seconds
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccessModal(false);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter((item) => item !== activity));
    } else if (selectedActivities.length < 3) {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const handleSave = async () => {
    await updateUser({ name, activities: selectedActivities });
    setShowSuccessModal(true);
    // router.replace("/(tabs)/settings"); - No need to replace the route
  };

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Success Modal */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="none"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.successModal, 
              { 
                backgroundColor: theme.cardBackground,
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={50} color={theme.success} />
            </View>
            <Text style={[styles.successTitle, { color: theme.text }]}>Success!</Text>
            <Text style={[styles.successMessage, { color: theme.secondaryText }]}>
              Your settings have been updated
            </Text>
          </Animated.View>
        </View>
      </Modal>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.inner}>
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
            <Text style={[styles.emailText, { color: theme.secondaryText }]}>{user?.email}</Text>
          </View>

          {/* Profile Section */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                    color: theme.text 
                  }
                ]}
                placeholder="Name"
                placeholderTextColor={theme.secondaryText}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Theme Section */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
            
            <View style={styles.themeToggleContainer}>
              <View style={styles.themeOption}>
                <TouchableOpacity 
                  style={[
                    styles.themeButton, 
                    themeMode === 'light' && styles.activeThemeButton,
                    { borderColor: theme.divider }
                  ]}
                  onPress={() => handleThemeModeChange('light')}
                >
                  <Ionicons 
                    name="sunny" 
                    size={24} 
                    color={themeMode === 'light' ? theme.primary : theme.secondaryText} 
                  />
                </TouchableOpacity>
                <Text style={[styles.themeText, { color: theme.text }]}>Light</Text>
              </View>
              
              <View style={styles.themeOption}>
                <TouchableOpacity 
                  style={[
                    styles.themeButton, 
                    themeMode === 'dark' && styles.activeThemeButton,
                    { borderColor: theme.divider }
                  ]}
                  onPress={() => handleThemeModeChange('dark')}
                >
                  <Ionicons 
                    name="moon" 
                    size={24} 
                    color={themeMode === 'dark' ? theme.primary : theme.secondaryText} 
                  />
                </TouchableOpacity>
                <Text style={[styles.themeText, { color: theme.text }]}>Dark</Text>
              </View>
              
              <View style={styles.themeOption}>
                <TouchableOpacity 
                  style={[
                    styles.themeButton, 
                    themeMode === 'system' && styles.activeThemeButton,
                    { borderColor: theme.divider }
                  ]}
                  onPress={() => handleThemeModeChange('system')}
                >
                  <Ionicons 
                    name="phone-portrait" 
                    size={24} 
                    color={themeMode === 'system' ? theme.primary : theme.secondaryText} 
                  />
                </TouchableOpacity>
                <Text style={[styles.themeText, { color: theme.text }]}>System</Text>
              </View>
            </View>
          </View>

          {/* Activities Section */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferred Activities</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
              Select up to 3 activities that interest you
            </Text>
            
            <View style={styles.activitiesContainer}>
              {activitiesList.map((item) => {
                const isSelected = selectedActivities.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.activityItem,
                      { 
                        backgroundColor: isSelected ? theme.primary : theme.surfaceHover,
                        borderColor: isSelected ? theme.primary : theme.divider,
                      }
                    ]}
                    onPress={() => toggleActivity(item)}
                  >
                    <Text 
                      style={[
                        styles.activityText, 
                        { color: isSelected ? "#ffffff" : theme.text }
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primary }]} 
              onPress={handleSave}
            >
              <Ionicons name="save-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: theme.error }]} 
              onPress={logout}
            >
              <Ionicons name="log-out-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 24,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingLeft: 48,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  themeOption: {
    alignItems: 'center',
  },
  themeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  activeThemeButton: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityItem: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    marginBottom: 16,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activityText: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkmark: {
    position: 'absolute',
    right: 10,
  },
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // New styles for the success modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successModal: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
});