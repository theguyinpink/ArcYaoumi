# Installation sécurisée — Winter Arc pour Elodie

**Cette version durcit les règles RLS.** Un compte Supabase authentifié ne suffit plus : son UUID doit aussi figurer dans l'unique autorisation `app_private.allowed_account`.

## Ordre d'installation sur un projet Supabase NEUF

1. Créer un projet Supabase dédié à Winter Arc.
2. Dans **Authentication → Settings/General**, désactiver **Allow new users to sign up** et **Allow anonymous sign-ins**. Garder la confirmation d'email si applicable. Pour la récupération du mot de passe, configurer l'URL de site et les Redirect URLs.
3. Dans **SQL Editor**, exécuter `supabase/schema.sql` (une seule fois, sur un projet neuf). Le SQL crée la structure, RLS et un bucket **privé**.
4. Dans **Authentication → Users**, créer le compte d'Elodie manuellement. Définir un mot de passe fort, confirmer l'adresse si nécessaire. Ne pas fournir le mot de passe au développeur si elle préfère le garder personnel.
5. Copier son **UUID** depuis Authentication → Users. Dans `supabase/autoriser-elodie.sql`, remplacer `LA_VRAIE_UUID`, puis exécuter le script dans SQL Editor. Cela autorise exclusivement ce compte à utiliser les tables personnelles et les photos.
6. Dans **Project Settings → API Keys**, récupérer **Project URL** et une clé publique `anon` / `publishable`. Remplir le fichier `.env.local` à la racine :

```dotenv
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLIQUE
```

7. Redémarrer `npm run dev`. La vraie connexion email + mot de passe apparaît. Se connecter en tant qu'Elodie, puis tester journal et missions.
8. Sur **Vercel**, configurer les mêmes variables `VITE_...` dans les variables d'environnement et redéployer. Sans ces variables, la version de production refuse désormais le mode démo, par sécurité.

**Ne jamais placer** la clé `service_role`, le mot de passe d'Elodie, `CRON_SECRET` ou une clé privée VAPID dans une variable `VITE_` ou dans GitHub. La clé publique côté navigateur est normale **à condition que RLS soit actif et testé**.

## Tests de sécurité avant le lancement

- Non connecté : impossible de consulter journal et photos.
- Connecté avec le compte d'Elodie : ajout / lecture / modification / suppression de ses entrées.
- Avec un second compte de test, créé temporairement par l'administrateur **sans l'autoriser** : aucune ligne privée visible et aucune écriture autorisée. Supprimer ensuite ce compte.
- Les missions futures doivent rester verrouillées aussi côté SQL.
- Le bucket `journal-photos` doit être **privé** ; les images sont stockées dans `UUID-DELODIE/nom-fichier`.
- Vérifier que `app_private.allowed_account` n'est **pas** un schéma exposé par l'API.

Le fait que ce soit une application à un seul utilisateur ne signifie pas qu'elle est invulnérable : RLS réduit l'accès aux données, mais ne chiffre pas le journal de bout en bout. L'instance Supabase et ses administrateurs techniques restent des acteurs de confiance.

## Correction éditoriale v1.1

- 3 novembre : **Manger en pleine conscience** avec étapes liées à un repas.
- 8 novembre : **Marcher en pleine conscience** avec étapes liées à une promenade.
- Les autres dates et missions restent inchangées.

### Si tu as déjà exécuté l'ancien schéma

**Ne relance pas aveuglément `schema.sql`** : `CREATE POLICY` peut provoquer des doublons. Cette distribution inclut un schéma complet prévu pour un projet neuf. Pour un projet existant avec de vraies données, il faut faire une migration ciblée (et une sauvegarde) plutôt que supprimer les tables.
