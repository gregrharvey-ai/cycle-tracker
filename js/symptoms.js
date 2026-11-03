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
    ],
  },
  {
    id: 'heat-sleep',
    label: 'Heat and sleep',
    symptoms: [
      { id: 'hot-flashes', label: 'Hot flashes' },
      { id: 'night-sweats', label: 'Night sweats' },
      { id: 'poor-sleep', label: 'Trouble sleeping' },
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
};


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
  const idx = Math.max(0, allSymptoms(custom).findIndex((s) => s.id === id));
  const hue = Math.round((idx * 137.508) % 360);
  return `hsl(${hue} 58% ${idx % 2 ? 56 : 46}%)`;
}
