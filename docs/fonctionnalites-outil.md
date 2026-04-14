# Fonctionnalites de ReportForge AI

## Resume

ReportForge AI est un add-in Excel qui transforme une selection de cellules en livrables de reporting directement exploitables.

L'outil ne se limite pas a "faire un joli ecran". Il aide a:

- comprendre la structure de la selection
- construire un plan de rapport
- generer plusieurs formats de sortie
- garder un workflow clair dans un taskpane etroit

## Ce que fait l'outil

### 1. Analyse la selection Excel

L'addin lit la selection active et detecte notamment:

- dimensions principales
- mesures numeriques
- niveau de completude
- structure tabulaire ou sparse
- candidats KPI
- candidats graphiques

Il verifie aussi si la selection est exploitable:

- selection vide
- selection trop petite
- selection trop grande
- host Excel insuffisant

## 2. Construit un plan de rapport

A partir de la selection et d'un prompt utilisateur, l'outil produit:

- un titre de rapport
- un sous-titre
- un resume narratif
- des KPI
- des graphiques potentiels
- des recommandations
- un plan de sections pour le rapport Excel

Le prompt peut etre donne en anglais ou en francais.

## 3. Genere plusieurs livrables

### Rapport Excel natif

L'outil peut creer dans le classeur:

- une feuille de rapport
- une feuille de donnees detaillees
- une feuille support cachee pour les graphiques
- des KPI
- des blocs de synthese
- des graphiques
- un apercu tabulaire
- des recommandations

### Draft email

L'outil genere:

- un sujet
- une version texte
- une version HTML
- plusieurs variantes selon l'audience

Il peut aussi creer un vrai draft Gmail si Google est configure.

Si le deploiement fournit deja un OAuth client ID Google, la connexion peut se declencher automatiquement au premier vrai usage Gmail ou Apps Script.

L'etat OAuth est explicite: connexion en cours, connecte, erreur, scopes demandes, scopes accordes et dernier blocage visible dans l'interface.

### Slides

L'outil genere:

- un outline de presentation
- des titres de slides
- des bullets
- des suggestions de graphiques
- des speaker notes
- une preview HTML consultable directement dans l'addin
- un export PowerPoint `.pptx`
- une preview PDF reelle
- un telechargement PDF
- un export Markdown
- un export JSON

L'utilisateur peut aussi:

- choisir un template de deck
- sauvegarder des templates de slides
- supprimer un template custom
- demander a l'IA de generer un template visuel a partir d'un brief

Les templates de slides modifient la structure visuelle et le rendu du deck sans perdre la logique metier du rapport.

### Web app / Google Apps Script

L'outil genere un scaffold Apps Script incluant:

- `Code.gs`
- `Index.html`
- `Styles.html`
- `Client.html`
- `appsscript.json`

Le scaffold sert a produire rapidement un mini dashboard web base sur le dataset selectionne.

## 4. Propose un mode d'automatisation borne

Le mode `Automate` permet de:

- structurer la selection en table Excel
- appliquer un format de reporting
- geler la ligne d'entete
- generer le rapport workbook

Ce mode est volontairement borne pour limiter les actions dangereuses dans le classeur.

## 5. Organise l'experience en vues claires

Le taskpane est structure en vues pour eviter un ecran unique surcharge:

- `Overview`: vue d'ensemble et etat du workflow
- `Data`: analyse de la selection et profil du dataset
- `Plan`: brief, templates, configuration AI
- `Automate`: preview et execution du plan d'automatisation
- `Outputs`: rapport Excel, web app, email, slides
- `Activity`: historique recent et diagnostics

## Fonctions utiles pour l'utilisateur

### Templates

L'utilisateur peut sauvegarder et reappliquer:

- un prompt
- un mode de generation
- des preferences email
- des options Apps Script

### AI optionnelle

L'outil peut enrichir la narration avec un provider AI compatible, mais ce n'est pas obligatoire pour generer les livrables de base.

L'outil permet aussi de tester la connexion AI avant usage intensif, pour eviter les erreurs tardives de configuration.

Dans un deploiement gere, l'utilisateur final peut consommer l'IA sans entrer de cle API lui-meme si l'operateur a configure un relay serveur same-origin.

### Historique et diagnostics

L'outil conserve:

- un historique recent des actions
- des diagnostics exportables
- un etat de persistence degradee si le storage local echoue

## Garde-fous et blocages clairs

L'outil prevoit des garde-fous pour eviter les usages trompeurs ou instables:

- blocage des selections trop grandes
- confirmation sur les selections lourdes
- invalidation des resultats stale quand la selection change
- prevention des clics multiples concurrents
- degradation propre si le storage est indisponible
- messages explicites si Google ou AI sont mal configures

L'outil detecte aussi si un utilisateur colle par erreur une Google API key au lieu d'un OAuth Client ID.

## Ce que l'outil n'est pas

L'outil n'est pas:

- un ETL complet
- un moteur BI enterprise
- un deploiement web final "prod-ready" sans revue
- un agent libre pouvant modifier n'importe quoi dans Excel

Il sert a accelerer la production d'un reporting exploitable a partir d'une selection Excel, avec une logique de guardrails et de livrables concrets.

## Valeur ajoutee attendue

La valeur du produit est reelle si l'utilisateur veut:

- produire rapidement un premier report a partir d'un tableau Excel
- obtenir des livrables multicanal sans repartir de zero
- cadrer une analyse meme avec des donnees imparfaites
- gagner du temps entre l'analyse, la synthese et la mise en forme
