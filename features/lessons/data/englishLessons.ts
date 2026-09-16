import { LessonDefinition } from "../types";

/**
 * Production-Ready English Lessons for the English Side Quest.
 *
 * Subject: "english"
 * Track: "english_basics"
 *
 * Content Philosophy:
 * - Child-friendly, highly visual, audio-led English vocabulary.
 * - Prominent English words with optional subtle Khmer helper labels.
 * - Covers Greetings, Colors, Numbers, Animals, Food, and Review Checkpoint.
 */

// ============================================================================
// Unit 1: Greetings (en_001)
// ============================================================================
export const EN_LESSON_001: LessonDefinition = {
  id: "en_001",
  titleKey: "lesson.en001Title",
  titleKm: "ការស្វាគមន៍៖ Hello & Goodbye",
  titleEn: "Greetings: Hello & Goodbye",
  subject: "english",
  trackId: "english_basics",
  unitId: "unit_1",
  unitTitleKm: "មេរៀនទី ១ — ការស្វាគមន៍",
  unitTitleEn: "Unit 1 — Greetings",
  learningBands: ["explorer", "adventurer", "champion"],
  activities: [
    {
      id: "act-en-001-1",
      type: "listening",
      instructionKm: "ស្តាប់ និងចុចលើពាក្យ Hello",
      instructionEn: 'Listen and tap "Hello"',
      instructionAudioKey: "en_inst_listen_hello",
      audioKey: "english_word_hello",
      promptIcon: "🔊 👋",
      promptText: '"Hello"',
      correctOptionId: "opt-hello",
      layout: "image_label",
      options: [
        {
          id: "opt-hello",
          icon: "👋",
          label: "Hello",
          labelEn: "Hello",
          helperKm: "(សួស្តី)",
          audioKey: "english_word_hello",
          accessibilityLabel: "Hello, wave hand",
        },
        {
          id: "opt-goodbye",
          icon: "🚪",
          label: "Goodbye",
          labelEn: "Goodbye",
          helperKm: "(លាហើយ)",
          audioKey: "english_word_goodbye",
          accessibilityLabel: "Goodbye",
        },
      ],
    },
    {
      id: "act-en-001-2",
      type: "listening",
      instructionKm: "ស្តាប់ និងចុចលើពាក្យ Goodbye",
      instructionEn: 'Listen and tap "Goodbye"',
      instructionAudioKey: "en_inst_listen_goodbye",
      audioKey: "english_word_goodbye",
      promptIcon: "🔊 🚪",
      promptText: '"Goodbye"',
      correctOptionId: "opt-goodbye-2",
      layout: "image_label",
      options: [
        {
          id: "opt-apple",
          icon: "🍎",
          label: "Apple",
          labelEn: "Apple",
          helperKm: "(ផ្លែប៉ោម)",
          audioKey: "english_word_apple",
          accessibilityLabel: "Apple",
        },
        {
          id: "opt-goodbye-2",
          icon: "👋",
          label: "Goodbye",
          labelEn: "Goodbye",
          helperKm: "(លាហើយ)",
          audioKey: "english_word_goodbye",
          accessibilityLabel: "Goodbye, wave hand",
        },
      ],
    },
    {
      id: "act-en-001-3",
      type: "image_matching",
      instructionKm: "ភ្ជាប់ពាក្យស្វាគមន៍ដែលដូចគ្នា",
      instructionEn: "Match the greeting pairs",
      pairs: [
        {
          id: "pair-hello",
          left: {
            id: "left-hello",
            icon: "👋",
            label: "Hello",
            helperKm: "សួស្តី",
            accessibilityLabel: "Hello",
          },
          right: {
            id: "right-hello",
            icon: "👋",
            label: "Hello",
            helperKm: "សួស្តី",
            accessibilityLabel: "Hello matching",
          },
        },
        {
          id: "pair-thanks",
          left: {
            id: "left-thanks",
            icon: "🙏",
            label: "Thank You",
            helperKm: "អរគុណ",
            accessibilityLabel: "Thank You",
          },
          right: {
            id: "right-thanks",
            icon: "🙏",
            label: "Thank You",
            helperKm: "អរគុណ",
            accessibilityLabel: "Thank You matching",
          },
        },
      ],
    },
    {
      id: "act-en-001-4",
      type: "memory",
      instructionKm: "ល្បែងចងចាំ៖ បើកកាតពាក្យស្វាគមន៍",
      instructionEn: "Memory Game: Match the greetings",
      pairs: [
        {
          id: "mem-pair-hello",
          first: {
            id: "mem-hello-1",
            icon: "👋",
            label: "Hello",
            accessibilityLabel: "Hello card 1",
          },
          second: {
            id: "mem-hello-2",
            icon: "👋",
            label: "Hello",
            accessibilityLabel: "Hello card 2",
          },
        },
        {
          id: "mem-pair-thanks",
          first: {
            id: "mem-thanks-1",
            icon: "🙏",
            label: "Thank You",
            accessibilityLabel: "Thank You card 1",
          },
          second: {
            id: "mem-thanks-2",
            icon: "🙏",
            label: "Thank You",
            accessibilityLabel: "Thank You card 2",
          },
        },
      ],
    },
  ],
};

