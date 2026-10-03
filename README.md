# Math Games with Bad Drawings — interactive companion

A fan-made, playable companion to Ben Orlin’s book
[*Math Games with Bad Drawings*](https://mathwithbaddrawings.com/) (2022).
Every game from the book, playable in the browser: two players on one device, against the computer,
or on two devices over the network. RU / EN.

Rules, tips and drawings here are our own — for the real explanations (and much better drawings),
get the book.

## Run locally

```sh
uv run --no-project python tools/serve.py   # https://<lan-ip>:8443/ (self-signed)
```

Plain static files, no build step. Online play uses WebRTC (Trystero over public Nostr relays),
so it needs HTTPS — GitHub Pages or the dev server above.

## Tests

```sh
node --test games/                 # game engines
node tools/check-page.mjs <slug>   # page smoke test + screenshots (needs the dev server)
```

---

Фанатский интерактивный компаньон к книге Бена Орлина «Math Games with Bad Drawings»:
все игры из книги — вдвоём на одном устройстве, с компьютером или на двух устройствах по сети.
