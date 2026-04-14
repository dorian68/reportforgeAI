# Cahier Des Charges
# Excel Operating System

## 1. Objet Du Document

Ce document définit le cahier des charges d’un produit autonome, distinct de ReportForge AI, conçu comme un `Excel Operating System` :

- un agent généraliste de raisonnement sur les workbooks Excel
- capable de comprendre un classeur, planifier des opérations, demander validation, puis exécuter des actions dans Excel
- avec un niveau de contrôle et de fiabilité compatible avec un produit professionnel et institutionnel

Ce produit n’est pas un simple générateur de rapports. C’est un `système opérant` pour Excel, centré sur :

- compréhension structurelle du classeur
- exécution d’actions pilotées par langage naturel
- sécurité, auditabilité et gouvernance
- contrôle explicite de l’automatisation

## 2. Vision Produit

Construire un `agent Excel natif` qui permet à un utilisateur métier ou power user de dire :

- "nettoie cette feuille et structure les données"
- "crée un tableau croisé dynamique par région"
- "prépare un onglet synthèse direction"
- "mets à jour les formules de marge sur toutes les lignes"
- "explique-moi pourquoi ce workbook est fragile"
- "prépare ce fichier pour un reporting mensuel"

Puis d’obtenir :

1. une compréhension claire de ce que l’agent a compris
2. un plan d’action lisible
3. une exécution fiable, traçable, réversible autant que possible

Le produit doit être perçu non comme un gadget IA, mais comme un `copilote opératoire Excel`.

## 3. Problème À Résoudre

Les utilisateurs Excel avancés perdent du temps sur :

- nettoyage de données
- structuration de feuilles
- normalisation de formats
- création de tableaux, graphiques, TCD et synthèses
- maintenance de workbooks complexes
- compréhension de workbooks hérités
- prévention d’erreurs de structure
- répétition d’opérations manuelles à faible valeur

Les solutions existantes sont souvent :

- trop manuelles
- trop techniques
- trop peu auditables
- trop peu fiables pour des actions sensibles
- trop centrées sur la génération de texte plutôt que sur l’action dans Excel

## 4. Positionnement

Le produit est :

- un add-in Excel / Office Add-in
- une interface de commande et d’orchestration pour Excel
- un moteur de raisonnement + exécution sur le workbook

Le produit n’est pas :

- un agent desktop généraliste
- un robot RPA full-OS
- un outil de BI
- un simple chatbot
- un générateur de rapport spécialisé

## 5. Cibles Utilisateurs

### 5.1 Cibles Prioritaires

- analystes FP&A
- contrôleurs de gestion
- finance managers
- RevOps / Business Ops
- consultants et cabinets produisant des livrables Excel
- équipes opérationnelles travaillant sur des fichiers Excel complexes

### 5.2 Cibles Secondaires

- directions métiers
- PMO
- équipes data non techniques
- cabinets d’audit, TS, due diligence

### 5.3 Cibles À Éviter En Premier

- grand public
- data scientists avancés
- très grands groupes régulés en tant que premiers clients

## 6. Proposition De Valeur

### 6.1 Valeur Principale

Permettre à un utilisateur de `décrire une intention` au lieu de devoir `exécuter manuellement une suite d’opérations Excel`.

### 6.2 Valeurs Concrètes

- gain de temps
- réduction des erreurs
- meilleure lisibilité des workbooks
- meilleure maintenance des fichiers
- standardisation des opérations Excel
- audit des actions effectuées
- adoption plus simple que VBA, Office Scripts ou Power Query pour certains usages

## 7. Principes Produit Non Négociables

### 7.1 Preview Avant Action

L’agent ne doit jamais exécuter des actions significatives sans afficher un plan clair.

### 7.2 Actions Bornées

Les actions doivent être limitées par périmètre :

- sélection active
- feuille active
- workbook entier
- objets explicitement ciblés

### 7.3 Sécurité Par Défaut

Le produit doit refuser ou exiger confirmation pour toute action destructive.

### 7.4 Explicabilité

L’agent doit expliquer :

- ce qu’il a compris
- pourquoi il propose telle action
- ce qu’il va modifier
- ce qu’il a réellement modifié

### 7.5 Auditabilité

Chaque exécution doit produire un journal exploitable.

### 7.6 Dégradation Gracieuse

