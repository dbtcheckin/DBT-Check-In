import { useRef, useCallback, useState } from "react";
import { getApiUrl } from "@/lib/query-client";

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type ConnectionStateCallback = (state: "connecting" | "connected" | "disconnected" | "error") => void;

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<string>("");
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectRealtime = useCallback(async (
    onTranscript: TranscriptCallback,
    onConnectionState: ConnectionStateCallback
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
            transcriptRef.current += message.delta || "";
            onTranscript(transcriptRef.current, false);
          } else if (message.type === "conversation.item.input_audio_transcription.completed") {
            transcriptRef.current = message.transcript || transcriptRef.current;
            onTranscript(transcriptRef.current, true);
          } else if (message.type === "response.audio_transcript.delta") {
            console.log("AI speaking:", message.delta);
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
    setIsConnected(false);
  }, []);

  const getTranscript = useCallback(() => {
    return transcriptRef.current;
  }, []);

  return {
    connectRealtime,
    disconnect,
    sendEvent,
    cancelResponse,
    getTranscript,
    isConnected,
    connectionError,
    remoteStream: null,
    isSupported: true,
  };
}
