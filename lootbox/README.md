# 🎁 AI Loot Box

A web app that generates a surprise AI bundle when you pick a category. Each box contains three items — a scene image, a soundtrack, and a 3D model — all generated live via [Visa CLI](https://auth.visacli.sh) micropayments.

## How it works

1. **Pick a category** from 8 options (Space, Fantasy, Ocean, Cyberpunk, Nature, Ancient World, Dark Horror, Anime)
2. **Open the box** — a random theme is selected within your category
3. Three assets generate in parallel via the Visa CLI MCP server:
   - 🖼️ **Scene image** — FLUX Pro balanced ($0.04)
   - 🎵 **Soundtrack** — Suno v4 with vocals ($0.10)
   - 🧊 **3D model** — FLUX image → Trellis 3D conversion ($0.04 + $0.08)
4. **Staggered reveal** — assets appear one by one with animations
5. Total cost per box: **~$0.26**

## Architecture

```
lootbox/
├── server.js          # Node.js + Express backend
├── public/
│   └── index.html     # Single-file frontend (vanilla JS)
└── package.json
```

**Backend (`server.js`):**
- Spawns the Visa CLI MCP server as a child process via `@modelcontextprotocol/sdk`
- Calls `generate_image`, `generate_music`, and `execute_tool` (Trellis 3D) directly
- `POST /api/lootbox { category }` → returns all URLs + theme name

**Frontend (`public/index.html`):**
- Category grid → loading state with progress steps → staggered reveal
- No framework, no build step — pure HTML/CSS/JS

## Setup

**Requirements:**
- Node.js 18+
- [Visa CLI](https://auth.visacli.sh) installed and authenticated
- Visa CLI MCP server at `/opt/homebrew/lib/node_modules/@visa/cli/dist/mcp-server/index.js`

```bash
npm install
node server.js
# Open http://localhost:3000
```

## Categories & Themes

| Category | Emoji | Example Themes |
|----------|-------|----------------|
| Space / Sci-Fi | 🌌 | Nebula Station, Mars Colony, Alien Outpost |
| Fantasy | 🐉 | Dragon Lair, Crystal Citadel, Enchanted Forest |
| Deep Ocean | 🌊 | Bioluminescent Abyss, Sunken City, Kraken Territory |
| Cyberpunk | 🏙️ | Neon Tokyo, Chrome District, Underground Market |
| Nature | 🌿 | Ancient Rainforest, Volcanic Island, Arctic Tundra |
| Ancient World | 🏛️ | Egyptian Pyramid, Mayan Temple, Greek Oracle |
| Dark Horror | 🎭 | Haunted Mansion, Shadow Realm, Eldritch Depths |
| Anime / Japanese | 🌸 | Sakura Shrine, Mecha Battle, Spirit Forest |

## Extending it

- **Add categories** — add a new key to the `CATEGORIES` object in `server.js` with `emoji`, `name`, `themes`, `imagePrompt`, `musicPrompt`, and `objectPrompt`
- **Change image tier** — swap `'balanced'` to `'pro'` in the `generate_image` calls for higher quality ($0.06 vs $0.04)
- **Add video** — call `generate_video` after the image step and add a `<video>` element to the reveal
