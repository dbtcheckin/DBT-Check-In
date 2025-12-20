import React, { useState, useEffect } from 'react';

/**
 * DBT Voice Diary - Complete Unified Prototype
 * 
 * Combines:
 * - Live diary card filling during voice recording
 * - Full home screen with week view
 * - Session prep with patterns & discussion topics
 * - Weekly summary with emotions & skills
 * - AI completion partner (editorial style)
 * - Notifications demo
 * - Skills library access
 * - "Quiet Strength" design language
 * 
 * All fields from official Linehan DBT Diary Card
 */

// ============================================
// DESIGN TOKENS
// ============================================
const tokens = {
  colors: {
    slate: {
      900: '#1a1d21',
      800: '#24282e',
      700: '#2e333a',
      600: '#3a4049',
      500: '#4a515c',
    },
    offWhite: '#f5f4f2',
    warmClay: '#c4a67c',
    warmClayMuted: 'rgba(196, 166, 124, 0.15)',
    warmClayGlow: 'rgba(196, 166, 124, 0.25)',
    
    emotions: {
      anger: '#c97b6b',
      shame: '#c97b6b',
      anxiety: '#b8a45c',
      joy: '#7d9b84',
      sadness: '#7c85a6',
      misery: '#8b7355',
    },
    
    text: {
      primary: '#f5f4f2',
      secondary: 'rgba(245, 244, 242, 0.6)',
      tertiary: 'rgba(245, 244, 242, 0.4)',
      ghost: 'rgba(245, 244, 242, 0.15)',
    },
    
    success: '#7d9b84',
    warning: '#b8a45c',
    danger: '#c97b6b',
  },
  
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  typography: {
    serif: '"Source Serif 4", Georgia, serif',
    sans: '"Inter", -apple-system, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", monospace',
  },
};

// ============================================
// DIARY CARD FIELD DEFINITIONS
// ============================================
const DIARY_FIELDS = {
  urges: [
    { id: 'suicide', label: 'Suicide', scale: 5 },
    { id: 'self_harm', label: 'Self-Harm', scale: 5 },
    { id: 'drugs', label: 'Drugs', scale: 5 },
  ],
  emotions: [
    { id: 'anxiety', label: 'Anxiety', color: tokens.colors.emotions.anxiety },
    { id: 'sadness', label: 'Sadness', color: tokens.colors.emotions.sadness },
    { id: 'anger', label: 'Anger', color: tokens.colors.emotions.anger },
    { id: 'shame', label: 'Shame', color: tokens.colors.emotions.shame },
    { id: 'joy', label: 'Joy', color: tokens.colors.emotions.joy },
    { id: 'misery', label: 'Misery', color: tokens.colors.emotions.misery },
  ],
  actions: [
    { id: 'self_harm_action', label: 'Self-Harm', type: 'boolean' },
    { id: 'lied', label: 'Lied', type: 'boolean' },
    { id: 'used_skills', label: 'Skills Used', scale: 7 },
  ],
  substances: [
    { id: 'alcohol', label: 'Alcohol', type: 'text' },
    { id: 'illegal_drugs', label: 'Drugs', type: 'text' },
    { id: 'meds_prescribed', label: 'Meds Rx\'d', type: 'boolean' },
  ],
  skills: {
    mindfulness: [
      { id: 'wise_mind', label: 'Wise Mind' },
      { id: 'observe', label: 'Observe' },
      { id: 'describe', label: 'Describe' },
      { id: 'participate', label: 'Participate' },
      { id: 'nonjudgmental', label: 'Nonjudgmental' },
      { id: 'one_mindful', label: 'One-Mindful' },
      { id: 'effective', label: 'Effective' },
    ],
    interpersonal: [
      { id: 'dear', label: 'DEAR' },
      { id: 'man', label: 'MAN' },
      { id: 'give', label: 'GIVE' },
      { id: 'fast', label: 'FAST' },
      { id: 'dialectics', label: 'Dialectics' },
      { id: 'validation', label: 'Validation' },
      { id: 'behavior_change', label: 'Behavior Change' },
    ],
    emotion_regulation: [
      { id: 'check_facts', label: 'Check Facts' },
      { id: 'opposite_action', label: 'Opposite Action' },
      { id: 'problem_solve', label: 'Problem Solve' },
      { id: 'accumulate_positive', label: 'Accumulate +' },
      { id: 'build_mastery', label: 'Build Mastery' },
      { id: 'cope_ahead', label: 'Cope Ahead' },
      { id: 'please', label: 'PLEASE' },
      { id: 'mindful_emotion', label: 'Mindful Emotion' },
    ],
    distress_tolerance: [
      { id: 'stop', label: 'STOP' },
      { id: 'pros_cons', label: 'Pros & Cons' },
      { id: 'tip', label: 'TIP' },
      { id: 'distract', label: 'Distract' },
      { id: 'self_soothe', label: 'Self-Soothe' },
      { id: 'improve', label: 'IMPROVE' },
      { id: 'radical_acceptance', label: 'Radical Accept' },
      { id: 'half_smile', label: 'Half-Smile' },
      { id: 'willing_hands', label: 'Willing Hands' },
      { id: 'willingness', label: 'Willingness' },
    ],
  },
};

