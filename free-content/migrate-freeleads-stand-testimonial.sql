-- Free-Content-Funnel: Passungsfrage + separates Testimonial-Einverstaendnis
-- stand: "Wo stehst du heute?" (3-Klick, optional gespeichert)
-- testimonial_consent: eigenes freiwilliges Haekchen (DSGVO-Kopplungsverbot), Default 0
-- Additiv + mit Defaults -> alter Code ignoriert die Spalten gefahrlos.
ALTER TABLE free_leads ADD COLUMN stand TEXT DEFAULT '';
ALTER TABLE free_leads ADD COLUMN testimonial_consent INTEGER NOT NULL DEFAULT 0;
