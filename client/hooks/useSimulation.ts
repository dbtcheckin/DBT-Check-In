import { useState, useCallback, useRef } from "react";
import {
  SimulationState,
  SimulationTurn,
  createInitialSimulationState,
  checkForSimulationEntry,
  checkForSimulationExit,
  processUserInput,
  getVoiceConfigForIntensity,
  getInstructionsForIntensity,
  SIMULATION_START_DISCLAIMER,
  DEBRIEF_INSTRUCTIONS,
  generateDebriefSummary,
} from "@/lib/simulation";

export type SimulationEventType = 
  | "entry_detected"
  | "exit_detected"
  | "intensity_changed"
  | "debrief_started"
  | "simulation_ended";

export interface SimulationEvent {
  type: SimulationEventType;
  data?: {
    intensity?: number;
    intensityDelta?: number;
    outcome?: string;
    debriefSummary?: string;
  };
}

export function useSimulation() {
  const [simulationState, setSimulationState] = useState<SimulationState>(
    createInitialSimulationState()
  );
  const stateRef = useRef<SimulationState>(createInitialSimulationState());
  const eventCallbackRef = useRef<((event: SimulationEvent) => void) | null>(null);

  const setEventCallback = useCallback((callback: (event: SimulationEvent) => void) => {
    eventCallbackRef.current = callback;
  }, []);

  const emitEvent = useCallback((event: SimulationEvent) => {
    if (eventCallbackRef.current) {
      eventCallbackRef.current(event);
    }
  }, []);

  const startSimulation = useCallback(() => {
    const newState: SimulationState = {
      active: true,
      mode: "simulation",
      currentIntensity: 5,
      turnCount: 0,
      turnsAtLevel9: 0,
      history: [],
      outcome: null,
      validatingMoves: [],
      invalidatingMoves: [],
    };
    stateRef.current = newState;
    setSimulationState(newState);
    emitEvent({ type: "entry_detected" });
    return newState;
  }, [emitEvent]);

  const endSimulation = useCallback((outcome: "success" | "failure" | "manual_exit") => {
    const finalState: SimulationState = {
      ...stateRef.current,
      active: false,
      mode: "debrief",
      outcome,
    };
    stateRef.current = finalState;
    setSimulationState(finalState);
    emitEvent({ 
      type: "exit_detected", 
      data: { 
        outcome,
        debriefSummary: generateDebriefSummary(finalState),
      } 
    });
    return finalState;
  }, [emitEvent]);

  const exitDebrief = useCallback(() => {
    const newState = createInitialSimulationState();
    stateRef.current = newState;
    setSimulationState(newState);
    emitEvent({ type: "simulation_ended" });
    return newState;
  }, [emitEvent]);

  const processMessage = useCallback((userMessage: string, isUserSpeaker: boolean) => {
    const currentState = stateRef.current;
    
    if (!currentState.active && currentState.mode !== "simulation") {
      if (isUserSpeaker && checkForSimulationEntry(userMessage)) {
        return { 
          enteredSimulation: true, 
          state: startSimulation(),
          sessionUpdate: getSimulationSessionUpdate(5),
        };
      }
      return { enteredSimulation: false, state: currentState };
    }
    
    if (currentState.active && currentState.mode === "simulation" && isUserSpeaker) {
      const exitCheck = checkForSimulationExit(userMessage, currentState);
      
      if (exitCheck.exit) {
        const finalState = endSimulation(exitCheck.reason as "success" | "failure" | "manual_exit");
        return { 
          exitedSimulation: true, 
          state: finalState,
          sessionUpdate: getDebriefSessionUpdate(finalState),
        };
      }
      
      const result = processUserInput(userMessage, currentState);
      
      const turn: SimulationTurn = {
        turn: currentState.turnCount + 1,
        userStatement: userMessage,
        classification: result.classification,
        strategies: result.strategies,
        intensityChange: result.intensityDelta,
        newIntensity: result.newIntensity,
        aiResponse: "",
      };
      
      const newState: SimulationState = {
        ...currentState,
        currentIntensity: result.newIntensity,
        turnCount: currentState.turnCount + 1,
        turnsAtLevel9: result.turnsAtLevel9,
        history: [...currentState.history, turn],
        validatingMoves: result.classification === "validating" 
          ? [...currentState.validatingMoves, turn]
          : currentState.validatingMoves,
        invalidatingMoves: result.classification === "invalidating"
          ? [...currentState.invalidatingMoves, turn]
          : currentState.invalidatingMoves,
      };
      
      stateRef.current = newState;
      setSimulationState(newState);
      
      emitEvent({
        type: "intensity_changed",
        data: {
          intensity: result.newIntensity,
          intensityDelta: result.intensityDelta,
        },
      });
      
      if (result.outcome === "success") {
        const finalState = endSimulation("success");
        return { 
          exitedSimulation: true, 
          state: finalState,
          sessionUpdate: getDebriefSessionUpdate(finalState),
        };
      }
      
      if (result.outcome === "failure_offer_exit") {
        const finalState = endSimulation("failure");
        return { 
          exitedSimulation: true, 
          state: finalState,
          sessionUpdate: getDebriefSessionUpdate(finalState),
          reason: "sustained_crisis",
        };
      }
      
      const intensityChanged = Math.abs(result.intensityDelta) >= 1;
      return {
        state: newState,
        sessionUpdate: intensityChanged 
          ? getSimulationSessionUpdate(result.newIntensity)
          : undefined,
      };
    }
    
    return { state: currentState };
  }, [startSimulation, endSimulation, emitEvent]);

  const getSimulationSessionUpdate = useCallback((intensity: number) => {
    const config = getVoiceConfigForIntensity(intensity);
    return {
      type: "session.update",
      session: {
        instructions: getInstructionsForIntensity(intensity),
        voice: config.voice,
      },
    };
  }, []);

  const getDebriefSessionUpdate = useCallback((state: SimulationState) => {
    const debriefContext = generateDebriefSummary(state);
    return {
      type: "session.update",
      session: {
        instructions: `${DEBRIEF_INSTRUCTIONS}\n\n${debriefContext}`,
        voice: "sage",
      },
    };
  }, []);

  const getStartDisclaimer = useCallback(() => SIMULATION_START_DISCLAIMER, []);

  const isSimulationActive = useCallback(() => {
    return stateRef.current.active && stateRef.current.mode === "simulation";
  }, []);

  const isInDebrief = useCallback(() => {
    return stateRef.current.mode === "debrief";
  }, []);

  const getCurrentIntensity = useCallback(() => {
    return stateRef.current.currentIntensity;
  }, []);

  const resetSimulation = useCallback(() => {
    const newState = createInitialSimulationState();
    stateRef.current = newState;
    setSimulationState(newState);
  }, []);

  return {
    simulationState,
    processMessage,
    startSimulation,
    endSimulation,
    exitDebrief,
    resetSimulation,
    isSimulationActive,
    isInDebrief,
    getCurrentIntensity,
    getStartDisclaimer,
    setEventCallback,
  };
}
