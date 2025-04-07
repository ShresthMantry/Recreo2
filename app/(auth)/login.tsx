import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Alert
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Loader from "../../components/Loader";
import { supabase } from "../../lib/supabase";
import { createClient } from "@supabase/supabase-js";

const { width } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
    
    
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    
    if (!password) {
      setError("Please enter your password");
      return;
    }
    
    try {
      setError("");
      setIsLoading(true); // Show loader
      const user = await login(email, password);
      if(user.activities?.length === 0) 
      {
        router.replace("/(auth)/select-activities");
      }
      else
      {
        router.replace("/(tabs)");
      }
      
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false); // Hide loader
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    try {
      setIsLoading(true);
      
      // Create a direct Supabase client instance to ensure we're using the correct credentials
      const directSupabase = createClient(
        "https://ysavghvmswenmddlnshr.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs"
      );
      
      const { error } = await directSupabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'recreo://reset-password',
      });

      if (error) {
        console.error("Reset password error details:", error);
        throw error;
      }

      setResetEmailSent(true);
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setForgotPasswordModalVisible(false);
    setResetEmail("");
    setResetEmailSent(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#FFFFFF' ? "light-content" : "dark-content"} />
        
        {/* Add the loader component */}
        <Loader 
          visible={isLoading} 
          text="Logging in..." 
          color={theme.primary}
        />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <Animated.View 
            style={[
              styles.inner, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }] 
              }
            ]}
          >
            {!isKeyboardVisible && (
              <View style={styles.logoContainer}>
                <Image 
                  source={theme.text === "#FFFFFF" 
                    ? require('../../assets/images/icon-dark.png')
                    : require('../../assets/images/icon-light.png')
                  }
                  style={styles.logo} 
                  resizeMode="contain"
                />
                <Text style={[styles.appName, { color: theme.primary }]}>RECREO</Text>
              </View>
            )}
            
            <View style={styles.headerContainer}>
              <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                Log in to continue your creative journey
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.inputBorder,
                      color: theme.text 
                    }
                  ]}
                  placeholder="Email Address"
                  placeholderTextColor={theme.secondaryText}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input, 
                    styles.passwordInput,
                    { 
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.inputBorder,
                      color: theme.text 
                    }
                  ]}
                  placeholder="Password"
                  placeholderTextColor={theme.secondaryText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity 
                  style={styles.passwordToggle}
                  onPress={togglePasswordVisibility}
                >
                  <Ionicons 
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={theme.secondaryText} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => setForgotPasswordModalVisible(true)}
              >
                <Text style={[styles.forgotPassword, { color: theme.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: theme.primary }]} 
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: theme.secondaryText }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={[styles.registerLink, { color: theme.primary }]}>
                  {" Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>

        {/* Forgot Password Modal */}
        <Modal
          visible={forgotPasswordModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeForgotPasswordModal}
        >
          <TouchableWithoutFeedback onPress={closeForgotPasswordModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>
                      {resetEmailSent ? "Email Sent" : "Reset Password"}
                    </Text>
                    <TouchableOpacity onPress={closeForgotPasswordModal}>
                      <Ionicons name="close" size={24} color={theme.secondaryText} />
                    </TouchableOpacity>
                  </View>

                  {resetEmailSent ? (
                    <View style={styles.successContainer}>
                      <Ionicons name="checkmark-circle" size={60} color={theme.success} style={styles.successIcon} />
                      <Text style={[styles.successText, { color: theme.text }]}>
                        Password reset instructions have been sent to your email.
                      </Text>
                      <Text style={[styles.successSubtext, { color: theme.secondaryText }]}>
                        Please check your inbox and follow the instructions to reset your password.
                      </Text>
                      <TouchableOpacity 
                        style={[styles.successButton, { backgroundColor: theme.primary }]}
                        onPress={closeForgotPasswordModal}
                      >
                        <Text style={styles.successButtonText}>Back to Login</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
                        Enter your email address and we'll send you instructions to reset your password.
                      </Text>
                      
                      <View style={styles.modalInputWrapper}>
                        <Ionicons name="mail-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                        <TextInput
                          style={[
                            styles.input,
                            { 
                              backgroundColor: theme.inputBackground,
                              borderColor: theme.inputBorder,
                              color: theme.text 
                            }
                          ]}
                          placeholder="Email Address"
                          placeholderTextColor={theme.secondaryText}
                          value={resetEmail}
                          onChangeText={setResetEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                        />
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.resetButton, { backgroundColor: theme.primary }]}
                        onPress={handleForgotPassword}
                      >
                        <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  headerContainer: {
    marginBottom: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
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
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  registerText: {
    fontSize: 15,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  resetButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Success state styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIcon: {
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  successButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});