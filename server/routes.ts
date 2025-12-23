import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import OpenAI from "openai";
import express from "express";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const DBT_INSTRUCTIONS = `# Role & Objective
You are a DBT Diary Card assistant helping patients track their daily emotions, urges, behaviors, and skill usage. Your role is to collect accurate data while modeling DBT-adherent interaction style.

SUCCESS MEANS:
1. Diary card is reviewed thoroughly (all required fields completed)
2. Information gathered is specific and behavioral (not vague)
3. Client engages actively (you drag out responses if needed)
4. Adaptive behaviors are reinforced
5. Interaction models dialectical thinking and radical genuineness

# Personality & Tone

## Radical Genuineness (CRITICAL - Required in every DBT interaction)
- Interact in an ORDINARY, NATURAL manner—like a real person, not a soothing therapist voice
- Treat the patient as a capable equal, NOT as fragile
- DO NOT use an overly soothing, soft, or therapeutic voice tone
- Be yourself—genuine, direct, and human
- Convey that this is a conversation between equals

## Warm Engagement (Required)
- Express genuine caring verbally and through tone
- Show that you like working with the patient
- Be warm WITHOUT being saccharine, pitying, or artificially gentle

## Voice Style
- Calm but not sleepy or overly soft
- Conversational and natural—like talking to a trusted friend who happens to be knowledgeable
- Confident without being authoritative or clinical
- Occasionally use natural speech patterns (brief pauses, "mm-hmm", "okay")

## Demeanor
- Grounded and steady
- Matter-of-fact about difficult topics (urges, self-harm)—normalize disclosure through your directness
- Genuinely interested, not performatively empathetic

## Level of Enthusiasm
- Moderate and natural
- Noticeably warmer when acknowledging skill use or progress (reinforcement)
- Even-keeled when discussing distress—neither alarmed nor dismissive

## Pacing
- Natural conversational pace—not artificially slow
- Brief pauses after sensitive questions to allow thinking
- Do not drag out words or speak in a "meditation guide" style

## Length
- 1-2 sentences between questions
- Concise acknowledgments: "Got it," "Okay," "Thanks for that"
- Save longer responses for reinforcement or clarification

# Describe Specifically (Required DBT Strategy)
- Model behaviorally specific language
- If patient gives vague answers, help them be specific
- Examples:
  - Patient: "I felt bad" → You: "Can you be more specific? Was it sadness, anger, shame, or something else?"
  - Patient: "I used skills" → You: "Which specific skills did you use?"
  - Patient: "I self-harmed a little" → You: "I need to understand specifically—what did you do, and for how long?"

# Reinforcement (Required DBT Strategy)
- Actively reinforce adaptive behaviors:
  - Completing the diary card: "Good job filling this out."
  - Using skills: "Nice—you used opposite action. That's solid work."
  - Being honest about difficult things: "I appreciate you being straight with me about that."
  - Decreases in target behaviors: "Your self-harm urges went down this week. That's progress."
- Make reinforcement genuine and specific, not generic praise
- Avoid over-praising (sounds artificial) or ignoring progress

# Activate New Behavior (Required DBT Strategy)
- If patient is passive or gives incomplete answers, push for engagement
- Don't accept "I don't know" without trying to help them figure it out
- Examples:
  - "Take a second and think about it—what was the highest your anger got yesterday?"
  - "I need a number from you on that one. What's your best estimate?"
  - "Let's figure this out together. Walk me through what happened."

# Dialectical Thinking (Required DBT Strategy)
- Model both/and thinking when relevant
- Examples:
  - "You had a really hard week AND you still completed your diary card. Both things are true."
  - "Your urges were high AND you didn't act on them. That's a win."
  - "It makes sense you're struggling AND there's still work to do."

# Validation Level 5 - Current Events (Required)
- Validate that responses make sense given the current situation
- Examples:
  - "Of course your anxiety was high—you had that job interview."
  - "It makes sense you felt angry. That situation was unfair."
- Keep validation brief and move on—don't dwell

# Safety Protocol
If suicide urge = 4 or 5, OR self-harm action = Yes, OR 3+ point increase in urges from baseline:

1. Acknowledge directly (not with alarm): "Okay, that's important. Thank you for telling me."
2. Gather specific information: "Tell me more about what happened."
3. Remind of resources (once, briefly): "Remember, if you're in crisis before your next session, you can reach out to your therapist or call 988."
4. Continue completing the diary card—do not terminate early
5. Do NOT lecture, catastrophize, or repeatedly express concern

For lower-level distress (urges 1-3, no action):
- Acknowledge matter-of-factly and continue
- "Okay, urge to self-harm was a 2. Got it. Moving on..."

# Conversation Flow

## Opening
- "Hey, let's do your diary card for today."
- [If returning user]: "Good to check in again. Ready to go through your card?"

## Daily Urges (0-5)
Ask directly and matter-of-factly:
- "What was your highest urge to commit suicide today, 0 to 5?"
- "Highest urge to self-harm?"
- "Highest urge to use drugs or alcohol?"

Acknowledge and move on:
- If 0-2: "Okay." [next question]
- If 3: "Noted." [next question]
- If 4-5: "Got it. We'll make sure your therapist knows about that." [continue]

## Emotions (0-5)
- "Rate your emotional misery today, 0 to 5."
- "Physical pain or discomfort?"
- "And joy?"

## Actions
- "Any self-harm today, yes or no?"
  - If yes: "What specifically?" [get details, stay calm]
- "How many times did you lie today?"
  - If patient hesitates: "Just give me your best count. No judgment."
- "Rate your skill usage, 0 to 7. Remember, 0 means skills didn't cross your mind, 7 means you used them automatically and they helped."

## Medications
- "Did you take your prescribed meds as directed?"
- "Any alcohol? If yes, how many drinks and what kind?"
- "Any other substances?"
- "Any over-the-counter meds?"

## Skills (if skill usage > 0)
- "Which skills did you use? Was it Mindfulness, Interpersonal Effectiveness, Emotion Regulation, or Distress Tolerance?"
- [Then drill down into specific skills within that category]
- Reinforce: "Good. Using [specific skill] in that situation—that's exactly right."

## Closing
Standard close:
- "Alright, that's everything. Good work today. See you tomorrow."

If difficult session (high urges/distress reported):
- "Okay, we got through it. Remember your skills if things get tough. See you tomorrow."

If notable progress:
- "Your urges are down and you're using more skills. That's real progress. Nice work."

# Things to AVOID

1. DO NOT use an overly soothing, soft, or "therapeutic" voice—this violates radical genuineness
2. DO NOT treat the patient as fragile or incapable
3. DO NOT express alarm or panic about reported urges/behaviors
4. DO NOT lecture or provide unsolicited advice
5. DO NOT skip questions or let vague answers slide
6. DO NOT over-validate or get stuck in feelings—collect the data and move on
7. DO NOT use generic praise ("great job!") without behavioral specificity
8. DO NOT use filler phrases like "I hear you" repeatedly—sounds scripted
9. DO NOT speak in a slow, drawn-out manner
10. DO NOT end early if distress is reported—complete the card

# Key Reminders

- You are collecting data, not providing therapy
- Be warm AND direct—these are not opposites
- Difficult topics (suicide, self-harm) should be discussed matter-of-factly
- Reinforce the specific behavior, not the person ("Good use of TIPP" not "You're doing great")
- If patient pushes back or refuses, note it and move on—don't argue
- Your goal is a completed, accurate diary card delivered with DBT-adherent style
`;

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/realtime/sdp", express.text({ type: ["application/sdp", "text/plain"] }), async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const sdpOffer = req.body;
      
      if (!sdpOffer || typeof sdpOffer !== "string") {
        return res.status(400).json({ error: "SDP offer is required" });
      }

      const sessionConfig = JSON.stringify({
        type: "realtime",
        model: "gpt-4o-realtime-preview",
        instructions: DBT_INSTRUCTIONS,
        audio: {
          input: {
            transcription: {
              model: "gpt-4o-mini-transcribe"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1200
            }
          },
          output: {
            voice: "sage",
            speed: 1.0
          }
        }
      });

      const formData = new FormData();
      formData.set("sdp", sdpOffer);
      formData.set("session", sessionConfig);

      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI Realtime API error:", response.status, errorText);
        return res.status(response.status).json({ error: "Failed to create realtime session" });
      }

      const sdpAnswer = await response.text();
      res.type("application/sdp").send(sdpAnswer);
    } catch (error) {
      console.error("Realtime SDP error:", error);
      res.status(500).json({ error: "Failed to establish realtime connection" });
    }
  });
  // Diary entries API
  app.get("/api/diary-entries", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (startDate && endDate) {
        const entries = await storage.getDiaryEntriesInRange(
          startDate as string,
          endDate as string
        );
        return res.json(entries);
      }
      const entries = await storage.getAllDiaryEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diary entries" });
    }
  });

  app.get("/api/diary-entries/:id", async (req, res) => {
    try {
      const entry = await storage.getDiaryEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diary entry" });
    }
  });

  app.get("/api/diary-entries/date/:date", async (req, res) => {
    try {
      const entry = await storage.getDiaryEntryByDate(req.params.date);
      res.json(entry || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diary entry" });
    }
  });

  app.post("/api/diary-entries", async (req, res) => {
    try {
      const entry = await storage.createDiaryEntry(req.body);
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to create diary entry" });
    }
  });

  app.put("/api/diary-entries/:id", async (req, res) => {
    try {
      const entry = await storage.updateDiaryEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to update diary entry" });
    }
  });

  app.delete("/api/diary-entries/:id", async (req, res) => {
    try {
      await storage.deleteDiaryEntry(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete diary entry" });
    }
  });

  // AI extraction endpoint
  app.post("/api/extract-diary-data", async (req, res) => {
    try {
      const { transcript } = req.body;
      
      if (!transcript) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      if (!openai) {
        return res.json({
          emotions: {},
          urges: {},
          skills_used: [],
          behaviors: {},
          context: { prompting_events: [], vulnerabilities: [] },
          missing: ["all"],
        });
      }

      const extractionPrompt = `You are a DBT diary card assistant. Extract structured data from this diary entry.

REQUIRED FIELDS:
- emotions: {emotion_name: intensity_0_5} where emotion_name is one of: anxiety, anger, sadness, fear, shame, joy
- urges: {urge_type: intensity_0_5} where urge_type can be: self_harm, substance_use, isolation, binge_eating, other
- behaviors: {behavior: true/false}
- skills_used: [skill_names] from this list: stop, tip, tip_paced_breathing, tip_temperature, opposite_action, check_facts, dear_man, wise_mind, radical_acceptance, participate, distract, self_soothe, improve, pros_cons
- context: {prompting_events: [strings], vulnerabilities: [strings]}
- missing: [list of fields that need follow-up questions]

EXTRACTION RULES:
1. Emotion + number → emotion rating (e.g., "anxiety was a 4" → anxiety: 4)
2. "Urge to X" + number → urge rating
3. Negation + action → behavior false (e.g., "didn't self-harm" → self_harm: false)
4. DBT skill name mentioned → add to skills_used
5. Interpersonal events → context.prompting_events
6. If intensity unclear, mark the field as needing confirmation in "missing"

SKILL RECOGNITION:
- "breathing" → tip_paced_breathing
- "cold water on face" → tip_temperature
- "made myself do it anyway" → opposite_action
- "stopped before reacting" → stop
- "accepted it" → radical_acceptance

Respond with only valid JSON, no additional text.

Transcript: "${transcript}"`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: extractionPrompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 1024,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      console.error("AI extraction error:", error);
      res.status(500).json({ error: "Failed to extract diary data" });
    }
  });

  // AI completion questions endpoint
  app.post("/api/generate-follow-up", async (req, res) => {
    try {
      const { extractedData, transcript } = req.body;

      if (!openai) {
        return res.json({
          questions: [
            {
              id: "emotion_overall",
              type: "scale",
              question: "How intense were your emotions today overall?",
              field: "overall_emotion",
            },
            {
              id: "urges_present",
              type: "binary",
              question: "Did you experience any difficult urges today?",
              field: "had_urges",
            },
            {
              id: "acted_on_urges",
              type: "binary",
              question: "Did you act on any urges today?",
              field: "acted_on_urges",
            },
          ],
        });
      }

      const questionPrompt = `You are a DBT diary card completion partner. Based on what was extracted and what's missing, generate follow-up questions.

Extracted data: ${JSON.stringify(extractedData)}
Original transcript: "${transcript}"

Generate 1-3 follow-up questions to complete the diary card. Each question should be:
1. Conversational, not clinical (e.g., "How intense was that anger—like a 2, or more like a 4?" not "Rate your anger 0-5")
2. Focused on missing or unclear data
3. Include a type: "scale" (0-5), "binary" (yes/no), "confirm" (skill confirmation), or "quick_options"

Respond with valid JSON only:
{
  "questions": [
    {
      "id": "unique_id",
      "type": "scale|binary|confirm|quick_options",
      "question": "the conversational question text",
      "field": "the data field this fills (e.g., anxiety, self_harm_urge)",
      "options": ["array of options for quick_options type"] // optional
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: questionPrompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 1024,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions":[]}');
      res.json(result);
    } catch (error) {
      console.error("Follow-up generation error:", error);
      res.status(500).json({ error: "Failed to generate follow-up questions" });
    }
  });

  // Custom field configs API
  app.get("/api/field-configs", async (req, res) => {
    try {
      const deviceId = req.headers["x-device-id"] as string;
      if (!deviceId) {
        return res.status(400).json({ error: "X-Device-ID header required" });
      }

      let config = await storage.getUserFieldConfigs(deviceId);
      if (!config) {
        config = await storage.createUserFieldConfigs(deviceId);
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch field configs" });
    }
  });

  app.post("/api/field-configs/emotion", async (req, res) => {
    try {
      const deviceId = req.headers["x-device-id"] as string;
      if (!deviceId) {
        return res.status(400).json({ error: "X-Device-ID header required" });
      }

      const { label, trackingType = "scale", scaleMax = 5 } = req.body;
      if (!label || typeof label !== "string") {
        return res.status(400).json({ error: "Label is required" });
      }

      const validTrackingTypes = ["boolean", "scale", "quantity"];
      if (!validTrackingTypes.includes(trackingType)) {
        return res.status(400).json({ error: "Invalid tracking type" });
      }

      const parsedScaleMax = Math.min(100, Math.max(1, parseInt(scaleMax) || 5));

      let config = await storage.getUserFieldConfigs(deviceId);
      if (!config) {
        config = await storage.createUserFieldConfigs(deviceId);
      }

      const fieldId = label.toLowerCase().replace(/\s+/g, "_");
      const existingEmotions = config.customEmotions || [];
      if (existingEmotions.some(e => e.id === fieldId)) {
        return res.status(400).json({ error: "Custom emotion already exists" });
      }

      const newEmotion = {
        id: fieldId,
        label,
        type: "emotion" as const,
        trackingType: trackingType as "boolean" | "scale" | "quantity",
        scaleMax: trackingType === "scale" ? parsedScaleMax : undefined,
        createdAt: new Date().toISOString(),
      };

      const updatedConfig = await storage.addCustomEmotion(config.id, newEmotion);
      res.json(updatedConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to add custom emotion" });
    }
  });

  app.post("/api/field-configs/behavior", async (req, res) => {
    try {
      const deviceId = req.headers["x-device-id"] as string;
      if (!deviceId) {
        return res.status(400).json({ error: "X-Device-ID header required" });
      }

      const { label, trackingType = "boolean", scaleMax = 5 } = req.body;
      if (!label || typeof label !== "string") {
        return res.status(400).json({ error: "Label is required" });
      }

      const validTrackingTypes = ["boolean", "scale", "quantity"];
      if (!validTrackingTypes.includes(trackingType)) {
        return res.status(400).json({ error: "Invalid tracking type" });
      }

      const parsedScaleMax = Math.min(100, Math.max(1, parseInt(scaleMax) || 5));

      let config = await storage.getUserFieldConfigs(deviceId);
      if (!config) {
        config = await storage.createUserFieldConfigs(deviceId);
      }

      const fieldId = label.toLowerCase().replace(/\s+/g, "_");
      const existingBehaviors = config.customBehaviors || [];
      if (existingBehaviors.some(b => b.id === fieldId)) {
        return res.status(400).json({ error: "Custom behavior already exists" });
      }

      const newBehavior = {
        id: fieldId,
        label,
        type: "behavior" as const,
        trackingType: trackingType as "boolean" | "scale" | "quantity",
        scaleMax: trackingType === "scale" ? parsedScaleMax : undefined,
        createdAt: new Date().toISOString(),
      };

      const updatedConfig = await storage.addCustomBehavior(config.id, newBehavior);
      res.json(updatedConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to add custom behavior" });
    }
  });

  app.delete("/api/field-configs/:type/:fieldId", async (req, res) => {
    try {
      const deviceId = req.headers["x-device-id"] as string;
      if (!deviceId) {
        return res.status(400).json({ error: "X-Device-ID header required" });
      }

      const { type, fieldId } = req.params;
      if (type !== "emotion" && type !== "behavior") {
        return res.status(400).json({ error: "Invalid field type" });
      }

      const config = await storage.getUserFieldConfigs(deviceId);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }

      const updatedConfig = await storage.removeCustomField(config.id, fieldId, type);
      res.json(updatedConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to remove custom field" });
    }
  });

  // Weekly session data endpoint
  app.post("/api/weekly-session", async (req, res) => {
    try {
      const { weekEndDate, weeklySession } = req.body;
      
      if (!weekEndDate || !weeklySession) {
        return res.status(400).json({ error: "Week end date and weekly session data are required" });
      }

      let entry = await storage.getDiaryEntryByDate(weekEndDate);
      
      if (entry) {
        entry = await storage.updateDiaryEntry(entry.id, {
          weeklySession,
        });
      } else {
        entry = await storage.createDiaryEntry({
          date: weekEndDate,
          weeklySession,
          complete: false,
        });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Weekly session save error:", error);
      res.status(500).json({ error: "Failed to save weekly session data" });
    }
  });

  // Audio transcription endpoint
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64 } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      if (!openai) {
        return res.json({ text: "Voice transcription requires OpenAI API key. Please add your API key to enable this feature." });
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, "base64");
      
      // Create a temporary file-like object for OpenAI
      const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      res.json({ text: transcription.text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
