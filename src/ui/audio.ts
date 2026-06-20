import type { GameEvent } from "../shared/types";

export type FeedbackSound = "placement" | "warning" | "milestone" | "insufficient-funds";

export interface AudioFeedback {
  playEvents: (events: GameEvent[]) => void;
  playFailure: (error: string | undefined) => void;
}

interface Tone {
  frequency: number;
  duration: number;
  type: OscillatorType;
}

const TONES: Record<FeedbackSound, Tone> = {
  placement: { frequency: 440, duration: 0.07, type: "triangle" },
  warning: { frequency: 220, duration: 0.12, type: "sawtooth" },
  milestone: { frequency: 660, duration: 0.16, type: "sine" },
  "insufficient-funds": { frequency: 150, duration: 0.16, type: "square" },
};

export function createAudioFeedback(isEnabled: () => boolean): AudioFeedback {
  let context: AudioContext | null = null;

  return {
    playEvents(events) {
      events.forEach((event) => {
        const sound = getFeedbackSound(event);
        if (sound) playTone(sound, isEnabled, () => getContext());
      });
    },
    playFailure(error) {
      if (error === "Insufficient money") {
        playTone("insufficient-funds", isEnabled, () => getContext());
      }
    },
  };

  function getContext(): AudioContext | null {
    if (context) return context;
    if (!window.AudioContext) return null;
    context = new window.AudioContext();
    return context;
  }
}

export function getFeedbackSound(event: GameEvent): FeedbackSound | null {
  if (
    event.type === "ROAD_PLACED" ||
    event.type === "ZONE_PAINTED" ||
    event.type === "BUILDING_ADDED"
  ) {
    return "placement";
  }
  if (event.type === "WARNING_ADDED") return "warning";
  if (event.type === "MILESTONE_REACHED") return "milestone";
  return null;
}

function playTone(
  sound: FeedbackSound,
  isEnabled: () => boolean,
  getAudioContext: () => AudioContext | null,
): void {
  if (!isEnabled()) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const tone = TONES[sound];
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = tone.type;
  oscillator.frequency.value = tone.frequency;
  gain.gain.setValueAtTime(0.04, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + tone.duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + tone.duration);
}
