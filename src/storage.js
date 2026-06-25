import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../storage');
const AGENTS_DIR = path.resolve(STORAGE_DIR, 'agents');
const RUNS_DIR = path.resolve(STORAGE_DIR, 'runs');

const DEFAULT_AGENTS = {
  retention_agent: {
    name: 'retention_agent',
    role: 'Google Ads Conversion Retention & Recombination Analyst',
    description: 'Scores ad assets (headlines/descriptions) from Search & PMax campaigns and builds high-converting SUPER AD combinations.',
    systemPrompt: `You are the Google Ads Conversion Retention & Recombination Analyst.
Your task is to analyze historical Search campaign and Performance Max campaign ad text assets, rate each individual headline/description with ultra-conservative scores, map the results, and design the absolute "SUPER ADS".

You must grade each headline and description on a scale from 0.00 to 1.00 (0% to 100%) against these 5 metrics:
1. Conversion Score (Cs): The realistic probability of prompting a click that leads to a conversion.
2. Audience Score (As): How precisely the copywriting matches the intent and profile of the target audience on the final landing page URL.
3. Sentiment Score (Ss): The emotional resonance of the copy (closer to 1.0 means highly positive and encouraging, while closer to 0.0 means negative or fear-based, neutral is 0.50).
4. Hook Score (Hs): The strength of the asset's initial attention-grabbing mechanism (first 3 seconds / reading impact).
5. Tension Curve Score (Ts): The structural adherence to the Problem-Agitate-Solve (PAS) copy framework (does it build tension and offer a clear resolution?).

Your Core Tasks:
- Generate a structured Markdown analysis mapping the metrics and scores for each asset.
- Identify the Conversion Retention "Sweet Spot" (the common patterns among the best-performing assets).
- Recombine and fuse the highest-scoring components into at least 3 distinct "SUPER ADS" proposals (optimized Responsive Search Ads and Performance Max text assets configurations) with expected conversion yields.
- Ensure the language matches the source asset language (e.g. if ads are in German, write proposal text in German).`,
    skills: ['LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  }
};

export function initStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }

  for (const [name, config] of Object.entries(DEFAULT_AGENTS)) {
    const filePath = path.join(AGENTS_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    }
  }
}

export function listAgents() {
  initStorage();
  const files = fs.readdirSync(AGENTS_DIR).filter(file => file.endsWith('.json'));
  return files.map(file => {
    const data = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    return JSON.parse(data);
  });
}

export function getAgent(name) {
  initStorage();
  const filePath = path.join(AGENTS_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

export function saveAgent(name, config) {
  initStorage();
  const filePath = path.join(AGENTS_DIR, `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving agent ${name}:`, error.message);
    return false;
  }
}

export function saveRunLog(runLog) {
  initStorage();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(RUNS_DIR, `run-${timestamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify(runLog, null, 2), 'utf8');
  return logPath;
}
