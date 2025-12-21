import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vatpvuolfdnkcgdwgsxm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdHB2dW9sZmRua2NnZHdnc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTc3OTMsImV4cCI6MjA3OTE5Mzc5M30.XEJsuWMrWzo1l2otg36z9uZ1Vm3BbItfnhb0r-Ne1NA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