Si le LLM ou un outil n’est pas disponible, le produit doit rester utilisable autant que possible.

## 8. Promesse Produit

`Décrivez ce que vous voulez faire dans Excel. Le système comprend le workbook, prépare un plan sûr, exécute les étapes approuvées, puis vous montre précisément le résultat.`

## 9. Cas D’Usage Coeur

### 9.1 Compréhension

- analyser un workbook existant
- cartographier les feuilles, tables, plages nommées, formules, graphiques, TCD
- détecter les fragilités
- répondre à des questions sur le workbook

Exemples :

- "quelles sont les feuilles importantes de ce classeur ?"
- "où sont les formules à risque ?"
- "cette feuille dépend de quelles données ?"

### 9.2 Structuration

- convertir une plage en table
- normaliser les en-têtes
- appliquer un schéma de formatage
- geler les volets
- nettoyer les lignes/colonnes vides

### 9.3 Automatisation De Construction

- créer une feuille synthèse
- créer un TCD
- créer un graphique
- créer un tableau de KPI
- écrire des formules sur une plage
- ajouter une validation de données

### 9.4 Maintenance Et Refactor Excel

- détecter les incohérences de formule
- uniformiser des colonnes calculées
- réparer des formats incohérents
- dupliquer proprement une feuille modèle
- préparer un workbook pour revue ou diffusion

### 9.5 Opérations Pilotées Par Intent

Exemples :

- "prépare ce workbook pour une revue mensuelle"
- "nettoie cette feuille et rends-la exploitable"
- "construis un tableau croisé et un graphique par région"
- "applique les bonnes formules de marge sur toute la table"

## 10. Hors Périmètre Initial

Le produit ne doit pas viser au départ :

- le contrôle complet de l’interface système
- l’exécution arbitraire de macros VBA fournies par l’utilisateur
- la modification silencieuse de l’ensemble du workbook sans review
- l’automatisation sans bornes sur des fichiers inconnus
- la promesse marketing d’un agent omnipotent

## 11. Scope Fonctionnel

## 11.1 Module De Compréhension Du Workbook

Le produit doit construire un modèle sémantique du workbook :

- feuilles
- plage active
- tables
- plages nommées
- colonnes et types
- formules
- graphiques
- TCD
- validations
- protections
- dépendances simples quand possible

Sorties attendues :

- carte du workbook
- objets détectés
- indicateurs de qualité / risque
- résumé contextuel exploitable par le planner

## 11.2 Module D’Interprétation Des Intentions

Le produit doit convertir un prompt en :

- objectif utilisateur
- périmètre d’action
- niveau de risque
- liste d’actions proposées
- besoins de validation

Le module doit distinguer :

- demande de lecture
- demande d’analyse
- demande de modification
- demande de construction
- demande destructive

## 11.3 Planner

Le planner doit produire un plan de type :

1. comprendre le contexte
2. préparer les préconditions
3. exécuter les actions
4. vérifier le résultat
5. résumer ce qui a été fait

Chaque étape doit contenir :

- un identifiant
- un titre
- une description
- le périmètre d’impact
- le niveau de risque
- les dépendances
- l’outil Excel à appeler
- les paramètres prévus

## 11.4 Catalogue D’Outils Excel

Le moteur doit exposer un catalogue d’outils typés et bornés.

### Lecture

- lire la sélection
- lire une feuille
- lire une table
- lister les objets du workbook
- inspecter formules / formats / validations

### Écriture Sûre

- écrire dans une plage ciblée
- créer une feuille
- créer une table
- créer un graphique
- créer un TCD
- appliquer des formats
- appliquer un filtre
- trier une table
- figer des volets
- créer une plage nommée

### Maintenance

- standardiser des formules
- recopier des formules
- uniformiser les formats
- nettoyer colonnes/lignes vides
- renommer objets

### Actions Sensibles

- supprimer une feuille
- supprimer une table
- écraser une plage existante
- remplacer des formules

Ces actions sensibles doivent être bloquées par défaut ou soumises à confirmation explicite.

## 11.5 Moteur D’Exécution

Le moteur doit :

- exécuter étape par étape
- journaliser chaque étape
- remonter les erreurs clairement
- continuer partiellement si pertinent
- s’arrêter si le risque devient incohérent

Le moteur doit produire :

