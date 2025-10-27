import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://npxtybkyglwntsnjeszq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHR5Ymt5Z2x3bnRzbmplc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mzg5MjcsImV4cCI6MjA3NjExNDkyN30.bjtWnjp3vegGGgbVpfHeQVPpFGCcEo_Pm2ayeY2QE0Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);