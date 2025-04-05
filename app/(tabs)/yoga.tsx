import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Alert,
  Modal,
  GestureResponderEvent,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
// Create Supabase client
const supabaseUrl = 'https://ysavghvmswenmddlnshr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjk5NjgzMiwiZXhwIjoyMDU4NTcyODMyfQ.l8m6QdNt0aedvVnsw7Me28mSXoIA2DbWrEpla751yRg';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types
interface YogaVideo {
  id: string;
  title: string;
  youtube_id: string;
  category: string;
  thumbnail_url: string;
  created_at: string;
  created_by: string;
}

export default function YogaScreen() {
  // Get theme from context
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  
  // State variables
  const [videos, setVideos] = useState<YogaVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<YogaVideo[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedVideo, setSelectedVideo] = useState<YogaVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([
    "All", 
    "Weight Loss & Fat Burn", 
    "Strength & Muscle Tone", 
    "Flexibility & Mobility", 
    "Relaxation & Stress Relief", 
    "Energy & Mental Focus", 
    "Healing & Recovery", 
    "Meditation"
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [newVideoUrl, setNewVideoUrl] = useState<string>("");
  const [newVideoTitle, setNewVideoTitle] = useState<string>("");
  const [newVideoCategory, setNewVideoCategory] = useState<string>("Weight Loss & Fat Burn");
  // Add state for modal visibility
  const [showAddVideoModal, setShowAddVideoModal] = useState<boolean>(false);
  // Add state for delete confirmation modal
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  // Refs
  const playerRef = useRef(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const { width } = Dimensions.get("window");

  // Check if user is admin
  useEffect(() => {
    if (user?.role === "admin") {
      setIsAdmin(true);
    }
  }, [user]);

  // Load videos from Supabase
  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('yoga_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setVideos(data);
        setFilteredVideos(data);
      }
    } catch (error) {
      console.error('Error fetching yoga videos:', error);
      Alert.alert('Error', 'Failed to load yoga videos');
      // If no videos in database yet, show empty state
      setVideos([]);
      setFilteredVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Filter videos based on search query and category
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      let results = videos;
      
      // Filter by category first
      if (selectedCategory !== "All") {
        results = results.filter(video => video.category === selectedCategory);
      }
      
      // Then filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        results = results.filter(video => 
          video.title.toLowerCase().includes(query) ||
          video.category.toLowerCase().includes(query)
        );
      }
      
      setFilteredVideos(results);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, videos, selectedCategory]);

  // Extract YouTube ID from URL
  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Add new video (admin only)
  const handleAddVideo = async () => {
    if (!newVideoUrl || !newVideoTitle || !newVideoCategory) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const youtubeId = extractYoutubeId(newVideoUrl);
    if (!youtubeId) {
      Alert.alert('Error', 'Invalid YouTube URL');
      return;
    }

    // Check if user is authenticated and has admin role
    if (!user || user.role !== 'admin') {
      Alert.alert('Error', 'You need admin privileges to add videos');
      return;
    }

    setIsLoading(true);
    try {
      // Instead of checking for a session, use the existing authenticated client
      // and trust that the user object from AuthContext is valid
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
      
      const { data, error } = await supabase
        .from('yoga_videos')
        .insert([
          { 
            title: newVideoTitle, 
            youtube_id: youtubeId, 
            category: newVideoCategory,
            thumbnail_url: thumbnailUrl,
            created_by: user?.email || 'unknown'
          }
        ])
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      Alert.alert('Success', 'Video added successfully');
      setNewVideoUrl('');
      setNewVideoTitle('');
      fetchVideos(); // Refresh the list
    } catch (error: any) {
      console.error('Error adding video:', error);
      Alert.alert('Error', `Failed to add video: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle video selection
  const handleVideoSelect = (video: YogaVideo) => {
    setSelectedVideo(video);
    setIsPlaying(true);
  };

  // Close video player
  const handleClosePlayer = () => {
    setSelectedVideo(null);
    setIsPlaying(false);
  };

  // Render category pill
  const renderCategoryPill = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        {
          backgroundColor: selectedCategory === item ? theme.primary : theme.cardBackground,
          borderColor: theme.divider,
        },
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text
        style={[
          styles.categoryText,
          { color: selectedCategory === item ? '#fff' : theme.text },
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  // Render video card
  // Add function to handle video deletion
  const handleDeleteVideo = (videoId: string, event: GestureResponderEvent) => {
    // Stop the event from bubbling up to the parent (which would open the video)
    event.stopPropagation();
    setVideoToDelete(videoId);
    setDeleteModalVisible(true);
    // Add haptic feedback if available
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Add function to confirm video deletion
  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('yoga_videos')
        .delete()
        .eq('id', videoToDelete);

      if (error) throw error;
      
      // Update local state
      setVideos(videos.filter(video => video.id !== videoToDelete));
      setFilteredVideos(filteredVideos.filter(video => video.id !== videoToDelete));
      
      Alert.alert('Success', 'Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      Alert.alert('Error', 'Failed to delete video');
    } finally {
      setIsLoading(false);
      setDeleteModalVisible(false);
      setVideoToDelete(null);
    }
  };

  // Update the renderVideoCard function to include a delete button for admins
  const renderVideoCard = ({ item }: { item: YogaVideo }) => (
    <TouchableOpacity
      style={[styles.videoCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => handleVideoSelect(item)}
    >
      <Image
        source={{ uri: item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg` }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      {isAdmin && (
        <TouchableOpacity
          style={styles.deleteVideoButton}
          onPress={(event) => handleDeleteVideo(item.id, event)}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      )}
      <View style={styles.videoInfo}>
        <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.videoMeta}>
          <Text style={[styles.categoryLabel, { backgroundColor: theme.primary }]}>
            {item.category}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Add function to toggle modal
  const toggleAddVideoModal = () => {
    setShowAddVideoModal(!showAddVideoModal);
    // Reset form fields when closing
    if (showAddVideoModal) {
      setNewVideoUrl("");
      setNewVideoTitle("");
      setNewVideoCategory("Beginner");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Yoga</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Find your inner peace
        </Text>
      </View>

      {/* Search Bar with Add Button for Admin */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, flex: 1 }]}>
          <Ionicons name="search" size={20} color={theme.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search yoga videos..."
            placeholderTextColor={theme.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {/* Add Button for Admin */}
        {isAdmin && (
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.primary }]} 
            onPress={toggleAddVideoModal}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryPill}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Video List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredVideos.length > 0 ? (
        <FlatList
          data={filteredVideos}
          renderItem={renderVideoCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.videoList}
          showsVerticalScrollIndicator={false}
          numColumns={1} // Changed from 2 to 1 to show only one card per row
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="fitness-outline" size={80} color={theme.secondaryText} />
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            {searchQuery
              ? "No yoga videos match your search"
              : isAdmin
              ? "Add your first yoga video using the + button"
              : "No yoga videos available yet"}
          </Text>
        </View>
      )}

      {/* Add Video Modal */}
      {showAddVideoModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Yoga Video</Text>
              <TouchableOpacity onPress={toggleAddVideoModal}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.adminInput, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="Video Title"
              placeholderTextColor={theme.secondaryText}
              value={newVideoTitle}
              onChangeText={setNewVideoTitle}
            />
            
            <TextInput
              style={[styles.adminInput, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="YouTube URL"
              placeholderTextColor={theme.secondaryText}
              value={newVideoUrl}
              onChangeText={setNewVideoUrl}
            />
            
            <View style={styles.categorySelector}>
              <Text style={[styles.categoryLabel, { color: theme.text }]}>Category:</Text>
              <FlatList
                data={categories.filter(cat => cat !== 'All')}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.adminCategoryPill,
                      {
                        backgroundColor: newVideoCategory === item ? theme.primary : theme.cardBackground,
                        borderColor: theme.divider,
                      },
                    ]}
                    onPress={() => setNewVideoCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: newVideoCategory === item ? '#fff' : theme.text },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                handleAddVideo();
                if (!newVideoUrl || !newVideoTitle || !newVideoCategory) return;
                toggleAddVideoModal();
              }}
            >
              <Text style={styles.submitButtonText}>Add Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <View style={[styles.playerModal, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <View style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerTitle} numberOfLines={2}>
                {selectedVideo.title}
              </Text>
              <TouchableOpacity onPress={handleClosePlayer} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <YoutubePlayer
              ref={playerRef}
              height={width * 0.5625} // 16:9 aspect ratio
              width={width - 40}
              videoId={selectedVideo.youtube_id}
              play={isPlaying}
              onChangeState={(state) => {
                if (state === 'ended') {
                  setIsPlaying(false);
                }
              }}
            />
          </View>
        </View>
      )}

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
          <View style={[
            styles.deleteModal,
            { 
              backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
              shadowColor: isDark ? theme.primary : '#000',
            }
          ]}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning-outline" size={40} color="#ef4444" />
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>
                Delete Yoga Video
              </Text>
            </View>
            
            <Text style={[styles.deleteModalMessage, { color: theme.secondaryText }]}>
              Are you sure you want to delete this video? This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelDeleteButton, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setVideoToDelete(null);
                  if (Haptics) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Text style={[styles.cancelDeleteButtonText, { color: theme.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDeleteVideo}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  // New style for search row with add button
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  // Add button next to search bar
  addButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  categoriesContainer: {
    marginBottom: 15,
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  submitButton: {
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Existing styles
  videoList: {
    paddingHorizontal: 15, // Increased from 10 to 15 for better margin
    paddingBottom: 100, // Extra padding for bottom tab bar
  },
  videoCard: {
    flex: 1,
    margin: 10, // Increased from 8 to 10
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: "100%",
    height: 180, // Increased from 120 to 180 for a larger thumbnail
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  videoInfo: {
    padding: 15, // Increased from 10 to 15
  },
  videoTitle: {
    fontSize: 16, // Increased from 14 to 16
    fontWeight: "600",
    marginBottom: 8, // Increased from 5 to 8
  },
  videoMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 12,
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  playerModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  playerContainer: {
    width: "90%",
    borderRadius: 12,
    overflow: "hidden",
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#000",
  },
  playerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  adminPanel: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  adminInput: {
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  categorySelector: {
    marginBottom: 10,
  },
  adminCategoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginTop: 5,
    borderWidth: 1,
  },
  // Add styles for delete button on video card
  deleteVideoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  
  // Add styles for delete confirmation modal
  deleteModal: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
  },
  deleteModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteModalButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelDeleteButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
  },
  cancelDeleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // ... existing styles ...
});