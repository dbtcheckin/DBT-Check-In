# DBT Voice Diary
## Product Requirements Document (PRD)

**Version:** 2.0  
**Date:** January 2025  
**Author:** Product Team  
**Status:** Draft for Review

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2025 | Initial PRD |
| 2.0 | Jan 2025 | Added clinical compliance analysis, design philosophy, updated data model |

---

## Executive Summary

DBT Voice Diary is a voice-first mobile application that transforms the daily Dialectical Behavior Therapy (DBT) diary card from a burdensome form into a natural 90-second voice conversation. The app uses AI to extract structured clinical data from natural speech and acts as a "Diary Card Completion Partner"—filling gaps the way a skilled DBT therapist would.

### The Problem

The DBT diary card is clinically essential but has a critical compliance problem:
- **Form fatigue:** 5-10 minutes of daily checkbox completion
- **Cognitive load:** Requires numerical ratings under emotional distress
- **Incomplete data:** Patients skip fields or entire days
- **Therapist burden:** Sessions spent filling in missed cards rather than treatment

### The Solution

A two-phase voice-first approach:
1. **Phase 1:** Patient speaks naturally about their day (60-90 seconds)
2. **Phase 2:** AI asks targeted follow-up questions to complete the diary card

This mirrors the therapeutic process where a DBT therapist reviews an incomplete card and asks clarifying questions—but happens daily, not weekly.

### Key Metrics

| Metric | Industry Baseline | Target |
|--------|-------------------|--------|
| 30-day retention | 3-4% | >15% |
| Daily completion rate | ~20% | >60% |
| Session duration | 5-10 min | <2 min |
| Therapist share rate | N/A | >30% |

---

## Clinical Foundation

### Source Documents

This PRD is grounded in official DBT clinical materials:
- **DBT Adherence Checklist for Individual Therapy (AC-I)** - Defines clinical adherence standards
- **Linehan DBT Diary Card Template** - The standard diary card format
- **DBT Skills Training Manual, Second Edition** - Comprehensive skills reference

### Clinical Requirements

#### Diary Card is Required (AC-I Item #1)

> "The diary card should be collected and the information (e.g., target behaviors, emotions, skills) tracked on the diary card should be reviewed out loud and used to inform the session agenda."

**If incomplete:**
> "If the C did not complete the diary card, it should either be filled out in session, or the T should ask about target behaviors and skills practice since the last session."

#### Incomplete Cards are a Clinical Issue

From the DBT Skills Training Manual:
> "Not bringing in the diary card (when diary cards are reviewed), or reporting no practice effort or skills application, is viewed as a problem in self-management and is analyzed."

This triggers a **Missing-Links Analysis**—understanding what prevented the expected behavior.

### Implications for Product Design

1. **Daily completion is the expectation**, not optional
2. **All core elements should be tracked**: urges, emotions, skills, behaviors
3. **Incomplete cards are therapy-interfering behavior**—something to analyze, not accept
4. **The app should facilitate completion**, not accept incompleteness

---

## Core Product Concept

### Two-Phase Diary Capture

#### Phase 1: Free Voice Expression
- User speaks naturally about their day
- No interruptions, no prompts during recording
- AI listens and extracts what it can
- **Goal:** Capture the narrative, preserve natural expression

#### Phase 2: AI Completion Partner
- After recording, AI reviews what's missing
- AI asks targeted, conversational follow-up questions
- User responds via voice OR quick taps
- **Goal:** Fill gaps the way a therapist would

### Example Flow

**User's voice entry:**
> "Today was rough. Had another fight with my mom on the phone. I was so angry I wanted to scream. But I did use that STOP skill before I said something I'd regret. Did some breathing after. Felt like isolating all afternoon but made myself go to the grocery store instead."

**AI extraction:**
- ✓ Context: fight with mom
- ✓ Skills: STOP, paced breathing, opposite action (implied)
- ✗ Missing: emotion intensities, urges

**AI follow-up conversation:**
```
AI: "Sounds like a hard day. How intense was that anger—like a 2, or more like a 4?"
User: [taps 4]

AI: "Any urges come up today that were hard to manage?"
User: "Self-harm urges were maybe a 2, didn't act on it"

AI: "Making yourself go to the store when you wanted to isolate—that's Opposite Action. Should I log that?"
User: [taps "Yes, log it"]

AI: "Your card's complete. Nice work today. ✓"
```

---

## Feature Specifications

### F1: Voice Diary Entry (Phase 1)

#### User Flow
1. User opens app → taps "Record Today's Entry"
2. Recording screen displays breathing orb visualization
3. Live transcript appears as user speaks (OpenAI Realtime API)
4. User taps "Done Speaking" when finished
5. Brief processing indicator (1-2 seconds)
6. Transition to Phase 2

#### Technical Requirements

| Component | Technology | Notes |
|-----------|------------|-------|
| Audio capture | WebRTC / Native | 24kHz PCM16 format |
| Transcription | OpenAI Realtime API | `gpt-4o-transcribe` model |
| Streaming | WebSocket | Real-time delta events |
| Visualization | Web Audio API | AnalyserNode for levels |

