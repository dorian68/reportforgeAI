# Cahier des charges - Canvas Studio V2

## 1. Objet

Ce document définit la cible produit du `Canvas Studio` pour combler l'écart entre :

- l'état actuel du studio : éditeur libre utile, piloté par IA, réutilisé par plusieurs renderers ;
- la cible attendue : un `éditeur de reporting haut de gamme`, proche d'un `Figma / Canva for reporting`, mais orienté usages institutionnels `finance`, `banque`, `assurance`, `direction`, `pilotage`, `client reporting`.

Le but n'est plus seulement de `générer un canvas`, mais de fournir :

- un vrai `studio de composition visuelle`,
- un vrai `moteur de design IA`,
- un vrai `système de templates réutilisables`,
- un vrai `pont entre intention utilisateur, orchestration IA et artefacts finaux`.

## 2. Vision produit

Le Canvas Studio doit devenir :

- un `atelier de design reporting` intégré à l'addin ;
- un `éditeur visuel de précision` pour structurer un report ;
- un `co-pilote IA` capable de décider à la fois du fond et de la forme ;
- une `source unique de vérité` entre :
  - canvas,
  - HTML report,
  - PDF,
  - PowerPoint,
  - email HTML,
  - Apps Script / web app interactive.

Principe fondamental :

`Le user décrit ce qu'il veut voir, positionne ce qu'il veut contrôler, et l'agent IA remplit, compose, améliore et rend les sorties cohérentes sur tous les formats.`

## 3. État actuel

Le studio couvre déjà une partie importante du besoin :

- génération de `designSpec` et `canvasDocument` par l'agent IA ;
- `layout libre` avec positionnement absolu ;
- `drag-and-drop` et `resize` de blocs ;
- persistance de templates/canvas ;
- génération multi-format cohérente sur :
  - HTML report,
  - PPTX,
  - PDF,
  - email HTML,
  - Apps Script scaffold.

Mais il manque encore les briques qui feraient passer le studio au niveau `éditeur premium production-ready`.

## 4. Fossé à combler

### 4.1 Limites UX actuelles

- Pas de `multi-select`.
- Pas de `lasso select`.
- Pas de `snapping avancé`.
- Pas de `guides intelligents`.
- Pas de `règles / rulers`.
- Pas de `zoom / pan` avancé.
- Pas de `mini-map`.
- Pas de `layers panel`.
- Pas de `lock / hide`.
- Pas de `group / ungroup`.
- Pas de `align / distribute`.
- Pas de `duplicate with offset`.
- Pas de `undo / redo` robuste.
- Pas de `keyboard shortcuts` riches.
- Pas de `component library` avancée.
- Pas de `styles partagés` au niveau document.

### 4.2 Limites produit actuelles

- Le studio reste encore `bloc-centric`, pas encore `document-centric`.
- Le user compose des blocs, mais ne manipule pas encore un vrai `document de design`.
- Les templates sont déjà intelligents, mais pas encore assez riches pour être des `systèmes de design reporting` complets.
- Les variations IA existent, mais la logique d'exploration peut aller beaucoup plus loin.
- Le studio reste encore trop pensé comme un `éditeur dans un taskpane`, pas encore comme un `environnement de travail premium`.

### 4.3 Limites IA actuelles

Le LLM influence déjà :

- le fond,
- la narration,
- une partie de la composition,
- les pages par format,
- la hiérarchie des blocs.

Mais il doit encore mieux piloter :

- la `direction artistique`,
- la `densité visuelle`,
- la `grammaire de composants`,
- la `rythmique des pages`,
- les `règles de placement`,
- les `familles visuelles`,
- la `logique de gabarit réutilisable`,
- les `variations contrôlées`.

## 5. Objectif V2

Construire un `Canvas Studio V2` qui soit :

- `pixel-perfect`,
- `production-ready`,
- `AI-first`,
- `template-driven`,
- `format-aware`,
- `enterprise-grade`.

Le produit doit permettre à un user de dire :

