declare module 'lucide-react-native' {
  import type { ComponentType } from 'react';

  type LucideProps = {
    color?: string;
    size?: number;
    strokeWidth?: number;
  };

  type LucideIcon = ComponentType<LucideProps>;

  export const Bell: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Bookmark: LucideIcon;
  export const Calendar: LucideIcon;
  export const Camera: LucideIcon;
  export const ChartColumn: LucideIcon;
  export const CircleQuestionMark: LucideIcon;
  export const Dice5: LucideIcon;
  export const FileText: LucideIcon;
  export const Gamepad2: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const Grid2X2: LucideIcon;
  export const Heart: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const MapPin: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Shield: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const SquarePlus: LucideIcon;
  export const Star: LucideIcon;
  export const Trophy: LucideIcon;
  export const Users: LucideIcon;
  export const Video: LucideIcon;
  export const X: LucideIcon;
}
