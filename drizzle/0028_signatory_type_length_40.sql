-- ALTER document_signatures.signatoryType varchar(20) -> varchar(40)
-- Necessario p/ comportar valores como 'electronic_advanced' (19 chars)
-- e variantes futuras. Idempotente: ALTER no-op se ja em varchar(40).
ALTER TABLE `document_signatures` MODIFY COLUMN `signatoryType` varchar(40) NOT NULL;