// ============================================================================
// Unit 2: Colors (en_002)
// ============================================================================
export const EN_LESSON_002: LessonDefinition = {
  id: "en_002",
  titleKey: "lesson.en002Title",
  titleKm: "ពណ៌ស្រស់ស្អាត៖ Colors",
  titleEn: "Fun Colors: Red, Blue, Green",
  subject: "english",
  trackId: "english_basics",
  unitId: "unit_2",
  unitTitleKm: "មេរៀនទី ២ — ពណ៌",
  unitTitleEn: "Unit 2 — Colors",
  learningBands: ["explorer", "adventurer", "champion"],
  activities: [
    {
      id: "act-en-002-1",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើពណ៌ Red",
      instructionEn: 'Listen and tap "Red"',
      promptIcon: "🔊 🔴",
      promptText: '"Red"',
      correctOptionId: "opt-red",
      layout: "image_label",
      options: [
        {
          id: "opt-blue",
          colorHex: "#0284C7",
          label: "Blue",
          helperKm: "(ខៀវ)",
          accessibilityLabel: "Blue color",
        },
        {
          id: "opt-red",
          colorHex: "#EF4444",
          label: "Red",
          helperKm: "(ក្រហម)",
          accessibilityLabel: "Red color",
        },
        {
          id: "opt-green",
          colorHex: "#10B981",
          label: "Green",
          helperKm: "(បៃតង)",
          accessibilityLabel: "Green color",
        },
      ],
    },
    {
      id: "act-en-002-2",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើពណ៌ Blue",
      instructionEn: 'Listen and tap "Blue"',
      promptIcon: "🔊 🔵",
      promptText: '"Blue"',
      correctOptionId: "opt-blue-2",
      layout: "image_label",
      options: [
        {
          id: "opt-blue-2",
          colorHex: "#0284C7",
          label: "Blue",
          helperKm: "(ខៀវ)",
          accessibilityLabel: "Blue color",
        },
        {
          id: "opt-yellow",
          colorHex: "#F59E0B",
          label: "Yellow",
          helperKm: "(លឿង)",
          accessibilityLabel: "Yellow color",
        },
      ],
    },
    {
      id: "act-en-002-3",
      type: "tap_choice",
      instructionKm: "តើមួយណាជាពណ៌ Yellow?",
      instructionEn: "Which color is Yellow?",
      promptIcon: "☀️",
      promptText: '"Yellow"',
      correctOptionId: "opt-yellow-3",
      layout: "image_label",
      options: [
        {
          id: "opt-green-3",
          colorHex: "#10B981",
          label: "Green",
          helperKm: "(បៃតង)",
          accessibilityLabel: "Green",
        },
        {
          id: "opt-yellow-3",
          colorHex: "#F59E0B",
          label: "Yellow",
          helperKm: "(លឿង)",
          accessibilityLabel: "Yellow",
        },
      ],
    },
    {
      id: "act-en-002-4",
      type: "image_matching",
      instructionKm: "ភ្ជាប់ពណ៌ទៅនឹងពាក្យអង់គ្លេស",
      instructionEn: "Match colors to English words",
      pairs: [
        {
          id: "pair-red",
          left: {
            id: "left-red",
            colorHex: "#EF4444",
            label: "🔴",
            accessibilityLabel: "Red circle",
          },
          right: {
            id: "right-red",
            label: "Red",
            helperKm: "ក្រហម",
            accessibilityLabel: "Red word",
          },
        },
        {
          id: "pair-blue",
          left: {
            id: "left-blue",
            colorHex: "#0284C7",
            label: "🔵",
            accessibilityLabel: "Blue circle",
          },
          right: {
            id: "right-blue",
            label: "Blue",
            helperKm: "ខៀវ",
            accessibilityLabel: "Blue word",
          },
        },
      ],
    },
  ],
};

