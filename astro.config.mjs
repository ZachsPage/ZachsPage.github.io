// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import expressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
    site: 'https://zachspage.github.io',
    integrations: [expressiveCode(), mdx()],
});
