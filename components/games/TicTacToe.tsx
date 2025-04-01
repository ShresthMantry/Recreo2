// components/games/TicTacToe.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  onBackToMenu: () => void;
}

type Player = "X" | "O";
type BoardState = (Player | null)[];
type GameMode = "1P" | "2P" | null;

// Add score interface to track scores for different modes
interface ScoreState {
  singlePlayer: {
    xWins: number;
    oWins: number;
    draws: number;
  };
  twoPlayer: {
    xWins: number;
    oWins: number;
    draws: number;
  };
}

const { width } = Dimensions.get("window");
const BOARD_SIZE = Math.min(width * 0.85, 300);
const CELL_SIZE = BOARD_SIZE / 3;

const TicTacToe: React.FC<Props> = ({ onBackToMenu }) => {
  const { theme } = useTheme();
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [winner, setWinner] = useState<Player | "Draw" | null>(null);
  // Replace individual score states with a combined score state
  const [scores, setScores] = useState<ScoreState>({
    singlePlayer: {
      xWins: 0,
      oWins: 0,
      draws: 0
    },
    twoPlayer: {
      xWins: 0,
      oWins: 0,
      draws: 0
    }
  });
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [gameMode, setGameMode] = useState<GameMode>(null);
  
  // Custom colors
  const xColor = theme.primary;
  const oColor = theme.success;
  // Fix the gradient colors to use tuples instead of arrays
  const xGradient = [theme.primary, '#82B1FF'] as const;
  const oGradient = [theme.success, '#66BB6A'] as const;

  // Helper function to get current mode scores
  const getCurrentScores = () => {
    return gameMode === "1P" ? scores.singlePlayer : scores.twoPlayer;
  };

  useEffect(() => {
    if (gameMode) {
      checkWinner();
    }
  }, [board]);

  useEffect(() => {
    // AI move
    if (gameMode === "1P" && !isXNext && !winner) {
      setTimeout(() => {
        makeAIMove();
      }, 500); // Add a small delay to make it feel more natural
    }
  }, [isXNext, winner, gameMode]);

  const handlePress = (index: number) => {
    if (board[index] || winner || (gameMode === "1P" && !isXNext)) return;

    // Animate the board fade out and in
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const newBoard = [...board];
    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const makeAIMove = () => {
    const bestMove = findBestMove(board);
    if (bestMove !== -1) {
      const newBoard = [...board];
      newBoard[bestMove] = "O";
      
      // Animate the board
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      setBoard(newBoard);
      setIsXNext(true);
    }
  };

  // Minimax algorithm with alpha-beta pruning
  const minimax = (board: BoardState, depth: number, isMaximizing: boolean, alpha: number, beta: number): number => {
    // Check for terminal states
    const score = evaluateBoard(board);
    if (score === 10) return score - depth;
    if (score === -10) return score + depth;
    if (!board.includes(null)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = "O"; // AI is O
          const score = minimax(board, depth + 1, false, alpha, beta);
          board[i] = null;
          bestScore = Math.max(score, bestScore);
          alpha = Math.max(alpha, bestScore);
          if (beta <= alpha) break; // Alpha-beta pruning
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = "X"; // Human is X
          const score = minimax(board, depth + 1, true, alpha, beta);
          board[i] = null;
          bestScore = Math.min(score, bestScore);
          beta = Math.min(beta, bestScore);
          if (beta <= alpha) break; // Alpha-beta pruning
        }
      }
      return bestScore;
    }
  };

  const findBestMove = (board: BoardState): number => {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = "O"; // AI is O
        const score = minimax(board, 0, false, -Infinity, Infinity);
        board[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove;
  };

  const evaluateBoard = (board: BoardState): number => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        if (board[a] === "O") return 10; // AI wins
        if (board[a] === "X") return -10; // Human wins
      }
    }
    return 0; // No winner
  };

  const checkWinner = () => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a] as Player);
        setWinningLine(lines[i]);
        
        // Update scores based on game mode
        setScores(prevScores => {
          const newScores = {...prevScores};
          if (gameMode === "1P") {
            if (board[a] === "X") {
              newScores.singlePlayer.xWins += 1;
            } else {
              newScores.singlePlayer.oWins += 1;
            }
          } else {
            if (board[a] === "X") {
              newScores.twoPlayer.xWins += 1;
            } else {
              newScores.twoPlayer.oWins += 1;
            }
          }
          return newScores;
        });
        return;
      }
    }

    // Check for draw
    if (!board.includes(null) && !winner) {
      setWinner("Draw");
      
      // Update draw count based on game mode
      setScores(prevScores => {
        const newScores = {...prevScores};
        if (gameMode === "1P") {
          newScores.singlePlayer.draws += 1;
        } else {
          newScores.twoPlayer.draws += 1;
        }
        return newScores;
      });
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
  };

  // Add function to reset scores
  const resetScores = () => {
    setScores({
      singlePlayer: {
        xWins: 0,
        oWins: 0,
        draws: 0
      },
      twoPlayer: {
        xWins: 0,
        oWins: 0,
        draws: 0
      }
    });
    // Also reset the game when scores are reset
    resetGame();
  };

  const selectGameMode = (mode: GameMode) => {
    setGameMode(mode);
    resetGame();
  };

  const renderSquare = (index: number) => {
    const isWinningCell = winningLine?.includes(index);
    const cellValue = board[index];
    
    return (
      <TouchableOpacity
        style={[
          styles.square,
          { 
            backgroundColor: theme.surface,
            borderColor: theme.divider,
            shadowColor: theme.primary,
          },
          isWinningCell && { 
            backgroundColor: theme.surfaceHover,
            borderColor: cellValue === "X" ? xColor : oColor,
          }
        ]}
        onPress={() => handlePress(index)}
        disabled={!!winner || (gameMode === "1P" && !isXNext)}
        activeOpacity={0.7}
      >
        {cellValue && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {cellValue === "X" ? (
              <LinearGradient
                colors={xGradient}
                style={styles.symbolContainer}
              >
                <Text style={[styles.squareText, styles.xText]}>X</Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={oGradient}
                style={styles.symbolContainer}
              >
                <Text style={[styles.squareText, styles.oText]}>O</Text>
              </LinearGradient>
            )}
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  // Game mode selection screen
  if (!gameMode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: theme.surfaceHover }]} 
            onPress={onBackToMenu}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Tic Tac Toe</Text>
        </View>
        
        <View style={styles.modeSelectionContainer}>
          <Text style={[styles.modeSelectionTitle, { color: theme.text }]}>Select Game Mode</Text>
          
          <TouchableOpacity 
            style={[styles.modeButton, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]} 
            onPress={() => selectGameMode("1P")}
          >
            <Ionicons name="person" size={32} color={theme.primary} style={styles.modeIcon} />
            <Text style={[styles.modeButtonText, { color: theme.text }]}>Single Player</Text>
            <Text style={[styles.modeDescription, { color: theme.secondaryText }]}>Play against Bot</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modeButton, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]} 
            onPress={() => selectGameMode("2P")}
          >
            <Ionicons name="people" size={32} color={theme.success} style={styles.modeIcon} />
            <Text style={[styles.modeButtonText, { color: theme.text }]}>Two Players</Text>
            <Text style={[styles.modeDescription, { color: theme.secondaryText }]}>Play with a friend</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Get current mode scores
  const currentScores = getCurrentScores();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surfaceHover }]} 
          onPress={() => setGameMode(null)}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {gameMode === "1P" ? "Single Player" : "Two Players"}
        </Text>
        
        {/* Reset scores button positioned at the right corner */}
        <TouchableOpacity 
          style={[styles.resetScoreButton, { backgroundColor: theme.surfaceHover }]} 
          onPress={resetScores}
        >
          <Ionicons name="refresh-circle" size={24} color={theme.error} />
        </TouchableOpacity>
      </View>

      <View style={[styles.scoreContainer, { backgroundColor: theme.cardBackground }]}>
        <View style={[styles.scoreItem, isXNext && !winner && styles.activePlayer]}>
          <LinearGradient
            colors={xGradient}
            style={styles.playerIcon}
          >
            <Text style={styles.playerSymbol}>X</Text>
          </LinearGradient>
          <Text style={[styles.scoreLabel, { color: theme.secondaryText }]}>
            {gameMode === "1P" ? "You" : "Player X"}
          </Text>
          <Text style={[styles.scoreValue, { color: theme.text }]}>{currentScores.xWins}</Text>
        </View>
        
        <View style={styles.scoreItemCenter}>
          <Text style={[styles.vsText, { color: theme.secondaryText }]}>VS</Text>
          <View style={[styles.drawsContainer, { backgroundColor: theme.surfaceHover }]}>
            <Text style={[styles.drawsLabel, { color: theme.secondaryText }]}>Draws</Text>
            <Text style={[styles.drawsValue, { color: theme.text }]}>{currentScores.draws}</Text>
          </View>
        </View>
        
        <View style={[styles.scoreItem, !isXNext && !winner && styles.activePlayer]}>
          <LinearGradient
            colors={oGradient}
            style={styles.playerIcon}
          >
            <Text style={styles.playerSymbol}>O</Text>
          </LinearGradient>
          <Text style={[styles.scoreLabel, { color: theme.secondaryText }]}>
            {gameMode === "1P" ? "Bot" : "Player O"}
          </Text>
          <Text style={[styles.scoreValue, { color: theme.text }]}>{currentScores.oWins}</Text>
        </View>
      </View>

      <View style={styles.statusContainer}>
        {winner ? (
          <View style={[styles.winnerBanner, { 
            backgroundColor: winner === "Draw" 
              ? theme.surfaceHover 
              : winner === "X" 
                ? `${xColor}20` 
                : `${oColor}20`,
            borderColor: winner === "Draw" 
              ? theme.divider 
              : winner === "X" 
                ? xColor 
                : oColor
          }]}>
            <Text style={[styles.statusText, { 
              color: winner === "Draw" 
                ? theme.text 
                : winner === "X" 
                  ? xColor 
                  : oColor 
            }]}>
              {winner === "Draw" 
                ? "Game Ended in Draw!" 
                : gameMode === "1P" 
                  ? `${winner === "X" ? "You win!" : "Bot wins!"}` 
                  : `Player ${winner} wins!`}
            </Text>
          </View>
        ) : (
          <View style={[styles.turnIndicator, { 
            backgroundColor: isXNext ? `${xColor}20` : `${oColor}20`,
            borderColor: isXNext ? xColor : oColor
          }]}>
            <Text style={[styles.statusText, { 
              color: isXNext ? xColor : oColor 
            }]}>
              {gameMode === "1P" 
                ? (isXNext ? "Your turn" : "Bot is thinking...") 
                : `Player ${isXNext ? "X" : "O"}'s turn`}
            </Text>
          </View>
        )}
      </View>

      <Animated.View 
        style={[
          styles.boardContainer, 
          { 
            opacity: fadeAnim,
            backgroundColor: theme.cardBackground
          }
        ]}
      >
        <View style={styles.board}>
          <View style={styles.row}>
            {renderSquare(0)}
            {renderSquare(1)}
            {renderSquare(2)}
          </View>
          <View style={styles.row}>
            {renderSquare(3)}
            {renderSquare(4)}
            {renderSquare(5)}
          </View>
          <View style={styles.row}>
            {renderSquare(6)}
            {renderSquare(7)}
            {renderSquare(8)}
          </View>
        </View>
      </Animated.View>

      <TouchableOpacity 
        style={[styles.resetButton, { backgroundColor: theme.primary }]} 
        onPress={resetGame}
      >
        <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.resetButtonText}>New Game</Text>
      </TouchableOpacity>
    </View>
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
    marginBottom: 20,
    justifyContent: "space-between", // This ensures the elements are spaced out
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  resetScoreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    flex: 1,
    textAlign: "center", // Center the title text
  },
  statusContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
  },
  winnerBanner: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  turnIndicator: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreItem: {
    alignItems: "center",
    flex: 2,
    padding: 8,
    borderRadius: 12,
  },
  scoreItemCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: 'center',
  },
  activePlayer: {
    transform: [{ scale: 1.05 }],
  },
  playerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerSymbol: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  vsText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  drawsContainer: {
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  drawsLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  drawsValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  boardContainer: {
    alignSelf: "center",
    padding: 15,
    borderRadius: 16,
    elevation: 0,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
  row: {
    flexDirection: "row",
  },
  square: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  symbolContainer: {
    width: CELL_SIZE * 0.7,
    height: CELL_SIZE * 0.7,
    borderRadius: CELL_SIZE * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareText: {
    fontSize: CELL_SIZE * 0.5,
    fontWeight: "bold",
  },
  xText: {
    color: "#FFFFFF",
  },
  oText: {
    color: "#FFFFFF",
  },
  resetButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: 'center',
    marginTop: 30,
    alignSelf: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Game mode selection styles
  modeSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modeSelectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 40,
  },
  modeButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
  },
  modeDescription: {
    fontSize: 14,
    marginTop: 5,
  },
  modeIcon: {
    marginBottom: 5,
  },
});

export default TicTacToe;