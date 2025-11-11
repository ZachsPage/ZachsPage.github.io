# Description
Uses Github's hosting for my personal landing page, [click here!](https://zachspage.github.io/)

## Migration to Astro 

### Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

### [Folder Structure](https://docs.astro.build/en/basics/project-structure/)

- `public` - unprocessed resources - accessible through `href="/..."`
- `src`
  - `pages` - top level pages