# DyadIQ Labs — Website

Begleitende Website zu einer Nordakademie-Präsentation (Modul B146,
„Innere Bilder als Führungsprinzip"). Sie stellt das **fiktive** Startup
*DyadIQ Labs* vor und lässt das Publikum eine wissenschaftliche Due Diligence
des beworbenen HR-Tools durchführen.

**Live:** https://lynnewe2468.github.io/dyadiq-labs/

> Die Seite ist auf `noindex` gesetzt und über `robots.txt` von Suchmaschinen
> ausgeschlossen. Sie ist damit praktisch nur über Link/QR-Code erreichbar —
> GitHub Pages ist bei kostenlosen Accounts aber **technisch immer öffentlich**.

**QR-Code** für die Zenturie: `assets/qr-code.png` (Druck) bzw. `assets/qr-code.svg` (Folie).
Beide zeigen auf die Übersichtsseite.

## Die drei Bereiche

| Seite | Inhalt |
| --- | --- |
| `index.html` | **Übersicht** — die Produktseite, wie sie ein echtes HR-Tech-Startup hätte. Bewusst szenariofrei: kein Nora/Paul, kein Präsentationsbezug. |
| `wissen.html` | **Wissensbasis** — ILT/IFT, Erwartungs- und Wahrnehmungswert, LMX, Konstellationsmatrix, Befundlage der drei Studien, offene Forschungslücken. |
| `diskussion.html` | **Demo** — Ausgangslage, der DyadIQ-Bericht, drei Gruppenaufgaben (Multiple Choice, Einordnung mit optionaler Begründung, Mehrfachauswahl), gemeinsam sichtbare Ergebnisse, Musterlösungen zum Freischalten. |

## Ablauf am Präsentationstag

1. Die Demo-Seite ist zunächst **gesperrt**; Übersicht und Wissensbasis sind frei zugänglich.
2. Moderationsansicht öffnen: `diskussion.html?presenter=CODE` (Code steht in `config.js`).
3. **„Demo freischalten"** → alle Betrachter sehen die Aufgaben.
4. Die Gruppen geben ab; ihre **vollständigen Antworten** erscheinen bei allen unter *Gemeinsames Ergebnis*.
5. Nach der Vorstellung der Ergebnisse: **„Auflösung freischalten"**.

Die Moderationsansicht zeigt zusätzlich die Zahl der Abgaben. Über das **×** an einer Karte
lässt sich eine einzelne Abgabe löschen, über **„Alle Abgaben löschen"** der ganze
Probelauf — damit vor der Präsentation aufgeräumt werden kann.

Für Teilnehmende gilt: Entwürfe und der Abgabe-Status bleiben im Browser erhalten,
auch wenn zwischendurch die Wissensbasis aufgerufen wird. Löscht die Moderation eine
Abgabe, wird das Formular bei den Teilnehmenden wieder freigegeben.

## Datenbank

Die Abgaben laufen über **Supabase** (kostenlose Stufe), damit alle Betrachter
dieselben Ergebnisse sehen. Das Projekt ist eingerichtet, `config.js` ist gefüllt —
es ist nichts weiter zu tun.

- Projekt `dyadiq-labs`, Region `eu-central-1`
- Schema und Zugriffsregeln: `supabase-setup.sql` (bereits eingespielt)

Der anon-Key steht bewusst offen in `config.js` — so ist er bei Supabase gedacht.
Was er darf, regeln die RLS-Policies: Abgaben **lesen, anlegen und löschen** sowie den
Session-Zustand umschalten. Nachträgliches **Ändern** von Abgaben ist nicht möglich.

Das Löschrecht braucht es für die Moderation. Die Schaltflächen dafür sind nur über
`?presenter=CODE` sichtbar — das ist eine Hürde, kein echter Schutz. Ohne Server
liesse sich das nicht sauberer lösen.

Ohne Konfiguration liefe die Seite in einem **Testmodus** (Eingaben nur lokal im
Browser, mit Hinweisbanner) — das ist der Fallback, falls `config.js` mal leer ist.

### Vor bzw. nach der Präsentation zurücksetzen

Im Supabase-Dashboard unter *SQL Editor*:

```sql
truncate public.submissions restart identity;
update public.session_state set discussion_open = false, reveal_open = false where id = 1;
```

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
