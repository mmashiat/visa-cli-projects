# visa-cli-projects

A collection of Claude Code slash commands for [Visa CLI](https://auth.visacli.sh) — AI image, music, video, and 3D generation via payments.

## Setup

Clone this repo and open it in Claude Code. All commands in `.claude/commands/` are automatically available as slash commands.

```bash
git clone https://github.com/mmashiat/visa-cli-projects
cd visa-cli-projects
```

## Commands

### `/gen3d <description>`

Generates a 3D model from a text description using a two-step workflow:
1. Generates an image with FLUX Pro (balanced, $0.04)
2. Converts it to a `.glb` 3D model using Trellis 3D ($0.08)

**Examples:**
```
/gen3d a low poly statue of liberty at sunset
/gen3d a futuristic sports car on a white background
/gen3d a medieval castle tower, stone texture
```

**Output:** Source image URL + downloadable `.glb` file (open in Blender, Three.js, or [gltf.report](https://gltf.report))

## Apps

### `lootbox/` — AI Loot Box

A web app where you pick a category and get a surprise AI-generated bundle: scene image + soundtrack + 3D model — all powered by Visa CLI micropayments (~$0.26/box).

**Categories:** Space, Fantasy, Ocean, Cyberpunk, Nature, Ancient World, Dark Horror, Anime

```bash
cd lootbox
npm install
node server.js
# Open http://localhost:3000
```

## Requirements

- [Claude Code](https://claude.ai/code)
- [Visa CLI](https://auth.visacli.sh) account with a linked card
- Node.js 18+ (for the lootbox app)
