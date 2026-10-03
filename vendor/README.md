# Vendored libraries

Single-file ESM bundles, committed as-is. Rebuild:

```sh
mkdir -p /tmp/vend && cd /tmp/vend && npm init -y && npm i trystero qrcode-generator esbuild
printf "export {joinRoom, selfId} from 'trystero/nostr';\n" > t.js
printf "import qrcode from 'qrcode-generator';\nexport default qrcode;\n" > q.js
npx esbuild t.js --bundle --format=esm --minify --outfile=<repo>/vendor/trystero.js
npx esbuild q.js --bundle --format=esm --minify --outfile=<repo>/vendor/qrcode.js
```

| file | package | version | license |
|---|---|---|---|
| trystero.js | trystero (nostr strategy) | 0.25.4 | MIT |
| qrcode.js | qrcode-generator | 2.0.4 | MIT |

## Fonts
vendor/fonts/: Caveat and PT Serif woff2 (SIL Open Font License), downloaded from Google Fonts css2 API (latin, latin-ext, cyrillic, cyrillic-ext); `fonts.css` lists the @font-face rules.
