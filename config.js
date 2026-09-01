/* ============================================================
   Konfiguration. Beide Werte sind für Client-Anwendungen gedacht und
   dürfen öffentlich im Quelltext stehen (der anon-Key ist kein
   Geheimnis; was er darf, regeln die RLS-Policies in der Datenbank).

   Das Moderations-Passwort steht bewusst NICHT hier — es wird in der
   Datenbank geprüft (bcrypt-Hash). Moderationsansicht öffnen mit
   diskussion.html?presenter
   ============================================================ */
window.DYADIQ_CONFIG = {
  // z. B. 'https://abcdefghijklm.supabase.co'
  supabaseUrl: 'https://hcawgnqqgoebxbpafxae.supabase.co',

  // der 'anon public' Key aus Project Settings → API
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYXdnbnFxZ29lYnhicGFmeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAxNTIsImV4cCI6MjEwMzU4NjE1Mn0.T1gVx5hAoR81neb4bhsdeDs7dDesKHqTp3P-83GaCqs'
};
