/**
 * Persistence of the folders added to the library (the `library_folders` table).
 * @module
 */
import type { DatabaseSync } from 'node:sqlite';

/**
 * The folders added to the library with "Ajouter un dossier…", which a resynchronization walks
 * again. Kept in the main process only: the renderer never names a path, it only lists them.
 */
export class LibraryFolderRepository {
  constructor(private readonly db: DatabaseSync) {}

  /** Every folder, in the order they were added. */
  list(): string[] {
    const rows = this.db.prepare('SELECT path FROM library_folders ORDER BY added_at, path').all() as {
      path: string;
    }[];
    return rows.map((row) => row.path);
  }

  /** Remembers a folder; one that is already known is left alone. */
  add(folderPath: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO library_folders (path, added_at) VALUES (?, ?)')
      .run(folderPath, new Date().toISOString());
  }

  /** Forgets a folder. Its comics stay in the library. */
  remove(folderPath: string): void {
    this.db.prepare('DELETE FROM library_folders WHERE path = ?').run(folderPath);
  }
}
