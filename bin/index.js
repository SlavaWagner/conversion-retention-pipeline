#!/usr/bin/env node

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import http from 'http';
import { URL, fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { getConfig, saveConfig, getAccessToken, refreshAccessToken } from '../src/config.js';
import { listAgents, getAgent, saveAgent, saveRunLog, initStorage } from '../src/storage.js';
import { runConversionRetentionWorkflow } from '../src/retentionOptimizer.js';

// Initialize storage folders and default agent configurations
initStorage();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate the ASCII funnel logo
function getAsciiLogo() {
  const cyan = chalk.hex('#06b6d4');
  const blue = chalk.hex('#3b82f6');
  
  return [
    '',
    cyan("  ╔═══╗      ╔═══╗      ╔═══╗      ╔═══╗"),
    cyan("  ║   ╠══════╣   ╠══════╣   ╠══════╣   ╠══════>  ") + blue("conversion-retention-pipeline"),
    cyan("  ╚═══╝      ╚═══╝      ╚═══╝      ╚═══╝         ") + blue("============================="),
    blue("                                                 Recombine & Optimize Google Ads Assets"),
    '',
    chalk.bold.cyan('=== conversion-retention-pipeline - Sweet Spot Asset Optimizer ==='),
    chalk.blue('Querying active RSAs & PMax Text Assets (API v24) and fusing SUPER ADS'),
    chalk.gray('Created via Google Antigravity CLI'),
    ''
  ].join('\n');
}

const program = new Command();

program
  .name('conversion-retention-pipeline')
  .description('Google Ads Conversion Retention & Recombination CLI')
  .version('1.0.0');

program.addHelpText('before', getAsciiLogo());

// SETUP Command
program
  .command('setup')
  .description('Setup Google Ads API Credentials and Authorize OAuth2')
  .action(async () => {
    console.log(chalk.bold.cyan('\n=== Google Ads Credentials Setup ===\n'));

    const current = getConfig();

    try {
      const customerId = await input({
        message: 'Google Ads Customer ID (10-digit, e.g. 123-456-7890):',
        default: current.customerId
      });

      const clientId = await input({
        message: 'Google Ads Client ID (OAuth):',
        default: current.clientId
      });

      const clientSecret = await input({
        message: 'Google Ads Client Secret:',
        default: current.clientSecret
      });

      const developerToken = await input({
        message: 'Google Ads Developer Token:',
        default: current.developerToken
      });

      const loginCustomerId = await input({
        message: 'Manager Login Customer ID (Optional, press enter to skip):',
        default: current.loginCustomerId || ''
      });

      // Save initial variables first
      const updatedConfig = {
        ...current,
        customerId,
        clientId,
        clientSecret,
        developerToken,
        loginCustomerId
      };
      saveConfig(updatedConfig);

      console.log(chalk.yellow('\nStarting OAuth2 Authorization Server...'));

      const redirectUri = 'http://localhost:8085';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;

      console.log(chalk.green('\nPlease open the following link in your web browser to authorize access:\n'));
      console.log(chalk.underline.blue(authUrl));
      console.log(chalk.gray('\nWaiting for authorization on port 8085 (timeout in 3 minutes)...'));

      let oauthCode = '';

      const getAuthCodePromise = new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
          try {
            const urlObj = new URL(req.url, 'http://localhost:8085');
            const code = urlObj.searchParams.get('code');
            if (code) {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end('<h1>Authentication successful!</h1><p>You can close this tab now and return to your CLI terminal.</p>');
              resolve(code);
            } else {
              res.writeHead(400);
              res.end('Authentication failed: No code found in URL parameters.');
              reject(new Error('No code received.'));
            }
          } catch (err) {
            reject(err);
          } finally {
            server.close();
          }
        });

        server.setTimeout(180000);
        server.on('timeout', () => {
          server.close();
          reject(new Error('OAuth timeout after 3 minutes.'));
        });

        server.listen(8085, (err) => {
          if (err) reject(err);
        });
      });

      try {
        oauthCode = await getAuthCodePromise;
        console.log(chalk.green('✔ Authorization code successfully received!'));
      } catch (authError) {
        console.log(chalk.red(`\nAutomatic redirect failed: ${authError.message}`));
        console.log(chalk.cyan('To enter the code manually, open the URL in your browser, copy the "code" parameter from the redirect URL, and paste it here:'));
        oauthCode = await input({ message: 'Enter authorization code manually:' });
      }

      if (!oauthCode) {
        throw new Error('No authorization code provided.');
      }

      console.log(chalk.yellow('Exchanging code for Refresh Token...'));

      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code: oauthCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      const finalConfig = getConfig();
      finalConfig.accessToken = access_token;
      if (refresh_token) {
        finalConfig.refreshToken = refresh_token;
      }
      finalConfig.tokenExpiry = Date.now() + (expires_in - 300) * 1000;

      saveConfig(finalConfig);

      console.log(chalk.bold.green('\n✔ Setup completed successfully! Credentials saved.'));
      console.log(chalk.green(`OAuth2 Access Token acquired, valid until: ${new Date(finalConfig.tokenExpiry).toLocaleTimeString()}\n`));

    } catch (error) {
      console.error(chalk.bold.red('\n✖ Setup failed:'), error.response ? JSON.stringify(error.response.data) : error.message);
    }
  });

