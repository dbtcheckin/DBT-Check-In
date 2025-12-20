# DBT Voice Diary - Design Guidelines

## Design Philosophy: "Quiet Strength"

The app must feel **therapeutic, not gamified**. Avoid patronizing tone, celebratory animations, or streak pressure. The design should convey clinical dignity while remaining warm and accessible.

### Core Principles
- **Dignified, not patronizing**: No confetti, no "Great job!" explosions
- **Calm, not clinical**: Warm but not overly friendly
- **Supportive, not demanding**: Gentle encouragement, never guilt
- **Focused on clinical value**: Emphasize therapy utility over engagement metrics

---

## Color Palette

### Primary Colors
- **Background**: `#1a1d21` (deep charcoal)
- **Cards/Surfaces**: `#24282e` (slate gray)
- **Primary Accent**: `#c4a67c` (warm clay/sand)
- **Secondary Accent**: Indigo gradient (`#4f46e5` → `#818cf8`) for active recording states

### Emotion Colors
- **Anxiety**: `#f59e0b` (amber)
- **Anger**: `#ef4444` (red)
- **Sadness**: `#6366f1` (indigo)
- **Fear**: `#8b5cf6` (purple)
- **Shame**: `#ec4899` (pink)
- **Joy**: `#10b981` (green)

### Text Colors
- **Primary Text**: `#ffffff` (white)
- **Secondary Text**: `#9ca3af` (gray-400)
- **Tertiary Text**: `#6b7280` (gray-500)
- **Disabled Text**: `#4b5563` (gray-600)

### UI States
- **Hover/Active**: Subtle lightening of surface color
- **Pressed**: Brief opacity reduction (0.8)
- **Disabled**: 40% opacity

---

## Typography

### Font Families
- **Content/Narrative**: Serif (Crimson Text, EB Garamond, or Georgia fallback)
  - Use for: Transcripts, diary entries, user's spoken words
  - Purpose: Feels personal, therapeutic
  
- **UI Elements**: Sans-serif (Inter, System default)
  - Use for: Buttons, labels, navigation, instructions
  - Purpose: Clean, readable
  
- **Data/Numbers**: Monospace (JetBrains Mono, Courier)
  - Use for: Emotion ratings (0-5), timestamps, session counts
  - Purpose: Clinical precision

### Type Scale
- **Headline**: 24-28px, font-weight: 300 (light)
- **Title**: 20-22px, font-weight: 400 (regular)
- **Body**: 16-18px, font-weight: 400
- **Caption**: 12-14px, font-weight: 400
- **Data**: 14-16px, monospace, font-weight: 500

---

## Spacing & Layout

### Spacing Scale
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

### Safe Areas
- **Top inset** (with transparent header): `headerHeight + 32px`
- **Bottom inset** (with tab bar): `tabBarHeight + 32px`
- **Horizontal padding**: 24px (standard), 16px (compact)

### Card Design
- **Border radius**: 16-24px (rounded-xl to rounded-3xl)
- **Padding**: 16-24px internal
- **Elevation**: Minimal - use subtle borders (`1px solid rgba(255,255,255,0.1)`) instead of heavy shadows

---

## Authentication & Navigation

### Authentication
- **No auth required** (utility/single-user focused)
- **Profile/Settings screen** must include:
  - User-customizable avatar (1 preset avatar generated)
  - Display name field
  - App preferences (theme toggle, notification settings)
  - No login/logout functionality

### Navigation Architecture
- **Tab Navigation** (5 tabs):
  1. **Home**: Main dashboard with record CTA
  2. **Weekly Review**: 7-day emotion/skills summary
  3. **Record** (center tab, floating action): Core diary entry
  4. **Session Prep**: Pre-therapy data aggregation
  5. **Profile**: Settings and account

- **Tab Bar Styling**:
  - Background: `#24282e`
  - Active icon: `#c4a67c` (clay accent)
  - Inactive icon: `#6b7280` (gray-500)
  - Height: 64px
  - Position center tab as floating button with subtle shadow

---

## Screen Specifications

### Home Screen
- **Layout**: Scrollable
- **Header**: Transparent, no back button
  - Left: App title "DBT Diary" (serif, 24px, light)
  - Right: Notification bell icon (with badge if unread)
- **Safe Area**: Top: `insets.top + 32px`, Bottom: `tabBarHeight + 32px`
- **Components**:
  - Main CTA: Record button (gradient card, 8px vertical padding)
  - Quick actions grid: 2 columns, 3px gap
  - Week completion indicator: Minimal bar chart

### Recording Screen (Modal)
- **Layout**: Non-scrollable, centered content
- **Header**: Transparent
  - Left: Cancel (text button)
  - Right: Phase indicator "1 of 2"
- **Components**:
  - Breathing orb (center, 120-170px diameter, animated)
  - Timer (below orb, monospace)
  - Live transcript (scrollable box, max 128px height, serif)
  - "Done Speaking" button (bottom, floating)
- **Safe Area**: Top: `insets.top + 32px`, Bottom: `insets.bottom + 32px`

