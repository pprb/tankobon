// Error messages of the main process, sent to the renderer as `{ status: 'error', message }` or
// as a rejected IPC call.
export default {
  archive: {
    unknownBook: 'This book is not in the library: pick the file again.',
    unsupportedFormat: 'Unsupported format: {{extension}}',
    noExtension: '(no extension)',
    unknown: 'Unknown archive: {{id}}',
    noImages: 'No images found in {{path}}',
    noPages: 'No pages found in {{path}}',
    pageOutOfRange: 'Page {{index}} out of range (0-{{last}})',
    extractFailed: 'Could not extract the page: {{entry}}',
    closed: 'Archive closed: {{path}}',
    entryTooLarge: 'Page too large to be read: {{entry}}',
    fileNotFound: 'File not found: it has been moved or deleted.',
    openFailed: 'Unable to open this file: {{message}}',
  },
  decoder: {
    crashed: 'The file could not be read: the decoder stopped unexpectedly.',
  },
  database: {
    notWritable: 'Cannot write to {{directory}}.',
  },
  data: {
    exportFailed: 'Could not write the export: {{message}}',
    clearFailed: 'Could not clear the library: {{message}}',
  },
  import: {
    notJson: 'Unreadable file: this is not valid JSON.',
    notExport: 'Unrecognised file: this is not a Tankōbon export (version 1).',
  },
  readingLists: {
    notFound: 'Reading list not found.',
    emptyName: 'The list name can’t be empty.',
    listsChanged: 'The lists changed in the meantime: try again.',
    listChanged: 'The list changed in the meantime: try again.',
    full: 'The list “{{name}}” is full ({{max}} books at most).',
    entryGone: 'This book is no longer in the library.',
  },
  metadata: {
    emptyQuery: 'Enter a title or a series to search for.',
    noSource: 'No metadata source is configured: enable one in Settings › Metadata.',
    notResponding: '{{source}}: the service is not responding.',
    unreachable: '{{source}}: cannot reach the service.',
    unreadable: '{{source}}: unreadable response (HTTP {{status}}).',
    quota: '{{source}}: request quota exceeded. Try again later, or enter an API key in the settings.',
    sourceError: '{{source}}: {{message}}',
    httpError: 'HTTP error {{status}}',
    pageNotFound: '{{source}}: this page doesn’t exist.',
    invalidKey: '{{source}}: invalid API key.',
    notAlbumPage: '{{source}}: this page doesn’t describe an album.',
    notAlbumUrl: '{{source}}: this link isn’t an album page (https://www.bedetheque.com/BD-….html).',
  },
};