// ============================================================================
// Unit 3: Numbers (en_003)
// ============================================================================
export const EN_LESSON_003: LessonDefinition = {
  id: "en_003",
  titleKey: "lesson.en003Title",
  titleKm: "រាប់លេខ៖ Numbers 1 to 5",
  titleEn: "Numbers 1 to 5",
  subject: "english",
  trackId: "english_basics",
  unitId: "unit_3",
  unitTitleKm: "មេរៀនទី ៣ — លេខ",
  unitTitleEn: "Unit 3 — Numbers",
  learningBands: ["explorer", "adventurer", "champion"],
  activities: [
    {
      id: "act-en-003-1",
      type: "counting",
      instructionKm: "រាប់ចំនួនផ្កាយទាំងអស់គ្នា",
      instructionEn: "Count the stars",
      objectIcon: "⭐",
      count: 3,
      options: [2, 3, 4],
      layout: "grouped",
      objectLabelEn: "Stars",
      objectLabelKm: "ផ្កាយ",
    },
    {
      id: "act-en-003-2",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើលេខ One (1)",
      instructionEn: 'Listen and tap "One"',
      promptIcon: "🔊 1️⃣",
      promptText: '"One"',
      correctOptionId: "opt-num-1",
      layout: "text",
      options: [
        {
          id: "opt-num-1",
          label: "1 — One",
          helperKm: "(មួយ)",
          accessibilityLabel: "Number 1, One",
        },
        {
          id: "opt-num-2",
          label: "2 — Two",
          helperKm: "(ពីរ)",
          accessibilityLabel: "Number 2, Two",
        },
        {
          id: "opt-num-3",
          label: "3 — Three",
          helperKm: "(បី)",
          accessibilityLabel: "Number 3, Three",
        },
      ],
    },
    {
      id: "act-en-003-3",
      type: "counting",
      instructionKm: "រាប់ចំនួនបាល់ទាំងអស់គ្នា",
      instructionEn: "Count the balls",
      objectIcon: "⚽",
      count: 2,
      options: [1, 2, 3],
      layout: "grouped",
      objectLabelEn: "Balls",
      objectLabelKm: "បាល់",
    },
    {
      id: "act-en-003-4",
      type: "image_matching",
      instructionKm: "ភ្ជាប់លេខទៅនឹងពាក្យអង់គ្លេស",
      instructionEn: "Match numbers to words",
      pairs: [
        {
          id: "pair-one",
          left: { id: "left-1", label: "1", accessibilityLabel: "Digit 1" },
          right: { id: "right-one", label: "One", helperKm: "មួយ", accessibilityLabel: "One" },
        },
        {
          id: "pair-two",
          left: { id: "left-2", label: "2", accessibilityLabel: "Digit 2" },
          right: { id: "right-two", label: "Two", helperKm: "ពីរ", accessibilityLabel: "Two" },
        },
      ],
    },
  ],
};

