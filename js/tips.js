// Resources: tips by symptom, each with an honest evidence tag and a source.
// Tags: 'well' = Well studied, 'some' = Some evidence, 'trad' = Traditional use, little research.
// IMPORTANT: wording here is a starting draft for a layperson audience. Have a clinician
// (or pharmacist, for the herb safety notes) review it before anyone beyond the first user uses the app.

export const EVIDENCE = {
  well: { label: 'Well studied', hint: 'Backed by several good-quality studies or guidelines.' },
  some: { label: 'Some evidence', hint: 'Some studies point to a benefit, but they are small, short, or mixed.' },
  trad: { label: 'Traditional use, little research', hint: 'Used for a long time, but there is little good research.' },
};

export const MED_NOTE = 'If you take any medication, check with a doctor or pharmacist first.';

export const TIPS = [
  // ---- medical / mainstream ----
  {
    id: 'talk-hot-flashes',
    title: 'Ask about proven treatments for hot flashes',
    symptoms: ['hot-flashes', 'night-sweats'],
    kind: 'Mainstream',
    evidence: 'well',
    body: 'If hot flashes or night sweats are disrupting your life, there are treatments with good evidence: hormone therapy (the most effective), some antidepressant-type medicines (SSRIs/SNRIs), gabapentin, and a newer non-hormone medicine called fezolinetant. Cognitive behavioral therapy and clinical hypnosis also help many women cope. Whether any of these suit you depends on your history, so it is a conversation for your doctor.',
    source: 'The Menopause Society, 2023 Nonhormone Therapy Position Statement; 2022 Hormone Therapy Position Statement',
  },
  {
    id: 'cbt-sleep',
    title: 'CBT for insomnia',
    symptoms: ['poor-sleep', 'night-sweats'],
    kind: 'Mainstream',
    evidence: 'well',
    body: 'Cognitive behavioral therapy for insomnia (CBT-I) is the first-line treatment for long-term trouble sleeping, including during menopause. It works on sleep habits and worried thoughts about sleep, and is available through apps, books and therapists.',
    source: 'American College of Physicians insomnia guideline (2016); The Menopause Society 2023 position statement',
  },
  {
    id: 'vaginal-moisturizer',
    title: 'Vaginal moisturizers, lubricants, and local estrogen',
    symptoms: ['vaginal-dryness', 'low-libido'],
    kind: 'Mainstream',
    evidence: 'well',
    body: 'Regular non-hormonal vaginal moisturizers and lubricants for sex help many women. If they are not enough, low-dose vaginal estrogen is very effective and acts mostly in the local tissue. Ask your doctor, since dryness often gets worse over time without treatment.',
    source: 'ACOG; The Menopause Society',
  },
  {
    id: 'bleeding-doctor',
    title: 'When irregular bleeding is worth a doctor visit',
    symptoms: ['heavy-bleeding', 'spotting', 'cycle-change'],
    kind: 'Mainstream',
    evidence: 'well',
    body: 'Irregular cycles are common in perimenopause. See a doctor if you soak through a pad or tampon every hour for several hours, bleed for more than 7 days, have periods closer than 21 days apart, bleed after sex, or bleed after 12 months with no period. Heavy bleeding can also cause iron deficiency, which a simple blood test can check.',
    source: 'ACOG: Abnormal Uterine Bleeding',
  },
  {
    id: 'palpitations-check',
    title: 'Heart palpitations: when to get checked',
    symptoms: ['palpitations'],
    kind: 'Mainstream',
    evidence: 'well',
    body: 'Brief fluttering or a racing heart can happen with hormone shifts, caffeine, stress or poor sleep, and is often harmless. Get it checked if it is frequent or lasts a long time, or comes with chest pain, shortness of breath, dizziness or fainting. If any of those happen, seek urgent care.',
    source: 'American Heart Association; The Menopause Society',
  },

  // ---- bones, protein, nutrients ----
  {
    id: 'calcium-d',
    title: 'Calcium and vitamin D for your bones',
    symptoms: ['joint-aches', 'fatigue'],
    kind: 'Nutrition',
    evidence: 'well',
    body: 'Bone loss speeds up around menopause. Adults 51 and older are advised about 1,200 mg of calcium a day (food first: dairy, fortified plant milks, canned fish with bones, leafy greens) and 600 IU of vitamin D (800 IU after 70). Weight-bearing exercise matters too. More is not better: very high calcium or vitamin D supplements can cause harm.',
    safety: 'Supplements can interact with some medicines (for example thyroid and some antibiotics). ' + 'Ask a doctor or pharmacist if you take any medication.',
    source: 'NIH Office of Dietary Supplements: Calcium and Vitamin D fact sheets',
  },
  {
    id: 'protein',
    title: 'Enough protein, spread through the day',
    symptoms: ['fatigue', 'weight', 'joint-aches'],
    kind: 'Nutrition',
    evidence: 'some',
    body: 'Muscle and bone mass decline with age and after menopause. Eating protein at each meal (eggs, fish, poultry, beans, tofu, Greek yogurt) together with strength training helps preserve muscle. Studies are mostly in older adults generally, not menopause specifically, but the advice is low-risk for most people.',
    safety: 'If you have kidney disease, ask your doctor before raising protein.',
    source: 'Menopause Society consumer guidance; reviews of protein and muscle in older adults',
  },
  {
    id: 'magnesium',
    title: 'Magnesium for sleep and cramps',
    symptoms: ['poor-sleep', 'cramps', 'headache'],
    kind: 'Nutrition',
    evidence: 'some',
    body: 'Magnesium-rich foods (nuts, seeds, beans, whole grains, leafy greens) are a good habit. Small studies suggest magnesium may help period cramps and sleep a little, but results are mixed. Food first. If you try a supplement, keep to the label dose.',
    safety: 'Supplements can cause diarrhea and are risky with kidney problems; they can interact with some antibiotics and osteoporosis medicines. ' + 'Check with a doctor or pharmacist if you take medications.',
    source: 'NIH Office of Dietary Supplements: Magnesium; Cochrane review of magnesium for dysmenorrhea',
  },
  {
    id: 'caffeine-alcohol-hot',
    title: 'Notice caffeine and alcohol as hot flash triggers',
    symptoms: ['hot-flashes', 'night-sweats'],
    kind: 'Nutrition',
    evidence: 'some',
    body: 'Many women find caffeine, alcohol, spicy food and hot drinks bring on a hot flash. Studies on triggers are mixed, so it varies from person to person. Try keeping a note on bad days and see whether cutting back on one thing makes a difference for you.',
    source: 'The Menopause Society patient information; observational studies',
  },
  {
    id: 'caffeine-alcohol-sleep',
    title: 'Caffeine and alcohol and your sleep',
    symptoms: ['poor-sleep', 'night-sweats', 'anxiety', 'palpitations'],
    kind: 'Nutrition',
    evidence: 'well',
    body: 'Caffeine can stay in your body for 6 or more hours, and alcohol may help you fall asleep but breaks up sleep later in the night. Moving caffeine to the morning and keeping alcohol away from bedtime is one of the simplest things to try for sleep, anxiety and a racing heart.',
    source: 'Sleep Foundation / American Academy of Sleep Medicine; NIAAA',
  },
  {
    id: 'omega3',
    title: 'Omega-3s: fish, and what supplements do (and do not) do',
    symptoms: ['sadness', 'mood-swings', 'brain-fog', 'hot-flashes'],
    kind: 'Nutrition',
    evidence: 'some',
    body: 'Eating fatty fish (salmon, sardines, trout) twice a week is well supported for heart health, which matters after menopause. Omega-3 supplements may help mood a little in some studies, but trials in menopause have mostly not found they reduce hot flashes.',
    safety: 'High-dose fish oil can increase bleeding risk with blood thinners. ' + 'Check with a doctor or pharmacist if you take medications.',
    source: 'NIH Office of Dietary Supplements: Omega-3 Fatty Acids; American Heart Association',
  },
  {
    id: 'flax',
    title: 'Ground flaxseed',
    symptoms: ['hot-flashes', 'bloating'],
    kind: 'Nutrition',
    evidence: 'some',
    body: 'Ground flaxseed is a good source of fiber and plant omega-3s, and a spoonful on yogurt or oatmeal is a harmless habit. Studies on whether it eases hot flashes are mixed; one Mayo Clinic trial found no benefit over placebo. Use ground rather than whole seeds, and drink water as you add fiber.',
    source: 'NCCIH: Flaxseed and Flaxseed Oil; Pruthi et al., J Clin Oncol 2012',
  },
  {
    id: 'soy',
    title: 'Soy foods',
    symptoms: ['hot-flashes', 'night-sweats'],
    kind: 'Nutrition',
    evidence: 'some',
    body: 'Soy foods (tofu, edamame, tempeh, soy milk) contain plant compounds that act weakly like estrogen. Some studies show a small reduction in hot flashes, others show none, and it may take a few weeks to notice. Soy foods are generally considered safe as part of a normal diet.',
    safety: 'If you have had a hormone-sensitive cancer, or take thyroid medication, ask your doctor before using soy supplements or large amounts.',
    source: 'NCCIH: Soy; Cochrane review of phytoestrogens for menopausal symptoms (Lethaby 2013)',
  },

  // ---- herbs / supplements ----
  {
    id: 'black-cohosh',
    title: 'Black cohosh',
    symptoms: ['hot-flashes', 'night-sweats', 'mood-swings'],
    kind: 'Herbal',
    evidence: 'some',
    body: 'A popular herb for hot flashes. Studies give mixed results: some show a small benefit, many show none. Professional guidelines do not recommend relying on it.',
    safety: 'Rare cases of liver problems have been reported. Stop and call a doctor if you notice dark urine, yellow skin or eyes, or severe stomach pain. Not for people with liver disease. ' + MED_NOTE,
    source: 'NCCIH: Black Cohosh; The Menopause Society 2023 position statement',
  },
  {
    id: 'red-clover',
    title: 'Red clover',
    symptoms: ['hot-flashes'],
    kind: 'Herbal',
    evidence: 'trad',
    body: 'Red clover contains plant estrogen-like compounds and is sold for hot flashes. Most trials have not found it works better than placebo.',
    safety: 'Because it acts like estrogen, avoid it if you have had a hormone-sensitive cancer. It may increase bleeding with blood thinners. ' + MED_NOTE,
    source: 'NCCIH: Red Clover',
  },
  {
    id: 'evening-primrose',
    title: 'Evening primrose oil',
    symptoms: ['hot-flashes', 'breast-tenderness', 'skin-hair'],
    kind: 'Herbal',
    evidence: 'trad',
    body: 'Commonly used for hot flashes and breast tenderness. The small trials so far have not found a clear benefit over placebo for hot flashes, and the evidence for breast tenderness is weak.',
    safety: 'Can cause stomach upset and headache. Possible interactions with blood thinners and some seizure and psychiatric medicines. ' + MED_NOTE,
    source: 'NCCIH: Evening Primrose Oil; Chenoy et al., BMJ 1994',
  },
  {
    id: 'ashwagandha',
    title: 'Ashwagandha',
    symptoms: ['anxiety', 'poor-sleep', 'fatigue'],
    kind: 'Herbal',
    evidence: 'some',
    body: 'An Ayurvedic herb. Several small, short trials suggest it may lower stress and anxiety and help sleep a little. Long-term safety is not well known.',
    safety: 'There have been reports of liver injury. It can affect thyroid levels and may interact with thyroid, sedative, diabetes, blood pressure and immune-suppressing medicines. Avoid in pregnancy. ' + MED_NOTE,
    source: 'NCCIH: Ashwagandha; NIH Office of Dietary Supplements',
  },
  {
    id: 'st-johns-wort',
    title: 'St. John’s wort: a caution',
    symptoms: ['sadness', 'anxiety', 'mood-swings'],
    kind: 'Herbal',
    evidence: 'some',
    body: 'Sometimes used for low mood. It helps some people with mild depression, but it is one of the herbs most likely to cause drug interactions.',
    safety: 'It interacts with many medicines, including birth control pills and antidepressants (it can cause serious reactions with the latter), blood thinners and many others. Do not start it without checking with a doctor or pharmacist.',
    source: 'NCCIH: St. John’s Wort and Depression',
  },

  // ---- body / mind ----
  {
    id: 'heat-cramps',
    title: 'Heat for cramps',
    symptoms: ['cramps', 'bloating'],
    kind: 'Self-care',
    evidence: 'some',
    body: 'A heating pad or hot water bottle on the lower belly can ease period-type cramps, and in small studies worked about as well as over-the-counter pain relievers. It is low-risk. Use a cloth layer and avoid falling asleep on a heating pad.',
    source: 'ACOG: Dysmenorrhea; Jo & Lee, Sci Rep 2018 (heat therapy review)',
  },
  {
    id: 'movement-cramps',
    title: 'Gentle movement for cramps, mood and sleep',
    symptoms: ['cramps', 'bloating', 'sadness', 'anxiety', 'poor-sleep', 'fatigue', 'joint-aches'],
    kind: 'Self-care',
    evidence: 'some',
    body: 'Walking, stretching, yoga or swimming may reduce cramps and bloating, and regular exercise is linked with better mood and sleep. It does not reliably stop hot flashes, but it supports bones, heart and muscle. Even 10 minutes counts on rough days.',
    source: 'Cochrane review: Exercise for dysmenorrhoea (2019); Physical Activity Guidelines for Americans',
  },
  {
    id: 'breathing',
    title: 'Slow breathing for anxiety',
    symptoms: ['anxiety', 'rage', 'mood-swings', 'palpitations', 'poor-sleep'],
    kind: 'Self-care',
    evidence: 'some',
    body: 'Try breathing in through the nose for 4 seconds and out slowly for 6, for a few minutes. Slow breathing can lower stress and a racing feeling in the moment, with a small benefit for anxiety in studies. It has not been shown to reduce hot flashes.',
    source: 'Zaccaro et al., Front Hum Neurosci 2018 (slow breathing review); The Menopause Society 2023 position statement',
  },
  {
    id: 'cool-layers',
    title: 'Keep cool: layers, fans, a cooler bedroom',
    symptoms: ['hot-flashes', 'night-sweats', 'poor-sleep'],
    kind: 'Self-care',
    evidence: 'trad',
    body: 'Dressing in layers, keeping a fan or cold drink handy, and a cool, dark bedroom with breathable bedding are common-sense tips women find practical. Research on them is limited, but they carry no risk.',
    source: 'The Menopause Society patient guidance',
  },
];

export function tipsFor(symptomIds, limit = 3, seed = 0) {
  const ids = new Set(symptomIds);
  const scored = TIPS.map((t) => ({
    tip: t,
    score: t.symptoms.filter((s) => ids.has(s)).length * 10 - EVIDENCE_RANK[t.evidence],
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  // Rotate among equally-scored tips so she doesn't always see the same ones.
  const out = [];
  const pool = [...scored];
  while (out.length < limit && pool.length) {
    const top = pool[0].score;
    const tied = pool.filter((p) => p.score === top);
    const pick = tied[seed % tied.length];
    out.push(pick.tip);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

const EVIDENCE_RANK = { well: 0, some: 1, trad: 2 };
