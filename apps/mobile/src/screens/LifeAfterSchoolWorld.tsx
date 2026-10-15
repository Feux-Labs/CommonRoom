import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type LifeAfterSchoolWorldProps = {
  onClose: () => void;
};

type PhonePage = 'home' | 'messages' | 'jobs' | 'nysc' | 'travel' | 'community';
type Furniture = { name: string; price: number; icon: string };
type Notice = { title: string; message: string };
type PhoneApp = { name: string; icon: string; color: string; page: PhonePage };
type GenderIdentity = 'man' | 'woman' | 'non-binary';
type CharacterAppearance = 'man' | 'woman';
type HomeType = 'starter' | 'tech' | 'abroad' | 'village';
type PlaceCategory = 'market' | 'lake' | 'mosque' | 'hospital' | 'gym' | 'spa' | 'school' | 'tech' | 'cafe' | 'church' | 'park' | 'salon' | 'bus' | 'stadium' | 'cinema' | 'restaurant';
type CityPlace = {
  name: string;
  category: PlaceCategory;
  icon: string;
  x: number;
  y: number;
  distanceKm: number;
  description: string;
  people: string[];
  activities: string[];
};
type RideMode = 'Bolt' | 'Keke' | 'Bike' | 'Cab';
type RideOption = { name: RideMode; icon: string; baseFare: number; farePerKm: number; duration: string };

const characterStorageKey = '@schoolmate/life-after-school/character-v1';

const characterAssets = {
  man: require('../../assets/characters/man.png'),
  woman: require('../../assets/characters/woman.png'),
};

const homeAssets = {
  tech: require('../../assets/homes/tech-home.jpg'),
  abroad: require('../../assets/homes/abroad-three-story-home.jpg'),
  village: require('../../assets/homes/village-family-home.jpg'),
};

const abujaPlaces: CityPlace[] = [
  { name: 'Wuse Market', category: 'market', icon: '🛍️', x: 25, y: 22, distanceKm: 2, description: 'A busy Abuja market with food stalls, fabric sellers, and everyday essentials.', people: ['Traders call out today’s fresh prices.', 'A shopper compares tomatoes and peppers.', 'A tailor measures a new outfit nearby.'], activities: ['Buy groceries', 'Browse local fabrics', 'Help a trader for the afternoon'] },
  { name: 'Jabi Lake', category: 'lake', icon: '🌊', x: 73, y: 18, distanceKm: 8, description: 'A lakeside promenade where families, joggers, and visitors spend the afternoon.', people: ['A family shares snacks by the water.', 'Joggers follow the lakeside path.', 'A boat operator waves to arriving visitors.'], activities: ['Take a lakeside walk', 'Join a jog', 'Buy a snack'] },
  { name: 'National Mosque', category: 'mosque', icon: '🕌', x: 51, y: 15, distanceKm: 4, description: 'A peaceful place for prayer, reflection, and community.', people: ['Worshippers greet one another quietly.', 'A volunteer helps visitors find their way.', 'Families gather outside after prayers.'], activities: ['Spend time in reflection', 'Meet community members', 'Volunteer to help'] },
  { name: 'National Hospital', category: 'hospital', icon: '🏥', x: 77, y: 46, distanceKm: 7, description: 'A staffed hospital offering routine care, consultations, and support.', people: ['A nurse guides a family to reception.', 'Patients wait calmly for their appointments.', 'A counsellor welcomes someone for a private conversation.'], activities: ['Book a routine check-up', 'Speak with a counsellor', 'Ask privately about gender-affirming care'] },
  { name: 'Wuse Gym', category: 'gym', icon: '🏋️', x: 38, y: 41, distanceKm: 3, description: 'A neighborhood gym with trainers, exercise bikes, and free weights.', people: ['A trainer spots someone lifting weights.', 'Two friends take turns on the exercise bike.', 'A class follows the coach through stretches.'], activities: ['Join a coached workout', 'Practice with light weights', 'Talk with the trainer'] },
  { name: 'Sahara Spa', category: 'spa', icon: '💆', x: 62, y: 54, distanceKm: 5, description: 'A calm spa with private treatment rooms and a welcoming reception.', people: ['A guest relaxes during a massage.', 'A therapist prepares fresh towels.', 'Two friends enjoy the quiet waiting lounge.'], activities: ['Book a massage · ₦5,000', 'Ask about a facial · ₦3,500', 'Relax in the lounge'] },
  { name: 'Unity Secondary School', category: 'school', icon: '🏫', x: 28, y: 56, distanceKm: 6, description: 'A busy school campus with lessons, a library, and a courtyard.', people: ['A teacher writes today’s lesson on the board.', 'Students listen and take notes.', 'A librarian helps a student find a book.'], activities: ['Attend an open lesson', 'Study quietly in the library', 'Interrupt the lesson'] },
  { name: 'Innovation Hub', category: 'tech', icon: '💻', x: 49, y: 32, distanceKm: 4, description: 'A shared workspace where founders, designers, and developers build ideas.', people: ['A developer tests a new app.', 'A designer shares a prototype with their team.', 'A mentor answers questions at the community table.'], activities: ['Work on a portfolio', 'Join a coding session', 'Meet a mentor'] },
  { name: 'Jabi Café', category: 'cafe', icon: '☕', x: 83, y: 27, distanceKm: 9, description: 'A neighborhood café serving Nigerian snacks, coffee, and fresh juice.', people: ['Friends catch up over tea.', 'A barista serves a fresh cup of coffee.', 'A student studies near the window.'], activities: ['Buy a drink · ₦1,200', 'Meet someone new', 'Look for a part-time shift'] },
  { name: 'Community Church', category: 'church', icon: '⛪', x: 17, y: 43, distanceKm: 5, description: 'A local church with community programs, music, and quiet spaces.', people: ['A choir practices for the weekend.', 'Volunteers prepare a shared meal.', 'Neighbors greet one another in the courtyard.'], activities: ['Join a community gathering', 'Volunteer for a meal', 'Spend time in reflection'] },
  { name: 'Millennium Park', category: 'park', icon: '🌳', x: 65, y: 73, distanceKm: 7, description: 'An open city park with shaded paths, lawns, and family picnic areas.', people: ['Children play while their family watches nearby.', 'A group follows a dance instructor.', 'Neighbors walk dogs along the path.'], activities: ['Take a walk', 'Join a dance class', 'Rest under a tree'] },
  { name: 'Wuse Salon', category: 'salon', icon: '✂️', x: 36, y: 69, distanceKm: 3, description: 'A lively salon offering haircuts, braids, and styling.', people: ['A stylist braids a client’s hair.', 'A barber finishes a neat haircut.', 'Friends compare ideas in the waiting area.'], activities: ['Get a haircut · ₦2,500', 'Ask about a salon job', 'Chat with the stylists'] },
  { name: 'Utako Bus Park', category: 'bus', icon: '🚌', x: 13, y: 72, distanceKm: 8, description: 'A busy transport hub connecting Abuja neighborhoods and nearby towns.', people: ['Passengers check their departure times.', 'A driver loads luggage into the bus.', 'A vendor sells water and snacks.'], activities: ['Check an intercity fare', 'Buy water · ₦500', 'Ask about a driving job'] },
  { name: 'National Stadium', category: 'stadium', icon: '🏟️', x: 86, y: 68, distanceKm: 10, description: 'A city stadium hosting training sessions, community matches, and events.', people: ['Players warm up before a match.', 'A coach arranges training cones.', 'Fans gather near the entrance.'], activities: ['Join a community match', 'Watch a training session', 'Volunteer at an event'] },
  { name: 'City Centre Cinema', category: 'cinema', icon: '🎬', x: 54, y: 81, distanceKm: 6, description: 'A modern cinema with a lobby, ticket desk, and snack counter.', people: ['Friends choose a film together.', 'A family waits by the ticket desk.', 'Staff prepare popcorn at the counter.'], activities: ['See a film · ₦4,000', 'Meet friends in the lobby', 'Ask about a weekend shift'] },
  { name: 'Garki Kitchen', category: 'restaurant', icon: '🍲', x: 39, y: 16, distanceKm: 5, description: 'A family restaurant serving Nigerian meals and welcoming regulars.', people: ['A cook serves jollof rice and stew.', 'A family shares a meal at a table.', 'A server checks on the lunch crowd.'], activities: ['Order lunch · ₦2,500', 'Ask about kitchen work', 'Meet a friend for a meal'] },
];

const rideOptions: RideOption[] = [
  { name: 'Bolt', icon: '🚘', baseFare: 500, farePerKm: 240, duration: '10–18 min' },
  { name: 'Keke', icon: '🛺', baseFare: 250, farePerKm: 130, duration: '15–25 min' },
  { name: 'Bike', icon: '🏍️', baseFare: 300, farePerKm: 150, duration: '8–15 min' },
  { name: 'Cab', icon: '🚕', baseFare: 400, farePerKm: 190, duration: '12–22 min' },
];

const furnitureCatalog: Furniture[] = [
  { name: 'Reading chair', price: 18000, icon: '🪑' },
  { name: 'Floor lamp', price: 12000, icon: '💡' },
  { name: 'Bookshelf', price: 26000, icon: '📚' },
  { name: 'House plant', price: 8000, icon: '🪴' },
];

const jobs = [
  { name: 'Cafe server', pay: 18000, skill: 'Service', minCareer: 0 },
  { name: 'Shop assistant', pay: 22000, skill: 'Retail', minCareer: 0 },
  { name: 'Freelance designer', pay: 28000, skill: 'Creative', minCareer: 0 },
  { name: 'Office administrator', pay: 32000, skill: 'Organization', minCareer: 25 },
  { name: 'Digital marketer', pay: 38000, skill: 'Marketing', minCareer: 25 },
  { name: 'Software developer', pay: 52000, skill: 'Technology', minCareer: 50 },
  { name: 'Project coordinator', pay: 58000, skill: 'Leadership', minCareer: 50 },
  { name: 'Product manager', pay: 78000, skill: 'Strategy', minCareer: 75 },
  { name: 'Business director', pay: 100000, skill: 'Executive leadership', minCareer: 100 },
];

const careerRanks = [
  { name: 'Trainee', minCareer: 0 },
  { name: 'Associate', minCareer: 25 },
  { name: 'Professional', minCareer: 50 },
  { name: 'Senior', minCareer: 75 },
  { name: 'Leader', minCareer: 100 },
];

const trips = [
  { name: 'Lagos', price: 12000 },
  { name: 'Abuja', price: 20000 },
  { name: 'Port Harcourt', price: 24000 },
  { name: 'Travel abroad', price: 180000 },
  { name: 'Back to the village', price: 8000 },
];

const phoneApps: PhoneApp[] = [
  { name: 'Jobs', icon: '💼', color: '#20b67a', page: 'jobs' },
  { name: 'Messages', icon: '💬', color: '#3988ed', page: 'messages' },
  { name: 'Games', icon: '🎮', color: '#282c8f', page: 'community' },
  { name: 'Meetumo', icon: '🗺️', color: '#0ba999', page: 'community' },
  { name: 'PopOut Tickets', icon: '🎟️', color: '#8548d6', page: 'travel' },
  { name: 'HANDI', icon: '🤝', color: '#178f58', page: 'jobs' },
  { name: 'Eleventhco', icon: '🪙', color: '#f1f3f5', page: 'jobs' },
  { name: 'Heala', icon: '✚', color: '#3685e6', page: 'community' },
  { name: 'Travel', icon: '🧳', color: '#2e8be7', page: 'travel' },
  { name: 'NYSC', icon: '🎓', color: '#e98327', page: 'nysc' },
  { name: 'Community', icon: '⛪', color: '#9759d8', page: 'community' },
  { name: 'Family', icon: '📞', color: '#e9547b', page: 'home' },
];

const money = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