// ============================================
// DETECTION PATTERNS
// ============================================
const DETECTION_PATTERNS = {
  emotions: {
    anger: /\b(angry|furious|rage|mad|pissed|irritated|annoyed)\b/i,
    anxiety: /\b(anxious|worried|nervous|panic|stressed|tense|scared)\b/i,
    sadness: /\b(sad|depressed|down|hopeless|low|blue|crying)\b/i,
    joy: /\b(happy|joy|good|great|excited|pleased|content)\b/i,
    shame: /\b(shame|ashamed|embarrassed|guilty|humiliated)\b/i,
    misery: /\b(misery|miserable|awful|terrible|suffering)\b/i,
  },
  urges: {
    self_harm: /\b(cut|cutting|hurt myself|self.?harm|burn|scratch)\b/i,
    suicide: /\b(kill myself|suicide|suicidal|end it)\b/i,
    drugs: /\b(drink|drunk|high|using|relapse|craving)\b/i,
  },
  skills: {
    stop: /\bSTOP\b|stopped (myself|before)/i,
    tip: /\b(TIP|cold water|ice|paced breathing|breathing exercise)\b/i,
    opposite_action: /\b(opposite action|made myself|forced myself|went anyway)\b/i,
    dear: /\bDEAR\b/i,
    man: /\bMAN\b/i,
    give: /\bGIVE\b/i,
    fast: /\bFAST\b/i,
    check_facts: /\b(check.*(the )?facts|checked facts)\b/i,
    radical_acceptance: /\b(radical acceptance|radically accept)\b/i,
    wise_mind: /\b(wise mind|wisemind)\b/i,
    distract: /\b(distract|distraction|ACCEPTS)\b/i,
    self_soothe: /\b(self.?sooth|comfort)\b/i,
    problem_solve: /\b(problem.?solv|figured out)\b/i,
  },
  intensity: {
    high: /\b(really|very|so|extremely|incredibly)\b/i,
    medium: /\b(pretty|somewhat|fairly|kind of)\b/i,
    low: /\b(a little|slightly|barely|mild)\b/i,
  },
};

