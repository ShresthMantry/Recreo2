import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { StyleSheet, Animated, View, Dimensions, Pressable, Platform } from "react-native";
import type { PressableProps } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 16,
    left: '50%', // Center horizontally
    transform: [{ translateX: (width * 0.075) }], // Adjust for width
    height: 65, // Increase the height of the navbar
    borderRadius: 28,
    paddingBottom: 0,
    paddingTop: 0,
    elevation: 8,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    width: width * 0.85, // Set width to 85% of screen width
  },
  tabBarInner: {
    overflow: 'hidden',
    borderRadius: 28,
    flex: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between', // Change from 'space-around' to 'space-between'
  },
  tabIcon: {
    marginBottom: 0,
  },
  tabItem: {
    height: 70, // Match the height of the tab items with the navbar
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 0,
    paddingBottom: 0,
    // width: 48,
    paddingLeft: 40,
    marginTop: -2, // Move items up a bit
  },
  indicator: {
    position: "absolute",
    height: 3,
    width: 25,
    borderRadius: 1.5,
    bottom: 8,
    transform: [{ translateX: -12.5 }],
  },
  activeTabBackground: {
    position: "absolute",
    height: 45, // Increased from 35
    width: 45, // Increased from 35
    borderRadius: 22.5, // Half of width/height
    alignSelf: "center",
  },
indicatorStyle: {
    position: "absolute",
    height: 4, // Increased from 3
    width: 30, // Increased from 25
    borderRadius: 2, // Half of height
    bottom: 8,
    transform: [{ translateX: -15 }], // Half of width
  },
  glow: {
    position: "absolute",
    width: 30, // Increased from 25
    height: 15, // Increased from 12
    borderRadius: 15, // Half of width
    top: 0,
    opacity: 0.4,
  }
});

interface TabBarButtonProps extends PressableProps {
  children: React.ReactNode;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [activityTabs, setActivityTabs] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // Redirect to login if not authenticated
  
  const activities = user?.activities || [];

  // Update activity tabs and remove duplicates
  useEffect(() => {
    // Normalize activity names and remove duplicates
    const normalizedActivities = activities.map(activity => 
      activity.toLowerCase().replace(" ", "-")
    );
    const uniqueActivities = [...new Set(normalizedActivities)];
    // Limit to only 3 activities
    setActivityTabs(uniqueActivities.slice(0, 3));
  }, [activities]);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // All possible activity routes that exist in the app
  const allPossibleActivities = [
    "music",
    "drawing",
    "books",
    "journal",
    "community-sharing",
    "games"
  ];

  // Animation for tab change with haptic feedback
  const animateTab = (index: number) => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Fixed number of tabs: home + 3 activities + more + settings = 6
    const numTabs = 6;
    const tabWidth = (width - 48) / numTabs; // Account for left/right padding
    const offsetX = index * tabWidth + (tabWidth / 2 - 12.5);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: offsetX,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setActiveIndex(index);
  };

  // Only include home, 3 activities, more, settings
  const visibleTabs = ["index", ...activityTabs.filter(a => allPossibleActivities.includes(a)).slice(0, 3), "more", "settings"];

  return (
    <Tabs
      screenOptions={({ route }) => {
        const indexOfRoute = visibleTabs.indexOf(route.name);
        
        return {
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
          tabBarShowLabel: false,
          tabBarIconStyle: styles.tabIcon,
          tabBarItemStyle: styles.tabItem,
          tabBarBackground: () => (
            <BlurView 
              intensity={isDark ? 40 : 60} 
              tint={isDark ? "dark" : "light"} 
              style={styles.tabBarInner}
            >
              <View style={[
                styles.tabBarContent, 
                { backgroundColor: isDark ? 'rgba(25,25,25,0.75)' : 'rgba(255,255,255,0.75)' }
              ]} />
            </BlurView>
          ),
          tabBarButton: (props: TabBarButtonProps) => {
            const { onPress, children, ...otherProps } = props;
            
            // Only show button for visible tabs
            if (indexOfRoute === -1) {
              return null;
            }
            
            return (
              <View style={{ position: 'relative', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                {activeIndex === indexOfRoute && (
                  <Animated.View
                    style={[
                      styles.activeTabBackground,
                      {
                        backgroundColor: isDark 
                          ? `${theme.primary}30` // 20% opacity
                          : `${theme.primary}20`, // 15% opacity
                        transform: [
                          { scale: scaleAnim },
                          { translateY: pulseAnim.interpolate({
                            inputRange: [1, 1.1],
                            outputRange: [0, -1]
                          })}
                        ],
                      },
                    ]}
                  />
                )}
                <Pressable 
                  {...otherProps}
                  onPress={(e) => {
                    onPress?.(e);
                    animateTab(indexOfRoute);
                  }}
                  style={({ pressed }) => [
                    { 
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                      width: '100%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  {children}
                </Pressable>
              </View>
            );
          },
        };
      }}
    >
      {/* Animated indicator */}
      <Animated.View 
        style={[
          styles.indicator, 
          { 
            backgroundColor: theme.primary,
            transform: [{ translateX }] 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.glow, 
          { 
            backgroundColor: `${theme.primary}40`,
            transform: [{ translateX }] 
          }
        ]} 
      />

      {/* Core tabs that always appear */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              color={color} 
              size={26} // Increased from 22 to 26
            />
          ),
        }}
      />

      {/* Dynamically show selected activities (limited to 3) */}
      {activityTabs.slice(0, 3).map((activity, idx) => {
        // Skip if activity isn't in our valid routes
        if (!allPossibleActivities.includes(activity)) {
          return null;
        }

        return (
          <Tabs.Screen
            key={activity}
            name={activity}
            options={{
              title: activity.charAt(0).toUpperCase() + activity.slice(1).replace("-", " "),
              tabBarIcon: ({ color, focused }) => {
                let iconName: keyof typeof Ionicons.glyphMap;
                let outlineName: keyof typeof Ionicons.glyphMap;
                switch (activity) {
                  case "music":
                    iconName = "musical-notes";
                    outlineName = "musical-notes-outline";
                    break;
                  case "drawing":
                    iconName = "brush";
                    outlineName = "brush-outline";
                    break;
                  case "books":
                    iconName = "book";
                    outlineName = "book-outline";
                    break;
                  case "journal":
                    iconName = "journal";
                    outlineName = "journal-outline";
                    break;
                  case "community-sharing":
                    iconName = "share-social";
                    outlineName = "share-social-outline";
                    break;
                  case "games":
                    iconName = "game-controller";
                    outlineName = "game-controller-outline";
                    break;
                  default:
                    iconName = "help";
                    outlineName = "help-outline";
                }
                return (
                  <Ionicons 
                    name={focused ? iconName : outlineName} 
                    color={color} 
                    size={26} // Increased from 22 to 26
                  />
                );
              },
            }}
          />
        );
      })}

      {/* Hide unselected activities */}
      {allPossibleActivities
        .filter(activity => !visibleTabs.includes(activity))
        .map(activity => (
          <Tabs.Screen
            key={`hidden-${activity}`}
            name={activity}
            options={{ href: null }} // Hide from tab bar
          />
        ))}

      {/* More and Settings tabs */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "apps" : "apps-outline"} 
              color={color} 
              size={26} // Increased from 22 to 26
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "settings" : "settings-outline"} 
              color={color} 
              size={26} // Increased from 22 to 26
            />
          ),
        }}
      />

      {/* Admin tab is removed */}
    </Tabs>
  );
}