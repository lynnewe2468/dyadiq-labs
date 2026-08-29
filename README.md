# DyadIQ Labs — Website

Begleitende Website zu einer Nordakademie-Präsentation (Modul B146,
„Innere Bilder als Führungsprinzip"). Sie stellt das **fiktive** Startup
*DyadIQ Labs* vor und lässt das Publikum eine wissenschaftliche Due Diligence
des beworbenen HR-Tools durchführen.

**Live:** https://lynnewe2468.github.io/dyadiq-labs/

> Die Seite ist auf `noindex` gesetzt und über `robots.txt` von Suchmaschinen
> ausgeschlossen. Sie ist damit praktisch nur über Link/QR-Code erreichbar —
> GitHub Pages ist bei kostenlosen Accounts aber **technisch immer öffentlich**.

## Die drei Bereiche

| Seite | Inhalt |
| --- | --- |
| `index.html` | **Übersicht** — die Produktseite, wie sie ein echtes HR-Tech-Startup hätte. Bewusst szenariofrei: kein Nora/Paul, kein Präsentationsbezug. |
| `wissen.html` | **Wissensbasis** — ILT/IFT, Erwartungs- und Wahrnehmungswert, LMX, Konstellationsmatrix, Befundlage der drei Studien, offene Forschungslücken. |
| `diskussion.html` | **Diskussion** — Ausgangslage, der DyadIQ-Bericht, drei Gruppenaufgaben, gemeinsam sichtbare Ergebnisse, Abschluss-Auflösung. |

## Ablauf am Präsentationstag

1. Die Diskussionsseite ist zunächst **gesperrt**; Übersicht und Wissensbasis sind frei zugänglich.
2. Moderationsansicht öffnen: `diskussion.html?presenter=CODE` (Code steht in `config.js`).
3. **„Diskussion freischalten"** → alle Betrachter sehen die Aufgaben.
4. Die Gruppen geben ab; die Kernaussagen erscheinen bei allen unter *Gemeinsames Ergebnis*.
5. Nach der Vorstellung der Ergebnisse: **„Auflösung freischalten"**.

Die Moderationsansicht zeigt zusätzlich zu jeder Abgabe die vollständigen Antworten
(Aufklappen unter „Details") sowie die Zahl der Abgaben.

## Einrichtung der Datenbank

Die Abgaben laufen über **Supabase** (kostenlose Stufe), damit alle Betrachter
dieselben Ergebnisse sehen.

1. Projekt auf [supabase.com](https://supabase.com) anlegen (Login geht mit GitHub).
2. `supabase-setup.sql` vollständig in den **SQL Editor** kopieren und ausführen.
3. Unter *Project Settings → API* die **Project URL** und den **anon public**-Key kopieren.
4. Beides in `config.js` eintragen, dazu einen eigenen `presenterCode` setzen.

Ohne diese Konfiguration läuft die Seite in einem **Testmodus**: alles funktioniert,
die Eingaben bleiben aber nur im jeweiligen Browser. Ein Hinweisbanner weist darauf hin.

Der anon-Key gehört öffentlich in den Quelltext — was er darf, regeln die
RLS-Policies in `supabase-setup.sql`: Abgaben lesen und anlegen, sonst nichts.

## Technik

- Kein Build-Schritt, keine Abhängigkeiten — reines HTML/CSS/JS.
- Schriften: **Inter** und **Fraunces** über Google Fonts; Wortmarke in einer Serif-Kursiven.
- Farben als Hex-Fallback + `oklch()`-Original (aus dem Claude-Design-Entwurf).
- Nutzereingaben werden beim Anzeigen escaped.
- Animationen respektieren `prefers-reduced-motion`.

## Lokal ansehen

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Deployment

GitHub Actions (`.github/workflows/pages.yml`) deployt jeden Push auf `main`.
Der Git-Remote zeigt auf `ssh.github.com:443`, weil Port 22 im genutzten Netz blockiert ist.
