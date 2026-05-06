import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import AdmZip from 'adm-zip';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const MCP_SERVER = '/opt/homebrew/lib/node_modules/@visa/cli/dist/mcp-server/index.js';
const anthropic = new Anthropic();

// ─── Category definitions ────────────────────────────────────────────────────

const CATEGORIES = {
  fashion:  { label: 'Fashion / Apparel',      icon: '👗', keywords: ['Minimal', 'Luxury', 'Streetwear', 'Vintage', 'Bold'], scene: 'couture fashion editorial, model in architectural space', lifestyle: 'street style in urban setting', texture: 'woven fabric detail, thread close-up', mood: 'slow cinematic piano, subtle bass, fashion week atmosphere' },
  beauty:   { label: 'Beauty / Wellness',       icon: '✨', keywords: ['Clean', 'Ethereal', 'Clinical', 'Lush', 'Radiant'],  scene: 'beauty product flatlay, dewy skin close-up, studio light', lifestyle: 'morning skincare routine, soft bathroom light', texture: 'cream swirl, pearl shimmer, soft gradients', mood: 'soft ambient, delicate bell tones, spa tranquility' },
  foodbev:  { label: 'Food & Bev',              icon: '🍽️', keywords: ['Artisan', 'Fresh', 'Indulgent', 'Earthy', 'Vibrant'], scene: 'restaurant hero shot, styled food photography, overhead', lifestyle: 'friends sharing a meal at a sunlit rooftop', texture: 'ingredient overhead pattern, spices and herbs earthy tones', mood: 'warm acoustic guitar, light jazz, upbeat bistro feel' },
  techsaas: { label: 'Tech / SaaS',             icon: '💻', keywords: ['Sleek', 'Futuristic', 'Minimal', 'Bold', 'Human'],   scene: 'clean modern desk setup, glowing UI on screen, product mockup', lifestyle: 'remote worker in a bright modern cafe on laptop', texture: 'geometric grid, hexagonal pattern, dark background with light nodes', mood: 'minimal electronic, subtle arpeggios, focused productivity' },
  music:    { label: 'Music / Entertainment',   icon: '🎵', keywords: ['Raw', 'Dreamy', 'Hype', 'Underground', 'Iconic'],    scene: 'concert stage with dramatic spotlights, performer silhouette', lifestyle: 'backstage candid moment, fans in an electric crowd', texture: 'vinyl record macro close-up, audio waveform visualization', mood: 'lo-fi hip hop, vinyl crackle, late night chill beat' },
  crypto:   { label: 'Crypto / Web3',           icon: '⛓️', keywords: ['Cyber', 'Decentralized', 'Neon', 'Minimal', 'Bold'], scene: 'dark server room, glowing blockchain nodes, digital grid', lifestyle: 'crypto trader at multiple glowing screens, night city backdrop', texture: 'circuit board macro, hexagonal grid, dark background neon glow', mood: 'dark synth, pulsing bass, digital underground atmosphere' },
  fitness:  { label: 'Fitness / Health',         icon: '💪', keywords: ['Gritty', 'Clean', 'Athletic', 'Zen', 'Powerful'],   scene: 'athlete in powerful motion, dramatic gym environment, golden hour', lifestyle: 'outdoor workout at sunrise, yoga in nature', texture: 'athletic fabric close-up, carbon fiber texture, muscle definition macro', mood: 'driving electronic, punchy drums, motivational high energy' },
  creative: { label: 'Creative / Agency',        icon: '🎨', keywords: ['Avant-Garde', 'Playful', 'Refined', 'Experimental', 'Bold'], scene: 'design studio interior, large format prints on white wall', lifestyle: 'creative team brainstorming, sketchbooks and laptops scattered', texture: 'paint strokes macro, paper grain, ink splatter abstract', mood: 'eclectic indie, playful keys, artsy studio vibes' },
};

// ─── MCP client ──────────────────────────────────────────────────────────────

