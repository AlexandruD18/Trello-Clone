-- Ritorno a FLOAT: le posizioni molto vicine possono perdere precisione.
ALTER TABLE `lists` MODIFY `position` float NOT NULL DEFAULT '0';
ALTER TABLE `cards` MODIFY `position` float NOT NULL DEFAULT '0';
ALTER TABLE `checklists` MODIFY `position` float NOT NULL DEFAULT '0';
ALTER TABLE `checklist_items` MODIFY `position` float NOT NULL DEFAULT '0';
