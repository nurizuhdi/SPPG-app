// SPPG (versi mandiri) — konfigurasi. Tempel nilai dari Supabase: Settings -> API.
// TODO: isi 2 baris di bawah ini.
const SUPABASE_URL = "https://ytpgaxtrlfwbrvyrjmpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGdheHRybGZ3YnJ2eXJqbXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTk5ODAsImV4cCI6MjEwNzQzNTk4MH0.Ku59CpsimXiwqxtf_PCa86Hjm1WXcBA2pgYaa_g378Y";

// TODO (opsional, untuk langganan): Client Key Midtrans (BUKAN Server Key — Server Key hanya di secret Supabase).
const MIDTRANS_CLIENT_KEY = "ISI_CLIENT_KEY_MIDTRANS_ANDA";
const MIDTRANS_IS_PRODUCTION = false;

// ---- Data usaha untuk halaman Privasi, Syarat, Refund, FAQ (isi sendiri) ----
// TODO: ganti 5 baris di bawah ini dengan data Anda yang sebenarnya.
const BUSINESS_NAME = "ISI NAMA USAHA ANDA";
const CONTACT_EMAIL = "isi-email@contoh.com";
const CONTACT_WA = "628xxxxxxxxxx";            // format internasional, tanpa + atau spasi
const SUBSCRIPTION_PRICE_TEXT = "Rp150.000";    // samakan dengan secret SUBSCRIPTION_PRICE
const REFUND_DAYS = 7;                          // batas hari pengajuan refund
