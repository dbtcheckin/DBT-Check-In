import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
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

  // OpenAI Realtime API ephemeral token endpoint
  app.post("/api/realtime/token", async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured",
          message: "Please add your OPENAI_API_KEY to enable voice recording." 
        });
      }

      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: `You are a DBT diary card transcription assistant. Your job is to accurately transcribe what the user says about their day, emotions, urges, and coping skills they used. Listen carefully and transcribe their speech. Focus on:
- Emotions they mention (anxiety, anger, sadness, joy, shame, fear)
- Urges they experienced (self-harm, substance use, etc.)
- DBT skills they used (STOP, TIP, opposite action, check facts, DEAR MAN, wise mind, radical acceptance, etc.)
- Intensity levels they mention (on a scale of 0-5)
Do not ask questions or provide advice. Simply listen and acknowledge what they share.`,
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("OpenAI Realtime session error:", errorData);
        return res.status(response.status).json({ 
          error: "Failed to create realtime session",
          details: errorData 
        });
      }

      const data = await response.json();
      res.json({ 
        client_secret: data.client_secret?.value || data.client_secret,
        session_id: data.id
      });
    } catch (error) {
      console.error("Realtime token error:", error);
      res.status(500).json({ error: "Failed to create realtime session" });
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

  // WebSocket server for realtime audio proxy
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/realtime" });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Client connected to realtime proxy");
    
    if (!process.env.OPENAI_API_KEY) {
      clientWs.send(JSON.stringify({ 
        type: "error", 
        error: { message: "OpenAI API key not configured" } 
      }));
      clientWs.close();
      return;
    }

    let openaiWs: WebSocket | null = null;

    try {
      const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-transcribe",
          input_audio_transcription: {
            model: "gpt-4o-transcribe"
          }
        }),
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error("Failed to create session:", errorText);
        clientWs.send(JSON.stringify({ 
          type: "error", 
          error: { message: "Failed to connect to voice service" } 
        }));
        clientWs.close();
        return;
      }

      const sessionData = await sessionResponse.json();
      const clientSecret = sessionData.client_secret?.value || sessionData.client_secret;

      openaiWs = new WebSocket(
        "wss://api.openai.com/v1/realtime?intent=transcription",
        {
          headers: {
            "Authorization": `Bearer ${clientSecret}`,
            "OpenAI-Beta": "realtime=v1"
          }
        }
      );

      openaiWs.on("open", () => {
        console.log("Connected to OpenAI Realtime API (transcription mode)");
        clientWs.send(JSON.stringify({ type: "session.ready" }));
        
        if (openaiWs) {
          openaiWs.send(JSON.stringify({
            type: "transcription_session.update",
            session: {
              audio: {
                input: {
                  format: {
                    type: "audio/pcm",
                    rate: 24000
                  },
                  transcription: {
                    model: "gpt-4o-transcribe",
                    language: "en"
                  },
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                  }
                }
              }
            }
          }));
        }
      });

      openaiWs.on("message", (data: Buffer | string) => {
        const message = data.toString();
        try {
          const parsed = JSON.parse(message);
          
          const forwardTypes = [
            "conversation.item.input_audio_transcription.completed",
            "conversation.item.input_audio_transcription.delta",
            "conversation.item.input_audio_transcription.failed",
            "transcription_session.created",
            "transcription_session.updated",
            "session.created",
            "session.updated",
            "input_audio_buffer.speech_started",
            "input_audio_buffer.speech_stopped",
            "input_audio_buffer.committed",
            "error"
          ];
          
          if (forwardTypes.includes(parsed.type)) {
            clientWs.send(message);
          }
        } catch (e) {
          console.error("Failed to parse OpenAI message:", e);
        }
      });

      openaiWs.on("error", (error: Error) => {
        console.error("OpenAI WebSocket error:", error);
        clientWs.send(JSON.stringify({ 
          type: "error", 
          error: { message: "Voice service connection error" } 
        }));
      });

      openaiWs.on("close", () => {
        console.log("OpenAI WebSocket closed");
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close();
        }
      });

      clientWs.on("message", (data: Buffer | string) => {
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          const message = typeof data === 'string' ? data : data.toString('utf8');
          try {
            const parsed = JSON.parse(message);
            if (parsed.type === 'input_audio_buffer.append') {
              console.log('Forwarding audio chunk, audio length:', parsed.audio?.length || 0);
            }
          } catch (e) {
            // Not JSON, forward as-is
          }
          openaiWs.send(message);
        }
      });

      clientWs.on("close", () => {
        console.log("Client disconnected");
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close();
        }
      });

    } catch (error) {
      console.error("Realtime proxy error:", error);
      clientWs.send(JSON.stringify({ 
        type: "error", 
        error: { message: "Failed to initialize voice service" } 
      }));
      clientWs.close();
    }
  });

  return httpServer;
}
