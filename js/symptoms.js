// Symptom checklist (from the build brief) and rating scale.

export const RATINGS = [
  { id: 'mild', label: 'Mild', value: 1 },
  { id: 'medium', label: 'Medium', value: 2 },
  { id: 'rough', label: 'Rough', value: 3 },
];

export const GROUPS = [
  {
    id: 'mood',
    label: 'Mood',
    symptoms: [
      { id: 'rage', label: 'Irritability or rage' },
      { id: 'sadness', label: 'Sadness' },
      { id: 'anxiety', label: 'Anxiety' },
      { id: 'mood-swings', label: 'Mood swings' },
      { id: 'brain-fog', label: 'Brain fog' },
      { id: 'forgetfulness', label: 'Forgetfulness' },
      { id: 'focus', label: 'Lack of focus or scattered' },
      { id: 'word-finding', label: 'Trouble finding words' },
      { id: 'overwhelm', label: 'Overwhelmed or low motivation' },
      { id: 'panic', label: 'Panic or dread' },
    ],
  },
  {
    id: 'body',
    label: 'Body',
    symptoms: [
      { id: 'cramps', label: 'Cramps' },
      { id: 'bloating', label: 'Bloating' },
      { id: 'breast-tenderness', label: 'Breast tenderness' },
      { id: 'headache', label: 'Headaches or migraines' },
      { id: 'joint-aches', label: 'Joint aches' },
      { id: 'fatigue', label: 'Fatigue' },
      { id: 'dizziness', label: 'Dizziness' },
      { id: 'itchy-skin', label: 'Itchy or crawling skin' },
      { id: 'bruising', label: 'Easy bruising' },
      { id: 'tinnitus', label: 'Ringing in the ears' },
      { id: 'urinary', label: 'Bladder urgency or leaks' },
      { id: 'digestive', label: 'Nausea or gut upset' },
      { id: 'dry-eyes', label: 'Dry or gritty eyes' },
    ],
  },
  {
    id: 'heat-sleep',
    label: 'Heat and sleep',
    symptoms: [
      { id: 'hot-flashes', label: 'Hot flashes' },
      { id: 'night-sweats', label: 'Night sweats' },
      { id: 'poor-sleep', label: 'Trouble sleeping' },
      { id: 'early-waking', label: 'Waking too early' },
    ],
  },
  {
    id: 'cycle',
    label: 'Cycle',
    symptoms: [
      { id: 'spotting', label: 'Spotting' },
      { id: 'heavy-bleeding', label: 'Heavy bleeding' },
      { id: 'cycle-change', label: 'Early, late, or skipped period' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    symptoms: [
      { id: 'low-libido', label: 'Low libido' },
      { id: 'vaginal-dryness', label: 'Vaginal dryness' },
      { id: 'palpitations', label: 'Heart palpitations' },
      { id: 'skin-hair', label: 'Dry skin or hair changes' },
      { id: 'weight', label: 'Weight changes' },
      { id: 'alcohol-tolerance', label: 'Lower alcohol tolerance' },
      { id: 'electric-shocks', label: 'Electric-shock feelings' },
    ],
  },
];

// Short names used inside sentences ("Rage and anxiety have shown up…").
const SHORT = {
  rage: 'irritability or rage',
  sadness: 'sadness',
  anxiety: 'anxiety',
  'mood-swings': 'mood swings',
  'brain-fog': 'brain fog',
  forgetfulness: 'forgetfulness',
  focus: 'lack of focus',
  cramps: 'cramps',
  bloating: 'bloating',
  'breast-tenderness': 'breast tenderness',
  headache: 'headaches',
  'joint-aches': 'joint aches',
  fatigue: 'fatigue',
  'hot-flashes': 'hot flashes',
  'night-sweats': 'night sweats',
  'poor-sleep': 'trouble sleeping',
  spotting: 'spotting',
  'heavy-bleeding': 'heavy bleeding',
  'cycle-change': 'cycle changes',
  'low-libido': 'low libido',
  'vaginal-dryness': 'vaginal dryness',
  palpitations: 'heart palpitations',
  'skin-hair': 'dry skin or hair changes',
  weight: 'weight changes',
  'word-finding': 'trouble finding words',
  overwhelm: 'feeling overwhelmed',
  panic: 'panic or dread',
  dizziness: 'dizziness',
  'itchy-skin': 'itchy or crawling skin',
  bruising: 'easy bruising',
  tinnitus: 'ringing in the ears',
  urinary: 'bladder urgency or leaks',
  digestive: 'nausea or gut upset',
  'dry-eyes': 'dry eyes',
  'early-waking': 'waking too early',
  'alcohol-tolerance': 'lower alcohol tolerance',
  'electric-shocks': 'electric-shock feelings',
};

// Colors are assigned by position in this list. The original symptoms keep their
// original order so existing calendars don't change color when new symptoms are added.
const COLOR_ORDER = [
  'rage', 'sadness', 'anxiety', 'mood-swings', 'brain-fog', 'forgetfulness',
  'cramps', 'bloating', 'breast-tenderness', 'headache', 'joint-aches', 'fatigue',
  'hot-flashes', 'night-sweats', 'poor-sleep',
  'spotting', 'heavy-bleeding', 'cycle-change',
  'low-libido', 'vaginal-dryness', 'palpitations', 'skin-hair', 'weight',
];


const BUILTIN = GROUPS.flatMap((g) => g.symptoms.map((s) => ({ ...s, group: g.id })));

export function allSymptoms(custom = []) {
  return [
    ...BUILTIN,
    ...custom.map((c) => ({ id: c.id, label: c.label, group: 'custom', custom: true })),
  ];
}

export function symptomMap(custom = []) {
  return new Map(allSymptoms(custom).map((s) => [s.id, s]));
}

export function labelOf(id, custom = []) {
  return symptomMap(custom).get(id)?.label ?? id;
}

export function shortLabel(id, custom = []) {
  return SHORT[id] ?? (custom.find((c) => c.id === id)?.label ?? id).toLowerCase();
}

// Golden-angle hue steps keep neighbouring symptoms visually distinct for any number of symptoms.
export function colorOf(id, custom = []) {
  const order = [...COLOR_ORDER, ...allSymptoms(custom).map((s) => s.id).filter((x) => !COLOR_ORDER.includes(x))];
  const idx = Math.max(0, order.indexOf(id));
  const hue = Math.round((idx * 137.508) % 360);
  return `hsl(${hue} 58% ${idx % 2 ? 56 : 46}%)`;
}
