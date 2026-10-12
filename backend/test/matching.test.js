import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMatch } from '../utils/matching.js';
import { normalizeSkill, validateSkillName } from '../utils/skills.js';

test('mutual match is 100%', () => {
  const m = computeMatch({ teach: ['Python'], learn: ['Java'] }, { teach: ['Java'], learn: ['Python'] });
  assert.equal(m.percentage, 100);
  assert.equal(m.type, 'mutual');
  assert.deepEqual(m.youCanLearn, ['Java']);
  assert.deepEqual(m.theyCanLearn, ['Python']);
});

test('works with arbitrary skills and ignores case/spacing', () => {
  const m = computeMatch({ teach: ['video  editing'], learn: ['GRAPHIC DESIGN'] }, { teach: [' Graphic Design '], learn: ['Video Editing'] });
  assert.equal(m.percentage, 100);
});

test('one-sided overlap is partial and capped at 50%', () => {
  const m = computeMatch({ teach: ['Excel'], learn: ['Java'] }, { teach: ['Java'], learn: ['Photography'] });
  assert.equal(m.type, 'partial');
  assert.equal(m.percentage, 50);
});

test('no overlap is 0%', () => {
  assert.equal(computeMatch({ teach: ['A'], learn: ['B'] }, { teach: ['C'], learn: ['D'] }).percentage, 0);
});

test('skill validation', () => {
  assert.equal(normalizeSkill('  PyThOn '), 'python');
  assert.equal(validateSkillName('C++').ok, true);
  assert.equal(validateSkillName('   ').ok, false);
  assert.equal(validateSkillName('<script>').ok, false);
});
