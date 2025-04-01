import React, { useState, useEffect } from "react";
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
}

interface Comment {
  id: string;
  post_id: string;
  user_email: string;
  username: string;
  content: string;
  created_at: string;
}

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
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
      }
    } catch (error) {
      handleError(error);
    }
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

    setPosts(prev => [optimisticPost, ...prev]);
    setNewPostContent("");
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

  const deletePost = async (postId: string) => {
    try {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to delete this post?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Find the post to get the image_url before deleting
              const postToDelete = posts.find(post => post.id === postId);
              
              // Optimistic update
              setPosts(prev => prev.filter(post => post.id !== postId));
              if (selectedPostId === postId) {
                setSelectedPostId(null);
                setViewMode("feed");
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
                  // Continue anyway as the post is already deleted
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      handleError(error);
      fetchPosts();
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const { error } = await supabase
        .from("community_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    } catch (error) {
      handleError(error);
      if (selectedPostId) fetchComments(selectedPostId);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
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
        <Text style={[styles.title, { color: theme.text }]}>Community</Text>
        {viewMode === "comments" && (
          <TouchableOpacity
            onPress={() => {
              setViewMode("feed");
              setSelectedPostId(null);
            }}
            style={[styles.backButton, { backgroundColor: theme.surfaceHover }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      {viewMode === "feed" ? (
        <>
          <View style={[styles.createPostContainer, { backgroundColor: theme.cardBackground }]}>
            <TextInput
              style={[styles.postInput, { color: theme.text, backgroundColor: theme.inputBackground }]}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.secondaryText}
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
            />
            {image && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={[styles.removeImageButton, { backgroundColor: theme.error }]}
                  onPress={() => setImage(null)}
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.postActions}>
              <TouchableOpacity 
                onPress={pickImage} 
                style={[styles.actionButton, { backgroundColor: theme.surfaceHover }]}
              >
                <Ionicons name="image-outline" size={24} color={theme.primary} />
                <Text style={[styles.actionButtonText, { color: theme.text }]}>Add Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createPost}
                style={[
                  styles.postButton,
                  { backgroundColor: theme.primary },
                  (!newPostContent.trim() || uploading) && styles.disabledButton,
                ]}
                disabled={uploading || !newPostContent.trim()}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={posts}
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
                    { backgroundColor: theme.cardBackground }
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
                    {item.user_email === user.email && (
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
                  
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPostId(item.id);
                      setViewMode("comments");
                    }}
                    style={[styles.commentButton, { backgroundColor: theme.surfaceHover }]}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={theme.primary} />
                    <Text style={[styles.commentButtonText, { color: theme.primary }]}>
                      Comments
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyState, { color: theme.secondaryText }]}>
                  No posts yet. Be the first to share!
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
          
          <FlatList
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
                  {item.user_email === user.email && (
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
          />
          
          <View style={[styles.commentInputContainer, { backgroundColor: theme.cardBackground }]}>
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
              onPress={addComment}
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  createPostContainer: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  postButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
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
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
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
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
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
});