// ============================================
// MAIN APP
// ============================================
const DBTVoiceDiaryApp = () => {
  const [screen, setScreen] = useState('home');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [completionStep, setCompletionStep] = useState(0);
  
  // Card data
  const [cardData, setCardData] = useState({
    urges: {}, emotions: {}, actions: {}, substances: {}, skills: {},
  });
  const [glowingFields, setGlowingFields] = useState(new Set());
  const [uncertainFields, setUncertainFields] = useState(new Set());
  const [pendingQuestions, setPendingQuestions] = useState([]);
  
  // Demo data
  const weekData = [
    { day: 'M', complete: true, peak: { anxiety: 3, anger: 4 } },
    { day: 'T', complete: true, peak: { anxiety: 4, sadness: 3 } },
    { day: 'W', complete: true, peak: { anxiety: 4, anger: 3 } },
    { day: 'T', complete: true, peak: { anxiety: 2, joy: 3 } },
    { day: 'F', complete: false, peak: {} },
    { day: 'S', complete: true, peak: { joy: 4, anxiety: 1 } },
    { day: 'S', complete: false, peak: {} },
  ];

  const demoTranscript = "Today was rough. Had another fight with my mom on the phone. I was so angry I wanted to scream. The anxiety was pretty bad too, maybe a 4. I had some urges to cut but didn't act on them, maybe a 2. But I used that STOP skill before I said something I'd regret. Did some paced breathing after. Felt like isolating all afternoon but made myself go to the grocery store instead. Didn't drink or anything.";

  const completionQuestions = [
    { id: 'sadness', question: 'Any sadness come up today?', subtext: 'You mentioned the day was rough', type: 'scale', scale: 5 },
    { id: 'skill_helped', question: 'The STOP skill you used — did it help?', subtext: 'Before you said something you\'d regret', type: 'effectiveness' },
    { id: 'opposite_action', question: 'Going to the store when you wanted to isolate — that\'s Opposite Action.', subtext: 'Should I log that skill?', type: 'confirm' },
  ];

  // Effects
  useEffect(() => {
    let interval;
    if (isRecording) interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setAudioLevel(0.2 + Math.random() * 0.6), 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || screen !== 'recording') return;
    const words = demoTranscript.split(' ');
    let idx = 0, text = '';
    const interval = setInterval(() => {
      if (idx < words.length) {
        text += (text ? ' ' : '') + words[idx];
        setLiveTranscript(text);
        detectFields(text);
        idx++;
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording, screen]);

  const detectFields = (text) => {
    const newData = { ...cardData };
    const newGlow = new Set();
    const newUncertain = new Set();

    Object.entries(DETECTION_PATTERNS.emotions).forEach(([emo, pattern]) => {
      const match = text.match(pattern);
      if (match && !newData.emotions[emo]) {
        const ctx = text.substring(Math.max(0, match.index - 50), match.index + 50);
        const numMatch = ctx.match(/(\d)\s*(out of|\/)\s*5/) || ctx.match(/maybe a (\d)/);
        let val = numMatch ? parseInt(numMatch[1]) : 
          DETECTION_PATTERNS.intensity.high.test(ctx) ? 4 :
          DETECTION_PATTERNS.intensity.medium.test(ctx) ? 3 : null;
        newData.emotions[emo] = { value: val, detected: true };
        newGlow.add(`emotions.${emo}`);
        if (val === null) newUncertain.add(`emotions.${emo}`);
      }
    });

    Object.entries(DETECTION_PATTERNS.urges).forEach(([urge, pattern]) => {
      const match = text.match(pattern);
      if (match && !newData.urges[urge]) {
        const ctx = text.substring(Math.max(0, match.index - 50), match.index + 50);
        const numMatch = ctx.match(/(\d)\s*(out of|\/)\s*5/) || ctx.match(/maybe a (\d)/);
        const val = numMatch ? parseInt(numMatch[1]) : null;
        newData.urges[urge] = { value: val, detected: true };
        newGlow.add(`urges.${urge}`);
        if (val === null) newUncertain.add(`urges.${urge}`);
      }
    });

    Object.entries(DETECTION_PATTERNS.skills).forEach(([skill, pattern]) => {
      if (pattern.test(text) && !newData.skills[skill]) {
        newData.skills[skill] = { used: true, detected: true };
        newGlow.add(`skills.${skill}`);
      }
    });

    if (/didn't (drink|have any)|no (alcohol|drinks)|sober/.test(text) && !newData.substances.alcohol) {
      newData.substances.alcohol = { value: 'none', detected: true };
      newGlow.add('substances.alcohol');
    }

    setCardData(newData);
    setGlowingFields(newGlow);
    setUncertainFields(newUncertain);
    setTimeout(() => setGlowingFields(new Set()), 800);
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setLiveTranscript('');
    setCardData({ urges: {}, emotions: {}, actions: {}, substances: {}, skills: {} });
    setGlowingFields(new Set());
    setUncertainFields(new Set());
    setCompletionStep(0);
    setScreen('recording');
  };

  const stopRecording = () => {
    setIsRecording(false);
    setPendingQuestions(completionQuestions);
    setCompletionStep(0);
    setTimeout(() => setScreen('completion'), 600);
  };

  const handleAnswer = (value) => {
    if (completionStep < pendingQuestions.length - 1) {
      setCompletionStep(prev => prev + 1);
    } else {
      setScreen('review');
    }
  };

  // ============================================
  // COMPONENTS
  // ============================================
  
  const BreathingOrb = ({ level, isActive, size = 'large' }) => {
    const baseSize = size === 'large' ? 120 : 80;
    const s = baseSize + level * (size === 'large' ? 25 : 15);
    return (
      <div style={{
        width: s, height: s, borderRadius: '50%',
        background: isActive
          ? `radial-gradient(circle at 35% 35%, ${tokens.colors.slate[600]}, ${tokens.colors.slate[800]})`
          : `radial-gradient(circle at 35% 35%, ${tokens.colors.slate[700]}, ${tokens.colors.slate[900]})`,
        boxShadow: isActive ? `0 0 ${25 + level * 20}px ${tokens.colors.warmClayGlow}` : 'none',
        transition: 'all 150ms ease-out',
      }} />
    );
  };

  const FieldCell = ({ label, value, isGlowing, isUncertain, type = 'scale' }) => {
    const hasVal = value !== undefined && value !== null;
    const display = type === 'boolean' ? (value === true ? 'Y' : value === false ? 'N' : '—') : (hasVal ? value : '—');
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 0',
        background: isGlowing ? tokens.colors.warmClayGlow : 'transparent',
        margin: '0 -8px', padding: '6px 8px', borderRadius: 4,
        transition: 'all 300ms ease-out',
      }}>
        <span style={{ fontFamily: tokens.typography.sans, fontSize: 12, color: hasVal ? tokens.colors.text.secondary : tokens.colors.text.ghost }}>{label}</span>
        <span style={{
          fontFamily: tokens.typography.mono, fontSize: 13, minWidth: 20, textAlign: 'right',
          color: isUncertain ? tokens.colors.warmClay : hasVal ? tokens.colors.text.primary : tokens.colors.text.ghost,
          fontWeight: hasVal ? 500 : 400,
        }}>{isUncertain ? '?' : display}</span>
      </div>
    );
  };

  const SkillDot = ({ id, label, used, isGlowing }) => (
    <div title={label} style={{
      width: 18, height: 18, borderRadius: 3,
      background: used ? tokens.colors.warmClay : tokens.colors.slate[700],
      border: isGlowing ? `2px solid ${tokens.colors.warmClay}` : '2px solid transparent',
      boxShadow: isGlowing ? `0 0 8px ${tokens.colors.warmClayGlow}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 300ms ease-out', cursor: 'default',
    }}>
      {used && <span style={{ color: tokens.colors.slate[900], fontSize: 10, fontWeight: 700 }}>✓</span>}
    </div>
  );

  const LiveDiaryCard = () => (
    <div style={{ background: tokens.colors.slate[800], borderRadius: 12, padding: 14 }}>
      <div style={{ textAlign: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${tokens.colors.slate[700]}` }}>
        <span style={{ fontFamily: tokens.typography.mono, fontSize: 10, color: tokens.colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1 }}>
          DBT Diary Card — Sunday
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontFamily: tokens.typography.sans, fontSize: 9, color: tokens.colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Urges (0-5)</div>
          {DIARY_FIELDS.urges.map(f => (
            <FieldCell key={f.id} label={f.label} value={cardData.urges[f.id]?.value} isGlowing={glowingFields.has(`urges.${f.id}`)} isUncertain={uncertainFields.has(`urges.${f.id}`)} />
          ))}
        </div>
        <div>
          <div style={{ fontFamily: tokens.typography.sans, fontSize: 9, color: tokens.colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Emotions (0-5)</div>
          {DIARY_FIELDS.emotions.map(f => (
            <FieldCell key={f.id} label={f.label} value={cardData.emotions[f.id]?.value} isGlowing={glowingFields.has(`emotions.${f.id}`)} isUncertain={uncertainFields.has(`emotions.${f.id}`)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${tokens.colors.slate[700]}` }}>
        <div>
          <div style={{ fontFamily: tokens.typography.sans, fontSize: 9, color: tokens.colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Actions</div>
          {DIARY_FIELDS.actions.map(f => (
            <FieldCell key={f.id} label={f.label} value={cardData.actions[f.id]?.value} isGlowing={glowingFields.has(`actions.${f.id}`)} type={f.type} />
          ))}
        </div>
        <div>
          <div style={{ fontFamily: tokens.typography.sans, fontSize: 9, color: tokens.colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Substances</div>
          {DIARY_FIELDS.substances.map(f => (
            <FieldCell key={f.id} label={f.label} value={cardData.substances[f.id]?.value === 'none' ? 'N' : cardData.substances[f.id]?.value ? 'Y' : undefined} isGlowing={glowingFields.has(`substances.${f.id}`)} type="boolean" />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${tokens.colors.slate[700]}` }}>
        <div style={{ fontFamily: tokens.typography.sans, fontSize: 9, color: tokens.colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Skills Used</div>
        {Object.entries(DIARY_FIELDS.skills).map(([module, skills]) => (
          <div key={module} style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: tokens.typography.sans, fontSize: 8, color: tokens.colors.text.ghost, marginBottom: 4, textTransform: 'capitalize' }}>{module.replace('_', ' ')}</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {skills.map(s => <SkillDot key={s.id} {...s} used={cardData.skills[s.id]?.used} isGlowing={glowingFields.has(`skills.${s.id}`)} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ScaleInput = ({ max = 5, onSelect }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
      {Array.from({ length: max + 1 }, (_, i) => (
        <button key={i} onClick={() => onSelect(i)} style={{
          width: 44, height: 44, borderRadius: 8, background: tokens.colors.slate[700], border: 'none',
          color: tokens.colors.text.primary, fontFamily: tokens.typography.mono, fontSize: 17, fontWeight: 500, cursor: 'pointer',
        }}>{i}</button>
      ))}
    </div>
  );

  const EffectivenessInput = ({ onSelect }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[{ v: 5, l: 'Yes, it helped' }, { v: 4, l: 'Tried, didn\'t help much' }, { v: 3, l: 'Tried but couldn\'t do it' }].map(o => (
        <button key={o.v} onClick={() => onSelect(o.v)} style={{
          padding: '14px 18px', background: tokens.colors.slate[700], borderRadius: 10, border: 'none',
          color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 15, cursor: 'pointer', textAlign: 'left',
        }}>{o.l}</button>
      ))}
    </div>
  );

  // ============================================
  // SCREENS
  // ============================================

  const HomeScreen = () => (
    <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg }}>
      <div style={{ marginBottom: tokens.spacing.xl }}>
        <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 14, marginBottom: 4 }}>Sunday, January 19</p>
        <h1 style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 28, fontWeight: 400, margin: 0 }}>Diary</h1>
      </div>

      <button onClick={startRecording} style={{
        width: '100%', padding: '28px 20px', background: tokens.colors.slate[800], borderRadius: 16,
        border: `1px solid ${tokens.colors.slate[600]}`, marginBottom: tokens.spacing.lg, cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: tokens.colors.warmClayMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: tokens.colors.warmClay }} />
          </div>
          <div>
            <p style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 16, fontWeight: 500, margin: 0 }}>Record today</p>
            <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 13, margin: 0, marginTop: 2 }}>Watch your diary card fill as you speak</p>
          </div>
        </div>
      </button>

      <div style={{ marginBottom: tokens.spacing.lg }}>
        <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 12, marginBottom: tokens.spacing.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>This week</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {weekData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 11 }}>{d.day}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: d.complete ? tokens.colors.slate[700] : 'transparent',
                border: d.complete ? 'none' : `1px solid ${tokens.colors.slate[700]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.complete && <span style={{ color: tokens.colors.success, fontSize: 12 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: tokens.spacing.lg }}>
        <button onClick={() => setScreen('weekly')} style={{ flex: 1, padding: '16px 14px', background: tokens.colors.slate[800], borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <p style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14, fontWeight: 500, margin: 0 }}>Week summary</p>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 12, margin: 0, marginTop: 3 }}>5 of 7 days</p>
        </button>
        <button onClick={() => setScreen('session_prep')} style={{ flex: 1, padding: '16px 14px', background: tokens.colors.slate[800], borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <p style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14, fontWeight: 500, margin: 0 }}>Session prep</p>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 12, margin: 0, marginTop: 3 }}>Tomorrow 3pm</p>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: tokens.spacing.lg }}>
        <button onClick={() => setScreen('skills')} style={{ flex: 1, padding: '16px 14px', background: tokens.colors.slate[800], borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <p style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14, fontWeight: 500, margin: 0 }}>Skills library</p>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 12, margin: 0, marginTop: 3 }}>32 DBT skills</p>
        </button>
        <button onClick={() => setScreen('notifications')} style={{ flex: 1, padding: '16px 14px', background: tokens.colors.slate[800], borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <p style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14, fontWeight: 500, margin: 0 }}>Notifications</p>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 12, margin: 0, marginTop: 3 }}>Demo all types</p>
        </button>
      </div>

      <div style={{ padding: tokens.spacing.md, background: tokens.colors.slate[800], borderRadius: 10, borderLeft: `3px solid ${tokens.colors.warmClay}` }}>
        <p style={{ color: tokens.colors.text.secondary, fontFamily: tokens.typography.serif, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          STOP appeared three times this week when anger spiked. It seems to be helping with the conflicts.
        </p>
      </div>
    </div>
  );

  const RecordingScreen = () => (
    <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: 14, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => { setScreen('home'); setIsRecording(false); }} style={{ background: 'none', border: 'none', color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer', padding: 0 }}>Cancel</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.colors.danger, animation: 'pulse 2s infinite' }} />
          <span style={{ color: tokens.colors.text.secondary, fontFamily: tokens.typography.mono, fontSize: 13 }}>{formatTime(recordingTime)}</span>
        </div>
      </div>

      <LiveDiaryCard />

      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <BreathingOrb level={audioLevel} isActive={isRecording} size="small" />
      </div>

      <div style={{ flex: 1, background: tokens.colors.slate[800], borderRadius: 10, padding: 14, marginBottom: 12, minHeight: 70, maxHeight: 100, overflow: 'auto' }}>
        <p style={{ color: liveTranscript ? tokens.colors.text.primary : tokens.colors.text.tertiary, fontFamily: tokens.typography.serif, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {liveTranscript || 'Speak about your day...'}
          {liveTranscript && <span style={{ display: 'inline-block', width: 2, height: 14, background: tokens.colors.warmClay, marginLeft: 2, animation: 'blink 1s infinite' }} />}
        </p>
      </div>

      <button onClick={stopRecording} style={{
        width: '100%', padding: '14px', background: tokens.colors.slate[700], borderRadius: 10, border: 'none',
        color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: tokens.colors.danger }} />
        Done
      </button>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );

  const CompletionScreen = () => {
    const q = pendingQuestions[completionStep];
    if (!q) return null;
    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: tokens.spacing.xl }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer', padding: 0 }}>Cancel</button>
            <span style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.mono, fontSize: 12 }}>{completionStep + 1} / {pendingQuestions.length}</span>
          </div>
          <div style={{ height: 2, background: tokens.colors.slate[700], borderRadius: 1 }}>
            <div style={{ height: '100%', width: `${((completionStep + 1) / pendingQuestions.length) * 100}%`, background: tokens.colors.warmClay, borderRadius: 1, transition: 'width 300ms' }} />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 80 }}>
          <h2 style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 22, fontWeight: 400, lineHeight: 1.4, margin: 0, marginBottom: q.subtext ? 8 : 28, textAlign: 'center' }}>{q.question}</h2>
          {q.subtext && <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 13, margin: 0, marginBottom: 28, textAlign: 'center' }}>{q.subtext}</p>}
          
          {q.type === 'scale' && <ScaleInput max={q.scale} onSelect={handleAnswer} />}
          {q.type === 'effectiveness' && <EffectivenessInput onSelect={handleAnswer} />}
          {q.type === 'confirm' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleAnswer(true)} style={{ flex: 1, padding: '14px', background: tokens.colors.success, borderRadius: 10, border: 'none', color: tokens.colors.slate[900], fontFamily: tokens.typography.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Yes, log it</button>
              <button onClick={() => handleAnswer(false)} style={{ flex: 1, padding: '14px', background: tokens.colors.slate[700], borderRadius: 10, border: 'none', color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 15, cursor: 'pointer' }}>Skip</button>
            </div>
          )}
        </div>
        <button onClick={() => handleAnswer(null)} style={{ background: 'none', border: 'none', color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>skip · speak instead</button>
      </div>
    );
  };

  const ReviewScreen = () => {
    const filled = {
      emotions: Object.entries(cardData.emotions).filter(([_, v]) => v?.value != null),
      urges: Object.entries(cardData.urges).filter(([_, v]) => v?.value != null),
      skills: Object.entries(cardData.skills).filter(([_, v]) => v?.used),
    };
    const allSkills = [...DIARY_FIELDS.skills.mindfulness, ...DIARY_FIELDS.skills.interpersonal, ...DIARY_FIELDS.skills.emotion_regulation, ...DIARY_FIELDS.skills.distress_tolerance];

    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer', padding: 0, marginRight: 10 }}>←</button>
          <h1 style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 22, fontWeight: 400, margin: 0 }}>Review</h1>
        </div>

        <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ fontFamily: tokens.typography.sans, fontSize: 10, color: tokens.colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Captured from your entry</div>
          
          {filled.emotions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: tokens.typography.sans, fontSize: 11, color: tokens.colors.text.tertiary, marginBottom: 8 }}>Emotions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {filled.emotions.map(([id, data]) => {
                  const f = DIARY_FIELDS.emotions.find(e => e.id === id);
                  return (
                    <div key={id} style={{ padding: '5px 10px', background: tokens.colors.slate[700], borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: f?.color || tokens.colors.warmClay }} />
                      <span style={{ fontFamily: tokens.typography.sans, fontSize: 12, color: tokens.colors.text.primary }}>{f?.label}</span>
                      <span style={{ fontFamily: tokens.typography.mono, fontSize: 12, color: tokens.colors.text.secondary }}>{data.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filled.urges.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: tokens.typography.sans, fontSize: 11, color: tokens.colors.text.tertiary, marginBottom: 8 }}>Urges</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {filled.urges.map(([id, data]) => {
                  const f = DIARY_FIELDS.urges.find(u => u.id === id);
                  return (
                    <div key={id} style={{ padding: '5px 10px', background: tokens.colors.slate[700], borderRadius: 5 }}>
                      <span style={{ fontFamily: tokens.typography.sans, fontSize: 12, color: tokens.colors.text.primary, marginRight: 6 }}>{f?.label}</span>
                      <span style={{ fontFamily: tokens.typography.mono, fontSize: 12, color: tokens.colors.text.secondary }}>{data.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filled.skills.length > 0 && (
            <div>
              <div style={{ fontFamily: tokens.typography.sans, fontSize: 11, color: tokens.colors.text.tertiary, marginBottom: 8 }}>Skills Used</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {filled.skills.map(([id]) => {
                  const s = allSkills.find(sk => sk.id === id);
                  return (
                    <div key={id} style={{ padding: '5px 10px', background: tokens.colors.warmClayMuted, borderRadius: 5, border: `1px solid ${tokens.colors.warmClayGlow}` }}>
                      <span style={{ fontFamily: tokens.typography.sans, fontSize: 12, color: tokens.colors.warmClay }}>{s?.label || id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => setScreen('saved')} style={{ width: '100%', padding: '14px', background: tokens.colors.warmClay, borderRadius: 10, border: 'none', color: tokens.colors.slate[900], fontFamily: tokens.typography.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
          Save Entry
        </button>
      </div>
    );
  };

  const SavedScreen = () => (
    <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: tokens.colors.slate[800], display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: tokens.spacing.md }}>
        <span style={{ color: tokens.colors.success, fontSize: 22 }}>✓</span>
      </div>
      <p style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 18, margin: 0, marginBottom: 6 }}>Saved</p>
      <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 13, margin: 0, marginBottom: tokens.spacing.xl }}>Entry complete for Sunday</p>
      <button onClick={() => setScreen('home')} style={{ padding: '12px 28px', background: tokens.colors.slate[700], borderRadius: 8, border: 'none', color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer' }}>Done</button>
    </div>
  );

  const WeeklyScreen = () => {
    const emotions = [
      { name: 'anxiety', peak: 4, day: 'Wed', color: tokens.colors.emotions.anxiety },
      { name: 'anger', peak: 4, day: 'Mon', color: tokens.colors.emotions.anger },
      { name: 'sadness', peak: 3, day: 'Tue', color: tokens.colors.emotions.sadness },
      { name: 'joy', peak: 4, day: 'Sat', color: tokens.colors.emotions.joy },
    ];
    const skills = [
      { name: 'STOP', count: 3 },
      { name: 'Opposite Action', count: 2 },
      { name: 'TIP', count: 2 },
    ];

    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer', padding: 0, marginRight: 10 }}>←</button>
          <h1 style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 22, fontWeight: 400, margin: 0 }}>Week of Jan 13–19</h1>
        </div>

        <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 13 }}>Entries completed</span>
            <span style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.mono, fontSize: 13 }}>5 of 7</span>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
            {weekData.map((d, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 1.5, background: d.complete ? tokens.colors.success : tokens.colors.slate[600] }} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Peak emotions</p>
          <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 14 }}>
            {emotions.map((e, i) => (
              <div key={e.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < emotions.length - 1 ? 10 : 0, marginBottom: i < emotions.length - 1 ? 10 : 0, borderBottom: i < emotions.length - 1 ? `1px solid ${tokens.colors.slate[700]}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.color }} />
                  <span style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14, textTransform: 'capitalize' }}>{e.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 12 }}>{e.day}</span>
                  <span style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.mono, fontSize: 14 }}>{e.peak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Skills used</p>
          <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 14 }}>
            {skills.map((s, i) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < skills.length - 1 ? 10 : 0, marginBottom: i < skills.length - 1 ? 10 : 0, borderBottom: i < skills.length - 1 ? `1px solid ${tokens.colors.slate[700]}` : 'none' }}>
                <span style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14 }}>{s.name}</span>
                <span style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.mono, fontSize: 12 }}>{s.count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const SessionPrepScreen = () => (
    <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: tokens.spacing.md }}>
        <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer', padding: 0, marginRight: 10 }}>←</button>
        <div>
          <h1 style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 22, fontWeight: 400, margin: 0 }}>Session prep</h1>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 13, margin: 0, marginTop: 2 }}>Monday, Jan 20 at 3:00 PM</p>
        </div>
      </div>

      <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 14, marginBottom: 14, borderLeft: `3px solid ${tokens.colors.success}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: tokens.colors.success, fontSize: 16 }}>✓</span>
          <div>
            <p style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14, fontWeight: 500, margin: 0 }}>Diary card complete</p>
            <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 12, margin: 0, marginTop: 2 }}>5 of 7 days logged</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Patterns this week</p>
        <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 14 }}>
          {['Anxiety peaked Wednesday after conflict', 'Anger elevated Mon–Wed, improved after', 'Self-harm urges present 4 days (max 2)', 'No urges acted on'].map((item, i) => (
            <p key={i} style={{ color: tokens.colors.text.secondary, fontFamily: tokens.typography.serif, fontSize: 14, lineHeight: 1.5, margin: 0, marginBottom: i < 3 ? 8 : 0 }}>{item}</p>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: tokens.spacing.lg }}>
        <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Possible topics</p>
        <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 14 }}>
          {[
            { type: 'pattern', text: 'Mom conflicts → Anxiety → Anger cycle' },
            { type: 'win', text: 'Used Opposite Action twice when wanted to isolate' },
            { type: 'challenge', text: 'DEAR MAN attempt felt difficult' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 7, background: item.type === 'win' ? tokens.colors.success : item.type === 'challenge' ? tokens.colors.warning : tokens.colors.warmClay }} />
              <p style={{ color: tokens.colors.text.secondary, fontFamily: tokens.typography.serif, fontSize: 14, lineHeight: 1.5, margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <button style={{ width: '100%', padding: '14px', background: tokens.colors.warmClay, borderRadius: 10, border: 'none', color: tokens.colors.slate[900], fontFamily: tokens.typography.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
        Share with therapist
      </button>
    </div>
  );

  const SkillsScreen = () => (
    <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
        <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer', padding: 0, marginRight: 10 }}>←</button>
        <h1 style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 22, fontWeight: 400, margin: 0 }}>Skills Library</h1>
      </div>

      {Object.entries(DIARY_FIELDS.skills).map(([module, skills]) => (
        <div key={module} style={{ marginBottom: 16 }}>
          <p style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{module.replace('_', ' ')}</p>
          <div style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 14 }}>
            {skills.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < skills.length - 1 ? 10 : 0, marginBottom: i < skills.length - 1 ? 10 : 0, borderBottom: i < skills.length - 1 ? `1px solid ${tokens.colors.slate[700]}` : 'none' }}>
                <span style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 14 }}>{s.label}</span>
                <span style={{ color: tokens.colors.text.tertiary, fontSize: 12 }}>→</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const NotificationsScreen = () => {
    const notifications = [
      { type: 'daily', title: 'Daily Reminder', message: 'Ready to capture today? Just speak naturally—I\'ll help fill in the rest.', time: '8:00 PM' },
      { type: 'streak', title: 'Day 5', message: 'Day 5 of logging. Your therapist will have solid data for tomorrow.', time: '8:00 PM' },
      { type: 'missed', title: 'Yesterday', message: 'Yesterday got away from you? Quick 60-second catch-up available.', time: '10:30 AM' },
      { type: 'session', title: 'Session Tomorrow', message: 'Therapy at 3pm tomorrow. Your week summary is ready to review.', time: '6:00 PM' },
      { type: 'skill', title: 'Skill Suggestion', message: 'Things have been intense lately. TIP skills can help in the moment.', time: '2:15 PM' },
      { type: 'positive', title: 'Pattern Noticed', message: 'Opposite Action 3× this week when wanting to isolate. Building that muscle.', time: 'Sun 7pm' },
    ];

    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.slate[900], padding: tokens.spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: tokens.colors.text.secondary, fontFamily: tokens.typography.sans, fontSize: 14, cursor: 'pointer', padding: 0, marginRight: 10 }}>←</button>
          <h1 style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.serif, fontSize: 22, fontWeight: 400, margin: 0 }}>Notification Types</h1>
        </div>

        {notifications.map((n, i) => (
          <div key={i} style={{ background: tokens.colors.slate[800], borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${n.type === 'positive' ? tokens.colors.success : n.type === 'skill' ? tokens.colors.warning : tokens.colors.warmClay}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.sans, fontSize: 13, fontWeight: 500 }}>{n.title}</span>
              <span style={{ color: tokens.colors.text.tertiary, fontFamily: tokens.typography.mono, fontSize: 11 }}>{n.time}</span>
            </div>
            <p style={{ color: tokens.colors.text.secondary, fontFamily: tokens.typography.serif, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{n.message}</p>
          </div>
        ))}
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  const screens = {
    home: HomeScreen,
    recording: RecordingScreen,
    completion: CompletionScreen,
    review: ReviewScreen,
    saved: SavedScreen,
    weekly: WeeklyScreen,
    session_prep: SessionPrepScreen,
    skills: SkillsScreen,
    notifications: NotificationsScreen,
  };

  const CurrentScreen = screens[screen] || HomeScreen;

  return (
    <div style={{ fontFamily: tokens.typography.sans, WebkitFontSmoothing: 'antialiased' }}>
      <CurrentScreen />
    </div>
  );
};

export default DBTVoiceDiaryApp;
