import { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Bookmark,
  Check,
  Compass,
  Eye,
  GraduationCap,
  Heart,
  MapPin,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
  type MarketplaceListing,
  type ListingCondition,
} from '../types/marketplace';
import { INITIAL_MOBILE_LISTINGS } from '../data/marketplaceSeed';

type MarketplaceTab = 'explore' | 'saved' | 'my_listings';
type SortOption = 'newest' | 'price_asc' | 'price_desc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function relativeTime(value: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
}

type MarketplaceScreenProps = {
  onMenuPress?: () => void;
};

export function MarketplaceScreen({ onMenuPress }: MarketplaceScreenProps) {
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);

  const [tab, setTab] = useState<MarketplaceTab>('explore');
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Listings state
  const [listings, setListings] = useState<MarketplaceListing[]>(INITIAL_MOBILE_LISTINGS);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Seller Profile Modal
  const [sellerProfileListing, setSellerProfileListing] = useState<MarketplaceListing | null>(null);

  // Create / Sell modal state
  const [composerOpen, setComposerOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState<MarketplaceCategory>('electronics');
  const [formCondition, setFormCondition] = useState<ListingCondition>('like_new');
  const [formLocation, setFormLocation] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Contact Modal
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Filter & sort logic
  const displayedListings = useMemo(() => {
    let result = listings.filter((item) => {
      if (tab === 'saved') return item.is_saved;
      if (tab === 'my_listings') return item.is_mine;
      if (item.status === 'removed') return false;
      return true;
    });

    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
      );
    }

    const min = parseFloat(minPrice);
    if (!isNaN(min) && min >= 0) {
      result = result.filter((item) => item.price >= min);
    }

    const max = parseFloat(maxPrice);
    if (!isNaN(max) && max > 0) {
      result = result.filter((item) => item.price <= max);
    }

    if (sortOption === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [listings, tab, selectedCategory, searchQuery, minPrice, maxPrice, sortOption]);

  // Wishlist toggle
  const toggleSave = useCallback((listing: MarketplaceListing) => {
    setListings((current) =>
      current.map((item) =>
        item.id === listing.id
          ? {
              ...item,
              is_saved: !item.is_saved,
              likes_count: item.is_saved ? Math.max(0, item.likes_count - 1) : item.likes_count + 1,
            }
          : item
      )
    );
    if (selectedListing && selectedListing.id === listing.id) {
      setSelectedListing((curr) =>
        curr
          ? {
              ...curr,
              is_saved: !curr.is_saved,
              likes_count: curr.is_saved ? Math.max(0, curr.likes_count - 1) : curr.likes_count + 1,
            }
          : null
      );
    }
  }, [selectedListing]);

  // Handle Create Listing
  const handleCreateListing = () => {
    if (!formTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter an item title.');
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price in Naira.');
      return;
    }
    if (!formLocation.trim()) {
      Alert.alert('Missing Location', 'Please specify a meetup area or spot.');
      return;
    }

    const newListing: MarketplaceListing = {
      id: `listing-${Date.now()}`,
      seller_id: 'current-user',
      seller_name: 'You',
      seller_username: 'you',
      seller_avatar: null,
      seller_school: 'My Campus',
      seller_phone: formPhone.trim() || '08000000000',
      title: formTitle.trim(),
      description: formDescription.trim() || 'No additional description provided.',
      price: priceNum,
      category: formCategory,
      condition: formCondition,
      location: formLocation.trim(),
      school: 'My Campus',
      images: [
        formImageUrl.trim() ||
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
      ],
      status: 'available',
      likes_count: 0,
      views_count: 1,
      is_saved: false,
      is_mine: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setListings((curr) => [newListing, ...curr]);
    setComposerOpen(false);
    setFormTitle('');
    setFormPrice('');
    setFormLocation('');
    setFormPhone('');
    setFormImageUrl('');
    setFormDescription('');
    Alert.alert('Success', 'Your item has been listed on campus!');
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Header with NO-BACKGROUND ShoppingCart Icon */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ShoppingCart color={colors.text} size={22} strokeWidth={2.4} />
          <View style={styles.headerDivider} />
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search items"
            style={styles.iconBtn}
            onPress={() => setShowSearch((prev) => !prev)}
          >
            <Search color={colors.text} size={18} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter items"
            style={[styles.iconBtn, (minPrice || maxPrice) && styles.iconBtnActive]}
            onPress={() => setShowFilters((prev) => !prev)}
          >
            <SlidersHorizontal color={minPrice || maxPrice ? colors.inverse : colors.text} size={18} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post new item"
            style={styles.sellBtn}
            onPress={() => setComposerOpen(true)}
          >
            <Plus color={colors.inverse} size={14} strokeWidth={2.8} />
            <Text style={styles.sellBtnText}>Sell</Text>
          </Pressable>
        </View>
      </View>

      {/* Search Bar Drawer */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Search color={colors.textMuted} size={16} />
          <TextInput
            placeholder="Search textbooks, electronics, gear..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoFocus
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X color={colors.textMuted} size={16} />
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Price Filters Drawer */}
      {showFilters && (
        <View style={styles.filterDrawer}>
          <Text style={styles.filterDrawerTitle}>Price Filter (₦)</Text>
          <View style={styles.priceRow}>
            <TextInput
              placeholder="Min ₦"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
              style={styles.priceInput}
            />
            <Text style={styles.priceDash}>–</Text>
            <TextInput
              placeholder="Max ₦"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
              style={styles.priceInput}
            />
            {(minPrice || maxPrice) ? (
              <Pressable
                onPress={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
                style={styles.filterResetBtn}
              >
                <Text style={styles.filterResetText}>Reset</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {/* Matured Segmented Tabs: Explore | Saved | My Listings (Image 1) */}
      <View style={styles.segmentedControlWrap}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segmentBtn, tab === 'explore' && styles.segmentBtnActive]}
            onPress={() => setTab('explore')}
          >
            <Compass
              color={tab === 'explore' ? '#000000' : colors.textMuted}
              size={14}
              strokeWidth={2.2}
            />
            <Text style={[styles.segmentText, tab === 'explore' && styles.segmentTextActive]}>
              Explore
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, tab === 'saved' && styles.segmentBtnActive]}
            onPress={() => setTab('saved')}
          >
            <Bookmark
              color={tab === 'saved' ? '#000000' : colors.textMuted}
              size={14}
              fill={tab === 'saved' ? '#000000' : 'none'}
            />
            <Text style={[styles.segmentText, tab === 'saved' && styles.segmentTextActive]}>
              Saved
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, tab === 'my_listings' && styles.segmentBtnActive]}
            onPress={() => setTab('my_listings')}
          >
            <Tag
              color={tab === 'my_listings' ? '#000000' : colors.textMuted}
              size={14}
            />
            <Text style={[styles.segmentText, tab === 'my_listings' && styles.segmentTextActive]}>
              My Listings
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Horizontal Category Scroller */}
      <View style={styles.categoriesWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {MARKETPLACE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2-Column Product Grid */}
      <FlatList
        key="marketplace-grid-2cols"
        data={displayedListings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ShoppingCart color={colors.textMuted} size={42} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptyDesc}>
              {tab === 'saved'
                ? 'You have not saved any items yet. Tap the heart on any item you like.'
                : tab === 'my_listings'
                ? 'You have not listed any items yet. Declutter your room or offer a skill!'
                : 'No items match your active search or filters. Try adjusting your criteria.'}
            </Text>
            {tab !== 'saved' ? (
              <Pressable style={styles.emptyActionBtn} onPress={() => setComposerOpen(true)}>
                <Text style={styles.emptyActionText}>+ Post First Item</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              setSelectedListing(item);
              setActiveImageIndex(0);
            }}
          >
            {/* Image & Heart Save */}
            <View style={styles.cardMedia}>
              <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>
                  {item.condition === 'new'
                    ? 'Brand New'
                    : item.condition === 'like_new'
                    ? 'Like New'
                    : 'Pre-owned'}
                </Text>
              </View>
              <Pressable
                style={styles.cardHeartBtn}
                onPress={() => toggleSave(item)}
                hitSlop={6}
              >
                <Heart
                  color={item.is_saved ? '#ffffff' : '#ffffff'}
                  fill={item.is_saved ? '#ffffff' : 'none'}
                  size={14}
                />
              </Pressable>
            </View>

            {/* Non-overlapping structured Card Body */}
            <View style={styles.cardBody}>
              {/* Row 1: Category & Time */}
              <View style={styles.cardTopRow}>
                <Text style={styles.cardCategoryText}>{item.category.toUpperCase()}</Text>
                <Text style={styles.cardTimeText}>{relativeTime(item.created_at)}</Text>
              </View>

              {/* Row 2: Price */}
              <Text style={styles.cardPrice}>{formatNaira(item.price)}</Text>

              {/* Row 3: Title */}
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>

              {/* Row 4: Free-form Location */}
              <View style={styles.cardLocationRow}>
                <MapPin color={colors.textMuted} size={11} />
                <Text style={styles.cardLocationText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>

              {/* Row 5: Seller & Views */}
              <View style={styles.cardFooter}>
                <Pressable
                  style={styles.cardSellerBtn}
                  onPress={() => setSellerProfileListing(item)}
                >
                  <View style={styles.cardSellerAvatar}>
                    <Text style={styles.cardSellerAvatarLetter}>
                      {item.seller_name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.cardSellerName} numberOfLines={1}>
                    @{item.seller_username || 'student'}
                  </Text>
                </Pressable>
                {item.views_count > 0 && (
                  <View style={styles.cardViewsRow}>
                    <Eye color={colors.textMuted} size={11} />
                    <Text style={styles.cardViewsText}>{item.views_count}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* Floating Sell Action Button for Quick Access */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Post new item"
        style={styles.floatingFab}
        onPress={() => setComposerOpen(true)}
      >
        <Plus color="#000000" size={16} strokeWidth={3} />
        <Text style={styles.floatingFabText}>Sell</Text>
      </Pressable>

      {/* Listing Detail Sheet Modal */}
      {selectedListing && (
        <Modal
          animationType="slide"
          transparent
          visible={Boolean(selectedListing)}
          onRequestClose={() => setSelectedListing(null)}
        >
          <View style={styles.modalBackdrop}>
            <SafeAreaView style={styles.detailModalSheet}>
              {/* Modal Top Bar */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalBadgeText}>{selectedListing.category.toUpperCase()}</Text>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedListing(null)}
                >
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                {/* Hero Image */}
                <Image
                  source={{ uri: selectedListing.images[activeImageIndex] || selectedListing.images[0] }}
                  style={styles.detailHeroImage}
                  resizeMode="cover"
                />

                {/* Thumbnail strip if multiple images */}
                {selectedListing.images.length > 1 && (
                  <View style={styles.detailThumbnails}>
                    {selectedListing.images.map((img, idx) => (
                      <Pressable
                        key={idx}
                        style={[styles.detailThumb, idx === activeImageIndex && styles.detailThumbActive]}
                        onPress={() => setActiveImageIndex(idx)}
                      >
                        <Image source={{ uri: img }} style={styles.detailThumbImg} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Price and Title */}
                <View style={styles.detailHeaderBox}>
                  <Text style={styles.detailPrice}>{formatNaira(selectedListing.price)}</Text>
                  <Text style={styles.detailTitle}>{selectedListing.title}</Text>
                  <View style={styles.detailMetaRow}>
                    <MapPin color={colors.textMuted} size={13} />
                    <Text style={styles.detailLocationText}>{selectedListing.location}</Text>
                    <Text style={styles.detailDot}>·</Text>
                    <Text style={styles.detailTimeText}>{relativeTime(selectedListing.created_at)}</Text>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionHeading}>DESCRIPTION</Text>
                  <Text style={styles.detailBodyText}>{selectedListing.description}</Text>
                </View>

                {/* Seller Card with School Display */}
                <Pressable
                  style={styles.detailSellerCard}
                  onPress={() => {
                    setSellerProfileListing(selectedListing);
                  }}
                >
                  <View style={styles.detailSellerAvatar}>
                    <Text style={styles.detailSellerAvatarText}>
                      {selectedListing.seller_name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailSellerInfo}>
                    <Text style={styles.detailSellerName}>{selectedListing.seller_name}</Text>
                    <Text style={styles.detailSellerHandle}>
                      @{selectedListing.seller_username || 'campus_student'}
                    </Text>
                    <View style={styles.detailSchoolRow}>
                      <GraduationCap color={colors.textMuted} size={13} />
                      <Text style={styles.detailSchoolText}>
                        {selectedListing.seller_school || selectedListing.school || 'Verified Student'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.viewProfileChip}>
                    <Text style={styles.viewProfileChipText}>Profile</Text>
                  </View>
                </Pressable>

                {/* Safety Guide */}
                <View style={styles.safetyBox}>
                  <Text style={styles.safetyHeading}>Campus Safety Tip</Text>
                  <Text style={styles.safetyBody}>
                    Meet in daylight at a public campus spot (e.g. SUB, library gate). Always inspect before paying.
                  </Text>
                </View>
              </ScrollView>

              {/* Bottom Actions */}
              <View style={styles.detailActionsBar}>
                <Pressable
                  style={[styles.detailSaveBtn, selectedListing.is_saved && styles.detailSaveBtnActive]}
                  onPress={() => toggleSave(selectedListing)}
                >
                  <Heart
                    color={selectedListing.is_saved ? '#ffffff' : colors.text}
                    fill={selectedListing.is_saved ? '#ffffff' : 'none'}
                    size={16}
                  />
                  <Text style={[styles.detailSaveBtnText, selectedListing.is_saved && styles.detailSaveBtnTextActive]}>
                    {selectedListing.is_saved ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.detailContactBtn}
                  onPress={() => setContactModalOpen(true)}
                >
                  <Phone color={colors.inverse} size={15} />
                  <Text style={styles.detailContactBtnText}>Contact Seller</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* Seller Profile Modal (School & Inventory View) */}
      {sellerProfileListing && (
        <Modal
          animationType="fade"
          transparent
          visible={Boolean(sellerProfileListing)}
          onRequestClose={() => setSellerProfileListing(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.sellerProfileSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalBadgeText}>SELLER PROFILE</Text>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setSellerProfileListing(null)}
                >
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>

              <View style={styles.profileHeaderBox}>
                <View style={styles.profileAvatarLarge}>
                  <Text style={styles.profileAvatarTextLarge}>
                    {sellerProfileListing.seller_name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.profileNameLarge}>{sellerProfileListing.seller_name}</Text>
                <Text style={styles.profileHandleLarge}>
                  @{sellerProfileListing.seller_username || 'campus_student'}
                </Text>
                <View style={styles.verifiedTag}>
                  <Check color={colors.text} size={12} strokeWidth={2.6} />
                  <Text style={styles.verifiedTagText}>Verified Student</Text>
                </View>
              </View>

              {/* Facts: School & Meetup Area */}
              <View style={styles.profileFactsRow}>
                <View style={styles.profileFactCard}>
                  <Text style={styles.profileFactLabel}>SCHOOL</Text>
                  <View style={styles.profileFactValBox}>
                    <GraduationCap color={colors.text} size={14} />
                    <Text style={styles.profileFactValue} numberOfLines={2}>
                      {sellerProfileListing.seller_school || sellerProfileListing.school || 'No school specified'}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileFactCard}>
                  <Text style={styles.profileFactLabel}>MEETUP SPOT</Text>
                  <View style={styles.profileFactValBox}>
                    <MapPin color={colors.text} size={14} />
                    <Text style={styles.profileFactValue} numberOfLines={2}>
                      {sellerProfileListing.location}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items from this seller */}
              <Text style={styles.profileItemsHeading}>
                Items from {sellerProfileListing.seller_name.split(' ')[0]}
              </Text>
              <ScrollView style={styles.profileItemsList} showsVerticalScrollIndicator={false}>
                {listings
                  .filter((item) => item.seller_id === sellerProfileListing.seller_id)
                  .map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.profileMiniItem}
                      onPress={() => {
                        setSellerProfileListing(null);
                        setSelectedListing(item);
                        setActiveImageIndex(0);
                      }}
                    >
                      <Image source={{ uri: item.images[0] }} style={styles.profileMiniImg} />
                      <View style={styles.profileMiniInfo}>
                        <Text style={styles.profileMiniTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.profileMiniPrice}>{formatNaira(item.price)}</Text>
                      </View>
                    </Pressable>
                  ))}
              </ScrollView>

              {/* Direct Contact Button */}
              <Pressable
                style={styles.profileContactBtn}
                onPress={() => {
                  setSelectedListing(sellerProfileListing);
                  setSellerProfileListing(null);
                  setContactModalOpen(true);
                }}
              >
                <Phone color={colors.inverse} size={15} />
                <Text style={styles.profileContactBtnText}>
                  Contact {sellerProfileListing.seller_name.split(' ')[0]}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Contact Seller Options Modal (Phone / WhatsApp) */}
      {contactModalOpen && selectedListing && (
        <Modal
          animationType="fade"
          transparent
          visible={contactModalOpen}
          onRequestClose={() => setContactModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.contactSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalBadgeText}>CONTACT SELLER</Text>
                <Pressable style={styles.modalCloseBtn} onPress={() => setContactModalOpen(false)}>
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>

              <Text style={styles.contactIntro}>
                Reach out to {selectedListing.seller_name} to arrange a safe in-person inspection and pickup.
              </Text>

              <View style={styles.contactNumberBox}>
                <Text style={styles.contactNumberLabel}>Phone / WhatsApp</Text>
                <Text style={styles.contactNumberValue}>{selectedListing.seller_phone || '0803 123 4567'}</Text>
              </View>

              <View style={styles.contactActionButtons}>
                <Pressable
                  style={styles.callActionBtn}
                  onPress={() => {
                    Linking.openURL(`tel:${selectedListing.seller_phone || '08031234567'}`);
                  }}
                >
                  <Phone color={colors.text} size={15} />
                  <Text style={styles.callActionText}>Call</Text>
                </Pressable>

                <Pressable
                  style={styles.waActionBtn}
                  onPress={() => {
                    const phone = (selectedListing.seller_phone || '8031234567').replace(/^0/, '');
                    const text = encodeURIComponent(
                      `Hi, I'm interested in your marketplace item: ${selectedListing.title}`
                    );
                    Linking.openURL(`https://wa.me/234${phone}?text=${text}`);
                  }}
                >
                  <Text style={styles.waActionText}>WhatsApp</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Create / Sell Item Modal */}
      {composerOpen && (
        <Modal
          animationType="slide"
          transparent
          visible={composerOpen}
          onRequestClose={() => setComposerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <SafeAreaView style={styles.composerSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalBadgeText}>POST ITEM FOR SALE</Text>
                <Pressable style={styles.modalCloseBtn} onPress={() => setComposerOpen(false)}>
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.composerScroll}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Item Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. MacBook Air M1, Netter Atlas, Table Fan..."
                    placeholderTextColor={colors.textMuted}
                    value={formTitle}
                    onChangeText={setFormTitle}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Price (₦) *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 25000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={formPrice}
                      onChangeText={setFormPrice}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Category</Text>
                    <View style={styles.formSelectStatic}>
                      <Text style={styles.formSelectText}>
                        {MARKETPLACE_CATEGORIES.find((c) => c.id === formCategory)?.label || 'Tech'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Location / Meetup Area *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Moremi Hall, Yaba, Ikeja, Main Gate, Campus SUB..."
                    placeholderTextColor={colors.textMuted}
                    value={formLocation}
                    onChangeText={setFormLocation}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Contact Phone / WhatsApp</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="08012345678"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Photo URL (optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="https://images.unsplash.com/..."
                    placeholderTextColor={colors.textMuted}
                    value={formImageUrl}
                    onChangeText={setFormImageUrl}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextarea]}
                    placeholder="Describe condition, specifications, and meetup spot details..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    value={formDescription}
                    onChangeText={setFormDescription}
                  />
                </View>
              </ScrollView>

              <View style={styles.composerActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setComposerOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.publishBtn} onPress={handleCreateListing}>
                  <Text style={styles.publishBtnText}>Publish Item</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeContainer: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 14) : 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerDivider: {
      width: 1,
      height: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: {
      backgroundColor: colors.text,
    },
    sellBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#ffffff',
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    sellBtnText: {
      color: '#000000',
      fontSize: 12.5,
      fontWeight: '800',
    },
    floatingFab: {
      position: 'absolute',
      right: 16,
      bottom: 84,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#ffffff',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      zIndex: 50,
    },
    floatingFabText: {
      color: '#000000',
      fontSize: 13,
      fontWeight: '800',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      padding: 0,
    },
    filterDrawer: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 8,
      padding: 12,
    },
    filterDrawerTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceInput: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 8,
      color: colors.text,
      fontSize: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    priceDash: {
      color: colors.textMuted,
    },
    filterResetBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    filterResetText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    segmentedControlWrap: {
      paddingHorizontal: 16,
      marginTop: 10,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderRadius: 999,
      padding: 3,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 7,
      borderRadius: 999,
    },
    segmentBtnActive: {
      backgroundColor: '#ffffff',
    },
    segmentText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8e96a4',
    },
    segmentTextActive: {
      color: '#000000',
      fontWeight: '800',
    },
    categoriesWrap: {
      marginTop: 12,
      marginBottom: 4,
    },
    categoriesList: {
      paddingHorizontal: 16,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    categoryChipActive: {
      backgroundColor: '#ffffff',
      borderColor: '#ffffff',
    },
    categoryChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#9da5b2',
    },
    categoryChipTextActive: {
      color: '#000000',
      fontWeight: '800',
    },
    gridContainer: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 90, // Leave room for bottom bar
    },
    gridRow: {
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 8,
    },
    card: {
      flex: 1,
      maxWidth: '48.5%',
      backgroundColor: '#111114',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      overflow: 'hidden',
    },
    cardMedia: {
      width: '100%',
      height: 100,
      backgroundColor: '#000',
      position: 'relative',
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    cardBadge: {
      position: 'absolute',
      top: 5,
      left: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    cardBadgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: '#fff',
    },
    cardHeartBtn: {
      position: 'absolute',
      top: 5,
      right: 5,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      padding: 6,
      gap: 2,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardCategoryText: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    cardTimeText: {
      fontSize: 8,
      color: colors.textMuted,
    },
    cardPrice: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: -0.3,
    },
    cardTitle: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 13,
      minHeight: 26,
    },
    cardLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 1,
    },
    cardLocationText: {
      fontSize: 8.5,
      color: colors.textMuted,
      flex: 1,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.06)',
      paddingTop: 4,
      marginTop: 2,
    },
    cardSellerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      flex: 1,
    },
    cardSellerAvatar: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#27272a',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardSellerAvatarLetter: {
      fontSize: 7,
      fontWeight: '800',
      color: '#fff',
    },
    cardSellerName: {
      fontSize: 8.5,
      color: colors.textMuted,
      flex: 1,
    },
    cardViewsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    cardViewsText: {
      fontSize: 8.5,
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 50,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginTop: 12,
    },
    emptyDesc: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    emptyActionBtn: {
      backgroundColor: colors.text,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      marginTop: 16,
    },
    emptyActionText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.inverse,
    },

    // Detail Modal Sheet
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'flex-end',
    },
    detailModalSheet: {
      backgroundColor: '#0f0f12',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      maxHeight: '92%',
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    modalBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.8,
    },
    modalCloseBtn: {
      padding: 4,
    },
    detailScroll: {
      padding: 18,
    },
    detailHeroImage: {
      width: '100%',
      height: 240,
      borderRadius: 14,
      backgroundColor: '#000',
    },
    detailThumbnails: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    detailThumb: {
      width: 48,
      height: 48,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    detailThumbActive: {
      borderColor: '#ffffff',
    },
    detailThumbImg: {
      width: '100%',
      height: '100%',
    },
    detailHeaderBox: {
      marginTop: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
      paddingBottom: 14,
    },
    detailPrice: {
      fontSize: 22,
      fontWeight: '900',
      color: '#ffffff',
    },
    detailTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
      lineHeight: 22,
    },
    detailMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
    },
    detailLocationText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    detailDot: {
      color: colors.textMuted,
    },
    detailTimeText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    detailSection: {
      marginTop: 16,
    },
    detailSectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    detailBodyText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 20,
    },
    detailSellerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 14,
      padding: 12,
      marginTop: 18,
    },
    detailSellerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#27272a',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailSellerAvatarText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
    },
    detailSellerInfo: {
      flex: 1,
    },
    detailSellerName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    detailSellerHandle: {
      fontSize: 11,
      color: colors.textMuted,
    },
    detailSchoolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 3,
    },
    detailSchoolText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    viewProfileChip: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    viewProfileChipText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text,
    },
    safetyBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 12,
      padding: 12,
      marginTop: 16,
    },
    safetyHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    safetyBody: {
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 16,
    },
    detailActionsBar: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    detailSaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    detailSaveBtnActive: {
      backgroundColor: '#27272a',
      borderColor: '#ffffff',
    },
    detailSaveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    detailSaveBtnTextActive: {
      color: '#ffffff',
    },
    detailContactBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.text,
      borderRadius: 12,
      paddingVertical: 12,
    },
    detailContactBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.inverse,
    },

    // Seller Profile Modal
    sellerProfileSheet: {
      backgroundColor: '#0f0f12',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.14)',
      padding: 20,
      maxHeight: '85%',
    },
    profileHeaderBox: {
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
      marginBottom: 16,
    },
    profileAvatarLarge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#27272a',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    profileAvatarTextLarge: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
    },
    profileNameLarge: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    profileHandleLarge: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    verifiedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      marginTop: 6,
    },
    verifiedTagText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text,
    },
    profileFactsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    profileFactCard: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 10,
      padding: 10,
    },
    profileFactLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    profileFactValBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    profileFactValue: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    profileItemsHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    profileItemsList: {
      maxHeight: 160,
    },
    profileMiniItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
      borderRadius: 10,
      padding: 8,
      marginBottom: 8,
    },
    profileMiniImg: {
      width: 36,
      height: 36,
      borderRadius: 6,
      backgroundColor: '#000',
    },
    profileMiniInfo: {
      flex: 1,
    },
    profileMiniTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    profileMiniPrice: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      marginTop: 2,
    },
    profileContactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.text,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 12,
    },
    profileContactBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.inverse,
    },

    // Contact Sheet
    contactSheet: {
      backgroundColor: '#0f0f12',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      marginHorizontal: 20,
      marginBottom: 'auto',
      marginTop: 'auto',
      padding: 20,
    },
    contactIntro: {
      fontSize: 12,
      color: colors.textMuted,
      marginVertical: 12,
      lineHeight: 18,
    },
    contactNumberBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    contactNumberLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    contactNumberValue: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    contactActionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    callActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 10,
      paddingVertical: 11,
    },
    callActionText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    waActionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      paddingVertical: 11,
    },
    waActionText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#000000',
    },

    // Composer Sheet
    composerSheet: {
      backgroundColor: '#0f0f12',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      maxHeight: '92%',
      flex: 1,
    },
    composerScroll: {
      padding: 18,
      gap: 14,
    },
    formGroup: {
      gap: 6,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    formLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    formInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 10,
      color: colors.text,
      fontSize: 13,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    formSelectStatic: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    formSelectText: {
      fontSize: 13,
      color: colors.text,
    },
    formTextarea: {
      height: 80,
      textAlignVertical: 'top',
    },
    composerActions: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    cancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    publishBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.text,
    },
    publishBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.inverse,
    },
  });
