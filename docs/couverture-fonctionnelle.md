# Couverture Fonctionnelle Testee

Cette matrice part du document `fonctionnalites-outil.md` et indique, pour chaque fonctionnalite metier, le niveau de preuve obtenu.

## Legende

- `Valide`: preuve de test solide dans l'environnement actuel
- `Partiel`: logique validee, mais pas la derniere execution hostee ou connectee
- `Non valide`: pas assez d'acces ou pas assez de preuve

| Fonctionnalite | Preuve | Verdict | Commentaire critique |
| --- | --- | --- | --- |
| Analyse de selection Excel | `dataProfiling`, `selectionGuardrails`, `institutionalQualification`, `userFeedback` | Valide | Bonne robustesse sur selection vide, petite, grande et dataset large. |
| Interpretation du prompt EN / FR | `promptInterpretation`, `reportPlanning`, `reportScenarioMatrix` | Valide | Un bug reel `dashboard`/`board` a ete corrige. |
| Construction du plan de rapport | `reportPlanning`, `outputBundle`, `institutionalQualification` | Valide | Le plan reste coherent sur jeux de donnees quanti et quali. |
| Rapport Excel: plan et eligibility | `reportPlanning`, `selectionGuardrails`, `institutionalQualification` | Valide | Les garde-fous de performance sont clairs. |
| Rapport Excel: ecriture reelle dans le workbook | smoke Desktop + logique Office | Partiel | Le host demarre correctement, mais le clic reel `Write Workbook Report` n'a pas ete automatise ici. |
| Draft email genere | `gmailDrafts`, `outputBundle`, `institutionalQualification` | Valide | Sujet, MIME, HTML et variantes audience sont credibles. |
| Vrai draft Gmail via Google | `googleAuthState`, `gmailDrafts` + OAuth/Google mocks | Partiel | La plomberie OAuth et l'appel Gmail sont testes, mais pas encore le draft live sur un vrai compte Google. |
| Slides | `slidesGenerator`, `reportScenarioMatrix`, `institutionalQualification` | Valide | Outline, markdown et JSON sont utiles et coherents. |
| Scaffold Apps Script | `gasGenerator`, `appsScriptProjects`, `institutionalQualification` | Valide | Le scaffold est exploitable pour un MVP. |
| Export Apps Script authentifie | `googleAuthState`, `appsScriptProjects` + OAuth/Google mocks | Partiel | Le flux d'export et de deploiement est teste avec mocks, mais pas encore avec un vrai projet Google. |
| Mode Automate: preview | `agentPlanning` | Valide | Le plan reste borne et ignore les demandes destructives. |
| Mode Automate: execution reelle | logique partielle + host smoke | Partiel | La logique est la bonne, mais l'execution GUI Excel n'a pas ete rejouee pas a pas. |
| Templates | `templatePersistence` | Valide | Les options de livraison et de mode sont bien sauvegardees. |
| AI optionnelle en mode deterministe | `outputBundle`, `llmEnhancement`, `userFeedback` | Valide | Le produit garde de la valeur sans AI live. |
| AI enhancement live | sonde OpenAI live + couche service produit | Partiel | La compatibilite live est prouvee, mais pas encore le parcours UI complet de bout en bout. |
| Historique d'activite | `activityHistory`, `taskpaneNavigation` | Valide | L'historique recent est cohérent et borne. |
| Diagnostics exportables | `diagnostics.test.ts` | Valide | Le bundle de diagnostic contient le contexte et les evenements. |
| Blocages et messages utilisateur | `userFeedback`, `selectionGuardrails`, `storageHardening`, `googleAuthState` | Valide | Les messages critiques sont clairs et actionnables. |
| Packaging / manifest / lint | `build:dev`, `lint` + tentative `validate`/`validate:dist` | Partiel | Le build est bon. Les services Microsoft de lint/validation reseau n'etaient pas joignables dans ce sandbox au moment de la relance. |
| Chargement Excel Desktop | sideload admin + dev server `200` | Valide | Le loopback fonctionne maintenant en contexte admin. |

## Conclusion critique

Le produit est solide sur son coeur de valeur:

- analyser une selection Excel
- proposer un plan coherent
- generer plusieurs livrables utiles
- rester robuste sur les cas limites courants

Mais il n'est pas encore rationnel de le qualifier `5 etoiles production ready` sans fermer trois trous:

1. tester les vrais flux Google avec un OAuth Client ID de test
2. tester la vraie AI enhancement live depuis le taskpane, pas seulement via la couche service
3. verifier manuellement dans Excel les actions hostees les plus sensibles
