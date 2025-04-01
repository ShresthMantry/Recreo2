// components/games/Sudoku.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  onBackToMenu: () => void;
}

type SudokuBoard = (number | null)[][];
type Difficulty = "easy" | "medium" | "hard";

const Sudoku: React.FC<Props> = ({ onBackToMenu }) => {
  const { theme } = useTheme();
  const [originalBoard, setOriginalBoard] = useState<SudokuBoard>([]);
  const [board, setBoard] = useState<SudokuBoard>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [timer, setTimer] = useState<number>(0);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [livesLeft, setLivesLeft] = useState<number>(3);

  useEffect(() => {
    if (isGameActive && !isGameWon && !isGameOver) {
      const interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGameActive, isGameWon, isGameOver]);

  const generateNewGame = () => {
    const newBoard = generateSudokuPuzzle(difficulty);
    setOriginalBoard(cloneBoard(newBoard));
    setBoard(cloneBoard(newBoard));
    setSelectedCell(null);
    setTimer(0);
    setIsGameActive(true);
    setIsGameWon(false);
    setIsGameOver(false);
    setLivesLeft(3);
  };

  const cloneBoard = (board: SudokuBoard): SudokuBoard => {
    return board.map(row => [...row]);
  };

  useEffect(() => {
    generateNewGame();
  }, [difficulty]);

  const handleCellPress = (row: number, col: number) => {
    if (originalBoard[row][col] !== null || isGameOver || isGameWon) return; // Can't select pre-filled cells or when game is over
    setSelectedCell([row, col]);
  };

  // Check if a number is valid in the current position
  const isValidMove = (board: SudokuBoard, row: number, col: number, num: number): boolean => {
    // Check row
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num) return false;
    }
    
    // Check column
    for (let i = 0; i < 9; i++) {
      if (board[i][col] === num) return false;
    }
    
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxRow + i][boxCol + j] === num) return false;
      }
    }
    
    return true;
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || isGameWon || isGameOver) return;
    
    const [row, col] = selectedCell;
    
    // Check if the move is valid
    if (isValidMove(board, row, col, num)) {
      const newBoard = cloneBoard(board);
      newBoard[row][col] = num;
      setBoard(newBoard);
      
      // Check if the game is won
      if (isBoardComplete(newBoard)) {
        setIsGameWon(true);
        Alert.alert("Congratulations!", "You've solved the puzzle!", [
          { text: "OK" }
        ]);
      }
    } else {
      // Invalid move
      const newLivesLeft = livesLeft - 1;
      setLivesLeft(newLivesLeft);
      
      if (newLivesLeft <= 0) {
        setIsGameOver(true);
        Alert.alert("Game Over", "You've lost all your lives!", [
          { text: "OK" }
        ]);
      } else {
        Alert.alert("Invalid Move", `This number already exists in the row, column, or box. Lives left: ${newLivesLeft}`, [
          { text: "OK" }
        ]);
      }
    }
  };

  const handleClearCell = () => {
    if (!selectedCell || isGameWon || isGameOver) return;
    
    const [row, col] = selectedCell;
    if (originalBoard[row][col] !== null) return; // Can't clear pre-filled cells
    
    const newBoard = cloneBoard(board);
    newBoard[row][col] = null;
    setBoard(newBoard);
  };

  const isBoardComplete = (board: SudokuBoard): boolean => {
    return board.every(row => row.every(cell => cell !== null));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCell = (value: number | null, row: number, col: number) => {
    const isSelected = selectedCell && selectedCell[0] === row && selectedCell[1] === col;
    const isPrefilled = originalBoard[row][col] !== null;
    
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.cell,
          { 
            backgroundColor: isPrefilled ? theme.surfaceHover : theme.surface,
            borderColor: theme.divider 
          },
          isSelected && { backgroundColor: theme.primary + '40' }, // 40 is for opacity
          col % 3 === 2 && col < 8 && styles.rightBorder,
          row % 3 === 2 && row < 8 && styles.bottomBorder,
        ]}
        onPress={() => handleCellPress(row, col)}
        disabled={isPrefilled || isGameOver || isGameWon}
      >
        <Text style={[
          styles.cellText,
          { color: isPrefilled ? theme.secondaryText : theme.text }
        ]}>
          {value !== null ? value.toString() : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHearts = () => {
    const hearts = [];
    
    for (let i = 0; i < 3; i++) {
      hearts.push(
        <Ionicons 
          key={`heart-${i}`}
          name={i < livesLeft ? "heart" : "heart-outline"} 
          size={24} 
          color={i < livesLeft ? theme.error : theme.secondaryText}
          style={styles.heartIcon}
        />
      );
    }
    
    return hearts;
  };

  // Create an empty board filled with nulls
  const createEmptyBoard = (): SudokuBoard => {
    return Array(9).fill(null).map(() => Array(9).fill(null));
  };

  // Check if a number can be placed at a specific position
  const isValid = (board: SudokuBoard, row: number, col: number, num: number): boolean => {
    // Check row
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num) return false;
    }
    
    // Check column
    for (let i = 0; i < 9; i++) {
      if (board[i][col] === num) return false;
    }
    
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxRow + i][boxCol + j] === num) return false;
      }
    }
    
    return true;
  };

  // Solve the Sudoku board using backtracking
  const solveSudoku = (board: SudokuBoard): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === null) {
          // Try placing numbers 1-9
          const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              
              if (solveSudoku(board)) {
                return true;
              }
              
              board[row][col] = null; // Backtrack
            }
          }
          return false; // No valid number found
        }
      }
    }
    return true; // Board is solved
  };

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Generate a random solved Sudoku board
  const generateRandomSolvedBoard = (): SudokuBoard => {
    const board = createEmptyBoard();
    
    // Fill the first row with random numbers
    const firstRow = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let i = 0; i < 9; i++) {
      board[0][i] = firstRow[i];
    }
    
    // Solve the rest of the board
    solveSudoku(board);
    return board;
  };

  const generateSudokuPuzzle = (difficulty: Difficulty): SudokuBoard => {
    // Generate a random solved board
    const solvedBoard = generateRandomSolvedBoard();
    const puzzle = cloneBoard(solvedBoard);
    
    // Define how many cells to remove based on difficulty
    let cellsToRemove;
    switch (difficulty) {
      case "easy":
        cellsToRemove = 30;
        break;
      case "medium":
        cellsToRemove = 45;
        break;
      case "hard":
        cellsToRemove = 55;
        break;
      default:
        cellsToRemove = 45;
    }
    
    // Remove cells to create the puzzle
    let removedCells = 0;
    const positions = shuffleArray(
      Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
    );
    
    for (const [row, col] of positions) {
      if (removedCells >= cellsToRemove) break;
      
      const temp = puzzle[row][col];
      puzzle[row][col] = null;
      removedCells++;
    }
    
    return puzzle;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToMenu}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Sudoku</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.difficultyContainer}>
          <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>Difficulty:</Text>
          <View style={styles.difficultyButtons}>
            <TouchableOpacity 
              style={[
                styles.difficultyButton, 
                { backgroundColor: theme.surfaceHover },
                difficulty === "easy" && { backgroundColor: theme.primary }
              ]}
              onPress={() => setDifficulty("easy")}
            >
              <Text style={[
                styles.difficultyText, 
                { color: theme.secondaryText },
                difficulty === "easy" && { color: theme.surface, fontWeight: "600" }
              ]}>Easy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.difficultyButton, 
                { backgroundColor: theme.surfaceHover },
                difficulty === "medium" && { backgroundColor: theme.primary }
              ]}
              onPress={() => setDifficulty("medium")}
            >
              <Text style={[
                styles.difficultyText, 
                { color: theme.secondaryText },
                difficulty === "medium" && { color: theme.surface, fontWeight: "600" }
              ]}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.difficultyButton, 
                { backgroundColor: theme.surfaceHover },
                difficulty === "hard" && { backgroundColor: theme.primary }
              ]}
              onPress={() => setDifficulty("hard")}
            >
              <Text style={[
                styles.difficultyText, 
                { color: theme.secondaryText },
                difficulty === "hard" && { color: theme.surface, fontWeight: "600" }
              ]}>Hard</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timerContainer}>
          <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>Time:</Text>
          <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(timer)}</Text>
        </View>
      </View>

      <View style={[styles.statusContainer, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.livesContainer}>
          <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>Lives:</Text>
          <View style={styles.heartsRow}>
            {renderHearts()}
          </View>
        </View>
        <View style={styles.gameStatusContainer}>
          <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>Status:</Text>
          <Text 
            style={[
              styles.gameStatusText, 
              { 
                color: isGameWon 
                  ? theme.success 
                  : isGameOver 
                    ? theme.error 
                    : theme.text 
              }
            ]}
          >
            {isGameWon ? "Won" : isGameOver ? "Game Over" : "Playing"}
          </Text>
        </View>
      </View>

      <View style={[styles.board, { borderColor: theme.divider }]}>
        {board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
          </View>
        ))}
      </View>

      <View style={styles.numPadContainer}>
        <View style={styles.numPadRow}>
          {[1, 2, 3, 4, 5].map(num => (
            <TouchableOpacity 
              key={`num-${num}`} 
              style={[styles.numPadButton, { backgroundColor: theme.surfaceHover }]}
              onPress={() => handleNumberInput(num)}
              disabled={isGameOver || isGameWon}
            >
              <Text style={[styles.numPadText, { color: theme.text }]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.numPadRow}>
          {[6, 7, 8, 9].map(num => (
            <TouchableOpacity 
              key={`num-${num}`} 
              style={[styles.numPadButton, { backgroundColor: theme.surfaceHover }]}
              onPress={() => handleNumberInput(num)}
              disabled={isGameOver || isGameWon}
            >
              <Text style={[styles.numPadText, { color: theme.text }]}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={[styles.numPadButton, { backgroundColor: theme.elevation2 }]}
            onPress={handleClearCell}
            disabled={isGameOver || isGameWon}
          >
            <Ionicons name="backspace-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.newGameButton, { backgroundColor: theme.primary }]} 
        onPress={generateNewGame}
      >
        <Text style={[styles.newGameButtonText, { color: theme.surface }]}>New Game</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  difficultyContainer: {
    flex: 2,
  },
  timerContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  livesContainer: {
    flex: 1,
  },
  heartsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  heartIcon: {
    marginRight: 4,
  },
  gameStatusContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  gameStatusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  difficultyButtons: {
    flexDirection: "row",
  },
  difficultyButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 12,
  },
  timerText: {
    fontSize: 18,
    fontWeight: "600",
  },
  board: {
    alignSelf: "center",
    borderWidth: 2,
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
  },
  rightBorder: {
    borderRightWidth: 2,
  },
  bottomBorder: {
    borderBottomWidth: 2,
  },
  cellText: {
    fontSize: 16,
  },
  numPadContainer: {
    marginTop: 16,
  },
  numPadRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  numPadButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    margin: 4,
  },
  numPadText: {
    fontSize: 20,
    fontWeight: "600",
  },
  newGameButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  newGameButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Sudoku;