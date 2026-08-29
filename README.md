# DyadIQ Labs — Website

Statische Landingpage für **DyadIQ Labs**, umgesetzt nach dem Claude-Design-Entwurf
*„Website-Design mit futuristischem Stil“ / „DyadIQ Übersicht“*.

**Live:** https://lynnewe2468.github.io/dyadiq-labs/

## Inhalt

| Datei | Zweck |
| --- | --- |
| `index.html` | Seitenstruktur (Nav, Hero, Marquee, Drei-Werte-Karten, Funktionsweise, Preise, CTA, Footer) |
| `styles.css` | Komplettes Styling; Farben als Hex-Fallback + `oklch()`-Original |
| `script.js` | Reveal-on-Scroll, Nav-Verdichtung, Maus-Parallax, magnetische Buttons |
| `assets/` | Bilder (aus den Präsentations-Slides ausgeschnitten) und Favicon |

## Technik

- Kein Build-Schritt, keine Abhängigkeiten – reines HTML/CSS/JS.
- Schriften: **Inter** und **Fraunces** über Google Fonts; die Wortmarke nutzt eine
  Serif-Kursive (`Times New Roman` / metrisch kompatible Fallbacks).
- Animationen respektieren `prefers-reduced-motion`.
- Responsive Breakpoints bei 980 px und 640 px (wie im Entwurf definiert).

## Lokal ansehen

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Deployment

GitHub Pages liefert den `main`-Branch aus dem Repository-Root aus.
Push auf `main` genügt – die Seite aktualisiert sich nach ein bis zwei Minuten.
