-- Versione della sessione: incrementarla invalida tutti i token già emessi
-- per quell'utente ("esci da tutti i dispositivi").
ALTER TABLE `users` ADD COLUMN `session_version` int NOT NULL DEFAULT 0;
