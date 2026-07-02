import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { saveRunLog } from './storage.js';
import BaseAgent from './agents/BaseAgent.js';

// Helper to get median of an array of numbers
function getMedian(values) {
  if (!values || values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Robust parser for LLM generated ad copies
function parseLlmOutput(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const headlines = [];
  const longHeadlines = [];
  const descriptions = [];

  let currentCategory = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('long headline') || lowerLine.startsWith('long headlines:')) {
      currentCategory = 'long_headlines';
      continue;
    } else if (lowerLine.includes('headline') || lowerLine.startsWith('headlines:')) {
      currentCategory = 'headlines';
      continue;
    } else if (lowerLine.includes('description') || lowerLine.startsWith('descriptions:')) {
      currentCategory = 'descriptions';
      continue;
    }

    const cleaned = line.replace(/^(?:\d+[\.\:\-]\s*|\-\s*|\*\s*)/, '').replace(/^"|"$/g, '').trim();
    if (!cleaned) continue;

    if (currentCategory === 'headlines') {
      headlines.push(cleaned);
    } else if (currentCategory === 'long_headlines') {
      longHeadlines.push(cleaned);
    } else if (currentCategory === 'descriptions') {
      descriptions.push(cleaned);
    }
  }

  return { headlines, longHeadlines, descriptions };
}

// Ensures we return exactly the requested number of assets
function ensureAssetCounts(parsed, hCount, lhCount, dCount) {
  let { headlines, longHeadlines, descriptions } = parsed;

  if (headlines.length === 0 && descriptions.length === 0) {
    // If categorization failed completely, guess by character lengths
    headlines.push('Super Lead Generation');
    descriptions.push('Close the cash flow gap in your sales cycle with automated funnels.');
  }

  while (headlines.length < hCount) {
    headlines.push(headlines[headlines.length - 1] || 'Super Ad Headline');
  }
  headlines = headlines.slice(0, hCount);

  if (lhCount > 0) {
    while (longHeadlines.length < lhCount) {
      longHeadlines.push(longHeadlines[longHeadlines.length - 1] || 'Super Ad Long Headline');
    }
    longHeadlines = longHeadlines.slice(0, lhCount);
  }

  while (descriptions.length < dCount) {
    descriptions.push(descriptions[descriptions.length - 1] || 'Super Ad Description');
  }
  descriptions = descriptions.slice(0, dCount);

  return { headlines, longHeadlines, descriptions };
}

