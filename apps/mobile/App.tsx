import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomTabs } from './src/components/BottomTabs';
import { MenuOverlay } from './src/components/MenuOverlay';
import { AnonymousScreen } from './src/screens/AnonymousScreen';
import { CreateFlowScreen } from './src/screens/create/CreateFlowScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { MeetScreen } from './src/screens/MeetScreen';
import { StatusScreen } from './src/screens/StatusScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HelpSupportScreen } from './src/screens/HelpSupportScreen';
import { AdminPanelScreen } from './src/screens/AdminPanelScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { SplashScreen } from './src/components/SplashScreen';
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
  const [showSplash, setShowSplash] = useState(true);
  const [isNetworkSlow, setIsNetworkSlow] = useState(false);
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

  const handleLogout = () => {
    setProfile(null);
    setScreen({ kind: 'auth', route: 'welcome' });
  };

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={(isSlow) => {
          setIsNetworkSlow(Boolean(isSlow));
          setShowSplash(false);
        }}
      />
    );
  }

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
                  score: 540,
                  title: getRecognitionTitle(540).name,
                  badges: [],
                },
              });
            }
            setScreen({ kind: 'main' });
          }}
        />
      ) : null}
      {screen.kind === 'status' ? (
        <StatusScreen onBack={() => setScreen({ kind: 'main' })} profile={profile} />
      ) : null}
      {screen.kind === 'messages' ? (
        <MessagesScreen
          onBack={() => setScreen({ kind: 'main' })}
          initialUserId={screen.initialChatUserId}
          initialUserName={screen.initialChatUserName}
        />
      ) : null}
      {screen.kind === 'notifications' ? (
        <NotificationsScreen onBack={() => setScreen({ kind: 'main' })} />
      ) : null}
      {screen.kind === 'saved' ? (
        <SavedScreen onBack={() => setScreen({ kind: 'main' })} />
      ) : null}
      {screen.kind === 'settings' ? (
        <SettingsScreen onBack={() => setScreen({ kind: 'main' })} onLogout={handleLogout} profile={profile} />
      ) : null}
      {screen.kind === 'help' ? (
        <HelpSupportScreen onBack={() => setScreen({ kind: 'main' })} />
      ) : null}
      {screen.kind === 'admin' ? (
        <AdminPanelScreen onBack={() => setScreen({ kind: 'main' })} />
      ) : null}
      {screen.kind === 'profile' ? (
        <ProfileScreen
          onBack={() => setScreen({ kind: 'main' })}
          profile={profile}
          onUpdateProfile={(updated) => setProfile((p) => p ? { ...p, ...updated } : p)}
        />
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
              initialSlowNetwork={isNetworkSlow}
            />
          ) : null}
          {activeTab === 'meet' ? (
            <MeetScreen
              onMenuPress={openMenu}
              currentUserProfile={profile}
              onUpdateProfile={(updated) => setProfile((p) => p ? { ...p, ...updated } : p)}
              onLogin={(newProfile) => setProfile(newProfile)}
              onOpenMessages={(userId, userName) =>
                setScreen({ kind: 'messages', initialChatUserId: userId, initialChatUserName: userName })
              }
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
          {activeTab === 'anonymous' ? <AnonymousScreen onBack={() => setActiveTab('home')} /> : null}
          {activeTab === 'marketplace' ? <MarketplaceScreen onMenuPress={openMenu} /> : null}

          {activeTab !== 'create' ? <BottomTabs activeTab={activeTab} onChange={setActiveTab} /> : null}

          <MenuOverlay
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            onAccountPress={openAuth}
            onOpenStatus={() => setScreen({ kind: 'status' })}
            onOpenMessages={() => setScreen({ kind: 'messages' })}
            onOpenNotifications={() => setScreen({ kind: 'notifications' })}
            onOpenSaved={() => setScreen({ kind: 'saved' })}
            onOpenSettings={() => setScreen({ kind: 'settings' })}
            onOpenHelp={() => setScreen({ kind: 'help' })}
            onOpenAdmin={() => setScreen({ kind: 'admin' })}
            onOpenProfile={() => setScreen({ kind: 'profile' })}
            onOpenMarketplace={() => {
              setActiveTab('marketplace');
              setMenuOpen(false);
            }}
            onLogout={handleLogout}
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
