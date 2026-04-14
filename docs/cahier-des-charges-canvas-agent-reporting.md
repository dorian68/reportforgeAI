# Cahier des charges - Moteur Canvas / Agents de Reporting

## 1. Contexte

Le produit actuel sait :
- analyser une selection Excel ;
- produire un plan de report ;
- generer un report Excel ;
- generer des sorties Email / Slides / Apps Script ;
- enrichir une partie du contenu avec un provider LLM.

Mais il ne se comporte pas encore comme un SaaS premium de reporting assiste par IA. Les limites actuelles les plus visibles sont :
- la generation de template Slides reste trop opaque ;
- l'utilisateur ne percoit pas assez clairement si une action travaille vraiment ou non ;
- les sorties Slides et Email ressemblent encore a des artefacts derives, pas a un vrai moteur de composition ;
- l'outil n'expose pas encore un "canvas" editable et pilotable par prompt ;
- la logique "agent IA" n'est pas assez explicite dans l'experience.

L'objectif de ce cahier des charges est de definir une cible produit claire : un moteur interne de generation de report, de slides et d'email, pilotable par prompts, par templates persistants, et par des agents specialises.

## 2. Vision produit

L'addin doit devenir un copilote de reporting haut de gamme capable de :
- transformer une selection Excel en livrables client de niveau cabinet de conseil ;
- donner a l'utilisateur une sensation de travail reel, visible, progressif et controlable ;
- permettre de generer, rejouer, ajuster, sauvegarder et reemployer des styles de rendu ;
- produire des artefacts utiles, partageables et exploitables dans l'environnement reel :
  - workbook Excel,
  - draft Gmail,
  - deck Slides / PowerPoint,
  - report interactif en ligne via Apps Script.

Le produit cible n'est pas seulement un generateur de texte. C'est un orchestrateur de livrables.

## 3. Probleme a resoudre

### 3.1 Probleme UX

Aujourd'hui, certaines actions donnent l'impression de ne rien faire parce que :
- l'utilisateur ne voit pas de progression de travail claire ;
- le changement provoque par `Generate Template` reste discret ou insuffisamment materialise ;
- l'etat avant / apres n'est pas assez visible ;
- les CTA n'expliquent pas toujours si l'action va produire un preview, un artefact telecharge, un objet Google, ou une feuille Excel.

### 3.2 Probleme fonctionnel

Les modules Slides et Email reposent encore majoritairement sur une production deterministe enrichie, alors que le besoin reel est un moteur de composition :
- structuration des blocs ;
- mise en scene narrative ;
- choix de layout ;
- choix de style selon la cible client ;
- iteration par prompt ;
- sauvegarde du template final.

### 3.3 Probleme de valeur percue

Le produit doit donner la sensation d'un agent IA qui :
- comprend les donnees ;
- comprend la cible client ;
- choisit une strategie de restitution ;
- construit un rendu coherent ;
- explique ce qu'il a fait ;
- permet d'iterer sans repartir de zero.

## 4. Objectifs produit

## 4.1 Objectifs principaux

- Transformer la fonctionnalite "Generate Template" en vrai moteur de canvas.
- Transformer les sorties Slides et Email en experiences de composition visuelle.
- Rendre l'activite de l'IA visible, compréhensible et pilotable.
- Permettre la sauvegarde et la reutilisation de templates reussis.
- Faire du module Apps Script un generateur de reporting interactif en ligne et pas seulement un export de fichiers.

## 4.2 Objectifs business

- Augmenter la valeur percue des livrables.
- Augmenter le taux de succes au premier essai.
- Reduire la sensation de "gadget".
- Permettre une monetisation premium par volume et sophistication des livrables.

## 5. Perimetre fonctionnel cible

## 5.1 Moteur Canvas de Report

Le produit doit exposer un canvas de report compose de blocs fonctionnels :
- cover / summary ;
- KPI strip ;
- tableaux ;
- graphiques ;
- insights ;
- recommandations ;
- conclusion ;
- annexes.

Chaque bloc doit disposer de :
- un type ;
- un role narratif ;
- une source de donnees ;
- une mise en forme ;
- un contenu genere ;
- un statut ;
- une provenance (`deterministic`, `llm`, `user-edited`, `mixed`).

## 5.2 Moteur Canvas de Slides

Le module Slides doit devenir un vrai studio de deck client.

Le deck doit etre modelise en :
- deck ;
- slides ;
- sections ;
- blocs ;
- visuels ;
- notes orales ;
- styles ;
- contraintes cible.

