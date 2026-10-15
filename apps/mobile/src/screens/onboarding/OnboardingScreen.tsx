import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { institutionCounts, nigerianInstitutions } from '../../data/institutionDirectory';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppColors, radius } from '../../theme/tokens';
import { EducationStatus, Institution, InstitutionType, OnboardingProfile } from '../../types/domain';
import { OnboardingRoute } from '../../types/navigation';
import { validateOnboardingProfile } from '../../validation/onboardingValidation';

type OnboardingScreenProps = {
  route: OnboardingRoute;
  initialName?: string;
  onNavigate: (route: OnboardingRoute) => void;
  onBackToAuth: () => void;
  onFinish: (profile?: OnboardingProfile) => void;
};

type InstitutionFilter = InstitutionType | 'all';

const interestOptions = [
  'Campus life',
  'Technology',
  'Music',
  'Sports',
  'Gaming',
  'Entrepreneurship',
  'Arts',
  'Study tips',
];

export function OnboardingScreen({ route, initialName, onNavigate, onBackToAuth, onFinish }: OnboardingScreenProps) {
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [school, setSchool] = useState<Institution | null>(null);
  const [manualSchoolName, setManualSchoolName] = useState('');
  const [showManualSchoolEntry, setShowManualSchoolEntry] = useState(false);
  const [educationStatus, setEducationStatus] = useState<EducationStatus | null>(null);
  const [institutionFilter, setInstitutionFilter] = useState<InstitutionFilter>('all');
  const [displayName, setDisplayName] = useState(initialName ?? '');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState('');

  const filteredInstitutions = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    return nigerianInstitutions.filter((institution) => {
      const matchesType = institutionFilter === 'all' || institution.type === institutionFilter;
      const searchableText = `${institution.name} ${institution.location} ${institution.category}`.toLowerCase();
      return matchesType && searchableText.includes(query);
    });
  }, [institutionFilter, schoolSearch]);

  const profileDraft: OnboardingProfile = {
    educationStatus: educationStatus ?? 'prefer_not_to_say',
    school: educationStatus === 'currently_in_school'
      ? manualSchoolName.trim() || school?.name || null
      : null,
    showSchoolOnProfile: false,
    displayName,
    course: educationStatus === 'currently_in_school' ? course : '',
    year: educationStatus === 'currently_in_school' ? year : '',
    ageEligibilityConfirmed: ageConfirmed,
    interests: selectedInterests,
  };

  const continueProfile = () => {
    const validationError = validateOnboardingProfile(profileDraft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onNavigate('interests');
  };

  const finishOnboarding = () => onFinish({
    ...profileDraft,
    interests: selectedInterests,
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest],
    );
  };

  const titles: Record<OnboardingRoute, string> = {
    school: 'Education status',
    profile: 'Set up your profile',
    interests: 'Choose your interests',
  };

  if (route === 'school') {
    return (
      <SchoolSelector
        colors={colors}
        filter={institutionFilter}
        institutions={filteredInstitutions}
        onBack={onBackToAuth}
        onContinue={() => onNavigate('profile')}
        onFilterChange={setInstitutionFilter}
        educationStatus={educationStatus}
        onEducationStatusChange={(status) => {
          setEducationStatus(status);
          if (status !== 'currently_in_school') {
            setSchool(null);
            setManualSchoolName('');
            setShowManualSchoolEntry(false);
            setSchoolSearch('');
            setInstitutionFilter('all');
          }
        }}
        onSearchChange={setSchoolSearch}
        onManualSchoolNameChange={(name) => {
          setManualSchoolName(name);
          if (name.trim()) setSchool(null);
        }}
        onManualSchoolEntryToggle={() => setShowManualSchoolEntry((current) => !current)}
        onSelect={(institution) => {
          setSchool(institution);
          setManualSchoolName('');
          setShowManualSchoolEntry(false);
        }}
        onExit={onFinish}
        query={schoolSearch}
        selected={school}
        manualSchoolName={manualSchoolName}
        showManualSchoolEntry={showManualSchoolEntry}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.screen}>
      <Pressable accessibilityRole="button" onPress={() => onFinish()} style={styles.exitButton}>
        <Text style={styles.exitText}>Exit preview</Text>
      </Pressable>
      <Image
        accessibilityLabel="Common Room logo"
        contentFit="contain"
        source={mode === 'dark'
          ? require('../../../COMMON ROOM full logo white.png')
          : require('../../../COMMON ROOM full logo.png')}
        style={styles.logo}
      />
      <Text style={styles.step}>ACCOUNT SETUP · {route === 'profile' ? '2' : '3'} OF 3</Text>
      <Text style={styles.title}>{titles[route]}</Text>
      <Text style={styles.subtitle}>Preview only. Your selections are not sent or saved.</Text>

      {route === 'profile' ? (
        <View style={styles.section}>
          {profileDraft.school ? <Text style={styles.helper}>School: {profileDraft.school}</Text> : null}
          <Field label="Display name" value={displayName} onChangeText={setDisplayName} colors={colors} />
          {educationStatus === 'currently_in_school' ? (
            <>
              <Field label="Course (optional)" value={course} onChangeText={setCourse} colors={colors} />
              <Field label="Year of study (optional)" value={year} onChangeText={setYear} colors={colors} />
            </>
          ) : null}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ageConfirmed }}
            onPress={() => setAgeConfirmed((current) => !current)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, ageConfirmed && styles.checkboxSelected]}>
              {ageConfirmed ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>I confirm that I meet the app’s minimum age requirement.</Text>
          </Pressable>
          <Text style={styles.helper}>Age eligibility is not checked in this preview.</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <ActionButton label="Continue" colors={colors} onPress={continueProfile} />
          <TextButton label="Back to education status" colors={colors} onPress={() => onNavigate('school')} />
        </View>
      ) : null}

      {route === 'interests' ? (
        <View style={styles.section}>
          <Text style={styles.helper}>Pick any that sound interesting, or skip to finish this preview.</Text>
          <View style={styles.interests}>
            {interestOptions.map((interest) => {
              const selected = selectedInterests.includes(interest);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  style={[styles.interest, selected && styles.interestSelected]}
                >
                  <Text style={[styles.interestText, selected && styles.interestTextSelected]}>{interest}</Text>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <ActionButton label="Finish preview" colors={colors} onPress={finishOnboarding} />
          <TextButton label="Back to profile" colors={colors} onPress={() => onNavigate('profile')} />
        </View>
      ) : null}

      <Text style={styles.footerNote}>No account is created by completing this preview.</Text>
    </ScrollView>
  );
}

function SchoolSelector({
  colors,
  filter,
  institutions,
  onBack,
  onContinue,
  onFilterChange,
  educationStatus,
  onEducationStatusChange,
  onSearchChange,
  onSelect,
  onExit,
  query,
  selected,
  manualSchoolName,
  showManualSchoolEntry,
  onManualSchoolNameChange,
  onManualSchoolEntryToggle,
}: {
  colors: AppColors;
  filter: InstitutionFilter;
  institutions: Institution[];
  onBack: () => void;
  onContinue: () => void;
  onFilterChange: (filter: InstitutionFilter) => void;
  educationStatus: EducationStatus | null;
  onEducationStatusChange: (status: EducationStatus) => void;
  onSearchChange: (query: string) => void;
  onManualSchoolNameChange: (name: string) => void;
  onManualSchoolEntryToggle: () => void;
  onSelect: (institution: Institution) => void;
  onExit: () => void;
  query: string;
  selected: Institution | null;
  manualSchoolName: string;
  showManualSchoolEntry: boolean;
}) {
  const styles = createStyles(colors);
  const filters: { key: InstitutionFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: institutionCounts.total },
    { key: 'university', label: 'Universities', count: institutionCounts.universities },
    { key: 'polytechnic', label: 'Polytechnics', count: institutionCounts.polytechnics },
    { key: 'college_of_education', label: 'Colleges', count: institutionCounts.colleges },
  ];

  return (
    <View style={styles.selectorScreen}>
      <View style={styles.selectorContent}>
        <View style={styles.selectorTopbar}>
          <Pressable accessibilityLabel="Back to sign in" accessibilityRole="button" onPress={onBack} style={styles.selectorIconButton}>
            <Text style={styles.selectorBackText}>‹</Text>
          </Pressable>
          <Text style={styles.selectorStep}>ACCOUNT SETUP · 1 OF 3</Text>
          <Pressable accessibilityRole="button" onPress={onExit} style={styles.selectorExitButton}>
            <Text style={styles.selectorExitText}>Exit</Text>
          </Pressable>
        </View>
        <Text style={styles.selectorTitle}>Are you a student?</Text>
        <Text style={styles.selectorSubtitle}>Your answer helps tailor your in-app experience.</Text>
        <View style={styles.educationOptions}>
          {([
            ['currently_in_school', 'Yes'],
            ['not_in_school_yet', 'No'],
            ['prefer_not_to_say', 'Prefer not to say'],
          ] as const).map(([status, label]) => {
            const isSelected = educationStatus === status;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                key={status}
                onPress={() => onEducationStatusChange(status)}
                style={[styles.educationOption, isSelected && styles.educationOptionSelected]}
              >
                <Text style={styles.educationOptionTitle}>{label}</Text>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {educationStatus === 'currently_in_school' ? (
          <>
            <Text style={styles.schoolSectionLabel}>Select your school</Text>
            <View style={styles.searchWrap}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Search schools"
            autoCorrect={false}
            onChangeText={onSearchChange}
            placeholder="Search for your school"
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            style={styles.selectorSearch}
            value={query}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => onSearchChange('')} style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          contentContainerStyle={styles.filterList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={item.key}
                onPress={() => onFilterChange(item.key)}
                style={[styles.filterChip, active && styles.activeFilterChip]}
              >
                <Text style={[styles.filterText, active && styles.activeFilterText]}>
                  {item.label} <Text style={active ? styles.activeFilterCount : styles.filterCount}>{item.count}</Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.resultCount}>
          {institutions.length} {institutions.length === 1 ? 'institution' : 'institutions'}
        </Text>
        <FlatList
          data={institutions}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyResults}>
              <Text style={styles.emptyResultsTitle}>No schools found</Text>
              <Text style={styles.emptyResultsText}>Try another name, location, or school type.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;
            const monogram = item.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase();
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(item)}
                style={[styles.institutionRow, isSelected && styles.selectedInstitutionRow]}
              >
                <View style={styles.institutionMonogram}>
                  <Text style={styles.institutionMonogramText}>{monogram}</Text>
                </View>
                <View style={styles.institutionDetails}>
                  <Text numberOfLines={1} style={styles.institutionName}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.institutionLocation}>
                    {item.location} · {item.category}
                  </Text>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          }}
          style={styles.institutionList}
        />
        <Pressable
          accessibilityRole="button"
          onPress={onManualSchoolEntryToggle}
          style={styles.manualSchoolToggle}
        >
          <Text style={styles.manualSchoolToggleText}>
            {showManualSchoolEntry ? 'Choose from the list instead' : "Can't find your school? Type it in"}
          </Text>
        </Pressable>
        {showManualSchoolEntry ? (
          <TextInput
            accessibilityLabel="Enter your school name"
            onChangeText={onManualSchoolNameChange}
            placeholder="Type your school name"
            placeholderTextColor={colors.textFaint}
            style={styles.manualSchoolInput}
            value={manualSchoolName}
          />
        ) : null}
          </>
        ) : null}
        <View style={styles.selectorFooter}>
          <Text numberOfLines={1} style={styles.selectionSummary}>
            {selected
              ? selected.name
              : manualSchoolName.trim() || ''}
          </Text>
          <ActionButton
            disabled={!educationStatus || (educationStatus === 'currently_in_school' && !selected && !manualSchoolName.trim())}
            label="Continue"
            colors={colors}
            onPress={onContinue}
          />
        </View>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  colors,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  colors: AppColors;
  disabled?: boolean;
}) {
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function TextButton({ label, onPress, colors }: { label: string; onPress: () => void; colors: AppColors }) {
  const styles = createStyles(colors);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  selectorScreen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
  },
  selectorContent: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 390,
    paddingHorizontal: 12,
    paddingTop: 4,
    width: '100%',
  },
  selectorTopbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  selectorIconButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  selectorBackText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 22,
    marginTop: -3,
  },
  selectorStep: {
    color: colors.textFaint,
    flex: 1,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  selectorExitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 36,
  },
  selectorExitText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  selectorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
  selectorSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  educationOptions: {
    gap: 4,
    marginTop: 6,
  },
  educationOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  educationOptionSelected: {
    borderColor: colors.text,
  },
  educationOptionCopy: {
    flex: 1,
    gap: 3,
  },
  educationOptionTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  educationOptionDetail: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  schoolSectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
  },
  generalAccessNote: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  generalAccessTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  generalAccessCopy: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 11,
  },
  searchGlyph: {
    color: colors.textMuted,
    fontSize: 20,
    marginRight: 8,
  },
  selectorSearch: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    minHeight: 42,
    paddingVertical: 0,
  },
  clearSearch: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  clearSearchText: {
    color: colors.textMuted,
    fontSize: 20,
  },
  filterList: {
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
    paddingVertical: 5,
  },
  filterChip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 7,
  },
  activeFilterChip: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  activeFilterText: {
    color: colors.inverse,
  },
  filterCount: {
    color: colors.textFaint,
    fontSize: 9,
  },
  activeFilterCount: {
    color: colors.inverse,
    fontSize: 9,
    opacity: 0.75,
  },
  resultCount: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  institutionList: {
    flex: 1,
  },
  institutionRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  selectedInstitutionRow: {
    backgroundColor: colors.surface,
  },
  institutionMonogram: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 11,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  institutionMonogramText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  institutionDetails: {
    flex: 1,
    gap: 3,
  },
  institutionName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  institutionLocation: {
    color: colors.textMuted,
    fontSize: 10,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.textFaint,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioOuterSelected: {
    borderColor: colors.text,
  },
  radioInner: {
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  emptyResults: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 42,
  },
  emptyResultsTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyResultsText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
  selectorFooter: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
    paddingTop: 4,
  },
  selectionSummary: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  manualSchoolToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  manualSchoolToggleText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  manualSchoolInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 11,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 400,
    paddingBottom: 14,
    paddingHorizontal: 12,
    paddingTop: 28,
    width: '100%',
  },
  exitButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
    top: 10,
    zIndex: 1,
  },
  exitText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  logo: {
    alignSelf: 'center',
    height: 24,
    marginBottom: 5,
    width: 84,
  },
  step: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  section: {
    gap: 6,
    marginTop: 7,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    minHeight: 40,
    paddingHorizontal: 8,
  },
  schoolOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  selectedOption: {
    borderColor: colors.text,
  },
  optionText: {
    color: colors.text,
    flex: 1,
    fontSize: 11,
  },
  selectedMark: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  fieldWrap: {
    gap: 3,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  checkboxSelected: {
    backgroundColor: colors.text,
  },
  checkmark: {
    color: colors.inverse,
    fontSize: 11,
    fontWeight: '900',
  },
  checkLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 10,
    lineHeight: 12,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 11,
    lineHeight: 15,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  interest: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  interestSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  interestText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  interestTextSelected: {
    color: colors.inverse,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.inverse,
    fontSize: 12,
    fontWeight: '800',
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  textButtonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  footerNote: {
    color: colors.textFaint,
    fontSize: 9,
    marginTop: 7,
    textAlign: 'center',
  },
});
