# Lizenzen und Übernahmeregeln

## Grundsatz

Private Nutzung hebt Urheberrecht und Lizenzbedingungen nicht auf. Sie kann
aber die Pflichten mancher Open-Source-Lizenzen beeinflussen: Die GNU GPL
erlaubt beispielsweise private Änderungen, ohne sie veröffentlichen zu müssen.
Bei einer späteren Weitergabe gelten zusätzliche Pflichten.

Das ist eine technische Arbeitsregel und keine Rechtsberatung.

## Keine LightBurn-Codeübernahme

- keine Binäranalyse zur Umgehung von Schutzmechanismen,
- keine kopierten Icons, Texte, Assets oder proprietären Quellteile,
- keine nachgebaute Lizenzaktivierung,
- öffentlich dokumentierte Funktionen und GRBL-Kompatibilität dürfen als
  Anforderungen für eine eigenständige Implementierung dienen.

## Lizenzklassen

### Permissiv: bevorzugt

- MIT
- BSD
- Apache-2.0
- Boost Software License 1.0

Üblicherweise sind Verwendung und Änderung möglich, wenn Copyright- und
Lizenzhinweise erhalten bleiben. Apache-2.0 enthält zusätzliche Patentregeln.

### Copyleft: bewusst entscheiden

- GPLv2/GPLv3
- AGPLv3

Direkte Codeübernahme oder enge Kombination kann die Lizenz des Gesamtwerks
beeinflussen. Bei privater, nicht weitergegebener Nutzung verlangt die GPL laut
GNU-FAQ keine Veröffentlichung der Änderungen. Wird AtomBurn jemals geteilt,
müssen die Bedingungen erneut vollständig geprüft werden. AGPL umfasst
zusätzlich bestimmte Netzwerkbereitstellungen.

### Eigene/mehrteilige Lizenz

Bibliotheken wie ImageSharp besitzen eine eigene Split-Lizenz. Vor Verwendung
muss die konkrete Version und der private Einsatz geprüft werden.

## Importprozess

Vor jeder Übernahme von Code, Assets oder Dokumentation:

1. Offizielle Repository- oder Originalquelle bestätigen.
2. Exakten Commit, Release oder Abrufzeitpunkt festhalten.
3. Lizenz- und Urheberrechtshinweise prüfen.
4. Herkunft, verwendete Dateien, Änderungen und Zweck dokumentieren.
5. Transitive und native Abhängigkeiten prüfen.
6. `THIRD_PARTY_NOTICES.md` aktualisieren.
7. Sicherheits-, Lizenz- und Funktionstests hinzufügen.

Ungeprüfte Upstream-Checkouts gehören nicht in dieses Repository. Für reine
Referenzen wird ausschließlich `docs/REFERENCES.md` verwendet.

## Keine Lizenzdatei

Öffentlich sichtbarer Quellcode ohne Lizenz ist nicht automatisch frei
wiederverwendbar. Solche Projekte dürfen als Produktbeispiel betrachtet, aber
nicht kopiert werden.

## AtomBurn-Lizenz

ATOMburn wird unter der MIT-Lizenz in der Root-Datei `LICENSE` veröffentlicht.
Das gilt nur für eigenes AtomBurn-Material. Drittanbieter-Code und Assets bleiben
unter ihren jeweiligen Lizenzen und werden in `THIRD_PARTY_NOTICES.md` genannt.

## Quellen

- [GNU GPL FAQ: private Modifikationen](https://www.gnu.org/licenses/gpl-faq.en.html)
- [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html)
- Lizenzdateien der jeweiligen Projekte im [Open-Source-Verzeichnis](07-OPEN-SOURCE-PROJEKTE.md)
