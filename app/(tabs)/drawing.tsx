import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, PanResponder, TouchableOpacity, Text, Dimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Extend WebGLRenderingContext for Expo
declare global {
  interface WebGLRenderingContext {
    endFrameEXP(): void;
  }
}

// Extended color palette with more options
const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#A52A2A',
  '#800080', '#008080', '#808000', '#800000', '#008000',
  '#000080', '#FF4500', '#DA70D6', '#1E90FF', '#32CD32'
];

// Increased eraser size options
const ERASER_SIZES = [
  { size: 5, label: 'XS' },
  { size: 10, label: 'S' },
  { size: 20, label: 'M' },
  { size: 30, label: 'L' },
  { size: 40, label: 'XL' }
];

// Brush size options
const BRUSH_SIZES = [
  { size: 2, label: 'XS' },
  { size: 5, label: 'S' },
  { size: 10, label: 'M' },
  { size: 15, label: 'L' },
  { size: 20, label: 'XL' }
];

export default function DrawingScreen() {
  const { theme, isDark } = useTheme();
  const [color, setColor] = useState('#ffffff');
  const [isEraser, setIsEraser] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [eraserWidth, setEraserWidth] = useState(20);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showEraserSizes, setShowEraserSizes] = useState(false);
  const [showBrushSizes, setShowBrushSizes] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [canvasLayout, setCanvasLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [undoStack, setUndoStack] = useState<THREE.Line[][]>([]);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const linesRef = useRef<THREE.Line[]>([]);
  const currentLineRef = useRef<THREE.Line | null>(null);
  const pointsRef = useRef<THREE.Vector3[]>([]);

  // Close all menus when tapping outside
  useEffect(() => {
    if (showColorPalette || showEraserSizes || showBrushSizes) {
      const timer = setTimeout(() => {
        setShowColorPalette(false);
        setShowEraserSizes(false);
        setShowBrushSizes(false);
      }, 5000); // Auto-close after 5 seconds of inactivity
      
      return () => clearTimeout(timer);
    }
  }, [showColorPalette, showEraserSizes, showBrushSizes]);

  const onGLContextCreate = async (gl: WebGLRenderingContext) => {
    glRef.current = gl;

    // Create renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(isDark ? 0x1a1a1a : 0xf5f5f5); // Use theme-based background
    rendererRef.current = renderer;

    // Create camera
    const camera = new THREE.OrthographicCamera(
      -screenWidth / 2,  // left
      screenWidth / 2,   // right
      screenHeight / 2,  // top
      -screenHeight / 2, // bottom
      0.1,
      1000
    );
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Initial render
    renderer.render(scene, camera);
    gl.endFrameEXP();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (!glRef.current || !sceneRef.current || !canvasLayout) return;

      // Close any open menus when drawing starts
      setShowColorPalette(false);
      setShowEraserSizes(false);
      setShowBrushSizes(false);

      const { locationX: x, locationY: y } = e.nativeEvent;

      // Convert touch coordinates to Three.js world coordinates
      const worldX = x - (canvasLayout.width / 2);
      const worldY = (canvasLayout.height / 2) - y; // Flip Y axis

      // Create new points array for this line
      pointsRef.current = [new THREE.Vector3(worldX, worldY, 0)];

      // Create geometry
      const geometry = new THREE.BufferGeometry().setFromPoints(pointsRef.current);

      // Create material with rounded caps and joins
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(isEraser ? (isDark ? '#1a1a1a' : '#f5f5f5') : color),
        linewidth: isEraser ? eraserWidth : strokeWidth,
        linecap: 'round',
        linejoin: 'round'
      });

      // Create line
      currentLineRef.current = new THREE.Line(geometry, material);
      sceneRef.current.add(currentLineRef.current);
    },
    onPanResponderMove: (e) => {
      if (!glRef.current || !sceneRef.current || !currentLineRef.current || !canvasLayout) return;

      const { locationX: x, locationY: y } = e.nativeEvent;

      // Convert touch coordinates to Three.js world coordinates
      const worldX = x - (canvasLayout.width / 2);
      const worldY = (canvasLayout.height / 2) - y; // Flip Y axis

      // Add new point
      pointsRef.current.push(new THREE.Vector3(worldX, worldY, 0));

      // Update geometry
      currentLineRef.current.geometry.setFromPoints(pointsRef.current);
      currentLineRef.current.geometry.attributes.position.needsUpdate = true;

      // Render
      rendererRef.current?.render(sceneRef.current, cameraRef.current!);
      glRef.current.endFrameEXP();
    },
    onPanResponderRelease: () => {
      if (currentLineRef.current) {
        linesRef.current.push(currentLineRef.current);
        // Save state for undo
        setUndoStack(prev => [...prev, [...linesRef.current]]);
        currentLineRef.current = null;
      }
    }
  });

  const clearCanvas = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save current state for undo
    setUndoStack(prev => [...prev, [...linesRef.current]]);

    // Remove all lines
    linesRef.current.forEach(line => {
      sceneRef.current?.remove(line);
    });
    linesRef.current = [];

    // Render empty scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
  };

  const undoLastAction = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;
    if (undoStack.length === 0) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Get previous state
    const previousState = undoStack[undoStack.length - 2] || [];
    setUndoStack(prev => prev.slice(0, -1));

    // Remove all current lines
    linesRef.current.forEach(line => {
      sceneRef.current?.remove(line);
    });

    // Add back the lines from the previous state
    linesRef.current = previousState.map(line => {
      sceneRef.current?.add(line);
      return line;
    });

    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
  };

  const toggleColorPalette = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setShowColorPalette(!showColorPalette);
    setShowEraserSizes(false);
    setShowBrushSizes(false);
    setIsEraser(false);
  };

  const toggleEraserSizes = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setShowEraserSizes(!showEraserSizes);
    setShowColorPalette(false);
    setShowBrushSizes(false);
    setIsEraser(true);
  };

  const toggleBrushSizes = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setShowBrushSizes(!showBrushSizes);
    setShowColorPalette(false);
    setShowEraserSizes(false);
    setIsEraser(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Drawing Canvas</Text>
      </View>
      
      {/* Canvas */}
      <View style={styles.canvasContainer}>
        <GLView
          style={styles.canvas}
          onContextCreate={onGLContextCreate}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setCanvasLayout({ x, y, width, height });
          }}
          {...panResponder.panHandlers}
        />
      </View>

      {/* Color Palette */}
      {showColorPalette && (
        <View style={[styles.paletteContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.paletteTitle, { color: theme.text }]}>Select Color</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorButton, 
                  { 
                    backgroundColor: c,
                    borderColor: color === c ? theme.primary : theme.divider,
                    borderWidth: color === c ? 3 : 1,
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setColor(c);
                  setShowColorPalette(false);
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Eraser Sizes */}
      {showEraserSizes && (
        <View style={[styles.toolSizesContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.paletteTitle, { color: theme.text }]}>Eraser Size</Text>
          <View style={styles.sizesRow}>
            {ERASER_SIZES.map((eraser) => (
              <TouchableOpacity
                key={eraser.size}
                style={[
                  styles.sizeButton,
                  { 
                    borderColor: eraserWidth === eraser.size ? theme.primary : theme.divider,
                    backgroundColor: theme.elevation1
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEraserWidth(eraser.size);
                  setShowEraserSizes(false);
                }}
              >
                <View style={[
                  styles.sizePreview, 
                  { 
                    width: eraser.size, 
                    height: eraser.size,
                    backgroundColor: isDark ? '#ffffff' : '#000000',
                    opacity: 0.7
                  }
                ]} />
                <Text style={[styles.sizeLabel, { color: theme.text }]}>{eraser.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Brush Sizes */}
      {showBrushSizes && (
        <View style={[styles.toolSizesContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.paletteTitle, { color: theme.text }]}>Brush Size</Text>
          <View style={styles.sizesRow}>
            {BRUSH_SIZES.map((brush) => (
              <TouchableOpacity
                key={brush.size}
                style={[
                  styles.sizeButton,
                  { 
                    borderColor: strokeWidth === brush.size ? theme.primary : theme.divider,
                    backgroundColor: theme.elevation1
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStrokeWidth(brush.size);
                  setShowBrushSizes(false);
                }}
              >
                <View style={[
                  styles.sizePreview, 
                  { 
                    width: brush.size, 
                    height: brush.size,
                    backgroundColor: color
                  }
                ]} />
                <Text style={[styles.sizeLabel, { color: theme.text }]}>{brush.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { 
        backgroundColor: theme.cardBackground,
      }]}>
        <TouchableOpacity
          style={[
            styles.controlButton, 
            !isEraser && showColorPalette && styles.activeControl
          ]}
          onPress={toggleColorPalette}
        >
          <Ionicons 
            name="color-palette" 
            size={24} 
            color={!isEraser ? theme.primary : theme.secondaryText} 
          />
          <Text style={[styles.buttonText, { color: theme.text }]}>Color</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton, 
            !isEraser && showBrushSizes && styles.activeControl
          ]}
          onPress={toggleBrushSizes}
        >
          <Ionicons 
            name="brush" 
            size={24} 
            color={!isEraser && !showColorPalette ? theme.primary : theme.secondaryText} 
          />
          <Text style={[styles.buttonText, { color: theme.text }]}>Size</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton, 
            isEraser && styles.activeControl
          ]}
          onPress={toggleEraserSizes}
        >
          <Ionicons 
            name="pencil-outline" 
            size={24} 
            color={isEraser ? theme.primary : theme.secondaryText} 
          />
          <Text style={[styles.buttonText, { color: theme.text }]}>Eraser</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            { opacity: undoStack.length > 1 ? 1 : 0.5 }
          ]}
          onPress={undoLastAction}
          disabled={undoStack.length <= 1}
        >
          <Ionicons 
            name="arrow-undo" 
            size={24} 
            color={undoStack.length > 1 ? theme.primary : theme.divider} 
          />
          <Text style={[styles.buttonText, { color: undoStack.length > 1 ? theme.text : theme.divider }]}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton]}
          onPress={clearCanvas}
        >
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
          <Text style={[styles.buttonText, { color: "#ff4444" }]}>Clear</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 0, // Remove extra padding
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    marginBottom: 80, // Add margin to make space for controls
  },
  canvas: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    position: 'absolute',
    bottom: 100, // Position above the tab bar
    left: 0,
    right: 0,
    borderRadius: 20,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paletteContainer: {
    position: 'absolute',
    bottom: 200, // Position above the controls
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paletteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  toolSizesContainer: {
    position: 'absolute',
    bottom: 200, // Position above the controls
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sizesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  sizeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    width: 60,
    height: 80,
  },
  sizePreview: {
    borderRadius: 50,
    marginBottom: 8,
  },
  sizeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  eraserButton: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 8,
    margin: 8,
  },
  selectedEraser: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  eraserText: {
    fontSize: 10,
    color: '#000',
  },
  buttonText: {  // Add this missing style
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});