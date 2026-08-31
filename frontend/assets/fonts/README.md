# Vendored fonts

Two static TrueType files, used **only** by `app/opengraph-image.tsx`.

`next/og` (Satori) rasterises the link-preview card on the server and cannot read
`next/font`, which is how the site itself loads its type — it needs a real font
buffer, and it does not accept `woff2`. So these two faces are vendored here as
`.ttf` and read from disk at build time. Nothing in this directory is served to a
browser or bundled into the client.

| File | Face | Used for |
|---|---|---|
| `SpaceGrotesk-Bold.ttf` | Space Grotesk 700 | the card's title and stage line |
| `SpaceMono-Bold.ttf` | Space Mono 700 | the card's eyebrow and deadline label |

Both are SIL Open Font License 1.1, downloaded from Google Fonts (the same source
`next/font/google` uses for the site's own copies, so the OG card and the page
cannot drift apart typographically):

- Space Grotesk — https://fonts.google.com/specimen/Space+Grotesk
- Space Mono — https://fonts.google.com/specimen/Space+Mono

To refresh, request the CSS with an old user agent (which makes Google serve
TrueType rather than woff2) and download the `.ttf` it points at:

```bash
curl -s "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700" \
  -H "User-Agent: Mozilla/4.0" | grep -o 'https[^)]*ttf'
```
