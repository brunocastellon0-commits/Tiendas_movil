import { createClient } from "@supabase/supabase-js";


const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcHZhY2theWV1Ymt0cnhud2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjg4MDcsImV4cCI6MjA4MDc0NDgwN30.ibVudWRu3d9WWxf5DAlnphrx5bprhJDMkvX-mLJMCbI";
const supabaseUrl = "https://icpvackayeubktrxnwjy.supabase.co";


export const supabase= createClient(supabaseUrl, supabaseAnonKey)   ;

