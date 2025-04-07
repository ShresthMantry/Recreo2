import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import Slider from "@react-native-community/slider";
import * as SecureStore from "expo-secure-store";
import YoutubePlayer from "react-native-youtube-iframe";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext"; // Import theme context
import { LinearGradient } from "expo-linear-gradient"; // Import LinearGradient for beautiful gradients

// Environment variables - In a real app, use expo-constants or .env file
const YOUTUBE_API_KEY = "AIzaSyBnnELuNcrlf_ACP9qm9Gbooi5Eg-xehlY";
const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

// Types
interface YouTubeSearchResponse {
  items: Track[];
  nextPageToken?: string;
}

interface Track {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
  favorite?: boolean;
}

export default function YouTubeMusicPlayer() {
  // Get theme from context
  const { theme, isDark } = useTheme();
  
  // State variables
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("relaxing music");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'discover' | 'favorites'>('discover');
  const [playerReady, setPlayerReady] = useState(false);

  // Refs
  const playerRef = useRef<YoutubePlayer>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const { width } = Dimensions.get("window");

  // Memoized filtered tracks
  const filteredTracks = useMemo(() => {
    return activeTab === 'favorites' ? favorites : tracks;
  }, [activeTab, favorites, tracks]);

  // Load favorites from storage
  const loadFavorites = useCallback(async () => {
    try {
      const storedFavorites = await SecureStore.getItemAsync("favorites");
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites) as Track[];
        setFavorites(parsedFavorites);
        
        // Update favorite status in tracks
        setTracks(prevTracks => 
          prevTracks.map(track => ({
            ...track,
            favorite: parsedFavorites.some(fav => fav.id.videoId === track.id.videoId)
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load favorites", error);
    }
  }, []);

  // Save favorites to storage
  const saveFavorites = useCallback(async (updatedFavorites: Track[]) => {
    try {
      await SecureStore.setItemAsync("favorites", JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error("Failed to save favorites", error);
    }
  }, []);

  // Focus effect to load favorites when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      return () => {};
    }, [loadFavorites])
  );

  // Search YouTube API for tracks
  const searchTracks = useCallback(async (query: string, pageToken?: string) => {
    if (!query.trim()) return;

    setIsLoading(true);

    try {
      const response = await axios.get<YouTubeSearchResponse>(
        `${YOUTUBE_API_BASE_URL}/search`,
        {
          params: {
            part: "snippet",
            q: query,
            type: "video",
            videoCategoryId: "10", // Music category
            maxResults: 15,
            key: YOUTUBE_API_KEY,
            pageToken: pageToken,
          },
        }
      );

      const newTracks = response.data.items.map(track => ({
        ...track,
        favorite: favorites.some(fav => fav.id.videoId === track.id.videoId)
      }));

      setTracks(prev => pageToken ? [...prev, ...newTracks] : newTracks);
      setNextPageToken(response.data.nextPageToken);
    } catch (error) {
      console.error("Error searching tracks:", error);
      Alert.alert("Error", "Failed to search tracks. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [favorites]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchTracks(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchTracks]);

  // Player state handler
  const onPlayerStateChange = useCallback((state: string) => {
    console.log("Player state changed:", state);
    switch (state) {
      case "playing":
        setIsBuffering(false);
        setIsPlaying(true);
        startProgressTimer();
        break;
      case "paused":
        setIsPlaying(false);
        stopProgressTimer();
        break;
      case "buffering":
        setIsBuffering(true);
        break;
      case "ended":
        setIsPlaying(false);
        stopProgressTimer();
        setPosition(0);
        if (isRepeat) {
          playerRef.current?.seekTo(0, true);
          setIsPlaying(true);
        } else {
          playNextTrack();
        }
        break;
      default:
        break;
    }
  }, [isRepeat]);

  // Progress timer functions
  const startProgressTimer = useCallback(() => {
    stopProgressTimer();
    progressIntervalRef.current = setInterval(async () => {
      if (playerRef.current) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          setPosition(Math.floor(currentTime * 1000));
        } catch (error) {
          console.error("Error getting current time:", error);
        }
      }
    }, 1000);
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Play track
  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setIsBuffering(true);
    setIsPlaying(true);
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    try {
      setIsPlaying(prev => !prev);
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  }, []);

  // Play next track
  const playNextTrack = useCallback(() => {
    if (!currentTrack || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (track) => track.id.videoId === currentTrack.id.videoId
    );

    let nextIndex = isShuffle 
      ? Math.floor(Math.random() * filteredTracks.length)
      : (currentIndex + 1) % filteredTracks.length;

    playTrack(filteredTracks[nextIndex]);
  }, [currentTrack, filteredTracks, isShuffle, playTrack]);

  // Play previous track
  const playPreviousTrack = useCallback(() => {
    if (!currentTrack || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (track) => track.id.videoId === currentTrack.id.videoId
    );

    let prevIndex = isShuffle
      ? Math.floor(Math.random() * filteredTracks.length)
      : (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;

    playTrack(filteredTracks[prevIndex]);
  }, [currentTrack, filteredTracks, isShuffle, playTrack]);

  // Toggle favorite
  const toggleFavorite = useCallback((track: Track) => {
    const isFavorite = favorites.some(fav => fav.id.videoId === track.id.videoId);
    let updatedFavorites: Track[];

    if (isFavorite) {
      updatedFavorites = favorites.filter(fav => fav.id.videoId !== track.id.videoId);
    } else {
      updatedFavorites = [...favorites, { ...track, favorite: true }];
    }

    setFavorites(updatedFavorites);
    saveFavorites(updatedFavorites);
    
    // Update tracks with new favorite status
    setTracks(prevTracks => 
      prevTracks.map(t => 
        t.id.videoId === track.id.videoId 
          ? { ...t, favorite: !isFavorite } 
          : t
      )
    );

    // Update current track if it's the one being toggled
    if (currentTrack?.id.videoId === track.id.videoId) {
      setCurrentTrack(prev => prev ? { ...prev, favorite: !isFavorite } : null);
    }
  }, [currentTrack, favorites, saveFavorites]);

  // Format time
  const formatTime = useCallback((millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  // Seek to position
  const seekTo = useCallback(async (value: number) => {
    if (!currentTrack) return;
    try {
      await playerRef.current?.seekTo(Math.round(value / 1000), true);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  }, [currentTrack]);

  // Memoized track item renderer
  const renderTrackItem = useCallback(({ item }: { item: Track }) => {
    const isActive = currentTrack?.id.videoId === item.id.videoId;
    const isFavorite = favorites.some(fav => fav.id.videoId === item.id.videoId);

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          { 
            backgroundColor: isActive 
              ? isDark ? theme.surfaceHover : 'rgba(98, 0, 238, 0.08)' 
              : isDark ? theme.surface : '#fff',
            borderColor: isDark ? theme.divider : 'rgba(0,0,0,0.08)',
            // For Android in light mode, use a special style for active tracks
            ...(Platform.OS === 'android' && !isDark && isActive 
              ? {
                  borderWidth: -10,
                  borderRadius: 12,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 3,
                  elevation: 4
                } 
              : { borderWidth: 1 })
          }
        ]}
        onPress={() => playTrack(item)}
      >
        <Image
          source={{ uri: item.snippet.thumbnails.medium.url }}
          style={styles.thumbnail}
        />
        <View style={styles.trackInfo}>
          <Text 
            numberOfLines={1} 
            style={[
              styles.trackTitle, 
              { color: isActive ? theme.primary : theme.text }
            ]}
          >
            {item.snippet.title}
          </Text>
          <Text style={[styles.artistName, { color: theme.secondaryText }]}>
            {item.snippet.channelTitle}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item)}
        >
          <MaterialIcons
            name={isFavorite ? "favorite" : "favorite-border"}
            size={24}
            color={isFavorite ? theme.accent : theme.secondaryText}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [currentTrack, favorites, playTrack, toggleFavorite, theme, isDark]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* YouTube Player */}
      {currentTrack && (
        <YoutubePlayer
          ref={playerRef}
          height={0}
          width={0}
          play={isPlaying}
          videoId={currentTrack.id.videoId}
          onChangeState={onPlayerStateChange}
          onReady={() => {
            setPlayerReady(true);
            setIsBuffering(false);
            playerRef.current?.getDuration().then((dur: number) => {
              setDuration(dur * 1000);
            });
          }}
          onError={(error) => {
            console.error("YouTube player error:", error);
            Alert.alert("Playback Error", "Could not play this video");
            setIsBuffering(false);
          }}
          webViewProps={{
            allowsFullscreenVideo: false,
            allowsInlineMediaPlayback: true,
          }}
          webViewStyle={styles.hiddenPlayer}
        />
      )}

      {/* Header */}
      <LinearGradient
        colors={[isDark ? theme.elevation2 : theme.primary, isDark ? theme.background : theme.primary + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Text style={[styles.title, { color: "#fff" }]}>Music Player</Text>
        <View style={[styles.searchContainer, { backgroundColor: isDark ? theme.inputBackground : 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name="search" size={20} color="#fff" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: "#fff" }]}
            placeholder="Search for music..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.cardBackground, borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'discover' && [styles.activeTabButton, { borderBottomColor: theme.primary }]
          ]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[
            styles.tabText,
            { color: theme.secondaryText },
            activeTab === 'discover' && [styles.activeTabText, { color: theme.primary }]
          ]}>
            Discover-
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'favorites' && [styles.activeTabButton, { borderBottomColor: theme.primary }]
          ]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[
            styles.tabText,
            { color: theme.secondaryText },
            activeTab === 'favorites' && [styles.activeTabText, { color: theme.primary }]
          ]}>
            Favorites ({favorites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Track List */}
      {isLoading && filteredTracks.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons 
            name={activeTab === 'favorites' ? "favorite" : "music-note"} 
            size={50} 
            color={theme.divider} 
          />
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            {activeTab === 'favorites' 
              ? "No favorites yet" 
              : "No tracks found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item, index) => `${item.id.videoId}-${index}`}
          renderItem={renderTrackItem}
          contentContainerStyle={[
            styles.trackList, 
            { 
              paddingBottom: currentTrack ? (Platform.OS === 'android' ? 300 : 280) : 100 
            }
          ]}
          onEndReached={activeTab === 'discover' ? () => nextPageToken && searchTracks(searchQuery, nextPageToken) : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && filteredTracks.length > 0 ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : null
          }
        />
      )}

      {/* Player Controls */}
      {currentTrack && (
        <View 
          style={[
            styles.playerContainer, 
            { 
              backgroundColor: isDark ? theme.elevation2 : '#fff', // White background for light mode
              borderTopColor: theme.divider,
              borderTopWidth: 1,
              shadowColor: isDark ? "#000" : "#666",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: isDark ? 0.2 : 0.15,
              shadowRadius: 5,
              elevation: 10,
            }
          ]}
        >
          <View style={{ paddingBottom: Platform.OS === 'android' ? 25 : 0 }}>
            <View style={styles.nowPlayingBar}>
              <Image
                source={{ uri: currentTrack.snippet.thumbnails.medium.url }}
                style={styles.playerThumbnail}
              />
              <View style={styles.nowPlayingInfo}>
                <Text numberOfLines={1} style={[styles.nowPlayingTitle, { color: theme.text }]}>
                  {currentTrack.snippet.title}
                </Text>
                <Text style={[styles.nowPlayingArtist, { color: theme.secondaryText }]}>
                  {currentTrack.snippet.channelTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleFavorite(currentTrack)}>
                <MaterialIcons
                  name={currentTrack.favorite ? "favorite" : "favorite-border"}
                  size={24}
                  color={currentTrack.favorite ? theme.primary : theme.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <Text style={[styles.timeText, { color: theme.secondaryText }]}>{formatTime(position)}</Text>
              <Slider
                style={styles.progressBar}
                minimumValue={0}
                maximumValue={duration}
                value={position}
                onSlidingComplete={seekTo}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
                thumbTintColor={theme.primary}
              />
              <Text style={[styles.timeText, { color: theme.secondaryText }]}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
                <Ionicons
                  name="shuffle"
                  size={22}
                  color={isShuffle ? theme.primary : theme.secondaryText}
                />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={playPreviousTrack}>
                <Ionicons name="play-skip-back" size={30} color={theme.text} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.playButton, { backgroundColor: theme.primary }]}
                onPress={togglePlayPause}
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={30}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={playNextTrack}>
                <Ionicons name="play-skip-forward" size={30} color={theme.text} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsRepeat(!isRepeat)}>
                <Ionicons
                  name="repeat"
                  size={22}
                  color={isRepeat ? theme.primary : theme.secondaryText}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: Platform.OS === 'android' ? 80 : 0, // Add padding for Android only
    paddingTop: Platform.OS === 'android' ? 40 : 0, // Add padding for Android only
  },
  hiddenPlayer: {
    opacity: 0,
    height: 0,
    width: 0,
  },
  header: {
    padding: 20,
    paddingTop: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 10,
    marginBottom: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: "bold",
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
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
  },
  trackList: {
    paddingHorizontal: 10,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  thumbnail: {
    width: 55,
    height: 55,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
  },
  favoriteButton: {
    padding: 8,
  },
  playerGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    paddingTop: 50,
  },
  playerContainer: {
    position: "absolute",
    bottom: Platform.OS === 'android' ? 60 : 80, // Adjust to position above tab bar
    left: 0,
    right: 0,
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderRadius: 20,
    marginHorizontal: 10, // Add some margin on the sides
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 1000,
  },
  nowPlayingBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  playerThumbnail: {
    width: 55,
    height: 55,
    borderRadius: 8,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nowPlayingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  nowPlayingArtist: {
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  progressBar: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  timeText: {
    fontSize: 12,
    width: 40,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 5,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
