import type en from '../en/metadata';
import type { Translation } from '../types';

const metadata: Translation<typeof en> = {
  title: 'Rechercher les infos',
  queryLabel: 'Titre, série ou lien Bédéthèque',
  queryPlaceholder: "Titre, série ou lien d'une fiche Bédéthèque",
  volumeLabel: 'Tome ou numéro',
  volumePlaceholder: 'Tome / n°',
  readPage: 'Lire la fiche',
  search: 'Rechercher',
  readingPage: 'Lecture de la fiche…',
  searching: 'Recherche en cours…',
  otherResults: 'Autres résultats',
  apply: 'Appliquer',
  untitled: 'Sans titre',
  noResults: "Aucun résultat. Essaie avec le nom de la série seul, sans numéro de tome, ou colle le lien de la fiche de l'album sur bedetheque.com.",
  accept: 'Accepter',
  acceptField: 'Accepter : {{field}}',
  field: 'Champ',
  current: 'Actuel',
  proposed: 'Proposé',
  proposedValue: 'Valeur proposée : {{field}}',
  authors: 'Auteurs',
  noAuthors: 'Aucun auteur trouvé.',
  keepAuthor: 'Conserver {{name}}',
  addAuthor: 'Ajouter {{name}}',
  firstName: 'Prénom',
  lastName: 'Nom',
  role: 'Rôle',
  currentTag: 'actuel',
  proposedTag: 'proposé',
};

export default metadata;
