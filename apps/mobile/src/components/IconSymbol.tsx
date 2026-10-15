import { StyleSheet, View } from 'react-native';
import {
  Bell,
  BookOpen,
  Bookmark,
  Calendar,
  Camera,
  ChartColumn,
  CircleQuestionMark,
  FileText,
  Gamepad2,
  Grid2x2,
  Heart,
  House,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  SquarePlus,
  Star,
  Trophy,
  Users,
  Video,
  X,
} from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';

type IconSymbolProps = {
  name: string;
  active?: boolean;
  framed?: boolean;
  size?: number;
};

const icons: Record<string, any> = {
  Aa: BookOpen,
  Bell,
  Brain: Trophy,
  Calendar,
  Camera,
  Create: SquarePlus,
  Dating: Heart,
  Games: Gamepad2,
  Graduation: BookOpen,
  Grid: Grid2x2,
  Group: Users,
  Home: House,
  Image: ImageIcon,
  MapPin,
  Menu: SlidersHorizontal,
  Message: MessageCircle,
  Poll: ChartColumn,
  Question: CircleQuestionMark,
  Save: Bookmark,
  School: BookOpen,
  Search,
  Send,
  Share: Send,
  Shield,
  ShoppingCart,
  Star,
  Text: FileText,
  Trophy,
  Video,
  X,
};

export function IconSymbol({ name, active = false, framed = true, size = 13 }: IconSymbolProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const iconSize = Math.round(size * 1.28);
  const iconColor = active && framed ? colors.inverse : colors.text;
  const boxSize = Math.round(size * 2.55);
  const Icon = icons[name] ?? CircleQuestionMark;

  return (
    <View
      accessibilityElementsHidden
      style={[
        framed && styles.icon,
        framed && { width: boxSize, height: boxSize },
        active && framed && styles.active,
      ]}
    >
      {Icon ? <Icon color={iconColor} size={iconSize} strokeWidth={active ? 2.6 : 2.2} /> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  icon: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.text,
  },
});