Chaque slide doit porter :
- un objectif narratif ;
- un story beat ;
- un niveau d'importance ;
- un message cle ;
- un bloc visuel principal ;
- un bloc preuve ;
- un bloc recommandation si pertinent.

## 5.3 Moteur Canvas d'Email

L'email ne doit plus etre un simple brouillon HTML. Il doit etre un composeur structure :
- subject ;
- preview line ;
- opening ;
- insight section ;
- CTA section ;
- footer ;
- variables de personnalisation ;
- version plain text ;
- version HTML ;
- version Gmail draft.

L'utilisateur doit pouvoir demander par prompt :
- un ton plus executif ;
- un ton plus commercial ;
- un ton plus rassurant ;
- un ton plus analytique ;
- une longueur differente ;
- une cible differente.

## 5.4 Moteur de Reporting interactif Apps Script

Le module Apps Script doit viser un report interactif en ligne :
- page d'accueil ;
- KPI cards ;
- filtres ;
- tableaux dynamiques ;
- graphiques ;
- onglets / vues ;
- narratif d'insight ;
- partage via URL ;
- mise a jour sur nouvelle generation.

Ce moteur doit pouvoir :
- generer le scaffold ;
- generer les composants d'interface ;
- projeter les donnees analytiques ;
- publier une version preview ;
- conserver un template de rendu web.

## 6. Architecture agentique cible

Le produit doit evoluer vers des agents internes specialises.

## 6.1 Agents attendus

### Agent 1 - Data Analyst

Responsabilites :
- profiler la selection Excel ;
- detecter les colonnes utiles ;
- qualifier la qualite des donnees ;
- identifier les angles d'analyse ;
- proposer les visualisations pertinentes.

Sorties :
- insights structurants ;
- hypotheses de KPI ;
- hypotheses de segmentation ;
- risques sur la qualite des donnees.

### Agent 2 - Report Planner

Responsabilites :
- transformer l'analyse en plan de livrable ;
- choisir la structure narrative ;
- ordonner les blocs ;
- arbitrer entre detail et synthese.

Sorties :
- blueprint du report ;
- blueprint du deck ;
- blueprint de l'email ;
- blueprint du report web.

### Agent 3 - Slide Designer

Responsabilites :
- construire le deck canvas ;
- choisir les story beats ;
- proposer la dramaturgie visuelle ;
- choisir les layouts ;
- lier chaque slide a une cible client.

Sorties :
- deck structure ;
- templates utilises ;
- options de variation ;
- justifications de design.

### Agent 4 - Email Composer

Responsabilites :
- convertir l'analyse en message exploitable ;
- adapter le ton a la cible ;
- generer le HTML et le plain text ;
- preparer le draft Gmail.

### Agent 5 - Web Report Builder

Responsabilites :
- transformer le blueprint en application Apps Script ;
- structurer navigation, composants, cartes, tableaux et graphiques ;
- preparer un rendu interactif partageable.

## 6.2 Orchestration

L'utilisateur ne doit pas voir un ensemble de fonctions dispersees. Il doit voir un workflow clair :
1. analyser les donnees ;
2. choisir la cible et l'intention ;
3. laisser l'agent proposer une structure ;
4. itérer par prompt ;
5. sauvegarder le template ;
6. produire les livrables ;
7. ouvrir / exporter / partager.

## 7. Modele de donnees cible pour le canvas

Le moteur doit introduire un modele de document editable.

## 7.1 Entites minimales

- `CanvasDocument`
- `CanvasSection`
- `CanvasBlock`
- `CanvasVisual`
- `CanvasTheme`
- `CanvasTemplate`
- `CanvasRun`
- `CanvasPromptRevision`

## 7.2 Capacites minimales

- un bloc peut etre ajoute, retire, reordonne ;
- un bloc peut etre regenere seul ;
- un bloc peut etre verrouille par l'utilisateur ;
- un bloc peut etre marque comme "approved" ;
- un bloc peut etre marque comme "needs rewrite" ;
- un template peut etre derive d'un run ;
- un template peut etre re-applique a un autre run.

## 8. Prompting et controle utilisateur

## 8.1 Prompts attendus

Le systeme doit accepter plusieurs couches de prompt :
- prompt metier sur le report ;
- prompt de style de presentation ;
- prompt de cible audience ;
- prompt de variation par livrable ;
- prompt de template.

