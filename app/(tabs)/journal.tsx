import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Keyboard,
  Dimensions,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // Add theme context
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const supabase = createClient(
  "https://ysavghvmswenmddlnshr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

interface JournalEntry {
  id?: number;
  user_id: string;
  date: string;
  content: string;
  mood?: string;
  created_at?: string;
  updated_at?: string;
}

export default function Journal() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme(); // Get theme context
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("neutral");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Add state for modal visibility
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const contentScrollRef = useRef<ScrollView>(null);

  const moods = [
    { label: "Great", value: "great", icon: "sunny-outline", color: "#FFD700" },
    { label: "Good", value: "good", icon: "partly-sunny-outline", color: "#4CAF50" },
    { label: "Neutral", value: "neutral", icon: "contrast-outline", color: "#9E9E9E" },
    { label: "Bad", value: "bad", icon: "rainy-outline", color: "#607D8B" },
    { label: "Terrible", value: "terrible", icon: "thunderstorm-outline", color: "#F44336" },
  ];

  const getPastDays = (count = 7) => {
    const days = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(format(date, "yyyy-MM-dd"));
    }
    return days;
  };

  useEffect(() => {
    if (user) {
      fetchEntries();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedDate) {
      fetchEntriesForDate(selectedDate);
    }
  }, [selectedDate, user]);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, { // Add slide animation
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, fadeAnim, scaleAnim, slideAnim]);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from("journal_")
        .select("*")
        .eq("user_id", user.email)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setEntries(data || []);
      if (data && data.length > 0) {
        setSelectedDate(data[0].date);
        setSelectedEntryId(data[0].id || null);
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
      Alert.alert("Error", "Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntriesForDate = async (date: string) => {
    try {
      setIsLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from("journal_")
        .select("*")
        .eq("user_id", user.email)
        .eq("date", date)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Select the most recent entry by default
        setCurrentEntry(data[0]);
        setContent(data[0].content);
        setMood(data[0].mood || "neutral");
        setSelectedEntryId(data[0].id || null);
      } else {
        setCurrentEntry(null);
        setContent("");
        setMood("neutral");
        setSelectedEntryId(null);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error fetching entries:", error);
      Alert.alert("Error", "Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  // Get screen dimensions for better positioning
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const saveEntry = async () => {
    try {
      if (!user) {
        Alert.alert("Error", "You must be logged in to save entries");
        return;
      }

      // Validate content
      if (content.trim() === "") {
        Alert.alert("Error", "Journal entry cannot be empty");
        return;
      }

      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Dismiss keyboard to prevent layout issues
      Keyboard.dismiss();

      const entryData: JournalEntry = {
        user_id: user.email,
        date: selectedDate,
        content,
        mood,
        updated_at: new Date().toISOString(),
      };

      let result;
      let isNewEntry = false;
      
      if (selectedEntryId) {
        // Update existing entry
        result = await supabase
          .from("journal_")
          .update(entryData)
          .eq("id", selectedEntryId);
      } else {
        // Create new entry
        isNewEntry = true;
        entryData.created_at = new Date().toISOString();
        result = await supabase
          .from("journal_")
          .insert(entryData);
      }

      if (result.error) throw result.error;

      // Refresh entries and scroll to top
      await fetchEntries();
      await fetchEntriesForDate(selectedDate);
      setIsEditing(false);
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTo({ y: 0, animated: true });
      }
      
      // Show success message
      setSuccessMessage(isNewEntry ? "Journal entry created successfully" : "Journal entry updated successfully");
      
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Error", "Failed to save journal entry");
    } finally {
      setIsSaving(false);
    }
  };

  
  const deleteEntry = async () => {
    try {
      if (!selectedEntryId) return;
      
      // Show the custom delete modal instead of Alert
      setDeleteModalVisible(true);
      
    } catch (error) {
      console.error("Error deleting entry:", error);
      Alert.alert("Error", "Failed to delete journal entry");
      setIsLoading(false);
    }
  };

  const confirmDeleteEntry = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const { error } = await supabase
        .from("journal_")
        .delete()
        .eq("id", selectedEntryId);
  
      if (error) throw error;
      
      // After deleting, refresh entries
      await fetchEntries();
      await fetchEntriesForDate(selectedDate);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show success message
      setSuccessMessage("Journal entry deleted successfully");
      
      // Hide the modal
      setDeleteModalVisible(false);
    } catch (error) {
      console.error("Error deleting entry:", error);
      Alert.alert("Error", "Failed to delete journal entry");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const createNewEntry = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSelectedDate(today);
    setContent("");
    setMood("neutral");
    setCurrentEntry(null);
    setSelectedEntryId(null);
    setIsEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const selectEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setContent(entry.content);
    setMood(entry.mood || "neutral");
    setSelectedEntryId(entry.id || null);
    setIsEditing(false);
  };

  const getEntriesForSelectedDate = () => {
    return entries.filter(entry => entry.date === selectedDate);
  };

  useEffect(() => {
    // Keyboard listeners for better UI adjustment
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    if (successMessage) {
      // Animate success message
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSuccessMessage(null);
      });
    }
  }, [successMessage]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={styles.emptyStateContainer}>
          <Ionicons name="journal-outline" size={60} color={theme.secondaryText} />
          <Text style={[styles.title, { color: theme.text }]}>Journal</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Please log in to access your journal
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Success message toast */}
      {successMessage && (
        <Animated.View 
          style={[
            styles.successToast, 
            { 
              opacity: successAnim,
              transform: [{ translateY: successAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}],
              backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6',
              borderLeftColor: theme.primary
            }
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
          <Text style={[styles.successText, { color: theme.text }]}>{successMessage}</Text>
        </Animated.View>
      )}
      
      {/* Mood Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={moodModalVisible}
        onRequestClose={() => setMoodModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMoodModalVisible(false)}
        >
          <View style={[
            styles.moodModal,
            { 
              backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
              shadowColor: isDark ? theme.primary : '#000',
            }
          ]}>
            <View style={styles.moodModalHeader}>
              <Text style={[styles.moodModalTitle, { color: theme.text }]}>
                How are you feeling today?
              </Text>
              <TouchableOpacity
                onPress={() => setMoodModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.moodOptionsContainer}>
              {moods.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.moodOptionCard,
                    { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' },
                    mood === m.value && [
                      styles.selectedMoodOptionCard,
                      { borderColor: m.color }
                    ],
                  ]}
                  onPress={() => {
                    setMood(m.value);
                    setMoodModalVisible(false);
                    if (isEditing) {
                      Haptics.selectionAsync();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={30}
                    color={m.color}
                  />
                  <Text style={[
                    styles.moodOptionCardText,
                    { color: theme.text },
                    mood === m.value && { 
                      color: m.color,
                      fontWeight: "600"
                    },
                  ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
<Modal
  animationType="fade"
  transparent={true}
  visible={deleteModalVisible}
  onRequestClose={() => setDeleteModalVisible(false)}
>
  <TouchableOpacity 
    style={styles.modalOverlay}
    activeOpacity={1}
    onPress={() => setDeleteModalVisible(false)}
  >
    <Animated.View style={[
      styles.deleteModal,
      { 
        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
        shadowColor: isDark ? theme.primary : '#000',
        transform: [{ scale: deleteModalVisible ? 1 : 0.9 }]
      }
    ]}>
      <View style={styles.deleteModalHeader}>
        <Ionicons name="warning-outline" size={40} color="#ef4444" />
        <Text style={[styles.deleteModalTitle, { color: theme.text }]}>
          Delete Journal Entry
        </Text>
      </View>
      
      <Text style={[styles.deleteModalMessage, { color: theme.secondaryText }]}>
        Are you sure you want to delete this entry? This action cannot be undone.
      </Text>
      
      <View style={styles.deleteModalButtons}>
        <TouchableOpacity
          style={[styles.deleteModalButton, styles.cancelDeleteButton, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}
          onPress={() => {
            setDeleteModalVisible(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text style={[styles.cancelDeleteButtonText, { color: theme.secondaryText }]}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.deleteModalButton, styles.confirmDeleteButton]}
          onPress={confirmDeleteEntry}
        >
          <Text style={styles.confirmDeleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  </TouchableOpacity>
</Modal>
      

      {/* Header section */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>Daily Journal</Text>
        
        <TouchableOpacity 
          style={[styles.newButton, { backgroundColor: `${theme.primary}15` }]}
          onPress={createNewEntry}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={24} color={theme.primary} />
          <Text style={[styles.newButtonText, { color: theme.primary }]}>New Entry</Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Date selector - keep this visible unless editing with keyboard */}
      {(!keyboardVisible || !isEditing) && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.dateSelector}
          contentContainerStyle={styles.dateSelectorContent}
        >
          {getPastDays(14).map((date) => (
            <TouchableOpacity
              key={date}
              style={[
                styles.dateButton,
                { backgroundColor: isDark ? '#1e1e1e' : '#f3f4f6' },
                selectedDate === date && { backgroundColor: theme.primary },
              ]}
              onPress={() => {
                setSelectedDate(date);
                Haptics.selectionAsync();
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dateButtonText,
                { color: isDark ? '#d1d5db' : '#4b5563' },
                selectedDate === date && { color: '#ffffff' },
              ]}>
                {format(parseISO(date), "MMM d")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Entry selector - keep this visible unless editing with keyboard */}
      {(!keyboardVisible || !isEditing) && getEntriesForSelectedDate().length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.entrySelector}
          contentContainerStyle={styles.entrySelectorContent}
        >
          {getEntriesForSelectedDate().map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[
                styles.entryButton,
                { backgroundColor: isDark ? '#1e1e1e' : '#f3f4f6' },
                selectedEntryId === entry.id && { backgroundColor: theme.primary },
              ]}
              onPress={() => {
                selectEntry(entry);
                Haptics.selectionAsync();
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.entryButtonText,
                { color: isDark ? '#d1d5db' : '#4b5563' },
                selectedEntryId === entry.id && { color: '#ffffff' },
              ]}>
                {format(parseISO(entry.created_at || entry.date), "h:mm a")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* KeyboardAvoidingView with shadow box */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.contentContainer,
          isEditing && keyboardVisible && { paddingBottom: 20 }
        ]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 20}
      >
        <Animated.View
          style={[
            styles.journalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
              shadowColor: isDark ? theme.primary : '#000',
              // Dynamic height based on editing state
              height: isEditing ? 
                keyboardVisible ? SCREEN_HEIGHT * 0.45 : SCREEN_HEIGHT * 0.6 : 
                'auto',
              minHeight: isEditing ? 350 : 250,
              maxHeight: isEditing ? 
                keyboardVisible ? SCREEN_HEIGHT * 0.5 : SCREEN_HEIGHT * 0.7 : 
                SCREEN_HEIGHT * 0.6,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <>
              <View style={[styles.journalHeader, { borderBottomColor: isDark ? '#2d2d2d' : '#e5e7eb' }]}>
                <Text style={[styles.journalDate, { color: theme.text }]}>
                  {formatDateForDisplay(selectedDate)}
                </Text>
                
                <View style={styles.moodContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      // Open modal instead of showing inline selector
                      if (isEditing || currentEntry) {
                        setMoodModalVisible(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={[styles.moodButton, { backgroundColor: `${theme.primary}15` }]}
                    activeOpacity={0.7}
                    disabled={!isEditing && !currentEntry}
                  >
                    <Ionicons
                      name={(moods.find(m => m.value === mood)?.icon as any)}
                      size={24}
                      color={moods.find(m => m.value === mood)?.color || theme.primary}
                    />
                    <Text style={[
                      styles.moodText, 
                      { color: currentEntry || isEditing ? theme.primary : theme.secondaryText }
                    ]}>
                      {moods.find(m => m.value === mood)?.label || "Mood"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isEditing ? (
                <TextInput
                  style={[
                    styles.editor,
                    { 
                      color: theme.text,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      // Adjust height based on keyboard visibility
                      height: keyboardVisible ? 150 : 250,
                      maxHeight: keyboardVisible ? '60%' : '70%'
                    }
                  ]}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  placeholder="Write your thoughts for today..."
                  placeholderTextColor={theme.secondaryText}
                  autoFocus
                />
              ) : (
                <ScrollView 
                  ref={contentScrollRef}
                  style={styles.contentScroll}
                  contentContainerStyle={styles.contentScrollContainer}
                >
                  {currentEntry ? (
                    <Text style={[styles.journalContent, { color: theme.text }]}>
                      {content}
                    </Text>
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <Ionicons name="create-outline" size={40} color={theme.secondaryText} />
                      <Text style={[styles.emptyState, { color: theme.secondaryText }]}>
                        No entry for this date. Tap 'New Entry' to create one.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
<View style={[
                styles.actionButtons, 
                { 
                  borderTopColor: isDark ? '#2d2d2d' : '#e5e7eb',
                  paddingBottom: keyboardVisible && isEditing ? 10 : 16,
                  marginBottom: 8
                }
              ]}>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        styles.cancelButton,
                        { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }
                      ]}
                      onPress={() => {
                        setIsEditing(false);
                        setShowMoodSelector(false);
                        if (currentEntry) {
                          setContent(currentEntry.content);
                          setMood(currentEntry.mood || "neutral");
                        } else {
                          setContent("");
                          setMood("neutral");
                        }
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Keyboard.dismiss();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelButtonText, { color: theme.secondaryText }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        styles.saveButton,
                        { 
                          backgroundColor: content.trim() === "" ? `${theme.primary}50` : theme.primary,
                          opacity: content.trim() === "" ? 0.7 : 1
                        }
                      ]}
                      onPress={saveEntry}
                      disabled={isSaving || content.trim() === ""}
                      activeOpacity={0.7}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {currentEntry && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          styles.deleteButton,
                          { backgroundColor: "rgba(239, 68, 68, 0.1)" }
                        ]}
                        onPress={deleteEntry}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        styles.editButton,
                        { backgroundColor: `${theme.primary}15` }
                      ]}
                      onPress={() => {
                        setIsEditing(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                      disabled={!currentEntry}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={20} color={theme.primary} />
                      <Text style={[styles.editButtonText, { color: theme.primary }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    fontWeight: "600",
    marginLeft: 4,
  },
  dateSelector: {
    marginBottom: 8,
    maxHeight: 40,
  },
  dateSelectorContent: {
    paddingRight: 16,
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
  },
  dateButtonText: {
    fontWeight: "500",
    fontSize: 14,
  },
  entrySelector: {
    marginBottom: 8,
    maxHeight: 40,
  },
  entrySelectorContent: {
    paddingRight: 16,
  },
  entryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
  },
  entryButtonText: {
    fontWeight: "500",
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
  },
  journalContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  journalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  journalDate: {
    fontSize: 18,
    fontWeight: "600",
  },
  moodContainer: {
    flexDirection: "row",
  },
  moodButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  moodText: {
    marginLeft: 4,
    fontWeight: "500",
  },
  moodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  moodOption: {
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
  },
  selectedMoodOption: {
    borderWidth: 0,
  },
  moodOptionText: {
    marginTop: 4,
    fontSize: 12,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  editor: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
    minHeight: 200,
    borderRadius: 8,
    padding: 12,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    flexGrow: 1,
  },
  journalContent: {
    fontSize: 16,
    lineHeight: 24,
    paddingBottom: 20,
  },
  emptyState: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 10,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    marginBottom: -18,
  },
  editButton: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  saveButton: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  editButtonText: {
    fontWeight: "600",
    marginLeft: 4,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    marginLeft: 4,
  },
  successToast: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Add new styles for the mood modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 3,
    paddingTop: 20, // Add more padding at the top to move modal down
  },
  moodModal: {
    width: '90%', // Slightly smaller width
    borderRadius: 16,
    padding: 18, // Reduced padding
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: '70%', // Limit maximum height
  },
  moodModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // Reduced margin
  },
  moodModalTitle: {
    fontSize: 20, // Smaller font
    fontWeight: '600',
  },
  closeButton: {
    padding: 4, // Smaller padding
  },
  moodOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodOptionCard: {
    width: '48%',
    padding: 12, // Reduced padding
    marginBottom: 12, // Reduced margin
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    height: 90, // Fixed height for consistency
  },
  selectedMoodOptionCard: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  moodOptionCardText: {
    marginTop: 6, // Reduced margin
    fontSize: 14, // Smaller font
    fontWeight: '500',
    textAlign: 'center',
  },
  deleteModal: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  deleteModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: '45%',
    alignItems: 'center',
  },
  cancelDeleteButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelDeleteButtonText: {
    fontWeight: '600',
  },
  confirmDeleteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});