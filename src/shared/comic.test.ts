import { describe, expect, it } from 'vitest';
import { comicFormat } from './comic';

describe('comicFormat', () => {
  it('reads the format from the extension, whatever its case', () => {
    expect(comicFormat('/books/Tintin.cbz')).toBe('CBZ');
    expect(comicFormat('/books/Tintin.CBR')).toBe('CBR');
    expect(comicFormat('C:\\books\\Tintin.Pdf')).toBe('PDF');
  });

  it('returns null without a supported extension', () => {
    expect(comicFormat('/books/Tintin.zip')).toBeNull();
    expect(comicFormat('/books/cbz')).toBeNull();
    expect(comicFormat('/books.cbz/Tintin')).toBeNull();
  });
});