// ============================================================================
// Unit 4: Animals (en_004)
// ============================================================================
export const EN_LESSON_004: LessonDefinition = {
  id: "en_004",
  titleKey: "lesson.en004Title",
  titleKm: "សត្វគួរឱ្យស្រឡាញ់៖ Animals",
  titleEn: "Cute Animals: Cat, Dog, Elephant",
  subject: "english",
  trackId: "english_basics",
  unitId: "unit_4",
  unitTitleKm: "មេរៀនទី ៤ — សត្វ",
  unitTitleEn: "Unit 4 — Animals",
  learningBands: ["explorer", "adventurer", "champion"],
  activities: [
    {
      id: "act-en-004-1",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើសត្វ Cat (ឆ្មា)",
      instructionEn: 'Listen and tap "Cat"',
      promptIcon: "🔊 🐱",
      promptText: '"Cat"',
      correctOptionId: "opt-cat",
      layout: "image_label",
      options: [
        {
          id: "opt-cat",
          icon: "🐱",
          label: "Cat",
          helperKm: "(ឆ្មា)",
          accessibilityLabel: "Cat",
        },
        {
          id: "opt-dog",
          icon: "🐶",
          label: "Dog",
          helperKm: "(ឆ្កែ)",
          accessibilityLabel: "Dog",
        },
        {
          id: "opt-elephant",
          icon: "🐘",
          label: "Elephant",
          helperKm: "(ដំរី)",
          accessibilityLabel: "Elephant",
        },
      ],
    },
    {
      id: "act-en-004-2",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើសត្វ Dog (ឆ្កែ)",
      instructionEn: 'Listen and tap "Dog"',
      promptIcon: "🔊 🐶",
      promptText: '"Dog"',
      correctOptionId: "opt-dog-2",
      layout: "image_label",
      options: [
        {
          id: "opt-bird",
          icon: "🐦",
          label: "Bird",
          helperKm: "(សត្វស្លាប)",
          accessibilityLabel: "Bird",
        },
        {
          id: "opt-dog-2",
          icon: "🐶",
          label: "Dog",
          helperKm: "(ឆ្កែ)",
          accessibilityLabel: "Dog",
        },
      ],
    },
    {
      id: "act-en-004-3",
      type: "tap_choice",
      instructionKm: "តើសត្វមួយណាជា Elephant (ដំរី)?",
      instructionEn: 'Which animal is "Elephant"?',
      promptIcon: "🐘",
      promptText: '"Elephant"',
      correctOptionId: "opt-elephant-3",
      layout: "image_label",
      options: [
        {
          id: "opt-elephant-3",
          icon: "🐘",
          label: "Elephant",
          helperKm: "(ដំរី)",
          accessibilityLabel: "Elephant",
        },
        {
          id: "opt-cat-3",
          icon: "🐱",
          label: "Cat",
          helperKm: "(ឆ្មា)",
          accessibilityLabel: "Cat",
        },
      ],
    },
    {
      id: "act-en-004-4",
      type: "image_matching",
      instructionKm: "ភ្ជាប់រូបភាពសត្វទៅនឹងឈ្មោះអង់គ្លេស",
      instructionEn: "Match animals to their English names",
      pairs: [
        {
          id: "pair-cat",
          left: { id: "left-cat", icon: "🐱", label: "Cat", accessibilityLabel: "Cat picture" },
          right: { id: "right-cat", label: "Cat", helperKm: "ឆ្មា", accessibilityLabel: "Cat word" },
        },
        {
          id: "pair-dog",
          left: { id: "left-dog", icon: "🐶", label: "Dog", accessibilityLabel: "Dog picture" },
          right: { id: "right-dog", label: "Dog", helperKm: "ឆ្កែ", accessibilityLabel: "Dog word" },
        },
      ],
    },
  ],
};

