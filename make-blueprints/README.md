# Make.com Blueprints: Conversion Retention AI Agents (Gemini)

Dieses Verzeichnis enthält vorkonfigurierte **Make.com Blueprints** (Szenarien), mit denen du die Conversion-Retention-Workflows für Google Ads vollautomatisch über Make AI Agents mit Google Gemini ausführen kannst.

---

## Enthaltene Blueprints

### 1. `AIP SWA Conversion Retention RSA.blueprint.json`
* **Fokus**: Responsive Search Ads (RSAs)
* **Funktion**:
  * Abfrage der historischen Performance-Daten aktiver RSAs via Google Ads API
  * Performance-gewichtete Bewertung (Median-Conversions, Conversion-Threshold, Asset-Weights)
  * Automatisierte Extraktion erfolgreicher Conversion-Muster (High-Converting Angles)
  * Prompting des **Gemini AI Agents** zur Rekombination und Erstellung neuer Super-RSA-Assets (15 Headlines, 4 Descriptions)
  * Strukturierte Aufbereitung und Vorbereitung für die Google Ads Bereitstellung

### 2. `AIP SWA - Conversion Retention Agent PMax Asset Groups.blueprint.json`
* **Fokus**: Performance Max (PMax) Asset Groups
* **Funktion**:
  * Tiefenanalyse komplexer PMax Asset Groups inklusive Kampagnen- und Domain-Ähnlichkeitsgewichtung (Similarity Weighting)
  * Signalfilterung und Identifikation von Top-Performing Headlines, Long Headlines und Descriptions
  * Multimodaler **Gemini AI Copywriter Agent** zur Generierung optimierter PMax Asset Groups (15 Headlines, 4 Long Headlines, 4 Descriptions)
  * Automatische Einhaltung aller Zeichenbegrenzungen und Compliance-Richtlinien

---

## Import-Anleitung in Make.com

1. **Neues Szenario erstellen**:
   * Öffne deinen Arbeitsbereich in [Make.com](https://www.make.com/).
   * Klicke oben rechts auf **Create a new scenario**.

2. **Blueprint importieren**:
   * Klicke in der unteren Menüleiste auf die drei Punkte (`...` / *More options*).
   * Wähle **Import Blueprint**.
   * Wähle die gewünschte Blueprint-Datei aus diesem Ordner aus:
     * für RSAs: `AIP SWA Conversion Retention RSA.blueprint.json`
     * für PMax: `AIP SWA - Conversion Retention Agent PMax Asset Groups.blueprint.json`

3. **Verbindungen & Parameter konfigurieren**:
   * **Variablen anpassen**: Im ersten Modul (*Set Variables*) deine `email`, `customer_id`, `Project` und `URL` eintragen.
   * **Google Ads Verbindung**: Authentifiziere deinen Google Ads Account bzw. dein MCC in den entsprechenden Google Ads Modulen.
   * **Gemini AI Verbindung**: Hinterlege deinen Google AI Studio / Gemini API Key in den LLM-Modulen.

4. **Testlauf & Aktivierung**:
   * Klicke auf **Run once**, um einen Testdurchlauf zu starten und die generierten Assets zu prüfen.
   * Richte bei Bedarf einen Zeitplan (Scheduling) ein, um die Conversion Retention regelmäßig automatisiert durchzuführen.