## 8.2 Exemples d'intentions utilisateur

- "Je veux une presentation CFO orientee marge et variance."
- "Je veux un deck client premium type conseil strategique."
- "Je veux un email court et rassurant pour partager les principaux enseignements."
- "Je veux un mini dashboard web simple a partager avec le client."
- "Je veux un template noir et creme, tres haut de gamme, avec hero KPI et pages tres aerées."

## 8.3 Regles produit

- le prompt ne doit jamais remplacer le diagnostic donnees ;
- le LLM ne doit pas inventer de chiffres ;
- les chiffres doivent rester derives des donnees ;
- le LLM pilote la formulation, la structure, la narration et le style ;
- toute decision forte du LLM doit etre rendue visible dans le journal d'activite ou les metadonnees de run.

## 9. Templates : definition cible

Un template n'est pas seulement un theme visuel.

Un template doit encapsuler :
- identite visuelle ;
- audience cible ;
- ton ;
- structure narrative ;
- style de hero ;
- type de cartes ;
- densite d'information ;
- type de chart favori ;
- place accordee aux recommandations ;
- consignes de storytelling ;
- contraintes d'export.

## 9.1 Cycle de vie du template

L'utilisateur doit pouvoir :
- generer un template par prompt ;
- voir les differences par rapport au template precedent ;
- appliquer le template au run courant ;
- sauvegarder le template ;
- dupliquer le template ;
- renommer le template ;
- l'epingler comme template par defaut ;
- le supprimer ;
- le partager entre runs.

## 10. Experience utilisateur cible

## 10.1 Ce que l'utilisateur doit percevoir

Quand il clique sur `Generate Template`, il doit voir :
- qu'un travail est en cours ;
- ce que le systeme est en train de faire ;
- ce qui a change a la fin ;
- comment revenir en arriere ;
- comment sauvegarder ;
- comment exporter.

## 10.2 Etats UI obligatoires

- idle ;
- analysing ;
- planning ;
- generating template ;
- rewriting narrative ;
- building powerpoint ;
- building pdf ;
- preparing gmail draft ;
- exporting apps script ;
- success ;
- partial success ;
- error.

Chaque etat doit porter :
- un libelle humain ;
- un detail concret ;
- une ETA approximative si possible ;
- un scope (`slides`, `email`, `excel`, `web app`) ;
- le dernier artefact cree.

## 10.3 Differences visuelles obligatoires

Apres generation de template, l'utilisateur doit voir explicitement :
- les changements de palette ;
- les changements de structure ;
- les changements de hero ;
- les changements de densite ;
- les changements de ton narratif ;
- les changements de rendu des slides.

Un mode `Compare before / after` est recommande.

## 11. Critères de qualite des livrables

## 11.1 Slides

Un deck premium doit :
- etre lisible en rendez-vous client ;
- porter un arc narratif clair ;
- contenir des KPI ou graphiques quand les donnees s'y pretent ;
- faire gagner du temps a un analyste ou consultant ;
- eviter les slides vides, génériques ou repetitives ;
- fournir des speaker notes utilisables.

## 11.2 Email

Un email premium doit :
- etre coherent avec le deck et le report ;
- aller droit au message ;
- etre calibré pour la cible ;
- donner envie d'ouvrir le deck ou le report ;
- etre visible avant envoi dans un preview credible.

## 11.3 Report web

Un report web premium doit :
- etre consultable en ligne ;
- etre filtrable ;
- contenir de vraies interactions ;
- etre navigable ;
- etre partageable ;
- donner un sentiment de produit fini.

## 12. Audit du module Slides actuel

## 12.1 Constat general

Le module Slides actuel est en transition entre un exporteur d'artefacts et un studio de composition.

Ce qui existe deja :
- preview HTML in-pane ;
- export `.pptx` ;
- generation PDF ;
- generation de templates custom via LLM ;
- preview des slides et metadata de template ;
- modeles narratifs enrichis (`storyBeat`, audience, visual direction).

Ce qui manque encore :
- un canvas editable ;
- un diff visible apres generation de template ;
- un moteur de variations slide-par-slide ;
- une journalisation de travail plus demonstrative ;
- un statut clair pour chaque artefact exporte ;
- une semantics plus explicite des boutons.

## 12.2 Audit des boutons actuels

### Download PowerPoint

Etat code :
- le bouton est relie a un vrai export `.pptx` via `buildSlideDeckPowerPoint(...)`.

