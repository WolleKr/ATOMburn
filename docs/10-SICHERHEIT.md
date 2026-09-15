# Sicherheit

## Gefahrenklasse

Das X30-Pro-Handbuch bezeichnet das Gerät als **Klasse-4-Laser**. Direkter und
reflektierter Strahl kann Augen und Haut verletzen; das Verfahren kann Feuer
und gesundheitsschädliche Dämpfe erzeugen.

Diese Datei ist eine technische Produktanforderung, keine vollständige
Betriebs- oder Rechtsberatung. Das Herstellerhandbuch hat Vorrang.

## Bedienregeln

- Gerät niemals unbeaufsichtigt laufen lassen.
- Ein Livebild und WLAN-Steuerung ersetzen weder Aufsicht noch einen physisch
  erreichbaren Not-Aus.
- Geeignete Einhausung, Absaugung und Unterlage verwenden.
- Materialeigenschaften kennen; insbesondere chlorhaltige oder unbekannte
  Kunststoffe nicht bearbeiten.
- Geeignete Schutzmaßnahmen und Schutzbrille gemäß Herstellerangaben nutzen.
- Passenden Feuerlöscher erreichbar halten.
- Not-Aus physisch erreichbar halten.
- Laser und Arbeitsfläche vor dem Start fokussieren und kontrollieren.

## Software-Invarianten

AtomBurn muss:

- beim Verbinden und Joggen den Laser aus lassen,
- Jobs nur aus `Idle` starten,
- `M5`/`S0` defensiv im Jobrahmen verwenden,
- ungültige, NaN- oder unendliche Koordinaten blockieren,
- Arbeitsbereich einschließlich Overscan prüfen,
- maximale Leistung und ungefähre Laufzeit vor Start anzeigen,
- bei jedem `ALARM` den Stream stoppen,
- bei WLAN-, TCP-, Bridge- oder USB-Verlust den Job als abgebrochen behandeln,
- nach Reset oder Reconnect niemals automatisch fortsetzen,
- die Rohkonsole im normalen Betrieb gegen Schreibzugriff sperren,
- gefährliche Fokus-/Fire-Befehle nur zeitlich begrenzt und bewusst erlauben.

## UI-Regeln

- Start ist ein klar unterscheidbarer, nicht versehentlich auslösbarer Vorgang.
- Stop und Pause bleiben während eines Jobs sichtbar.
- Software-Stop darf nicht als „Not-Aus“ beschriftet sein.
- Alarmtexte zeigen Bedeutung und nächsten sicheren Schritt, nicht nur Nummern.
- `Unlock` benötigt eine bewusste Aktion nach physischer Kontrolle.
- Framing ist standardmäßig laserlos.
- Expertenfunktionen sind optisch und technisch getrennt.

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| TCP/Port verschwindet | Stream beenden, Job fehlgeschlagen, warnen dass bereits angenommene Bewegung weiterlaufen kann, kein Reconnect-Resume |
| nur Kamerabild fällt aus | deutlich warnen; keine blinden Zusatzbefehle; Benutzer entscheidet sicher |
| LaserCam erreichbar, GRBL antwortet nicht | keine Maschinenaktion; USB-Verbindung vor Ort prüfen |
| konkurrierende Steueranwendung | Start blockieren und exklusiven Kanal verlangen |
| unerwartete GRBL-Begrüßung | Controllerreset annehmen, Job abbrechen |
| `error:n` | Stream stoppen, Zeile und Erklärung protokollieren |
| `ALARM:n` | keine Bewegungsbefehle, Nutzer prüft Maschine |
| Status-Timeout | Hold/Stop anbieten, nicht weiter blind senden |
| Bounds-Verletzung | Export und Start blockieren |
| `$30` geändert | G-Code neu erzeugen oder Start blockieren |
| `$32 != 1` | Start blockieren oder explizit kompatiblen Modus wählen |
| App-Absturz | OS schließt Port; keine Auto-Wiederaufnahme beim Neustart |

## Sicherheitsrelevante Tests

- Header startet nie mit aktiver Leistung.
- G0-Bewegungen tragen keine Laserleistung.
- Footer endet sicher mit Laser aus.
- Pause, Reset und Alarm mit einem Mockcontroller testen.
- Bounds-Fuzzing mit sehr großen, negativen und nicht endlichen Zahlen.
- SVG-Sanitizing gegen Skripte, externe Referenzen und Entity-Angriffe.
- Portverlust an verschiedenen Pufferständen simulieren.
- Netzwerkverlust, hohe Latenz, Paketteilung und LaserCam-Neustart simulieren.
- Kameraausfall unabhängig vom GRBL-Kanal testen.

## Quelle

- [ATOMSTACK X30 Pro Handbuch](https://ncstatic.clewm.net/rsrc/2024/0112/09/1ab42831666d756fd6ab09232f3c5874.pdf)
- [Mintion-Hinweis zur beaufsichtigten WLAN-Nutzung](https://www.mintion.net/blogs/laser-engraver-camera-guidelines/mintion-lasercam-fully-wireless-connection-with-lightburn)