- statut global
- statut par étape
- objets créés / modifiés
- messages de succès / échec

## 11.6 Vérification Post-Action

Après exécution, le produit doit vérifier autant que possible :

- que les objets existent
- que les plages ciblées ont bien été modifiées
- que les tableaux / graphiques / TCD ont été créés
- que l’action réalisée correspond au plan

## 11.7 Journal Et Audit

Chaque exécution doit être historisée avec :

- timestamp
- prompt utilisateur
- plan retenu
- étapes exécutées
- résultats
- erreurs
- approbations utilisateur

Le journal doit être exportable.

## 11.8 Undo / Revert

Le produit doit prévoir un mécanisme de retour arrière partiel quand c’est faisable.

Exigence minimale MVP :

- journal détaillé des créations
- possibilité de supprimer les objets créés par la dernière exécution
- indication claire quand une action n’est pas réversible automatiquement

## 11.9 Mémoire Et Contexte

Le produit doit mémoriser au minimum :

- le workbook courant
- la session courante
- les derniers prompts
- les derniers plans
- les exécutions récentes

Plus tard :

- préférences utilisateur
- playbooks enregistrés
- templates d’automatisation
- mémoire par workbook / projet

## 12. UX Produit

## 12.1 Shell Principal

Le task pane doit contenir :

1. contexte workbook
2. champ de prompt
3. résumé de compréhension
4. plan d’action
5. bouton d’approbation / exécution
6. journal d’exécution
7. historique

## 12.2 Flux Standard

1. l’utilisateur ouvre l’add-in
2. l’add-in lit le contexte workbook
3. l’utilisateur saisit un prompt
4. le système affiche ce qu’il a compris
5. le système affiche le plan
6. l’utilisateur valide
7. le système exécute
8. le système résume le résultat

## 12.3 Modes D’Interaction

### Ask Mode

Lecture seule.

Exemples :

- "que contient ce workbook ?"
- "pourquoi ce TCD ne se met pas à jour ?"

### Plan Mode

Prévisualisation sans exécution.

Exemples :

- "comment préparer cette feuille pour une réunion mensuelle ?"

### Execute Mode

Exécution approuvée.

### Step Mode

Exécution étape par étape pour les opérations plus risquées.

## 12.4 Règles UX

- jamais d’action cachée
- jamais de jargon technique inutile
- toujours afficher le périmètre d’impact
- toujours afficher le niveau de risque
- toujours afficher les objets créés / modifiés

## 13. Classification Des Risques

### Niveau 0 - Lecture

- aucune modification

### Niveau 1 - Sûr

- formatage local
- création de feuille
- création de table
- gel de volets

### Niveau 2 - Modifiant

- écriture de formules
- tri / filtre
- création de TCD
- remplacement ciblé de contenu

### Niveau 3 - Sensible

- suppression
- écrasement de plage
- remplacement large de formules
- opérations multi-feuilles à fort impact

Le produit doit imposer des règles de validation différentes selon le niveau.

## 14. Exigences Techniques

## 14.1 Stack Cible

- Office.js
- TypeScript
- React
- shared runtime si nécessaire
- backend léger en Node/TypeScript pour le control plane institutionnel

## 14.2 Architecture Cible

### Frontend Add-in

- task pane
- rendu du plan
- affichage de contexte workbook
- exécution Office.js

### Agent Core

- parser d’intention
- planner
- policy engine
- orchestrateur d’outils
- synthèse / narration

### Workbook Semantic Layer

- modèle du workbook
- index des objets
- mapping dépendances
- métadonnées de structure

### Tool Layer

- outils Office.js typés
- garde-fous
- validation des paramètres

### Control Plane Backend

Nécessaire pour un produit institutionnel :

- gestion des tenants
- authentification
- licensing
- telemetry
- audit centralisé
- gestion des providers LLM
- feature flags
- politiques de sécurité

## 14.3 Modèle LLM

Le produit doit supporter :

- provider géré par l’éditeur
- BYO provider / BYO API key
- gateway OpenAI-compatible

Le LLM ne doit pas écrire directement dans Excel.
Il doit produire :

- compréhension
- plan
- justification
- paramètres candidats

Puis le `policy engine` et le `tool layer` valident.

## 15. Exigences Sécurité

### 15.1 Principes

