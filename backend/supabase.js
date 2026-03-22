const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with user authentication
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_KEY; // Using anon key
const supabaseEmail = process.env.SUPABASE_EMAIL;
const supabasePassword = process.env.SUPABASE_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

if (!supabaseEmail || !supabasePassword) {
  console.error('Missing Supabase user credentials. Please check SUPABASE_EMAIL and SUPABASE_PASSWORD in .env');
  process.exit(1);
}

// Create Supabase client with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Authenticate with email/password
let isAuthenticated = false;

async function authenticateSupabase() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: supabaseEmail,
      password: supabasePassword
    });

    if (error) {
      console.error('Supabase authentication error:', error.message);
      process.exit(1);
    }

    isAuthenticated = true;
    console.log('Supabase client authenticated successfully');
  } catch (error) {
    console.error('Failed to authenticate with Supabase:', error);
    process.exit(1);
  }
}

// Authenticate immediately
authenticateSupabase();

// Export both the client and a ready check
module.exports = supabase;
module.exports.isReady = () => isAuthenticated;
