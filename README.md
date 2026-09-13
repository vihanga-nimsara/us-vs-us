# Us vs. Us 💘

A cute couple scoreboard for murky household debates. Baby-bear arguments, stolen snacks, who apologised first — now with a winner.

Inspired by the romantic energy of [willyb-my-valentine](https://willyb-my-valentine.vercel.app/): Chewy typeface, candy-pink accents (#FF2D55), and sticker-style buttons.

## Features

- **Silly categories out of the box** — Arguments won, Snacks stolen, Apologised first, Plans cancelled
- **Track something new** — add custom categories with an emoji icon
- **Per-player identity** — pink for you, blue for bae; each keeps their own counter
- **Live champion banner** — who's leading, crowned and glowing
- **Confetti** on lead changes and `sonner` toasts on every bump
- **Undo last** and **Clear everything**
- **Renamable players** — tap a name to edit
- Fits on one screen with no scrolling; responsive and reduced-motion friendly

## Stack

- Vite + React
- Tailwind CSS v4, shadcn/ui, [Kibo UI](https://refinedev.kibo-ui.vercel.app/) Dialog Stack, sonner
- Local storage persistence (swap in `window.storage` for a real backend)

## Getting started

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Structure

- `couple-scoreboard.jsx` — the whole app (component + design system in `STYLES`)
- `src/` — Vite entry, Tailwind/shadcn theme, UI components

## License

MIT