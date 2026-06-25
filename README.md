# conversion-retention-pipeline: Google Ads Conversion Retention & Recombination CLI

`conversion-retention-pipeline` is a persistent AI agent CLI tool designed to find the **Sweet Spot** in conversion retention. By querying active Responsive Search Ads (RSAs) and Performance Max (PMax) campaign text assets, it assigns ultra-conservative scores, maps the results, and recombines the highest-performing assets to fuse the absolute "SUPER ADS".

All model execution runs locally inside your CLI using the **Antigravity Agent Bridge**, removing any dependency on an external Gemini API key.

---

## Key Features & Agent Architecture

This CLI integrates a specialized persistent AI agent:

* **Google Ads Conversion Retention & Recombination Analyst (`retention_agent`)**:
  - Scores ad texts (headlines and descriptions) on a scale from 0.00 to 1.00 (0% to 100%) against 5 key metrics:
    1. **Conversion Score**: Realistic conversion probability.
    2. **Audience Score**: Copywriting fit with target URL audience.
    3. **Sentiment Score**: Emotional tone of the copy.
    4. **Hook Score**: Reading impact and click hook.
    5. **Tension Curve Score**: Structural adherence to the Problem-Agitate-Solve (PAS) formula.
  - Maps scores in a structured markdown table.
  - Identifies performance sweet spots.
  - Fuses and recombines best assets into "SUPER ADS" combinations with expected yield metrics.

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: Ensure Node.js (v18+) is installed.
- **Google Ads API Credentials**: Setup a Google Cloud project with the Google Ads API enabled and configure OAuth2 credentials. Set your redirect URI to: `http://localhost:8085`.

### 2. Clone & Install Dependencies
Install all package dependencies from the npm registry:
```bash
cd conversion-retention-pipeline
npm install
```
*Note: This project does not embed copy-pasted third-party client libraries. It fetches verified packages dynamically from npm to ensure full licensing compliance.*

### 3. Setup Credentials
Run the credentials setup tool:
```bash
node bin/index.js setup
```
Enter your Client ID, Client Secret, Customer ID, and Developer Token. The setup tool will open a web browser to complete Google Ads OAuth2 consent.

---

## Command Reference

You can invoke commands directly or start the interactive CLI dashboard:

* **Interactive Terminal Dashboard**:
  ```bash
  node bin/index.js dashboard
  ```
  *(Launches the beautiful interactive start screen in your terminal. You can navigate, run the analysis, or inspect agent settings using your arrow keys).*

* **Run Conversion Retention Analysis**:
  ```bash
  node bin/index.js run-workflow
  ```
  - Connects to Google Ads API (v24) to retrieve enabled RSAs and Performance Max text assets (headlines, descriptions, and performance labels).
  - Performs scoring and fusions, saving the Markdown report and run logs to the `storage/runs/` folder.

* **List AI Agents**:
  ```bash
  node bin/index.js agent list
  ```

* **Verify Installation**:
  ```bash
  npm test
  ```
  Runs automated storage verification and mock ad structures validation tests.

---

This AI Agent was created with the help of Google Antigravity CLI