- `ici je veux un graphique`,
- `ici un tableau`,
- `ici un narratif exécutif`,
- `ici un callout`,
- `ici un bloc de recommandations`,
- `ici un résumé email`,
- `ici une zone d'exploration interactive`,

et ensuite laisser l'agent :

- comprendre les données,
- comprendre l'audience,
- comprendre le format,
- remplir chaque zone intelligemment,
- ajuster la composition,
- harmoniser le rendu final.

## 6. Exigences produit prioritaires

### 6.1 Éditeur libre de niveau Figma/Canva

Le studio doit supporter :

- `drag-and-drop` pixel perfect ;
- `resize` sur poignées multiples ;
- `rotation` si utile pour certains éléments décoratifs ou séparateurs ;
- `snap-to-grid` configurable ;
- `snap-to-blocks` ;
- `snap-to-guides` ;
- `smart guides` dynamiques ;
- `rulers` horizontales et verticales ;
- `safe margins` ;
- `bleed / printable zones` pour PDF/PPT ;
- `alignment tools` :
  - align left/right/top/bottom/center,
  - distribute horizontally/vertically,
  - equalize widths/heights ;
- `multi-select`;
- `marquee / lasso selection`;
- `group / ungroup`;
- `lock / unlock`;
- `show / hide`;
- `duplicate`;
- `bring forward / send backward`;
- `layer order`;
- `copy / paste block`;
- `clone page`;
- `delete page`.

### 6.2 Navigation et confort d'édition

Le studio doit intégrer :

- `zoom in / zoom out / fit to page / fit width`;
- `pan` fluide ;
- `mini-map` ;
- `page navigator` ;
- `layers panel` ;
- `properties panel` riche ;
- `template panel` ;
- `component library panel` ;
- `AI actions panel`.

### 6.3 Historique et sécurité d'édition

Le studio doit fournir :

- `undo / redo` multi-étapes ;
- `autosave`;
- `draft recovery`;
- `version snapshots`;
- `compare current vs saved`;
- `restore previous version`;
- `template versioning`.

## 7. Exigences IA

### 7.1 Le LLM est le design brain

Le LLM doit rester explicitement responsable de :

- l'ordre des blocs,
- la priorité visuelle,
- le choix des composants,
- la densité narrative,
- la balance texte / KPI / chart / tableau,
- le rythme de lecture,
- la cohérence esthétique,
- l'adaptation au média,
- l'adaptation à l'audience,
- les variations intelligentes.

### 7.2 Le studio ne doit jamais devenir un simple éditeur manuel

Le studio doit fonctionner en double mode :

- `manual override` : le user contrôle les placements ;
- `AI co-design` : l'IA propose, remplit, réorganise et optimise.

Le user doit pouvoir :

- demander `Regenerate this block`,
- demander `Propose 3 layouts`,
- demander `Make this page more executive`,
- demander `Reduce visual density`,
- demander `Use more tables, fewer charts`,
- demander `Make the email shorter and more direct`,
- demander `Turn this dashboard into a client-facing review`.

### 7.3 Variations contrôlées

Les actions de variation doivent être réellement LLM-driven :

- `Generate AI Variation`
- `Explore alternatives`
- `Try denser version`
- `Try board version`
- `Try analyst version`
- `Try more visual version`
- `Try more narrative version`

Ces variations doivent :

- garder le contexte métier,
- garder la cohérence des données,
- respecter la cible audience,
- rester professionnelles,
- être reproductibles via `seed` si nécessaire.

## 8. Modèle de données cible

Le studio doit évoluer vers un vrai modèle `document`.

### 8.1 Objets principaux

- `CanvasDocument`
- `CanvasPage`
- `CanvasBlock`
- `CanvasGroup`
- `CanvasLayer`
- `CanvasGuide`
- `CanvasSnapRule`
- `CanvasStyleToken`
- `CanvasTheme`
- `CanvasComponentPreset`
- `CanvasTemplate`
- `ReportDesignSpec`
- `LayoutPlan`
- `ComponentTree`
- `VisualHierarchy`

