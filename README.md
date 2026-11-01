> **Mise à jour v1.1 — sécurité mono-utilisateur :** commence par [SECURITE-SUPABASE.md](SECURITE-SUPABASE.md). Une autorisation par UUID est désormais obligatoire.

# Winter Arc ♡ Elodie

Une PWA privée, cozy et mobile-first pour 92 petites missions entre le 1er novembre 2026 et le 31 janvier 2027.

**Stack :** React 19 + TypeScript + Vite 6 + Tailwind CSS 3 + Motion + Supabase + Vercel + Web Push.

## Les fonctionnalités

- **Today** : mission du jour, suivi, jardin, « I need a little love ♡ ».
- **Journey** : calendrier novembre/décembre/janvier et déblocage progressif.
- **Mission** : intention, durée, 3 étapes, version douce, encouragement, question facultative.
- **Journal** : humeur, texte libre, gratitudes, petites victoires, photos, plusieurs entrées par jour.
- **Growth** : jardin fleuri qui évolue avec les missions, badges débloqués automatiquement.
- **Space** : notifications personnalisables, bibliothèque de 120 phrases, créations et exclusions.
- **PWA** : installable et navigable hors connexion pour l'interface et les missions déjà mises en cache.

## 1. Démarrer immédiatement — mode démo

```bash
npm install
npm run dev
```

Ouvrir http://localhost:5173. **Sans fichier `.env`, le mode démo s'active automatiquement.**

La démo utilise une date simulée initiale du **3 novembre 2026** afin de tester les premières missions avant le début du Winter Arc. Dans **Space → Horloge de démonstration**, changer la date pour explorer les 92 jours. Les cases, journaux et préférences de démonstration sont conservés dans `localStorage` du navigateur (non chiffré, non privé et non synchronisé). Ne pas y écrire de données sensibles. Les notifications externes ne sont pas actives en démo.

## 2. Activer le vrai compte Supabase

1. Créer un projet Supabase.
2. Coller `supabase/schema.sql` dans le **SQL Editor** et exécuter le script une fois (il suppose un projet neuf). Les politiques RLS sont essentielles.
3. Dans **Authentication → Providers → Email**, désactiver les inscriptions publiques.
4. Dans **Authentication → Users**, créer manuellement le compte d'Elodie avec une adresse email et un mot de passe choisi, puis confirmer l'email si nécessaire. **Ne jamais inclure le mot de passe dans le code.**
5. Copier `.env.example` vers `.env.local` et renseigner :

```dotenv
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLIQUE
```

6. Redémarrer `npm run dev`. Le mode démo disparaît et une vraie page de connexion privée s'affiche.
7. Essayer la connexion, la validation d'une mission passée ou du jour, le journal et la synchronisation entre deux navigateurs connectés au même compte.

**Important :** le compte réel applique la date du fuseau `Europe/Paris`. Avant le 1er novembre, toutes les missions sont verrouillées, ce qui est voulu. Le SQL empêche également une validation anticipée si l'horloge du téléphone change.

## 3. Préparer les notifications Web Push

