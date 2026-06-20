// json.js — JSON 美化(縮排)與縮成一行。

import { defineMod } from './index.js';

defineMod({
  id: 'json-pretty',
  label: 'JSON 美化',
  appliesTo: ['json'],
  run(input) { return JSON.stringify(JSON.parse(input), null, 2); },
});

defineMod({
  id: 'json-minify',
  label: 'JSON 縮成一行',
  appliesTo: ['json'],
  run(input) { return JSON.stringify(JSON.parse(input)); },
});
