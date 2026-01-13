
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  name: string;
  weight: number; // in kg
  height: number; // in cm
  age: number;
  gender: 'male' | 'female';
  goal: 'lose' | 'maintain' | 'gain';
  activityLevel: ActivityLevel;
  targetChangeKg?: number; 
  durationWeeks?: number;   
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number; 
  unit: string;
  isFavorite?: boolean;
}

export interface LoggedFood {
  id: string;
  foodId: string;
  name: string;
  calories: number;
  timestamp: number;
}

export interface DailyStats {
  waterDrank: number; // in ml
  foods: LoggedFood[];
  completedExercises: string[];
}

export interface CustomExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  notes?: string;
}
