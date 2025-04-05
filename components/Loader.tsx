import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Modal, Dimensions } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  interpolateColor
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface LoaderProps {
  visible: boolean;
  text?: string;
  type?: 'fullscreen' | 'inline' | 'overlay';
  color?: string;
  size?: 'small' | 'large';
  showSpinner?: boolean;
}

export default function Loader({
  visible,
  text,
  type = 'overlay',
  color,
  size = 'large',
  showSpinner = true
}: LoaderProps) {
  const { theme, isDark } = useTheme();
  
  // Use theme color if no color is provided
  const loaderColor = color || theme.primary;
  const secondaryColor = isDark ? '#6366f1' : '#4f46e5'; // Indigo shade
  
  // Animation values for dots
  const dot1Scale = useSharedValue(0);
  const dot2Scale = useSharedValue(0);
  const dot3Scale = useSharedValue(0);
  
  // Animation values for container
  const containerScale = useSharedValue(0.9);
  const containerOpacity = useSharedValue(0);
  
  // Animation for icon and border
  const iconRotate = useSharedValue(0);
  const iconScale = useSharedValue(1);
  const borderProgress = useSharedValue(0);
  const colorProgress = useSharedValue(0);
  
  // Start animations when visible
  useEffect(() => {
    if (visible) {
      // Container animations
      containerScale.value = withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.back(1.5)) 
      });
      containerOpacity.value = withTiming(1, { duration: 300 });
      
      // Dot animations - staggered wave pattern
      const animateDot = (dotScale: Animated.SharedValue<number>, delay: number) => {
        dotScale.value = 0;
        dotScale.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.7)) }),
              withTiming(0.3, { duration: 500, easing: Easing.in(Easing.ease) })
            ),
            -1,
            true
          )
        );
      };
      
      animateDot(dot1Scale, 0);
      animateDot(dot2Scale, 200);
      animateDot(dot3Scale, 400);
      
      // Icon animations
      iconRotate.value = withRepeat(
        withTiming(360, { 
          duration: 3000,
          easing: Easing.linear
        }),
        -1,
        false
      );
      
      iconScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      // Border animation
      borderProgress.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      
      // Color animation
      colorProgress.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      // Hide animations
      containerOpacity.value = withTiming(0, { duration: 200 });
      containerScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible]);
  
  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
      transform: [{ scale: containerScale.value }],
    };
  });
  
  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${iconRotate.value}deg` },
        { scale: iconScale.value }
      ],
    };
  });
  
  const borderStyle = useAnimatedStyle(() => {
    const borderWidth = 3 + borderProgress.value * 2;
    const borderColor = interpolateColor(
      colorProgress.value,
      [0, 0.5, 1],
      [loaderColor, secondaryColor, loaderColor]
    );
    
    return {
      borderWidth,
      borderColor,
      borderRadius: 20,
      position: 'absolute',
      top: -borderWidth,
      left: -borderWidth,
      right: -borderWidth,
      bottom: -borderWidth,
    };
  });
  
  const dot1Style = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 0.5, 1],
      [loaderColor, secondaryColor, loaderColor]
    );
    
    return {
      transform: [{ scale: dot1Scale.value }],
      backgroundColor,
    };
  });
  
  const dot2Style = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dot2Scale.value }],
      backgroundColor: loaderColor,
    };
  });
  
  const dot3Style = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 0.5, 1],
      [secondaryColor, loaderColor, secondaryColor]
    );
    
    return {
      transform: [{ scale: dot3Scale.value }],
      backgroundColor,
    };
  });
  
  // Inline loader
  if (type === 'inline') {
    return visible ? (
      <View style={styles.inlineContainer}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style, { marginLeft: 6 }]} />
        <Animated.View style={[styles.dot, dot3Style, { marginLeft: 6 }]} />
        {text && <Text style={[styles.inlineText, { color: theme.text }]}>{text}</Text>}
      </View>
    ) : null;
  }
  
  // Fullscreen loader
  if (type === 'fullscreen') {
    return visible ? (
      <View style={[
        styles.fullscreenContainer, 
        { backgroundColor: isDark ? 'rgba(18, 18, 18, 0.9)' : 'rgba(255, 255, 255, 0.9)' }
      ]}>
        <Animated.View style={[
          styles.loaderContent, 
          containerStyle,
          { backgroundColor: theme.cardBackground }
        ]}>
          <Animated.View style={borderStyle} />
          
          <Animated.View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
            <Animated.View style={iconStyle}>
              <Ionicons 
                name="sparkles" 
                size={40} 
                color={loaderColor} 
              />
            </Animated.View>
          </Animated.View>
          
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style, { marginLeft: 10 }]} />
            <Animated.View style={[styles.dot, dot3Style, { marginLeft: 10 }]} />
          </View>
          
          {text && <Text style={[styles.text, { color: theme.text }]}>{text}</Text>}
        </Animated.View>
      </View>
    ) : null;
  }
  
  // Default overlay loader
  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={[
        styles.overlayContainer, 
        { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }
      ]}>
        <Animated.View style={[
          styles.loaderContent, 
          containerStyle,
          { backgroundColor: theme.cardBackground }
        ]}>
          <Animated.View style={borderStyle} />
          
          <Animated.View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
            <Animated.View style={iconStyle}>
              <Ionicons 
                name="sparkles" 
                size={40} 
                color={loaderColor} 
              />
            </Animated.View>
          </Animated.View>
          
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style, { marginLeft: 10 }]} />
            <Animated.View style={[styles.dot, dot3Style, { marginLeft: 10 }]} />
          </View>
          
          {text && <Text style={[styles.text, { color: theme.text }]}>{text}</Text>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loaderContent: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
    minWidth: 180,
    minHeight: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    marginBottom: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inlineText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  }
});