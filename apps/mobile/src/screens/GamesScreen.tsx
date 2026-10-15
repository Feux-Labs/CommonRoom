import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TopBar } from '../components/TopBar';
import { campusImages, games, recentlyPlayedGames } from '../data/mockData';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import { DailyWordPuzzleGame } from './DailyWordPuzzleGame';

type GamesScreenProps = {
  onMenuPress: () => void;
};

type GameTone = {
  backgroundColor: string;
  borderColor: string;
  accent: string;
};

const gameTones: Record<string, GameTone> = {
  purple: { backgroundColor: '#32109a', borderColor: '#6a35ed', accent: '#a77aff' },
  blue: { backgroundColor: '#0756ad', borderColor: '#078ceb', accent: '#4dc8ff' },
  rose: { backgroundColor: '#9f3156', borderColor: '#e45d85', accent: '#ff9ab5' },
};

const gameArtwork: Record<string, number> = {
  Trivia: require('../../assets/games/campus-trivia.jpg'),
  Puzzle: require('../../assets/games/daily-word-puzzle.jpg'),
  'Truth or Dare': require('../../assets/games/truth-or-dare.jpg'),
};

export function GamesScreen({ onMenuPress }: GamesScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [dialog, setDialog] = useState<{ title: string; body: string } | null>(null);
  const [wordPuzzleOpen, setWordPuzzleOpen] = useState(false);
  const [recentGames, setRecentGames] = useState<Array<{
    title: string;
    played: string;
    tone: string;
    image: string;
  }>>(recentlyPlayedGames);

  const recordGamePlayed = (title: string) => {
    const game = games.find((item) => item.title === title);
    if (!game) {
      return;
    }
    setRecentGames((current) => [
      { title: game.title, played: 'Just now', tone: game.tone, image: game.image },
      ...current.filter((item) => item.title !== title),
    ].slice(0, 4));
  };

  const openGame = (title: string) => {
    recordGamePlayed(title);
    if (title === 'Puzzle') {
      setWordPuzzleOpen(true);
      return;
    }
    setDialog({
      title,
      body: 'This game’s playable rounds are coming soon.',
    });
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TopBar
          onMenuPress={onMenuPress}
          showAvatar={false}
          showBell={false}
          showMenuButton
        />

        <View style={styles.hero}>
          <Image source={{ uri: campusImages.campusLife }} contentFit="cover" style={styles.heroImage} />
          <View style={styles.heroShade} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>THE CAMPUS ARCADE</Text>
            <Text style={styles.heroTitle}>Games <Text style={styles.heroHighlight}>Hub</Text></Text>
            <Text style={styles.heroDescription}>
              Quick rounds, big decisions, and bragging rights. Pick your next campus escape.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => openGame('School Life')}
              style={({ pressed }) => [styles.exploreButton, pressed && styles.pressed]}
            >
              <Text style={styles.exploreButtonText}>Explore School Life</Text>
            </Pressable>
          </View>
          <View accessibilityElementsHidden style={styles.heroBadge}>
            <Text style={styles.heroBadgeTop}>MAKE</Text>
            <Text style={styles.heroBadgeBottom}>YOUR MOVE</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Games</Text>
          <Text style={styles.sectionMeta}>4 PICKS</Text>
        </View>

        <View style={styles.gameGrid}>
          {games.map((game, index) => {
            const tone = gameTones[game.tone];
            const artwork = gameArtwork[game.title];
            const isTrivia = game.title === 'Trivia';
            const isTruthOrDare = game.title === 'Truth or Dare';
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isTruthOrDare
                  ? `${game.title}. ${game.badge}. ${game.players}.`
                  : `${game.title}. ${game.description}`}
                accessibilityHint="Opens this game."
                key={game.title}
                onPress={() => openGame(game.title)}
                style={({ pressed }) => [
                  styles.gameCard,
                  { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={artwork ?? { uri: game.image }}
                  contentFit="cover"
                  style={styles.gameImage}
                  transition={220}
                />
                <View pointerEvents="none" style={styles.gameShade} />
                <View style={[
                  styles.gameText,
                  (isTrivia || isTruthOrDare) && styles.gameTextUnboxed,
                ]}>
                  <View style={styles.gameTopRow}>
                    <Text style={[styles.gameBadge, { color: tone.accent, borderColor: `${tone.accent}99` }]}>
                      {game.badge}
                    </Text>
                  </View>
                  {isTrivia ? (
                    <View style={styles.layeredTitle}>
                      <Text numberOfLines={2} style={styles.layeredTitleBack}>Trivia</Text>
                      <Text numberOfLines={2} style={styles.layeredTitleFront}>Trivia</Text>
                    </View>
                  ) : isTruthOrDare ? null : (
                    <Text numberOfLines={2} style={styles.gameTitle}>{game.title}</Text>
                  )}
                  {isTrivia || isTruthOrDare ? null : (
                    <Text numberOfLines={2} style={styles.gameDescription}>{game.description}</Text>
                  )}
                </View>
                <Text style={styles.players}>
                  {game.players} <Text style={styles.sample}>· sample</Text>
                </Text>
                {game.title === 'School Life' ? (
                  <Text pointerEvents="none" style={styles.playLabel}>COMING SOON</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <Text style={styles.sectionMeta}>YOUR RECENT GAMES</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.recentList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {recentGames.map((game) => {
            const tone = gameTones[game.tone];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${game.title}. Last played ${game.played}.`}
                accessibilityHint="Opens this game."
                key={game.title}
                onPress={() => openGame(game.title)}
                style={({ pressed }) => [
                  styles.recentCard,
                  { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={gameArtwork[game.title] ?? { uri: game.image }}
                  contentFit="cover"
                  style={styles.recentImage}
                />
                <View pointerEvents="none" style={styles.recentShade} />
                <View pointerEvents="none" style={styles.recentCopy}>
                  <Text numberOfLines={2} style={styles.recentTitle}>{game.title}</Text>
                  <Text style={styles.recentMeta}>Last played {game.played}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>

      {wordPuzzleOpen ? <DailyWordPuzzleGame onClose={() => setWordPuzzleOpen(false)} /> : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setDialog(null)}
        transparent
        visible={dialog !== null}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.dialog}>
            <Text style={styles.dialogTitle}>{dialog?.title}</Text>
            <Text style={styles.dialogBody}>{dialog?.body}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDialog(null)}
              style={styles.dialogButton}
            >
              <Text style={styles.dialogButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 132,
  },
  hero: {
    borderColor: '#523e5d',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 160,
    overflow: 'hidden',
    padding: 14,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12,8,19,0.58)',
  },
  heroCopy: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  heroKicker: {
    color: '#f8c992',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: 5,
  },
  heroHighlight: {
    color: '#ffe276',
  },
  heroDescription: {
    color: '#f3edf1',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    maxWidth: 250,
  },
  exploreButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f6ba83',
    borderRadius: radius.pill,
    marginTop: 10,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  pressed: {
    opacity: 0.78,
  },
  exploreButtonText: {
    color: '#21140f',
    fontSize: 10,
    fontWeight: '900',
  },
  heroBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(28,18,33,0.72)',
    borderColor: 'rgba(255,226,118,0.65)',
    borderRadius: 15,
    borderWidth: 1,
    marginLeft: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    transform: [{ rotate: '5deg' }],
  },
  heroBadgeTop: {
    color: '#f2a3a0',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  heroBadgeBottom: {
    color: '#ffe276',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    paddingHorizontal: 16,
  },
  gameCard: {
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    height: 236,
    minWidth: 145,
    overflow: 'hidden',
    padding: 10,
    position: 'relative',
  },
  gameText: {
    backgroundColor: 'rgba(8,7,14,0.76)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
    padding: 8,
  },
  gameTextUnboxed: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  gameImage: {
    ...StyleSheet.absoluteFill,
  },
  gameShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,7,14,0.18)',
  },
  gameTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  gameBadge: {
    backgroundColor: 'rgba(12,10,19,0.72)',
    borderRadius: radius.pill,
    borderWidth: 1,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  gameTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  layeredTitle: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  layeredTitleBack: {
    color: '#a269ff',
    fontSize: 25.3,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 27,
    position: 'absolute',
    left: 2,
    top: 2,
    textShadowColor: '#b134d7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  layeredTitleFront: {
    color: '#ffe477',
    fontSize: 25.3,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 27,
    textShadowColor: 'rgba(255,91,85,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  gameDescription: {
    color: '#f6f2f4',
    fontSize: 9,
    lineHeight: 12,
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  players: {
    bottom: 10,
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    left: 10,
    position: 'absolute',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sample: {
    color: '#eee6ea',
    fontWeight: '500',
  },
  playLabel: {
    backgroundColor: 'rgba(12,10,19,0.78)',
    borderRadius: radius.pill,
    bottom: 6,
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
    position: 'absolute',
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  recentList: {
    gap: 9,
    paddingHorizontal: 16,
  },
  recentCard: {
    borderRadius: 13,
    borderWidth: 1,
    height: 112,
    overflow: 'hidden',
    width: 126,
  },
  recentImage: {
    ...StyleSheet.absoluteFill,
  },
  recentShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,7,14,0.45)',
  },
  recentCopy: {
    marginTop: 'auto',
    padding: 9,
  },
  recentTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
  },
  recentMeta: {
    color: '#e4e0e4',
    fontSize: 8,
    marginTop: 3,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: 400,
    padding: 22,
    width: '100%',
  },
  dialogTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  dialogBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  dialogButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    marginTop: 12,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  dialogButtonText: {
    color: colors.inverse,
    fontSize: 12,
    fontWeight: '800',
  },
});
