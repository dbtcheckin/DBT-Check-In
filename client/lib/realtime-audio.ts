import { getApiUrl } from "@/lib/query-client";

type RealtimeEventHandler = {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
};

export class RealtimeAudioService {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private handlers: RealtimeEventHandler;
  private isConnected = false;
  private fullTranscript = "";

  constructor(handlers: RealtimeEventHandler) {
    this.handlers = handlers;
  }

  async connect(): Promise<void> {
    try {
      const tokenResponse = await fetch(new URL("/api/realtime/token", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.message || "Failed to get realtime token");
      }

      const { client_secret } = await tokenResponse.json();

      if (!client_secret) {
        throw new Error("No client secret received");
      }

      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      
      this.ws = new WebSocket(wsUrl, [
        "realtime",
        `openai-insecure-api-key.${client_secret}`,
      ]);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.handlers.onConnected();
        
        this.ws?.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            input_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800
            }
          }
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerEvent(data);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      this.ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        this.handlers.onError("Connection error");
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.handlers.onDisconnected();
      };

    } catch (error) {
      console.error("Connection error:", error);
      this.handlers.onError(error instanceof Error ? error.message : "Connection failed");
      throw error;
    }
  }

  private handleServerEvent(event: any) {
    switch (event.type) {
      case "session.created":
        console.log("Realtime session created");
        break;

      case "session.updated":
        console.log("Session updated");
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          this.fullTranscript += (this.fullTranscript ? " " : "") + event.transcript;
          this.handlers.onTranscript(this.fullTranscript, true);
        }
        break;

      case "response.audio_transcript.delta":
        break;

      case "input_audio_buffer.speech_started":
        break;

      case "input_audio_buffer.speech_stopped":
        break;

      case "error":
        console.error("Realtime API error:", event.error);
        this.handlers.onError(event.error?.message || "API error");
        break;
    }
  }

  async startRecording(): Promise<void> {
    try {
      this.fullTranscript = "";
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.ws) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        
        this.ws.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: base64
        }));
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

    } catch (error) {
      console.error("Recording error:", error);
      this.handlers.onError("Failed to start recording");
      throw error;
    }
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async stopRecording(): Promise<string> {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: "input_audio_buffer.commit"
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    return this.fullTranscript;
  }

  disconnect(): void {
    this.stopRecording();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  getTranscript(): string {
    return this.fullTranscript;
  }
}
