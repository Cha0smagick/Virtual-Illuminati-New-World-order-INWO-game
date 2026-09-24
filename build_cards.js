#!/usr/bin/env node
'use strict';

// Compatibility entry point. The canonical card generator is gen_cards.js.
console.warn('[deprecated] build_cards.js delegates to gen_cards.js; use npm run build:cards.');
require('./gen_cards.js');