### 8.2 Structure attendue d'un template

Un template sauvegardé doit stocker :

- identité du template,
- audience cible,
- format(s) cible(s),
- règles de layout,
- grammaire de composants,
- préférences chart,
- densité narrative,
- title style,
- annotation style,
- page rhythm,
- summary placement,
- CTA rules,
- visual emphasis rules,
- spacing rules,
- branding tokens,
- renderer hints,
- exemples de prompts recommandés,
- contraintes de qualité.

Le template ne doit pas être seulement une apparence.  
Il doit être un `asset d'intelligence de design réutilisable`.

## 9. Architecture produit attendue

### 9.1 Séparation stricte

Le système doit séparer :

- `AI content reasoning`
- `AI design reasoning`
- `layout editing`
- `template persistence`
- `renderer mapping`
- `artifact export`
- `quality validation`

### 9.2 Flow cible

1. sélection / ingestion des données
2. profilage dataset
3. inférence sémantique
4. extraction de findings
5. storytelling
6. design planning par IA
7. génération de `ReportDesignSpec`
8. génération ou chargement d'un `CanvasDocument`
9. édition utilisateur éventuelle
10. quality gate
11. rendu par format
12. export / preview / sauvegarde

### 9.3 Règle forte

Le renderer ne doit jamais `inventer` seul la structure.  
Le renderer doit `consommer` une composition déjà pensée upstream.

## 10. UX cible dans l'addin

### 10.1 Contraintes Office

Le taskpane seul est trop étroit pour un vrai studio haut de gamme.

Donc le produit doit prévoir :

- un `mode compact` dans le taskpane ;
- un `mode Studio étendu` dans une surface plus confortable :
  - Office dialog,
  - fenêtre popout,
  - panneau élargi,
  - ou surface dédiée dans l'addin si possible.

### 10.2 Répartition UX recommandée

#### Taskpane

- génération rapide,
- presets,
- brief,
- previews rapides,
- accès à la bibliothèque,
- accès au Studio.

#### Studio étendu

- édition libre avancée,
- multi-page,
- layers,
- guides,
- snapping,
- variations IA,
- comparaison de versions,
- propriétés détaillées,
- export par format.

## 11. Bibliothèque de composants

Le studio doit offrir une `component library` métier.

### 11.1 Composants minimum

- hero
- subtitle band
- executive summary
- KPI strip
- KPI card
- chart panel
- ranked comparison
- trend block
- concentration block
- anomaly block
- table
- recommendation block
- decision block
- risk warning
- callout
- appendix / backup evidence
- email summary block
- filter panel
- interactive drilldown zone

### 11.2 Composants avancés

- waterfall / bridge
- variance bridge
- segment matrix
- heatmap
- driver tree
- action matrix
- commentary strip
- notes / caveats block
- methodology block

## 12. Moteur de règles d'édition

Le studio doit disposer de règles intelligentes :

- éviter les recouvrements accidentels ;
- signaler les collisions ;
- proposer `snap suggestions` ;
- proposer `auto tidy layout` ;
- détecter les blocs hors page ;
- détecter les zones surchargées ;
- détecter les pages déséquilibrées ;
- détecter les blocs trop petits pour leur contenu ;
- proposer `compress / rebalance / paginate`.

## 13. IA bloc par bloc

Chaque bloc doit pouvoir être piloté séparément.

Actions attendues :

- `Regenerate content`
- `Regenerate design`
- `Change component type`
- `Expand / compress`
- `Make more executive`
- `Make more analytical`
- `Use stronger numbers`
- `Reduce jargon`
- `Add implication`
- `Turn into client-facing language`

## 14. Alignement multi-format

Le studio doit être la source de vérité des sorties.

### 14.1 Exigence

Un même document doit pouvoir produire :

- HTML report
- PowerPoint
- PDF
- email HTML
- Apps Script web app
- Canvas preview

avec adaptation par format, mais sans perte de cohérence structurelle.

### 14.2 Principe

Le système doit permettre :

