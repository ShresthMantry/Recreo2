import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  RefreshControl,
  Animated,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import * as Haptics from "expo-haptics";
import { decode } from 'base64-arraybuffer';
import { BlurView } from 'expo-blur';

// Initialize Supabase client
const supabase = createClient(
  "https://ysavghvmswenmddlnshr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
);

interface Post {
  id: string;
  user_email: string;
  username: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  likes_count?: number;
}

interface LikedPosts {
  [key: string]: boolean;
}


interface Comment {
  id: string;
  post_id: string;
  user_email: string;
  username: string;
  content: string;
  created_at: string;
}

// Add new interfaces for delete confirmation
interface DeleteConfirmation {
  visible: boolean;
  type: "post" | "comment";
  id: string;
}

interface SuccessMessage {
  visible: boolean;
  message: string;
}


const { width, height } = Dimensions.get('window');

export default function CommunitySharing() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [newCommentContent, setNewCommentContent] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "comments">("feed");
  const { theme, isDark } = useTheme();

  const commentsFlatListRef = useRef<FlatList>(null);

  const [likedPosts, setLikedPosts] = useState<LikedPosts>({});
  
  
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "content" | "username">("all");
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  
  // New state for create post modal
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);

  // Add new state for delete confirmation and success message
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    visible: false,
    type: "post",
    id: ""
  });
  const [successMessage, setSuccessMessage] = useState<SuccessMessage>({
    visible: false,
    message: ""
  });
  // Animation values for delete confirmation and success message
  const deleteModalAnim = useRef(new Animated.Value(0)).current;
  const successModalAnim = useRef(new Animated.Value(0)).current;
  const successIconAnim = useRef(new Animated.Value(0)).current;

  

  
  // Animation values
  const fabAnim = useRef(new Animated.Value(1)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const postAnimations = useRef<{[key: string]: Animated.Value}>({}).current;

  const generateTempId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleError = (error: any) => {
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    Alert.alert("Error", error.message || "An unexpected error occurred");
  };

  const getImageUrl = (path: string) => {
    return `https://ysavghvmswenmddlnshr.supabase.co/storage/v1/object/public/community-images/${path}`;
  };

  const uploadImage = async (uri: string) => {
    try {
      console.log("Starting image upload, URI:", uri);
      
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.email}/${Date.now()}.${fileExt}`;
      
      console.log("Uploading to Supabase with path:", fileName);
      
      const { data, error } = await supabase.storage
        .from("community-images")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: false,
          cacheControl: '3600',
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw error;
      }
      
      console.log("Upload successful:", data);
      return fileName;
    } catch (error) {
      console.error("Upload image error:", error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Add the sharePost function
  const sharePost = async (post: Post) => {
    try {
      let shareContent = {
        message: `${post.username} shared: ${post.content}`,
        url: post.image_url || undefined
      };
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
          showSuccessMessage("Post shared successfully");
        } else {
          // Shared
          showSuccessMessage("Post shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error) {
      handleError(error);
    }
  };

  // Fetch all posts
  useEffect(() => {
    if (user?.email) {
      fetchPosts();
    }
  }, [user?.email]);

  // Fetch comments for selected post
  useEffect(() => {
    if (selectedPostId) {
      fetchComments(selectedPostId);
    }
  }, [selectedPostId]);

  // Initialize post animations when posts change
  useEffect(() => {
    posts.forEach(post => {
      if (!postAnimations[post.id]) {
        postAnimations[post.id] = new Animated.Value(0);
        
        // Animate each post entry
        Animated.spring(postAnimations[post.id], {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [posts]);

  // Animate search bar on mount
  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Add function to fetch user's liked posts
  const fetchLikedPosts = async () => {
    if (!user?.email) return;
    
    try {
      const { data, error } = await supabase
        .from("community_likes")
        .select("post_id")
        .eq("user_email", user.email);
      
      if (error) throw error;
      
      const likedPostsMap: LikedPosts = {};
      data?.forEach(item => {
        likedPostsMap[item.post_id] = true;
      });
      
      setLikedPosts(likedPostsMap);
    } catch (error) {
      handleError(error);
    }
  };



  // Update fetchPosts to include likes_count
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Enhance posts with full image URLs
      const postsWithImages = data?.map(post => ({
        ...post,
        image_url: post.image_url ? getImageUrl(post.image_url) : null
      })) || [];
      
      setPosts(postsWithImages);
      
      // Fetch liked posts after fetching posts
      fetchLikedPosts();
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Add function to handle liking/unliking posts
  const toggleLike = async (postId: string) => {
    if (!user?.email) return;
    
    try {
      // Optimistic update
      const isCurrentlyLiked = likedPosts[postId];
      
      // Update UI immediately
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !isCurrentlyLiked
      }));
      
      setPosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes_count: (post.likes_count || 0) + (isCurrentlyLiked ? -1 : 1) 
              } 
            : post
        )
      );
      
      // Provide haptic feedback
      Haptics.impactAsync(
        isCurrentlyLiked 
          ? Haptics.ImpactFeedbackStyle.Light 
          : Haptics.ImpactFeedbackStyle.Medium
      );
      
      if (isCurrentlyLiked) {
        // Unlike post
        const { error } = await supabase
          .from("community_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_email", user.email);
          
        if (error) throw error;
      } else {
        // Like post
        const { error } = await supabase
          .from("community_likes")
          .insert({
            post_id: postId,
            user_email: user.email
          });
          
        if (error) throw error;
      }
    } catch (error) {
      // Revert optimistic update on error
      handleError(error);
      fetchPosts(); // Refresh to get correct state
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      handleError(error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "You need to allow access to your media library to pick an image.");
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        // Add haptic feedback when image is selected
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const openCreatePostModal = () => {
    // Reset content and image
    setNewPostContent("");
    setImage(null);
    
    setShowCreatePostModal(true);
    // Animate FAB
    Animated.sequence([
      Animated.timing(fabAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fabAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Animate modal
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeCreatePostModal = () => {
    // Animate modal closing
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCreatePostModal(false);
      setImage(null);
      setNewPostContent("");
    });
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const createPost = async () => {
    if (!user?.email || !newPostContent.trim()) return;

    const tempId = generateTempId();
    const username = user.name || user.email.split("@")[0] || "Anonymous";
    
    // Create optimistic post (without image URL first)
    const optimisticPost: Post = {
      id: tempId,
      user_email: user.email,
      username,
      content: newPostContent,
      image_url: null, // Will be updated after upload
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Close modal first
    closeCreatePostModal();
    
    // Add post to state
    setPosts(prev => [optimisticPost, ...prev]);
    
    // Initialize animation for the new post
    postAnimations[tempId] = new Animated.Value(0);
    Animated.spring(postAnimations[tempId], {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    // Success haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let imageUrl: string | null = null;
    if (image) {
      try {
        setUploading(true);
        imageUrl = await uploadImage(image);
        console.log("Image uploaded successfully:", imageUrl);
        
        // Update the optimistic post with the image URL
        setPosts(prev => prev.map(post => 
          post.id === tempId ? { ...post, image_url: imageUrl ? getImageUrl(imageUrl) : null } : post
        ));
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        Alert.alert(
          "Image Upload Failed",
          "Your post was created without the image.",
          [{ text: "OK" }]
        );
      } finally {
        setUploading(false);
        setImage(null);
      }
    }

    // Create the actual post in database
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .insert([{
          user_email: user.email,
          username,
          content: newPostContent,
          image_url: imageUrl, // This is the storage path, not full URL
        }])
        .select();

      if (error) throw error;

      console.log("Post created successfully:", data[0]);
      
      // Replace optimistic post with actual post from database
      setPosts(prev => prev.map(post => 
        post.id === tempId ? { 
          ...data[0], 
          image_url: data[0].image_url ? getImageUrl(data[0].image_url) : null 
        } : post
      ));
    } catch (error) {
      handleError(error);
      // Remove the optimistic post if creation failed
      setPosts(prev => prev.filter(post => post.id !== tempId));
    }
  };

  const addComment = async () => {
    try {
      if (!user?.email || !selectedPostId || !newCommentContent.trim()) return;

      const tempId = generateTempId();
      const username = user.name || user.email.split("@")[0] || "Anonymous";
      
      const optimisticComment: Comment = {
        id: tempId,
        post_id: selectedPostId,
        user_email: user.email,
        username,
        content: newCommentContent,
        created_at: new Date().toISOString(),
      };

      setComments(prev => [...prev, optimisticComment]);
      setNewCommentContent("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const { data, error } = await supabase
        .from("community_comments")
        .insert([{
          post_id: selectedPostId,
          user_email: user.email,
          username,
          content: newCommentContent,
        }])
        .select();

      if (error) throw error;

      setComments(prev => prev.map(comment => comment.id === tempId ? data[0] : comment));
    } catch (error) {
      handleError(error);
      setComments(prev => prev.filter(comment => comment.id.startsWith('temp-')));
    }
  };

  // Replace deletePost function
  const deletePost = async (postId: string) => {
    try {
      // Show delete confirmation
      setDeleteConfirmation({
        visible: true,
        type: "post",
        id: postId
      });
      
      // Animate the modal
      Animated.spring(deleteModalAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      handleError(error);
    }
  };

  // Replace deleteComment function
  const deleteComment = async (commentId: string) => {
    try {
      // Show delete confirmation
      setDeleteConfirmation({
        visible: true,
        type: "comment",
        id: commentId
      });
      
      // Animate the modal
      Animated.spring(deleteModalAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      handleError(error);
    }
  };

  // Add new function to confirm deletion
  const confirmDelete = async () => {
    try {
      // Close the confirmation modal first
      closeDeleteConfirmation();
      
      if (deleteConfirmation.type === "post") {
        const postId = deleteConfirmation.id;
        const postToDelete = posts.find(post => post.id === postId);
        
        // Animate the post removal
        Animated.timing(postAnimations[postId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Optimistic update
          setPosts(prev => prev.filter(post => post.id !== postId));
          if (selectedPostId === postId) {
            setSelectedPostId(null);
            setViewMode("feed");
          }
        });
        
        // Delete from database
        const { error } = await supabase
          .from("community_posts")
          .delete()
          .eq("id", postId);

        if (error) throw error;
        
        // Delete the image from storage if it exists
        if (postToDelete?.image_url) {
          try {
            const imagePath = postToDelete.image_url.replace('https://ysavghvmswenmddlnshr.supabase.co/storage/v1/object/public/community-images/', '');
            await supabase.storage
              .from("community-images")
              .remove([imagePath]);
          } catch (imageDeleteError) {
            console.error("Failed to delete image:", imageDeleteError);
          }
        }
        
        // Show success message
        showSuccessMessage("Post deleted successfully");
      } else {
        const commentId = deleteConfirmation.id;
        
        // Optimistic update
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        
        // Delete from database
        const { error } = await supabase
          .from("community_comments")
          .delete()
          .eq("id", commentId);

        if (error) throw error;
        
        // Show success message
        showSuccessMessage("Comment deleted successfully");
      }
    } catch (error) {
      handleError(error);
      if (deleteConfirmation.type === "post") {
        fetchPosts();
      } else if (selectedPostId) {
        fetchComments(selectedPostId);
      }
    }
  };

  // Add function to close delete confirmation
  const closeDeleteConfirmation = () => {
    Animated.timing(deleteModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDeleteConfirmation(prev => ({...prev, visible: false}));
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Add function to show success message
  const showSuccessMessage = (message: string) => {
    setSuccessMessage({
      visible: true,
      message
    });
    
    // Animate success modal and icon
    Animated.sequence([
      Animated.spring(successModalAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.spring(successIconAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
    
    // Haptic success feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Auto hide after 2 seconds
    setTimeout(() => {
      closeSuccessMessage();
    }, 2000);
  };

  // Add function to close success message
  const closeSuccessMessage = () => {
    Animated.parallel([
      Animated.timing(successModalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(successIconAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setSuccessMessage(prev => ({...prev, visible: false}));
      // Reset animation values
      successIconAnim.setValue(0);
    });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  // Filter posts based on search query and filter type
  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    switch (filterType) {
      case "content":
        return post.content.toLowerCase().includes(query);
      case "username":
        return post.username.toLowerCase().includes(query);
      case "all":
      default:
        return (
          post.content.toLowerCase().includes(query) ||
          post.username.toLowerCase().includes(query)
        );
    }
  });

  // Toggle filter options visibility
  const toggleFilterOptions = () => {
    setShowFilterOptions(!showFilterOptions);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Set filter type and hide options
  const setFilter = (type: "all" | "content" | "username") => {
    setFilterType(type);
    setShowFilterOptions(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Text style={[styles.title, { color: theme.text }]}>Community</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Please log in to access the community
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        {viewMode === "comments" ? (
          <>
            <TouchableOpacity
              onPress={() => {
                setViewMode("feed");
                setSelectedPostId(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.backButton, { backgroundColor: theme.surfaceHover }]}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Community</Text>
            <View style={styles.headerRightPlaceholder} />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.text }]}>Community</Text>
            <TouchableOpacity
              onPress={openCreatePostModal}
              style={[styles.createButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Post</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
       {/* Create Post Modal */}
             {/* Create Post Modal */}
             <Modal
        visible={showCreatePostModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeCreatePostModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <BlurView intensity={isDark ? 40 : 20} style={styles.blurView} tint={isDark ? "dark" : "light"}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.cardBackground,
                  transform: [{ scale: modalScaleAnim }],
                  opacity: modalOpacityAnim
                }
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create Post</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={createPost}
                    disabled={!newPostContent.trim() || uploading}
                    style={[
                      styles.headerPostButton,
                      { backgroundColor: theme.primary },
                      (!newPostContent.trim() || uploading) && styles.disabledButton,
                    ]}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.headerPostButtonText}>Post</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeCreatePostModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TextInput
                style={[
                  styles.postInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                  },
                ]}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.secondaryText}
                multiline
                value={newPostContent}
                onChangeText={setNewPostContent}
              />
              
              {image && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => {
                      setImage(null);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[styles.removeImageButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Image picker button only */}
              <TouchableOpacity
                onPress={pickImage}
                style={[styles.imagePickerButton, { backgroundColor: theme.surfaceHover }]}
              >
                <Ionicons name="image-outline" size={20} color={theme.primary} />
                <Text style={[styles.imagePickerText, { color: theme.text }]}>Add Image</Text>
              </TouchableOpacity>
              
              {/* Remove the dismiss keyboard button */}
            </Animated.View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

       {/* Delete Confirmation Modal */}
       <Modal
        visible={deleteConfirmation.visible}
        transparent={true}
        animationType="none"
        onRequestClose={closeDeleteConfirmation}
      >
        <BlurView intensity={isDark ? 40 : 20} style={styles.blurView} tint={isDark ? "dark" : "light"}>
          <Animated.View
            style={[
              styles.deleteModalContent,
              {
                backgroundColor: theme.cardBackground,
                transform: [
                  { scale: deleteModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  }) }
                ],
                opacity: deleteModalAnim
              }
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <Ionicons 
                name="warning" 
                size={40} 
                color={theme.error} 
                style={styles.deleteWarningIcon} 
              />
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>
                Confirm Delete
              </Text>
            </View>
            
            <Text style={[styles.deleteModalMessage, { color: theme.secondaryText }]}>
              {deleteConfirmation.type === "post" 
                ? "Are you sure you want to delete this post? This action cannot be undone."
                : "Are you sure you want to delete this comment? This action cannot be undone."
              }
            </Text>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                onPress={closeDeleteConfirmation}
                style={[styles.deleteModalButton, { backgroundColor: theme.surfaceHover }]}
              >
                <Text style={[styles.deleteModalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmDelete}
                style={[styles.deleteModalButton, { backgroundColor: theme.error }]}
              >
                <Text style={styles.deleteModalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

       {/* Success Message Modal */}
       <Modal
        visible={successMessage.visible}
        transparent={true}
        animationType="none"
      >
        <View style={styles.successModalContainer}>
          <Animated.View
            style={[
              styles.successModalContent,
              {
                backgroundColor: theme.cardBackground,
                transform: [
                  { translateY: successModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0]
                  }) }
                ],
                opacity: successModalAnim
              }
            ]}
          >
            <Animated.View
              style={[
                styles.successIconContainer,
                {
                  backgroundColor: theme.success,
                  transform: [
                    { scale: successIconAnim }
                  ]
                }
              ]}
            >
              <Ionicons name="checkmark" size={24} color="white" />
            </Animated.View>
            
            <Text style={[styles.successMessage, { color: theme.text }]}>
              {successMessage.message}
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {viewMode === "feed" ? (
        <>
          {/* Search bar with animation */}
          <Animated.View 
            style={[
              styles.searchContainer, 
              { 
                backgroundColor: theme.cardBackground,
                transform: [
                  { translateY: searchBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })},
                  { scale: searchBarAnim }
                ],
                opacity: searchBarAnim
              }
            ]}
          >
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="search" size={20} color={theme.secondaryText} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search posts..."
                placeholderTextColor={theme.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery("");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              onPress={toggleFilterOptions}
              style={[styles.filterButton, { backgroundColor: theme.surfaceHover }]}
            >
              <Ionicons name="filter" size={20} color={theme.primary} />
            </TouchableOpacity>
          </Animated.View>

          {/* Filter options */}
          {showFilterOptions && (
            <View style={[styles.filterOptions, { backgroundColor: theme.cardBackground }]}>
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  filterType === "all" && { backgroundColor: theme.surfaceHover }
                ]}
                onPress={() => setFilter("all")}
              >
                <Text style={[styles.filterOptionText, { color: theme.text }]}>All</Text>
                {filterType === "all" && (
                  <Ionicons name="checkmark" size={18} color={theme.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  filterType === "content" && { backgroundColor: theme.surfaceHover }
                ]}
                onPress={() => setFilter("content")}
              >
                <Text style={[styles.filterOptionText, { color: theme.text }]}>Content</Text>
                {filterType === "content" && (
                  <Ionicons name="checkmark" size={18} color={theme.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  filterType === "username" && { backgroundColor: theme.surfaceHover }
                ]}
                onPress={() => setFilter("username")}
              >
                <Text style={[styles.filterOptionText, { color: theme.text }]}>Username</Text>
                {filterType === "username" && (
                  <Ionicons name="checkmark" size={18} color={theme.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredPosts}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.primary}
                />
              }
              renderItem={({ item }) => (
                <Animated.View 
                  style={[
                    styles.postContainer, 
                    { 
                      backgroundColor: theme.cardBackground,
                      transform: [
                        { scale: postAnimations[item.id] || new Animated.Value(1) },
                        { translateY: (postAnimations[item.id] || new Animated.Value(1)).interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0]
                        })}
                      ],
                      opacity: postAnimations[item.id] || new Animated.Value(1)
                    }
                  ]}
                >
                  <View style={styles.postHeader}>
                    <View style={styles.userInfo}>
                      <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                        <Text style={styles.avatarText}>
                          {item.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.postUsername, { color: theme.text }]}>
                          {item.username}
                        </Text>
                        <Text style={[styles.postDate, { color: theme.secondaryText }]}>
                          {formatDate(item.created_at)}
                        </Text>
                      </View>
                    </View>
                    {(item.user_email === user.email || user.role === 'admin') && (
                      <TouchableOpacity
                        onPress={() => deletePost(item.id)}
                        style={[styles.deleteButton, { backgroundColor: theme.surfaceHover }]}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <Text style={[styles.postContent, { color: theme.text }]}>
                    {item.content}
                  </Text>
                  
                  {item.image_url && (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  )}
                  
                  <View style={[styles.postActions, { 
                    backgroundColor: theme.cardBackground,
                    borderTopColor: theme.divider
                  }]}>
                    {/* Like button - Improved UI */}
                    <TouchableOpacity
                      onPress={() => toggleLike(item.id)}
                      style={[
                        styles.actionButton, 
                        { 
                          backgroundColor: likedPosts[item.id] 
                            ? 'rgba(255, 75, 75, 0.08)' 
                            : 'transparent' 
                        }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Animated.View>
                        <Ionicons 
                          name={likedPosts[item.id] ? "heart" : "heart-outline"} 
                          size={22} 
                          color={likedPosts[item.id] ? "#FF4B4B" : theme.primary} 
                        />
                      </Animated.View>
                      <Text 
                        style={[
                          styles.actionButtonText, 
                          { 
                            color: likedPosts[item.id] ? "#FF4B4B" : theme.text,
                            fontWeight: likedPosts[item.id] ? '600' : '500'
                          }
                        ]}
                      >
                        {(item.likes_count || 0) > 0 ? (item.likes_count || 0) : "Like"}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Comment button - Improved UI */}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPostId(item.id);
                        setViewMode("comments");
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                      style={[styles.actionButton, { backgroundColor: 'transparent' }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble-outline" size={22} color={theme.primary} />
                      <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                        Comments
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Share button - Improved UI */}
                    <TouchableOpacity
                      onPress={() => sharePost(item)}
                      style={[styles.actionButton, { backgroundColor: 'transparent' }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-redo-outline" size={22} color={theme.primary} />
                      <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyState, { color: theme.secondaryText }]}>
                  {searchQuery.trim() 
                    ? "No posts match your search criteria." 
                    : "No posts yet. Be the first to share!"}
                </Text>
              }
              contentContainerStyle={styles.postsList}
            />
          )}
          
          
        </>
            ) : (
              // Comments View
              <>
                {selectedPostId && posts.find((p) => p.id === selectedPostId) && (
                  <View style={[styles.commentsHeader, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.commentsTitle, { color: theme.text }]}>
                      Comments on {posts.find((p) => p.id === selectedPostId)?.username}'s post
                    </Text>
                  </View>
                )}
                
                <KeyboardAvoidingView 
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  style={{ flex: 1 }}
                  keyboardVerticalOffset={Platform.OS === "ios" ? -50 : 2}
                >
                  <View style={{ flex: 1 }}>
                    <FlatList
                      ref={commentsFlatListRef}
                      data={comments}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <View style={[styles.commentContainer, { backgroundColor: theme.cardBackground }]}>
                          <View style={styles.commentHeader}>
                            <View style={styles.userInfo}>
                              <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                                <Text style={styles.avatarText}>
                                  {item.username.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <Text style={[styles.commentUsername, { color: theme.text }]}>
                                {item.username}
                              </Text>
                            </View>
                            <Text style={[styles.commentDate, { color: theme.secondaryText }]}>
                              {formatDate(item.created_at)}
                            </Text>
                            {(item.user_email === user.email || user.role === 'admin') && (
                              <TouchableOpacity
                                onPress={() => deleteComment(item.id)}
                                style={[styles.deleteButton, { backgroundColor: theme.surfaceHover }]}
                              >
                                <Ionicons name="trash-outline" size={18} color={theme.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={[styles.commentContent, { color: theme.text }]}>{item.content}</Text>
                        </View>
                      )}
                      ListEmptyComponent={
                        <Text style={[styles.emptyState, { color: theme.secondaryText }]}>
                          No comments yet. Be the first to comment!
                        </Text>
                      }
                      // Add padding to the bottom to ensure content isn't hidden behind the input
                      contentContainerStyle={{ paddingBottom: 100 }}
                    />
                  </View>
                  
                  <View style={[
                    styles.commentInputContainer, 
                    { 
                      backgroundColor: theme.cardBackground,
                      borderTopColor: theme.divider,
                    }
                  ]}>
                    <TextInput
                      style={[styles.commentInput, { 
                        color: theme.text, 
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.inputBorder
                      }]}
                      placeholder="Write a comment..."
                      placeholderTextColor={theme.secondaryText}
                      value={newCommentContent}
                      onChangeText={setNewCommentContent}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        addComment();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Keyboard.dismiss();
                      }}
                      style={[
                        styles.sendButton,
                        { backgroundColor: theme.primary },
                        !newCommentContent.trim() && styles.disabledButton,
                      ]}
                      disabled={!newCommentContent.trim()}
                    >
                      <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </>
            )}

      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightPlaceholder: {
    width: 40, // Approximately the same width as the back button
  },
  // New create post button in header
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  headerPostButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPostButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // New image picker button style
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  imagePickerText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
 
  // New style for dismiss keyboard button
  dismissKeyboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  dismissKeyboardText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  // Search bar styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Filter options styles
  filterOptions: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  filterOptionText: {
    fontSize: 16,
  },
  createPostContainer: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postInput: {
    minHeight: 100,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  
  actionButtonText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '500',
  },
  postButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    minWidth: 80, // Add minimum width to ensure text fits
    justifyContent: 'center', // Center the text horizontally
    alignItems: 'center', // Center the text vertically
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center', // Ensure text is centered
  },
  disabledButton: {
    opacity: 0.6,
  },
  postContainer: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  postUsername: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  postDate: {
    fontSize: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    paddingTop: 0,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
  },
  commentButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  addCommentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
    // Add shadow to make it stand out
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    // Remove absolute positioning and adjust padding
    paddingBottom: Platform.OS === "ios" ? 70 : 86,
    backgroundColor: 'transparent', // This will be overridden by the inline style
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100, // Limit height for multiline input
  },
  commentPostButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  commentPostButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Add missing styles for comments section
  commentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  commentContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUsername: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  commentDate: {
    fontSize: 12,
  },
  commentContent: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 16,
  },
  
  // Add the missing loadingContainer style
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  postsList: {
    paddingBottom: 20,
  },
  
  // Floating Action Button styles
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Delete confirmation modal styles
  deleteModalContent: {
    width: width * 0.85,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteWarningIcon: {
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  deleteModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: '45%',
    alignItems: 'center',
  },
  deleteModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Success message styles
  successModalContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  successModalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successMessage: {
    fontSize: 16,
    fontWeight: '500',
  },
});
