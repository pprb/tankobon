import type en from '../en/dialogs';
import type { Translation } from '../types';

const dialogs: Translation<typeof en> = {
  openComic: 'Ouvrir une BD',
  comicFiles: 'Comics et PDF',
  addFile: 'Ajouter une BD',
  addFolder: 'Ajouter un dossier de BD',
  chooseDatabaseFolder: 'Choisir le dossier de la base de données',
  exportData: 'Exporter les données',
  importData: 'Importer des données',
};

export default dialogs;
