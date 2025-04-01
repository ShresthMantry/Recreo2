// components/games/Minesweeper.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Platform, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  onBackToMenu: () => void;
}

interface Cell {
  hasMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

type Difficulty = "easy" | "medium" | "hard";
type GameStatus = "waiting" | "playing" | "won" | "lost";

const { width } = Dimensions.get("window");
const cellSize = Math.min(28, (width - 40) / 12);

const Minesweeper: React.FC<Props> = ({ onBackToMenu }) => {
  const { theme, isDark } = useTheme();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [board, setBoard] = useState<Cell[][]>([[]]);
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [flagMode, setFlagMode] = useState<boolean>(false);
  const [flagsRemaining, setFlagsRemaining] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  
  const getDifficultySettings = () => {
    switch (difficulty) {
      case "easy":
        return { rows: 8, cols: 8, mines: 10 };
      case "medium":
        return { rows: 10, cols: 10, mines: 20 };
      case "hard":
        return { rows: 12, cols: 12, mines: 40 };
      default:
        return { rows: 10, cols: 10, mines: 20 };
    }
  };
  
  useEffect(() => {
    initializeGame();
  }, [difficulty]);
  
  useEffect(() => {
    if (gameStatus === "playing") {
      const interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameStatus]);
  
  const initializeGame = () => {
    const { rows, cols, mines } = getDifficultySettings();
    
    // Create empty board
    const newBoard: Cell[][] = Array(rows).fill(null).map(() => 
      Array(cols).fill(null).map(() => ({
        hasMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0
      }))
    );
    
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      
      if (!newBoard[row][col].hasMine) {
        newBoard[row][col].hasMine = true;
        minesPlaced++;
      }
    }
    
    // Calculate adjacent mines
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!newBoard[row][col].hasMine) {
          let count = 0;
          // Check all 8 adjacent cells
          for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
              if (!(r === row && c === col) && newBoard[r][c].hasMine) {
                count++;
              }
            }
          }
          newBoard[row][col].adjacentMines = count;
        }
      }
    }
    
    setBoard(newBoard);
    setGameStatus("waiting");
    setFlagMode(false);
    setFlagsRemaining(mines);
    setTimer(0);
  };
  
  const handleCellPress = (row: number, col: number) => {
    if (gameStatus === "won" || gameStatus === "lost") return;
    
    // First click starts the game
    if (gameStatus === "waiting") {
      setGameStatus("playing");
    }
    
    const cell = board[row][col];
    
    // If the cell is already revealed or flagged, do nothing
    if (cell.isRevealed || cell.isFlagged) return;
    
    // Handle flag mode
    if (flagMode) {
      toggleFlag(row, col);
      return;
    }
    
    // Create a new board to avoid mutating state directly
    const newBoard = [...board.map(row => [...row])];
    
    // If the cell has a mine, game over
    if (cell.hasMine) {
      // Reveal all mines
      for (let r = 0; r < newBoard.length; r++) {
        for (let c = 0; c < newBoard[0].length; c++) {
          if (newBoard[r][c].hasMine) {
            newBoard[r][c].isRevealed = true;
          }
        }
      }
      setBoard(newBoard);
      setGameStatus("lost");
      Alert.alert("Game Over", "You hit a mine!", [{ text: "OK" }]);
      return;
    }
    
    // Reveal the cell
    revealCell(newBoard, row, col);
    
    // Check if the game is won
    if (checkWinCondition(newBoard)) {
      setGameStatus("won");
      Alert.alert("Congratulations!", "You cleared all mines!", [{ text: "OK" }]);
    }
    
    setBoard(newBoard);
  };
  
  const revealCell = (board: Cell[][], row: number, col: number) => {
    // If out of bounds, or already revealed, or flagged, do nothing
    if (
      row < 0 || 
      row >= board.length || 
      col < 0 || 
      col >= board[0].length || 
      board[row][col].isRevealed || 
      board[row][col].isFlagged
    ) {
      return;
    }
    
    // Reveal the cell
    board[row][col].isRevealed = true;
    
    // If the cell has no adjacent mines, reveal all adjacent cells
    if (board[row][col].adjacentMines === 0) {
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r !== row || c !== col) {
            revealCell(board, r, c);
          }
        }
      }
    }
  };
  
  const toggleFlag = (row: number, col: number) => {
    const newBoard = [...board.map(r => [...r])];
    const cell = newBoard[row][col];
    
    // Can't flag revealed cells
    if (cell.isRevealed) return;
    
    // Toggle flag
    if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlagsRemaining(flagsRemaining + 1);
    } else if (flagsRemaining > 0) {
      cell.isFlagged = true;
      setFlagsRemaining(flagsRemaining - 1);
    }
    
    setBoard(newBoard);
  };
  
  const checkWinCondition = (board: Cell[][]) => {
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[0].length; col++) {
        // If there's a cell that's not a mine and not revealed, the game is not won yet
        if (!board[row][col].hasMine && !board[row][col].isRevealed) {
          return false;
        }
      }
    }
    return true;
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getCellContent = (cell: Cell) => {
    if (!cell.isRevealed) {
      if (cell.isFlagged) {
        return <Ionicons name="flag" size={cellSize * 0.6} color={theme.accent} />;
      }
      return null;
    }
    
    if (cell.hasMine) {
      return <Ionicons name="alert-circle" size={cellSize * 0.6} color={theme.error} />;
    }
    
    if (cell.adjacentMines === 0) {
      return null;
    }
    
    const colors = [
      theme.primary,     // 1
      theme.success,     // 2
      theme.error,       // 3
      theme.secondary,   // 4
      theme.accent,      // 5
      theme.primary,     // 6
      theme.text,        // 7
      theme.secondaryText // 8
    ];
    
    return (
      <Text style={[styles.cellText, { color: colors[cell.adjacentMines - 1] }]}>
        {cell.adjacentMines}
      </Text>
    );
  };
  
  const renderBoard = () => {
    return (
      <View style={[styles.boardContainer, { backgroundColor: theme.cardBackground }]}>
        <View style={[styles.board, { borderColor: theme.divider }]}>
          {board.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {row.map((cell, colIndex) => (
                <TouchableOpacity
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={[
                    styles.cell,
                    { 
                      width: cellSize, 
                      height: cellSize,
                      backgroundColor: cell.isRevealed 
                        ? isDark ? theme.elevation1 : '#e0e0e0'
                        : isDark ? theme.elevation2 : '#ffffff',
                      borderColor: theme.divider,
                      // Add shadow for unrevealed cells to create depth
                      elevation: cell.isRevealed ? 0 : 2,
                      // Add inner shadow effect for revealed cells
                      ...(cell.isRevealed ? {
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
                      } : {
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      })
                    }
                  ]}
                  onPress={() => handleCellPress(rowIndex, colIndex)}
                >
                  {getCellContent(cell)}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.cardBackground }]} 
          onPress={onBackToMenu}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Minesweeper</Text>
      </View>
      
      <View style={styles.controlBar}>
        <View style={[styles.infoSection, { backgroundColor: theme.cardBackground }]}>
          <Ionicons name="flag" size={18} color={theme.accent} />
          <Text style={[styles.infoText, { color: theme.text }]}>{flagsRemaining}</Text>
        </View>
        
        <View style={styles.difficultyButtons}>
          {["easy", "medium", "hard"].map((level) => (
            <TouchableOpacity 
              key={level}
              style={[
                styles.difficultyButton, 
                { 
                  backgroundColor: difficulty === level ? theme.primary : theme.cardBackground,
                  borderColor: theme.divider
                }
              ]}
              onPress={() => setDifficulty(level as Difficulty)}
            >
              <Text 
                style={[
                  styles.difficultyText, 
                  { 
                    color: difficulty === level ? theme.surface : theme.secondaryText,
                    fontWeight: difficulty === level ? "600" : "400"
                  }
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={[styles.infoSection, { backgroundColor: theme.cardBackground }]}>
          <Ionicons name="time-outline" size={18} color={theme.text} />
          <Text style={[styles.infoText, { color: theme.text }]}>{formatTime(timer)+" "}</Text>
        </View>
      </View>
      
      {renderBoard()}
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[
            styles.controlButton,
            { 
              backgroundColor: flagMode ? theme.primary : theme.cardBackground,
              borderColor: theme.divider
            }
          ]}
          onPress={() => setFlagMode(!flagMode)}
        >
          <LinearGradient
            colors={flagMode ? [theme.primary, theme.secondary] as const : [theme.cardBackground, theme.cardBackground] as const}
            style={styles.controlButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name="flag" 
              size={24} 
              color={flagMode ? theme.surface : theme.accent} 
            />
            <Text 
              style={[
                styles.controlText, 
                { 
                  color: flagMode ? theme.surface : theme.text,
                  fontWeight: flagMode ? "600" : "500"
                }
              ]}
            >
              {flagMode ? "Flag Mode ON" : "Flag Mode"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]}
          onPress={initializeGame}
        >
          <LinearGradient
            colors={[theme.cardBackground, theme.cardBackground] as const}
            style={styles.controlButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="refresh" size={24} color={theme.primary} />
            <Text style={[styles.controlText, { color: theme.text }]}>New Game</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: 0.5,
  },
  controlBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoText: {
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  difficultyButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  difficultyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  difficultyText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  boardContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginVertical: 10,
  },
  board: {
    borderWidth: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  cellText: {
    fontWeight: "bold",
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    marginBottom: 10,
  },
  controlButton: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: "45%",
  },
  controlButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  controlText: {
    marginLeft: 8,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

export default Minesweeper;