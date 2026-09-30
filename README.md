# thread-radar-phone

The public side of a private tool: a GitHub Pages site. It holds no app code
and no data.

- **Root** (`index.html`, `sw.js`, `go.html`, manifests, icons): a loader page.
  Its service worker loads the app from the owner's private repository with a
  token kept on the phone. Source: `mobile/loader/` in that private repository;
  copy changes from there, do not edit them here first.
- **`firefox/`**: the signed Firefox for Android add-on (`.xpi`), its install
  page and `updates.json`, which the installed add-on checks to update itself.
  Written only by the private repository's `firefox` workflow on every push to
  its `main` that touches the app. Never edit this folder by hand.

Documentation, history and setup steps live in the private repository
(`CLAUDE.md`, `docs/PHONE.md`, `docs/DECISIONS.md`).
