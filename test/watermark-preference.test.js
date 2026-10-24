import test from 'node:test';
import assert from 'node:assert/strict';
import { isWatermarkEnabled, watermarkDisabledKey } from '../src/project.js';

test('new visitors have a watermark; saved opt-out disables it', () => {
  assert.equal(isWatermarkEnabled({ getItem: () => null }), true);
  assert.equal(isWatermarkEnabled({ getItem: key => key === watermarkDisabledKey ? '1' : null }), false);
  assert.equal(isWatermarkEnabled({ getItem: () => '0' }), true);
});

test('blocked storage keeps watermark enabled without throwing', () => {
  assert.equal(isWatermarkEnabled({ getItem: () => { throw new Error('blocked'); } }), true);
});
