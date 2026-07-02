import chalk from 'chalk';
import { getAgent, listAgents, initStorage } from './storage.js';
import { generateMockAdData } from './retentionOptimizer.js';

initStorage();

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(chalk.green(`  ✔ PASSED: ${message}`));
    passedTests++;
  } else {
    console.log(chalk.red(`  ✖ FAILED: ${message}`));
    failedTests++;
  }
}

async function runTests() {
  console.log(chalk.bold.cyan('\n=== Run local verification tests ===\n'));

  // Test 1: Stored Agent Configuration Loader
  try {
    console.log(chalk.yellow('Test 1: Agent Loader and Config Storage...'));
    const agents = listAgents();
    assert(agents.length >= 5, `Expected at least 5 default agents, found ${agents.length}`);
    
    const rsaAnalyst = getAgent('rsa_analyst');
    assert(rsaAnalyst !== null, 'Should be able to load rsa_analyst config profile');
    assert(rsaAnalyst.name === 'rsa_analyst', `Expected agent name "rsa_analyst", got "${rsaAnalyst?.name}"`);
    assert(rsaAnalyst.skills.includes('LLMGenerateSkill'), 'RSA Analyst should have LLMGenerateSkill');
  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: Agent Loader error: ${err.message}`));
    failedTests++;
  }

  // Test 2: Mock Ads Generator Schema
  try {
    console.log(chalk.yellow('\nTest 2: Mock Ads Data Generator...'));
    const mock = generateMockAdData();
    assert(mock.rsaAssetPerformance.length > 0, 'Should generate mock RSA asset performance rows');
    assert(mock.rsaAdGroupPerformance.length > 0, 'Should generate mock RSA ad group performance rows');
    assert(mock.pmaxAssetPerformance.length > 0, 'Should generate mock PMax asset performance rows');
    assert(mock.pmaxAssetGroupPerformance.length > 0, 'Should generate mock PMax asset group performance rows');
    
    const sampleAd = mock.rsaAssetPerformance[0];
    assert(sampleAd.text.length > 0, 'Mock RSA asset text should not be empty');
    assert(sampleAd.fieldType === 'HEADLINE' || sampleAd.fieldType === 'DESCRIPTION', 'Mock RSA field type should be valid');
    assert(sampleAd.finalUrls.length > 0, 'Mock RSA should contain final URLs');
    
    const samplePerf = mock.rsaAdGroupPerformance[0];
    assert(samplePerf.conversions >= 0, 'Mock RSA ad group conversions should be valid');
  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: Mock generator test error: ${err.message}`));
    failedTests++;
  }

  // Summary
  console.log(chalk.bold.cyan('\n=== Test Summary ==='));
  console.log(chalk.bold.green(`Passed: ${passedTests}`));
  if (failedTests > 0) {
    console.log(chalk.bold.red(`Failed: ${failedTests}`));
    process.exit(1);
  } else {
    console.log(chalk.bold.green('All tests passed successfully!'));
    process.exit(0);
  }
}

runTests();
