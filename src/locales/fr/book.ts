import type en from '../en/book';
import type { Translation } from '../types';

const book: Translation<typeof en> = {
  fields: {
    title: 'Titre',
    series: 'Série',
    volume: 'Tome / n°',
    releaseDate: 'Date de sortie',
    language: 'Langue',
  },
  roles: {
    writer: 'Scénario',
    artist: 'Dessin',
    colorist: 'Couleurs',
    inker: 'Encrage',
    letterer: 'Lettrage',
    cover: 'Couverture',
    author: 'Auteur',
  },
};

export default book;