Limite produit :
- le bouton ne donne pas de feedback fort sur l'emplacement du fichier ;
- en taskpane Office, le telechargement peut sembler silencieux selon le WebView ;
- il n'y a pas de carte "dernier export genere".

Conclusion :
- le bouton est branche, mais l'experience n'est pas encore suffisamment rassurante.

### Open PDF Preview

Etat code :
- le bouton construit un vrai PDF, puis l'affiche dans un `iframe` interne.

Limite produit :
- le libelle laisse croire a une ouverture externe ;
- le comportement reel est une preview in-pane ;
- ce n'est pas encore un "ouvrir dans le lecteur PDF systeme".

Conclusion :
- le bouton fait quelque chose de reel, mais son nom et son feedback sont trompeurs.

### Download PDF

Etat code :
- le bouton produit un vrai fichier PDF a telecharger.

Limite produit :
- meme probleme de telechargement silencieux ;
- aucune trace locale de "dernier PDF genere".

Conclusion :
- techniquement branche, mais experience insuffisante pour un produit premium.

### Open HTML Preview

Etat code :
- le bouton tente d'ouvrir le rendu HTML du deck.

Limite produit :
- dans un taskpane Office, l'ouverture externe est fragile et peut sembler ne rien faire ;
- l'utilisateur a deja un preview HTML in-pane, donc le gain est flou.

Conclusion :
- bouton peu utile en l'etat ; a repositionner ou retirer.

## 12.3 Contraintes reelles d'un add-in Office

Il faut expliciter une limite technique importante :
- un taskpane Office est un environnement web sandboxe ;
- il ne peut pas garantir l'ouverture native de PowerPoint Desktop ou du lecteur PDF systeme comme une application locale ;
- les comportements `window.open`, downloads et handoff vers des applications externes sont dependants du WebView et du poste client.

Donc, un produit serieux ne doit pas promettre :
- "ouvrir dans PowerPoint Desktop" de facon garantie depuis le taskpane ;
- "ouvrir dans le lecteur PDF par defaut" de facon garantie depuis le taskpane.

Le produit doit plutot promettre :
- generer un `.pptx` valide ;
- fournir une preview riche dans l'addin ;
- telecharger le fichier ;
- indiquer clairement quoi faire ensuite.

Si une ouverture native desktop est un must, il faut une architecture supplementaire :
- companion app locale ;
- protocole custom ;
- backend de stockage puis ouverture hors add-in ;
- ou intégration Microsoft/SharePoint plus profonde.

## 13. Exigences MVP

Le MVP de cette refonte doit fournir :
- un modele de canvas unifie pour Slides et Email ;
- un statut de run visible ;
- un vrai diff avant / apres template ;
- des templates sauvegardables et reappliquables ;
- un preview riche et stable ;
- un journal d'actions lisible ;
- des exports mieux traces ;
- une generation narrative pilotee par audience ;
- un mode Apps Script oriente dashboard interactif.

## 14. Criteres d'acceptation

- L'utilisateur comprend si l'IA travaille ou non en moins de 2 secondes.
- `Generate Template` produit un changement visible et explique.
- Les Slides montrent un avant / apres ou un resume des changements.
- Les Emails ont un preview HTML credible et un draft Gmail coherent.
- Les exports sont traces avec statut, horodatage et resultat.
- Les templates peuvent etre sauvegardes et reuses sur un autre run.
- Les artefacts sont utiles a un vrai contexte client.

## 15. Phasage recommande

### Phase 1 - Fondations produit

- introduire le modele `CanvasDocument` ;
- tracer les runs ;
- rendre la generation visible ;
- stabiliser la semantics des actions Slides / Email ;
- ajouter diff avant / apres template.

### Phase 2 - Canvas Slides / Email

- rendu de blocs editables ;
- regeneration partielle par bloc ;
- sauvegarde de templates derives ;
- preview compare.

### Phase 3 - Agentique avancée

- agents specialises ;
- orchestration multi-livrables ;
- reecriture ciblee par audience ;
- generation web Apps Script plus ambitieuse.

## 16. Recommandation immediate

La priorite produit n'est pas d'ajouter encore plus de boutons.

La priorite est de transformer `Generate Template` en experience de composition visible :
- montrer ce qui change ;
- montrer ce que l'IA decide ;
- permettre de sauver le resultat ;
- rendre la sortie vraiment "client-ready".

Sans ce socle, les exports continueront a paraitre gadget meme quand le code fonctionne.
