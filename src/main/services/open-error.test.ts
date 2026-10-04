import { beforeAll, describe, expect, it } from 'vitest';

import { applyLanguage } from '../../shared/i18n';
import { openErrorMessage } from './open-error';

describe('openErrorMessage', () => {
  beforeAll(() => applyLanguage('fr'));

  it('says a missing file was moved or deleted', () => {
    const error = Object.assign(new Error("ENOENT: no such file or directory, open '/a.cbz'"), { code: 'ENOENT' });
    expect(openErrorMessage(error)).toBe('Fichier introuvable : il a été déplacé ou supprimé.');
  });

  it('gives the reason for any other failure', () => {
    expect(openErrorMessage(new Error('Format non supporté : .txt'))).toBe(
      "Impossible d'ouvrir ce fichier : Format non supporté : .txt",
    );
    expect(openErrorMessage('boom')).toBe("Impossible d'ouvrir ce fichier : boom");
  });
});
