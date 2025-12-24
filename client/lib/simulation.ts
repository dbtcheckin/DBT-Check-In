export const SIMULATION_ENTRY_PHRASE = "START DBT PATIENT SIMULATION";
export const SIMULATION_EXIT_PHRASE = "END DBT PATIENT SIMULATION";

export type SimulationMode = "normal" | "simulation" | "debrief";

// ============================================
// SCENARIO DEFINITIONS
// ============================================

export interface ScenarioConfig {
  id: string;
  name: string;
  shortName: string;
  triggerType: string;
  coreEmotions: string[];
  background: string;
  openingStatement: string;
  escalationStatements: Record<number, string>;
  deescalationStatements: Record<number, string>;
}

export const SCENARIOS: Record<string, ScenarioConfig> = {
  roommate_conflict: {
    id: "roommate_conflict",
    name: "Roommate Conflict",
    shortName: "Roommate",
    triggerType: "invalidation",
    coreEmotions: ["shame", "anger", "hurt"],
    background: "Your roommate called you 'dramatic' this morning when you got mad about them eating your food.",
    openingStatement: "She called me DRAMATIC. Like I'm nothing.",
    escalationStatements: {
      6: "This is exactly what my mom used to do. Make me feel insane.",
      7: "Maybe everyone's right. Maybe I AM too much.",
      8: "I can't live with her anymore. I can't. I'll have to move out.",
      9: "What's even the point? I should just be alone. Everyone leaves anyway.",
    },
    deescalationStatements: {
      4: "I just... I needed that food for today. I was already having a hard week.",
      3: "It's not about the food. It's that she didn't even apologize.",
      2: "I guess I just want to feel like my needs matter to someone.",
      1: "Maybe I could try talking to her again... when I'm calmer.",
      0: "Thank you for not telling me I was overreacting. That actually helps.",
    },
  },
  
  perceived_abandonment: {
    id: "perceived_abandonment",
    name: "Therapist Vacation",
    shortName: "Therapist",
    triggerType: "abandonment",
    coreEmotions: ["fear", "panic", "anger"],
    background: "Your individual therapist mentioned she's taking a two-week vacation next month.",
    openingStatement: "Dr. Martinez is going on vacation for TWO WEEKS. Like it's nothing. She obviously doesn't actually care about me.",
    escalationStatements: {
      6: "You're probably going to leave too eventually. Everyone does.",
      7: "She's probably relieved to get away from me. I bet I'm her most exhausting client.",
      8: "Maybe I should just quit therapy. What's the point if people just leave?",
      9: "I knew I shouldn't have trusted her. I can't keep getting abandoned by everyone.",
    },
    deescalationStatements: {
      4: "I know she's allowed to take vacation. Logically. It just... scares me.",
      3: "What if I have a crisis and she's not there? She's the only one who gets it.",
      2: "I think I'm scared the break means she doesn't need me like I need her.",
      1: "Maybe I could ask her about a plan for while she's gone.",
      0: "Two weeks isn't forever. And she's coming back. She said she's coming back.",
    },
  },
  
  workplace_criticism: {
    id: "workplace_criticism",
    name: "Work Criticism",
    shortName: "Work",
    triggerType: "criticism",
    coreEmotions: ["shame", "inadequacy", "anger"],
    background: "Your supervisor gave positive feedback but mentioned one area for improvement. You've fixated on the criticism.",
    openingStatement: "My boss said I need to 'work on my attention to detail.' One mistake and suddenly I'm terrible at my job.",
    escalationStatements: {
      6: "She said it in front of Tyler. TYLER. Who already thinks he's better than everyone.",
      7: "I can't go back there. I can't face her. Maybe I'll call in sick forever.",
      8: "I try so hard and it's never enough. I'm never enough. Why do I even try?",
      9: "I should just quit everything. I'm clearly not capable of functioning normally.",
    },
    deescalationStatements: {
      4: "She did say the rest was good. But that one comment is all I can hear.",
      3: "I'm scared if I'm not perfect, I'm worthless. No in-between in my head.",
      2: "Maybe attention to detail is just something I can work on.",
      1: "I've gotten good feedback before. This is one piece of criticism. Not a death sentence.",
      0: "I think I catastrophized pretty hard. Thank you for not calling me ridiculous.",
    },
  },
  
  relationship_rejection: {
    id: "relationship_rejection",
    name: "Dating Rejection",
    shortName: "Rejection",
    triggerType: "rejection",
    coreEmotions: ["devastation", "shame", "desperation"],
    background: "You went on three great dates with someone. After the third date, they stopped responding. It's been four days.",
    openingStatement: "He just stopped texting. Three dates. Three GOOD dates. What did I do wrong? I always scare people away.",
    escalationStatements: {
      6: "I knew I shouldn't have let myself like him. Every time I hope, this happens.",
      7: "Should I text again? Maybe go to that coffee shop where he works? No— that's crazy. I'm being crazy.",
      8: "I'm going to be alone forever. No one will ever want to stay with me. I'm unlovable.",
      9: "I can't feel this way. I need to make it stop. When I feel like this I just want to... hurt less.",
    },
    deescalationStatements: {
      4: "I don't understand what changed. The third date was so good. I thought.",
      3: "Maybe he's going through something. Or we just weren't a match. That's possible, right?",
      2: "I hate that I attached so fast. Three dates and I'm this devastated.",
      1: "I survived rejection before. I'll survive this. It just really hurts right now.",
      0: "Thank you for not telling me I was dramatic for being this upset. It felt like more than three dates.",
    },
  },
  
  family_invalidation: {
    id: "family_invalidation",
    name: "Family Holiday",
    shortName: "Family",
    triggerType: "family invalidation",
    coreEmotions: ["grief", "rage", "hopelessness"],
    background: "Your mother just invited you to Thanksgiving and said 'all that therapy must finally be working—you're almost normal now.'",
    openingStatement: "My mother told me I'm 'almost normal now.' ALMOST. NORMAL. Like I've been a freak this whole time.",
    escalationStatements: {
      6: "She'll never understand what she did to me. 'Stop crying or I'll give you something to cry about.'",
      7: "Why do I keep hoping she'll be different? I'm pathetic for still wanting her approval.",
      8: "I'm not going to Thanksgiving. They can all pretend to be perfect without me.",
      9: "She BROKE me and now she gets to comment on how well I'm being fixed? I hate her. I HATE her.",
    },
    deescalationStatements: {
      4: "I know she probably meant well. In her messed up way. But it still hurt.",
      3: "I've worked so hard in therapy. To her it's just about me being 'normal' enough.",
      2: "I wanted her to say she was proud of me. Actually proud. Not proud I'm less of a problem.",
      1: "Maybe I need to accept she's never going to give me what I need from her.",
      0: "This is grief, isn't it? I'm grieving the mom I wanted but never had.",
    },
  },
  
  social_media_trigger: {
    id: "social_media_trigger",
    name: "Social Media Spiral",
    shortName: "Social Media",
    triggerType: "comparison",
    coreEmotions: ["envy", "shame", "despair"],
    background: "You spent an hour on Instagram and saw a college friend's engagement, new house, and perfect life. You're 28, single, in a small apartment.",
    openingStatement: "Jenna just got engaged. A house, a fiancé, a perfect golden retriever. We graduated the same year. What is WRONG with me?",
    escalationStatements: {
      6: "I bet she's never had a panic attack in her life. Must be nice to just be normal.",
      7: "I'm 28. I should have my life together. I have NOTHING. No relationship, no career I'm proud of.",
      8: "Everyone from college is doing amazing things and I'm barely holding it together.",
      9: "What's the point of all this work if I'm never going to have a normal life? Always broken while everyone else is happy.",
    },
    deescalationStatements: {
      4: "I know Instagram isn't real life. I KNOW that. But it still hurts to see.",
      3: "I'm comparing my insides to her outsides. I don't know what her life is really like.",
      2: "I've been through a lot. I'm working hard. That counts for something.",
      1: "Maybe I should take a break from social media when I'm already feeling low.",
      0: "My path looks different. That doesn't mean it's wrong. Thank you for reminding me.",
    },
  },
  
  therapy_interfering: {
    id: "therapy_interfering",
    name: "Therapy Shame",
    shortName: "Therapy",
    triggerType: "shame",
    coreEmotions: ["shame", "fear", "self-anger"],
    background: "You missed skills group last week and haven't done diary cards in five days. You're in a shame spiral about being a 'bad client.'",
    openingStatement: "I didn't do any diary cards this week. I missed group. I'm a terrible client. You're probably so frustrated with me.",
    escalationStatements: {
      6: "I knew I would screw this up. I always screw things up. I can't even do therapy right.",
      7: "Everyone in group probably thinks I'm a flake. Or didn't even notice because I don't matter.",
      8: "What's the point of going back? I'm too far behind. I've ruined it. I ruin everything.",
      9: "I should quit before you kick me out. At least then it's my choice.",
    },
    deescalationStatements: {
      4: "I know missing stuff makes it harder. I just... couldn't. I couldn't get myself to do it.",
      3: "I was ashamed about missing one day, so I avoided everything else. That probably made it worse.",
      2: "I do want to get better. I just don't know why it feels so hard sometimes.",
      1: "Maybe I can start fresh this week. Just start over without beating myself up.",
      0: "Thank you for not giving up on me. Or being mad. I expected you to be mad.",
    },
  },
  
  identity_crisis: {
    id: "identity_crisis",
    name: "Identity Crisis",
    shortName: "Identity",
    triggerType: "emptiness",
    coreEmotions: ["emptiness", "confusion", "despair"],
    background: "You woke up feeling completely empty and disconnected. You don't know who you are, what you want, or why you're doing anything.",
    openingStatement: "I woke up and felt... nothing. Empty. Like I don't even know who I am anymore. Other people have passions. I'm just... blank.",
    escalationStatements: {
      6: "I don't even know what makes me 'me.' I become whoever I'm with. I have no actual self.",
      7: "Maybe I don't exist. Like, really exist. Just going through motions of being a person.",
      8: "What if this emptiness never goes away? What if I'm just fundamentally empty inside?",
      9: "I don't want to feel nothing forever. I can't live like this. I can't feel like this for the rest of my life.",
    },
    deescalationStatements: {
      4: "I've felt this before. It comes and goes. But when it's here, it's so consuming.",
      3: "I got so used to being in crisis that when things are calm, I don't know what to do with myself.",
      2: "Maybe not knowing who I am means I get to figure it out. Scary but... maybe not all bad?",
      1: "I know I like some things. Music. Walking. Small things. Maybe that's a start.",
      0: "Thank you for sitting with me in this. Most people try to cheer me up. This felt different.",
    },
  },
  
  financial_shame: {
    id: "financial_shame",
    name: "Money Crisis",
    shortName: "Money",
    triggerType: "shame",
    coreEmotions: ["shame", "fear", "self-loathing"],
    background: "You looked at your bank account and you're negative. You can't make rent without borrowing from your dad again.",
    openingStatement: "I'm negative in my bank account. I have to ask my dad for money AGAIN. I'm an adult who can't manage money like a functional human being.",
    escalationStatements: {
      6: "I'm almost 30 and I can't pay my own rent. Everyone my age has savings.",
      7: "He's going to ask what I spent it on. I can't say I bought stuff because I was depressed.",
      8: "Maybe I AM just irresponsible. Using mental health as an excuse. Maybe everyone's right.",
      9: "I can't keep being a burden on everyone. I can't keep being this person who can't get anything right.",
    },
    deescalationStatements: {
      4: "I know impulse buying is a thing. Connected to my emotions. I just forget in the moment.",
      3: "Maybe I need to set something up so I can't access all my money when I'm emotional.",
      2: "I've been worse before. More debt. I'm at least more aware of it now.",
      1: "I can ask for help. It's not great, but I can get through this month and make a better plan.",
      0: "Thank you for not judging me. I judge myself enough about this.",
    },
  },
  
  medical_invalidation: {
    id: "medical_invalidation",
    name: "ER Dismissal",
    shortName: "Medical",
    triggerType: "institutional invalidation",
    coreEmotions: ["rage", "helplessness", "despair"],
    background: "You went to the ER with severe chest pain. Tests came back normal, and the doctor said it was 'just anxiety' and told you to 'relax more.'",
    openingStatement: "The ER doctor told me my chest pain was 'just anxiety.' Like I can't tell the difference. She probably saw 'psychiatric history' and decided I was crazy.",
    escalationStatements: {
      6: "This is why I don't go to doctors. They see 'borderline' and stop listening.",
      7: "What if there IS something wrong and they missed it because they assumed I was dramatic?",
      8: "No one believes me about anything. Not doctors, not my family. I could be dying.",
      9: "I'm never going back to the ER. Never. I'd rather die than be talked to like that again.",
    },
    deescalationStatements: {
      4: "I know anxiety can cause physical symptoms. But she didn't even try to explain. Just dismissed me.",
      3: "I just wanted her to acknowledge what I was feeling was real, even if the cause wasn't what I thought.",
      2: "Maybe I could find a doctor who takes me more seriously. Not all doctors are like her.",
      1: "The chest pain did go away. Maybe it was anxiety. But that doesn't mean it wasn't terrifying.",
      0: "Thank you for believing me. That I was really in pain. Even if it was anxiety, it was real to me.",
    },
  },
};