- certains blocs visibles sur tous les formats ;
- certains blocs visibles seulement sur certains formats ;
- certains blocs réinterprétés selon le média ;
- certains formats avec regroupement automatique de blocs ;
- certains formats avec pagination / slide split.

## 15. QA et quality gate

Avant rendu final, le studio doit valider :

- cohérence du layout ;
- absence de collision ;
- présence d'une hiérarchie claire ;
- message-led titles ;
- absence de placeholders ;
- absence de langage d'instruction ;
- cohérence audience / format ;
- cohérence visual / narrative ;
- lisibilité minimale ;
- densité acceptable ;
- cohérence des marges et espacements.

Si la qualité est insuffisante :

- proposer correction auto,
- ou bloquer avec message exploitable,
- ou régénérer certains blocs/pages.

## 16. Performance

Le studio doit rester fluide malgré l'addin.

### 16.1 Exigences

- drag fluide sur hardware moyen ;
- previews non bloquantes ;
- calculs de snapping optimisés ;
- rendu virtualisé si beaucoup de blocs ;
- autosave non intrusif ;
- recalculs localisés ;
- pas de re-render global à chaque micro-move.

### 16.2 Garde-fous

- throttling des updates lourdes ;
- transactions de document ;
- workers si nécessaire pour certaines analyses ;
- rendu différé des previews non actives.

## 17. Tests attendus

### 17.1 Unit tests

- conversion grid/frame ;
- snapping ;
- align/distribute ;
- multi-select ;
- collision detection ;
- autosave state ;
- template persistence ;
- layout normalization ;
- renderer mapping ;
- design agent output sanitation.

### 17.2 Integration tests

- create canvas from prompt ;
- save template ;
- reload template ;
- edit block ;
- generate variation ;
- export HTML/PDF/PPT/email/gas depuis le même document ;
- restore draft after reload ;
- fallback si LLM timeout ;
- no silent regression to rigid renderer.

### 17.3 Regression tests

- no overlap corruption ;
- no lost block after save/load ;
- no renderer drift between canvas and artifacts ;
- no user-facing instruction leakage ;
- no non-LLM fake variation behind random actions.

## 18. Phasage recommandé

### Phase 1 - Fondations Studio Pro

- vrai `CanvasDocument` enrichi,
- multi-select,
- snapping,
- guides,
- undo/redo,
- layers,
- lock/hide,
- align/distribute,
- zoom/pan.

### Phase 2 - IA Design Avancée

- variation IA multi-options,
- regen bloc/page,
- design critique,
- style exploration,
- template suggestions,
- block-wise AI co-editing.

### Phase 3 - Surface Premium

- studio étendu / popout,
- mini-map,
- rulers,
- smart guides avancés,
- component library riche,
- version compare,
- template marketplace interne.

### Phase 4 - Maturité Entreprise

- branding packs,
- policy controls,
- template governance,
- audit logs,
- packaging / deployment presets,
- optional collaboration features.

## 19. Critères d'acceptation

Le Canvas Studio V2 sera considéré conforme si :

- le user peut réellement composer un report librement ;
- le layout est `pixel-perfect` ;
- l'édition est fluide ;
- le LLM pilote réellement le design, pas seulement le texte ;
- les templates sauvegardent une vraie intelligence de design ;
- les variations sont réellement pilotées par l'IA ;
- les sorties restent cohérentes entre tous les formats ;
- l'expérience paraît `premium`, `maîtrisée`, `production-ready`.

## 20. Décision produit

Le Canvas Studio ne doit plus être considéré comme une simple sous-fonction.  
Il doit devenir un `pilier produit`.

La cible n'est pas :

- un add-in qui génère des slides,
- un add-in qui remplit des templates,
- un add-in qui dessine un HTML fixe.

La cible est :

- un `AI reporting studio`,
- un `AI report designer`,
- un `moteur de composition et de rendu`,
- un système de `templates intelligents`,
- un produit crédible pour des usages `direction`, `finance`, `banque`, `assurance`, `comex`, `client reporting`.