#### OpenAI Realtime API Integration

```javascript
// Session configuration
{
  type: 'session.update',
  session: {
    type: 'transcription',
    input_audio_transcription: {
      model: 'gpt-4o-transcribe',
    },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      silence_duration_ms: 1500,
    }
  }
}

// Listen for streaming transcription
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'conversation.item.input_audio_transcription.delta') {
    // Update live transcript immediately
    appendTranscript(data.delta);
  }
  
  if (data.type === 'conversation.item.input_audio_transcription.completed') {
    // Process complete transcript
    processForExtraction(data.transcript);
  }
};
```

#### Visual Design

**Recording Screen Elements:**
- Breathing orb (responds to audio levels)
- Recording timer
- Phase indicator (1 of 2)
- Live transcript (auto-scrolling)
- "Done Speaking" button

**Breathing Orb Behavior:**
- Base size: 120px
- Expands with audio level (max +50px)
- Pulsing glow effect
- Color: Indigo gradient (#4f46e5 → #818cf8)

---

### F2: AI Completion Partner (Phase 2)

#### Extraction Logic

The AI processes the transcript to extract structured diary card data:

```javascript
// Extraction prompt
const extractionPrompt = `
You are a DBT diary card assistant. Extract structured data from this diary entry.

REQUIRED FIELDS:
- emotions: {emotion_name: intensity_0_5}
- urges: {urge_type: intensity_0_5}
- behaviors: {behavior: true/false}
- skills_used: [skill_names]
- context: {prompting_events: [], vulnerabilities: []}

EXTRACTION RULES:
1. Emotion + number → emotion rating (e.g., "anxiety was a 4" → anxiety: 4)
2. "Urge to X" + number → urge rating
3. Negation + action → behavior false (e.g., "didn't self-harm" → self_harm: false)
4. DBT skill name mentioned → add to skills_used
5. Interpersonal events → context.prompting_events
6. If intensity unclear, mark as "needs_confirmation"

SKILL RECOGNITION:
- Map informal descriptions to canonical DBT skills
- "breathing" → tip_paced_breathing
- "cold water on face" → tip_temperature
- "made myself do it anyway" → opposite_action
- "stopped before reacting" → stop

OUTPUT: JSON with extracted data + list of missing/unclear fields
`;
```

#### Gap Analysis

After extraction, identify what's missing:

| Field | Status | Follow-up Priority |
|-------|--------|-------------------|
| Emotions mentioned | ✓ | - |
| Emotion intensities | Partial | High |
| Urges | Missing | High |
| Behaviors | Missing | Medium |
| Skills | ✓ | - |
| Context | ✓ | - |

#### Follow-up Question Design

Questions should feel therapeutic, not form-like:

**Emotion Intensity:**
```
Bad:  "Please rate your anxiety 0-5"
Good: "You mentioned feeling anxious. How intense was that—like a 2, or more like a 4?"
```

**Urges:**
```
Bad:  "Did you have urges to self-harm?"
Good: "Any urges come up today that were hard to manage?"
```

**Skill Recognition:**
```
Good: "Making yourself go to the store when you wanted to isolate—that's textbook Opposite Action. Should I log that?"
```

#### Question Types

| Type | UI | Use Case |
|------|-----|----------|
| Scale | 0-5 buttons | Emotion/urge intensity |
| Binary | Yes/No buttons | Behaviors, confirmations |
| Quick Options | 2-3 buttons | Common responses |
| Voice | Mic button | Open-ended follow-up |

#### Completion Flow

1. Show what was captured (confirmation)
2. Ask about missing elements (1-2 questions max per screen)
3. Recognize skills user may not have named
4. Confirm completion

---

### F3: Smart Notification System

#### Notification Types

##### 1. Daily Diary Reminder

**Timing:** User-selected (default 8:00 PM)

**Smart adjustments:**
- If user typically completes at 9pm, shift to 8:45pm
- If missed yesterday, send 30 min earlier
- If therapy tomorrow, ensure delivery

**Message variations:**

| Context | Message |
|---------|---------|
| Normal | "Ready to capture today? Just speak naturally—I'll help fill in the rest." |
| Streak (3+ days) | "Day 5 of your streak. Quick check-in?" |
| Missed yesterday | "No pressure, but yesterday's still open if you want to capture it." |
| Therapy tomorrow | "Session tomorrow—good time to have today's entry ready." |
| High distress detected | "Checking in. How are you doing today?" |

##### 2. Weekly Skills Review

**Timing:** Sunday evening (or day before therapy)

**Purpose:**
- Review skills used across the week
- Fill in any missed skill logging
- Identify skills user wanted to use but couldn't

**Flow:**
```
AI: "Looking at your week, I spotted these skills:
     Mon: STOP, TIP
     Wed: Opposite Action
     Thu: Check the Facts
     
     Were there other skills you used that we didn't capture?"

User: "I did some radical acceptance on Friday"

AI: "Added. Any skills you wanted to use but couldn't? 
     That's helpful for your therapist too."
```

##### 3. Pre-Session Prep

**Timing:** 2-3 hours before scheduled therapy

**Purpose:**
- Ensure diary card is complete
- Surface patterns for discussion
- Reduce session time on logistics

**Content:**
- Completion status
- Week's emotion patterns
- Urge summary
- Skills used (with frequency)
- Suggested discussion topics

##### 4. Missed Entry Recovery

**Timing:** Next day, mid-morning

**Message variations:**

| Gap | Message |
|-----|---------|
| 1 day | "Yesterday got away from you? Quick 60-second catch-up?" |
| 2-3 days | "A few days to fill in. Want to do them together?" |
| 4+ days | "It's been a bit—no judgment. Start fresh with today?" |

**Smart behavior:**
- Don't send if user opened app but chose not to complete
- Reduce frequency if consistently ignored
- Increase gentleness if high distress in last entry

##### 5. Contextual Skill Surfacing (Option C)

**Timing:** Triggered by detected patterns, not fixed schedule

**Triggers:**

| Pattern Detected | Notification |
|------------------|--------------|
| High emotion (4-5) recent entries | "Noticed things have been intense. TIP skills can help in the moment." |
| Conflict mentioned | "Navigating a tough conversation? DEAR MAN might help." |
| Avoidance language | "Feeling like withdrawing? Opposite Action is hard but works." |
| Urges elevated 2+ days | "Urges have been present. Your distress tolerance skills are here." |
| Good outcome after skill | "That STOP skill on Tuesday seemed to help. Nice work." |

**Limits:**
- Max 1 per day
- Don't repeat same skill within 5 days
- Pause if 3 dismissed in a row

##### 6. Positive Reinforcement

**Timing:** After notable achievements

| Achievement | Message |
|-------------|---------|
| 7-day streak | "One week of daily entries. Your therapist will have great data." |
| Skills 5+ times | "You used 5 different skills this week. Building a toolkit." |
| Urges not acted on | "Tough week with urges, but you got through. That matters." |
| Came back after gap | "Welcome back. Picking it up again is the skill." |

**Tone:** Validating, not patronizing. Focus on clinical value.

##### 7. Crisis-Aware Behavior

**Triggers:**
- Urges ≥4 in recent entry
- Crisis language detected
- Crisis resources accessed

**Behavior:**
- Pause non-essential notifications 24-48 hours
- Send only: gentle check-in after 24 hours
- Resume normal schedule gradually

---

### F4: Weekly Skills Review

#### Purpose

Complete the skills tracking portion of the diary card by:
1. Surfacing skills the AI detected during the week
2. Asking about additional skills used but not mentioned
3. Capturing skills user wanted to use but couldn't (valuable for therapy)

#### User Flow

1. Notification: "Weekly wrap-up: You logged 5 entries. Quick skills review?"
2. Display skills detected with frequency
3. AI asks: "Were there other skills you used?"
4. AI asks: "Any skills you wanted to use but couldn't?"
5. Complete review, save to weekly summary

#### Data Captured

```javascript
{
  week_start: "2025-01-13",
  week_end: "2025-01-19",
  entries_completed: 5,
  entries_missed: 2,
  skills_detected: {
    stop: { count: 3, days: ["Mon", "Wed", "Wed"] },
    opposite_action: { count: 2, days: ["Tue", "Thu"] },
    tip_paced_breathing: { count: 2, days: ["Mon", "Sat"] }
  },
  skills_added_in_review: ["radical_acceptance"],
  skills_attempted_failed: ["dear_man"],
  notes: "DEAR MAN attempt with boss didn't go as planned"
}
```

---

### F5: Pre-Session Prep

#### Purpose

Maximize therapy session value by:
1. Ensuring diary card is complete before session
2. Providing therapist-ready summary
3. Identifying patterns and discussion topics

#### Timing Logic

```javascript
function scheduleSessionPrep(user) {
  // Check for connected calendar
  if (user.calendarConnected) {
    const nextSession = getNextTherapyAppointment(user);
    return subtractHours(nextSession.startTime, 3);
  }
  
  // Fall back to user-configured therapy day
  if (user.therapyDay) {
    return getNextOccurrence(user.therapyDay, "09:00");
  }
  
  // Default to weekly reminder
  return null;
}
```

#### Summary Content

**Patterns Section:**
- Emotion trends (peaks, improvements)
- Urge patterns (frequency, max intensity)
- Skill usage patterns

**Discussion Topics (AI-generated):**
- Recurring patterns (e.g., "Mom conflicts → Anxiety → Anger")
- Wins (e.g., "Used Opposite Action twice when wanted to isolate")
- Challenges (e.g., "DEAR MAN attempt felt hard")

#### Export Options

1. **Share with Therapist:** Secure time-limited link (72 hours)
2. **Email PDF:** Formatted diary card matching Linehan template
3. **In-App Share:** If therapist has clinician account (future)

---

### F6: Skills Library

#### Content Structure

Four modules following standard DBT curriculum:

**Mindfulness (7 skills):**
- Wise Mind
- Observe
- Describe
- Participate
- Nonjudgmental
- One-Mindful
- Effective

**Interpersonal Effectiveness (7 skills):**
- DEAR MAN
- GIVE
- FAST
- Dialectics
- Validation
- Behavior Change Strategies

**Emotion Regulation (8 skills):**
- Check the Facts
- Opposite Action
- Problem Solve
- Accumulate Positive (A)
- Build Mastery (B)
- Cope Ahead (C)
- PLEASE
- Mindfulness of Current Emotion

**Distress Tolerance (6+ skills):**
- STOP
- Pros/Cons
- TIP (Temperature, Intense Exercise, Paced Breathing, Muscle Relaxation)
- Distract (ACCEPTS)
- Self-Soothe
- IMPROVE
- Radical Acceptance
- Half-Smile/Willing Hands
- Willingness

#### Skill Card Content

Each skill includes:
- Name and acronym (if applicable)
- Brief description (1-2 sentences)
- "How to use" steps
- Optional audio explanation (30-60 seconds)
- Related skills

#### Access Points

1. **From diary entry:** AI suggests relevant skills
2. **From main menu:** Browse/search all skills
3. **From notification:** Contextual skill surfacing

---

### F7: Crisis Pathway

#### Triggers

- Suicide urge ≥4 detected
- Self-harm urge ≥4 detected
- Explicit crisis language (e.g., "I don't want to be alive")

#### Response Flow

1. **Acknowledge:** "I'm noticing things are really hard right now."
2. **Surface TIP:** Immediate distress tolerance skill
3. **Offer resources:** Crisis line, therapist contact (if saved)
4. **Do NOT block:** Allow diary completion to continue

#### Design Principles

- Never lock user out of the app
- Never require action to proceed
- Provide options, not mandates
- Crisis resources always accessible

---

## Data Model

### Entry Object

```javascript
{
  id: "entry_uuid",
  user_id: "user_uuid",
  date: "2025-01-19",
  created_at: "2025-01-19T20:15:00Z",
  
  // Voice data
  voice_entry: {
    transcript: "Today was rough...",
    duration_seconds: 87,
    processed_at: "2025-01-19T20:16:32Z"
  },
  
  // Structured diary card data
  emotions: {
    anxiety: 4,
    anger: 4,
    sadness: 3,
    joy: null,
    shame: null,
    fear: null
  },
  
  urges: {
    suicide: 0,
    self_harm: 2,
    substances: 0
  },
  
  behaviors: {
    self_harm: false,
    lied: false,
    substances: null,
    meds_as_prescribed: true
  },
  
  skills_used: {
    mindfulness: [],
    interpersonal: [],
    emotion_regulation: ["opposite_action"],
    distress_tolerance: ["stop", "tip_paced_breathing"]
  },
  
  skills_used_rating: 5, // 0-7 scale
  
  context: {
    prompting_events: ["fight with mom"],
    vulnerabilities: ["poor sleep"],
    notes: "Made myself go to store instead of isolating"
  },
  
  // AI interaction
  ai_completion: {
    questions_asked: 3,
    questions_skipped: 0,
    skills_recognized: ["opposite_action"],
    completion_time_seconds: 45
  },
  
  // Metadata
  source: "voice", // voice | manual | retrospective
  edited: false,
  therapist_viewed: false
}
```

### Weekly Summary Object

```javascript
{
  user_id: "user_uuid",
  week_start: "2025-01-13",
  week_end: "2025-01-19",
  
  entries: {
    completed: 5,
    missed: 2,
    days_with_entries: ["Mon", "Tue", "Wed", "Thu", "Sat"]
  },
  
  emotions: {
    averages: { anxiety: 3.2, anger: 2.8, sadness: 2.4, joy: 2.0 },
    peaks: [
      { emotion: "anxiety", value: 4, day: "Wed", context: "conflict" }
    ]
  },
  
  urges: {
    days_present: 4,
    max_intensity: { self_harm: 2 },
    acted_on: false
  },
  
  skills: {
    total_uses: 9,
    by_skill: {
      stop: 3,
      opposite_action: 2,
      tip_paced_breathing: 2,
      check_facts: 1,
      dear_man: 1
    },
    added_in_review: ["radical_acceptance"],
    attempted_failed: ["dear_man"]
  },
  
  patterns: {
    ai_identified: [
      "Mom conflicts → Anxiety spike → Anger",
      "STOP skill used effectively 3 times"
    ]
  },
  
  therapist_share: {
    shared: true,
    shared_at: "2025-01-19T18:30:00Z",
    method: "secure_link"
  }
}
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP                              │
│  React Native (iOS/Android)                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Audio Capture → WebRTC/Native Audio APIs               ││
│  │  UI Components → React Native + Tailwind                ││
│  │  Local Storage → AsyncStorage (preferences, cache)      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY                               │
│  Authentication, Rate Limiting, Request Routing              │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│   OPENAI        │ │   BACKEND API   │ │   NOTIFICATION      │
│   REALTIME API  │ │   (FastAPI)     │ │   SERVICE           │
│                 │ │                 │ │                     │
│ • Transcription │ │ • User auth     │ │ • Push scheduling   │
│ • VAD           │ │ • Data CRUD     │ │ • Smart timing      │
│ • Streaming     │ │ • Extraction    │ │ • Personalization   │
└─────────────────┘ │ • Summaries     │ └─────────────────────┘
                    └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   PostgreSQL    │  │   Secure Blob Storage           │  │
│  │                 │  │                                 │  │
│  │ • User data     │  │ • Transcripts (encrypted)       │  │
│  │ • Entries       │  │ • Audio (optional, encrypted)   │  │
│  │ • Summaries     │  │ • Exports                       │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Mobile | React Native | Cross-platform, strong audio support |
| Backend | Python FastAPI | Async, fast, good ML ecosystem |
| Database | PostgreSQL | Structured data, JSONB for flexibility |
| Auth | Firebase Auth or Auth0 | Secure, scalable, compliance features |
| Transcription | OpenAI Realtime API | Best-in-class streaming, VAD |
| AI Extraction | Claude API | Superior instruction following |
| Push Notifications | Firebase Cloud Messaging | Cross-platform, reliable |
| PDF Generation | React-PDF or WeasyPrint | Professional output |

### Privacy Architecture

#### Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    USER DEVICE                            │
│                                                          │
│  1. Audio recorded                                       │
│  2. Streamed to OpenAI for transcription                 │
│  3. Audio DELETED from device (default)                  │
│  4. Transcript + structured data sent to backend         │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                    BACKEND                                │
│                                                          │
│  • Transcript encrypted at rest (AES-256)                │
│  • Structured data encrypted at rest                      │
│  • All transit encrypted (TLS 1.3)                       │
│  • No audio stored (default)                             │
└──────────────────────────────────────────────────────────┘
```

#### User Controls

| Setting | Default | Options |
|---------|---------|---------|
| Store transcripts | Yes | Yes / No |
| Store audio | No | Yes / No |
| Data retention | 1 year | 1 year / Forever / Until deleted |
| Therapist sharing | Per-export consent | - |

#### Compliance Considerations

- **HIPAA-awareness:** While not a covered entity, follow best practices
- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Access controls:** Role-based, audit logged
- **Data minimization:** Don't store what's not needed

---

## Success Metrics

### Primary Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| 7-day retention | % users with entry on day 7 | >40% | Analytics |
| 30-day retention | % users with entry on day 30 | >15% | Analytics |
| Daily completion rate | % of days with entries | >60% | Per-user average |
| Session duration | Time from start to save | <2 min | In-app timing |
| Therapist share rate | % of users who share weekly | >30% | Feature usage |

### Secondary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| AI completion accuracy | % of entries not manually edited | >70% |
| Skill views per week | Engagement with skills library | >2 |
| Weekly summary views | Pre-session prep usage | >50% |
| NPS | Net Promoter Score | >40 |

### Clinical Proxy Metrics (Monitor, Not Target)

| Metric | Insight |
|--------|---------|
| Skill variety over time | Learning progression |
| Urge intensity trends | Safety monitoring |
| Completion before therapy | Therapy integration |
| Emotion volatility | Stability indicator |

---

## Roadmap

### MVP (v1.0) - 12 weeks

**Core Features:**
- Two-phase voice diary capture
- AI completion partner
- Daily diary reminder
- Basic weekly summary
- Skills library (read-only)
- Manual sharing (PDF export)

**Technical:**
- iOS app (React Native)
- Backend API
- OpenAI Realtime integration
- Basic analytics

### v1.1 - 4 weeks post-MVP

**Features:**
- Weekly skills review flow
- Pre-session prep summary
- Contextual skill notifications
- Skill effectiveness tracking ("Did this help?")

### v1.2 - 4 weeks

**Therapist Integration:**
- Clinician accounts (B2B)
- Patient linking (with consent)
- Therapist dashboard
- Session prep sharing

### v1.3 - 4 weeks

**Chain Analysis Support:**
- Voice-guided chain analysis
- AI-assisted link identification
- Solution generation prompts

### v2.0 - Future

- Android app
- Apple Watch quick entry
- Biometric integration (HRV for distress detection)
- Group skills training companion
- Peer support (heavily moderated)

---

## Risk Mitigation

### Clinical Safety Risks

| Risk | Mitigation |
|------|------------|
| User in crisis | Crisis pathway with immediate skill + contacts; never block |
| AI misses high urge | Always show raw transcript; user confirms |
| User relies on app vs therapy | Messaging: "Companion to therapy, not replacement" |
| Inaccurate extraction | Easy manual editing; transparent "I heard..." |

### Engagement Risks

| Risk | Mitigation |
|------|------------|
| Voice too vulnerable | Text entry fallback always available |
| AI questions feel intrusive | Max 3 questions; all skippable |
| Notification fatigue | User controls timing; easy to adjust; smart limits |
| Skill suggestions preachy | Max 1/day; dismissable; pattern-based |

### Technical Risks

| Risk | Mitigation |
|------|------------|
| OpenAI API latency | Fallback to batch transcription |
| Audio quality issues | Noise reduction; VAD tuning |
| Data breach | Encryption; minimal storage; access controls |
| App store rejection | HIPAA awareness; content review |

---

## Appendices

### Appendix A: DBT Diary Card Fields

**Standard Linehan Diary Card Elements:**

| Category | Fields | Scale |
|----------|--------|-------|
| Urges | Suicide, Self-Harm, Drugs | 0-5 |
| Emotions | Anxiety, Sadness, Anger, Shame/Guilt, Joy, Emotion Misery, Physical Misery | 0-5 |
| Actions | Self-Harm (Y/N), Lied (Y/N) | Binary |
| Substances | Alcohol, Illegal Drugs, Meds as Prescribed, PRN/OTC | Varies |
| Skills | 28 skills across 4 modules | Checkmark |
| Skills Rating | Overall skill use | 0-7 |
| Session Prep | Urges to Quit, Belief I Can Change | 0-5 |

### Appendix B: 28 DBT Skills Reference

**Mindfulness:**
1. Wise Mind
2. Observe
3. Describe
4. Participate
5. Nonjudgmental
6. One-Mindful
7. Effective

**Interpersonal Effectiveness:**
8. DEAR (Describe, Express, Assert, Reinforce)
9. MAN (Mindful, Appear confident, Negotiate)
10. GIVE (Gentle, Interested, Validate, Easy manner)
11. FAST (Fair, no Apologies, Stick to values, Truthful)
12. Dialectics
13. Validation
14. Behavior Change Strategies

**Emotion Regulation:**
15. Check the Facts
16. Opposite Action
17. Problem Solve
18. Accumulate Positive (A)
19. Build Mastery (B)
20. Cope Ahead (C)
21. PLEASE
22. Mindfulness of Current Emotion

**Distress Tolerance:**
23. STOP
24. Pros/Cons
25. TIP (Temperature, Intense Exercise, Paced Breathing, Muscle Relaxation)
26. Distract (ACCEPTS)
27. Self-Soothe
28. IMPROVE
29. Radical Acceptance
30. Half-Smile/Willing Hands
31. Willingness

### Appendix C: Sample AI Extraction Prompts

**Transcript Processing:**
```
You are a DBT diary card assistant. Extract structured data from this voice diary entry.

Context: The user has spoken naturally about their day. Extract emotions (with 0-5 intensity), urges (0-5), behaviors (yes/no), and DBT skills used.

Rules:
1. If user says "anxiety was a 4" → anxiety: 4
2. If user says "felt really anxious" without number → anxiety: "needs_confirmation"
3. Map informal descriptions to canonical DBT skills
4. Note prompting events (what happened) and vulnerabilities (what made them susceptible)
5. If something is missing, add to "missing" array

Transcript: {transcript}

Output JSON with: emotions, urges, behaviors, skills_used, context, missing
```

**Follow-up Question Generation:**
```
Given this extracted diary data, generate 1-3 follow-up questions to complete the diary card.

Rules:
1. Prioritize: urges > emotion intensities > behaviors > skills
2. Questions should feel conversational, not clinical
3. Offer quick-tap options where possible
4. Recognize skills user may have used but not named

Extracted data: {extracted_data}
Missing fields: {missing}

Output: Array of question objects with type, text, field, and options
```

### Appendix D: Notification Copy Bank

**Daily Reminder Variations:**
- "Ready to capture today? Just speak naturally—I'll help fill in the rest."
- "Quick check-in time. How'd today go?"
- "Day {N} of your streak. Let's keep it going?"
- "No pressure, but yesterday's still open if you want to grab it."
- "Session tomorrow—good time to have today's entry ready."

**Positive Reinforcement:**
- "One week of daily entries. Your therapist will have great data to work with."
- "You used {N} different skills this week. That's building a toolkit."
- "Tough week with urges, but you got through without acting on them. That matters."
- "Welcome back. Picking it up again is the skill—not never missing."

**Skill Surfacing:**
- "Noticed things have been intense lately. TIP skills can help in the moment."
- "Navigating a tough conversation? DEAR MAN might help."
- "That {skill} on {day} seemed to help. Nice work noticing what works for you."

---

## Clinical Compliance Addendum

### Critical Clinical Requirements (From Source Material Review)

#### 1. "Highest" Value Logic

The clinical diary card tracks "HIGHEST urge/emotion per day" - not final or average values.

**From Diary Card Template:**
> "Highest Urge To: Commit Suicide (0-5), Self-Harm (0-5), Use Drugs (0-5)"
> "Highest Ratings for Each Day"

**Implementation:**
- Multiple entries per day UPDATE the peak, don't replace
- Morning anxiety=2, afternoon anxiety=4 → card shows 4
- AI follow-up: "Was that the worst it got, or was there a higher point?"

#### 2. Skills Effectiveness Scale (0-7, Not Binary)

**From Diary Card Template:**
```
0 = Not thought about or used
1 = Thought about, not used, didn't want to
2 = Thought about, not used, wanted to
3 = Tried but couldn't use them
4 = Tried, could do them but they didn't help
5 = Tried, could use them, helped
6 = Automatically used them, didn't help
7 = Automatically used them, helped
```

**Implementation:**
- After skill detection, ask "Did it help?"
- Map responses: "really helped" → 7, "helped" → 5-6, "tried but didn't help" → 4

#### 3. Coming-Into-Session Ratings

**From Diary Card Template:**
```
Urges to ____ Coming into Session (0-5):
- Quit Therapy
- Use Drugs  
- Commit Suicide

Belief I Can Change or Regulate My ____ Coming Into Session (0-5):
- Emotions
- Actions
- Thoughts
```

**Implementation:**
- Separate from daily tracking
- Triggered by pre-session prep notification (2-3 hours before therapy)
- Stored in dedicated session_prep object

#### 4. Completion Metadata

**From Diary Card Template:**
```
Filled Out In Session? Yes / No
How Often Did You Fill Out? Daily / 4-6x / 2-3x / Once
```

**Implementation:**
- Track: filled_in_session, completion_frequency, filled_retrospectively
- Surface in therapist sharing

#### 5. The "Lied" Column

**From Skills Training Manual:**
> "Place an asterisk (*) in this column to signify lying on the diary card."

**Implementation:**
- End-of-week accuracy check: "Do these entries feel accurate?"
- Allow edits with audit trail
- Nonjudgmental framing

#### 6. Missing-Links Analysis

**From Skills Training Manual:**
When expected behavior is missing, ask:
1. "Did you know what was expected?"
2. "Were you willing?"
3. "Did the thought enter your mind?"
4. "What got in the way?"

**Implementation:**
- When entry is missing, prompt with Missing-Links questions
- Store barrier data for therapist review

### Edge Case Handling

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| Multiple entries/day | Allow, track highest values | Clinical card tracks "highest" |
| Editing past entries | Allow with audit trail | Accuracy over rigidity |
| Deleting entries | Soft delete only (archive) | Preserve clinical data |
| Retrospective entry | Allow, flag as retrospective | Standard clinical practice |
| High urge detection | Surface skills, don't block | DBT principle |

### Updated Data Model

```javascript
entry = {
  // Existing fields...
  
  // NEW: Completion metadata
  metadata: {
    filled_in_session: false,
    filled_retrospectively: false,
    completion_method: "voice", // voice | manual | quick-tap
    original_entry_date: "2025-01-19",
    actual_fill_date: "2025-01-19"
  },
  
  // NEW: Edit tracking
  edit_history: [
    {
      field: "anger",
      old_value: 3,
      new_value: 4,
      edited_at: "2025-01-19T21:00:00Z",
      same_day_edit: true
    }
  ],
  
  // NEW: Peak tracking (when multiple entries/day)
  peaks: {
    anxiety: { value: 4, logged_at: "2025-01-19T14:30:00Z" },
    anger: { value: 3, logged_at: "2025-01-19T09:15:00Z" }
  },
  
  // UPDATED: Skills with effectiveness (0-7)
  skills_used: {
    stop: { 
      used: true, 
      effectiveness: 5, // 0-7 scale
      context: "Before yelling at mom"
    }
  },
  
  // NEW: Self-reported accuracy
  accuracy: {
    self_reported_accurate: true,
    reviewed_at: "2025-01-19T22:00:00Z"
  }
}

// NEW: Session prep object
session_prep = {
  session_date: "2025-01-20",
  filled_at: "2025-01-20T12:30:00Z",
  
  urges_coming_in: {
    quit_therapy: 1,
    use_drugs: 0,
    suicide: 0
  },
  
  belief_can_change: {
    emotions: 3,
    actions: 4,
    thoughts: 3
  }
}

// NEW: Missing-links data
missing_links = {
  date: "2025-01-18",
  barrier: "too_overwhelmed", // forgot | no_time | overwhelmed | unwilling
  captured_at: "2025-01-19T08:00:00Z"
}
```

---

## Design Philosophy: "Quiet Strength"

### Core Principle

The app embodies dialectical design—holding opposing truths simultaneously:

| Dialectic | Design Expression |
|-----------|-------------------|
| Acceptance AND Change | Warm but not passive; forward-moving but not pushy |
| Intense emotions AND stillness | Can hold darkness; has quiet strength |
| Simplicity AND depth | Minimal surface, rich interaction |
| Serious AND human | Respects the weight; not clinical or cold |
| Structure AND flexibility | Clear framework; breathing room |

### The Problem with Current Mental Health App Design

**What everyone does (and why it fails):**
- Soft pastels → Feels disconnected from intense emotional reality
- Bubbly illustrations → Patronizing to intelligent, self-aware users
- Gamification → Triggers shame when streaks break (anti-DBT)
- Excessive affirmations → Doesn't take pain seriously
- Emoji-based mood tracking → Infantilizing

**Our users are:**
- Highly intelligent, self-aware people dealing with intense emotions
- Experienced with therapy, hospitals, crises—not naive
- Deserving of design that respects their pain and intelligence

### Visual Identity

#### Color Palette

```
Primary Palette:
─────────────────────────────────────────────────────────

  DEEP SLATE         OFF-WHITE          WARM CLAY
  #1a1d21            #f5f4f2            #c4a67c
  
  Background         Text/Cards         Accent
  Grounding          Breathing room     Human warmth

─────────────────────────────────────────────────────────

Emotional Spectrum (Muted, Dignified):

  MUTED CORAL    DUSTY GOLD    SAGE       SOFT INDIGO
  #c97b6b        #b8a45c       #7d9b84    #7c85a6
  
  Anger/Shame    Joy/Hope      Calm       Sadness
```

**Rationale:**
- Dark base holds intensity, doesn't shy away from hard emotions
- Warm accent adds humanity without being clinical
- Muted emotional colors present without screaming
- Off-white cards provide breathing room

#### Typography

```
Headers: Inter Medium or DM Sans Medium
  - Clean but warm
  - Quiet confidence

Body: Source Serif 4 or Literata  
  - Readable, human, grounded
  - Slightly larger (17-18px) for reading during difficult moments

Data/Numbers: JetBrains Mono or IBM Plex Mono
  - Clear, trustworthy
  - No ambiguity

Principles:
  - Generous line height (1.6+)
  - No ALL CAPS headings
  - Left-aligned, ragged right
```

#### Spacing Philosophy

Space is not empty—it's active. It gives emotions room to exist.

```
Margins: 24-32px (generous but not wasteful)
Card padding: 20-24px
Section spacing: 40-48px
```

#### Motion & Animation

```
Principles:
- Duration: 300-500ms (never rushed)
- Easing: ease-out (natural deceleration)
- Purpose: Every animation should feel like a breath

Recording orb:
- Slow expansion/contraction (4-6 second cycle)
- Subtle opacity shifts
- NOT: pulsing, bouncing, spinning

Transitions:
- Fade + slight vertical shift (8-12px)
- NOT: slide from edges, bounce, spring
```

### Component Design Specifications

#### Recording Experience

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│                        ◯                                │
│                   (breathing orb)                       │
│                                                         │
│              Speak when you're ready.                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Your words appear here as you speak...                 │
│                                                         │
│                    ┌─────────────┐                      │
│                    │    Done     │                      │
│                    └─────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘

The orb:
- Dark gray/slate when idle
- Warm clay/amber tint when speaking
- Size changes subtly with volume
- Soft glow, not hard edges
- NO: colorful rings, particle effects, waveforms
```

#### AI Follow-up (Editorial Style, Not Chat)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│  How intense was the anxiety                            │
│  you mentioned?                                         │
│                                                         │
│                                                         │
│       0     1     2     3     4     5                   │
│      [ ]   [ ]   [ ]   [●]   [ ]   [ ]                 │
│                                                         │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  skip this · speak instead                              │
│                                                         │
└─────────────────────────────────────────────────────────┘

- Question centered, prominent
- No chat bubbles or bot avatars
- Clean, direct dialogue
- Subtle secondary actions
```

#### Emotion Visualization (Dignified, Not Emoji)

```
Option A: Simple number with subtle color bar

  anxiety                                             3
  ════════════════════░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  
  anger                                               4
  ══════════════════════════════░░░░░░░░░░░░░░░░░░░░


Option B: Typographic with color accent

     anxiety        anger         sadness
        3             4              2
       ───           ───            ───
   (dusty gold)  (muted coral)  (soft indigo)
```

### Anti-Patterns (What We Never Do)

| Pattern | Why It Fails | Our Alternative |
|---------|--------------|-----------------|
| Streaks | Shame when broken | Show patterns, no counting |
| Badges/rewards | Gamifies suffering | Quiet acknowledgment |
| Confetti | Trivializes the work | Subtle completion state |
| Emoji moods | Infantilizing | Abstract or typographic |
| "Great job!" | Patronizing | Neutral or specific feedback |
| Pastel everything | Doesn't hold intensity | Grounded, mature palette |
| Chat bubbles | Feels like a bot | Clean, direct dialogue |
| Progress rings | Creates pressure | Simple completion states |
| Motivational quotes | Dismissive of pain | Silence or skill reminders |

### The Overall Feeling

**"A therapist's notebook, not a wellness app."**

- Serious but not cold
- Simple but not shallow
- Calm but not passive
- Dark but not depressing
- Warm but not saccharine
- Respectful of the user's intelligence and pain

The app should feel like:
- A trusted tool, not a cheerleader
- Something you reach for when things are hard
- A quiet room, not a party

---

*This document is confidential and intended for internal use only.*
