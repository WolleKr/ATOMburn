# Sprint 10 — Hardware-Gate-Runbook

Der Dialog führt mit einem großen Aktionsknopf durch den gesamten Test. Vor jedem
Klick steht sichtbar, welcher Schritt als Nächstes folgt. Eine einzige kompakte
Bestätigung deckt Anwesenheit, freien Arbeitsbereich, vorbereitetes Material,
Absaugung/Air Assist und erreichbaren Not-Aus ab. Jeder Emissionslauf wird
weiterhin durch einen eigenen bewussten Nutzerklick gestartet.

## Geführter Ablauf

1. Passendes Projekt öffnen und im CAM-Preview **Open supervised Fill test** wählen.
2. Die eine Bereitschaftsbestätigung setzen.
3. Dem jeweils angezeigten nächsten Schritt folgen:
   - **1 · Verbinden**
   - **2 · Homing ausführen**
   - **3 · Fill vorbereiten**
   - **4 · Checkmodus ausführen**
   - **5 · Erneutes Homing** nach dem dokumentierten GRBL-Reset
   - **6 · Laserlos framen**
4. Den Rahmen visuell prüfen. Der letzte Knopf heißt eindeutig
   **7 · Rahmen passt – Lasertest starten** und ist der persönliche Emissionsstart.
5. Das Read-only-Feld **Workflow log** enthält Zeitstempel, jeden Start/Erfolg/
   Fehler, Statuswechsel, Positionen, Jobfortschritt, Parameter, SHA-256 und
   Endstatus.

## H-FILL-DRY-01 — laserlos

`tests/fixtures/projects/h-fill-01.atomburn` öffnen und nur die Schritte 1–6
ausführen. Im Checkmodus dürfen weder Bewegung noch Emission auftreten. Das
Framing muss vollständig auf dem Material liegen. Vor Schritt 7 stoppen und das
Workflow-Log sichern.

## H-FILL-01 — ein Durchgang

Mit `h-fill-01.atomburn` einen neuen Dialog und den vollständigen Ablauf starten.
Der Preflight muss 600 mm/min, 15 %, 0,5 mm Zeilenabstand, einen Durchgang und
5×5-mm-Grenzen anzeigen. Nach sichtbarer Rahmenprüfung Schritt 7 selbst anklicken
und Ergebnis sowie Endstatus dokumentieren.

## H-PASS-01 — zwei Durchgänge

`tests/fixtures/projects/h-pass-01.atomburn` öffnen und einen vollständig neuen
Workflow durchführen. Der Preflight muss zwei Durchgänge zeigen. Schritt 7
wieder selbst anklicken; Ergebnis und möglichen Versatz im Log/Abnahmebericht
dokumentieren.

Hold, Resume und Stop bleiben während eines laufenden Jobs verfügbar. Jeder neue
Gate-Lauf beginnt mit einem neuen Dialog und einer neuen Bereitschaftsbestätigung.