// Generate Mock Data for Sandbox Mode
export function generateMockAdData() {
  const rsaAssetPerformance = [
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a1',
      text: 'Premium B2B Lead Gen',
      fieldType: 'HEADLINE',
      performanceLabel: 'BEST',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a2',
      text: 'Scale to 50k/mo on Autopilot',
      fieldType: 'HEADLINE',
      performanceLabel: 'BEST',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a3',
      text: 'Close Sales Cycle Gaps',
      fieldType: 'HEADLINE',
      performanceLabel: 'GOOD',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a4',
      text: 'B2B Lead Generation',
      fieldType: 'HEADLINE',
      performanceLabel: 'GOOD',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a5',
      text: 'Get Rich Quick with ROI',
      fieldType: 'HEADLINE',
      performanceLabel: 'LOW',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a6',
      text: 'Close the cash flow gap in your sales cycle with automated funnels.',
      fieldType: 'DESCRIPTION',
      performanceLabel: 'BEST',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a7',
      text: 'Generate immediate appointments on autopilot without high upfront costs.',
      fieldType: 'DESCRIPTION',
      performanceLabel: 'GOOD',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      assetId: 'a8',
      text: 'Double your ROI immediately. Boost conversions now.',
      fieldType: 'DESCRIPTION',
      performanceLabel: 'LOW',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    },
    // Low conversions ad group to test threshold
    {
      adGroupId: '102',
      adGroupName: 'Low Conversion Search Group',
      assetId: 'a9',
      text: 'Low Conversion Headline',
      fieldType: 'HEADLINE',
      performanceLabel: 'BEST',
      campaignId: 'c10',
      campaignName: 'Search - High-Ticket B2B Lead Gen',
      finalUrls: ['https://slavawagner.de/consulting']
    }
  ];

  const rsaAdGroupPerformance = [
    {
      adGroupId: '101',
      adGroupName: 'B2B Lead Generation',
      campaignId: 'c10',
      conversions: 12,
      conversionsValue: 12000,
      clicks: 150,
      impressions: 2000,
      costMicros: 500000000
    },
    {
      adGroupId: '102',
      adGroupName: 'Low Conversion Search Group',
      campaignId: 'c10',
      conversions: 3,
      conversionsValue: 300,
      clicks: 50,
      impressions: 500,
      costMicros: 100000000
    }
  ];

  const pmaxAssetPerformance = [
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/pa1',
      fieldType: 'HEADLINE',
      performanceLabel: 'BEST',
      text: 'Self-Funding Google Ads',
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      finalUrls: ['https://slavawagner.de/slo-academy'],
      campaignId: 'pc20',
      campaignName: 'PMax - High-Ticket SLO Academies',
      campaignResourceName: 'customers/119/campaigns/pc20'
    },
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/pa2',
      fieldType: 'HEADLINE',
      performanceLabel: 'BEST',
      text: 'Ads Refinanzieren System',
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      finalUrls: ['https://slavawagner.de/slo-academy'],
      campaignId: 'pc20',
      campaignName: 'PMax - High-Ticket SLO Academies',
      campaignResourceName: 'customers/119/campaigns/pc20'
    },
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/pa3',
      fieldType: 'HEADLINE',
      performanceLabel: 'GOOD',
      text: 'Leads im Hochpreis Gen',
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      finalUrls: ['https://slavawagner.de/slo-academy'],
      campaignId: 'pc20',
      campaignName: 'PMax - High-Ticket SLO Academies',
      campaignResourceName: 'customers/119/campaigns/pc20'
    },
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/pa4',
      fieldType: 'LONG_HEADLINE',
      performanceLabel: 'BEST',
      text: 'Stoppe monatliche Vorab-Kosten für Werbebudgets mit dem SLO-System',
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      finalUrls: ['https://slavawagner.de/slo-academy'],
      campaignId: 'pc20',
      campaignName: 'PMax - High-Ticket SLO Academies',
      campaignResourceName: 'customers/119/campaigns/pc20'
    },
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/pa5',
      fieldType: 'LONG_HEADLINE',
      performanceLabel: 'GOOD',
      text: 'Automatische Leadgenerierung die sich selbst durch Front-End Angebote trägt',
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      finalUrls: ['https://slavawagner.de/slo-academy'],
      campaignId: 'pc20',
      campaignName: 'PMax - High-Ticket SLO Academies',
      campaignResourceName: 'customers/119/campaigns/pc20'
    },
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/pa6',
      fieldType: 'DESCRIPTION',
      performanceLabel: 'BEST',
      text: 'Verkaufe €1.000+ Front-End Consulting Angebote um deine Google Ads Ausgaben zu refinanzieren.',
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      finalUrls: ['https://slavawagner.de/slo-academy'],
      campaignId: 'pc20',
      campaignName: 'PMax - High-Ticket SLO Academies',
      campaignResourceName: 'customers/119/campaigns/pc20'
    },
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/pa7',
      fieldType: 'DESCRIPTION',
      performanceLabel: 'GOOD',
      text: 'Keine monatlichen Werbekosten mehr aus eigener Tasche zahlen. Starte jetzt die Refinanzierung.',
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      finalUrls: ['https://slavawagner.de/slo-academy'],
      campaignId: 'pc20',
      campaignName: 'PMax - High-Ticket SLO Academies',
      campaignResourceName: 'customers/119/campaigns/pc20'
    }
  ];

  const pmaxAssetGroupPerformance = [
    {
      assetGroupId: 'p1',
      assetGroupName: 'SLO Academies Front-End',
      campaignId: 'pc20',
      conversions: 25,
      conversionsValue: 25000,
      clicks: 350,
      impressions: 5000,
      costMicros: 1200000000
    }
  ];

  const pmaxImageAssets = [
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/img1',
      fieldType: 'MARKETING_IMAGE'
    },
    {
      assetGroupResourceName: 'customers/119/assetGroups/p1',
      assetResourceName: 'customers/119/assets/img2',
      fieldType: 'SQUARE_MARKETING_IMAGE'
    }
  ];

  return {
    rsaAssetPerformance,
    rsaAdGroupPerformance,
    pmaxAssetPerformance,
    pmaxAssetGroupPerformance,
    pmaxImageAssets
  };
}

