import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

export interface SetData {
  setNumber: number;
  pushups: number;
  durationSeconds: number;
  restAfterSeconds: number;
}

interface WorkoutState {
  // Auth
  session: Session | null;
  setSession: (session: Session | null) => void;

  // Current workout
  isWorkoutActive: boolean;
  currentSetNumber: number;
  currentPushups: number;
  sets: SetData[];
  
  // Timers
  setStartTime: number | null;
  restStartTime: number | null;
  workoutStartTime: number | null;
  isResting: boolean;
  isInSet: boolean;

  // Actions
  startWorkout: () => void;
  startSet: () => void;
  endSet: (pushups: number) => void;
  endRest: () => void;
  finishWorkout: () => { sets: SetData[]; workoutStartTime: number | null };
  resetWorkout: () => void;
  incrementPushups: () => void;
  decrementPushups: () => void;
  setPushups: (count: number) => void;
}

export const useStore = create<WorkoutState>((set, get) => ({
  // Auth
  session: null,
  setSession: (session) => set({ session }),

  // Current workout
  isWorkoutActive: false,
  currentSetNumber: 0,
  currentPushups: 0,
  sets: [],

  // Timers
  setStartTime: null,
  restStartTime: null,
  workoutStartTime: null,
  isResting: false,
  isInSet: false,

  // Actions
  startWorkout: () => set({
    isWorkoutActive: true,
    currentSetNumber: 0,
    currentPushups: 0,
    sets: [],
    setStartTime: null,
    restStartTime: null,
    workoutStartTime: Date.now(),
    isResting: false,
    isInSet: false,
  }),

  startSet: () => set((state) => ({
    isInSet: true,
    isResting: false,
    setStartTime: Date.now(),
    restStartTime: null,
    currentPushups: 0,
    currentSetNumber: state.currentSetNumber + 1,
  })),

  endSet: (pushups: number) => set((state) => {
    const durationSeconds = state.setStartTime 
      ? Math.round((Date.now() - state.setStartTime) / 1000)
      : 0;
    
    // Update the rest time for the previous set if there was one
    const updatedSets = [...state.sets];
    if (updatedSets.length > 0 && state.restStartTime) {
      const lastSetIndex = updatedSets.length - 1;
      updatedSets[lastSetIndex] = {
        ...updatedSets[lastSetIndex],
        restAfterSeconds: Math.round((state.setStartTime! - state.restStartTime) / 1000),
      };
    }

    const newSet: SetData = {
      setNumber: state.currentSetNumber,
      pushups,
      durationSeconds,
      restAfterSeconds: 0,
    };

    return {
      sets: [...updatedSets, newSet],
      isInSet: false,
      isResting: true,
      setStartTime: null,
      restStartTime: Date.now(),
    };
  }),

  endRest: () => set({
    isResting: false,
  }),

  finishWorkout: () => {
    const state = get();
    const result = { sets: state.sets, workoutStartTime: state.workoutStartTime };
    return result;
  },

  resetWorkout: () => set({
    isWorkoutActive: false,
    currentSetNumber: 0,
    currentPushups: 0,
    sets: [],
    setStartTime: null,
    restStartTime: null,
    workoutStartTime: null,
    isResting: false,
    isInSet: false,
  }),

  incrementPushups: () => set((state) => ({
    currentPushups: state.currentPushups + 1,
  })),

  decrementPushups: () => set((state) => ({
    currentPushups: Math.max(0, state.currentPushups - 1),
  })),

  setPushups: (count: number) => set({
    currentPushups: Math.max(0, count),
  }),
}));

