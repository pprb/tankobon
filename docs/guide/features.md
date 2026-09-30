# Features

Tankōbon is a library manager and reader for digital comics, BD and manga. It opens **CBZ**, **CBR** and **PDF** files. The user interface is in French; labels below are quoted as they appear in the app.

## Library

- **Adding comics**: "Ajouter un fichier" opens one comic; "Ajouter un dossier…" adds every CBZ/CBR/PDF found in a folder and its subfolders, with a progress bar. Comics already in the library are skipped, and a file that can't be opened is counted as failed without stopping the scan.
- **Metadata**: for each comic the library shows its page count, the number of files in the archive and its size on disk. They are computed when the comic is opened or scanned, and refreshed each time it is reopened.
- **Rating and tags**: each comic can be rated from 0 to 5 stars (clicking the selected star again clears it) and tagged, with two quick tags ("Lu", "À lire") plus free tags typed in a text field. Rating and tags are only ever changed by the user: reopening a book never resets them.
- **Search and filters**: the toolbar searches titles *and* file paths (so a folder name finds a whole series), ignoring accents and case. Tags can be combined (a comic must carry all selected tags), and the rating filter keeps comics rated at least the chosen number of stars.
- Automatic metadata extraction (language, authors, year) is not implemented.

## Reader

- **Resume**: a comic reopens at the last page read.
- **Reading direction**: left-to-right (BD/comics) or right-to-left (manga), in Paramètres › Lecture. It swaps which side (arrow keys and click zones) goes forward.
- **Zoom**: fit to window, or 50 % to 200 % (100 % being the page's actual size).
- **AI enhancement**: when a page is displayed larger than its native resolution, the "Améliorer (IA)" option upscales it with a super-resolution model (ESRGAN via UpscalerJS/TensorFlow.js) that runs locally. The model ships with the app and works offline; it is only loaded the first time the option is used.
- **Mouse wheel / trackpad**: in "fit" zoom the wheel turns pages, one page per gesture (the inertia of a trackpad swipe doesn't skip extra pages). When zoomed in, the wheel first scrolls the page and only turns it once the top or bottom edge is reached. Whether scrolling down goes forward or back is set in Paramètres › Lecture.
- **Continuous mode**: instead of page by page, pages can flow vertically ("Défilement continu"), loaded as they approach the screen. The gap between pages is set in pixels (0 = pages touch). The current page (for the counter and resuming) is the one most visible on screen.
- **Progress and time left**: the reader header shows the percentage read and an estimate of the remaining reading time, based on the pace observed since the book was opened in this session. The estimate appears once there is enough data.
- **Background color**: the color behind the pages can be picked from presets or a color picker (Paramètres › Affichage).
- **Fullscreen**: the header button, `F` or `F11` toggle fullscreen; `Escape` leaves it. In fullscreen the sidebar is hidden and the header only appears when the mouse reaches the top of the screen.
- **Keyboard** (page-by-page mode): `→`, `Page Down` and `Space` act like the right click zone; `←` and `Page Up` like the left one.

## Sidebar

The button at the top of the sidebar collapses it to a column of icons, to give more room to the reader. The state is remembered like the other settings.

## Your data

- **Local only**: the library and the settings are stored in one SQLite file, `tankobon.db`. By default it lives in the app's user data directory; nothing is sent to the cloud.
- **Moving the database** (Paramètres › Données): the database can be pointed at another folder, for example a synced one. The existing file is *not* moved: if the new folder already holds a Tankōbon database it is used as is, otherwise an empty one is created there. The change takes effect after a restart ("Redémarrer maintenant"). Export your data first if you want to take it along.
- **Export / import** (Paramètres › Données): the library and settings can be exported to a JSON file, and an export can be imported back. Importing merges by file path: comics in the file overwrite the matching ones (progress, rating and tags included), comics only present locally are kept, and settings are replaced.
