import { useRef, useCallback, useState } from "react";
import { getApiUrl } from "@/lib/query-client";

export type ConversationMessage = {
  id: string;
  speaker: "user" | "ai";
  text: string;
  isFinal: boolean;
  timestamp: number;
};

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type MessageCallback = (messages: ConversationMessage[]) => void;
type ConnectionStateCallback = (state: "connecting" | "connected" | "disconnected" | "error") => void;

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<string>("");
  const fullTranscriptRef = useRef<string>("");
  const messagesRef = useRef<ConversationMessage[]>([]);
  const currentUserMessageRef = useRef<string>("");
  const currentAiMessageRef = useRef<string>("");
  const messageIdCounterRef = useRef<number>(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const generateMessageId = () => {
    messageIdCounterRef.current += 1;
    return `msg-${Date.now()}-${messageIdCounterRef.current}`;
  };

  const connectRealtime = useCallback(async (
    onTranscript: TranscriptCallback,
    onConnectionState: ConnectionStateCallback,
    onMessage?: MessageCallback
  ) => {
    try {
      onConnectionState("connecting");
      setConnectionError(null);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      if (typeof document !== "undefined") {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.setAttribute("playsinline", "true");
        audioRef.current = audio;
        document.body.appendChild(audio);
        
        pc.ontrack = (e) => {
          if (audio) {
            audio.srcObject = e.streams[0];
            audio.play().catch((err) => {
              console.warn("Audio autoplay blocked:", err);
            });
          }
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      transcriptRef.current = "";
      fullTranscriptRef.current = "";
      messagesRef.current = [];
      currentUserMessageRef.current = "";
      currentAiMessageRef.current = "";

      dc.onopen = () => {
        console.log("Data channel opened");
        setIsConnected(true);
        onConnectionState("connected");
      };

      dc.onclose = () => {
        console.log("Data channel closed");
        setIsConnected(false);
        onConnectionState("disconnected");
      };

      dc.onerror = (error) => {
        console.error("Data channel error:", error);
        setConnectionError("Connection error occurred");
        onConnectionState("error");
      };

      dc.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "conversation.item.input_audio_transcription.delta") {
            currentUserMessageRef.current += message.delta || "";
            transcriptRef.current = fullTranscriptRef.current 
              ? fullTranscriptRef.current + " " + currentUserMessageRef.current 
              : currentUserMessageRef.current;
            onTranscript(transcriptRef.current, false);
            
            if (onMessage) {
              const existingUserMsgIndex = messagesRef.current.findIndex(
                m => m.speaker === "user" && !m.isFinal
              );
              
              if (existingUserMsgIndex >= 0) {
                messagesRef.current[existingUserMsgIndex].text = currentUserMessageRef.current;
              } else {
                messagesRef.current.push({
                  id: generateMessageId(),
                  speaker: "user",
                  text: currentUserMessageRef.current,
                  isFinal: false,
                  timestamp: Date.now(),
                });
              }
              onMessage([...messagesRef.current]);
            }
          } else if (message.type === "conversation.item.input_audio_transcription.completed") {
            const finalText = message.transcript || currentUserMessageRef.current;
            if (fullTranscriptRef.current && finalText) {
              fullTranscriptRef.current += " " + finalText;
            } else {
              fullTranscriptRef.current = finalText;
            }
            transcriptRef.current = fullTranscriptRef.current;
            onTranscript(fullTranscriptRef.current, true);
            
            if (onMessage) {
              const existingUserMsgIndex = messagesRef.current.findIndex(
                m => m.speaker === "user" && !m.isFinal
              );
              
              if (existingUserMsgIndex >= 0) {
                messagesRef.current[existingUserMsgIndex].text = finalText;
                messagesRef.current[existingUserMsgIndex].isFinal = true;
              } else {
                messagesRef.current.push({
                  id: generateMessageId(),
                  speaker: "user",
                  text: finalText,
                  isFinal: true,
                  timestamp: Date.now(),
                });
              }
              onMessage([...messagesRef.current]);
            }
            currentUserMessageRef.current = "";
          } else if (message.type === "response.audio_transcript.delta" || message.type === "response.output_audio_transcript.delta") {
            currentAiMessageRef.current += message.delta || "";
            
            if (onMessage) {
              const existingAiMsgIndex = messagesRef.current.findIndex(
                m => m.speaker === "ai" && !m.isFinal
              );
              
              if (existingAiMsgIndex >= 0) {
                messagesRef.current[existingAiMsgIndex].text = currentAiMessageRef.current;
              } else {
                messagesRef.current.push({
                  id: generateMessageId(),
                  speaker: "ai",
                  text: currentAiMessageRef.current,
                  isFinal: false,
                  timestamp: Date.now(),
                });
              }
              onMessage([...messagesRef.current]);
            }
          } else if (message.type === "response.audio_transcript.done" || message.type === "response.output_audio_transcript.done") {
            const finalText = message.transcript || currentAiMessageRef.current;
            if (onMessage && finalText) {
              const existingAiMsgIndex = messagesRef.current.findIndex(
                m => m.speaker === "ai" && !m.isFinal
              );
              
              if (existingAiMsgIndex >= 0) {
                messagesRef.current[existingAiMsgIndex].text = finalText;
                messagesRef.current[existingAiMsgIndex].isFinal = true;
              }
              onMessage([...messagesRef.current]);
            }
            currentAiMessageRef.current = "";
          } else if (message.type === "error") {
            console.error("OpenAI error:", message.error);
            setConnectionError(message.error?.message || "OpenAI error");
          }
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      const baseUrl = getApiUrl();
      const sdpResponse = await fetch(new URL("/api/realtime/sdp", baseUrl).toString(), {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        const errorData = await sdpResponse.json().catch(() => ({}));
        disconnect();
        throw new Error(errorData.error || "Failed to establish connection");
      }

      const sdpAnswer = await sdpResponse.text();
      
      try {
        await pc.setRemoteDescription({ type: "answer", sdp: sdpAnswer });
      } catch (sdpError) {
        console.error("Failed to set remote description:", sdpError);
        disconnect();
        throw new Error("Failed to complete WebRTC handshake");
      }

      return true;
    } catch (error) {
      console.error("WebRTC connection error:", error);
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      setConnectionError(errorMessage);
      onConnectionState("error");
      return false;
    }
  }, []);

  const sendEvent = useCallback((event: object) => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      dcRef.current.send(JSON.stringify(event));
    }
  }, []);

  const cancelResponse = useCallback(() => {
    sendEvent({ type: "response.cancel" });
  }, [sendEvent]);

  const disconnect = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null;
      if (audioRef.current.parentNode) {
        audioRef.current.parentNode.removeChild(audioRef.current);
      }
      audioRef.current = null;
    }

    transcriptRef.current = "";
    fullTranscriptRef.current = "";
    messagesRef.current = [];
    currentUserMessageRef.current = "";
    currentAiMessageRef.current = "";
    setIsConnected(false);
  }, []);

  const getTranscript = useCallback(() => {
    return fullTranscriptRef.current || transcriptRef.current;
  }, []);

  const getMessages = useCallback(() => {
    return messagesRef.current;
  }, []);

  return {
    connectRealtime,
    disconnect,
    sendEvent,
    cancelResponse,
    getTranscript,
    getMessages,
    isConnected,
    connectionError,
    remoteStream: null,
    isSupported: true,
  };
}
