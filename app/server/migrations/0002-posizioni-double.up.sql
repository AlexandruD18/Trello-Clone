-- Le posizioni passano da FLOAT (4 byte, circa 7 cifre) a DOUBLE: inserire sempre
-- nello stesso punto dimezza lo scarto, e con FLOAT due elementi collassano presto.
-- Quattro ALTER nello stesso file contro la regola 1 del README: sono idempotenti
-- (rilanciarle non fa danni), quindi se una fallisce si può ripetere tutto il file.
ALTER TABLE `lists` MODIFY `position` double NOT NULL DEFAULT '0';
ALTER TABLE `cards` MODIFY `position` double NOT NULL DEFAULT '0';
ALTER TABLE `checklists` MODIFY `position` double NOT NULL DEFAULT '0';
ALTER TABLE `checklist_items` MODIFY `position` double NOT NULL DEFAULT '0';
