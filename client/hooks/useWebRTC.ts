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

let WebRTCModule: typeof import("react-native-webrtc") | null = null;
let isWebRTCSupported = false;

try {
  WebRTCModule = require("react-native-webrtc");
  if (WebRTCModule && WebRTCModule.RTCPeerConnection) {
    WebRTCModule.registerGlobals();
    isWebRTCSupported = true;
  }
} catch (e) {
  console.log("react-native-webrtc not available - running in Expo Go or unsupported environment");
  isWebRTCSupported = false;
}

export function useWebRTC() {
  const pcRef = useRef<any>(null);
  const dcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const fullTranscriptRef = useRef<string>("");
  const messagesRef = useRef<ConversationMessage[]>([]);
  const currentUserMessageRef = useRef<string>("");
  const currentAiMessageRef = useRef<string>("");
  const messageIdCounterRef = useRef<number>(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  const generateMessageId = () => {
    messageIdCounterRef.current += 1;
    return `msg-${Date.now()}-${messageIdCounterRef.current}`;
  };

  const connectRealtime = useCallback(async (
    onTranscript: TranscriptCallback,
    onConnectionState: ConnectionStateCallback,
    onMessage?: MessageCallback
  ) => {
    if (!isWebRTCSupported || !WebRTCModule) {
      setConnectionError("WebRTC not available. Please use a Development Build instead of Expo Go.");
      onConnectionState("error");
      return false;
    }

    const { RTCPeerConnection, RTCSessionDescription, mediaDevices, MediaStream } = WebRTCModule;

    try {
      onConnectionState("connecting");
      setConnectionError(null);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      (pc as any).ontrack = (event: any) => {
        console.log("Received remote track on mobile:", event.track?.kind);
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0] as typeof MediaStream.prototype;
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
          console.log("Remote stream set for audio playback");
          
          stream.getTracks().forEach((track: any) => {
            track.enabled = true;
            console.log(`Remote track: ${track.kind}, enabled: ${track.enabled}`);
          });
        }
      };

      const localStream = await mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;
      
      localStream.getTracks().forEach((track: any) => {
        pc.addTrack(track, localStream);
      });

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      transcriptRef.current = "";
      fullTranscriptRef.current = "";
      messagesRef.current = [];
      currentUserMessageRef.current = "";
      currentAiMessageRef.current = "";

      (dc as any).onopen = () => {
        console.log("Data channel opened");
        setIsConnected(true);
        onConnectionState("connected");
      };

      (dc as any).onclose = () => {
        console.log("Data channel closed");
        setIsConnected(false);
        onConnectionState("disconnected");
      };

      (dc as any).onerror = (error: any) => {
        console.error("Data channel error:", error);
        setConnectionError("Connection error occurred");
        onConnectionState("error");
      };

      (dc as any).onmessage = (event: any) => {
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
          } else if (message.type === "response.audio_transcript.delta") {
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
          } else if (message.type === "response.audio_transcript.done") {
            if (onMessage && currentAiMessageRef.current) {
              const existingAiMsgIndex = messagesRef.current.findIndex(
                m => m.speaker === "ai" && !m.isFinal
              );
              
              if (existingAiMsgIndex >= 0) {
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
      } as any);
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
        const answerDesc = new RTCSessionDescription({ type: "answer", sdp: sdpAnswer });
        await pc.setRemoteDescription(answerDesc);
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track: any) => track.stop());
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }

    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
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
    remoteStream,
    isSupported: isWebRTCSupported,
  };
}