- moindre privilège
- secrets non persistés inutilement côté client
- journaux auditables
- validation stricte des actions
- séparation raisonnement / exécution

### 15.2 Exigences

- authentification tenant
- SSO Microsoft en cible
- tokens sécurisés
- contrôle par politique
- désactivation des actions à risque par tenant
- allowlist de providers LLM
- logs d’audit centralisés

### 15.3 Exigences Institutionnelles

- privacy policy
- terms
- DPA
- security documentation
- incident response
- Publisher Attestation
- trajectoire Microsoft 365 Certification

## 16. Exigences Non Fonctionnelles

### 16.1 Fiabilité

- le produit ne doit pas exécuter une action ambiguë
- les erreurs doivent être récupérables
- les logs doivent permettre de reconstituer une exécution

### 16.2 Performance

- réponse rapide sur classeurs moyens
- limites explicites sur gros workbooks
- exécution par lots raisonnés

### 16.3 Compatibilité

- Excel Desktop Windows
- Excel Web
- Excel Mac en cible

### 16.4 Maintenabilité

- outils fortement typés
- séparation claire des modules
- tests unitaires et E2E

## 17. MVP Recommandé

Le MVP doit rester borné.

### Capabilités MVP

- compréhension de la sélection active et de la feuille active
- lecture de tables et structures principales
- prompt -> plan -> validation -> exécution
- opérations sûres :
  - créer une table
  - créer une feuille
  - formater une plage
  - figer la ligne d’en-tête
  - écrire une colonne de formule
  - créer un graphique
  - créer un TCD simple
  - créer une feuille synthèse
- journal d’exécution
- historique local

### Non Inclus En MVP

- refactor workbook complet sans garde-fous
- suppression large multi-feuilles
- édition autonome sans preview
- support complet de tous les objets Excel
- exécution multi-agent

## 18. Roadmap Produit

### Phase 0 - Fondations

- modèle sémantique workbook
- policy engine
- catalogue d’outils sûrs
- journal d’exécution

### Phase 1 - MVP Agent

- prompt
- preview
- exécution bornée
- actions principales
- UX stable

### Phase 2 - Agent Avancé

- meilleures opérations sur formules
- TCD et charts plus avancés
- mémoire de session
- playbooks enregistrables

### Phase 3 - Produit Team

- comptes
- partage de playbooks
- policies d’équipe
- audit centralisé
- billing

### Phase 4 - Produit Institutionnel

- SSO
- admin console
- gouvernance par tenant
- observabilité complète
- certifications et conformité

## 19. Critères D’Acceptation MVP

Le MVP est considéré comme atteint si :

1. l’utilisateur peut formuler une demande naturelle
2. le produit affiche ce qu’il a compris
3. le produit affiche un plan clair
4. l’utilisateur peut approuver ou refuser
5. le produit exécute des actions sûres dans Excel
6. le produit journalise chaque exécution
7. le produit n’effectue pas d’action destructive silencieuse
8. les erreurs sont explicites et actionnables

## 20. KPI Produit

### KPI Activation

- temps jusqu’à première action réussie
- taux d’exécution après preview

### KPI Valeur

- temps économisé par workflow
- fréquence d’usage hebdomadaire
- nombre d’actions exécutées par session

### KPI Qualité

- taux d’échec par type d’outil
- taux de rollback
- taux d’annulation après preview

### KPI Business

- conversion trial -> paid
- rétention mensuelle
- expansion Pro -> Team / Business

## 21. Risques Majeurs

- promesse trop large par rapport aux capacités réelles d’Office.js
- exécutions ambiguës sur workbooks complexes
- dette produit si l’on ouvre trop tôt les actions destructrices
- perte de confiance si l’agent agit sans explicabilité suffisante
- sous-estimation du besoin backend pour un vrai produit institutionnel

## 22. Recommandation Finale

Le produit doit être conçu comme :

- un `agent Excel généraliste`
- mais `borné par politiques et garde-fous`
- centré sur la compréhension, la planification et l’exécution sûre

La bonne promesse n’est pas :

`je contrôle Excel comme un humain`

La bonne promesse est :

`je comprends votre workbook, je prépare un plan fiable, puis j’exécute les opérations Excel que vous approuvez`

Ce positionnement est plus crédible, plus vendable, et plus compatible avec un produit institutionnel durable.
