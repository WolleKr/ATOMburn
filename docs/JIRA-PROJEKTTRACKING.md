# Jira-Projekttracking für ATOMburn

Dieses Dokument verbindet den vollständigen technischen Plan im Repository mit
der operativen Sicht im Jira-Board.

## Quellenaufteilung

- Jira-Projekt: `SCRUM` auf `https://wollekragenticboard.atlassian.net`
- Repository: `https://github.com/WolleKr/ATOMburn`
- Vollständiger technischer Plan: `docs/16-DEV-PLAN.md`
- Grober Testplan: `docs/12-TESTPLAN.md`
- Sprintberichte: `docs/sprints/`
- Hardware- und Sicherheitsregeln: `AGENTS.md`, `docs/10-SICHERHEIT.md`

Jira zeigt Status, Zuordnung, offene Aufgaben, Blocker und manuelle Tests.
Das Repository bleibt die vollständige Quelle für Architektur, Abnahmekriterien,
Teststrategie, Protokolle und Abschlussreview.

## Jira-Hierarchie

- Epic: ATOMburn als Gesamtprojekt
- Story/Task: ein vertikaler Sprint
- Sub-Task: klar abgrenzbare Implementierungs-, Review- oder Testaufgabe
- Bug: Abweichung mit Bezug auf den betroffenen Sprint
- `manual-test` / `physical-test`: Test muss durch den Nutzer am Gerät oder an
  einem physischen Ergebnis durchgeführt werden

## Statusmodell

```text
Zu erledigen -> In Arbeit -> Wird überprüft -> Fertig
                    |              |
                    +-> Blocker     +-> manual-test / physical-test

Nach allen Sprints: Final Verification in "Wird überprüft"
```

Das konkrete Board stellt derzeit genau diese vier Status bereit. Ihre Bedeutung
ist:

- `Zu erledigen`: Backlog und Ready for Agent; ein Issue ist noch nicht aktiv.
- `In Arbeit`: Agent oder Nutzer arbeitet daran.
- `Wird überprüft`: Agent Review oder Ready for Manual Test; bei physischen
  Prüfungen muss zusätzlich `manual-test` beziehungsweise `physical-test`
  gesetzt sein.
- `Fertig`: abgeschlossen und nachweisbar.

Blocker werden mit einem Kommentar und dem Label `blocked` sichtbar gemacht.

## Agentenregeln

1. Ein Agent nimmt nur ein Jira-Issue mit `Ready for Agent` an.
2. Er liest dieses Dokument, `AGENTS.md`, den DEV-Plan und den zugehörigen
   Sprintbericht vor Änderungen.
3. Er ändert nur den Sprintumfang und dokumentiert Dateien, Befehle, Ergebnisse,
   Abweichungen und Risiken im Jira-Issue.
4. Bei Hardware- oder physischer Prüfung stoppt er bei `Ready for Manual Test`.
5. Nur der Nutzer bestätigt das physische Ergebnis und schließt das Test-Issue.
6. Ein Sprint gilt erst als fertig, wenn Repository-Dokumentation und Jira beide
   den gleichen Status beziehungsweise eine erklärte Abweichung enthalten.

## Kommentarformat

```text
Status: <Zustand>
Geändert: <Dateien oder keine>
Tests: <Befehle und Ergebnis>
Nachweis: <Artefakt, Log, Screenshot, PR oder physisches Ergebnis>
Abweichungen: <keine oder Details>
Blocker/Risiken: <keine oder Details>
Nächster Schritt: <Aktion oder manueller Besitzer>
```

## Synchronisationsregister

Die initiale Synchronisierung wurde am 21. August 2026 durchgeführt. Die Jira-
Issues liegen zunächst im Backlog mit Label `agent-ready`; die teamverwaltete
Board-Konfiguration kann die tatsächlichen Sprintcontainer weiterhin separat
zuordnen. Neue Sprints und Tests dürfen nicht nur in Jira oder nur im
Repository angelegt werden.

