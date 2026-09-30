---
description: Traite une tâche Todoist de bout en bout (branche, implémentation, doc, tests, PR) en suivant le cycle TODO > IN PROGRESS > TO TEST > TO MERGE > DONE
argument-hint: "<id ou lien de la tâche Todoist>"
---

Tâche Todoist : $ARGUMENTS

Cycle de vie d'une tâche : TODO > IN PROGRESS > TO TEST > TO MERGE > DONE. Cette commande ne fait passer la tâche que de TODO à IN PROGRESS, puis à TO TEST. Les étapes TO MERGE et DONE restent manuelles.

1. Récupère la tâche via le MCP Todoist : titre, description, commentaires, sous-tâches.
2. Déplace-la dans la section « IN PROGRESS » de son projet. Retrouve l'id de la section avec `find-sections` plutôt que de le deviner.
3. Crée une branche `feat/<id-tâche>-<slug>` depuis `master` à jour (`git switch master && git pull`, puis `git switch -c …`). Si la tâche est un correctif, utilise le préfixe `fix/`.
4. Implémente ce qui est décrit. Si quelque chose est ambigu, pose-moi la question avant de coder.
5. Mets à jour la doc concernée selon la règle de documentation de `CLAUDE.md` (`docs/guide/features.md`, `docs/architecture.md`, `docs/development.md`, TSDoc, ADR, README). Tu peux t'appuyer sur `/update-docs`. Ne modifie pas `CHANGELOG.md` : release-please le génère à partir des commits.
6. Lance `npm run lint`, `npm run typecheck` et `npm test`, et corrige si besoin. Si la doc a changé, lance aussi `npm run docs:build`.
7. Commit au format Conventional Commits (`feat(<scope>): …`, un seul sujet par commit), pousse la branche, puis ouvre une pull request vers `master` avec `gh pr create`. Le titre de la PR suit lui aussi le format Conventional Commits, puisque les PR sont squash-mergées.
8. Ajoute un commentaire sur la tâche avec le nom de la branche, le lien de la PR, un résumé des changements et les points d'attention (ce qu'il faut tester en priorité, ce qui reste en suspens).
9. Déplace la tâche dans « TO TEST ». Ne la complète pas et ne merge pas la PR.