export function LifeAfterSchoolWorld({ onClose }: LifeAfterSchoolWorldProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [cash, setCash] = useState(85000);
  const [health, setHealth] = useState(100);
  const [energy, setEnergy] = useState(76);
  const [mood, setMood] = useState(72);
  const [career, setCareer] = useState(12);
  const [connections, setConnections] = useState(28);
  const [day, setDay] = useState(1);
  const [city, setCity] = useState('Abuja');
  const [homeType, setHomeType] = useState<HomeType>('starter');
  const [job, setJob] = useState<(typeof jobs)[number] | null>(null);
  const [workedToday, setWorkedToday] = useState(false);
  const [calledFamilyToday, setCalledFamilyToday] = useState(false);
  const [didNYSC, setDidNYSC] = useState(false);
  const [atNYSC, setAtNYSC] = useState(false);
  const [hospitalized, setHospitalized] = useState(false);
  const [phonePage, setPhonePage] = useState<PhonePage>('home');
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [cityMapOpen, setCityMapOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CityPlace | null>(null);
  const [travelingTo, setTravelingTo] = useState<{ place: CityPlace; ride: RideOption } | null>(null);
  const [arrivedPlace, setArrivedPlace] = useState<CityPlace | null>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 57 });
  const [isWalking, setIsWalking] = useState(false);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const walkingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | null>(null);
  const [characterAppearance, setCharacterAppearance] = useState<CharacterAppearance>('man');
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [identityPickerOpen, setIdentityPickerOpen] = useState(false);
  const [pendingIdentity, setPendingIdentity] = useState<GenderIdentity>('man');
  const [pendingAppearance, setPendingAppearance] = useState<CharacterAppearance>('man');
  const [identityStorageError, setIdentityStorageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>({
    title: 'Your next chapter',
    message: 'Make yourself at home. Tap furniture to interact or use the phone to make a plan.',
  });
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const careerRank = [...careerRanks].reverse().find((rank) => career >= rank.minCareer) ?? careerRanks[0];
  const nextCareerRank = careerRanks.find((rank) => rank.minCareer > career);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(characterStorageKey).then((savedCharacter) => {
      if (!active) return;
      if (!savedCharacter) {
        setIdentityPickerOpen(true);
        return;
      }
      const character = JSON.parse(savedCharacter) as {
        identity?: GenderIdentity;
        appearance?: CharacterAppearance;
      };
      if (
        (character.identity === 'man' || character.identity === 'woman' || character.identity === 'non-binary')
        && (character.appearance === 'man' || character.appearance === 'woman')
      ) {
        setGenderIdentity(character.identity);
        setCharacterAppearance(character.appearance);
        setPendingIdentity(character.identity);
        setPendingAppearance(character.appearance);
      } else {
        setIdentityStorageError('Your saved character choice could not be read. Please choose again.');
        setIdentityPickerOpen(true);
      }
    }).catch(() => {
      if (!active) return;
      setIdentityStorageError('Character storage is unavailable. Your choice will be kept for this session only.');
      setIdentityPickerOpen(true);
    }).finally(() => {
      if (active) setIdentityLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!travelingTo) return undefined;
    const arrivalTimer = setTimeout(() => {
      setArrivedPlace(travelingTo.place);
      setTravelingTo(null);
      setNotice({
        title: `Arrived at ${travelingTo.place.name}`,
        message: travelingTo.place.description,
      });
    }, 2600);
    return () => clearTimeout(arrivalTimer);
  }, [travelingTo]);

  useEffect(() => () => {
    if (walkingInterval.current) clearInterval(walkingInterval.current);
  }, []);

  const sleep = () => {
    if (isSleeping) return;
    stopWalking();
    setPosition({ x: 63, y: 41 });
    setPhoneOpen(false);
    setBuildOpen(false);
    setIsSleeping(true);
    setNotice({
      title: 'Good night',
      message: hospitalized
        ? 'You are resting safely while the hospital team cares for you.'
        : 'You get into bed, settle under the covers, and sleep through the night.',
    });
  };

  const wakeUp = () => {
    if (!isSleeping) return;
    setDay((current) => current + 1);
    setEnergy(100);
    setHealth((current) => Math.min(100, current + (hospitalized ? 15 : 8)));
    setMood((current) => Math.min(100, current + 10));
    setWorkedToday(false);
    setCalledFamilyToday(false);
    setIsSleeping(false);
    setNotice({
      title: 'Good morning',
      message: hospitalized
        ? 'You rested under care. You are recovering safely; choose treatment or rest again.'
        : 'You slept through the night. Your energy is restored and a new day begins.',
    });
  };

  const saveCharacter = async () => {
    setGenderIdentity(pendingIdentity);
    setCharacterAppearance(pendingAppearance);
    setIdentityPickerOpen(false);
    setIdentityStorageError(null);
    try {
      await AsyncStorage.setItem(characterStorageKey, JSON.stringify({
        identity: pendingIdentity,
        appearance: pendingAppearance,
      }));
      setNotice({
        title: 'Character choice saved',
        message: `Identity: ${pendingIdentity}. Appearance can be changed separately at any time.`,
      });
    } catch {
      const message = 'Your character is set for this session, but could not be saved for next time.';
      setIdentityStorageError(message);
      setNotice({ title: 'Could not save character choice', message });
    }
  };

  const move = (dx: number, dy: number) => {
    if (dx !== 0) setFacing(dx < 0 ? 'left' : 'right');
    setPosition((current) => ({
      x: Math.max(9, Math.min(91, current.x + dx)),
      y: Math.max(23, Math.min(82, current.y + dy)),
    }));
  };

  const startWalking = (dx: number, dy: number) => {
    if (walkingInterval.current) clearInterval(walkingInterval.current);
    move(dx, dy);
    setIsWalking(true);
    walkingInterval.current = setInterval(() => move(dx, dy), 180);
  };

  const stopWalking = () => {
    if (walkingInterval.current) {
      clearInterval(walkingInterval.current);
      walkingInterval.current = null;
    }
    setIsWalking(false);
  };

  const selectFurniture = (kind: 'bed' | 'desk' | 'sofa' | 'door') => {
    if (kind === 'bed') {
      sleep();
      return;
    }
    if (kind === 'desk') {
      setPosition({ x: 70, y: 51 });
      setPhonePage('jobs');
      setPhoneOpen(true);
      setNotice({
        title: job ? 'Your workspace' : 'Your desk',
        message: job
          ? `${job.name} is your current job. Choose Work a shift to get started.`
          : 'Open Phone → Jobs to look for your first job.',
      });
      return;
    }
    if (kind === 'sofa') {
      setPosition({ x: 29, y: 58 });
      setEnergy((current) => Math.min(100, current + 8));
      setMood((current) => Math.min(100, current + 6));
      setNotice({ title: 'A quiet moment', message: 'You relax at home. Energy and mood improve a little.' });
      return;
    }
    setPosition({ x: 52, y: 80 });
    setPhoneOpen(true);
    setPhonePage('travel');
    setNotice({ title: 'Going somewhere?', message: 'Choose where your next chapter takes you.' });
  };

  const callFamily = () => {
    if (calledFamilyToday) {
      setNotice({
        title: 'Call home',
        message: 'You already spoke with your family today. Try them again tomorrow.',
      });
      return;
    }
    setCash((current) => current + 35000);
    setMood((current) => Math.min(100, current + 5));
    setCalledFamilyToday(true);
    setNotice({ title: 'Money from home', message: `${money(35000)} received. Your family sends their love.` });
  };

  const takeJob = (selectedJob: (typeof jobs)[number]) => {
    if (career < selectedJob.minCareer) {
      setNotice({
        title: 'Keep building experience',
        message: `${selectedJob.name} opens at ${careerRanks.find((rank) => rank.minCareer === selectedJob.minCareer)?.name ?? 'a higher career level'} (${selectedJob.minCareer} career).`,
      });
      return;
    }
    setJob(selectedJob);
    if (selectedJob.skill === 'Technology') setHomeType('tech');
    setPhonePage('jobs');
    setNotice({
      title: 'New opportunity',
      message: `${selectedJob.name} is now your job. Choose Work a shift when you are ready.`,
    });
  };

  const advanceCareer = (points: number) => {
    const nextCareer = Math.min(100, career + points);
    setCareer(nextCareer);
    return jobs
      .filter((availableJob) => availableJob.minCareer > career && availableJob.minCareer <= nextCareer)
      .map((availableJob) => availableJob.name);
  };

  const workShift = () => {
    if (!job) {
      setPhonePage('jobs');
      setPhoneOpen(true);
      return;
    }
    if (workedToday || energy < 20 || hospitalized) {
      setNotice({
        title: 'Take care of yourself',
        message: hospitalized ? 'Recover before returning to work.' : 'Rest before taking another shift.',
      });
      return;
    }
    setCash((current) => current + job.pay);
    const newlyAvailableJobs = advanceCareer(8);
    setEnergy((current) => Math.max(0, current - 20));
    setMood((current) => Math.max(0, current - 4));
    setWorkedToday(true);
    setNotice({
      title: newlyAvailableJobs.length > 0 ? 'Career milestone reached' : 'Shift complete',
      message: newlyAvailableJobs.length > 0
        ? `${money(job.pay)} earned. ${newlyAvailableJobs.join(' and ')} ${newlyAvailableJobs.length === 1 ? 'is' : 'are'} now available.`
        : `${money(job.pay)} earned. Your ${job.skill.toLowerCase()} skills are growing.`,
    });
  };

  const joinNYSC = () => {
    if (didNYSC) {
      setNotice({
        title: 'Service completed',
        message: 'You have already completed your NYSC year in this playthrough.',
      });
      return;
    }
    setAtNYSC(true);
    setDidNYSC(true);
    setDay((current) => current + 1);
    const newlyAvailableJobs = advanceCareer(16);
    setConnections((current) => Math.min(100, current + 12));
    setEnergy((current) => Math.max(30, current - 18));
    setCash((current) => current + 77000);
    setPhoneOpen(false);
    setNotice({
      title: 'NYSC camp',
      message: newlyAvailableJobs.length > 0
        ? `Your camp experience is complete. ${money(77000)} allowance received. New roles are open: ${newlyAvailableJobs.join(', ')}.`
        : `Your camp experience is complete. ${money(77000)} allowance received and new connections made.`,
    });
  };

  const travel = (destination: (typeof trips)[number]) => {
    if (cash < destination.price) {
      setNotice({
        title: 'Not enough for the trip',
        message: `You need ${money(destination.price)} to travel to ${destination.name}.`,
      });
      return;
    }
    setCash((current) => current - destination.price);
    setCity(destination.name);
    setHomeType(destination.name === 'Back to the village'
      ? 'village'
      : destination.name === 'Travel abroad'
        ? 'abroad'
        : 'starter');
    setAtNYSC(false);
    setPhoneOpen(false);
    setNotice({
      title: `Welcome to ${destination.name}`,
      message: 'A new place, new people, and a fresh set of possibilities.',
    });
    if (Math.random() < 0.18) {
      const lost = Math.min(Math.floor(destination.price * 0.4), Math.max(3000, Math.floor(cash * 0.12)));
      setCash((current) => Math.max(0, current - lost));
      setNotice({
        title: 'A difficult travel day',
        message: `You lost ${money(lost)} during the trip. You are safe and can continue your plans.`,
      });
    }
  };

  const visitCommunity = (place: 'church' | 'healer' | 'nightlife') => {
    setPhoneOpen(false);
    if (place === 'church') {
      setConnections((current) => Math.min(100, current + 10));
      setMood((current) => Math.min(100, current + 12));
      setEnergy((current) => Math.max(0, current - 5));
      setNotice({ title: 'A day at church', message: 'You found time for reflection and community.' });
      return;
    }
    if (place === 'healer') {
      setMood((current) => Math.min(100, current + 8));
      setNotice({
        title: 'A traditional visit',
        message: 'You spent time with a traditional community healer. Visit a hospital for medical care.',
      });
      return;
    }
    setMood((current) => Math.min(100, current + 15));
    setConnections((current) => Math.min(100, current + 8));
    setEnergy((current) => Math.max(0, current - 12));
    setNotice({ title: 'A night out', message: 'You enjoyed a night out and caught up with people.' });
    const eventRoll = Math.random();
    if (eventRoll < 0.08) {
      setHospitalized(true);
      setPhoneOpen(false);
      setHealth((current) => Math.max(25, current - 55));
      setEnergy((current) => Math.max(0, current - 25));
      setNotice({
        title: 'Hospital care',
        message: 'You became unwell and were taken to hospital. You are safe and can recover with treatment or rest.',
      });
    } else if (eventRoll < 0.25) {
      const loss = Math.min(cash, 10000);
      setCash((current) => Math.max(0, current - loss));
      setNotice({
        title: 'Pickpocketed on your night out',
        message: `You lost ${money(loss)}, but you are safe. Take a moment before your next plan.`,
      });
    }
  };

  const getTreatment = () => {
    const bill = Math.min(cash, 12000);
    setCash((current) => current - bill);
    setHealth((current) => Math.min(100, current + 55));
    setEnergy((current) => Math.min(100, current + 24));
    setHospitalized(false);
    setNotice({
      title: 'Treatment complete',
      message: bill > 0
        ? `You are healing well. Hospital care cost ${money(bill)}.`
        : 'You received community-supported hospital care and are healing well.',
    });
  };

  const buyFurniture = (item: Furniture) => {
    if (cash < item.price) {
      setNotice({ title: 'Keep saving', message: `You need ${money(item.price)} for a ${item.name.toLowerCase()}.` });
      return;
    }
    setCash((current) => current - item.price);
    setFurniture((current) => [...current, item]);
    setNotice({ title: 'New for your home', message: `Your ${item.name.toLowerCase()} is ready to place.` });
  };

  const startCityTrip = (place: CityPlace, ride: RideOption) => {
    const fare = ride.baseFare + Math.ceil(place.distanceKm * ride.farePerKm / 100) * 100;
    if (cash < fare) {
      setNotice({
        title: 'Not enough for this ride',
        message: `The ${ride.name} fare to ${place.name} is ${money(fare)}. Choose another ride or earn more first.`,
      });
      return;
    }
    setCash((current) => current - fare);
    setSelectedPlace(null);
    setArrivedPlace(null);
    setCityMapOpen(false);
    setPhoneOpen(false);
    setTravelingTo({ place, ride });
    setNotice({
      title: `On the way to ${place.name}`,
      message: `Your ${ride.name} ride is moving through Abuja. Estimated trip: ${ride.duration}.`,
    });
  };

  const leaveCityPlace = () => {
    setArrivedPlace(null);
    setSelectedPlace(null);
    setCityMapOpen(true);
  };

  const doPlaceActivity = (place: CityPlace, activity: string) => {
    if (place.category === 'school' && activity === 'Interrupt the lesson') {
      setArrivedPlace(null);
      setCityMapOpen(true);
      setMood((current) => Math.max(0, current - 4));
      setNotice({
        title: 'The teacher sends you out',
        message: 'The teacher asks you to leave the classroom so the lesson can continue. You can return another day and join respectfully.',
      });
      return;
    }

    const cost = activity.includes('₦5,000') ? 5000
      : activity.includes('₦4,000') ? 4000
        : activity.includes('₦3,500') ? 3500
          : activity.includes('₦2,500') ? 2500
            : activity.includes('₦1,200') ? 1200
              : activity.includes('₦500') ? 500
                : 0;
    if (cash < cost) {
      setNotice({
        title: 'Save up first',
        message: `You need ${money(cost)} for that activity. You have ${money(cash)}.`,
      });
      return;
    }
    if (cost > 0) setCash((current) => current - cost);

    if (place.category === 'gym') {
      setEnergy((current) => Math.max(0, current - 14));
      setHealth((current) => Math.min(100, current + 4));
      setMood((current) => Math.min(100, current + 9));
    } else if (place.category === 'spa') {
      setEnergy((current) => Math.min(100, current + 14));
      setMood((current) => Math.min(100, current + 13));
    } else if (place.category === 'school' || place.category === 'tech') {
      setCareer((current) => Math.min(100, current + 3));
      setConnections((current) => Math.min(100, current + 4));
      setEnergy((current) => Math.max(0, current - 6));
    } else if (place.category === 'church' || place.category === 'mosque') {
      setMood((current) => Math.min(100, current + 10));
      setConnections((current) => Math.min(100, current + 5));
    } else if (place.category === 'park' || place.category === 'lake') {
      setMood((current) => Math.min(100, current + 10));
      setEnergy((current) => Math.min(100, current + 4));
    } else {
      setConnections((current) => Math.min(100, current + 3));
      setMood((current) => Math.min(100, current + 5));
    }

    if (place.category === 'hospital' && activity.includes('gender-affirming')) {
      setNotice({
        title: 'A private, optional conversation',
        message: 'A counsellor explains confidential, voluntary gender-affirming care options. Your identity is yours already; no treatment or surgery is required.',
      });
      return;
    }

    setNotice({
      title: `${activity.replace(/ · .*/, '')} at ${place.name}`,
      message: `${place.people[(day + place.name.length) % place.people.length]} Your day changes a little with every place you visit.`,
    });
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen" visible>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.timeMood}>
            <Text style={styles.weather}>{isSleeping ? '🌙' : '☀️'}</Text>
            <Text style={styles.topMeta}>DAY {day} · {isSleeping ? '10:45 PM' : '7:00 AM'}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.moodText}>{mood > 65 ? '🙂 Happy' : '😐 Okay'}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.cityText}>{atNYSC ? 'NYSC CAMP' : city.toUpperCase()}</Text>
          </View>
          <View style={styles.wallet}>
            <Text style={styles.walletText}>{money(cash)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Life After School" onPress={onClose} style={styles.exitButton}>
            <Text style={styles.exitText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.statusBar}>
          <StatusMeter label="HEALTH" value={health} color="#ef7272" styles={styles} />
          <StatusMeter label="ENERGY" value={energy} color="#f7b548" styles={styles} />
          <StatusMeter label="CAREER" value={career} color="#4fb6ff" styles={styles} />
          <StatusMeter label="PEOPLE" value={connections} color="#4fce98" styles={styles} />
        </View>

        <View style={styles.sceneHeader}>
          <View>
            <Text style={styles.sceneKicker}>
              {travelingTo ? 'ABUJA · IN TRANSIT' : arrivedPlace ? `ABUJA · ${arrivedPlace.category.toUpperCase()}` : cityMapOpen ? 'FCT · NIGERIA' : atNYSC ? 'SERVICE YEAR' : 'YOUR HOME'}
            </Text>
            <Text style={styles.sceneTitle}>
              {isSleeping ? 'Resting for the night'
                : travelingTo ? `Going to ${travelingTo.place.name}`
                  : arrivedPlace ? arrivedPlace.name
                    : cityMapOpen ? 'Explore Abuja'
                      : hospitalized ? 'Recovering in hospital'
                        : homeType === 'starter' ? 'Your one-room starter home'
                          : homeType === 'tech' ? 'Your technology home'
                            : homeType === 'abroad' ? 'Your home abroad'
                              : 'Your family home'}
            </Text>
          </View>
          <View style={styles.sceneHeaderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change character identity or appearance"
              onPress={() => {
                setPendingIdentity(genderIdentity ?? 'man');
                setPendingAppearance(characterAppearance);
                setIdentityPickerOpen(true);
              }}
              style={styles.buildButton}
            >
              <Text style={styles.buildButtonText}>CHARACTER</Text>
            </Pressable>
            {!cityMapOpen && !travelingTo && !arrivedPlace ? (
              <Pressable accessibilityRole="button" onPress={() => setBuildOpen(true)} style={styles.buildButton}>
                <Text style={styles.buildButtonText}>⌂  BUILD</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.world}>
          {travelingTo ? (
            <TransitScene
              styles={styles}
              place={travelingTo.place}
              ride={travelingTo.ride}
              appearance={characterAppearance}
            />
          ) : arrivedPlace ? (
            <CityPlaceScene
              styles={styles}
              place={arrivedPlace}
              appearance={characterAppearance}
              day={day}
              onActivity={(activity) => doPlaceActivity(arrivedPlace, activity)}
              onMap={leaveCityPlace}
            />
          ) : cityMapOpen ? (
            <AbujaMapScene
              styles={styles}
              places={abujaPlaces}
              selectedPlace={selectedPlace}
              onSelect={setSelectedPlace}
              onRide={startCityTrip}
              cash={cash}
            />
          ) : (
            <>
              <HouseInterior styles={styles} hospitalized={hospitalized} isSleeping={isSleeping} homeType={homeType} />
              {!hospitalized && !isSleeping ? (
                <>
                  <FurnitureTarget label="SLEEP" icon="🛏️" style={styles.bedTarget} onPress={() => selectFurniture('bed')} stylesProp={styles} />
                  <FurnitureTarget label="WORK" icon="🖥️" style={styles.deskTarget} onPress={workShift} stylesProp={styles} />
                  <FurnitureTarget label="RELAX" icon="🛋️" style={styles.sofaTarget} onPress={() => selectFurniture('sofa')} stylesProp={styles} />
                  <FurnitureTarget label="GO OUT" icon="🚪" style={styles.doorTarget} onPress={() => selectFurniture('door')} stylesProp={styles} />
                  {furniture.slice(-4).map((item, index) => (
                    <View key={`${item.name}-${index}`} style={[styles.boughtItem, { left: `${22 + index * 17}%` }]}>
                      <Text style={styles.boughtItemText}>{item.icon}</Text>
                    </View>
                  ))}
                  <Animated.View
                    accessibilityLabel={`Your character, ${genderIdentity ?? 'not selected'}`}
                    style={[
                      styles.avatar,
                      { left: `${position.x}%`, top: `${position.y}%` },
                      facing === 'left' && styles.avatarFacingLeft,
                    ]}
                  >
                    <CharacterSprite appearance={characterAppearance} walking={isWalking} styles={styles} />
                  </Animated.View>
                </>
              ) : isSleeping && !hospitalized ? (
                <View accessibilityLabel="Your character is asleep in bed" style={styles.sleepingFigure}>
                  <Svg height="100%" viewBox="0 0 160 70" width="100%">
                    <Ellipse cx="79" cy="57" fill="#443a34" opacity="0.16" rx="67" ry="7" />
                    <Ellipse cx="126" cy="37" fill="#fff8ec" rx="24" ry="16" />
                    <Path d="M30 40 Q39 24 62 27 L111 31 Q119 32 121 43 L117 53 L35 53 Z" fill="#d8bfa1" />
                    <Path d="M35 43 Q58 35 84 41 Q103 45 120 40 L117 55 L38 55 Z" fill="#8bb9d7" />
                    <Ellipse cx="108" cy="31" fill="#9a6044" rx="15" ry="14" />
                    {characterAppearance === 'woman' ? (
                      <>
                        <Circle cx="100" cy="23" fill="#34251f" r="9" />
                        <Circle cx="109" cy="19" fill="#34251f" r="10" />
                        <Circle cx="118" cy="23" fill="#34251f" r="9" />
                        <Circle cx="123" cy="31" fill="#34251f" r="8" />
                      </>
                    ) : (
                      <Path d="M94 29 Q93 15 106 15 Q119 15 122 28 L116 24 L98 24 Z" fill="#34251f" />
                    )}
                    <Path d="M101 32 Q104 30 107 32 M111 32 Q114 30 117 32" fill="none" stroke="#38251e" strokeLinecap="round" strokeWidth="1.5" />
                    <Path d="M107 38 Q111 41 115 38" fill="none" stroke="#713e36" strokeLinecap="round" strokeWidth="1.5" />
                    <Path d="M40 43 Q69 36 92 42 Q107 46 119 41 L117 56 L39 56 Z" fill="#a7cbe0" />
                    <Path d="M44 46 Q73 39 93 45" fill="none" opacity="0.75" stroke="#e9f5fb" strokeWidth="2" />
                  </Svg>
                  <Text style={styles.sleepingZ}>Zzz</Text>
                </View>
              ) : hospitalized ? (
                <View style={styles.hospitalNotice}>
                  <Text style={styles.hospitalIcon}>✚</Text>
                  <Text style={styles.hospitalTitle}>You are safe and receiving care</Text>
                  <Text style={styles.hospitalCopy}>No fatal outcomes. Get treatment or rest to recover.</Text>
                  <Pressable accessibilityRole="button" onPress={getTreatment} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>GET TREATMENT · {money(Math.min(cash, 12000))}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={sleep} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Rest another day</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.bottomDock}>
          {!hospitalized && !isSleeping ? (
            <View style={styles.movementPad}>
              <Pressable accessibilityRole="button" accessibilityLabel="Walk up" onPressIn={() => startWalking(0, -4)} onPressOut={stopWalking} style={[styles.moveKey, styles.moveUp]}>
                <Text style={styles.moveArrow}>▲</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Walk left" onPressIn={() => startWalking(-4, 0)} onPressOut={stopWalking} style={[styles.moveKey, styles.moveLeft]}>
                <Text style={styles.moveArrow}>◀</Text>
              </Pressable>
              <View style={styles.moveCenter} />
              <Pressable accessibilityRole="button" accessibilityLabel="Walk right" onPressIn={() => startWalking(4, 0)} onPressOut={stopWalking} style={[styles.moveKey, styles.moveRight]}>
                <Text style={styles.moveArrow}>▶</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Walk down" onPressIn={() => startWalking(0, 4)} onPressOut={stopWalking} style={[styles.moveKey, styles.moveDown]}>
                <Text style={styles.moveArrow}>▼</Text>
              </Pressable>
            </View>
          ) : <View style={styles.dockSpacer} />}

          <View style={styles.navigation}>
            {!isSleeping && !travelingTo ? <NavButton label="HOME" icon="⌂" selected={!cityMapOpen && !arrivedPlace && !phoneOpen && !buildOpen} onPress={() => { setCityMapOpen(false); setSelectedPlace(null); setArrivedPlace(null); setPhoneOpen(false); setBuildOpen(false); }} styles={styles} /> : null}
            {!hospitalized && !isSleeping && !travelingTo ? <NavButton label="MAP" icon="▤" selected={cityMapOpen} onPress={() => { setCityMapOpen(true); setArrivedPlace(null); setPhoneOpen(false); setBuildOpen(false); }} styles={styles} /> : null}
            {!hospitalized && !isSleeping && !cityMapOpen && !arrivedPlace && !travelingTo ? <NavButton label="PHONE" icon="▣" selected={phoneOpen} onPress={() => { setPhoneOpen((open) => !open); setBuildOpen(false); }} styles={styles} /> : null}
            {!hospitalized && !isSleeping && !cityMapOpen && !arrivedPlace && !travelingTo ? <NavButton label="BUILD" icon="▦" selected={buildOpen} onPress={() => { setBuildOpen((open) => !open); setPhoneOpen(false); }} styles={styles} /> : null}
            {isSleeping ? <NavButton label="WAKE" icon="☀" selected={false} onPress={wakeUp} styles={styles} /> : null}
            {!isSleeping && !hospitalized && !cityMapOpen && !arrivedPlace && !travelingTo ? <NavButton label="SLEEP" icon="☾" selected={false} onPress={sleep} styles={styles} /> : null}
            {arrivedPlace && !hospitalized ? <NavButton label="MAP" icon="▤" selected={false} onPress={leaveCityPlace} styles={styles} /> : null}
            {travelingTo ? <Text style={styles.sleepingStatus}>ON THE WAY…</Text> : null}
          </View>
        </View>

        <View accessibilityLiveRegion="polite" style={styles.noticeBar}>
          <View style={styles.noticeDot} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text numberOfLines={2} style={styles.noticeMessage}>{notice.message}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setNotice({ title: 'Your next chapter', message: 'Tap furniture or open your phone to choose what to do.' })} style={styles.dismissNotice}>
            <Text style={styles.dismissText}>⌄</Text>
          </Pressable>
        </View>

        {identityStorageError ? (
          <Text accessibilityRole="alert" style={styles.identityError}>{identityStorageError}</Text>
        ) : null}

        {identityLoaded && identityPickerOpen ? (
          <CharacterPicker
            styles={styles}
            identity={pendingIdentity}
            appearance={pendingAppearance}
            onIdentity={setPendingIdentity}
            onAppearance={setPendingAppearance}
            onSave={saveCharacter}
            error={identityStorageError}
          />
        ) : null}

        {phoneOpen && !isSleeping && !cityMapOpen && !arrivedPlace ? (
          <PhonePanel
            styles={styles}
            page={phonePage}
            setPage={setPhonePage}
            onClose={() => setPhoneOpen(false)}
            onCallFamily={callFamily}
            onWork={workShift}
            onChooseJob={takeJob}
            onNYSC={joinNYSC}
            onTravel={travel}
            onCommunity={visitCommunity}
            job={job}
            workedToday={workedToday}
            calledFamilyToday={calledFamilyToday}
            didNYSC={didNYSC}
            cash={cash}
            career={career}
            careerRank={careerRank.name}
            nextCareerRank={nextCareerRank}
          />
        ) : null}

        {buildOpen ? (
          <BuildPanel
            styles={styles}
            furniture={furniture}
            onClose={() => setBuildOpen(false)}
            onBuy={buyFurniture}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function CharacterSprite({
  appearance,
  walking,
  styles,
}: {
  appearance: CharacterAppearance;
  walking: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    motion.stopAnimation();
    motion.setValue(0);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, {
        toValue: 1,
        duration: walking ? 170 : 850,
        useNativeDriver: true,
      }),
      Animated.timing(motion, {
        toValue: 0,
        duration: walking ? 170 : 850,
        useNativeDriver: true,
      }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [motion, walking]);

  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: walking ? [0, -3] : [0, -1],
  });
  const rotate = motion.interpolate({
    inputRange: [0, 1],
    outputRange: walking ? ['-2deg', '2deg'] : ['-0.3deg', '0.3deg'],
  });

  return (
    <Animated.View style={[styles.characterSpriteMotion, { transform: [{ translateY }, { rotate }] }]}>
      <Image
        accessibilityLabel={`${appearance} character`}
        resizeMode="contain"
        source={characterAssets[appearance]}
        style={styles.characterSprite}
      />
    </Animated.View>
  );
}

function HouseInterior({ styles, hospitalized, isSleeping, homeType }: {
  styles: ReturnType<typeof createStyles>;
  hospitalized: boolean;
  isSleeping: boolean;
  homeType: HomeType;
}) {
  if (!hospitalized && !isSleeping && homeType !== 'starter') {
    const homeName = homeType === 'tech'
      ? 'Technology home and workspace'
      : homeType === 'abroad'
        ? 'Three-storey home abroad'
        : 'Village family home';
    return (
      <View style={styles.interior}>
        <Image
          accessibilityLabel={homeName}
          resizeMode="contain"
          source={homeAssets[homeType]}
          style={styles.houseReferenceImage}
        />
        <Text style={styles.houseReferenceLabel}>{homeName}</Text>
      </View>
    );
  }
  if (!hospitalized && homeType === 'starter') {
    return <StarterRoom styles={styles} />;
  }

  return (
    <View style={styles.interior}>
      <Svg height="100%" preserveAspectRatio="xMidYMid meet" viewBox="0 0 800 600" width="100%">
        <Rect fill={hospitalized ? '#dce8f1' : '#dce9e7'} height="600" width="800" />
        {hospitalized ? (
          <>
            <Ellipse cx="400" cy="450" fill="#8399a2" opacity="0.14" rx="260" ry="66" />
            <Polygon fill="#eaf0f5" points="130,280 400,132 675,280 400,438" />
            <Polygon fill="#c5d5df" points="130,280 400,438 400,490 130,332" />
            <Polygon fill="#b9ccda" points="400,438 675,280 675,332 400,490" />
            <Rect fill="#91c3d7" height="66" rx="8" width="112" x="166" y="202" />
            <Rect fill="#eaf5f8" height="8" rx="4" width="120" x="162" y="269" />
            <Polygon fill="#f4f7fa" points="296,304 422,235 545,302 418,373" />
            <Polygon fill="#79afd2" points="296,304 418,373 418,405 296,336" />
            <Polygon fill="#e8f2f7" points="418,373 545,302 545,334 418,405" />
            <Ellipse cx="422" cy="236" fill="#fff" opacity="0.56" rx="62" ry="22" />
          </>
        ) : (
          <>
            <Ellipse cx="400" cy="467" fill="#56645b" opacity="0.14" rx="280" ry="66" />
            <Polygon fill="#315c2d" points="88,294 400,128 400,50 88,216" />
            <Polygon fill="#5d8747" points="400,128 714,294 714,216 400,50" />
            <Polygon fill="#89a86b" points="88,216 400,50 400,60 94,223" />
            <Polygon fill="#75995b" points="400,50 714,216 708,224 400,60" />
            <Polygon fill="#eadfcf" points="88,294 400,128 714,294 400,474" />
            <Polygon fill="#f6eddf" points="106,284 400,126 400,164 121,314" />
            <Polygon fill="#e4ebdf" points="400,126 694,284 676,314 400,164" />
            <Polygon fill="#e9dac2" points="106,284 400,444 400,474 106,314" />
            <Polygon fill="#ddceb8" points="400,444 694,284 694,314 400,474" />
            <Polygon fill="#a9b98f" points="88,294 400,128 400,143 102,301" />
            <Polygon fill="#93a77a" points="400,128 714,294 698,303 400,143" />

            <Polygon fill="#f5eee4" points="402,164 665,304 402,451" />
            <Polygon fill="#e9ddcb" points="130,301 400,158 400,451" />
            <Polygon fill="#eadbc5" points="402,164 665,304 402,451" />
            <Line stroke="#c8baa6" strokeWidth="3" x1="400" x2="400" y1="162" y2="445" />
            <Line stroke="#c8baa6" strokeWidth="3" x1="130" x2="666" y1="305" y2="305" />
            <Line stroke="#d2c4b1" strokeWidth="1.5" x1="265" x2="400" y1="232" y2="305" />
            <Line stroke="#d2c4b1" strokeWidth="1.5" x1="535" x2="400" y1="232" y2="305" />
            <Line stroke="#d2c4b1" strokeWidth="1.5" x1="265" x2="400" y1="378" y2="305" />
            <Line stroke="#d2c4b1" strokeWidth="1.5" x1="535" x2="400" y1="378" y2="305" />
            <Line stroke="#c5b7a3" strokeWidth="2" x1="197" x2="503" y1="270" y2="432" />
            <Line stroke="#c5b7a3" strokeWidth="2" x1="603" x2="297" y1="270" y2="432" />
            <Line stroke="#d5c7b3" strokeWidth="1.5" x1="266" x2="536" y1="233" y2="376" />
            <Line stroke="#d5c7b3" strokeWidth="1.5" x1="535" x2="266" y1="233" y2="376" />
            <Polygon fill="#355f2f" points="318,324 400,367 400,387 318,344" />
            <Polygon fill="#294f28" points="400,367 482,324 482,344 400,387" />

            <Rect fill="#bed7dd" height="67" rx="5" width="94" x="508" y="180" />
            <Rect fill="#fffaf1" height="58" rx="3" width="84" x="513" y="184" />
            <Line stroke="#8faab2" strokeWidth="3" x1="555" x2="555" y1="185" y2="239" />
            <Line stroke="#8faab2" strokeWidth="3" x1="514" x2="597" y1="212" y2="212" />
            <Rect fill="#a8b984" height="58" rx="3" width="10" x="506" y="184" />
            <Rect fill="#a8b984" height="58" rx="3" width="10" x="596" y="184" />

            <Polygon fill="#c3b8a9" points="458,242 548,194 633,239 543,289" />
            <Polygon fill="#7799a5" points="463,237 548,192 627,234 542,280" />
            <Polygon fill="#8aabb6" points="463,237 542,280 542,291 463,248" />
            <Polygon fill="#668895" points="542,280 627,234 627,245 542,291" />
            <Polygon fill="#faf7ef" points="475,236 504,220 528,232 499,249" />
            <Polygon fill="#faf7ef" points="511,217 540,201 564,214 535,230" />
            <Polygon fill="#afcbd0" points="482,251 545,217 615,254 552,289" />
            <Line stroke="#dce9e9" strokeWidth="3" x1="513" x2="578" y1="260" y2="225" />

            <Polygon fill="#849b7e" points="143,301 253,243 354,297 244,358" />
            <Polygon fill="#526f61" points="143,301 244,358 244,368 143,311" />
            <Polygon fill="#688375" points="244,358 354,297 354,308 244,368" />
            <Polygon fill="#a9bfaa" points="158,298 252,249 339,296 245,346" />
            <Polygon fill="#8ca38e" points="166,292 250,248 275,261 190,307" />
            <Polygon fill="#8ca38e" points="222,321 307,276 332,289 247,335" />

            <Polygon fill="#dbc9a8" points="200,357 288,310 356,346 268,394" />
            <Ellipse cx="278" cy="351" fill="#f8f0df" rx="51" ry="20" />
            <Line stroke="#8a735b" strokeWidth="6" x1="278" x2="278" y1="353" y2="384" />
            <Ellipse cx="278" cy="385" fill="#9f866b" rx="28" ry="9" />
            <Ellipse cx="278" cy="346" fill="#f9f6ed" rx="7" ry="3.5" />

            <Polygon fill="#d7b68a" points="458,354 525,319 583,351 516,388" />
            <Polygon fill="#b7956d" points="466,355 525,324 573,351 516,378" />
            <Line stroke="#8a735b" strokeWidth="5" x1="484" x2="480" y1="366" y2="397" />
            <Line stroke="#8a735b" strokeWidth="5" x1="550" x2="554" y1="365" y2="395" />
            <Rect fill="#74604d" height="13" rx="2" width="7" x="542" y="310" />
            <Rect fill="#a4b47e" height="24" rx="5" width="16" x="538" y="288" />

            <Ellipse cx="367" cy="405" fill="#d6c8ac" opacity="0.72" rx="38" ry="20" />
            <Line stroke="#887862" strokeWidth="3" x1="354" x2="354" y1="405" y2="423" />
            <Line stroke="#887862" strokeWidth="3" x1="380" x2="380" y1="405" y2="423" />
            <Ellipse cx="367" cy="402" fill="#f5eee2" rx="27" ry="14" />
            <Circle fill="#e6b566" cx="367" cy="398" r="4" />

            <Ellipse cx="620" cy="343" fill="#73865c" rx="12" ry="6" />
            <Rect fill="#927458" height="24" rx="2" width="6" x="617" y="321" />
            <Ellipse cx="620" cy="320" fill="#5e976c" rx="18" ry="9" />
            <Ellipse cx="608" cy="313" fill="#6da675" rx="10" ry="7" />
            <Ellipse cx="629" cy="309" fill="#7eae7c" rx="11" ry="7" />
            <Ellipse cx="620" cy="302" fill="#8cba83" rx="9" ry="8" />
          </>
        )}
      </Svg>
      {!hospitalized && !isSleeping ? (
        <>
          <Text pointerEvents="none" style={[styles.roomLabel, { left: '19%', top: '38%' }]}>LIVING</Text>
          <Text pointerEvents="none" style={[styles.roomLabel, { left: '64%', top: '30%' }]}>BEDROOM</Text>
          <Text pointerEvents="none" style={[styles.roomLabel, { left: '69%', top: '61%' }]}>STUDY</Text>
          <Text pointerEvents="none" style={[styles.roomLabel, { left: '36%', top: '68%' }]}>KITCHEN</Text>
        </>
      ) : (
        <Text pointerEvents="none" style={[styles.roomLabel, { left: '43%', top: '50%' }]}>HOSPITAL WARD</Text>
      )}
    </View>
  );
}

function StarterRoom({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View accessibilityLabel="Modest one-room starter home" style={styles.interior}>
      <Svg height="100%" preserveAspectRatio="xMidYMid meet" viewBox="0 0 800 600" width="100%">
        <Rect fill="#dce7e6" height="600" width="800" />
        <Polygon fill="#557260" points="112,248 400,88 690,248 400,416" />
        <Polygon fill="#708973" points="112,248 400,416 400,449 112,282" />
        <Polygon fill="#617c69" points="400,416 690,248 690,282 400,449" />
        <Polygon fill="#c8ad88" points="112,282 400,449 400,550 112,383" />
        <Polygon fill="#b99a73" points="400,449 690,282 690,383 400,550" />
        <Polygon fill="#eee4d3" points="112,248 400,88 400,416 112,248" />
        <Polygon fill="#f4ead9" points="400,88 690,248 400,416 400,88" />
        <Rect fill="#9bbec0" height="93" rx="4" width="106" x="465" y="151" />
        <Rect fill="#edf4ec" height="78" rx="3" width="89" x="474" y="158" />
        <Line stroke="#91a7a1" strokeWidth="3" x1="519" x2="519" y1="159" y2="236" />
        <Line stroke="#91a7a1" strokeWidth="3" x1="475" x2="561" y1="197" y2="197" />
        <Polygon fill="#866c59" points="194,320 313,256 424,316 304,382" />
        <Polygon fill="#6d594b" points="194,320 304,382 304,401 194,339" />
        <Polygon fill="#5c4a3f" points="304,382 424,316 424,335 304,401" />
        <Polygon fill="#e5dbc7" points="203,316 312,258 413,313 304,370" />
        <Polygon fill="#c5d1c9" points="218,311 306,265 379,305 292,352" />
        <Polygon fill="#6c533d" points="471,350 572,295 632,327 531,383" />
        <Polygon fill="#544333" points="471,350 531,383 531,395 471,362" />
        <Polygon fill="#624b38" points="531,383 632,327 632,339 531,395" />
        <Polygon fill="#a7835c" points="483,348 573,299 619,324 530,374" />
        <Line stroke="#755b42" strokeWidth="5" x1="502" x2="502" y1="359" y2="397" />
        <Line stroke="#755b42" strokeWidth="5" x1="601" x2="601" y1="337" y2="375" />
        <Rect fill="#876b4c" height="77" rx="3" width="54" x="135" y="220" />
        <Rect fill="#d1b389" height="66" rx="2" width="44" x="140" y="225" />
        <Rect fill="#5d7470" height="20" rx="3" width="79" x="454" y="277" />
        <Rect fill="#37494a" height="6" rx="2" width="79" x="454" y="296" />
        <Ellipse cx="400" cy="522" fill="#415348" opacity="0.16" rx="220" ry="25" />
      </Svg>
      <Text style={styles.houseReferenceLabel}>A simple room to start your next chapter</Text>
    </View>
  );
}

function CharacterPicker({
  styles,
  identity,
  appearance,
  onIdentity,
  onAppearance,
  onSave,
  error,
}: {
  styles: ReturnType<typeof createStyles>;
  identity: GenderIdentity;
  appearance: CharacterAppearance;
  onIdentity: (identity: GenderIdentity) => void;
  onAppearance: (appearance: CharacterAppearance) => void;
  onSave: () => void;
  error: string | null;
}) {
  const identityOptions: { value: GenderIdentity; label: string }[] = [
    { value: 'woman', label: 'Woman' },
    { value: 'man', label: 'Man' },
    { value: 'non-binary', label: 'Non-binary' },
  ];
  const appearanceOptions: { value: CharacterAppearance; label: string }[] = [
    { value: 'woman', label: 'Woman character' },
    { value: 'man', label: 'Man character' },
  ];

  return (
    <View accessibilityViewIsModal style={styles.panelBackdrop}>
      <View style={styles.identityCard}>
        <Text style={styles.identityTitle}>Create your character</Text>
        <Text style={styles.identityCopy}>Choose how you identify and the character you want to play. You can change these choices later.</Text>
        <Text style={styles.identityGroupLabel}>I identify as</Text>
        <View style={styles.identityOptions}>
          {identityOptions.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: identity === option.value }}
              onPress={() => onIdentity(option.value)}
              style={[styles.identityOption, identity === option.value && styles.identityOptionSelected]}
            >
              <Text style={[styles.identityOptionText, identity === option.value && styles.identityOptionTextSelected]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.identityGroupLabel}>Character appearance</Text>
        <View style={styles.identityOptions}>
          {appearanceOptions.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: appearance === option.value }}
              onPress={() => onAppearance(option.value)}
              style={[styles.identityOption, appearance === option.value && styles.identityOptionSelected]}
            >
              <Text style={[styles.identityOptionText, appearance === option.value && styles.identityOptionTextSelected]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.identityError}>{error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={onSave} style={styles.identitySaveButton}>
          <Text style={styles.identitySaveText}>SAVE CHARACTER</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AbujaMapScene({
  styles,
  places,
  selectedPlace,
  onSelect,
  onRide,
  cash,
}: {
  styles: ReturnType<typeof createStyles>;
  places: CityPlace[];
  selectedPlace: CityPlace | null;
  onSelect: (place: CityPlace) => void;
  onRide: (place: CityPlace, ride: RideOption) => void;
  cash: number;
}) {
  const [selectedRide, setSelectedRide] = useState<RideOption>(rideOptions[0]);
  const fare = selectedPlace
    ? selectedRide.baseFare + Math.ceil(selectedPlace.distanceKm * selectedRide.farePerKm / 100) * 100
    : 0;

  return (
    <View style={styles.mapScene}>
      <View accessibilityLabel="Interactive map of Abuja" style={styles.mapCanvas}>
        <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 800 500" width="100%">
          <Rect fill="#b8d8c1" height="500" width="800" />
          <Path d="M-20 92 C165 155 232 15 421 76 S652 146 830 36" fill="none" stroke="#d6d1b7" strokeWidth="38" />
          <Path d="M-15 306 C154 233 278 375 419 284 S661 228 820 352" fill="none" stroke="#d6d1b7" strokeWidth="33" />
          <Path d="M160 -10 C210 126 120 193 257 304 S336 431 305 520" fill="none" stroke="#d6d1b7" strokeWidth="27" />
          <Path d="M583 -15 C517 109 660 192 539 300 S563 407 614 518" fill="none" stroke="#d6d1b7" strokeWidth="31" />
          <Path d="M-20 92 C165 155 232 15 421 76 S652 146 830 36" fill="none" stroke="#fff7de" strokeWidth="4" />
          <Path d="M-15 306 C154 233 278 375 419 284 S661 228 820 352" fill="none" stroke="#fff7de" strokeWidth="4" />
          <Ellipse cx="700" cy="118" fill="#7bc7d3" opacity="0.78" rx="80" ry="50" />
          <Ellipse cx="85" cy="402" fill="#7da878" opacity="0.55" rx="118" ry="70" />
          <Ellipse cx="405" cy="180" fill="#c6d8a3" opacity="0.48" rx="88" ry="47" />
        </Svg>
        {places.map((place) => (
          <Pressable
            key={place.name}
            accessibilityRole="button"
            accessibilityLabel={`Select ${place.name}`}
            accessibilityState={{ selected: selectedPlace?.name === place.name }}
            onPress={() => onSelect(place)}
            style={[styles.mapPlace, { left: `${place.x}%`, top: `${place.y}%` }, selectedPlace?.name === place.name && styles.mapPlaceSelected]}
          >
            <Text style={styles.mapPlaceIcon}>{place.icon}</Text>
            <Text numberOfLines={1} style={styles.mapPlaceLabel}>{place.name}</Text>
          </Pressable>
        ))}
      </View>
      {selectedPlace ? (
        <View style={styles.mapCard}>
          <View style={styles.mapCardTop}>
            <View style={styles.mapCardCopy}>
              <Text style={styles.mapCardTitle}>{selectedPlace.icon} {selectedPlace.name}</Text>
              <Text numberOfLines={2} style={styles.mapCardDescription}>{selectedPlace.description}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close place details" onPress={() => onSelect(selectedPlace)} style={styles.mapCardClose}>
              <Text style={styles.mapCardCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapRideRow}>
            {rideOptions.map((ride) => {
              const rideFare = ride.baseFare + Math.ceil(selectedPlace.distanceKm * ride.farePerKm / 100) * 100;
              const isSelected = selectedRide.name === ride.name;
              return (
                <Pressable
                  key={ride.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedRide(ride)}
                  style={[styles.mapRideOption, isSelected && styles.mapRideOptionSelected]}
                >
                  <Text style={styles.mapRideIcon}>{ride.icon}</Text>
                  <Text style={styles.mapRideName}>{ride.name}</Text>
                  <Text style={styles.mapRidePrice}>{money(rideFare)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => onRide(selectedPlace, selectedRide)} style={[styles.mapGoButton, cash < fare && styles.mapGoButtonDisabled]}>
            <Text style={styles.mapGoText}>{cash < fare ? `NEED ${money(fare)} FOR RIDE` : `GO THERE · ${selectedRide.duration}`}</Text>
          </Pressable>
        </View>
      ) : (
        <View pointerEvents="none" style={styles.mapInstruction}>
          <Text style={styles.mapInstructionText}>Tap a place to see what is there and choose how to travel.</Text>
        </View>
      )}
    </View>
  );
}

function CityPlaceScene({
  styles,
  place,
  appearance,
  day,
  onActivity,
  onMap,
}: {
  styles: ReturnType<typeof createStyles>;
  place: CityPlace;
  appearance: CharacterAppearance;
  day: number;
  onActivity: (activity: string) => void;
  onMap: () => void;
}) {
  const sceneColor = place.category === 'lake' || place.category === 'spa'
    ? '#c6e3dc'
    : place.category === 'gym' || place.category === 'park'
      ? '#d1e1c2'
      : place.category === 'school' || place.category === 'tech'
        ? '#d4e0ed'
        : '#eadcc9';

  return (
    <View style={styles.placeScene}>
      <View style={[styles.placeBackdrop, { backgroundColor: sceneColor }]}>
        <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 800 500" width="100%">
          <Rect fill="rgba(255,255,255,0.22)" height="500" width="800" />
          <Path d="M0 355 L800 355 L800 500 L0 500 Z" fill="rgba(83,102,84,0.18)" />
          <Path d="M40 130 L140 45 L240 130 V355 H40 Z" fill="rgba(255,255,255,0.23)" />
          <Path d="M580 134 L677 57 L775 134 V355 H580 Z" fill="rgba(255,255,255,0.2)" />
          <Line stroke="rgba(255,255,255,0.34)" strokeWidth="3" x1="140" x2="140" y1="130" y2="354" />
          <Line stroke="rgba(255,255,255,0.34)" strokeWidth="3" x1="678" x2="678" y1="130" y2="354" />
          <Ellipse cx="403" cy="403" fill="rgba(38,53,43,0.18)" rx="180" ry="28" />
        </Svg>
        <Text style={styles.placeIcon}>{place.icon}</Text>
        <View style={styles.placeCrowd}>
          {[0, 1, 2].map((person) => (
            <View key={`${place.name}-${person}`} style={styles.placePerson}>
              <Text style={styles.placePersonEmoji}>{['🧑🏾', '👩🏽', '🧑🏿'][(person + day) % 3]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.placePlayer}>
          <Image accessibilityLabel={`Your ${appearance} character`} resizeMode="contain" source={characterAssets[appearance]} style={styles.placePlayerImage} />
        </View>
      </View>
      <View style={styles.placeSceneCard}>
        <View style={styles.placeCardHeader}>
          <View style={styles.placeSceneCopy}>
            <Text style={styles.placeSceneTitle}>{place.name}</Text>
            <Text numberOfLines={2} style={styles.placeSceneDescription}>{place.description}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onMap} style={styles.mapCardClose}>
            <Text style={styles.mapCardCloseText}>×</Text>
          </Pressable>
        </View>
        <Text style={styles.placePeopleTitle}>AROUND YOU</Text>
        <Text numberOfLines={1} style={styles.placeSceneDescription}>{place.people[(day + place.name.length) % place.people.length]}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeActivities}>
          {place.activities.map((activity) => (
            <Pressable key={activity} accessibilityRole="button" onPress={() => onActivity(activity)} style={styles.placeActivityButton}>
              <Text style={styles.placeActivityText}>{activity}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function TransitScene({
  styles,
  place,
  ride,
  appearance,
}: {
  styles: ReturnType<typeof createStyles>;
  place: CityPlace;
  ride: RideOption;
  appearance: CharacterAppearance;
}) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 950, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [motion]);
  const translateX = motion.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });

  return (
    <View style={styles.transitScene}>
      <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 800 500" width="100%">
        <Rect fill="#94c6db" height="500" width="800" />
        <Circle cx="690" cy="79" fill="#ffe39b" r="35" />
        <Path d="M0 225 L105 145 L190 225 Z M145 222 L272 112 L400 222 Z M490 224 L610 139 L720 224 Z" fill="#8aada4" />
        <Path d="M0 275 L800 275 L800 500 L0 500 Z" fill="#40535e" />
        <Path d="M0 290 L800 290" stroke="#e6e1c7" strokeWidth="3" />
        <Path d="M0 436 L800 436" stroke="#e6e1c7" strokeWidth="3" />
        <Path d="M36 365 L155 365 M277 365 L395 365 M530 365 L650 365 M710 365 L790 365" stroke="#fff0bb" strokeLinecap="round" strokeWidth="9" />
        <Rect fill="#657b68" height="120" width="800" y="0" />
        <Path d="M0 180 L800 180" stroke="rgba(255,255,255,0.17)" strokeWidth="2" />
      </Svg>
      <Animated.View style={[styles.transitVehicle, { transform: [{ translateX }] }]}>
        <Text style={styles.transitRideIcon}>{ride.icon}</Text>
        <View style={styles.transitPassenger}>
          <Image accessibilityLabel={`${appearance} passenger`} resizeMode="contain" source={characterAssets[appearance]} style={styles.transitCharacterImage} />
        </View>
      </Animated.View>
      <View style={styles.transitCaption}>
        <Text style={styles.transitTitle}>On the way to {place.name}</Text>
        <Text style={styles.transitDescription}>{ride.name} · Abuja traffic · Arriving shortly</Text>
      </View>
    </View>
  );
}

function FurnitureTarget({
  icon,
  label,
  style,
  onPress,
  stylesProp,
}: {
  icon: string;
  label: string;
  style: object;
  onPress: () => void;
  stylesProp: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Interact with ${label.toLowerCase()}`} onPress={onPress} style={[stylesProp.furnitureTarget, style]}>
      <Text style={stylesProp.furnitureIcon}>{icon}</Text>
      <Text style={stylesProp.furnitureLabel}>{label}</Text>
    </Pressable>
  );
}

function StatusMeter({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: number;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.meter}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{value}</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { backgroundColor: color, width: `${value}%` }]} />
      </View>
    </View>
  );
}

function NavButton({
  label,
  icon,
  selected,
  onPress,
  styles,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.navButton, selected && styles.navButtonSelected]}>
      <Text style={[styles.navIcon, selected && styles.navTextSelected]}>{icon}</Text>
      <Text style={[styles.navLabel, selected && styles.navTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function PhonePanel({
  styles,
  page,
  setPage,
  onClose,
  onCallFamily,
  onWork,
  onChooseJob,
  onNYSC,
  onTravel,
  onCommunity,
  job,
  workedToday,
  calledFamilyToday,
  didNYSC,
  cash,
  career,
  careerRank,
  nextCareerRank,
}: {
  styles: ReturnType<typeof createStyles>;
  page: PhonePage;
  setPage: (page: PhonePage) => void;
  onClose: () => void;
  onCallFamily: () => void;
  onWork: () => void;
  onChooseJob: (job: (typeof jobs)[number]) => void;
  onNYSC: () => void;
  onTravel: (destination: (typeof trips)[number]) => void;
  onCommunity: (place: 'church' | 'healer' | 'nightlife') => void;
  job: (typeof jobs)[number] | null;
  workedToday: boolean;
  calledFamilyToday: boolean;
  didNYSC: boolean;
  cash: number;
  career: number;
  careerRank: string;
  nextCareerRank: (typeof careerRanks)[number] | undefined;
}) {
  const pageTitles: Record<Exclude<PhonePage, 'home'>, string> = {
    messages: 'Messages',
    jobs: 'Jobs & work',
    nysc: 'NYSC',
    travel: 'Travel',
    community: 'Community',
  };

  return (
    <View style={styles.panelBackdrop}>
      <View style={styles.phonePanel}>
        <View style={styles.phoneScreen}>
          <View style={styles.phoneStatusBar}>
            <Text style={styles.phoneTime}>4:22 PM</Text>
            <View style={styles.phoneStatusSpacer} />
            <Text style={styles.phoneSignal}>●●● 4G ▰</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close phone" onPress={onClose} style={styles.phoneClose}>
              <Text style={styles.phoneCloseText}>×</Text>
            </Pressable>
          </View>
          <View pointerEvents="none" style={styles.phoneNotch} />
          {page === 'home' ? (
            <ScrollView contentContainerStyle={styles.phoneLauncherContent} showsVerticalScrollIndicator={false} style={styles.phoneScroll}>
              <Pressable accessibilityRole="button" onPress={() => setPage('community')} style={styles.nightModePill}>
                <Text style={styles.nightModeText}>🌙  Night mode</Text>
              </Pressable>
              <View style={styles.phonePromo}>
                <View style={styles.phonePromoIcon}><Text style={styles.phonePromoEmoji}>💌</Text></View>
                <View style={styles.phonePromoCopy}>
                  <Text style={styles.phonePromoTitle}>A message from home</Text>
                  <Text style={styles.phonePromoBody}>Your family is always a call away.</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setPage('messages')} style={styles.phonePromoAction}>
                  <Text style={styles.phonePromoActionText}>Open ›</Text>
                </Pressable>
              </View>
              <View style={styles.phoneAppsGrid}>
                {phoneApps.map((app) => (
                  <AppShortcut
                    key={app.name}
                    label={app.name}
                    icon={app.icon}
                    color={app.color}
                    onPress={() => setPage(app.page)}
                    styles={styles}
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={styles.phonePageHeader}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back to phone apps" onPress={() => setPage('home')} style={styles.phoneBack}>
                  <Text style={styles.phoneBackText}>‹</Text>
                </Pressable>
                <Text style={styles.phonePageTitle}>{pageTitles[page]}</Text>
                <View style={styles.phoneHeaderSpacer} />
              </View>
              <ScrollView contentContainerStyle={styles.phoneContent} showsVerticalScrollIndicator={false} style={styles.phoneScroll}>
                {page === 'messages' ? (
                  <>
                    <Text style={styles.panelHeading}>Mum & Dad</Text>
                    <Text style={styles.panelDescription}>A little support from home can make a big difference.</Text>
                    <ActionTile title={calledFamilyToday ? 'You spoke with your parents today' : 'Call your parents'} detail={calledFamilyToday ? 'Call again tomorrow' : `Ask for support · ${money(35000)}`} icon="📞" onPress={onCallFamily} styles={styles} />
                  </>
                ) : null}
                {page === 'jobs' ? (
                  <>
                    <Text style={styles.panelHeading}>Find work</Text>
                    <Text style={styles.panelDescription}>{job ? `Current job: ${job.name}. Work from your desk at home.` : 'Choose a first job. Shifts earn money and build career skills.'}</Text>
                    <View style={styles.careerSummary}>
                      <View style={styles.careerSummaryHeader}>
                        <Text style={styles.careerSummaryRank}>{careerRank}</Text>
                        <Text style={styles.careerSummaryPoints}>Career {career}/100</Text>
                      </View>
                      <View style={styles.careerProgressTrack}>
                        <View style={[styles.careerProgressFill, { width: `${career}%` }]} />
                      </View>
                      <Text style={styles.careerSummaryNext}>
                        {nextCareerRank
                          ? `${nextCareerRank.minCareer - career} points to ${nextCareerRank.name}`
                          : 'Highest career rank reached'}
                      </Text>
                    </View>
                    {jobs.map((item) => (
                      <ActionTile
                        key={item.name}
                        title={`${job?.name === item.name ? 'Current · ' : ''}${item.name}`}
                        detail={career < item.minCareer
                          ? `Unlock at career ${item.minCareer} · ${money(item.pay)} per shift`
                          : `${money(item.pay)} per shift · ${item.skill} skills`}
                        icon="💼"
                        onPress={() => onChooseJob(item)}
                        styles={styles}
                        disabled={career < item.minCareer}
                      />
                    ))}
                    {job ? <ActionTile title={workedToday ? 'Shift completed today' : 'Work a shift'} detail={workedToday ? 'Sleep to begin a new day' : `${money(job.pay)} · visit your desk any time`} icon="🖥️" onPress={onWork} styles={styles} /> : null}
                  </>
                ) : null}
                {page === 'nysc' ? (
                  <>
                    <Text style={styles.panelHeading}>National Youth Service</Text>
                    <Text style={styles.panelDescription}>Join camp, meet new people, gain experience, and receive a simulated allowance.</Text>
                    <ActionTile title={didNYSC ? 'Service year completed' : 'Begin NYSC camp'} detail={didNYSC ? 'You have completed your service in this story' : `Camp experience · allowance ${money(77000)}`} icon="🎓" onPress={onNYSC} styles={styles} />
                  </>
                ) : null}
                {page === 'travel' ? (
                  <>
                    <Text style={styles.panelHeading}>Choose your next place</Text>
                    <Text style={styles.panelDescription}>Travel changes where your story takes you. Current balance: {money(cash)}.</Text>
                    {trips.map((destination) => (
                      <ActionTile key={destination.name} title={destination.name} detail={destination.price === 0 ? 'Return to your hometown' : `Travel fare · ${money(destination.price)}`} icon="🧳" onPress={() => onTravel(destination)} styles={styles} />
                    ))}
                  </>
                ) : null}
                {page === 'community' ? (
                  <>
                    <Text style={styles.panelHeading}>People and community</Text>
                    <Text style={styles.panelDescription}>Choose what feels right for your character today.</Text>
                    <ActionTile title="Visit church" detail="Reflection and community" icon="⛪" onPress={() => onCommunity('church')} styles={styles} />
                    <ActionTile title="Visit a traditional healer" detail="A cultural visit; medical care is at the hospital" icon="🌿" onPress={() => onCommunity('healer')} styles={styles} />
                    <ActionTile title="Go out tonight" detail="A general nightlife and companionship activity" icon="🎉" onPress={() => onCommunity('nightlife')} styles={styles} />
                  </>
                ) : null}
              </ScrollView>
            </>
          )}
          <View style={styles.phoneDock}>
            <Pressable accessibilityRole="button" onPress={() => setPage('home')} style={styles.phoneDockItem}>
              <Text style={styles.phoneDockIcon}>⌂</Text><Text style={styles.phoneDockLabel}>Home</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPage('messages')} style={styles.phoneDockItem}>
              <Text style={styles.phoneDockIcon}>💬</Text><Text style={styles.phoneDockLabel}>Messages</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPage('jobs')} style={styles.phoneDockItem}>
              <Text style={styles.phoneDockIcon}>💼</Text><Text style={styles.phoneDockLabel}>Jobs</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPage('travel')} style={styles.phoneDockItem}>
              <Text style={styles.phoneDockIcon}>🧳</Text><Text style={styles.phoneDockLabel}>Travel</Text>
            </Pressable>
          </View>
          <View style={styles.phoneHomeIndicator} />
        </View>
      </View>
    </View>
  );
}

function BuildPanel({
  styles,
  furniture,
  onClose,
  onBuy,
}: {
  styles: ReturnType<typeof createStyles>;
  furniture: Furniture[];
  onClose: () => void;
  onBuy: (item: Furniture) => void;
}) {
  return (
    <View style={styles.panelBackdrop}>
      <View style={styles.buildPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.buildHeading}>Make this place yours</Text>
            <Text style={styles.buildDescription}>Add something new to your home.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close build catalogue" onPress={onClose} style={styles.buildPanelClose}>
            <Text style={styles.buildPanelCloseText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.catalogGrid}>
          {furnitureCatalog.map((item) => (
            <Pressable key={item.name} accessibilityRole="button" onPress={() => onBuy(item)} style={styles.catalogItem}>
              <Text style={styles.catalogIcon}>{item.icon}</Text>
              <Text style={styles.catalogName}>{item.name}</Text>
              <Text style={styles.catalogPrice}>{money(item.price)}</Text>
              {furniture.some((owned) => owned.name === item.name) ? <Text style={styles.ownedLabel}>OWNED</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function ActionTile({
  title,
  detail,
  icon,
  onPress,
  styles,
  disabled = false,
}: {
  title: string;
  detail: string;
  icon: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionTile, disabled && styles.actionTileDisabled]}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={styles.actionTileCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      <Text style={styles.actionChevron}>{disabled ? '🔒' : '›'}</Text>
    </Pressable>
  );
}

function AppShortcut({
  label,
  icon,
  color,
  onPress,
  styles,
}: {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${label}`} onPress={onPress} style={styles.appShortcut}>
      <View style={[styles.appIconTile, { backgroundColor: color }]}>
        <Text style={styles.appIcon}>{icon}</Text>
      </View>
      <Text style={styles.appLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: '#d4e6f2',
    flex: 1,
    overflow: 'hidden',
    paddingBottom: 7,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  topBar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'space-between',
    maxWidth: 980,
    minHeight: 42,
    paddingHorizontal: 13,
    width: '100%',
  },
  timeMood: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  weather: {
    fontSize: 12,
  },
  topMeta: {
    color: '#26374a',
    fontSize: 9,
    fontWeight: '800',
  },
  separator: {
    color: '#a7b1ba',
    fontSize: 11,
  },
  moodText: {
    color: '#239667',
    fontSize: 9,
    fontWeight: '800',
  },
  cityText: {
    color: '#607388',
    fontSize: 8,
    fontWeight: '800',
  },
  wallet: {
    backgroundColor: '#f1f4f8',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  walletText: {
    color: '#17243a',
    fontSize: 10,
    fontWeight: '900',
  },
  exitButton: {
    alignItems: 'center',
    backgroundColor: '#1c293a',
    borderRadius: 16,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  exitText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 23,
  },
  statusBar: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 8,
    marginTop: 7,
    maxWidth: 560,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: '100%',
  },
  meter: {
    flex: 1,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meterLabel: {
    color: '#68798a',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  meterValue: {
    color: '#344255',
    fontSize: 6,
    fontWeight: '900',
  },
  meterTrack: {
    backgroundColor: '#e3e8eb',
    borderRadius: 5,
    height: 4,
    marginTop: 3,
    overflow: 'hidden',
  },
  meterFill: {
    borderRadius: 5,
    height: '100%',
  },
  sceneHeader: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    maxWidth: 980,
    width: '100%',
  },
  sceneKicker: {
    color: '#5d7182',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sceneTitle: {
    color: '#1b2b3c',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  sceneHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  buildButton: {
    backgroundColor: '#fff',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buildButtonText: {
    color: '#35465a',
    fontSize: 8,
    fontWeight: '900',
  },
  world: {
    alignSelf: 'center',
    flex: 1,
    marginBottom: 6,
    marginTop: 4,
    maxHeight: 620,
    maxWidth: 1020,
    minHeight: 220,
    position: 'relative',
    width: '100%',
  },
  interior: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  roomLabel: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radius.pill,
    color: '#475547',
    fontSize: 7,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
  },
  houseReferenceImage: {
    height: '100%',
    width: '100%',
  },
  houseReferenceLabel: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: radius.pill,
    bottom: 9,
    color: '#35465a',
    fontSize: 8,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: 'absolute',
  },
  sleepingFigure: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 68,
    left: '39%',
    marginLeft: -68,
    marginTop: -34,
    position: 'absolute',
    top: '54%',
    width: 136,
  },
  sleepingCharacter: {
    height: 78,
    left: 16,
    position: 'absolute',
    top: 12,
    width: 72,
    zIndex: 6,
  },
  sleepingPillow: {
    backgroundColor: '#fff8ec',
    borderColor: '#d9cdb9',
    borderRadius: 12,
    borderWidth: 1,
    height: 30,
    position: 'absolute',
    right: 8,
    top: 18,
    width: 43,
    zIndex: 3,
  },
  sleepingHead: {
    backgroundColor: '#956044',
    borderRadius: 17,
    height: 32,
    position: 'absolute',
    right: 15,
    top: 20,
    width: 32,
    zIndex: 5,
  },
  sleepingBody: {
    backgroundColor: '#f3a643',
    borderRadius: 20,
    height: 34,
    left: 37,
    position: 'absolute',
    top: 37,
    width: 77,
    zIndex: 1,
  },
  sleepingArm: {
    backgroundColor: '#956044',
    borderRadius: 7,
    height: 9,
    position: 'absolute',
    right: 12,
    top: -3,
    transform: [{ rotate: '-8deg' }],
    width: 23,
  },
  sleepingCover: {
    backgroundColor: '#82afbf',
    borderColor: '#638d9e',
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    left: 12,
    position: 'absolute',
    top: 35,
    width: 101,
    zIndex: 2,
  },
  sleepingFeet: {
    backgroundColor: '#956044',
    borderRadius: 6,
    height: 9,
    left: 8,
    position: 'absolute',
    top: 59,
    transform: [{ rotate: '-10deg' }],
    width: 20,
    zIndex: 1,
  },
  sleepingHair: {
    backgroundColor: '#27232a',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 16,
    height: 13,
    left: 1,
    position: 'absolute',
    top: 0,
    width: 35,
  },
  sleepingFace: {
    height: 17,
    position: 'absolute',
    right: 3,
    top: 14,
    width: 20,
  },
  sleepingEye: {
    backgroundColor: '#5a3c32',
    borderRadius: 2,
    height: 2,
    position: 'absolute',
    right: 4,
    top: 3,
    width: 5,
  },
  sleepingSmile: {
    borderBottomColor: '#9a5f52',
    borderBottomWidth: 1.5,
    borderRadius: 5,
    height: 6,
    position: 'absolute',
    right: 2,
    top: 6,
    width: 8,
  },
  sleepingZ: {
    color: '#3d6380',
    fontSize: 16,
    fontWeight: '900',
    position: 'absolute',
    right: 2,
    top: -8,
  },
  furnitureTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 56,
    position: 'absolute',
  },
  bedTarget: {
    left: '65%',
    top: '37%',
  },
  deskTarget: {
    left: '66%',
    top: '54%',
  },
  sofaTarget: {
    left: '22%',
    top: '51%',
  },
  doorTarget: {
    left: '45%',
    top: '76%',
  },
  furnitureIcon: {
    display: 'none',
  },
  furnitureLabel: {
    color: '#26392f',
    fontSize: 8,
    fontWeight: '900',
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatar: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -24,
    position: 'absolute',
    width: 30,
  },
  avatarFacingLeft: {
    transform: [{ scaleX: -1 }],
  },
  characterSpriteMotion: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  characterSprite: {
    height: '100%',
    width: '100%',
  },
  boughtItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    top: '59%',
    width: 28,
  },
  boughtItemText: {
    fontSize: 16,
  },
  bottomDock: {
    alignItems: 'flex-end',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 980,
    minHeight: 75,
    width: '100%',
  },
  movementPad: {
    height: 72,
    position: 'relative',
    width: 84,
  },
  moveKey: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: '#d0dbe4',
    borderRadius: 9,
    borderWidth: 1,
    height: 25,
    justifyContent: 'center',
    position: 'absolute',
    width: 27,
  },
  moveUp: {
    left: 28,
    top: 0,
  },
  moveLeft: {
    left: 0,
    top: 24,
  },
  moveRight: {
    right: 0,
    top: 24,
  },
  moveDown: {
    bottom: 0,
    left: 28,
  },
  moveArrow: {
    color: '#35465a',
    fontSize: 10,
    fontWeight: '900',
  },
  moveCenter: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 9,
    height: 24,
    left: 29,
    position: 'absolute',
    top: 25,
    width: 25,
  },
  dockSpacer: {
    width: 84,
  },
  navigation: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    padding: 4,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 17,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  navButtonSelected: {
    backgroundColor: '#202b3d',
  },
  navIcon: {
    color: '#637387',
    fontSize: 17,
    fontWeight: '900',
  },
  navLabel: {
    color: '#68798b',
    fontSize: 6,
    fontWeight: '900',
    marginTop: 1,
  },
  navTextSelected: {
    color: '#fff',
  },
  sleepingStatus: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeBar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(201,213,222,0.9)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    maxWidth: 700,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: '100%',
  },
  noticeDot: {
    backgroundColor: '#21b67a',
    borderRadius: 8,
    height: 9,
    width: 9,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: '#273547',
    fontSize: 8,
    fontWeight: '900',
  },
  noticeMessage: {
    color: '#677688',
    fontSize: 7,
    marginTop: 2,
  },
  dismissNotice: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  dismissText: {
    color: '#536578',
    fontSize: 18,
  },
  panelBackdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,24,0.64)',
    justifyContent: 'center',
    padding: 8,
    zIndex: 10,
  },
  phonePanel: {
    backgroundColor: '#111116',
    borderColor: '#29292f',
    borderRadius: 42,
    borderWidth: 6,
    height: '88%',
    maxHeight: 690,
    maxWidth: 420,
    minHeight: 440,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  phoneScreen: {
    backgroundColor: '#613ac5',
    borderRadius: 34,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  phoneStatusBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 21,
    paddingTop: 8,
    zIndex: 2,
  },
  phoneTime: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  phoneStatusSpacer: {
    flex: 1,
  },
  phoneSignal: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  phoneClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,16,50,0.42)',
    borderRadius: 14,
    height: 26,
    justifyContent: 'center',
    marginLeft: 9,
    marginTop: -4,
    width: 26,
  },
  phoneCloseText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
  },
  phoneNotch: {
    alignSelf: 'center',
    backgroundColor: '#14131b',
    borderRadius: 12,
    height: 22,
    position: 'absolute',
    top: 4,
    width: 94,
    zIndex: 4,
  },
  phoneLauncherContent: {
    paddingBottom: 16,
    paddingHorizontal: 17,
    paddingTop: 8,
  },
  phoneScroll: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  nightModePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    marginBottom: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  nightModeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  phonePromo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 23,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 19,
    minHeight: 78,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  phonePromoIcon: {
    alignItems: 'center',
    backgroundColor: '#f5eafe',
    borderRadius: 24,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  phonePromoEmoji: {
    fontSize: 22,
  },
  phonePromoCopy: {
    flex: 1,
  },
  phonePromoTitle: {
    color: '#283348',
    fontSize: 11,
    fontWeight: '900',
  },
  phonePromoBody: {
    color: '#758095',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  phonePromoAction: {
    backgroundColor: '#ff6a16',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  phonePromoActionText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  phoneAppsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  phonePageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 15,
    paddingBottom: 9,
    paddingTop: 2,
    position: 'relative',
    zIndex: 1,
  },
  phoneBack: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  phoneBackText: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 28,
    marginTop: -3,
  },
  phonePageTitle: {
    color: '#fff',
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
  },
  phoneHeaderSpacer: {
    width: 34,
  },
  phoneContent: {
    gap: 11,
    padding: 15,
    paddingBottom: 20,
  },
  phoneDock: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,26,62,0.28)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 12,
    marginTop: 'auto',
    paddingVertical: 9,
    position: 'relative',
    zIndex: 1,
  },
  phoneDockItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  phoneDockIcon: {
    color: '#fff',
    fontSize: 16,
  },
  phoneDockLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 8,
    fontWeight: '700',
  },
  phoneHomeIndicator: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    height: 4,
    marginBottom: 5,
    marginTop: 6,
    opacity: 0.9,
    position: 'relative',
    width: 82,
    zIndex: 1,
  },
  panelHeading: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  panelDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  careerSummary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 15,
    borderWidth: 1,
    gap: 7,
    marginBottom: 3,
    padding: 12,
  },
  careerSummaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  careerSummaryRank: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  careerSummaryPoints: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '800',
  },
  careerProgressTrack: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 5,
    height: 7,
    overflow: 'hidden',
  },
  careerProgressFill: {
    backgroundColor: '#8ee2b7',
    borderRadius: 5,
    height: '100%',
  },
  careerSummaryNext: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
  },
  actionTile: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionTileDisabled: {
    opacity: 0.62,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: '#f3efff',
    borderRadius: 15,
    fontSize: 21,
    overflow: 'hidden',
    padding: 7,
    textAlign: 'center',
    width: 33,
  },
  actionTileCopy: {
    flex: 1,
  },
  actionTitle: {
    color: '#253248',
    fontSize: 12,
    fontWeight: '900',
  },
  actionDetail: {
    color: '#788598',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  actionChevron: {
    color: '#9b86da',
    fontSize: 22,
    fontWeight: '800',
  },
  appShortcut: {
    alignItems: 'center',
    flexBasis: '24%',
    marginBottom: 13,
    minHeight: 83,
    paddingHorizontal: 3,
  },
  appIconTile: {
    alignItems: 'center',
    borderRadius: 17,
    height: 58,
    justifyContent: 'center',
    shadowColor: '#17122e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.23,
    shadowRadius: 4,
    width: 58,
  },
  appIcon: {
    fontSize: 28,
  },
  appLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center',
  },
  buildPanel: {
    backgroundColor: '#f3f6f8',
    borderRadius: 22,
    maxHeight: '84%',
    maxWidth: 720,
    overflow: 'hidden',
    padding: 14,
    width: '100%',
  },
  buildHeading: {
    color: '#273547',
    fontSize: 13,
    fontWeight: '900',
  },
  buildDescription: {
    color: '#677688',
    fontSize: 8,
    lineHeight: 12,
    marginTop: 2,
  },
  buildPanelClose: {
    alignItems: 'center',
    backgroundColor: '#e5eaf0',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  buildPanelCloseText: {
    color: '#536578',
    fontSize: 19,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    paddingTop: 12,
  },
  catalogItem: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e1e7ed',
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '45%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 118,
    padding: 10,
  },
  catalogIcon: {
    fontSize: 30,
  },
  catalogName: {
    color: '#283649',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 6,
  },
  catalogPrice: {
    color: '#25815d',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3,
  },
  ownedLabel: {
    color: '#26845f',
    fontSize: 7,
    fontWeight: '900',
    marginTop: 3,
  },
  hospitalNotice: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: '#fff',
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 310,
    padding: 16,
    position: 'absolute',
    top: '19%',
    width: '88%',
  },
  hospitalIcon: {
    color: '#d85c65',
    fontSize: 27,
    fontWeight: '900',
  },
  hospitalTitle: {
    color: '#27394c',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'center',
  },
  hospitalCopy: {
    color: '#667a8d',
    fontSize: 8,
    lineHeight: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d85c65',
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginTop: 11,
    minHeight: 35,
    paddingHorizontal: 14,
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#d5dce3',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 7,
    minHeight: 32,
    paddingHorizontal: 14,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#536578',
    fontSize: 8,
    fontWeight: '800',
  },
  identityError: {
    color: '#b83b48',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 9,
    textAlign: 'center',
  },
  identityCard: {
    backgroundColor: '#fff',
    borderRadius: 21,
    maxWidth: 440,
    padding: 18,
    width: '100%',
  },
  identityTitle: {
    color: '#253248',
    fontSize: 17,
    fontWeight: '900',
  },
  identityCopy: {
    color: '#68798a',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },
  identityGroupLabel: {
    color: '#344255',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 15,
  },
  identityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },
  identityOption: {
    alignItems: 'center',
    backgroundColor: '#f2f5f8',
    borderColor: '#dce4ea',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 35,
    paddingHorizontal: 12,
  },
  identityOptionSelected: {
    backgroundColor: '#e8f4ef',
    borderColor: '#37a77a',
  },
  identityOptionText: {
    color: '#566779',
    fontSize: 9,
    fontWeight: '800',
  },
  identityOptionTextSelected: {
    color: '#227653',
  },
  identitySaveButton: {
    alignItems: 'center',
    backgroundColor: '#25815d',
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginTop: 17,
    minHeight: 40,
  },
  identitySaveText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  mapScene: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  mapCanvas: {
    ...StyleSheet.absoluteFill,
  },
  mapPlace: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    height: 30,
    justifyContent: 'center',
    marginLeft: -42,
    marginTop: -15,
    maxWidth: 96,
    paddingHorizontal: 5,
    position: 'absolute',
    shadowColor: '#253248',
    shadowOpacity: 0.16,
    shadowRadius: 4,
    width: 84,
    zIndex: 2,
  },
  mapPlaceSelected: {
    backgroundColor: '#fff4d6',
    borderColor: '#e3a62f',
    borderWidth: 2,
  },
  mapPlaceIcon: {
    fontSize: 12,
  },
  mapPlaceLabel: {
    color: '#273547',
    flexShrink: 1,
    fontSize: 6,
    fontWeight: '900',
  },
  mapInstruction: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    bottom: 12,
    maxWidth: 360,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
  },
  mapInstructionText: {
    color: '#35465a',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  mapCard: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#dce4e8',
    borderRadius: 16,
    borderWidth: 1,
    bottom: 6,
    maxHeight: '62%',
    maxWidth: 610,
    padding: 9,
    position: 'absolute',
    width: '97%',
    zIndex: 4,
  },
  mapCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  mapCardCopy: {
    flex: 1,
  },
  mapCardTitle: {
    color: '#273547',
    fontSize: 10,
    fontWeight: '900',
  },
  mapCardDescription: {
    color: '#68798a',
    fontSize: 7,
    lineHeight: 10,
    marginTop: 2,
  },
  mapCardClose: {
    alignItems: 'center',
    backgroundColor: '#edf1f4',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  mapCardCloseText: {
    color: '#536578',
    fontSize: 17,
    lineHeight: 19,
  },
  mapRideRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 7,
  },
  mapRideOption: {
    alignItems: 'center',
    backgroundColor: '#f3f6f8',
    borderColor: '#e2e8ed',
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 69,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  mapRideOptionSelected: {
    backgroundColor: '#eaf4ef',
    borderColor: '#47a87f',
  },
  mapRideIcon: {
    fontSize: 15,
  },
  mapRideName: {
    color: '#35465a',
    fontSize: 7,
    fontWeight: '900',
    marginTop: 1,
  },
  mapRidePrice: {
    color: '#25815d',
    fontSize: 6,
    fontWeight: '800',
    marginTop: 1,
  },
  mapGoButton: {
    alignItems: 'center',
    backgroundColor: '#25815d',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 12,
  },
  mapGoButtonDisabled: {
    backgroundColor: '#788598',
  },
  mapGoText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
  placeScene: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  placeBackdrop: {
    flex: 1,
    overflow: 'hidden',
  },
  placeIcon: {
    alignSelf: 'center',
    fontSize: 64,
    position: 'absolute',
    top: '25%',
  },
  placeCrowd: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 13,
    position: 'absolute',
    top: '57%',
  },
  placePerson: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  placePersonEmoji: {
    fontSize: 26,
  },
  placePlayer: {
    bottom: '11%',
    height: 75,
    position: 'absolute',
    right: '17%',
    width: 44,
  },
  placePlayerImage: {
    height: '100%',
    width: '100%',
  },
  placeSceneCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: '#dce4e8',
    borderRadius: 15,
    borderWidth: 1,
    marginHorizontal: 4,
    marginBottom: 4,
    maxHeight: '44%',
    padding: 9,
  },
  placeCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  placeSceneCopy: {
    flex: 1,
  },
  placeSceneTitle: {
    color: '#273547',
    fontSize: 11,
    fontWeight: '900',
  },
  placeSceneDescription: {
    color: '#68798a',
    fontSize: 7,
    lineHeight: 10,
    marginTop: 2,
  },
  placePeopleTitle: {
    color: '#6c7989',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 6,
  },
  placeActivities: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 7,
  },
  placeActivityButton: {
    alignItems: 'center',
    backgroundColor: '#eef5f1',
    borderColor: '#d6e7dd',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 9,
  },
  placeActivityText: {
    color: '#2e7055',
    fontSize: 7,
    fontWeight: '800',
  },
  transitScene: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#94c6db',
    overflow: 'hidden',
  },
  transitVehicle: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    bottom: '24%',
    flexDirection: 'row',
    height: 44,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -47,
    position: 'absolute',
    width: 94,
  },
  transitRideIcon: {
    fontSize: 26,
  },
  transitPassenger: {
    height: 41,
    overflow: 'hidden',
    width: 26,
  },
  transitCharacterImage: {
    height: '100%',
    width: '100%',
  },
  transitCaption: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 13,
    bottom: 9,
    maxWidth: 390,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    width: '92%',
  },
  transitTitle: {
    color: '#273547',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  transitDescription: {
    color: '#68798a',
    fontSize: 7,
    marginTop: 2,
    textAlign: 'center',
  },
});
