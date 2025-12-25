import { useCallback, useRef, useEffect } from "react";
import { useWebRTC, ConversationMessage } from "./useWebRTC";
import { useSimulation, SimulationEvent } from "./useSimulation";
import type { SimulationState } from "@/lib/simulation";

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type MessageCallback = (messages: ConversationMessage[]) => void;
type ConnectionStateCallback = (state: "connecting" | "connected" | "disconnected" | "error") => void;
type SimulationStateCallback = (state: SimulationState) => void;

export function useSimulatedWebRTC() {
  const webRTC = useWebRTC();
  const simulation = useSimulation();
  const simulationStateCallbackRef = useRef<SimulationStateCallback | null>(null);
  const lastProcessedTextRef = useRef<string>("");
  const lastProcessedMessageIdRef = useRef<string>("");

  const handleSimulationEvent = useCallback((event: SimulationEvent) => {
    if (event.type === "simulation_ended") {
      webRTC.cancelResponse();
      
      webRTC.sendEvent({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: "You are now back in DBT diary card assistant mode. Resume your helpful, conversational approach to collecting diary card data. Ask about urges, emotions, actions, substances, and skills as normal.",
        },
      });
      
      setTimeout(() => {
        webRTC.sendEvent({
          type: "response.create",
          response: {
            modalities: ["text", "audio"],
          },
        });
      }, 100);
    }
    
    if (simulationStateCallbackRef.current) {
      simulationStateCallbackRef.current(simulation.simulationState);
    }
  }, [simulation.simulationState, webRTC.sendEvent, webRTC.cancelResponse]);

  useEffect(() => {
    simulation.setEventCallback(handleSimulationEvent);
  }, [simulation.setEventCallback, handleSimulationEvent]);

  const connectWithSimulation = useCallback(async (
    onTranscript: TranscriptCallback,
    onConnectionState: ConnectionStateCallback,
    onMessage?: MessageCallback,
    onSimulationState?: SimulationStateCallback
  ) => {
    if (onSimulationState) {
      simulationStateCallbackRef.current = onSimulationState;
    }

    const wrappedMessageCallback = (messages: ConversationMessage[]) => {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage?.isFinal && lastMessage.speaker === "user") {
        const fullText = lastMessage.text;
        let textToProcess = fullText;
        
        if (lastMessage.id === lastProcessedMessageIdRef.current) {
          const previouslyProcessed = lastProcessedTextRef.current;
          if (fullText.startsWith(previouslyProcessed)) {
            textToProcess = fullText.slice(previouslyProcessed.length).trim();
          }
        } else {
          lastProcessedMessageIdRef.current = lastMessage.id;
          lastProcessedTextRef.current = "";
        }
        
        lastProcessedTextRef.current = fullText;
        
        if (!textToProcess) {
          if (onMessage) {
            onMessage(messages);
          }
          return;
        }
        
        const result = simulation.processMessage(textToProcess, true);
        
        if (result.enteredSimulation) {
          webRTC.cancelResponse();
          
          const systemMessage: ConversationMessage = {
            id: `sim-start-${Date.now()}`,
            speaker: "ai",
            text: simulation.getStartDisclaimer(),
            isFinal: true,
            timestamp: Date.now(),
          };
          messages = [...messages, systemMessage];
          
          if (result.sessionUpdate) {
            webRTC.sendEvent(result.sessionUpdate);
            
            setTimeout(() => {
              webRTC.sendEvent({
                type: "response.create",
                response: {
                  modalities: ["text", "audio"],
                },
              });
            }, 100);
          }
        } else if (result.exitedSimulation) {
          webRTC.cancelResponse();
          
          if (result.sessionUpdate) {
            webRTC.sendEvent(result.sessionUpdate);
            
            setTimeout(() => {
              webRTC.sendEvent({
                type: "response.create",
                response: {
                  modalities: ["text", "audio"],
                },
              });
            }, 100);
          }
        } else if (result.sessionUpdate) {
          webRTC.sendEvent(result.sessionUpdate);
        }
        
        if (onSimulationState) {
          onSimulationState(result.state);
        }
      }
      
      if (onMessage) {
        onMessage(messages);
      }
    };

    simulation.resetSimulation();
    lastProcessedTextRef.current = "";
    lastProcessedMessageIdRef.current = "";
    return webRTC.connectRealtime(onTranscript, onConnectionState, wrappedMessageCallback);
  }, [webRTC.connectRealtime, webRTC.sendEvent, webRTC.cancelResponse, simulation]);

  const disconnectWithSimulation = useCallback(() => {
    simulation.resetSimulation();
    lastProcessedTextRef.current = "";
    lastProcessedMessageIdRef.current = "";
    webRTC.disconnect();
  }, [webRTC.disconnect, simulation.resetSimulation]);

  return {
    ...webRTC,
    connectRealtime: connectWithSimulation,
    disconnect: disconnectWithSimulation,
    simulationState: simulation.simulationState,
    isSimulationActive: simulation.isSimulationActive,
    isInDebrief: simulation.isInDebrief,
    getCurrentIntensity: simulation.getCurrentIntensity,
    exitDebrief: simulation.exitDebrief,
  };
}
