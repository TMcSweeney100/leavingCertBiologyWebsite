import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_ROUTE_NAMES, isAppEnabled } from './routes.ts';
import { CLASS_SLUGS } from '../classes/index.ts';

describe('APP_ROUTE_NAMES', () => {
  test('no public class slug collides with an app route', () => {
    const reserved = new Set<string>(APP_ROUTE_NAMES);
    const collisions = CLASS_SLUGS.filter((slug) => reserved.has(slug));
    assert.deepEqual(collisions, []);
  });

  test('names are unique, lowercase path segments', () => {
    assert.equal(new Set(APP_ROUTE_NAMES).size, APP_ROUTE_NAMES.length);
    for (const name of APP_ROUTE_NAMES) assert.match(name, /^[a-z]+$/);
  });

  test('claims every top-level name the roadmap page inventory uses', () => {
    for (const name of ['api', 'login', 'join', 'reset', 'account', 'home', 'components', 'teach', 'school']) {
      assert.ok((APP_ROUTE_NAMES as readonly string[]).includes(name), name);
    }
  });
});

describe('isAppEnabled', () => {
  test('only the exact string "true" enables the app', () => {
    assert.equal(isAppEnabled({ APP_ENABLED: 'true' }), true);
    for (const value of [undefined, '', 'false', 'TRUE', '1', 'yes']) {
      assert.equal(isAppEnabled({ APP_ENABLED: value }), false, String(value));
    }
  });
});
