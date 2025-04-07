import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Modal, Dimensions, Image } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface IconLoaderProps {
  visible: boolean;
  text?: string;
  type?: 'fullscreen' | 'inline' | 'overlay';
  size?: 'small' | 'medium' | 'large';
}

export default function IconLoader({
  visible,
  text,
  type = 'overlay',
  size = 'medium'
}: IconLoaderProps) {
  const { theme, isDark } = useTheme();
  
  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  
  // Determine icon size based on the size prop
  const getIconSize = () => {
    switch(size) {
      case 'small': return 50;
      case 'medium': return 80;
      case 'large': return 120;
      default: return 80;
    }
  };
  
  // Start animations when visible
  useEffect(() => {
    if (visible) {
      // Fade in and scale up
      opacity.value = withTiming(1, { duration: 400 });
      scale.value = withTiming(1, { 
        duration: 600, 
        easing: Easing.out(Easing.back(1.2)) 
      });
      
      // Continuous rotation
      rotation.value = withRepeat(
        withTiming(360, { 
          duration: 2000,
          easing: Easing.inOut(Easing.ease)
        }),
        -1, // Infinite repetitions
        false // Don't reverse
      );
      
      // Pulsing effect
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      
      // Glow effect
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        false
      );
    } else {
      // Fade out and scale down
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.9, { duration: 300 });
      
      // Cancel animations
      cancelAnimation(rotation);
      cancelAnimation(pulseScale);
      cancelAnimation(glowOpacity);
    }
    
    return () => {
      // Clean up animations
      cancelAnimation(rotation);
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(pulseScale);
      cancelAnimation(glowOpacity);
    };
  }, [visible]);
  
  // Animated styles
  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value }
      ],
      opacity: opacity.value
    };
  });
  
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: pulseScale.value }]
    };
  });
  
  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
      transform: [{ scale: pulseScale.value * 1.2 }]
    };
  });
  
  // If not visible, don't render anything
  if (type !== 'overlay' && !visible) return null;
  
  // Render inline loader
  if (type === 'inline') {
    return (
      <View style={[styles.inlineContainer, { backgroundColor: 'transparent' }]}>
        <Animated.View style={[containerStyle, styles.iconContainer]}>
          <Animated.View style={[glowStyle, styles.glow, { backgroundColor: theme.primary }]} />
          <Animated.View style={iconStyle}>
            <Image 
              source={isDark 
                ? require('../assets/images/icon-dark.png') 
                : require('../assets/images/icon-light.png')
              } 
              style={[styles.icon, { width: getIconSize(), height: getIconSize() }]} 
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
        {text && <Text style={[styles.text, { color: theme.text }]}>{text}</Text>}
      </View>
    );
  }
  
  // Render overlay or fullscreen loader
  return (
    <Modal
      transparent={type === 'overlay'}
      visible={visible}
      animationType="fade"
    >
      <View style={[
        styles.container, 
        type === 'overlay' ? styles.overlayBackground : { backgroundColor: theme.background }
      ]}>
        <Animated.View style={[containerStyle, styles.iconContainer]}>
          <Animated.View style={[glowStyle, styles.glow, { backgroundColor: theme.primary }]} />
          <Animated.View style={iconStyle}>
            <Image 
              source={isDark 
                ? require('../assets/images/icon-dark.png') 
                : require('../assets/images/icon-light.png')
              } 
              style={[styles.icon, { width: getIconSize(), height: getIconSize() }]} 
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
        {text && <Text style={[styles.text, { color: theme.text }]}>{text}</Text>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    width: 80,
    height: 80,
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.5,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  }
});