// app/(tabs)/drawing.tsx
import React, { useState, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Platform, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../context/ThemeContext";
import TicTacToe from "../../components/games/TicTacToe";
import Sudoku from "../../components/games/Sudoku";
import Minesweeper from "../../components/games/Minesweeper";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

type GameType = "menu" | "tictactoe" | "sudoku" | "minesweeper";

const { width } = Dimensions.get("window");

export default function Drawing() {
  const [currentGame, setCurrentGame] = useState<GameType>("menu");
  const { theme, isDark } = useTheme();

  const handleBackToMenu = () => {
    setCurrentGame("menu");
  };

  const renderCurrentScreen = () => {
    switch (currentGame) {
      case "tictactoe":
        return <TicTacToe onBackToMenu={handleBackToMenu} />;
      case "sudoku":
        return <Sudoku onBackToMenu={handleBackToMenu} />;
      case "minesweeper":
        return <Minesweeper onBackToMenu={handleBackToMenu} />;
      default:
        return (
          <ScrollView 
            style={[styles.menuContainer, { backgroundColor: theme.background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.title, { color: theme.text }]}>Classic Games</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Select a game to play</Text>

            <View style={styles.gameButtonsContainer}>
              <GameButton 
                title="Tic Tac Toe" 
                description="Classic X and O game" 
                onPress={() => setCurrentGame("tictactoe")} 
                icon="grid"
                gradientColors={["#FF5252", "#FF1744"] as const} 
              />
              <GameButton 
                title="Sudoku" 
                description="Logic-based number puzzle" 
                onPress={() => setCurrentGame("sudoku")} 
                icon="apps"
                gradientColors={["#448AFF", "#2979FF"] as const} 
              />
              <GameButton 
                title="Minesweeper" 
                description="Find hidden mines" 
                onPress={() => setCurrentGame("minesweeper")} 
                icon="alert-circle"
                gradientColors={["#66BB6A", "#43A047"] as const} 
              />
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

interface GameButtonProps {
  title: string;
  description: string;
  onPress: () => void;
  gradientColors: readonly [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}

const GameButton: React.FC<GameButtonProps> = ({ 
  title, 
  description, 
  onPress, 
  gradientColors,
  icon
}) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={styles.gameButtonContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gameButton}
      >
        <View style={styles.gameButtonContent}>
          <View style={styles.gameButtonTextContainer}>
            <Text style={styles.gameButtonTitle}>{title}</Text>
            <Text style={styles.gameButtonDescription}>{description}</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={32} color="rgba(255, 255, 255, 0.9)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    paddingBottom: Platform.OS === 'android' ? 80 : 0, // Add padding for Android only
  },
  menuContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0.2,
  },
  gameButtonsContainer: {
    gap: 24,
  },
  gameButtonContainer: {
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    marginBottom: 12,
    transform: [{ scale: 1 }],
  },
  gameButton: {
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
  },
  gameButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  gameButtonTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  gameButtonTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameButtonDescription: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.95)",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0.2,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
});