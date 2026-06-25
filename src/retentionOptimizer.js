import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { saveRunLog } from './storage.js';
import ConversionRetentionAgent from './agents/ConversionRetentionAgent.js';

// Helper to generate mock ads in case connection is unconfigured
export function generateMockAdData() {
  const rsaAds = [
    {
      id: '11002233',
      campaignId: '998877',
      campaignName: 'Premium Lead Gen - Search',
      headlines: [
        'Premium Lead Generation',
        'Scale from €5k to €50k/mo',
        'Stop Sales Cycle Gaps',
        'Refinance Your Google Ads',
        '185-Day Sales Cycle Solution',
        'Automated Refinancing Funnel',
        'High-Ticket B2B Lead Gen'
      ],
      descriptions: [
        'Close the cash flow gap in your sales cycle with front-end SLOs.',
        'Generate immediate upfront revenues to fund monthly Google Ads spends.',
        'Get highly qualified sales appointments on autopilot.'
      ],
      finalUrls: ['https://slavawagner.de/ads-funnel'],
      metrics: { conversions: 28, clicks: 420, impressions: 6800 }
    }
  ];

  const pmaxAssets = [
    {
      id: '201',
      campaignId: '665544',
      campaignName: 'PMax - SLO Academies',
      assetGroupName: 'SLO Front-End',
      fieldType: 'HEADLINE',
      performanceLabel: 'BEST',
      text: 'Self-Funding Google Ads'
    },
    {
      id: '202',
      campaignId: '665544',
      campaignName: 'PMax - SLO Academies',
      assetGroupName: 'SLO Front-End',
      fieldType: 'HEADLINE',
      performanceLabel: 'BEST',
      text: 'Ads Refinanzieren System'
    },
    {
      id: '203',
      campaignId: '665544',
      campaignName: 'PMax - SLO Academies',
      assetGroupName: 'SLO Front-End',
      fieldType: 'HEADLINE',
      performanceLabel: 'GOOD',
      text: 'Leads im Hochpreis Gen'
    },
    {
      id: '204',
      campaignId: '665544',
      campaignName: 'PMax - SLO Academies',
      assetGroupName: 'SLO Front-End',
      fieldType: 'DESCRIPTION',
      performanceLabel: 'BEST',
      text: 'Generate €1,000+ front-end consulting offers to self-liquidate Google Ads budgets.'
    },
    {
      id: '205',
      campaignId: '665544',
      campaignName: 'PMax - SLO Academies',
      assetGroupName: 'SLO Front-End',
      fieldType: 'DESCRIPTION',
      performanceLabel: 'GOOD',
      text: 'Stop laying out huge monthly ad spends. Implement self-funding lead generation today.'
    }
  ];

  return { rsaAds, pmaxAssets };
}

/**
 * Runs the conversion retention analysis and SUPER AD recombination workflow.
 * @param {object} config - Configuration settings
 * @param {string} accessToken - Access Token (if connected)
 * @param {boolean} isSandbox - Forcing mock data sandbox
 * @returns {Promise<object>} Markdown report and output paths
 */
export async function runConversionRetentionWorkflow(config, accessToken, isSandbox = false) {
  let rsaAds = [];
  let pmaxAssets = [];

  if (isSandbox || !accessToken) {
    console.log(chalk.green('\n[SANDBOX] Generating mock campaign ad copies and Performance Max assets...'));
    const mock = generateMockAdData();
    rsaAds = mock.rsaAds;
    pmaxAssets = mock.pmaxAssets;
  } else {
    // Attempt live fetches
    const { fetchSearchCampaignAds, fetchPMaxCampaignAssets } = await import('./googleAds.js');
    try {
      console.log(chalk.yellow('Fetching Responsive Search Ads (RSAs)...'));
      rsaAds = await fetchSearchCampaignAds(config, accessToken);
      console.log(chalk.green(`✔ Retrieved ${rsaAds.length} active RSAs.`));
      
      console.log(chalk.yellow('Fetching Performance Max text assets...'));
      pmaxAssets = await fetchPMaxCampaignAssets(config, accessToken);
      console.log(chalk.green(`✔ Retrieved ${pmaxAssets.length} active PMax text assets.`));

      if (rsaAds.length === 0 && pmaxAssets.length === 0) {
        console.log(chalk.yellow('No enabled ad assets found in your Google Ads account. Falling back to Demo Sandbox...'));
        const mock = generateMockAdData();
        rsaAds = mock.rsaAds;
        pmaxAssets = mock.pmaxAssets;
      }
    } catch (e) {
      console.log(chalk.red(`Google Ads API query failed: ${e.message}`));
      console.log(chalk.yellow('Falling back to Demo Sandbox mode...'));
      const mock = generateMockAdData();
      rsaAds = mock.rsaAds;
      pmaxAssets = mock.pmaxAssets;
    }
  }

  // Run scoring agent
  console.log(chalk.yellow('\nLoading Conversion Retention Agent...'));
  const agent = new ConversionRetentionAgent();

  console.log(chalk.cyan('\nEvaluating asset conversion parameters & PAS tension curves...'));
  const analysisReport = await agent.optimizeAssets(rsaAds, pmaxAssets);

  // Save report and run logs
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const timestamp = Date.now();
  const reportPath = path.resolve(__dirname, `../storage/runs/retention-report-${timestamp}.md`);

  const fullReport = `
# Google Ads Conversion Retention & Recombination Report
*Generated: ${new Date().toLocaleString()}*

## 1. Analyzed campaign scope
- Responsive Search Ads (RSAs): ${rsaAds.length}
- PMax Text Assets: ${pmaxAssets.length}

## 2. Retention Analysis Report
${analysisReport}
`;

  fs.writeFileSync(reportPath, fullReport.trim(), 'utf8');

  const logPath = saveRunLog({
    timestamp: new Date().toISOString(),
    isSandbox,
    reportPath,
    rsaCount: rsaAds.length,
    pmaxCount: pmaxAssets.length,
    analysisReport
  });

  return {
    reportPath,
    logPath,
    reportContent: analysisReport
  };
}
