import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('Dirty Dozen structural security assertions on firestore.rules', () => {
  // 1. Default deny safety net
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  // 2. Email verified check enforced for writes
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  // 3. No blanket list on users PII
  assert.match(rulesContent, /match \/users\/\{userId\}[\s\S]*allow list: if false;/);
  // 4. Strict key allowlisting on every entity
  assert.match(rulesContent, /data\.keys\(\)\.hasAll\(/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly\(/);
  // 5. Master gate parent check on subcollections
  assert.match(rulesContent, /hasValidParentUser\(userId\)/);
  // 6. ID poisoning and size guards
  assert.match(rulesContent, /isValidId\(/);
  assert.match(rulesContent, /data\.habitIds\.size\(\) <= 50/);
  // 7. Temporal integrity (request.time)
  assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
  // 8. Query enforcer on list rules (no blanket isSignedIn list)
  assert.match(rulesContent, /allow list: if isSignedIn\(\) && isOwner\(userId\) && existing\(\)\.ownerId == request\.auth\.uid;/);
  // 9. Planner subcollections & validation helpers present
  assert.match(rulesContent, /function isValidPlannerTask\(data, taskId\)/);
  assert.match(rulesContent, /function isValidTimeBlock\(data, blockId\)/);
  assert.match(rulesContent, /function isValidCalendarSync\(data\)/);
  assert.match(rulesContent, /match \/tasks\/\{taskId\}/);
  assert.match(rulesContent, /match \/timeBlocks\/\{blockId\}/);
  assert.match(rulesContent, /match \/syncState\/\{syncId\}/);
});
