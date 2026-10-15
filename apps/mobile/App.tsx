import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomTabs } from './src/components/BottomTabs';
import { MenuOverlay } from './src/components/MenuOverlay';
import { AnonymousScreen } from './src/screens/AnonymousScreen';
import { CreateFlowScreen } from './src/screens/create/CreateFlowScreen';
import { GamesScreen } from './src/screens/GamesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { RecognitionScreen } from './src/screens/RecognitionScreen';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { previewRecognitionMetrics } from './src/data/recognitionData';
import { calculateRecognitionScore, getRecognitionTitle } from './src/services/recognition';
import { ThemeContext, useAppTheme } from './src/theme/ThemeContext';
import { AppColors, AppThemeMode, palettes } from './src/theme/tokens';
import { FeedPost, OnboardingProfile, UserProfile } from './src/types/domain';
import { AppScreen, AuthRoute, MainTab, OnboardingRoute } from './src/types/navigation';

export default function App() {
  const [mode, setMode] = useState<AppThemeMode>('dark');
  const toggleTheme = () => setMode((current) => current === 'dark' ? 'light' : 'dark');

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={{ mode, colors: palettes[mode], toggleTheme }}>
        <AppContent />
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { mode, colors } = useAppTheme();
  const styles = createStyles(colors);
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<AppScreen>({ kind: 'main' });
  const [localPosts, setLocalPosts] = useState<FeedPost[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const recognitionTitle = profile?.recognition.title
    ?? `${getRecognitionTitle(calculateRecognitionScore(previewRecognitionMetrics)).name} · Preview`;

  const openMenu = () => setMenuOpen(true);
  const openAuth = () => {
    setMenuOpen(false);
    setScreen({ kind: 'auth', route: 'welcome' });
  };
  const showAuthRoute = (route: AuthRoute) => {
    setScreen((current) => ({
      kind: 'auth',
      route,
      displayName: current.kind === 'auth' ? current.displayName : undefined,
    }));
  };
  const showOnboardingRoute = (route: OnboardingRoute) => {
    setScreen((current) => ({
      kind: 'onboarding',
      route,
      displayName: current.kind === 'onboarding' ? current.displayName : undefined,
    }));
  };

  return (
    <View style={styles.container}>
      {screen.kind === 'auth' ? (
        <AuthScreen
          route={screen.route}
          initialName={screen.displayName}
          onNavigate={showAuthRoute}
          onStartOnboarding={(displayName) => setScreen({ kind: 'onboarding', route: 'school', displayName })}
          onClose={() => setScreen({ kind: 'main' })}
        />
      ) : null}
      {screen.kind === 'onboarding' ? (
        <OnboardingScreen
          route={screen.route}
          initialName={screen.displayName}
          onNavigate={showOnboardingRoute}
          onBackToAuth={() => setScreen({ kind: 'auth', route: 'otp', displayName: screen.displayName })}
          onFinish={(profileDraft) => {
            if (profileDraft) {
              setProfile({
                ...profileDraft,
                recognition: {
                  score: 0,
                  title: getRecognitionTitle(0).name,
                  badges: [],
                },
              });
            }
            setScreen({ kind: 'main' });
          }}
        />
      ) : null}
      {screen.kind === 'recognition' ? (
        <RecognitionScreen onBack={() => setScreen({ kind: 'main' })} profile={profile} />
      ) : null}
      {screen.kind === 'main' ? (
        <>
          {activeTab === 'home' ? (
            <HomeScreen
              onMenuPress={openMenu}
              newPosts={localPosts}
              interests={profile?.interests ?? []}
              currentUserProfile={profile ? {
                displayName: profile.displayName,
                username: profile.displayName.toLowerCase().replace(/\s+/g, '_'),
              } : undefined}
            />
          ) : null}
          {activeTab === 'create' ? (
            <CreateFlowScreen
              onClose={() => setActiveTab('home')}
              onPost={(post: FeedPost) => {
                setLocalPosts((current) => [post, ...current]);
                setActiveTab('home');
              }}
            />
          ) : null}
          {activeTab === 'marketplace' ? <MarketplaceScreen onMenuPress={openMenu} /> : null}
          {activeTab === 'games' ? <GamesScreen onMenuPress={openMenu} /> : null}
          {activeTab === 'anonymous' ? <AnonymousScreen onMenuPress={openMenu} /> : null}
          {activeTab !== 'create' ? <BottomTabs activeTab={activeTab} onChange={setActiveTab} /> : null}
          <MenuOverlay
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            onAccountPress={openAuth}
            onOpenRecognition={() => setScreen({ kind: 'recognition' })}
            onToggleSchoolVisibility={() => {
              setProfile((current) => current
                ? { ...current, showSchoolOnProfile: !current.showSchoolOnProfile }
                : current);
            }}
            profile={profile}
            recognitionTitle={recognitionTitle}
          />
        </>
      ) : null}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
