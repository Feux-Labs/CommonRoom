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
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type DailyWordPuzzleGameProps = {
  onClose: () => void;
};

type Cell = {
  row: number;
  column: number;
};

const grid = [
  'LECTUREE',
  'CAMPUSXX',
  'HOSTELXA',
  'XXXXXXXM',
  'STUDYING',
  'LIBRARYX',
  'CAFETERI',
  'NOTEBOOK',
];

const words = ['LECTURE', 'CAMPUS', 'HOSTEL', 'EXAM', 'STUDYING', 'LIBRARY'];

const cellKey = ({ row, column }: Cell) => `${row}-${column}`;

export function DailyWordPuzzleGame({ onClose }: DailyWordPuzzleGameProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [selectedCells, setSelectedCells] = useState<Cell[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [message, setMessage] = useState('Tap adjacent letters in order to find each word.');
  const foundCellKeys = new Set(
    selectedCellsForWords(foundWords).map(cellKey),
  );
  const isComplete = foundWords.length === words.length;

  const startAt = (cell: Cell) => {
    const letter = grid[cell.row][cell.column];
    const canStart = words.some((word) => (
      word.startsWith(letter) || reverseWord(word).startsWith(letter)
    ));
    setSelectedCells(canStart ? [cell] : []);
    if (!canStart) {
      setMessage('That letter does not start a hidden word. Try another.');
    }
  };

  const selectCell = (cell: Cell) => {
    if (foundCellKeys.has(cellKey(cell))) {
      return;
    }
    if (selectedCells.some((selected) => cellKey(selected) === cellKey(cell))) {
      startAt(cell);
      return;
    }
    if (selectedCells.length === 0) {
      startAt(cell);
      return;
    }

    const previous = selectedCells[selectedCells.length - 1];
    const deltaRow = cell.row - previous.row;
    const deltaColumn = cell.column - previous.column;
    const isAdjacent = Math.abs(deltaRow) + Math.abs(deltaColumn) === 1;
    const isSameDirection = selectedCells.length < 2 || (
      deltaRow === selectedCells[1].row - selectedCells[0].row
      && deltaColumn === selectedCells[1].column - selectedCells[0].column
    );
    if (!isAdjacent || !isSameDirection) {
      startAt(cell);
      return;
    }

    const nextSelection = [...selectedCells, cell];
    const nextWord = nextSelection
      .map(({ row, column }) => grid[row][column])
      .join('');
    const match = words.find((word) => (
      word === nextWord || reverseWord(word) === nextWord
    ));
    if (match) {
      setFoundWords((current) => current.includes(match) ? current : [...current, match]);
      setSelectedCells([]);
      setMessage('Nice find! Keep going to uncover the rest.');
      return;
    }

    const isWordPrefix = words.some((word) => (
      word.startsWith(nextWord) || reverseWord(word).startsWith(nextWord)
    ));
    if (isWordPrefix) {
      setSelectedCells(nextSelection);
      setMessage(`${nextWord}… keep selecting letters.`);
      return;
    }

    startAt(cell);
  };

  const resetPuzzle = () => {
    setSelectedCells([]);
    setFoundWords([]);
    setMessage('Tap adjacent letters in order to find each word.');
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" visible>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Text style={styles.kicker}>DAILY CAMPUS CHALLENGE</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </Pressable>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>Daily Word Puzzle</Text>
            <Text style={styles.description}>
              Find six campus words. Tap each word’s letters in order, moving one square at a time.
            </Text>
          </View>

          <View style={styles.artworkFrame}>
            <Image
              contentFit="contain"
              source={require('../../assets/games/daily-word-puzzle.jpg')}
              style={styles.artwork}
            />
          </View>

          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {isComplete ? 'Puzzle complete! You found every campus word.' : message}
          </Text>

          <View accessibilityLabel="Word search grid" style={styles.grid}>
            {grid.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {row.split('').map((letter, columnIndex) => {
                  const cell = { row: rowIndex, column: columnIndex };
                  const selected = selectedCells.some(
                    (item) => cellKey(item) === cellKey(cell),
                  );
                  const found = foundCellKeys.has(cellKey(cell));
                  return (
                    <Pressable
                      accessibilityLabel={`${letter}, row ${rowIndex + 1}, column ${columnIndex + 1}`}
                      accessibilityRole="button"
                      key={cellKey(cell)}
                      onPress={() => selectCell(cell)}
                      style={[
                        styles.letterTile,
                        found && styles.foundTile,
                        selected && styles.selectedTile,
                      ]}
                    >
                      <Text style={[styles.letter, (found || selected) && styles.activeLetter]}>
                        {letter}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View accessibilityLabel="Words to find" style={styles.wordList}>
            {words.map((word) => {
              const found = foundWords.includes(word);
              return (
                <View key={word} style={[styles.wordChip, found && styles.foundWordChip]}>
                  <Text style={[styles.wordText, found && styles.foundWordText]}>{word}</Text>
                  {found ? <Text style={styles.checkmark}>FOUND</Text> : null}
                </View>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={resetPuzzle} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Start over</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function reverseWord(word: string) {
  return [...word].reverse().join('');
}

function selectedCellsForWords(foundWords: string[]): Cell[] {
  const placements: Record<string, Cell[]> = {
    LECTURE: Array.from({ length: 7 }, (_, column) => ({ row: 0, column })),
    CAMPUS: Array.from({ length: 6 }, (_, column) => ({ row: 1, column })),
    HOSTEL: Array.from({ length: 6 }, (_, column) => ({ row: 2, column })),
    EXAM: Array.from({ length: 4 }, (_, row) => ({ row, column: 7 })),
    STUDYING: Array.from({ length: 8 }, (_, column) => ({ row: 4, column })),
    LIBRARY: Array.from({ length: 7 }, (_, column) => ({ row: 5, column })),
  };
  return foundWords.flatMap((word) => placements[word] ?? []);
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 480,
    paddingBottom: 30,
    paddingHorizontal: 16,
    paddingTop: 18,
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  kicker: {
    color: '#ff8d3a',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  closeButton: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '800',
  },
  heading: {
    alignItems: 'center',
    marginTop: 14,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    maxWidth: 330,
    textAlign: 'center',
  },
  artworkFrame: {
    alignItems: 'center',
    backgroundColor: '#a32111',
    borderColor: '#fa9c38',
    borderRadius: 15,
    borderWidth: 1,
    height: 126,
    marginTop: 14,
    overflow: 'hidden',
    width: '100%',
  },
  artwork: {
    height: '100%',
    width: '100%',
  },
  message: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 9,
    marginTop: 14,
    minHeight: 16,
    textAlign: 'center',
  },
  grid: {
    alignSelf: 'center',
    gap: 4,
    maxWidth: 368,
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  letterTile: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  selectedTile: {
    backgroundColor: '#f2a93b',
    borderColor: '#ffc86b',
  },
  foundTile: {
    backgroundColor: '#188263',
    borderColor: '#43d5a3',
  },
  letter: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  activeLetter: {
    color: '#fff',
  },
  wordList: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
    marginTop: 14,
    maxWidth: 368,
    width: '100%',
  },
  wordChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 27,
    paddingHorizontal: 9,
  },
  foundWordChip: {
    backgroundColor: 'rgba(24,130,99,0.2)',
    borderColor: '#43d5a3',
  },
  wordText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '800',
  },
  foundWordText: {
    color: '#43d5a3',
  },
  checkmark: {
    color: '#43d5a3',
    fontSize: 7,
    fontWeight: '900',
  },
  resetButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 13,
    minHeight: 34,
    paddingHorizontal: 14,
  },
  resetButtonText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
});