1. Générer des clés VAPID : `npx web-push generate-vapid-keys`.
2. Ajouter la clé **publique** dans `VITE_VAPID_PUBLIC_KEY` et `VAPID_PUBLIC_KEY`.
3. Sur Vercel uniquement, ajouter `VAPID_PRIVATE_KEY`, `VAPID_CONTACT` (ex. `mailto:contact@votredomaine.fr`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `CRON_SECRET` (valeur aléatoire longue).
4. Déployer le projet sur Vercel avec HTTPS. Configurer également les trois variables publiques `VITE_...` dans Vercel.
5. Tester `POST https://votre-domaine/api/send-reminders` avec l'en-tête `Authorization: Bearer ...`. Une exécution hors créneau retournera `processed:0`, c'est normal.
6. Adapter les deux valeurs dans `supabase/cron.sql` puis exécuter ce SQL pour lancer l'appel serveur **chaque minute**. Les notifications utilisent `Europe/Paris`, y compris le passage à l'heure d'hiver.
7. Sur le téléphone d'Elodie, installer la PWA puis utiliser **Space → Activer sur cet appareil**. Accorder la permission lorsque le navigateur la demande.

**Sur iPhone/iPad**, la web app doit être ajoutée à l'écran d'accueil et l'appareil doit disposer d'une version iOS/iPadOS compatible. Les notifications restent dépendantes des permissions et de l'accès réseau ; l'heure exacte n'est pas garantie. Le bouton « I need a little love » fonctionne sans réseau car la bibliothèque est embarquée dans la PWA.

**Une précision importante sur les appareils :** les souscriptions marquées `is_primary=true` sont destinataires du push. L'activation sur un second appareil ne désactive pas automatiquement le premier dans cette version : dans Supabase, désactiver la ligne précédente ou utiliser le bouton de désactivation sur l'ancien appareil pour éviter les doublons. La limite de quatre rappels s'applique par créneau programmé, et non à toutes les notifications système de l'appareil.

## 4. Héberger sur Vercel

- Importer le dossier dans GitHub puis créer un projet Vercel sur le dépôt.
- Framework preset : **Vite**, commande de build : `npm run build`, dossier de sortie : `dist`.
- Ajouter les variables d'environnement (section ci-dessus).
- Déployer. La configuration `vercel.json` maintient les routes de l'app et laisse `/api/` disponible pour les fonctions serveur.
- À chaque mise à jour, redéployer et vérifier une installation PWA existante.

## 5. Structure principale

```text
src/App.tsx                 5 pages, fiches mission, journal, badges, paramètres
src/styles.css              Identité cozy, téléphone et tablette
src/lib/model.ts            Types, dates, missions, paliers
src/lib/store.tsx           Auth + Supabase + démo + CRUD + Web Push
src/lib/supabase.ts         Client Supabase public
src/data/missions.json      Les 92 missions validées
src/sw.ts                   Service worker, cache et notifications
shared/messages.json        120 Little Reminders
supabase/schema.sql         Tables, triggers, RLS et Storage privé
supabase/cron.sql           Exécution planifiée serveur
api/send-reminders.ts       Envoi VAPID depuis Vercel
```

## Confidentialité et limites

- Le journal et les photos sont privés par RLS/Storage. Leur accès n'est **pas** chiffré de bout en bout. Les administrateurs de l'infrastructure disposant de privilèges élevés peuvent potentiellement y accéder.
- Les entrées sont enregistrées dans Supabase avec HTTPS, mais le journal lui-même n'est pas disponible en écriture hors connexion. Ne pas compter sur un mode hors ligne privé non implémenté.
- Une photo uploadée puis retirée avant la sauvegarde peut rester orpheline dans Storage ; une routine de nettoyage peut être ajoutée.
- Le compte ne se crée pas en libre-service. L'export intégral et la suppression du compte depuis l'interface ne sont pas encore implémentés ; la gestion se fait via Supabase. Ajouter ces options avant toute ouverture publique.
- Le module de notifications doit être testé sur **les appareils réels**. Dans cette version les modifications des préférences se sauvegardent à chaque changement et l'interface montre les erreurs de sauvegarde, mais il n'y a pas de mode hors ligne pour modifier ces préférences.
- Les 92 fiches sont embarquées dans le bundle : elles sont consultables hors ligne après la première visite/caching, mais la validation synchronisée avec Supabase demande le réseau. Une validation faite hors ligne en mode connecté ne doit pas être considérée comme sauvegardée ; une file de synchronisation pourra être ajoutée ensuite.

## Vérification fonctionnelle recommandée

- Tester sur un vrai Android et une tablette (portrait et paysage).
- Tester un compte Supabase vierge, une mission terminée puis annulée, une mission passée, une mission future verrouillée.
- Tester journal : 2 entrées le même jour, édition, suppression, photo et changement d'appareil.
- Tester bibliothèque : catégorie masquée, phrase personnalisée, masquage puis réactivation.
- Tester Cron : autorisation invalide => 401, même créneau rejoué => pas de doublon, notifications désactivées => aucun envoi.
- Tester que les données d'un autre utilisateur ne sont pas lisibles (RLS).

**Une petite note sur le nom :** le prénom affiché est toujours **Elodie**, sans accent.
#   A r c Y a o u m i  
 