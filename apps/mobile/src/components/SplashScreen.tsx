import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Star, WifiOff } from 'lucide-react-native/icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type SplashScreenProps = {
  onFinish: (isSlowNetwork?: boolean) => void;
};

const BRAND_NAME = 'Commonroom';

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.95)).current;

  // Typing effect
  useEffect(() => {
    let charIndex = 0;
    const typeTimer = setInterval(() => {
      if (charIndex < BRAND_NAME.length) {
        setTypedText(BRAND_NAME.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeTimer);
        setTypingComplete(true);
      }
    }, 110);

    return () => clearInterval(typeTimer);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 450);
    return () => clearInterval(cursorTimer);
  }, []);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Network check & automatic transition to Room
  useEffect(() => {
    // If network takes longer than 2.2 seconds, flag slow network
    const slowTimer = setTimeout(() => {
      setIsSlow(true);
    }, 2200);

    // Auto-transition to room after typing + short pause
    // Never get stuck on splash if network is slow - move straight to Room
    const finishTimer = setTimeout(() => {
      onFinish(isSlow);
    }, 3200);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish, isSlow]);

  return (
    <View style={styles.container}>
      {/* Background Aura Glow */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Center Wordmark & Logo */}
      <View style={styles.centerContent}>
        <View style={styles.badgeWrap}>
          <Star size={24} color="#f59e0b" />
        </View>

        {/* Animated Typed Title */}
        <View style={styles.typeRow}>
          <Text style={styles.typedTitle}>{typedText}</Text>
          <Text style={[styles.cursor, { opacity: showCursor ? 1 : 0 }]}>|</Text>
        </View>

        {/* Tagline */}
        <Text style={[styles.tagline, { opacity: typingComplete ? 1 : 0 }]}>
          Your campus space
        </Text>
      </View>

      {/* Network Status & Quick Enter Footer */}
      <View style={styles.footer}>
        {isSlow ? (
          <View style={styles.networkNotice}>
            <WifiOff size={13} color="#f59e0b" />
            <Text style={styles.networkText}>
              Connecting to campus… entering offline mode
            </Text>
          </View>
        ) : (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#8e95a5" />
            <Text style={styles.loadingText}>Syncing campus room…</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => onFinish(isSlow)}
          style={styles.skipBtn}
        >
          <Text style={styles.skipBtnText}>Enter Room →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#07080b',
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  glowCircle: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 140,
    height: 280,
    position: 'absolute',
    width: 280,
  },
  centerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  badgeWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 30,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: 20,
    width: 56,
  },
  typeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
  },
  typedTitle: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  cursor: {
    color: '#6366f1',
    fontSize: 38,
    fontWeight: '300',
    marginLeft: 3,
    marginTop: -4,
  },
  tagline: {
    color: '#8e95a5',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    bottom: 44,
    left: 20,
    position: 'absolute',
    right: 20,
    zIndex: 3,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: '#8e95a5',
    fontSize: 12,
  },
  networkNotice: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  networkText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
});