// ============================================================================
// Unit 5: Food & Fruits (en_005)
// ============================================================================
export const EN_LESSON_005: LessonDefinition = {
  id: "en_005",
  titleKey: "lesson.en005Title",
  titleKm: "ផ្លែឈើ និងម្ហូប៖ Food & Fruits",
  titleEn: "Food & Fruits: Apple, Banana, Rice",
  subject: "english",
  trackId: "english_basics",
  unitId: "unit_5",
  unitTitleKm: "មេរៀនទី ៥ — ផ្លែឈើ និងម្ហូប",
  unitTitleEn: "Unit 5 — Food & Fruits",
  learningBands: ["explorer", "adventurer", "champion"],
  activities: [
    {
      id: "act-en-005-1",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើផ្លែ Apple (ផ្លែប៉ោម)",
      instructionEn: 'Listen and tap "Apple"',
      promptIcon: "🔊 🍎",
      promptText: '"Apple"',
      correctOptionId: "opt-apple-1",
      layout: "image_label",
      options: [
        {
          id: "opt-apple-1",
          icon: "🍎",
          label: "Apple",
          helperKm: "(ផ្លែប៉ោម)",
          accessibilityLabel: "Apple",
        },
        {
          id: "opt-banana",
          icon: "🍌",
          label: "Banana",
          helperKm: "(ចេក)",
          accessibilityLabel: "Banana",
        },
        {
          id: "opt-water",
          icon: "💧",
          label: "Water",
          helperKm: "(ទឹក)",
          accessibilityLabel: "Water",
        },
      ],
    },
    {
      id: "act-en-005-2",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើផ្លែ Banana (ចេក)",
      instructionEn: 'Listen and tap "Banana"',
      promptIcon: "🔊 🍌",
      promptText: '"Banana"',
      correctOptionId: "opt-banana-2",
      layout: "image_label",
      options: [
        {
          id: "opt-rice",
          icon: "🍚",
          label: "Rice",
          helperKm: "(បាយ)",
          accessibilityLabel: "Rice",
        },
        {
          id: "opt-banana-2",
          icon: "🍌",
          label: "Banana",
          helperKm: "(ចេក)",
          accessibilityLabel: "Banana",
        },
      ],
    },
    {
      id: "act-en-005-3",
      type: "memory",
      instructionKm: "ល្បែងចងចាំ៖ បើកកាតផ្លែឈើ",
      instructionEn: "Memory Game: Match the yummy food",
      pairs: [
        {
          id: "mem-pair-apple",
          first: {
            id: "mem-apple-1",
            icon: "🍎",
            label: "Apple",
            accessibilityLabel: "Apple card 1",
          },
          second: {
            id: "mem-apple-2",
            icon: "🍎",
            label: "Apple",
            accessibilityLabel: "Apple card 2",
          },
        },
        {
          id: "mem-pair-banana",
          first: {
            id: "mem-banana-1",
            icon: "🍌",
            label: "Banana",
            accessibilityLabel: "Banana card 1",
          },
          second: {
            id: "mem-banana-2",
            icon: "🍌",
            label: "Banana",
            accessibilityLabel: "Banana card 2",
          },
        },
      ],
    },
    {
      id: "act-en-005-4",
      type: "image_matching",
      instructionKm: "ភ្ជាប់ផ្លែឈើទៅនឹងពាក្យអង់គ្លេស",
      instructionEn: "Match fruits to words",
      pairs: [
        {
          id: "pair-apple",
          left: { id: "left-apple", icon: "🍎", label: "Apple", accessibilityLabel: "Apple" },
          right: { id: "right-apple", label: "Apple", helperKm: "ផ្លែប៉ោម", accessibilityLabel: "Apple word" },
        },
        {
          id: "pair-banana",
          left: { id: "left-banana", icon: "🍌", label: "Banana", accessibilityLabel: "Banana" },
          right: { id: "right-banana", label: "Banana", helperKm: "ចេក", accessibilityLabel: "Banana word" },
        },
      ],
    },
  ],
};

