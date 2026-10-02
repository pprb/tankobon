import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import { MAX_READING_LIST_SIZE, type ReadingList, type ReadingListResult } from '../../shared/reading-list';
import { LibraryRepository } from './library-repository';
import { ReadingListRepository } from './reading-list-repository';
import { migrate } from './schema';

function okList(result: ReadingListResult): ReadingList {
  if (result.status !== 'ok') throw new Error(result.message);
  return result.list;
}

describe('ReadingListRepository', () => {
  let library: LibraryRepository;
  let lists: ReadingListRepository;
  let ids: string[];

  beforeEach(() => {
    const db = new DatabaseSync(':memory:');
    migrate(db);
    library = new LibraryRepository(db);
    lists = new ReadingListRepository(db);
    ids = ['a', 'b', 'c'].map((name) => library.touch(`/comics/${name}.cbz`, name, 10, 10, 100).id);
  });

  it('creates an empty list with a trimmed name', () => {
    const list = okList(lists.create('  Été  '));
    expect(list).toMatchObject({ name: 'Été', entryIds: [] });
    expect(lists.list()).toEqual([list]);
  });

  it('refuses an empty name', () => {
    expect(lists.create('   ').status).toBe('error');
    const list = okList(lists.create('Pile'));
    expect(lists.rename(list.id, '').status).toBe('error');
    expect(okList(lists.rename(list.id, 'Pile 2')).name).toBe('Pile 2');
  });

  it('appends books in order and ignores duplicates', () => {
    const list = okList(lists.create('Pile'));
    lists.addEntry(list.id, ids[1]);
    lists.addEntry(list.id, ids[0]);
    expect(okList(lists.addEntry(list.id, ids[1])).entryIds).toEqual([ids[1], ids[0]]);
  });

  it(`refuses more than ${MAX_READING_LIST_SIZE} books`, () => {
    const list = okList(lists.create('Pile'));
    for (let i = 0; i < MAX_READING_LIST_SIZE; i++) {
      const entry = library.touch(`/comics/many-${i}.cbz`, `n${i}`, 10, 10, 100);
      expect(lists.addEntry(list.id, entry.id).status).toBe('ok');
    }
    const result = lists.addEntry(list.id, ids[0]);
    expect(result).toMatchObject({ status: 'error' });
    expect(lists.get(list.id)?.entryIds).toHaveLength(MAX_READING_LIST_SIZE);
  });

  it('refuses unknown lists and books', () => {
    expect(lists.addEntry('nope', ids[0]).status).toBe('error');
    const list = okList(lists.create('Pile'));
    expect(lists.addEntry(list.id, 'nope').status).toBe('error');
  });

  it('removes a book and keeps the others in order', () => {
    const list = okList(lists.create('Pile'));
    ids.forEach((id) => lists.addEntry(list.id, id));
    expect(okList(lists.removeEntry(list.id, ids[1])).entryIds).toEqual([ids[0], ids[2]]);
  });

  it('reorders, but only with exactly the current books', () => {
    const list = okList(lists.create('Pile'));
    ids.forEach((id) => lists.addEntry(list.id, id));
    expect(okList(lists.reorder(list.id, [ids[2], ids[0], ids[1]])).entryIds).toEqual([ids[2], ids[0], ids[1]]);
    expect(lists.reorder(list.id, [ids[0], ids[1]]).status).toBe('error');
    expect(lists.reorder(list.id, [ids[0], ids[0], ids[1]]).status).toBe('error');
    expect(lists.get(list.id)?.entryIds).toEqual([ids[2], ids[0], ids[1]]);
  });

  it('drops a book removed from the library, and appends after the gap it leaves', () => {
    const list = okList(lists.create('Pile'));
    ids.forEach((id) => lists.addEntry(list.id, id));
    library.remove(ids[1]);
    expect(lists.get(list.id)?.entryIds).toEqual([ids[0], ids[2]]);
    const extra = library.touch('/comics/d.cbz', 'd', 10, 10, 100);
    expect(okList(lists.addEntry(list.id, extra.id)).entryIds).toEqual([ids[0], ids[2], extra.id]);
  });

  it('deletes a list without touching the library', () => {
    const list = okList(lists.create('Pile'));
    lists.addEntry(list.id, ids[0]);
    lists.remove(list.id);
    expect(lists.list()).toEqual([]);
    expect(library.list()).toHaveLength(3);
  });

  it('upserts a snapshot by id, replacing name and books', () => {
    const list = okList(lists.create('Pile'));
    lists.addEntry(list.id, ids[0]);
    expect(lists.upsert({ ...list, name: 'Restaurée', entryIds: [ids[2], ids[1], ids[2]] })).toBe('updated');
    expect(lists.get(list.id)).toMatchObject({ name: 'Restaurée', entryIds: [ids[2], ids[1]] });
    expect(lists.upsert({ id: 'other', name: 'Autre', createdAt: '2024-01-01', entryIds: [] })).toBe('created');
    expect(lists.list().map((l) => l.name)).toEqual(['Autre', 'Restaurée']);
  });
});
