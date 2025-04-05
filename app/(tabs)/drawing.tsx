import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  PanResponder, 
  TouchableOpacity, 
  Text, 
  Dimensions, 
  SafeAreaView, 
  StatusBar,
  Animated,
  Easing,
  PanResponderGestureState,
  Alert
} from 'react-native';
import { GLView } from 'expo-gl';
import * as ExpoGL from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

// Extend WebGLRenderingContext for Expo
declare global {
  interface WebGLRenderingContext {
    endFrameEXP(): void;
  }
}

// Color palette options
const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#A52A2A',
  '#800080', '#008080', '#808000', '#800000', '#008000',
  '#000080', '#FF4500', '#DA70D6', '#1E90FF', '#32CD32'
];

export default function DrawingScreen() {
  const { theme, isDark } = useTheme();
  const [color, setColor] = useState(isDark ? '#FFFFFF' : '#000000');
  const [isEraser, setIsEraser] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [eraserWidth, setEraserWidth] = useState(20);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'color' | null>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [canvasLayout, setCanvasLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [undoStack, setUndoStack] = useState<THREE.Line[][]>([]);
  const [redoStack, setRedoStack] = useState<THREE.Line[][]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Floating button position
  const [floatingButtonPosition, setFloatingButtonPosition] = useState({
    x: screenWidth - 80,
    y: screenHeight - 200,
  });

  // Animation values
  const paletteScaleAnim = useRef(new Animated.Value(0)).current;
  const paletteOpacityAnim = useRef(new Animated.Value(0)).current;
  const toolbarScaleAnim = useRef(new Animated.Value(0)).current;
  const toolbarOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonRotateAnim = useRef(new Animated.Value(0)).current;

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const linesRef = useRef<THREE.Line[]>([]);
  const currentLineRef = useRef<THREE.Line | null>(null);
  const pointsRef = useRef<THREE.Vector3[]>([]);

  // Initialize the canvas
  const onGLContextCreate = async (gl: WebGLRenderingContext) => {
    glRef.current = gl;

    // Create renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    // Set canvas background color based on theme
    renderer.setClearColor(isDark ? 0x1a1a1a : 0xf5f5f5);
    rendererRef.current = renderer;

    // Create camera
    const camera = new THREE.OrthographicCamera(
      -screenWidth / 2,
      screenWidth / 2,
      screenHeight / 2,
      -screenHeight / 2,
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

  // Update canvas color when theme changes
  useEffect(() => {
    if (rendererRef.current && glRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.setClearColor(isDark ? 0x1a1a1a : 0xf5f5f5);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      glRef.current.endFrameEXP();
    }
  }, [isDark]);

  // Pan responder for drawing
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (!glRef.current || !sceneRef.current || !canvasLayout) return;

      // Close any open toolbars when drawing starts
      if (isPaletteOpen) {
        togglePalette();
      }
      if (activeTool !== null) {
        hideToolbar();
      }

      const { locationX: x, locationY: y } = e.nativeEvent;

      // Convert touch coordinates to Three.js world coordinates
      const worldX = x - (canvasLayout.width / 2);
      const worldY = (canvasLayout.height / 2) - y;

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
        
        // Clear redo stack when new drawing is made
        setRedoStack([]);
        
        currentLineRef.current = null;
      }
    }
  });

  // Pan responder for floating button
  const buttonPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
      setFloatingButtonPosition({
        x: Math.max(20, Math.min(screenWidth - 80, floatingButtonPosition.x + gestureState.dx)),
        y: Math.max(100, Math.min(screenHeight - 150, floatingButtonPosition.y + gestureState.dy)),
      });
    },
    onPanResponderRelease: () => {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  });

  // Toggle palette open/close - Modified to show horizontal layout
  const togglePalette = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Close any open toolbar when toggling palette
    if (activeTool !== null) {
      hideToolbar();
    }
    
    const newPaletteState = !isPaletteOpen;
    setIsPaletteOpen(newPaletteState);
    
    // Animate palette
    Animated.parallel([
      Animated.timing(paletteScaleAnim, {
        toValue: newPaletteState ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.elastic(1),
      }),
      Animated.timing(paletteOpacityAnim, {
        toValue: newPaletteState ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(buttonRotateAnim, {
        toValue: newPaletteState ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.elastic(1),
      }),
    ]).start();
  };

  // Show toolbar for specific tool - Modified to close palette
  const showToolbar = (tool: 'brush' | 'eraser' | 'color') => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Close palette when opening toolbar
    if (isPaletteOpen) {
      togglePalette();
    }
    
    setActiveTool(tool);
    
    // Set eraser state based on tool
    if (tool === 'eraser') {
      setIsEraser(true);
    } else if (tool === 'brush') {
      setIsEraser(false);
    }
    
    // Animate toolbar
    Animated.parallel([
      Animated.timing(toolbarScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.elastic(1),
      }),
      Animated.timing(toolbarOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Hide toolbar
  const hideToolbar = () => {
    Animated.parallel([
      Animated.timing(toolbarScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(toolbarOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveTool(null);
    });
  };

  // Clear canvas
  const clearCanvas = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Save current state for undo
    setUndoStack(prev => [...prev, [...linesRef.current]]);
    setRedoStack([]);

    // Remove all lines
    linesRef.current.forEach(line => {
      sceneRef.current?.remove(line);
    });
    linesRef.current = [];

    // Render empty scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
    
    // Close palette
    if (isPaletteOpen) {
      togglePalette();
    }
  };

  // Undo last action
  const undoLastAction = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;
    if (undoStack.length <= 1) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Get current state for redo
    setRedoStack(prev => [...prev, [...linesRef.current]]);

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

  // Redo last undone action
  const redoLastAction = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;
    if (redoStack.length === 0) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Get last redo state
    const redoState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    // Save current state for undo
    setUndoStack(prev => [...prev, [...linesRef.current]]);

    // Remove all current lines
    linesRef.current.forEach(line => {
      sceneRef.current?.remove(line);
    });

    // Add back the lines from the redo state
    linesRef.current = redoState.map(line => {
      sceneRef.current?.add(line);
      return line;
    });

    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
  };

  // Toggle eraser mode
  const toggleEraser = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setIsEraser(!isEraser);
    showToolbar('eraser');
  };

  // Button rotation interpolation
  const buttonRotate = buttonRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg']
  });

  // Request media library permissions
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Save drawing to media library
  const saveDrawing = async () => {
    if (!hasPermission) {
      Alert.alert(
        "Permission Required",
        "Please grant media library permissions to save your drawing.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Settings", 
            onPress: async () => {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              setHasPermission(status === 'granted');
            }
          }
        ]
      );
      return;
    }

    if (!glRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      Alert.alert("Error", "Cannot save drawing at this time.");
      return;
    }

    try {
      setIsSaving(true);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Render the scene to make sure it's up to date
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Take a snapshot of the GL context
      const snapshot = await GLView.takeSnapshotAsync(glRef.current as ExpoGL.ExpoWebGLRenderingContext, {
        format: 'jpeg',
        compress: 0.9
      });
      
      // Save directly to media library
      const asset = await MediaLibrary.createAssetAsync(snapshot.uri);
      
      // Create album if it doesn't exist
      try {
        const album = await MediaLibrary.getAlbumAsync('Recreo Drawings');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('Recreo Drawings', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      } catch (albumError) {
        console.log('Album creation fallback:', albumError);
        // Fallback - at least the image is saved to camera roll
      }
      
      // Show success message
      Alert.alert("Success", "Drawing saved to your gallery!");
    } catch (error) {
      console.error('Error saving drawing:', error);
      Alert.alert("Error", "Failed to save drawing. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header with Title and Save Button */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Drawing</Text>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.primary, opacity: isSaving ? 0.7 : 1 }]} 
          onPress={saveDrawing}
          disabled={isSaving}
        >
          <Ionicons name="save-outline" size={22} color="#fff" />
          <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
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

      {/* Floating Action Button */}
      <Animated.View 
        style={[
          styles.floatingButton,
          {
            left: floatingButtonPosition.x,
            top: floatingButtonPosition.y,
            transform: [{ rotate: buttonRotate }]
          }
        ]}
        {...buttonPanResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={togglePalette}
          style={[styles.fabButton, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Palette - Modified to show horizontally and positioned above the floating button */}
      <Animated.View 
        style={[
          styles.palette,
          {
            backgroundColor: theme.cardBackground,
            opacity: paletteOpacityAnim,
            transform: [{ scale: paletteScaleAnim }],
            left: Math.max(20, Math.min(screenWidth - 380, floatingButtonPosition.x - 160)),
            top: floatingButtonPosition.y - 80, // Increased distance from floating button
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.paletteItem, !isEraser ? { backgroundColor: `${theme.primary}30` } : {}]}
          onPress={() => showToolbar('brush')}
        >
          <Ionicons name="brush" size={24} color={!isEraser ? theme.primary : theme.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paletteItem, isEraser ? { backgroundColor: `${theme.primary}30` } : {}]}
          onPress={() => showToolbar('eraser')}
        >
          <Ionicons name="pencil-outline" size={24} color={isEraser ? theme.primary : theme.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.paletteItem}
          onPress={() => showToolbar('color')}
        >
          <View style={[styles.colorPreview, { backgroundColor: color }]} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paletteItem, { opacity: undoStack.length > 1 ? 1 : 0.5 }]}
          onPress={undoLastAction}
          disabled={undoStack.length <= 1}
        >
          <Ionicons name="arrow-undo" size={24} color={undoStack.length > 1 ? theme.text : theme.divider} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paletteItem, { opacity: redoStack.length > 0 ? 1 : 0.5 }]}
          onPress={redoLastAction}
          disabled={redoStack.length === 0}
        >
          <Ionicons name="arrow-redo" size={24} color={redoStack.length > 0 ? theme.text : theme.divider} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.paletteItem}
          onPress={clearCanvas}
        >
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </Animated.View>

      {/* Tool Settings Toolbar - Modified to prevent overlap */}
      {activeTool !== null && (
        <Animated.View 
          style={[
            styles.toolbar,
            {
              backgroundColor: theme.cardBackground,
              opacity: toolbarOpacityAnim,
              transform: [{ scale: toolbarScaleAnim }],
              left: Math.max(20, Math.min(screenWidth - 320, floatingButtonPosition.x - 150)),
              top: Math.max(100, floatingButtonPosition.y - 220),
            }
          ]}
        >
          <TouchableOpacity style={styles.closeToolbar} onPress={hideToolbar}>
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
          
          {activeTool === 'brush' && (
            <>
              <Text style={[styles.toolbarTitle, { color: theme.text }]}>Brush Size</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={30}
                step={1}
                value={strokeWidth}
                onValueChange={(value) => setStrokeWidth(value)}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.divider}
                thumbTintColor={theme.primary}
              />
              <Text style={[styles.sizeText, { color: theme.text }]}>Size: {strokeWidth.toFixed(0)}</Text>
              <View style={styles.sizePreview}>
                <View style={[
                  styles.brushPreview, 
                  { 
                    width: strokeWidth, 
                    height: strokeWidth,
                    backgroundColor: color 
                  }
                ]} />
              </View>
            </>
          )}
          
          {activeTool === 'eraser' && (
            <>
              <Text style={[styles.toolbarTitle, { color: theme.text }]}>Eraser Size</Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={50}
                step={1}
                value={eraserWidth}
                onValueChange={(value) => setEraserWidth(value)}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.divider}
                thumbTintColor={theme.primary}
              />
              <Text style={[styles.sizeText, { color: theme.text }]}>Size: {eraserWidth.toFixed(0)}</Text>
              <View style={styles.sizePreview}>
                <View style={[
                  styles.brushPreview, 
                  { 
                    width: eraserWidth, 
                    height: eraserWidth,
                    backgroundColor: isDark ? '#ffffff' : '#000000',
                    opacity: 0.3
                  }
                ]} />
              </View>
            </>
          )}
          
          {activeTool === 'color' && (
            <>
              <Text style={[styles.toolbarTitle, { color: theme.text }]}>Select Color</Text>
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
                      hideToolbar();
                    }}
                  />
                ))}
              </View>
            </>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: '600',
      marginLeft: 6,
    },
    canvasContainer: {
      flex: 1,
    },
    canvas: {
      flex: 1,
    },
    floatingButton: {
      position: 'absolute',
      width: 60,
      height: 60,
      zIndex: 10,
    },
    fabButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.27,
      shadowRadius: 4.65,
      elevation: 6,
    },
    palette: {
      position: 'absolute',
      width: 360,
      height: 60,
      padding: 5,
      borderRadius: 30,
      flexDirection: 'row',
      justifyContent: 'space-between',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
      zIndex: 9,
    },
    paletteItem: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  toolbar: {
    position: 'absolute',
    width: 300,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 8,
  },
  closeToolbar: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  sizeText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 5,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sizePreview: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    height: 50,
  },
  brushPreview: {
    borderRadius: 50,
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
});