// RUN WORKFLOW Command
program
  .command('run-workflow')
  .description('Run conversion retention analysis, score assets, and design SUPER ADS')
  .option('-s, --sandbox', 'Force Sandbox mode with simulated campaigns data')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n=== Run Conversion Retention Pipeline ===\n'));

    const config = getConfig();
    let isSandbox = !!options.sandbox;
    let accessToken = null;

    if (!isSandbox) {
      if (!config.refreshToken) {
        console.log(chalk.yellow('Google Ads credentials not configured. Running in Demo Sandbox mode...'));
        isSandbox = true;
      } else {
        try {
          console.log(chalk.yellow('Verifying Google Ads Connection...'));
          accessToken = await getAccessToken();
          console.log(chalk.green('✔ Connection authenticated.'));
        } catch (e) {
          console.log(chalk.yellow(`Connection failed: ${e.message}. Proceeding in Demo Sandbox mode.`));
          isSandbox = true;
        }
      }
    }

    try {
      const results = await runConversionRetentionWorkflow(config, accessToken, isSandbox);

      console.log(chalk.bold.green('\n=== Optimization Analysis Report ===\n'));
      console.log(results.reportContent);
      console.log(chalk.bold.green('====================================\n'));

      console.log(chalk.green(`✔ Detailed Markdown report compiled and saved to:\n  ${results.reportPath}`));
      console.log(chalk.green(`✔ Persistent run execution log saved to:\n  ${results.logPath}\n`));

    } catch (err) {
      console.error(chalk.bold.red('\n✖ Workflow failed:'), err.message);
    }
  });

// AGENT CLI Commands
const agentCmd = program.command('agent').description('Manage persistent agent settings');

agentCmd
  .command('list')
  .description('List registered AI Agents')
  .action(() => {
    console.log(chalk.bold.cyan('\n=== Registered AI Agents ===\n'));
    const agents = listAgents();
    agents.forEach(agent => {
      console.log(chalk.bold.green(`Agent:      ${agent.name}`));
      console.log(`Role:       ${agent.role}`);
      console.log(`Model:      ${agent.model}`);
      console.log(`Summary:    ${agent.description}`);
      console.log(chalk.gray('---------------------------------------------'));
    });
  });

agentCmd
  .command('view <name>')
  .description('View prompt settings for an agent')
  .action((name) => {
    const agent = getAgent(name);
    if (!agent) {
      console.log(chalk.red(`Agent "${name}" not found.`));
      return;
    }
    console.log(chalk.bold.cyan(`\n=== Agent Profile: ${agent.name} ===\n`));
    console.log(chalk.bold.green(`Role:`) + ` ${agent.role}`);
    console.log(chalk.bold.green(`Model:`) + ` ${agent.model}`);
    console.log(chalk.bold.green(`System Prompt:`));
    console.log(chalk.gray(agent.systemPrompt));
    console.log();
  });

// Interactive Dashboard Menu
async function showInteractiveDashboard() {
  console.clear();
  console.log(getAsciiLogo());

  const config = getConfig();
  console.log(chalk.bold.cyan('--- Environment Status ---'));
  console.log(`Google Ads Customer ID:  ${chalk.green(config.customerId || 'Not configured')}`);
  console.log(`Connection Status:       ${config.refreshToken ? chalk.green('Authorized ✔') : chalk.yellow('Unconfigured (Will use sandbox mode) ⚠')}`);
  console.log(`Active Agents:           ${chalk.magenta('rsa_analyst, rsa_copywriter, rsa_review, pmax_analyst, pmax_copywriter')}`);
  console.log(chalk.gray('---------------------------\n'));

  const choice = await select({
    message: 'Select action to execute:',
    choices: [
      { name: '1. Run Conversion Retention Analysis (run-workflow)', value: 'run-workflow' },
      { name: '2. Setup Google Ads API Connection (setup)', value: 'setup' },
      { name: '3. List Registered AI Agents', value: 'list-agents' },
      { name: '4. Exit', value: 'exit' }
    ]
  });

  if (choice === 'run-workflow') {
    await program.commands.find(c => c.name() === 'run-workflow').parseAsync(['node', 'index.js', 'run-workflow']);
    await pressEnterToContinue();
  } else if (choice === 'setup') {
    await program.commands.find(c => c.name() === 'setup').parseAsync(['node', 'index.js', 'setup']);
    await pressEnterToContinue();
  } else if (choice === 'list-agents') {
    console.log(chalk.bold.cyan('\n=== Stored Agents ===\n'));
    listAgents().forEach(agent => {
      console.log(chalk.bold.green(`Agent:      ${agent.name}`));
      console.log(`Role:       ${agent.role}`);
      console.log(`Model:      ${agent.model}`);
      console.log(`Summary:    ${agent.description}`);
      console.log(chalk.gray('---------------------------------------------'));
    });
    await pressEnterToContinue();
  } else {
    console.log(chalk.cyan('Goodbye!'));
    process.exit(0);
  }

  await showInteractiveDashboard();
}

async function pressEnterToContinue() {
  await input({ message: '\nPress Enter to return to Dashboard...' });
}

// DASHBOARD Command
program
  .command('dashboard')
  .description('Start the terminal-based interactive dashboard startup window')
  .action(async () => {
    await showInteractiveDashboard();
  });

// Parse commands
program.parse(process.argv);

// Default to dashboard if no arguments passed
if (!process.argv.slice(2).length) {
  showInteractiveDashboard();
}
