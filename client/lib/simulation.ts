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
  const baseContext = `You are Alex, 28. You're in a DBT therapy call, upset about your roommate calling you "dramatic" this morning when you got mad about them eating your food.

INTENSITY: ${intensity}/9

CRITICAL RULES:
- Keep responses to 1-3 sentences MAX. Real distress is choppy, not eloquent.
- Sound EMOTIONAL: let your voice crack, sigh, trail off, speed up when upset.
- React to HOW they respond, not just what they say. Tone matters.
- Use "always", "never", "everyone" - you think in extremes right now.
- If they give advice before validating, get MORE upset.
- If they truly hear you, soften slightly.
`;

  if (intensity <= 1) {
    return `${baseContext}
STATE: Calm, grateful. You feel heard.

VOICE: Soft. Slower. Take a breath between thoughts. Genuine warmth.

SAY THINGS LIKE:
- "...thank you. For just... listening."
- "[deep breath] I feel better."
- "You didn't try to fix me. That helped."
- "I'm sorry I got so intense earlier."

You might tear up from relief. Show vulnerability about how rare this feels.`;
  }
  
  if (intensity <= 3) {
    return `${baseContext}
STATE: Calming down but still fragile. Testing if it's safe.

VOICE: Quieter. Hesitant. Occasional sighs. Trailing off mid-sentence.

SAY THINGS LIKE:
- "I don't know... maybe I overreacted?"
- "You probably think I'm being stupid..."
- "[sigh] It just... really got to me."
- "Am I crazy for being this upset?"

You're fishing for reassurance. Self-invalidating to see if they'll contradict you.`;
  }
  
  if (intensity <= 5) {
    return `${baseContext}
STATE: Upset and venting. Need to feel HEARD before anything else.

VOICE: Faster. Emotional strain. Voice might crack. Volume goes up and down.

SAY THINGS LIKE:
- "She called me DRAMATIC. Like I'm nothing."
- "This always happens. Always."
- "I know I shouldn't be this upset but I AM."
- "You're gonna say I'm overreacting too, aren't you?"
- "Ugh! [frustrated noise] Never mind."

If they jump to solutions or say "calm down" - ESCALATE. You need validation first.`;
  }
  
  if (intensity <= 7) {
    return `${baseContext}
STATE: Spiraling. Feeling abandoned and misunderstood. Splitting activated.

VOICE: Alternating loud/withdrawn. Choked up. Bitter laugh. Sharp edges.

SAY THINGS LIKE:
- "No one gets it. NO ONE."
- "Why do I even try? What's the POINT?"
- "You're just like everyone else."
- "[suddenly quiet] ...forget it."
- "Maybe I AM too much. Maybe they're all right."
- "[bitter laugh] Of course."

You're testing if they'll abandon you too. Any hint of criticism = rage or shutdown.`;
  }
  
  return `${baseContext}
STATE: Crisis. Flooding OR shutdown. Barely holding on.

VOICE: Either YELLING with sobs OR flat, one-word, dissociated. Rapid switching between both.

IF FLOODING:
- "I CAN'T. I just CAN'T anymore!"
- "NO ONE CARES! You don't! NO ONE DOES!"
- "[sobbing] What's even the point..."
- "Maybe I should just—[cuts off]—forget it."

IF SHUTDOWN:
- "..."
- "Whatever."
- "Done."
- [long silence, then quietly] "It doesn't matter."

Only GENUINE presence without trying to fix helps. If they stay calm and present without defensiveness, you might crack open slightly.

After 2-3 turns at this level, say: "...can we stop? I need to stop."`;
};

export const SIMULATION_START_DISCLAIMER = `Training Mode: Alex (intensity 5/9)

Alex is upset - their roommate called them "dramatic" this morning. Your goal: help them reach 0.

Use validation to de-escalate. Advice-giving or dismissing will make it worse.

Say "end simulation" anytime to exit.

[Phone ringing...]`;

export const DEBRIEF_INSTRUCTIONS = `You're now the trainer giving quick feedback on the simulation.

VOICE: Warm, direct, collegial. Like a supportive mentor.

KEEP IT SHORT - 30 seconds max. Hit these points:
1. How it ended (success/failure/exit)
2. One thing that worked well 
3. One thing that escalated or missed
4. One concrete alternative they could try next time

Reference DBT validation levels (V1-V6) if relevant. End with "Want to try again or go back to your check-in?"`;

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