| Artefakt | Jira-Key | Status | Link/Nachweis |
|---|---|---|---|
| ATOMburn Epic | [SCRUM-6](https://wollekragenticboard.atlassian.net/browse/SCRUM-6) | Zu erledigen | `docs/16-DEV-PLAN.md` |
| Sprint 00 | [SCRUM-13](https://wollekragenticboard.atlassian.net/browse/SCRUM-13) | Zu erledigen | `docs/sprints/SPRINT-00-BERICHT.md` |
| Sprint 01 | [SCRUM-10](https://wollekragenticboard.atlassian.net/browse/SCRUM-10) | Zu erledigen | `docs/sprints/SPRINT-01-BERICHT.md` |
| Sprint 02 | [SCRUM-7](https://wollekragenticboard.atlassian.net/browse/SCRUM-7) | Zu erledigen | `docs/sprints/SPRINT-02-BERICHT.md` |
| Sprint 03 | [SCRUM-8](https://wollekragenticboard.atlassian.net/browse/SCRUM-8) | Zu erledigen | `docs/sprints/SPRINT-03-BERICHT.md` |
| Sprint 04 | [SCRUM-12](https://wollekragenticboard.atlassian.net/browse/SCRUM-12) | Zu erledigen | `docs/sprints/SPRINT-04-BERICHT.md` |
| Sprint 05 | [SCRUM-9](https://wollekragenticboard.atlassian.net/browse/SCRUM-9) | Zu erledigen | `docs/sprints/SPRINT-05-BERICHT.md` |
| Sprint 06 | [SCRUM-15](https://wollekragenticboard.atlassian.net/browse/SCRUM-15) | Zu erledigen | `docs/sprints/SPRINT-06-BERICHT.md` |
| Sprint 07 | [SCRUM-16](https://wollekragenticboard.atlassian.net/browse/SCRUM-16) | Zu erledigen | `docs/sprints/SPRINT-07-BERICHT.md` |
| Sprint 08 | [SCRUM-11](https://wollekragenticboard.atlassian.net/browse/SCRUM-11) | Zu erledigen | `docs/sprints/SPRINT-08-BERICHT.md` |
| Sprint 09 | [SCRUM-14](https://wollekragenticboard.atlassian.net/browse/SCRUM-14) | Zu erledigen | `docs/sprints/SPRINT-09-BERICHT.md` |
| Sprint 10 | [SCRUM-18](https://wollekragenticboard.atlassian.net/browse/SCRUM-18) | Zu erledigen | `docs/sprints/SPRINT-10-BERICHT.md` |
| Sprint 11 | [SCRUM-17](https://wollekragenticboard.atlassian.net/browse/SCRUM-17) | Zu erledigen | `docs/sprints/SPRINT-11-BERICHT.md` |
| Sprint 12 | [SCRUM-19](https://wollekragenticboard.atlassian.net/browse/SCRUM-19) | Zu erledigen | `docs/sprints/SPRINT-12-BERICHT.md` |
| Sprint 13 | [SCRUM-21](https://wollekragenticboard.atlassian.net/browse/SCRUM-21) | Zu erledigen | `docs/sprints/SPRINT-13-BERICHT.md` |
| Sprint 14 | [SCRUM-20](https://wollekragenticboard.atlassian.net/browse/SCRUM-20) | Zu erledigen | `docs/sprints/SPRINT-14-BERICHT.md` |
| Manueller Test S01 | [SCRUM-27](https://wollekragenticboard.atlassian.net/browse/SCRUM-27) | Zu erledigen | `docs/sprints/SPRINT-01-BERICHT.md` |
| Manueller Test S04 | [SCRUM-29](https://wollekragenticboard.atlassian.net/browse/SCRUM-29) | Zu erledigen | `docs/sprints/SPRINT-04-BERICHT.md` |
| Manueller Test S05 | [SCRUM-22](https://wollekragenticboard.atlassian.net/browse/SCRUM-22) | Zu erledigen | `docs/sprints/SPRINT-05-BERICHT.md` |
| Manueller Test S06 | [SCRUM-24](https://wollekragenticboard.atlassian.net/browse/SCRUM-24) | Zu erledigen | `docs/sprints/SPRINT-06-BERICHT.md` |
| Manueller Test S09 | [SCRUM-25](https://wollekragenticboard.atlassian.net/browse/SCRUM-25) | Zu erledigen | `docs/sprints/SPRINT-09-BERICHT.md` |
| Manueller Test S12 | [SCRUM-23](https://wollekragenticboard.atlassian.net/browse/SCRUM-23) | Zu erledigen | `docs/sprints/SPRINT-12-BERICHT.md` |
| Manueller Test S13 | [SCRUM-26](https://wollekragenticboard.atlassian.net/browse/SCRUM-26) | Zu erledigen | `docs/sprints/SPRINT-13-BERICHT.md` |
| Manueller Test S14 | [SCRUM-28](https://wollekragenticboard.atlassian.net/browse/SCRUM-28) | Zu erledigen | `docs/sprints/SPRINT-14-BERICHT.md` |
| Final Verification | [SCRUM-30](https://wollekragenticboard.atlassian.net/browse/SCRUM-30) | Zu erledigen | `docs/12-TESTPLAN.md` |
