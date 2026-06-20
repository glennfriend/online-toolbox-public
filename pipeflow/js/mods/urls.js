// urls.js — 從內文萃取所有網址(去重,一行一個)。

import { defineMod } from './index.js';

defineMod({
  id: 'extract-urls',
  label: '萃取 urls',
  appliesTo: ['has-urls'],
  run(input) {
    const found = input.match(/https?:\/\/[^\s)<>"']+/g) || [];
    const unique = [...new Set(found)];
    return unique.length ? unique.join('\n') : '(找不到網址)';
  },
});
