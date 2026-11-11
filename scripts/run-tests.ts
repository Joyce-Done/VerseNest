import assert from 'node:assert/strict';
import { runPhase1VerificationSuite } from '../src/tests';
import { WebLocalStorageAdapter, VerseNestStorage, InMemoryStorageAdapter, STORAGE_KEY } from '../src/storage';
const results = await runPhase1VerificationSuite();
for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.title}: ${result.message}`);
assert.ok(results.length > 0);
assert.equal(results.filter(result => !result.passed).length, 0, 'Existing verification suite failed');

// Never report a save as successful if device storage rejected it.
Object.assign(globalThis, { window: { localStorage: { setItem() { throw new Error('QuotaExceededError'); } } } });
await assert.rejects(new WebLocalStorageAdapter().setItem('key', 'value'), /could not save/);
delete (globalThis as any).window;
const adapter = new InMemoryStorageAdapter();
await adapter.setItem(STORAGE_KEY, '{broken');
await assert.rejects(new VerseNestStorage(adapter).loadDatabase(), /could not be opened/);
assert.equal(await adapter.getItem(STORAGE_KEY), '{broken', 'Corrupt data must remain available for recovery');
console.log(`PASS ${results.length} existing checks plus storage failure and recovery guards`);