### AI Completion Screen
- **Layout**: Scrollable
- **Header**: Default navigation
  - Title: "Complete Your Card"
  - Right: Skip button (text)
- **Components**:
  - Question text (serif, 18px)
  - Response options (buttons or scale 0-5)
  - Progress dots (bottom, showing step X of Y)
- **Button Styles**:
  - Scale: Circular, 48px, `#24282e` background, `#c4a67c` border when selected
  - Binary: Rounded-lg, full-width, stacked vertically

### Weekly Review Screen
- **Layout**: Scrollable
- **Header**: Default with title "This Week"
- **Components**:
  - 7-day calendar strip (days marked complete/incomplete)
  - Emotion trend line chart (multi-color)
  - Skills usage list (grouped by category)
  - Completion rate (percentage, monospace)

### Session Prep Screen
- **Layout**: Scrollable
- **Header**: Default with title "Session Prep"
- **Components**:
  - Week summary card (emotion averages, urge summary)
  - Skills used (frequency count)
  - Suggested topics (bulleted list, serif)
  - Export button (bottom, outlined)

---

## Component Design

### Breathing Orb
- **Base size**: 120px diameter
- **Expansion**: +50px max based on audio level
- **Gradient**: Radial, `#818cf8` (center) → `#4f46e5` → `#3730a3`
- **Glow**: `0 0 ${20 + level * 40}px rgba(99, 102, 241, ${0.3 + level * 0.4})`
- **Animation**: Smooth scale transitions (150ms)

### Floating Action Button (Record Tab)
- **Size**: 64px diameter
- **Background**: Indigo gradient
- **Icon**: Microphone emoji or Feather icon
- **Shadow** (exact specs):
  - shadowOffset: `{width: 0, height: 2}`
  - shadowOpacity: `0.10`
  - shadowRadius: `2`
- **Pressed state**: Scale to 0.95

### Scale Input (0-5)
- **Layout**: Horizontal row of 6 circles
- **Circle size**: 44px diameter (minimum touch target)
- **States**:
  - Default: `#24282e` background, `#4b5563` border
  - Selected: `#c4a67c` border (2px), white text
  - Pressed: Brief scale animation

### Notification Card
- **Position**: Fixed top-4, left-4, right-4
- **Background**: `#24282e` with `1px solid #374151` border
- **Padding**: 16px
- **Animation**: Slide down from top (300ms ease)
- **Auto-dismiss**: 5 seconds or user tap

### Live Transcript
- **Font**: Serif, 18px, line-height 1.6
- **Color**: `#d1d5db` (gray-300)
- **Placeholder**: `#6b7280` italic
- **Cursor**: Animated vertical line (`#818cf8`, pulse)
- **Auto-scroll**: Always show latest text

---

## Interaction Design

### Touch Feedback
- **Buttons**: Opacity 0.8 on press
- **Cards**: Subtle scale (0.98) + opacity 0.9
- **Floating elements**: Scale 0.95 + subtle shadow increase

### Transitions
- **Screen transitions**: Stack navigation with slide-right (iOS standard)
- **Modal presentation**: Slide-up with backdrop fade-in
- **Element animations**: 200-300ms ease-in-out

### Loading States
- **Initial load**: Indigo spinner (24px)
- **Processing AI**: "Analyzing..." text with subtle pulse
- **Saving**: Brief checkmark animation, no blocking spinner

---

## Accessibility

### Minimum Requirements
- **Touch targets**: 44x44px minimum
- **Color contrast**: 4.5:1 for body text, 3:1 for large text
- **Focus indicators**: `#c4a67c` 2px outline
- **Screen reader labels**: All icons and buttons
- **Dynamic type**: Respect system font size settings

### Voice-First Considerations
- **Large touch targets** for voice/tap hybrid interactions
- **Clear visual feedback** during recording (orb + transcript)
- **Avoid requiring text input** - prefer taps or voice
- **Confirm destructive actions** (delete entry) with double confirmation

---

## Assets

### Required Custom Assets
1. **Avatar presets** (3-5 options):
   - Aesthetic: Minimalist, warm, therapeutic
   - Style: Abstract shapes, soft gradients, clay tones
   - Format: SVG or high-res PNG
   
2. **Empty states**:
   - No entries yet: Subtle illustration (optional)
   - No therapy session scheduled: Text-only
   
### Standard Icons
- Use **Feather icons** from `@expo/vector-icons`
- **Never use emojis** in UI chrome (only in notifications where appropriate)
- Icon size: 20-24px standard, 32px for tab bar

---

## Notifications

### Visual Design
- **Badge**: Indigo dot (8px diameter) on notification bell
- **Card style**: Match notification card spec above
- **Icons**: Relevant emoji (📝 diary, 📊 review, 📋 prep)

### Tone & Messaging
- **Encouraging, never guilt-inducing**
- Examples:
  - ✅ "Ready to capture today?"
  - ❌ "You missed your entry!"
  - ✅ "Session tomorrow—good time to check in"
  - ❌ "Don't forget your diary!"