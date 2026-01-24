import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseUrl2 = process.env.SUPABASE_URL2;
const supabaseKey2 = process.env.SUPABASE_KEY2;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseSecondary = supabaseUrl2 && supabaseKey2
  ? createClient(supabaseUrl2, supabaseKey2)
  : null;

export default supabase;
