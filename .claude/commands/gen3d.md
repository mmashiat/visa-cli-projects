Generate a 3D model from a text description using a two-step workflow:

1. **Generate image** — use `mcp__visa-cli__generate_image` with the user's prompt, `tier: "balanced"`, and `aspect_ratio: "1:1"`. Use a clean white background and make sure the full object is visible. Keep the style grounded (no abstract art) so Trellis can reconstruct a clean mesh.

2. **Convert to 3D** — take the image URL from step 1 and pass it to `mcp__visa-cli__execute_tool` with `tool_id: "fal-trellis-3d"` and `params: { image_url: "<url from step 1>" }`.

3. **Return results** — show both the source image URL and the `.glb` download link. Remind the user they can open the GLB in Blender, Three.js, or a browser viewer like gltf.report or modelviewer.dev.

The user's prompt is: $ARGUMENTS
