import React, { useEffect, useRef, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Easing
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const allActivities = [
  { name: "Music", icon: "musical-notes" },
  { name: "Drawing", icon: "brush" },
  { name: "Books", icon: "book" },
  { name: "Journal", icon: "journal" },
  { name: "Community-Sharing", icon: "people" },
  { name: "Games", icon: "game-controller" },
  { name: "Yoga", icon: "fitness"},
  {name: "News", icon: "newspaper"},
];

export default function More() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const selectedActivities = user?.activities || [];
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [pulseAnims] = useState(() => 
    allActivities.map(() => new Animated.Value(1))
  );

  // Filter activities not in user's selected list
  // Properly normalize both arrays for comparison
  const otherActivities = allActivities.filter((activity) => {
    // Convert activity name to the same format as in selectedActivities
    const normalizedName = activity.name.replace(/-/g, ' ');
    return !selectedActivities.some(selected => 
      selected.toLowerCase() === normalizedName.toLowerCase()
    );
  });
  
  console.log('Selected activities:', selectedActivities);
  console.log('Other activities:', otherActivities.map(a => a.name));

  useEffect(() => {
    // Start animations when component mounts
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Start staggered animations for each card
    otherActivities.forEach((_, index) => {
      Animated.sequence([
        Animated.delay(index * 150),
        Animated.spring(pulseAnims[index], {
          toValue: 1.05,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnims[index], {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const navigateToActivity = (activity: { name: string }) => {
    // Provide haptic feedback when selecting an activity
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const route = `/(tabs)/${activity.name.toLowerCase().replace(/\s+/g, "-")}`;
    if (["/(tabs)/music", "/(tabs)/drawing", "/(tabs)/books", "/(tabs)/journal", "/(tabs)/community-sharing", "/(tabs)/games", "/(tabs)/yoga", "/(tabs)/news"].includes(route)) {
      router.push(route as any); // Use type 'any' to handle all possible routes
    } else {
      console.error("Invalid route:", route);
    }
  };

  const getActivityGradient = (activity: { name: string }) => {
    switch(activity.name.toLowerCase()) {
      case 'music': return ['#9C27B0', '#7B1FA2'];
      case 'drawing': return ['#F44336', '#D32F2F'];
      case 'books': return ['#795548', '#5D4037'];
      case 'journal': return ['#4CAF50', '#2E7D32'];
      case 'community-sharing': return ['#2196F3', '#1976D2'];
      case 'games': return ['#FF9800', '#F57C00'];
      case 'yoga': return ['#009688', '#00796B']; 
      case 'news': return ['#3F51B5', '#303F9F']; // Added gradient for news
      default: return ['#607D8B', '#455A64'];
    }
  };

  const renderItem = ({ item, index }: { item: { name: string; icon: string }; index: number }) => {
    const gradientColors = getActivityGradient(item);
    
    // Create a pulse animation for the card
    const startPulseAnimation = () => {
      Animated.sequence([
        Animated.spring(pulseAnims[index], {
          toValue: 1.05,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnims[index], {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    };
    
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            { 
              translateY: translateY.interpolate({
                inputRange: [0, 1],
                outputRange: [50 + (index * 10), 0],
              }) 
            },
            { scale: pulseAnims[index] }
          ],
        }}
      >
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => navigateToActivity(item)}
          onPressIn={startPulseAnimation}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradientColors as [string, string]}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <Ionicons 
                name={item.icon as keyof typeof Ionicons.glyphMap} 
                size={32} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.activityName}>
              {item.name.replace(/-/g, ' ')}
            </Text>
            <View style={styles.arrowContainer}>
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color="#FFFFFF" 
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <Animated.View 
        style={[
          styles.headerContainer, 
          { 
            opacity: fadeAnim,
            transform: [
              { translateY: translateY },
              { scale: scaleAnim }
            ] 
          }
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>Discover More</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Explore additional activities to enhance your experience
        </Text>
      </Animated.View>
      
      {otherActivities.length > 0 ? (
        <FlatList
          data={otherActivities}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: 100 } // Add extra padding at bottom
          ]}
          showsVerticalScrollIndicator={true}
          overScrollMode="always"
        />
      ) : (
        <Animated.View 
          style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Ionicons name="checkmark-circle" size={64} color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            You've already selected all available activities!
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.secondaryText }]}>
            You can change your preferences in Settings
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 0, // Remove bottom padding from container
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  listContainer: {
    paddingBottom: 20,
    flexGrow: 1, // Allow content to grow
  },
  activityCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradientBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  activityName: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});