async function callMcpTool(toolName, args) {
  const transport = new StdioClientTransport({ command: 'node', args: [MCP_SERVER] });
  const client = new Client({ name: 'moodboard-app', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  try {
    return await client.callTool({ name: toolName, arguments: args });
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

function extractUrl(result) {
  const data = parseToolResult(result);
  return data?.urls?.[0] ?? data?.data?.imageUrl ?? data?.data?.audioUrl ?? data?.url ?? null;
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

function heroPrompt(cat, vibe, brand) {
  return `${brand} brand campaign, ${vibe} aesthetic, ${cat.scene}, editorial photography, cinematic lighting, ultra detailed, atmospheric, professional`;
}

function lifestylePrompt(cat, vibe, brand) {
  return `${brand} brand lifestyle, ${vibe} style, ${cat.lifestyle}, candid photography, natural light, authentic, aspirational`;
}

function texturePrompt(cat, vibe, brand) {
  return `Abstract brand texture for ${brand}, ${vibe} visual language, ${cat.texture}, seamless pattern, macro photography, brand identity material`;
}

function musicPrompt(cat, vibe) {
  return `Brand soundtrack, ${vibe} ${cat.label} business, ${cat.mood}, no lyrics, ambient background music, professional, loop-friendly`;
}

function sitePrompt({ cat, keywords, brandName, heroUrl, lifestyleUrl, textureUrl, colors }) {
  const vibe = keywords.join(', ');
  const colorVars = colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n');
  return `You are an expert web designer and frontend developer. Generate a complete, single-file HTML landing page for the following brand. Return ONLY the raw HTML — no markdown, no code fences, no explanation. The file must be self-contained with all CSS in a <style> tag and all JS in a <script> tag.

BRAND BRIEF
-----------
Brand Name: ${brandName || 'Unnamed Brand'}
Category: ${cat.label}
Aesthetic Keywords: ${vibe}

ASSETS (use these exact URLs as src values)
-----------
Hero Image (16:9, full-width): ${heroUrl}
Lifestyle Image (4:3): ${lifestyleUrl}
Texture / Pattern Image (1:1): ${textureUrl}

BRAND COLOR PALETTE
-----------
:root {
${colorVars}
}
Primary: ${colors[0]}
Accent: ${colors[1] || colors[0]}

REQUIRED SECTIONS (in this order)
-----------
1. NAV — sticky nav bar with brand name left, 3-4 nav links right
2. HERO — full-viewport hero, heroUrl as background image with overlay, brand name as H1, punchy tagline, CTA button using accent color
3. ABOUT — 2-3 sentence brand story matching the ${vibe} aesthetic, lifestyleUrl as side image
4. FEATURES — 3 feature cards or product highlights relevant to ${cat.label}, textureUrl as subtle card accent
5. CTA — bold call-to-action section, email input + button, contrasting background using brand colors
6. FOOTER — brand name, nav links, social icon placeholders (SVG inline)

TECHNICAL REQUIREMENTS
-----------
- Fully responsive, mobile-first, no external dependencies or CDN links
- One Google Font via @import (single weight only)
- CSS custom properties for all brand colors
- Smooth scroll behavior
- Fade-in on scroll using IntersectionObserver
- All images: loading="lazy", descriptive alt text
- The design must feel professionally crafted and match the ${vibe} aesthetic — in spacing, typography, color, and composition
- Output starts with <!DOCTYPE html>`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post('/api/moodboard', async (req, res) => {
  const { category, keywords, brandName } = req.body;
  const cat = CATEGORIES[category];
  if (!cat || !keywords?.length) return res.status(400).json({ error: 'Invalid request' });

  const vibe = keywords.join(', ');
  const brand = brandName?.trim() || 'the brand';
  const userCtx = `Brand Moodboard: ${cat.label} — ${vibe}${brandName ? ' — ' + brandName : ''}`;

  try {
    const [heroResult, lifestyleResult, textureResult, musicResult] = await Promise.all([
      callMcpTool('generate_image', { prompt: heroPrompt(cat, vibe, brand), tier: 'balanced', aspect_ratio: '16:9', user_context: userCtx }),
      callMcpTool('generate_image', { prompt: lifestylePrompt(cat, vibe, brand), tier: 'balanced', aspect_ratio: '4:3', user_context: userCtx }),
      callMcpTool('generate_image', { prompt: texturePrompt(cat, vibe, brand), tier: 'balanced', aspect_ratio: '1:1', user_context: userCtx }),
      callMcpTool('generate_music', { prompt: musicPrompt(cat, vibe), instrumental: true, user_context: userCtx }),
    ]);

    res.json({
      heroUrl: extractUrl(heroResult),
      lifestyleUrl: extractUrl(lifestyleResult),
      textureUrl: extractUrl(textureResult),
      musicUrl: extractUrl(musicResult),
      category: cat.label,
      icon: cat.icon,
      brandName: brandName?.trim() || '',
      keywords,
      totalCost: 0.22,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/buildsite', async (req, res) => {
  const { category, keywords, brandName, heroUrl, lifestyleUrl, textureUrl, colors } = req.body;
  const cat = CATEGORIES[category];
  if (!cat) return res.status(400).json({ error: 'Invalid category' });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: sitePrompt({ cat, keywords, brandName, heroUrl, lifestyleUrl, textureUrl, colors }) }],
    });

    const html = message.content[0].text;
    res.json({ html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deploy', async (req, res) => {
  const { html, brandName } = req.body;
  const token = process.env.NETLIFY_TOKEN;
  if (!token) return res.status(400).json({ error: 'NETLIFY_TOKEN not set' });
  if (!html) return res.status(400).json({ error: 'No HTML provided' });

  try {
    // Create zip with index.html
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from(html, 'utf8'));
    const zipBuffer = zip.toBuffer();

    // Create a new Netlify site
    const slug = (brandName || 'my-brand').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${slug}-${Date.now()}` }),
    });
    const site = await siteRes.json();
    if (!site.id) throw new Error(site.message || 'Failed to create Netlify site');

    // Deploy the zip
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/zip' },
      body: zipBuffer,
    });
    const deploy = await deployRes.json();
    const url = deploy.deploy_url || deploy.url || site.url;
    if (!url) throw new Error(deploy.message || 'Deploy failed');

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3002, () => console.log('Moodboard app running at http://localhost:3002'));
