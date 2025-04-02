import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from 'expo-haptics';

// Mock data for recent activities - replace with actual data in production
const mockRecentActivities = [
  { id: '1', type: 'journal', title: 'Journal Entry', date: new Date(Date.now() - 86400000), icon: 'journal' },
  { id: '2', type: 'games', title: 'Played Tic-Tac-Toe', date: new Date(Date.now() - 172800000), icon: 'game-controller' },
  { id: '3', type: 'community-sharing', title: 'Posted in Community', date: new Date(Date.now() - 259200000), icon: 'people' },
];

interface QuoteData {
  quote: string;
  author: string;
  category: string;
}

export default function Home() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [recentActivities, setRecentActivities] = useState(mockRecentActivities);
  const [quote, setQuote] = useState<QuoteData>({ 
    quote: "The only way to do great work is to love what you do.", 
    author: "Steve Jobs",
    category: "inspiration" 
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const quoteScale = useRef(new Animated.Value(0.95)).current;
  const actionButtonScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    // Fetch quote with daily caching
    fetchDailyQuote();
    
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Start animations when content loads
      startAnimations();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const startAnimations = () => {
    // Fade in and slide up animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(quoteScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(actionButtonScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  const fetchDailyQuote = async () => {
    try {
      // Check if we already have a quote for today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const storedQuoteData = await AsyncStorage.getItem('dailyQuote');
      
      if (storedQuoteData) {
        const { date, quoteData } = JSON.parse(storedQuoteData);
        
        // If we have a quote from today, use it
        if (date === today && quoteData) {
          setQuote(quoteData);
          return;
        }
      }
      
      // Otherwise fetch a new quote
      const response = await fetch('https://api.api-ninjas.com/v1/quotes', {
        method: 'GET',
        headers: {
          'X-Api-Key': 'K9552mKZuYW9W7SIOcaOZQhU93vIqcrBwqvUB7ee',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Store the new quote with today's date
        await AsyncStorage.setItem('dailyQuote', JSON.stringify({
          date: today,
          quoteData: data[0]
        }));
        
        setQuote(data[0]);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      // Keep the default quote if there's an error
    }
  };

  const navigateToActivity = (type: string) => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Fix the route for community-sharing
    if (type.toLowerCase() === 'community sharing') {
      type = 'community-sharing';
    }
    const route = `/(tabs)/${type.toLowerCase()}`;
    router.push(route);
  };

  const getActivityColor = (type: string) => {
    switch(type) {
      case 'journal': return ['#4CAF50', '#2E7D32'];
      case 'games': return ['#FF9800', '#F57C00'];
      case 'community-sharing': return ['#2196F3', '#1976D2'];
      case 'community': return ['#2196F3', '#1976D2']; // For backward compatibility
      case 'music': return ['#9C27B0', '#7B1FA2'];
      case 'drawing': return ['#F44336', '#D32F2F'];
      case 'books': return ['#795548', '#5D4037'];
      default: return ['#607D8B', '#455A64'];
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.ScrollView 
        style={[
          styles.container, 
          { backgroundColor: theme.background },
          { opacity: fadeAnim, transform: [{ translateY }] }
        ]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.secondaryText }]}>{greeting}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{user?.name || 'Friend'}!</Text>
          </View>
          <TouchableOpacity 
            style={[styles.profileButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/settings');
            }}
          >
            <Ionicons name="person" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Quote of the Day */}
        <Animated.View 
          style={[
            styles.quoteContainer, 
            { 
              backgroundColor: theme.cardBackground,
              transform: [{ scale: quoteScale }] 
            }
          ]}
        >
          <View style={styles.quoteIconContainer}>
            <Ionicons name="quote" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.quoteText, { color: theme.text }]}>"{quote.quote}"</Text>
          <Text style={[styles.quoteAuthor, { color: theme.secondaryText }]}>— {quote.author}</Text>
        </Animated.View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.quickActionsContainer}
          contentContainerStyle={styles.quickActionsContent}
        >
          {user?.activities?.map((activity, index) => (
            <Animated.View 
              key={index}
              style={{ 
                transform: [{ scale: actionButtonScale }],
                opacity: fadeAnim
              }}
            >
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => navigateToActivity(activity)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={getActivityColor(activity.toLowerCase())}
                  style={styles.quickActionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons 
                    name={
                      activity.toLowerCase() === 'journal' ? 'journal' :
                      activity.toLowerCase() === 'games' ? 'game-controller' :
                      activity.toLowerCase() === 'community sharing' ? 'people' :
                      activity.toLowerCase() === 'music' ? 'musical-notes' :
                      activity.toLowerCase() === 'drawing' ? 'brush' :
                      activity.toLowerCase() === 'books' ? 'book' : 'apps'
                    } 
                    size={28} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
                <Text style={[styles.quickActionText, { color: theme.text }]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
          <Animated.View 
            style={{ 
              transform: [{ scale: actionButtonScale }],
              opacity: fadeAnim
            }}
          >
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/more');
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#607D8B', '#455A64']}
                style={styles.quickActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: theme.text }]}>
                More
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Recent Activities */}
        <View style={styles.recentActivitiesHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activities</Text>
          <TouchableOpacity 
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentActivities.length > 0 ? (
          <View style={styles.recentActivitiesList}>
            {recentActivities.map((activity, index) => (
              <Animated.View 
                key={activity.id}
                style={{ 
                  opacity: fadeAnim,
                  transform: [{ 
                    translateY: translateY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 10 * (index + 1)]
                    }) 
                  }]
                }}
              >
                <TouchableOpacity 
                  style={[styles.activityItem, { backgroundColor: theme.cardBackground }]}
                  onPress={() => navigateToActivity(activity.type)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={getActivityColor(activity.type)}
                    style={styles.activityIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={activity.icon} size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.activityDetails}>
                    <Text style={[styles.activityTitle, { color: theme.text }]}>{activity.title}</Text>
                    <Text style={[styles.activityDate, { color: theme.secondaryText }]}>
                      {format(activity.date, 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ) : (
          <Animated.View 
            style={[
              styles.emptyState, 
              { 
                backgroundColor: theme.cardBackground,
                opacity: fadeAnim,
                transform: [{ scale: quoteScale }]
              }
            ]}
          >
            <Ionicons name="calendar-outline" size={40} color={theme.secondaryText} />
            <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
              No recent activities yet
            </Text>
            <TouchableOpacity 
              style={[styles.startButton, { backgroundColor: theme.primary }]}
              onPress={() => navigateToActivity(user?.activities?.[0] || 'journal')}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>Start an Activity</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Suggested for You */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Suggested for You</Text>
        <Animated.View 
          style={[
            styles.suggestedContainer, 
            { 
              backgroundColor: theme.cardBackground,
              opacity: fadeAnim,
              transform: [{ scale: quoteScale }]
            }
          ]}
        >
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.suggestedIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="bulb" size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.suggestedContent}>
            <Text style={[styles.suggestedTitle, { color: theme.text }]}>Try a new game today</Text>
            <Text style={[styles.suggestedDescription, { color: theme.secondaryText }]}>
              Challenge yourself with Sudoku or Minesweeper
            </Text>
            <TouchableOpacity 
              style={[styles.suggestedButton, { borderColor: theme.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/games');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.suggestedButtonText, { color: theme.primary }]}>Play Now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quoteContainer: {
    margin: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quoteIconContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsContent: {
    paddingHorizontal: 16,
  },
  quickActionButton: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  quickActionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  recentActivitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentActivitiesList: {
    marginHorizontal: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityDetails: {
    flex: 1,
    marginLeft: 16,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    marginHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  startButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  suggestedContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestedIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  suggestedContent: {
    flex: 1,
  },
  suggestedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  suggestedDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  suggestedButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestedButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});