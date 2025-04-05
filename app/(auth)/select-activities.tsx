import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
  Animated,
  Image
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";

// Activity data with icons
const activitiesList = [
  { name: "Music", icon: "musical-notes" },
  { name: "Drawing", icon: "brush" },
  { name: "Books", icon: "book" },
  { name: "Journal", icon: "journal" },
  { name: "Community Sharing", icon: "share-social" },
  { name: "Games", icon: "game-controller" },
];

export default function SelectActivities() {
  const [selectedActivities, setSelectedActivities] = useState([]);
  const { updateUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [animation] = useState(new Animated.Value(0));
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  
  // Animation when component mounts
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity as never)) {
      setSelectedActivities(selectedActivities.filter((item) => item !== activity));
    } else if (selectedActivities.length < 3) {
      setSelectedActivities([...selectedActivities, activity as never]);
      
      // Small animation when selecting an item
      const newAnimation = new Animated.Value(0);
      Animated.timing(newAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleContinue = async () => {
    if (selectedActivities.length === 3) {
      setIsLoading(true); // Show loader
      try {
        await updateUser({ activities: selectedActivities });
        router.replace("/(tabs)");
      } catch (error) {
        alert("An error occurred. Please try again.");
        console.error(error);
      } finally {
        setIsLoading(false); // Hide loader
      }
    } else {
      alert("Please select exactly 3 activities.");
    }
  };

  // Using the blue accent color like in login screen
  const blueAccent = "#45C1E7"; // Light blue color from login screen
  const darkBlueAccent = "#3AA0C1"; // Darker shade for contrast

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === "#121212" ? "light-content" : "dark-content"} />
      
      {/* Add the loader component */}
      <Loader 
        visible={isLoading} 
        text="Setting up your experience..." 
        color={blueAccent}
      />
      
      <View style={styles.headerShape}>
        <View style={[styles.headerShapeInner, { backgroundColor: blueAccent }]} />
      </View>
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: animation,
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            }
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Customize Your Experience</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Select 3 activities that interest you
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(selectedActivities.length / 3) * 100}%`,
                  backgroundColor: blueAccent 
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.secondaryText }]}>
            {selectedActivities.length}/3 selected
          </Text>
        </Animated.View>

        <View style={styles.activitiesContainer}>
          {activitiesList.map((activity, index) => {
            const isSelected = selectedActivities.includes(activity.name as never);
            const delay = index * 100;
            
            return (
              <Animated.View 
                key={activity.name}
                style={{
                  opacity: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [
                    {
                      translateY: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.activityItem,
                    { 
                      backgroundColor: isSelected ? blueAccent : theme.cardBackground,
                      borderColor: isSelected ? blueAccent : theme.divider,
                    }
                  ]}
                  onPress={() => toggleActivity(activity.name)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconContainer, 
                    { 
                      backgroundColor: isSelected 
                        ? 'rgba(255, 255, 255, 0.3)' 
                        : `${blueAccent}20` 
                    }
                  ]}>
                    <Ionicons 
                      name={activity.icon as keyof typeof Ionicons.glyphMap}
                      size={28} 
                      color={isSelected ? "white" : blueAccent} 
                    />
                  </View>
                  <Text 
                    style={[
                      styles.activityText, 
                      { color: isSelected ? "white" : theme.text }
                    ]}
                  >
                    {activity.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <Animated.View 
        style={[
          styles.bottomContainer,
          {
            opacity: animation,
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          }
        ]}
      >
        <TouchableOpacity 
          style={[
            styles.continueButton, 
            { 
              backgroundColor: selectedActivities.length === 3 ? blueAccent : theme.cardBackground,
              borderColor: blueAccent,
              opacity: selectedActivities.length === 3 ? 1 : 0.6,
            }
          ]}
          onPress={handleContinue}
          disabled={selectedActivities.length !== 3}
        >
          <Text 
            style={[
              styles.continueButtonText,
              { color: selectedActivities.length === 3 ? "white" : theme.text }
            ]}
          >
            Continue
          </Text>
          <Ionicons 
            name="arrow-forward" 
            size={20} 
            color={selectedActivities.length === 3 ? "white" : theme.text} 
          />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerShape: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: 'hidden',
  },
  headerShapeInner: {
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 20,
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    overflow: 'scroll', // Allow scrolling
  },
  activityItem: {
    width: 140, // Fixed width instead of percentage
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginRight: 12, // Add margin between items
    marginBottom: 15,
    borderWidth: 1,
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexShrink: 0, // Prevent items from shrinking
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});