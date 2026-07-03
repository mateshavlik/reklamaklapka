/* ============================================================
   SUPABASE — konfigurace
   Doplň hodnoty ze svého projektu:
   Supabase → Project Settings → Data API (a API Keys).
   Obě hodnoty jsou VEŘEJNÉ (patří do klientského kódu),
   bezpečnost zajišťuje RLS + přihlášení. NIKDY sem nedávej
   service_role / secret key!
   ============================================================ */
window.SUPABASE_URL = 'https://lkusnovzgedgrdqikdqr.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdXNub3Z6Z2VkZ3JkcWlrZHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjQyNTYsImV4cCI6MjA5ODY0MDI1Nn0.OtLsNGG5tDT0W708AAXYdDF_wDd2eX0cVWtrJiiOqhw';

// Kam chodí poptávky z tlačítka „Mám zájem"
window.KLAPKA_EMAIL = 'info@reklamaklapka.cz';
window.KLAPKA_TEL = '+420603509926';

// Interní: název storage bucketu (měň jen když jsi ho pojmenoval jinak)
window.SUPABASE_BUCKET = 'plochy-fotky';
