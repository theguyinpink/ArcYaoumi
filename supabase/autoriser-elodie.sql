-- Exécuter APRÈS supabase/schema.sql et APRÈS la création du compte d'Elodie.
-- 1) Authentication > Users > copier son UUID.
-- 2) Remplacer LA_VRAIE_UUID ci-dessous, sans utiliser son email ni son mot de passe.
-- 3) Exécuter dans SQL Editor (rôle administrateur).
insert into app_private.allowed_account(slot, user_id)
values (1, 'LA_VRAIE_UUID'::uuid)
on conflict (slot) do update set user_id = excluded.user_id;

-- Vérification : doit renvoyer une seule ligne pour Elodie.
select slot, user_id from app_private.allowed_account;
