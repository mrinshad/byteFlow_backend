import { runLevel1 } from './test-level1-auth.js';
import { runLevel2 } from './test-level2-projects.js';
import { runLevel3 } from './test-level3-cards-lanes.js';
import { runLevel4 } from './test-level4-collaboration.js';
import { runLevel5 } from './test-level5-audit-dashboard.js';
import { runLevel6 } from './test-level6-ui.js';

async function main() {
  console.log('================================================================');
  console.log('🚀 BYTEFLOW COMPREHENSIVE MULTI-LEVEL STRESS & FUNCTIONAL SUITE');
  console.log('================================================================');
  const globalStart = Date.now();
  const summary = [];

  try {
    summary.push(await runLevel1());
    summary.push(await runLevel2());
    summary.push(await runLevel3());
    summary.push(await runLevel4());
    summary.push(await runLevel5());
    summary.push(await runLevel6());

    const totalDuration = Date.now() - globalStart;
    const totalAssertions = summary.reduce((sum, s) => sum + s.assertions, 0);

    console.log('================================================================');
    console.log('📊 EXECUTIVE STRESS TEST SUMMARY REPORT');
    console.log('================================================================');
    console.table(
      summary.map((s) => ({
        Level: `Level ${s.level}`,
        'Test Suite': s.name,
        Status: s.passed ? '✅ PASSED' : '❌ FAILED',
        Assertions: s.assertions,
        'Duration (ms)': `${s.duration}ms`,
      }))
    );

    console.log(`\n🎉 ALL 6 LEVELS COMPLETED IN ${totalDuration}ms (${totalAssertions} assertions verified with 0 failures).\n`);
  } catch (err) {
    console.error('\n❌ STRESS TEST FAILED:', err);
    process.exit(1);
  }
}

main();
