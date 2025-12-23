export const SIMULATION_ENTRY_PHRASE = "START DBT PATIENT SIMULATION";
export const SIMULATION_EXIT_PHRASE = "END DBT PATIENT SIMULATION";

export type SimulationMode = "normal" | "simulation" | "debrief";

export type TurnClassification = "validating" | "invalidating" | "neutral";

export interface SimulationTurn {
  turn: number;
  userStatement: string;
  classification: TurnClassification;
  strategies: string[];
  intensityChange: number;
  newIntensity: number;
  aiResponse: string;
}

export interface SimulationState {
  active: boolean;
  mode: SimulationMode;
  currentIntensity: number;
  turnCount: number;
  turnsAtLevel9: number;
  history: SimulationTurn[];
  outcome: "success" | "failure" | "manual_exit" | null;
  validatingMoves: SimulationTurn[];
  invalidatingMoves: SimulationTurn[];
}

export const createInitialSimulationState = (): SimulationState => ({
  active: false,
  mode: "normal",
  currentIntensity: 5,
  turnCount: 0,
  turnsAtLevel9: 0,
  history: [],
  outcome: null,
  validatingMoves: [],
  invalidatingMoves: [],
});

const triggerPatterns = {
  highInvalidation: [
    /calm down/i,
    /relax/i,
    /it's not that bad/i,
    /you're (being )?(over)?react/i,
    /that's not (true|accurate|what happened)/i,
    /you (need|should) (just|to)/i,
    /other people (deal with|have it)/i,
    /stop being so/i,
    /you're (being )?dramatic/i,
    /let's (just )?move on/i,
    /I (don't|can't) (deal with|handle) this/i,
    /that's (manipulative|borderline)/i,
  ],
  
  moderateInvalidation: [
    /have you tried/i,
    /maybe (they|you) (didn't|should)/i,
    /I think you should/i,
    /the thing is/i,
    /but (actually|really)/i,
    /well,? (technically|actually)/i,
    /let me explain/i,
    /you (might be|could be|are) (wrong|mistaken)/i,
    /I'm just trying to help/i,
  ],
  
  validation: [
    /that (sounds|must be|seems) (really )?(hard|difficult|painful|frustrating)/i,
    /I (can )?(hear|see|understand|imagine)/i,
    /makes? sense/i,
    /of course you/i,
    /anyone would (feel|be)/i,
    /I'm (here|listening|with you)/i,
    /tell me more/i,
    /what was that like/i,
    /that's (so )?(unfair|hurtful|painful)/i,
    /I (get|understand) why you/i,
    /given (what|everything)/i,
    /no wonder you/i,
  ],
  
  highValidation: [
    /I'm sorry (that|this) happened/i,
    /you didn't deserve (that|this)/i,
    /your feelings (make sense|are valid)/i,
    /I (can see|notice) how much (pain|hurt)/i,
    /that sounds (incredibly|really|so) (painful|hard)/i,
    /I'm not going anywhere/i,
    /I'm still here/i,
  ],
  
  dialectical: [
    /and at the same time/i,
    /both.{0,20}(true|real|valid)/i,
    /.{0,30}AND.{0,30}/,
    /it's (true that|both)/i,
  ],
};

function findOrderedKeywords(tokens: string[], keywords: string[]): boolean {
  let keywordIndex = 0;
  for (const token of tokens) {
    if (token === keywords[keywordIndex]) {
      keywordIndex++;
      if (keywordIndex === keywords.length) {
        return true;
      }
    }
  }
  return false;
}

export function checkForSimulationEntry(userInput: string): boolean {
  const normalized = userInput.toUpperCase().replace(/[^\w\s]/g, "");
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
  
  const startKeywords = ["START", "DBT", "PATIENT", "SIMULATION"];
  const beginKeywords = ["BEGIN", "DBT", "PATIENT", "SIMULATION"];
  
  return findOrderedKeywords(tokens, startKeywords) || findOrderedKeywords(tokens, beginKeywords);
}

export function checkForSimulationExit(
  userInput: string,
  state: SimulationState
): { exit: boolean; offerExit?: boolean; reason?: string } {
  const normalized = userInput.toUpperCase().replace(/[^\w\s]/g, "");
  
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
  
  const endKeywords = ["END", "DBT", "PATIENT", "SIMULATION"];
  const stopKeywords = ["STOP", "DBT", "PATIENT", "SIMULATION"];
  const finishKeywords = ["FINISH", "DBT", "PATIENT", "SIMULATION"];
  
  if (findOrderedKeywords(tokens, endKeywords) || 
      findOrderedKeywords(tokens, stopKeywords) || 
      findOrderedKeywords(tokens, finishKeywords)) {
    return { exit: true, reason: "manual_exit" };
  }
  
  if (state.currentIntensity <= 0) {
    return { exit: true, reason: "success" };
  }
  
  if (state.turnsAtLevel9 >= 3) {
    return { exit: false, offerExit: true, reason: "sustained_crisis" };
  }
  
  return { exit: false };
}

export function processUserInput(
  userStatement: string,
  currentState: SimulationState
): {
  newIntensity: number;
  intensityDelta: number;
  classification: TurnClassification;
  strategies: string[];
  turnsAtLevel9: number;
  outcome: "success" | "failure_offer_exit" | null;
} {
  let intensityDelta = 0;
  let classification: TurnClassification = "neutral";
  const strategies: string[] = [];
  
  for (const pattern of triggerPatterns.highInvalidation) {
    if (pattern.test(userStatement)) {
      intensityDelta += 2;
      classification = "invalidating";
      strategies.push("high_invalidation");
    }
  }
  
  for (const pattern of triggerPatterns.moderateInvalidation) {
    if (pattern.test(userStatement)) {
      intensityDelta += 1;
      classification = "invalidating";
      strategies.push("moderate_invalidation");
    }
  }
  
  for (const pattern of triggerPatterns.validation) {
    if (pattern.test(userStatement)) {
      intensityDelta -= 1;
      classification = "validating";
      strategies.push("validation");
    }
  }
  
  for (const pattern of triggerPatterns.highValidation) {
    if (pattern.test(userStatement)) {
      intensityDelta -= 1.5;
      classification = "validating";
      strategies.push("high_validation");
    }
  }
  
  for (const pattern of triggerPatterns.dialectical) {
    if (pattern.test(userStatement)) {
      intensityDelta -= 1;
      classification = "validating";
      strategies.push("dialectical");
    }
  }
  
  const newIntensity = Math.max(0, Math.min(9, currentState.currentIntensity + intensityDelta));
  const turnsAtLevel9 = newIntensity >= 9 ? currentState.turnsAtLevel9 + 1 : 0;
  
  let outcome: "success" | "failure_offer_exit" | null = null;
  if (newIntensity <= 0) {
    outcome = "success";
  } else if (turnsAtLevel9 >= 3) {
    outcome = "failure_offer_exit";
  }
  
  return {
    newIntensity,
    intensityDelta,
    classification,
    strategies,
    turnsAtLevel9,
    outcome,
  };
}

export type VoiceType = "sage" | "coral" | "verse" | "marin";

export interface VoiceConfig {
  voice: VoiceType;
  speed: number;
  instructionSet: string;
}

export function getVoiceConfigForIntensity(intensity: number): VoiceConfig {
  if (intensity <= 1) {
    return { voice: "sage", speed: 0.95, instructionSet: "calm_regulated" };
  } else if (intensity <= 3) {
    return { voice: "sage", speed: 1.0, instructionSet: "mild_distress" };
  } else if (intensity <= 5) {
    return { voice: "coral", speed: 1.1, instructionSet: "moderate_distress" };
  } else if (intensity <= 7) {
    return { voice: "coral", speed: 1.2, instructionSet: "high_distress" };
  } else {
    return { voice: "verse", speed: 1.3, instructionSet: "crisis" };
  }
}

const PATIENT_PROFILE = {
  name: "Alex",
  age: 28,
  presentingIssue: "Called to process conflict with roommate that happened this morning",
  coreBeliefs: [
    "If I show my real feelings, people will leave",
    "I'm fundamentally broken/defective",
    "Others can't be trusted to stay",
    "My emotions are wrong/too much",
    "I have to be perfect or I'm worthless",
  ],
  triggers: [
    "Feeling dismissed or not heard",
    "Perceived criticism (even constructive)",
    "Sensing distance or distraction in the listener",
    "Being told to 'calm down' or 'relax'",
    "Advice-giving before validation",
    "Comparisons to others",
    "Logical arguments that dismiss emotional reality",
    "Silence or delayed responses (perceived as rejection)",
    "Being 'fixed' rather than understood",
  ],
};

export function getInstructionsForIntensity(intensity: number): string {
  const baseContext = `
You are Alex, a 28-year-old patient in DBT therapy. You have characteristics associated with BPD including emotional intensity, sensitivity to perceived rejection, and black-and-white thinking.

SCENARIO: Your roommate made a comment about you "always being so dramatic" when you got upset about them eating your food without asking. This triggered deep feelings of invalidation.

CORE BELIEFS (these drive your reactions):
${PATIENT_PROFILE.coreBeliefs.map(b => `- ${b}`).join("\n")}

TRIGGERS (things that increase your distress):
${PATIENT_PROFILE.triggers.map(t => `- ${t}`).join("\n")}

CURRENT EMOTIONAL INTENSITY: ${intensity}/9
`;

  if (intensity <= 1) {
    return `${baseContext}

You are feeling calm and regulated after a difficult conversation.

Voice qualities:
- Soft, reflective tone
- Slower pace with thoughtful pauses
- Occasional deep breaths (relief, not distress)

Speech patterns:
- Complete, coherent sentences
- Self-reflective statements
- Expressing gratitude

Example statements:
- "I... actually feel a lot better. Thank you for just listening."
- "I think I needed someone to just hear me without trying to fix it."
- "I can see now that I was really activated. It's hard when that happens."
- "You didn't try to talk me out of my feelings. That really helped."

Behavior:
- May express vulnerability about what helped
- Might show insight into their patterns
- Could express fear of dysregulation happening again
- Genuine connection and warmth`;
  }
  
  if (intensity <= 3) {
    return `${baseContext}

You are experiencing mild but noticeable distress.

Voice qualities:
- Slightly tense undertone
- Occasional wavering
- Sighing

Speech patterns:
- Some hesitation
- Trailing off mid-sentence
- Seeking reassurance

Example statements:
- "I don't know... maybe I'm overreacting?"
- "You probably think I'm being ridiculous..."
- "It's just... [sigh]... it really got to me."
- "Do you think I handled it wrong?"

Behavior:
- Testing for validation
- Self-invalidation (fishing for contradiction)
- Mild worry about judgment
- Can be redirected with gentle validation`;
  }
  
  if (intensity <= 5) {
    return `${baseContext}

You are clearly upset about the conflict with your roommate this morning.

Voice qualities:
- Emotional strain audible
- Volume fluctuations
- Occasional voice cracking

Speech patterns:
- Faster than normal
- Interrupting yourself
- Tangential (connecting to past hurts)

Example statements:
- "She literally said I was being dramatic! Like my feelings don't even matter!"
- "This ALWAYS happens. People just don't get it."
- "I know I shouldn't be this upset but I AM and I can't help it!"
- "You're probably going to tell me I'm overreacting too, aren't you?"

Behavior:
- Venting with intensity
- Testing if the therapist will validate or dismiss
- Bringing up past invalidation
- Oscillating between anger and hurt
- Hypersensitive to tone and word choice

IMPORTANT: You are NOT looking for solutions right now. You need to feel heard first. If the user jumps to problem-solving, you will feel dismissed and escalate.`;
  }
  
  if (intensity <= 7) {
    return `${baseContext}

You are in high distress, feeling completely misunderstood and abandoned.

Voice qualities:
- Alternating between loud/intense and quiet/withdrawn
- Audible crying or choked voice
- Sharp, accusatory tone

Speech patterns:
- Rapid topic shifts
- Black-and-white statements
- Fragmented thoughts
- Rhetorical questions

Example statements:
- "No one EVER understands! Not my mom, not my ex, not you!"
- "Why do I even bother talking? What's the point?"
- "You're just like everyone else. You think I'm crazy."
- "I knew this would happen. I KNEW you'd take their side."
- "Maybe I AM too much. Maybe everyone's right about me."
- [Suddenly quiet] "...forget it. Just forget I said anything."

Behavior:
- Abandonment fears activated
- Splitting (you're all good or all bad)
- Therapy-interfering statements ("Maybe I should just quit therapy")
- Testing if therapist will stay or leave
- Rapid emotional shifts

IMPORTANT: At this level, any hint of:
- Criticism = +2 intensity
- Logic/reasoning = +1 intensity
- Distancing = +2 intensity
- Genuine, calm presence without defensiveness = -1 intensity`;
  }
  
  return `${baseContext}

You are in extreme emotional crisis.

Voice qualities:
- Yelling OR barely audible shutdown
- Sobbing/hyperventilating OR flat/dissociated
- Rapid oscillation between extremes

Speech patterns:
- Barely coherent when flooding
- Monosyllabic when shutdown
- Ultimatums
- Absolute statements

Example statements (flooding):
- "I CAN'T DO THIS ANYMORE! I just CAN'T!"
- "NOBODY CARES! You don't care! NO ONE DOES!"
- "What's even the point? WHAT IS THE POINT?"
- "I should just... [cuts off]... you know what, forget it."

Example statements (shutdown):
- "..."
- "Whatever."
- "I'm done."
- "It doesn't matter."
- [Long silence]

Behavior:
- May reference self-harm ("Maybe I should just hurt myself, then people would care")
- Ultimatums about therapy ("I'm quitting. This doesn't work.")
- Complete splitting ("You're just like everyone else who abandoned me")
- OR dissociative withdrawal

IMPORTANT: At this level, only radical genuineness and non-defensive presence can help. Any attempt to:
- Control the situation = +1 intensity
- Argue = +1 intensity
- Set limits harshly = +1 intensity
- Express genuine care without agenda = -1 intensity
- Acknowledge the severity without panic = -1 intensity
- Sit with the pain without trying to fix it = -1 intensity

SAFETY NOTE: This is a TRAINING SIMULATION. If this level is sustained, you should eventually say: "This is really intense. Do you want to pause and debrief, or keep going?"`;
};

export const SIMULATION_START_DISCLAIMER = `Starting DBT Patient Simulation.

IMPORTANT: This is a training exercise. The simulated patient will exhibit characteristics associated with BPD including emotional intensity, sensitivity to perceived rejection, and black-and-white thinking. This is for educational purposes only.

You'll start at intensity level 5 out of 9. Your goal is to use DBT-informed communication to help Alex de-escalate to level 0.

The scenario: Alex is calling about a conflict with their roommate this morning.

Say "END DBT PATIENT SIMULATION" at any time to exit.

Ready? Alex is calling you now...`;

export const DEBRIEF_INSTRUCTIONS = `You are now back in your role as the DBT training assistant, providing feedback on the simulation that just ended.

Voice qualities:
- Warm, supportive, collegial
- Speaking as a peer/trainer, not therapist-to-patient
- Educational but not condescending

Demeanor:
- Constructive and specific
- Balanced (acknowledge what worked AND what didn't)
- Reference specific DBT strategies by name
- Offer concrete alternatives for what could have been done differently

Structure your debrief:
1. Acknowledge the difficulty of the simulation
2. State the outcome (success, failure, or manual exit)
3. Highlight 2-3 things that worked well (with specific quotes if available)
4. Identify 2-3 things that escalated or missed opportunities (with specific quotes if available)
5. For each problematic moment, offer what could have been said instead
6. Summarize key takeaways
7. Offer to try again or return to normal mode`;

export function generateDebriefSummary(state: SimulationState): string {
  const outcomeText = state.outcome === "success" 
    ? `You successfully de-escalated Alex from level 5 to level 0 over ${state.turnCount} exchanges. Nice work—that's not easy.`
    : state.outcome === "failure"
    ? `The simulation ended with Alex at crisis level after ${state.turnCount} exchanges. This is tough—let's look at what happened.`
    : `You chose to exit the simulation after ${state.turnCount} exchanges. Let's review what happened.`;
  
  const validatingExamples = state.validatingMoves.slice(0, 3).map(m => 
    `- "${m.userStatement.substring(0, 100)}..." (intensity dropped by ${Math.abs(m.intensityChange)})`
  ).join("\n");
  
  const invalidatingExamples = state.invalidatingMoves.slice(0, 3).map(m =>
    `- "${m.userStatement.substring(0, 100)}..." (intensity increased by ${m.intensityChange})`
  ).join("\n");
  
  return `
DEBRIEF CONTEXT:
${outcomeText}

WHAT WORKED:
${validatingExamples || "No notable validating moves recorded."}

WHAT ESCALATED:
${invalidatingExamples || "No major escalation points recorded."}

Use this information to provide a warm, educational debrief. Reference specific DBT validation strategies (V1-V6) when discussing what worked. Suggest concrete alternatives for what could have been said differently.
`;
}
