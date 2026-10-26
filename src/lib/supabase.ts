import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch {
    // fallback
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch {
    // fallback
  }
  return fallback;
};

export const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://qvlbgwrvvuhgdovxipyf.supabase.co');
export const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'sb_publishable_v9DjNWKxMJz7zpf48i7R-g_1Sazv29g');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