// ============================================================================
// Unit 6: Review Party Checkpoint (en_006)
// ============================================================================
export const EN_LESSON_006: LessonDefinition = {
  id: "en_006",
  titleKey: "lesson.en006Title",
  titleKm: "ពិធីជប់លៀងរំលឹកមេរៀន៖ English Party",
  titleEn: "Review Party: Words Celebration",
  subject: "english",
  trackId: "english_basics",
  unitId: "unit_6",
  unitTitleKm: "ការប្រកួតរំលឹកមេរៀន",
  unitTitleEn: "Review Checkpoint",
  learningBands: ["explorer", "adventurer", "champion"],
  activities: [
    {
      id: "act-en-006-1",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើពាក្យ Hello",
      instructionEn: 'Listen and tap "Hello"',
      promptIcon: "🔊 👋",
      promptText: '"Hello"',
      correctOptionId: "opt-rev-hello",
      layout: "image_label",
      options: [
        {
          id: "opt-rev-hello",
          icon: "👋",
          label: "Hello",
          helperKm: "(សួស្តី)",
          accessibilityLabel: "Hello",
        },
        {
          id: "opt-rev-cat",
          icon: "🐱",
          label: "Cat",
          helperKm: "(ឆ្មា)",
          accessibilityLabel: "Cat",
        },
      ],
    },
    {
      id: "act-en-006-2",
      type: "tap_choice",
      instructionKm: "ស្តាប់ និងចុចលើពាក្យ Red (ក្រហម)",
      instructionEn: 'Listen and tap "Red"',
      promptIcon: "🔊 🔴",
      promptText: '"Red"',
      correctOptionId: "opt-rev-red",
      layout: "image_label",
      options: [
        {
          id: "opt-rev-blue",
          colorHex: "#0284C7",
          label: "Blue",
          helperKm: "(ខៀវ)",
          accessibilityLabel: "Blue",
        },
        {
          id: "opt-rev-red",
          colorHex: "#EF4444",
          label: "Red",
          helperKm: "(ក្រហម)",
          accessibilityLabel: "Red",
        },
      ],
    },
    {
      id: "act-en-006-3",
      type: "counting",
      instructionKm: "រាប់ចំនួនផ្លែប៉ោមនៅក្នុងពិធីជប់លៀង",
      instructionEn: "Count the apples at the party",
      objectIcon: "🍎",
      count: 4,
      options: [3, 4, 5],
      layout: "grouped",
      objectLabelEn: "Apples",
      objectLabelKm: "ផ្លែប៉ោម",
    },
    {
      id: "act-en-006-4",
      type: "image_matching",
      instructionKm: "ភ្ជាប់រូបភាព និងពាក្យអង់គ្លេសទាំងអស់គ្នា",
      instructionEn: "Match the party words",
      pairs: [
        {
          id: "pair-rev-cat",
          left: { id: "left-cat-rev", icon: "🐱", label: "Cat", accessibilityLabel: "Cat" },
          right: { id: "right-cat-rev", label: "Cat", helperKm: "ឆ្មា", accessibilityLabel: "Cat word" },
        },
        {
          id: "pair-rev-apple",
          left: { id: "left-apple-rev", icon: "🍎", label: "Apple", accessibilityLabel: "Apple" },
          right: { id: "right-apple-rev", label: "Apple", helperKm: "ផ្លែប៉ោម", accessibilityLabel: "Apple word" },
        },
      ],
    },
  ],
};

export const ALL_ENGLISH_LESSONS: Record<string, LessonDefinition> = {
  en_001: EN_LESSON_001,
  en_002: EN_LESSON_002,
  en_003: EN_LESSON_003,
  en_004: EN_LESSON_004,
  en_005: EN_LESSON_005,
  en_006: EN_LESSON_006,
};
