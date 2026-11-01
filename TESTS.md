# Contrôles réalisés dans l'environnement de génération

- ✅ JSON des 92 missions chargé et validé.
- ✅ Dates uniques, ordonnées sans interruption du 01/11/2026 au 31/01/2027.
- ✅ Chaque mission contient objectif, titre, étapes, version douce, phrase encourageante et question de réflexion.
- ✅ 120 Little Reminders uniques avec catégorie et texte.
- ✅ Tous les fichiers JSON sont syntaxiquement valides.
- ✅ Les fichiers TypeScript et TSX ont été vérifiés syntaxiquement avec TypeScript `transpileModule`.
- ✅ Aucun emploi du prénom « Élodie » dans les sources (orthographe retenue : Elodie).
- ⚠️ `npm install` / `npm run build` et tests React dans un navigateur n'ont pas pu être effectués ici : l'environnement n'accède pas au registre npm (`EAI_AGAIN`). **La compilation et les interactions restent à valider sur ta machine.**
- ⚠️ Les notifications réelles, l'auth Supabase et le stockage privé demandent une configuration des comptes et des clés ; ils n'ont pas été testés contre un service actif.

## Priorités des tests locaux

1. `npm install && npm run build` et corriger tout message de compilation éventuel.
2. `npm run dev` ; explorer les cinq onglets, valider et annuler une mission, simuler les 92 dates.
3. Essayer deux entrées de journal datées du même jour, puis modification et suppression.
4. Simuler plusieurs missions pour débloquer fleurs et badges.
5. Configurer Supabase et répéter les tests sur téléphone et tablette.
6. Tester HTTPS, installation PWA, puis Web Push sur les appareils réels.