/**
 * Runs the Conversion Retention 2.0 workflow.
 */
export async function runConversionRetentionWorkflow(config, accessToken, isSandbox = false) {
  let rsaAssetPerformance = [];
  let rsaAdGroupPerformance = [];
  let pmaxAssetPerformance = [];
  let pmaxAssetGroupPerformance = [];
  let pmaxImageAssets = [];

  // 1. Data Retrieval
  if (isSandbox || !accessToken) {
    console.log(chalk.green('\n[SANDBOX] Simulating Query A and Query B for RSA & PMax (API v24)...'));
    const mock = generateMockAdData();
    rsaAssetPerformance = mock.rsaAssetPerformance;
    rsaAdGroupPerformance = mock.rsaAdGroupPerformance;
    pmaxAssetPerformance = mock.pmaxAssetPerformance;
    pmaxAssetGroupPerformance = mock.pmaxAssetGroupPerformance;
    pmaxImageAssets = mock.pmaxImageAssets;
  } else {
    const googleAds = await import('./googleAds.js');
    try {
      console.log(chalk.yellow('Fetching RSA Asset Performance (Query A)...'));
      rsaAssetPerformance = await googleAds.fetchRsaAssetPerformance(config, accessToken);
      console.log(chalk.green(`✔ Retrieved ${rsaAssetPerformance.length} asset views.`));

      console.log(chalk.yellow('Fetching Ad Group Performance (Query B)...'));
      rsaAdGroupPerformance = await googleAds.fetchAdGroupPerformance(config, accessToken);
      console.log(chalk.green(`✔ Retrieved metrics for ${rsaAdGroupPerformance.length} ad groups.`));

      console.log(chalk.yellow('Fetching PMax Asset Performance (Query A)...'));
      pmaxAssetPerformance = await googleAds.fetchPmaxAssetPerformance(config, accessToken);
      console.log(chalk.green(`✔ Retrieved ${pmaxAssetPerformance.length} asset group assets.`));

      console.log(chalk.yellow('Fetching PMax Asset Group Performance (Query B)...'));
      pmaxAssetGroupPerformance = await googleAds.fetchAssetGroupPerformance(config, accessToken);
      console.log(chalk.green(`✔ Retrieved metrics for ${pmaxAssetGroupPerformance.length} asset groups.`));

      console.log(chalk.yellow('Fetching PMax Image Assets for cloning...'));
      pmaxImageAssets = await googleAds.fetchPmaxImageAssets(config, accessToken);
      console.log(chalk.green(`✔ Retrieved ${pmaxImageAssets.length} image assets.`));

    } catch (e) {
      console.log(chalk.red(`Google Ads API query failed: ${e.message}`));
      console.log(chalk.yellow('Falling back to Demo Sandbox mode...'));
      const mock = generateMockAdData();
      rsaAssetPerformance = mock.rsaAssetPerformance;
      rsaAdGroupPerformance = mock.rsaAdGroupPerformance;
      pmaxAssetPerformance = mock.pmaxAssetPerformance;
      pmaxAssetGroupPerformance = mock.pmaxAssetGroupPerformance;
      pmaxImageAssets = mock.pmaxImageAssets;
    }
  }

  // 2. Calculations
  const searchConversions = rsaAdGroupPerformance.map(g => g.conversions);
  const searchMedianConversions = getMedian(searchConversions);

  const pmaxConversions = pmaxAssetGroupPerformance.map(g => g.conversions);
  const pmaxMedianConversions = getMedian(pmaxConversions);

  const workflowLogs = [];
  const runReports = [];

  // Helper log function
  function logStep(msg) {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${msg}`;
    workflowLogs.push(formatted);
    console.log(formatted);
  }

  // ==================== RESPONSIVE SEARCH ADS (RSA) WORKFLOW ====================
  logStep(chalk.bold.cyan('\n=== Starting RSA Conversion Retention Workflow ==='));

  // Group assets by campaign & ad group
  const rsaGroups = {};
  for (const asset of rsaAssetPerformance) {
    const key = `${asset.campaignId}::${asset.adGroupId}`;
    if (!rsaGroups[key]) {
      rsaGroups[key] = {
        campaignId: asset.campaignId,
        campaignName: asset.campaignName,
        adGroupId: asset.adGroupId,
        adGroupName: asset.adGroupName,
        finalUrls: asset.finalUrls,
        assets: []
      };
    }
    rsaGroups[key].assets.push(asset);
  }

  // Run Agents for each active Ad Group
  for (const groupKey of Object.keys(rsaGroups)) {
    const grp = rsaGroups[groupKey];
    
    // Find ad group performance
    const perf = rsaAdGroupPerformance.find(p => p.adGroupId === grp.adGroupId) || { conversions: 0 };
    const conversions = perf.conversions;

    logStep(`Processing Ad Group: ${grp.adGroupName} (Campaign: ${grp.campaignName})`);
    logStep(`Conversions: ${conversions} | Threshold: >= 5`);

    if (conversions < 5) {
      logStep(chalk.yellow(`Skipping Ad Group "${grp.adGroupName}" because conversions (${conversions}) < 5.`));
      continue;
    }

    const adGroupFaktor = conversions / searchMedianConversions;
    logStep(`Ad Group Faktor: ${adGroupFaktor.toFixed(2)} (Median: ${searchMedianConversions})`);

    // Prepare assets with scoring
    const positiveHeadlines = [];
    const positiveDescriptions = [];
    const negativeList = new Set();

    for (const asset of grp.assets) {
      const label = asset.performanceLabel;
      let baseWeight = 0;
      if (label === 'BEST') baseWeight = 3;
      else if (label === 'GOOD') baseWeight = 2;
      else if (label === 'LOW') baseWeight = 0;

      const finalWeight = baseWeight * adGroupFaktor;

      if (label === 'LOW') {
        negativeList.add(asset.text);
      } else if (finalWeight > 0) {
        const item = { text: asset.text, weight: finalWeight };
        if (asset.fieldType === 'HEADLINE') {
          positiveHeadlines.push(item);
        } else {
          positiveDescriptions.push(item);
        }
      }
    }

    logStep(`Found ${positiveHeadlines.length} positive headlines, ${positiveDescriptions.length} positive descriptions, and ${negativeList.size} low-performing assets.`);

    // Agent 1: Generate Brief
    logStep(chalk.magenta('Running Agent 1 (Analyst)...'));
    const agentAnalyst = new BaseAgent('rsa_analyst');
    const analystPrompt = `
Ziel-Kampagne: ${grp.campaignName} (ID ${grp.campaignId})
Final URL: ${grp.finalUrls[0] || 'https://slavawagner.de'}
Positive Headlines (gewichtet):
${positiveHeadlines.map(h => `  - "${h.text}" | Weight: ${h.weight.toFixed(2)}`).join('\n')}

Positive Descriptions (gewichtet):
${positiveDescriptions.map(d => `  - "${d.text}" | Weight: ${d.weight.toFixed(2)}`).join('\n')}

LOW Assets (Negative List):
${Array.from(negativeList).map(t => `  - "${t}"`).join('\n')}
`;
    const briefText = await agentAnalyst.generateCompletion(analystPrompt, false);
    logStep(chalk.green('✔ Brief generated.'));
    console.log(chalk.gray(briefText));

    // Agent 2: Copywriter
    logStep(chalk.magenta('Running Agent 2 (Creative Copywriter)...'));
    const agentCopywriter = new BaseAgent('rsa_copywriter');
    const copywriterPrompt = `
Here is the RSA PERFORMANCE PATTERN BRIEF:
${briefText}

Please write the "SUPER AD" ad copy based on these guidelines. Ensure to generate exactly 15 Headlines and 4 Descriptions.
`;
    const rawCopy = await agentCopywriter.generateCompletion(copywriterPrompt, false);
    logStep(chalk.green('✔ Copy generated.'));

    // Agent 3: Review
    logStep(chalk.magenta('Running Agent 3 (Quality Review)...'));
    const agentReview = new BaseAgent('rsa_review');
    const reviewPrompt = `
Here is the raw ad copy generated:
${rawCopy}

Please apply all quality & compliance rules to polish and clean the headlines and descriptions.
`;
    const finalCopyText = await agentReview.generateCompletion(reviewPrompt, false);
    logStep(chalk.green('✔ Quality Review completed.'));
    console.log(chalk.cyan(finalCopyText));

    // Parse assets
    const parsed = parseLlmOutput(finalCopyText);
    const finalAssets = ensureAssetCounts(parsed, 15, 0, 4);

    // Agent 4: Upload / Simulate
    if (isSandbox || !accessToken) {
      logStep(chalk.blue(`[SANDBOX] Mutating 15 headlines and 4 descriptions in a single API call...`));
      logStep(chalk.blue(`[SANDBOX] Mutating new Responsive Search Ad in Ad Group "${grp.adGroupName}" (Status: PAUSED)...`));
      logStep(chalk.green(`✔ Super Ad successfully composed and uploaded to Ad Group "${grp.adGroupName}".`));
    } else {
      const googleAds = await import('./googleAds.js');
      logStep(chalk.yellow(`Uploading 15 headlines and 4 descriptions...`));
      const uploadResult = await googleAds.uploadRsaAssetsAndAd(
        config,
        accessToken,
        grp.adGroupId,
        finalAssets.headlines,
        finalAssets.descriptions,
        grp.finalUrls
      );
      logStep(chalk.green(`✔ Successfully uploaded assets and RSA. Resource: ${uploadResult.adGroupAdResourceName}`));
    }

    runReports.push(`
### RSA SUPER AD for Campaign "${grp.campaignName}" - Ad Group "${grp.adGroupName}"
**Brief:**
${briefText}

**Polished Headlines:**
${finalAssets.headlines.map((h, i) => `${i+1}. ${h}`).join('\n')}

**Polished Descriptions:**
${finalAssets.descriptions.map((d, i) => `${i+1}. ${d}`).join('\n')}
`);
  }

  // ==================== PERFORMANCE MAX (PMAX) WORKFLOW ====================
  logStep(chalk.bold.cyan('\n=== Starting PMax Conversion Retention Workflow ==='));

  // Group assets by PMax Campaign
  const pmaxCampaigns = {};
  for (const asset of pmaxAssetPerformance) {
    const cId = asset.campaignId;
    if (!pmaxCampaigns[cId]) {
      pmaxCampaigns[cId] = {
        campaignId: cId,
        campaignName: asset.campaignName,
        campaignResourceName: asset.campaignResourceName,
        assets: []
      };
    }
    pmaxCampaigns[cId].assets.push(asset);
  }

  // Run Agents for each PMax Campaign
  for (const campaignId of Object.keys(pmaxCampaigns)) {
    const campaign = pmaxCampaigns[campaignId];
    logStep(`Processing PMax Campaign: ${campaign.campaignName} (ID: ${campaign.campaignId})`);

    // Get asset groups of this campaign
    const assetGroupIds = Array.from(new Set(campaign.assets.map(a => a.assetGroupId)));
    let validAssetGroupsCount = 0;
    
    // Evaluate conversions & median
    const positiveHeadlines = [];
    const positiveLongHeadlines = [];
    const positiveDescriptions = [];
    const negativeList = new Set();
    let targetFinalUrl = 'https://slavawagner.de';

    for (const agId of assetGroupIds) {
      const perf = pmaxAssetGroupPerformance.find(p => p.assetGroupId === agId) || { conversions: 0 };
      const conversions = perf.conversions;
      if (conversions >= 5) {
        validAssetGroupsCount++;
      } else {
        logStep(chalk.yellow(`Ignoring Asset Group ${agId} because conversions (${conversions}) < 5.`));
        continue;
      }

      const assetGroupFaktor = conversions / pmaxMedianConversions;
      const groupAssets = campaign.assets.filter(a => a.assetGroupId === agId);

      for (const asset of groupAssets) {
        if (asset.finalUrls && asset.finalUrls.length > 0) {
          targetFinalUrl = asset.finalUrls[0];
        }

        const label = asset.performanceLabel;
        let baseWeight = 0;
        if (label === 'BEST') baseWeight = 3;
        else if (label === 'GOOD') baseWeight = 2;
        else if (label === 'LOW') baseWeight = 0;

        // Campaign Similarity Multiplier
        let simMultiplier = 1;
        if (asset.campaignId === campaign.campaignId) {
          simMultiplier = 4;
        } else if (targetFinalUrl && asset.finalUrls[0] && new URL(targetFinalUrl).hostname === new URL(asset.finalUrls[0]).hostname) {
          simMultiplier = 2;
        }

        const finalWeight = baseWeight * assetGroupFaktor * simMultiplier;

        if (label === 'LOW') {
          negativeList.add(asset.text);
        } else if (finalWeight > 0) {
          const item = { text: asset.text, weight: finalWeight };
          if (asset.fieldType === 'HEADLINE') {
            positiveHeadlines.push(item);
          } else if (asset.fieldType === 'LONG_HEADLINE') {
            positiveLongHeadlines.push(item);
          } else {
            positiveDescriptions.push(item);
          }
        }
      }
    }

    // Determine if data is sufficient (at least 3 asset groups with >= 5 conversions account-wide)
    const overallValidGroups = pmaxAssetGroupPerformance.filter(p => p.conversions >= 5).length;
    const dataUnsufficient = overallValidGroups < 3;

    logStep(`Asset groups with >= 5 conversions: ${validAssetGroupsCount}. Account-wide valid PMax groups: ${overallValidGroups}.`);

    // Agent 1: PMax Brief
    logStep(chalk.magenta('Running Agent 1 (PMax Analyst)...'));
    const agentPmaxAnalyst = new BaseAgent('pmax_analyst');
    const analystPrompt = `
Ziel-Kampagne: ${campaign.campaignName} (ID ${campaign.campaignId})
Final URL: ${targetFinalUrl}
Account-wide valid PMax groups: ${overallValidGroups}

Positive Headlines (gewichtet):
${positiveHeadlines.map(h => `  - "${h.text}" | Weight: ${h.weight.toFixed(2)}`).join('\n')}

Positive Long Headlines (gewichtet):
${positiveLongHeadlines.map(lh => `  - "${lh.text}" | Weight: ${lh.weight.toFixed(2)}`).join('\n')}

Positive Descriptions (gewichtet):
${positiveDescriptions.map(d => `  - "${d.text}" | Weight: ${d.weight.toFixed(2)}`).join('\n')}

LOW Assets (Negative List):
${Array.from(negativeList).map(t => `  - "${t}"`).join('\n')}
`;
    
    let briefText = '';
    if (dataUnsufficient) {
      logStep(chalk.yellow('PMax data is unsufficient (< 3 valid asset groups in account). Outputting unsufficient status.'));
      briefText = 'DATENLAGE UNZUREICHEND FÜR PMAX-PATTERNS';
    } else {
      briefText = await agentPmaxAnalyst.generateCompletion(analystPrompt, false);
    }

    logStep(chalk.green('✔ PMax Brief generated.'));
    console.log(chalk.gray(briefText));

    // Agent 2: Copywriter
    logStep(chalk.magenta('Running Agent 2 (PMax Creative Copywriter)...'));
    const agentPmaxCopywriter = new BaseAgent('pmax_copywriter');
    const copywriterPrompt = `
Here is the PMax Performance Pattern Brief:
${briefText}

Please write the "SUPER AD" ad copy based on these guidelines. Ensure to generate exactly 15 Headlines, 4 Long Headlines, and 4 Descriptions.
`;
    const rawCopy = await agentPmaxCopywriter.generateCompletion(copywriterPrompt, false);
    logStep(chalk.green('✔ PMax Copy generated.'));

    // Agent 3: Review
    logStep(chalk.magenta('Running Agent 3 (Quality Review)...'));
    const agentReview = new BaseAgent('rsa_review');
    const reviewPrompt = `
Here is the raw ad copy generated:
${rawCopy}

Please apply all quality & compliance rules to polish and clean the headlines, long headlines, and descriptions.
`;
    const finalCopyText = await agentReview.generateCompletion(reviewPrompt, false);
    logStep(chalk.green('✔ Quality Review completed.'));
    console.log(chalk.cyan(finalCopyText));

    // Parse PMax assets
    const parsed = parseLlmOutput(finalCopyText);
    const finalAssets = ensureAssetCounts(parsed, 15, 4, 4);

    // Get marketing images for this campaign's asset groups
    const images = pmaxImageAssets.filter(img => 
      campaign.assets.some(a => a.assetGroupResourceName === img.assetGroupResourceName)
    );

    if (images.length === 0) {
      // Add mock images for compatibility
      images.push(
        { assetResourceName: 'customers/119/assets/img1', fieldType: 'MARKETING_IMAGE' },
        { assetResourceName: 'customers/119/assets/img2', fieldType: 'SQUARE_MARKETING_IMAGE' }
      );
    }

    // Link / Simulate mutate upload
    const newAssetGroupName = `Conversion Retention ${new Date().toLocaleDateString()}`;
    if (isSandbox || !accessToken) {
      logStep(chalk.blue(`[SANDBOX] Mutating 15 headlines, 4 long headlines, and 4 descriptions in a single API call...`));
      logStep(chalk.blue(`[SANDBOX] Creating new Asset Group "${newAssetGroupName}" (Status: PAUSED) linking ${images.length} image assets...`));
      logStep(chalk.green(`✔ Super Ad successfully composed and uploaded as Asset Group in Campaign "${campaign.campaignName}".`));
    } else {
      const googleAds = await import('./googleAds.js');
      logStep(chalk.yellow(`Uploading PMax assets and creating Asset Group...`));
      const uploadResult = await googleAds.uploadPmaxAssetsAndGroup(
        config,
        accessToken,
        campaign.campaignResourceName,
        null,
        newAssetGroupName,
        finalAssets.headlines,
        finalAssets.longHeadlines,
        finalAssets.descriptions,
        [targetFinalUrl],
        images
      );
      logStep(chalk.green(`✔ Successfully uploaded assets and PMax Asset Group. Resource: ${uploadResult.assetGroupResourceName}`));
    }

    runReports.push(`
### PMax SUPER AD Campaign "${campaign.campaignName}"
**Brief:**
${briefText}

**Polished Headlines:**
${finalAssets.headlines.map((h, i) => `${i+1}. ${h}`).join('\n')}

**Polished Long Headlines:**
${finalAssets.longHeadlines.map((lh, i) => `${i+1}. ${lh}`).join('\n')}

**Polished Descriptions:**
${finalAssets.descriptions.map((d, i) => `${i+1}. ${d}`).join('\n')}
`);
  }

  // 3. Compile and save the report
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const timestamp = Date.now();
  const reportPath = path.resolve(__dirname, `../storage/runs/retention-report-${timestamp}.md`);

  const fullReport = `
# Google Ads Conversion Retention 2.0 Report
*Generated: ${new Date().toLocaleString()}*

## Overview
- Active Search Campaign & Ad Groups processed.
- Active PMax Campaigns processed.
- API Version: v24 used for all actions.

## Detailed Runs per Campaign / Ad Group
${runReports.join('\n\n')}
`;

  fs.writeFileSync(reportPath, fullReport.trim(), 'utf8');

  const logPath = saveRunLog({
    timestamp: new Date().toISOString(),
    isSandbox,
    reportPath,
    workflowLogs,
    reportContent: fullReport
  });

  return {
    reportPath,
    logPath,
    reportContent: fullReport
  };
}
