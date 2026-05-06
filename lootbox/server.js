import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const MCP_SERVER = '/opt/homebrew/lib/node_modules/@visa/cli/dist/mcp-server/index.js';

const CATEGORIES = {
  space: {
    emoji: '🌌',
    name: 'Space / Sci-Fi',
    themes: ['Nebula Station', 'Mars Colony', 'Deep Space Explorer', 'Alien Outpost'],
    imagePrompt: t => `${t} cinematic space sci-fi scene, dramatic cosmic lighting, detailed, vivid colors`,
    musicPrompt: t => `Cinematic space sci-fi soundtrack, ${t}, ethereal synths, cosmic atmosphere, epic orchestral`,
    objectPrompt: t => `Futuristic spacecraft inspired by ${t}, clean white background, full object visible, detailed`,
  },
  fantasy: {
    emoji: '🐉',
    name: 'Fantasy',
    themes: ['Dragon Lair', 'Enchanted Forest', 'Crystal Citadel', 'Ancient Grimoire'],
    imagePrompt: t => `${t} epic fantasy scene, magical atmosphere, detailed illustration, vibrant`,
    musicPrompt: t => `Epic fantasy orchestral music, ${t}, mystical, heroic, sweeping strings and horns`,
    objectPrompt: t => `Fantasy artifact or creature from ${t}, clean white background, full object visible`,
  },
  ocean: {
    emoji: '🌊',
    name: 'Deep Ocean',
    themes: ['Bioluminescent Abyss', 'Coral Kingdom', 'Sunken City', 'Kraken Territory'],
    imagePrompt: t => `${t} underwater scene, bioluminescent lighting, mysterious deep sea, cinematic`,
    musicPrompt: t => `Ambient underwater music, ${t}, deep bass, flowing, mysterious ocean sounds`,
    objectPrompt: t => `Sea creature or underwater artifact from ${t}, clean white background, full object visible`,
  },
  cyberpunk: {
    emoji: '🏙️',
    name: 'Cyberpunk',
    themes: ['Neon Tokyo', 'Chrome District', 'Underground Market', 'Corporate Spire'],
    imagePrompt: t => `${t} cyberpunk city scene, neon lights, rain-soaked streets, cinematic, ultra-detailed`,
    musicPrompt: t => `Cyberpunk synthwave music, ${t}, dark electronic, pulsing bass, neon atmosphere`,
    objectPrompt: t => `Cyberpunk gadget or vehicle from ${t}, clean white background, full object visible`,
  },
  nature: {
    emoji: '🌿',
    name: 'Nature',
    themes: ['Ancient Rainforest', 'Volcanic Island', 'Arctic Tundra', 'Cherry Blossom Valley'],
    imagePrompt: t => `${t} stunning nature landscape, golden hour lighting, photorealistic, breathtaking`,
    musicPrompt: t => `Peaceful nature ambient music, ${t}, organic sounds, serene, flowing`,
    objectPrompt: t => `Exotic plant or animal from ${t}, clean white background, full object visible`,
  },
  ancient: {
    emoji: '🏛️',
    name: 'Ancient World',
    themes: ['Egyptian Pyramid', 'Roman Colosseum', 'Mayan Temple', 'Greek Oracle'],
    imagePrompt: t => `${t} ancient civilization scene, epic scale, dramatic lighting, historically detailed`,
    musicPrompt: t => `Ancient world epic music, ${t}, tribal drums, orchestral, mystical chants`,
    objectPrompt: t => `Ancient artifact or structure from ${t}, clean white background, full object visible`,
  },
  horror: {
    emoji: '🎭',
    name: 'Dark Horror',
    themes: ['Haunted Mansion', 'Cursed Graveyard', 'Shadow Realm', 'Eldritch Depths'],
    imagePrompt: t => `${t} dark horror scene, eerie atmosphere, dramatic shadows, unsettling, cinematic`,
    musicPrompt: t => `Dark horror atmospheric music, ${t}, ominous strings, tense, unsettling drones`,
    objectPrompt: t => `Creepy artifact or creature from ${t}, clean white background, full object visible`,
  },
  anime: {
    emoji: '🌸',
    name: 'Anime / Japanese',
    themes: ['Sakura Shrine', 'Mecha Battle', 'Spirit Forest', 'Feudal Castle'],
    imagePrompt: t => `${t} beautiful anime art style, vibrant colors, detailed, Studio Ghibli inspired`,
    musicPrompt: t => `Japanese anime soundtrack, ${t}, J-pop orchestral, emotional, piano and strings`,
    objectPrompt: t => `Anime character or iconic object from ${t}, clean white background, full object visible`,
  },
};

async function callMcpTool(toolName, args) {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [MCP_SERVER],
  });
  const client = new Client({ name: 'lootbox-app', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    return result;
  } finally {
    await client.close();
  }
}

function parseToolResult(result) {
  if (!result?.content) return null;
  for (const item of result.content) {
    if (item.type === 'text') {
      try { return JSON.parse(item.text); } catch { return item.text; }
    }
  }
  return null;
}

app.post('/api/lootbox', async (req, res) => {
  const { category } = req.body;
  const cat = CATEGORIES[category];
  if (!cat) return res.status(400).json({ error: 'Invalid category' });

  const theme = cat.themes[Math.floor(Math.random() * cat.themes.length)];
  const userContext = `Loot box: ${cat.name} - ${theme}`;

  try {
    // Step 1: generate image
    const imageResult = await callMcpTool('generate_image', {
      prompt: cat.imagePrompt(theme),
      tier: 'balanced',
      aspect_ratio: '16:9',
      user_context: userContext,
    });
    const imageData = parseToolResult(imageResult);
    const imageUrl = imageData?.urls?.[0] || imageData?.data?.imageUrl;

    // Step 2: generate music
    const musicResult = await callMcpTool('generate_music', {
      prompt: cat.musicPrompt(theme),
      instrumental: false,
      user_context: userContext,
    });
    const musicData = parseToolResult(musicResult);
    const musicUrl = musicData?.urls?.[0];

    // Step 3: generate 3D object image then convert
    const objImageResult = await callMcpTool('generate_image', {
      prompt: cat.objectPrompt(theme),
      tier: 'balanced',
      aspect_ratio: '1:1',
      user_context: userContext,
    });
    const objImageData = parseToolResult(objImageResult);
    const objImageUrl = objImageData?.urls?.[0] || objImageData?.data?.imageUrl;

    const model3dResult = await callMcpTool('execute_tool', {
      tool_id: 'fal-trellis-3d',
      params: { image_url: objImageUrl },
      user_context: userContext,
    });
    const model3dData = parseToolResult(model3dResult);
    const modelUrl = model3dData?.urls?.[0] || model3dData?.data?.glbUrl;

    res.json({
      theme,
      category: cat.name,
      emoji: cat.emoji,
      imageUrl,
      musicUrl,
      objImageUrl,
      modelUrl,
      totalCost: 0.26,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Loot Box app running at http://localhost:3000'));
