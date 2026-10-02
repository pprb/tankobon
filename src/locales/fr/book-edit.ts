import type en from '../en/book-edit';
import type { Translation } from '../types';

const bookEdit: Translation<typeof en> = {
  title: 'Modifier la fiche',
  volumePlaceholder: '3, 12.1, HS…',
  datePlaceholder: 'AAAA, AAAA-MM ou AAAA-MM-JJ',
  authors: 'Auteurs',
  noAuthors: 'Aucun auteur.',
  firstName: 'Prénom',
  lastName: 'Nom',
  lastNamePlaceholder: 'Nom ou pseudonyme',
  role: 'Rôle',
  removeAuthor: 'Retirer cet auteur',
  addAuthor: 'Ajouter un auteur',
  errors: {
    emptyTitle: 'Le titre ne peut pas être vide.',
    releaseDate: 'Date attendue : AAAA, AAAA-MM ou AAAA-MM-JJ.',
    lastName: 'Le nom est obligatoire (un pseudonyme va dans le nom).',
  },
};

export default bookEdit;