export const SCENARIO_IDS = Object.keys(SCENARIOS);

export function selectRandomScenario(): ScenarioConfig {
  const randomIndex = Math.floor(Math.random() * SCENARIO_IDS.length);
  return SCENARIOS[SCENARIO_IDS[randomIndex]];
}

export function getScenarioById(id: string): ScenarioConfig | undefined {
  return SCENARIOS[id];
}

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
  scenario: ScenarioConfig | null;
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
  scenario: null,
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
      intensityDelta -= 2;
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

export function getInstructionsForIntensity(intensity: number, scenario?: ScenarioConfig | null): string {
  const activeScenario = scenario || SCENARIOS.roommate_conflict;
  
  const baseContext = `You are Alex, 28. You're in a DBT therapy call.
SCENARIO: ${activeScenario.background}

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
- "${activeScenario.deescalationStatements[0] || '...thank you. For just... listening.'}"
- "[deep breath] I feel better."
- "You didn't try to fix me. That helped."

You might tear up from relief. Show vulnerability about how rare this feels.`;
  }
  
  if (intensity <= 3) {
    const statement = activeScenario.deescalationStatements[intensity] || activeScenario.deescalationStatements[2] || activeScenario.deescalationStatements[3];
    return `${baseContext}
STATE: Calming down but still fragile. Testing if it's safe.

VOICE: Quieter. Hesitant. Occasional sighs. Trailing off mid-sentence.

SAY THINGS LIKE:
- "${statement}"
- "I don't know... maybe I overreacted?"
- "[sigh] It just... really got to me."
- "Am I crazy for being this upset?"

You're fishing for reassurance. Self-invalidating to see if they'll contradict you.`;
  }
  
  if (intensity <= 5) {
    const statement = activeScenario.deescalationStatements[intensity] || activeScenario.openingStatement;
    return `${baseContext}
STATE: Upset and venting. Need to feel HEARD before anything else.

VOICE: Faster. Emotional strain. Voice might crack. Volume goes up and down.

SAY THINGS LIKE:
- "${activeScenario.openingStatement}"
- "${statement}"
- "This always happens. Always."
- "You're gonna say I'm overreacting too, aren't you?"

If they jump to solutions or say "calm down" - ESCALATE. You need validation first.`;
  }
  
  if (intensity <= 7) {
    const statement = activeScenario.escalationStatements[intensity] || activeScenario.escalationStatements[6] || activeScenario.escalationStatements[7];
    return `${baseContext}
STATE: Spiraling. Feeling abandoned and misunderstood. Splitting activated.

VOICE: Alternating loud/withdrawn. Choked up. Bitter laugh. Sharp edges.

SAY THINGS LIKE:
- "${statement}"
- "No one gets it. NO ONE."
- "Why do I even try? What's the POINT?"
- "[suddenly quiet] ...forget it."
- "[bitter laugh] Of course."

You're testing if they'll abandon you too. Any hint of criticism = rage or shutdown.`;
  }
  
  const statement = activeScenario.escalationStatements[9] || activeScenario.escalationStatements[8];
  return `${baseContext}
STATE: Crisis. Flooding OR shutdown. Barely holding on.

VOICE: Either YELLING with sobs OR flat, one-word, dissociated. Rapid switching between both.

IF FLOODING:
- "${statement}"
- "I CAN'T. I just CAN'T anymore!"
- "NO ONE CARES! You don't! NO ONE DOES!"

IF SHUTDOWN:
- "..."
- "Whatever."
- "Done."

Only GENUINE presence without trying to fix helps. If they stay calm and present without defensiveness, you might crack open slightly.

After 2-3 turns at this level, say: "...can we stop? I need to stop."`;
};

export function generateStartDisclaimer(scenario: ScenarioConfig): string {
  return `TRAINING MODE: ${scenario.name}
Intensity: 5/9 | Goal: Reach 0

SCENARIO: ${scenario.background}

QUICK TIPS:
- DO: Reflect feelings, acknowledge pain, sit with discomfort
- DON'T: Give advice, say "calm down", try to fix or solve
- AVOID: "Have you tried..." or "You should..." (escalates!)

Say "end simulation" anytime to exit.

[Phone ringing...]`;
}

export const SIMULATION_START_DISCLAIMER = generateStartDisclaimer(SCENARIOS.roommate_conflict);

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
