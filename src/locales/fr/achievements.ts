import type en from '../en/achievements';
import type { Translation } from '../types';

const achievements: Translation<typeof en> = {
  title: 'Accomplissements',
  intro: 'Débloquez des accomplissements en lisant et en organisant votre bibliothèque.',
  summary: '{{unlocked}} sur {{total}} débloqués',
  locked: 'Pas encore débloqué',
  unlockedOn: 'Débloqué le {{date}}',
  toastTitle: 'Accomplissement débloqué !',
  toastMany: '{{count}} accomplissements débloqués !',
  toastManyHint: 'Retrouvez-les dans la page Accomplissements.',
  dismiss: 'Fermer',
  groups: {
    reading: 'Lecture',
    library: 'Bibliothèque',
    organization: 'Organisation',
    fun: 'Fantaisie',
  },
  items: {
    firstBook: { name: 'Premier chapitre', description: 'Terminer un premier livre.' },
    finished10: { name: 'Dévoreur de tomes', description: 'Terminer 10 livres.' },
    finished50: { name: 'Dévoreur de tomes II', description: 'Terminer 50 livres.' },
    finished200: { name: 'Dévoreur de tomes III', description: 'Terminer 200 livres.' },
    nightOwl: { name: 'Noctambule', description: 'Ouvrir un livre après 22 h (jusqu’à 5 h).' },
    earlyBird: { name: 'Lève-tôt', description: 'Ouvrir un livre entre 5 h et 7 h.' },
    librarian: { name: 'Bibliothécaire', description: 'Avoir 100 livres dans la bibliothèque.' },
    archivist: { name: 'Archiviste', description: 'Avoir 1 000 livres dans la bibliothèque.' },
    grandArchivist: { name: 'Grand archiviste', description: 'Avoir 5 000 livres dans la bibliothèque.' },
    formats: { name: 'Collectionneur de formats', description: 'Avoir un CBZ, un CBR et un PDF dans la bibliothèque.' },
    sentinel: { name: 'Sentinelle', description: 'Ajouter un dossier à la bibliothèque.' },
    listMaker: { name: 'Créateur de liste', description: 'Créer sa première liste de lecture.' },
    listMaster: { name: 'Maître des listes', description: 'Créer 5 listes de lecture, ou en remplir une de 50 livres.' },
    critic10: { name: 'Critique', description: 'Noter 10 livres.' },
    critic50: { name: 'Critique II', description: 'Noter 50 livres.' },
    tagger: { name: 'Étiqueteur', description: 'Utiliser 10 tags différents.' },
    scholar1: { name: 'Érudit', description: 'Renseigner les crédits d’un livre.' },
    scholar10: { name: 'Érudit II', description: 'Renseigner les crédits de 10 livres.' },
    rightToLeft: { name: 'De droite à gauche', description: 'Ouvrir un livre en sens de lecture droite à gauche.' },
    polyglot: { name: 'Polyglotte', description: 'Avoir des livres dans 2 langues différentes.' },
  },
};

export default achievements;
