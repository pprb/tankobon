// Every namespace of this locale. A namespace is one area of the app (a page, a dialog, the main
// process's messages), so each file stays small and a change touches only the area it is about.
import book from './book';
import bookEdit from './book-edit';
import common from './common';
import dialogs from './dialogs';
import errors from './errors';
import lists from './lists';
import library from './library';
import metadata from './metadata';
import nav from './nav';
import reader from './reader';
import settings from './settings';
import stats from './stats';

export default { book, bookEdit, common, dialogs, errors, library, lists, metadata, nav, reader, settings, stats };
