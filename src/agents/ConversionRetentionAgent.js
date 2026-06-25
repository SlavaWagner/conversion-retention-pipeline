import BaseAgent from './BaseAgent.js';

export default class ConversionRetentionAgent extends BaseAgent {
  constructor() {
    super('retention_agent');
  }

  /**
   * Run the scoring and recombination workflow.
   * @param {Array<object>} rsaAds - Historical search ads
   * @param {Array<object>} pmaxAssets - Historical Performance Max assets
   * @returns {Promise<string>} Detailed scoring, sweet spot mapping, and SUPER AD proposals
   */
  async optimizeAssets(rsaAds, pmaxAssets) {
    // Format RSA Ads
    const rsaSummary = rsaAds.map((ad, idx) => {
      return `Ad #${idx + 1} (Campaign: ${ad.campaignName}, Conversions: ${ad.metrics.conversions}, Clicks: ${ad.metrics.clicks})
Headlines:
${ad.headlines.map(h => `  - "${h}"`).join('\n')}
Descriptions:
${ad.descriptions.map(d => `  - "${d}"`).join('\n')}
Landing Page URL: ${ad.finalUrls[0] || 'N/A'}`;
    }).join('\n\n');

    // Format PMax Assets
    const pmaxSummary = pmaxAssets.map((asset, idx) => {
      return `Asset #${idx + 1} (Campaign: ${asset.campaignName}, Group: ${asset.assetGroupName})
Type: ${asset.fieldType}
Label: ${asset.performanceLabel}
Text: "${asset.text}"`;
    }).join('\n');

    const userPrompt = `
You are analyzing ad copywriting from active Google Ads campaigns.

Responsive Search Ads (RSA):
=============================
${rsaSummary}

Performance Max (PMax) Text Assets:
=============================
${pmaxSummary}

Please execute your Optimization tasks:

1. ASSET SCORE MAPPING:
   For EACH unique headline and description from the assets above, generate a score profile with the following ultra-conservative scores (0.00 to 1.00):
   - Conversion Score (Cs)
   - Audience Score (As)
   - Sentiment Score (Ss)
   - Hook Score (Hs)
   - Tension Curve Score (Ts)
   Provide these scores in a structured Markdown Table (Columns: Asset Text, Type, Cs, As, Ss, Hs, Ts, Avg Score). Group headlines and descriptions separately.

2. CONVERSION RETENTION SWEET SPOT:
   Analyze the common factors among the highest-scoring assets. Do they address specific pain points? Do they follow a clear PAS tension curve structure?

3. SUPER ADS RECOMBINATION:
   Design at least 3 distinct "SUPER ADS" combinations (RSAs or PMax text asset configurations) that fuse the absolute best elements:
   - Provide a title for each proposal.
   - List 5 headlines and 2 descriptions for each proposal, showing the calculated average Avg Score for each asset used.
   - Explain why this combination represents a Conversion Retention Sweet Spot.

Write the entire report in executive English. Do not add introductory chit-chat.
`;

    return await this.generateCompletion(userPrompt, false);
  }
}
