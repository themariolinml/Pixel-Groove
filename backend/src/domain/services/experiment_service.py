import json
import logging
from typing import Dict, List

from ...core.utils.id_generator import generate_id
from ..models.enums import ArtifactType, ImageModel, VideoModel
from ..models.experiment import ContentGenome, GenomeDimension, RequiredAsset
from ..models.graph import Edge, Graph, Node, NodeType, Position
from ..ports import AIGenerationPort

logger = logging.getLogger(__name__)

_VALID_NODE_TYPES = {t.value for t in NodeType}

# ---------------------------------------------------------------------------
# Genome generation prompt
# ---------------------------------------------------------------------------

_GENOME_BASE_PROMPT = """\
You are the Chief Creative Officer at a world-class advertising agency that produces
campaigns for luxury brands, high-growth e-commerce, and premium SaaS products.

Your task: analyze a creative brief and extract a **Content Genome** — a set of
orthogonal creative dimensions whose combinations yield meaningfully different ad
executions that each feel like they were art-directed independently.

## Rules

1. Return exactly 3-5 dimensions.
2. Every dimension must be truly orthogonal — varying one must not force another to change.
3. Each dimension should have 2-4 values representing distinct creative directions.
4. **Values must be ultra-specific and evocative**, not generic.
   - BAD: "modern", "dark", "professional"
   - GOOD: "Wes Anderson pastel symmetry", "cinematic noir with rim lighting",
     "Apple-esque minimal white", "90s editorial grain"
5. Think about the dimensions that actually change how the final ad *looks and feels*:
   visual style, color palette, camera/composition language, emotional tone, narrative arc,
   product presentation angle, typography mood.
6. Infer the goal, target audience, and platform from the brief when not stated explicitly.
7. The genome should enable ads that range from aspirational luxury to bold performance marketing.
"""

_GENOME_IMAGE_RULE_8 = """\
8. Extract a **desired_outcome** — a vivid description (2-4 sentences) of the ideal final
   creative IMAGE. The description must specify:
   - Objects, people, or products that MUST appear in the final image
   - The exact visual moment, composition, and camera angle
   - Lighting setup and color palette
   - Emotional beat and viewer reaction

   - BAD: "A nice product photo"
   - GOOD: "A luxury mechanical wristwatch resting on rough-hewn marble, sapphire crystal
     catching precise studio highlights. Shot from a 30-degree elevated angle on a macro lens.
     Three-point lighting with warm silver and deep charcoal palette. The viewer feels 'this
     is precision craftsmanship I aspire to own.' The watch face, brand logo, and marble
     texture MUST be clearly visible."
"""

_GENOME_VIDEO_RULE_8 = """\
8. Extract a **desired_outcome** — a vivid description (2-4 sentences) of the ideal final
   creative VIDEO. The description must specify:
   - Opening frame, camera movement, and visual beats
   - Objects, people, or products that MUST appear in the final video
   - Dialogue or voiceover with tone direction
   - Sound design, music mood, and pacing
   - Emotional arc and viewer reaction

   - BAD: "A nice product video that shows features"
   - GOOD: "A slow-motion close-up of the watch face catching golden afternoon light, a single
     water droplet rolling off the sapphire crystal. Camera pulls back to reveal it on the wrist
     of a confident executive overlooking a city skyline at sunset. Voice says: 'Time, mastered.'
     The watch face, executive's confident expression, and skyline MUST appear. The feeling is
     aspiration and quiet mastery."
"""

_GENOME_RULE_9 = """\
9. Extract **required_assets** — a list of specific objects, people, products, or visual elements
   that MUST appear in the final creative output. Each asset needs a name and a detailed visual
   description sufficient for generating a reference image.
   Example: [{{"name": "luxury wristwatch", "description": "Stainless steel case, sapphire crystal,
   blue dial with silver indices, brushed metal bracelet"}}, {{"name": "brand logo",
   "description": "Minimalist serif wordmark in white or silver, must be readable"}}]
"""


def _build_genome_prompt(artifact_type: str) -> str:
    rule_8 = _GENOME_IMAGE_RULE_8 if artifact_type == ArtifactType.IMAGE else _GENOME_VIDEO_RULE_8
    return f"{_GENOME_BASE_PROMPT}\n{rule_8}\n{_GENOME_RULE_9}"

_GENOME_OUTPUT_FIELDS = [
    {
        "name": "dimensions",
        "type": "array",
        "items": {
            "type": "object",
            "fields": [
                {"name": "name", "type": "string"},
                {"name": "values", "type": "array", "items": "string"},
                {"name": "description", "type": "string"},
            ],
        },
    },
    {"name": "brief", "type": "string"},
    {"name": "goal", "type": "string"},
    {"name": "target_audience", "type": "string"},
    {"name": "platform", "type": "string"},
    {"name": "desired_outcome", "type": "string"},
    {
        "name": "required_assets",
        "type": "array",
        "items": {
            "type": "object",
            "fields": [
                {"name": "name", "type": "string"},
                {"name": "description", "type": "string"},
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Graph Architect prompts — base + image-specific + video-specific
# ---------------------------------------------------------------------------

_IMAGE_MODEL_TIERS = (
    "| model ID                          | engine         | image_size | upstream images | use for                                          |\n"
    "|-----------------------------------|----------------|------------|-----------------|--------------------------------------------------|\n"
    f'| "{ImageModel.IMAGEN_FAST.value}"    | Imagen 4 Fast  | NO         | NO              | Quick concept sketches, iteration drafts          |\n'
    f'| "{ImageModel.IMAGEN.value}"        | Imagen 4       | 1K/2K      | NO              | Solid general-purpose quality                     |\n'
    f'| "{ImageModel.IMAGEN_ULTRA.value}"  | Imagen 4 Ultra | 1K/2K      | NO              | Hero shots, product photography, final images     |\n'
    f'| "{ImageModel.FLASH_IMAGE.value}"         | Flash Image    | NO         | YES             | Fast reference images, upstream context            |\n'
    f'| "{ImageModel.PRO_IMAGE.value}"     | Pro Image      | 1K/2K/4K   | YES             | Complex scenes, text-in-image, reasoning-heavy    |'
)

_GRAPH_ARCHITECT_BASE_PROMPT = f"""\
You are an elite AI creative director and media production architect. You design multi-step
creative pipelines as DAGs (directed acyclic graphs) that produce **world-class, editorial-quality
advertising content** — the kind seen in Vogue, Apple campaigns, and luxury brand lookbooks
for E-commerce consumer products or software companies.

Your pipelines must produce output indistinguishable from a professional creative agency's work.

## Available node types

| type               | output  | what it does                                              |
|--------------------|---------|-----------------------------------------------------------|
| generate_text      | text    | LLM text generation — ad copy, scripts, prompt refinement |
| generate_image     | image   | Image generation (5 model tiers — see below)              |
| generate_video     | video   | Video generation (Veo 3.1 — includes native audio)        |
| analyze_image      | text    | Describe / analyze an image                               |
| transform_image    | image   | Re-generate an image with modifications                   |

## Image model tiers (set via params.model)

{_IMAGE_MODEL_TIERS}

Only set `params.image_size` for models that support it (see "image_size" column above).
Allowed values: "1K", "2K", or "4K" (4K only on Pro Image).
Do NOT set image_size for Imagen 4 Fast or Flash Image — they will error.

### Upstream image context (Flash/Pro only)
When a generate_image node using Flash or Pro has upstream images connected, those images
are passed as visual context — useful for style-consistent series or image editing.
Imagen models ignore upstream images.

## Port wiring
- Every node has one input "in" (ANY) and one typed output.
- A node receives ALL upstream outputs: texts → texts[], images → images[].
- generate_text can accept upstream images/audio/video as multimodal context.

## Output format

Return a JSON object:
```json
{{
  "hooks": [
    {{
      "genome_label": {{"dimension_name": "selected_value", ...}},
      "steps": [
        {{
          "role": "unique_role_name",
          "type": "generate_text",
          "label": "Human-readable label",
          "prompt": "You are a senior art director. Write a single image generation prompt...",
          "params": {{}},
          "depends_on": []
        }},
        {{
          "role": "hero_image",
          "type": "generate_image",
          "label": "Hero product shot",
          "prompt": "",
          "params": {{"model": "<PRIMARY_MODEL from artifact section>", "aspect_ratio": "4:3"}},
          "depends_on": ["prompt_writer"]
        }}
      ]
    }}
  ]
}}
```

- Each hook MUST use a different combination of genome dimension values.
- `depends_on` lists role names of upstream steps.
- Root nodes (no dependencies) run in parallel. The graph must be a valid DAG.
- When a node depends on a generate_text "prompt writer", leave its own `prompt` field empty —
  the upstream text becomes its prompt automatically.
"""

_IMAGE_ARCHITECT_PROMPT = f"""\
## IMAGE PIPELINE DESIGN

### Image prompt writing guide

Write each image prompt as a **rich narrative paragraph**, NOT a keyword list.
Follow this structure for every image prompt:

1. **Subject & action**: Who/what is in the frame, what are they doing, what expression.
2. **Setting & environment**: Where — be specific (marble countertop, sunlit loft, desert dunes).
3. **Composition & camera**: Shot type (close-up, 3/4, overhead flat lay), lens (85mm f/1.4,
   35mm wide-angle, macro 100mm), angle (45-degree elevated, eye-level, low-angle heroic).
4. **Lighting**: Direction, quality, color — "soft golden-hour side lighting with subtle rim
   light separating subject from background" or "high-key studio lighting with dual softboxes".
5. **Color palette & mood**: Dominant colors, emotional tone — "muted earth tones with a pop of
   burnt orange, evoking warmth and sophistication" or "cool blue-silver palette, clinical precision".
6. **Texture & materials**: Surface qualities — "matte ceramic with visible grain",
   "brushed gold hardware catching specular highlights", "silk with visible thread texture".
7. **Style & quality keywords**: "editorial product photography, 4K, HDR, shot on Phase One
   medium format, Vogue aesthetic" or "hyper-realistic 3D render, octane, studio lighting".

Example of an excellent image prompt:
"A single bottle of artisanal olive oil on a rough-hewn marble slab, surrounded by scattered
rosemary sprigs and a cracked terracotta bowl of green olives. Shot from a 30-degree elevated
angle on an 85mm f/2 lens with shallow depth of field. Warm late-afternoon directional light
streams from the left, casting soft shadows and making the golden oil glow. Color palette:
warm whites, sage green, terracotta, and deep gold. Ultra-realistic editorial food photography,
4K, HDR, Kinfolk magazine aesthetic."

### Text prompts for downstream image nodes (generate_text)

When using generate_text to craft prompts for downstream image nodes, instruct it to:
- Write in the rich narrative paragraph style above
- Include all 7 elements (subject, setting, composition, lighting, palette, texture, quality)
- Reference the specific genome dimension values naturally
- Output ONLY the final prompt text, no explanations

### Pipeline design principles for IMAGE

1. **Use generate_text as a "prompt writer" node.** Don't write image prompts directly
   in the step spec if they would be generic. Instead, have a generate_text node craft a
   world-class prompt that incorporates the brief, genome values, and professional photography
   language — then feed its output into the image node.

2. **Use BRANCHING.** Multiple independent branches, potentially converging at one or more
   terminal image nodes (when the brief warrants multiple final images).
   - Prompt branch: generate_text crafts a detailed art-directed prompt
   - Reference branch: generate a reference image for consistency
   - Hero branch: final generate_image produces the key visual

3. **Use the PRIMARY MODEL for ALL generate_image nodes** (specified in the "Final artifact type"
   section below). Do NOT mix different image models within a hook — use the same model everywhere.
   Check the model tiers table for param compatibility before setting image_size.

4. **Aim for 4-7 nodes per hook** (more when producing multiple final images). A 2-node graph (text→image) is lazy.
   A well-designed pipeline has:
   - 1-2 generate_text nodes (prompt writing)
   - 1-2 generate_image nodes (reference images, hero visual)
   - Optional analyze_image → refine loop

5. **Do NOT include generate_video, generate_speech, or generate_music nodes.**
   This is an image-only pipeline.

6. **VARY THE GRAPH ARCHITECTURE across hooks.** Do NOT use the same pipeline shape
   for every hook. Mix up the structure:
   - Some hooks: text → image (simple but with expert prompt)
   - Some hooks: text → reference image → text (analyze) → final image
   - Some hooks: parallel branches (multiple reference images merge at final)
   - Some hooks: text → image → analyze_image → text → transform_image (iterative refinement)
   - Vary the number of nodes (3-7), the branching factor, and which node types appear.

### Pre-generating reference images for complex subjects

When the brief involves specific products, characters, or complex scenes with multiple required
elements, use this pattern:
1. Use a generate_text node to write a detailed reference image prompt describing the key
   subject/product in isolation — perfect lighting, clear detail, neutral background
2. Generate the reference image using the PRIMARY MODEL (specified in the "Final artifact type" section)
3. Connect this reference image as upstream context to downstream image nodes

When required_assets are specified in the genome, generate a reference image for each asset
that needs visual consistency across the pipeline.
"""

_VIDEO_ARCHITECT_PROMPT = f"""\
## VIDEO PIPELINE DESIGN

### Veo 3.1 native audio
Veo generates video WITH dialogue, voiceover, SFX, and music built-in.
- Do NOT add separate generate_speech or generate_music nodes.
- Bake all audio direction into the video node's prompt: dialogue in quotes, voice tone,
  background music genre/mood, sound effects.

### Video reference images
generate_video with `reference_mode: true` treats up to 3 connected images as Veo
reference images for character/style consistency.

### Video prompt writing guide

Write each video prompt as a **mini film script** with visual + audio direction:

1. **Opening**: Describe the first frame — scene, subject position, camera position.
2. **Camera movement**: Slow dolly in, tracking pan, crane up, static close-up.
3. **Action & pacing**: What happens beat-by-beat over the 4-8 second clip.
4. **Dialogue/voiceover**: In quotation marks with voice direction —
   "A warm, confident female voice says: 'This is where it begins.'"
5. **Sound design**: Background music genre/mood, ambient sounds, SFX —
   "Minimal piano melody, soft fabric rustling, gentle room tone."
6. **Lighting & atmosphere**: "Natural window light, soft lens flare, dreamy shallow DOF."
7. **Style reference**: "Cinematic, 24fps filmic look, warm color grade, Terrence Malick"

Example of an excellent video prompt:
"Opening on a luxury wristwatch resting on dark emperador marble, soft studio lighting making
the sapphire crystal gleam. A slow dolly moves in from mid-shot to extreme close-up over 3
seconds, revealing the sweep of the second hand. A confident male voice says: 'Precision is
not a feature — it's a philosophy.' The camera pulls back smoothly to reveal the watch on a
wrist overlooking a city skyline at golden hour. Warm orchestral strings swell gently, mixed
with the soft mechanical tick of the movement. Cinematic, anamorphic lens flare, warm color
grade, luxury automotive commercial aesthetic."

### Text prompts for downstream video nodes (generate_text)

When using generate_text to craft prompts for downstream video nodes, instruct it to:
- Write as a mini film script with all 7 elements above
- Include dialogue/voiceover in quotes with voice direction
- Include sound design, camera movement, and pacing
- Reference the specific genome dimension values naturally
- Output ONLY the final prompt text, no explanations

### Pipeline design principles for VIDEO

1. **Use generate_text as a "prompt writer" and "script writer" node.** Have separate nodes for:
   - A "script writer" that crafts the video narrative, dialogue, sound design
   - A "prompt writer" that assembles the full video generation prompt

2. **Use BRANCHING to prepare assets before the final video node.**
   - Script branch: generate_text writes the video script / narrative
   - Reference branch: generate reference images for characters,
     products, or key visual elements → connect to video node with reference_mode: true
   - Final: all branches converge at the generate_video node

3. **Use the PRIMARY IMAGE MODEL for ALL generate_image nodes** (specified in the "Final artifact
   type" section below). Do NOT mix different image models — use the same model everywhere.
   Check the model tiers table for param compatibility before setting image_size.

4. **Aim for 4-7 nodes per hook.** A well-designed video pipeline has:
   - 1-2 generate_text nodes (script writing, prompt crafting)
   - 1-3 generate_image nodes (reference images for characters/products/scenes)
   - 1 generate_video terminal node

5. **Do NOT add separate generate_speech or generate_music nodes** — Veo 3.1 handles all audio.

6. **VARY THE GRAPH ARCHITECTURE across hooks.** Do NOT use the same pipeline shape:
   - Some hooks: text (script) → video (simple but with expert prompt)
   - Some hooks: parallel reference images + script → merge at video
   - Some hooks: text → image → analyze_image → refined text → video (iterative)
   - Some hooks: multiple reference images for different subjects → video with reference_mode
   - Vary the number of nodes (3-7), the branching factor, and which node types appear.

### Pre-generating reference images for complex subjects

When the brief involves specific products, characters, or complex scenes with multiple required
elements, use this pattern:
1. Use a generate_text node to write a detailed reference image prompt describing the key
   subject/product in isolation — perfect lighting, clear detail, neutral background
2. Generate the reference image using the PRIMARY IMAGE MODEL (specified in the "Final artifact type" section)
3. Connect up to 3 reference images to the video node with `reference_mode: true`

This ensures the final video maintains visual consistency for complex subjects that Veo
might otherwise simplify or alter.

When required_assets are specified in the genome, generate a reference image for each asset
that needs visual consistency in the final video.
"""

# Layout constants for auto-positioning nodes
_X_START = 50
_Y_START = 50
_X_SPACING = 320
_Y_SPACING = 180


class ExperimentService:
    def __init__(self, ai: AIGenerationPort):
        self._ai = ai

    async def generate_genome(self, brief: str, artifact_type: str = ArtifactType.VIDEO.value) -> ContentGenome:
        system_prompt = _build_genome_prompt(artifact_type)
        prompt = f"""{system_prompt}

Creative brief:
{brief}

Analyze this brief and return the Content Genome as JSON."""

        response = await self._ai.generate_text(
            prompt=prompt,
            params={
                "temperature": 0.7,
                "output_mode": "structured",
                "output_fields": _GENOME_OUTPUT_FIELDS,
            },
        )

        logger.debug("Genome LLM response: %s", response[:500])
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError) as exc:
            logger.error("Failed to parse genome JSON: %s\nRaw: %s", exc, response)
            raise ValueError(f"AI returned invalid JSON for genome: {exc}") from exc

        dimensions = [GenomeDimension.from_dict(d) for d in data["dimensions"]]
        required_assets = [
            RequiredAsset(name=a["name"], description=a.get("description", ""))
            for a in data.get("required_assets", [])
        ]
        return ContentGenome(
            dimensions=dimensions,
            brief=data.get("brief", brief),
            goal=data.get("goal", ""),
            target_audience=data.get("target_audience", ""),
            platform=data.get("platform", ""),
            desired_outcome=data.get("desired_outcome", ""),
            required_assets=required_assets,
        )

    async def generate_hook_graphs(
        self,
        genome: ContentGenome,
        experiment_name: str,
        count: int = 4,
        artifact_type: str = ArtifactType.VIDEO.value,
        image_model: str = ImageModel.IMAGEN_ULTRA.value,
        video_model: str = VideoModel.VEO.value,
        reference_image_bytes: bytes | None = None,
        images_per_hook: int | None = None,
    ) -> List[tuple[Graph, Dict[str, str]]]:
        """Use the LLM Graph Architect to design multi-step creative pipelines.

        Returns a list of (graph, genome_label) tuples.
        """
        ref_description = ""
        if reference_image_bytes:
            ref_description = await self._ai.analyze_image(
                reference_image_bytes,
                "Provide an exhaustive visual analysis of this reference image for a creative "
                "director who needs to recreate its essence. Analyze with extreme precision:\n\n"
                "1. COMPOSITION: Framing (rule of thirds, centered, asymmetric), camera angle, "
                "depth layers, negative space\n"
                "2. COLOR PALETTE: 5 dominant colors with precise descriptions, temperature, "
                "contrast, saturation\n"
                "3. LIGHTING: Direction, quality (hard/soft), shadow character, highlights, "
                "rim lighting\n"
                "4. MOOD & ATMOSPHERE: Emotional tone in 3 words, energy level, time-of-day "
                "feeling\n"
                "5. STYLE: Photography/art style, post-processing look, era references\n"
                "6. TEXTURE & MATERIALS: Surface qualities, material types, depth\n"
                "7. SUBJECT TREATMENT: How the main subject is presented\n\n"
                "Write as a dense analytical paragraph. Another creative director should be able "
                "to art-direct a matching image from your description alone.",
                {"temperature": 0.3},
            )

        hook_specs = await self._call_graph_architect(
            genome=genome,
            count=count,
            artifact_type=artifact_type,
            image_model=image_model,
            video_model=video_model,
            ref_description=ref_description,
            images_per_hook=images_per_hook,
        )

        # Build canvas_memory creative directive (computed once before the loop)
        cm_parts: list[str] = []
        if genome.desired_outcome:
            cm_parts.append(
                "CREATIVE DIRECTIVE (highest priority — all content must realize this vision):\n"
                + genome.desired_outcome
            )
        if ref_description:
            usage = genome.reference_image_usage or "style"
            usage_labels = {
                "style": "Match the reference image's visual style and aesthetic",
                "composition": "Follow the reference image's composition and framing",
                "mood": "Capture the reference image's emotional tone and atmosphere",
                "recreate": "Closely recreate the reference image's overall look",
            }
            cm_parts.append(
                f"REFERENCE IMAGE DIRECTION ({usage_labels.get(usage, usage_labels['style'])}):\n"
                + ref_description
            )
        canvas_memory_directive = "\n\n".join(cm_parts)

        results: List[tuple[Graph, Dict[str, str]]] = []
        for i, hook_spec in enumerate(hook_specs):
            try:
                genome_label = hook_spec.get("genome_label", {})
                steps = hook_spec.get("steps", [])
                if not steps:
                    logger.warning("Hook %d has no steps, skipping", i)
                    continue

                label_parts = [f"{k}={v}" for k, v in genome_label.items()]
                hook_name = f"{experiment_name} — {' · '.join(label_parts)}"

                graph = self._build_graph_from_steps(steps, hook_name)
                graph.canvas_memory = canvas_memory_directive
                results.append((graph, genome_label))
            except Exception as exc:
                logger.error("Failed to build graph for hook %d: %s", i, exc)
                continue

        if not results:
            raise ValueError("LLM Graph Architect produced no valid graphs")

        return results

    async def _call_graph_architect(
        self,
        genome: ContentGenome,
        count: int,
        artifact_type: str,
        image_model: str,
        video_model: str,
        ref_description: str = "",
        images_per_hook: int | None = None,
    ) -> List[Dict]:
        """Call the LLM Graph Architect and return parsed hook specifications."""
        dimensions_text = "\n".join(
            f"  - {d.name}: {', '.join(d.values)} — {d.description}"
            for d in genome.dimensions
        )

        assets_section = ""
        if genome.required_assets:
            assets_text = "\n".join(
                f"  - **{a.name}**: {a.description}" for a in genome.required_assets
            )
            assets_section = f"""## Required Assets

The following elements MUST appear in the final output. For each, consider generating
a dedicated reference image early in the pipeline to ensure visual consistency:

{assets_text}"""

        creative_sections: list[str] = []
        if genome.desired_outcome:
            creative_sections.append(
                "## Creative Directive — Desired Outcome\n\n"
                "The client has specified exactly what they want the final creative to look and feel like:\n\n"
                f"> {genome.desired_outcome}\n\n"
                "This is the NORTH STAR for every pipeline you design. Your terminal node's prompt must\n"
                "describe this exact outcome. Every upstream prompt-writer node must craft prompts that\n"
                "build toward realizing this specific vision. Do not deviate."
            )
        if ref_description:
            usage = genome.reference_image_usage or "style"
            usage_map = {
                "style": "Match the visual style, color grading, lighting approach, and aesthetic of the reference image. The subject matter may differ, but the look and feel must be consistent.",
                "composition": "Follow the composition, framing, camera angle, and spatial arrangement of the reference image. Adapt subject matter but preserve compositional structure.",
                "mood": "Capture the emotional tone, atmosphere, and feeling of the reference image. Visuals may differ but must evoke the same emotional response.",
                "recreate": "Closely recreate the reference image with the brief's subject matter. Match composition, style, lighting, color palette, and mood as closely as possible.",
            }
            creative_sections.append(
                "## Reference Image Analysis\n\n"
                f"The client provided a reference image (usage: **{usage}**).\n\n"
                f"Detailed analysis:\n{ref_description}\n\n"
                f"Instruction: {usage_map.get(usage, usage_map['style'])}\n\n"
                "Incorporate this reference direction into every prompt-writer node's instructions."
            )
        creative_directive_text = "\n\n".join(creative_sections)

        if artifact_type == ArtifactType.IMAGE:
            if images_per_hook is not None and images_per_hook > 1:
                output_instruction = (
                    f"Each hook MUST produce exactly {images_per_hook} final output images.\n"
                    f"Design the pipeline with {images_per_hook} terminal generate_image nodes, "
                    "each with a distinct composition or focus.\n"
                )
            elif images_per_hook == 1:
                output_instruction = (
                    "Each hook MUST produce exactly 1 final output image.\n"
                )
            else:
                output_instruction = (
                    "Determine the optimal number of final output images per hook.\n"
                    "If the brief involves many distinct objects, scenes, or compositions that "
                    "can't fit naturally in one image, design the pipeline with multiple terminal "
                    "generate_image nodes (each focused on a specific composition or subject). "
                    "For simpler briefs, a single hero image is sufficient.\n"
                    "When using multiple terminal nodes, each should have a distinct label "
                    "describing its focus (e.g., 'Hero product shot', 'Lifestyle context shot').\n"
                )
            artifact_instruction = (
                f"{output_instruction}"
                f'PRIMARY MODEL: "{image_model}" — use this for ALL generate_image nodes.\n'
                "Check the model tiers table above for this model's param compatibility "
                "(image_size support, upstream image support) and set params accordingly.\n"
                "Do NOT include generate_video, generate_speech, or generate_music nodes."
            )
        else:
            artifact_instruction = (
                "The FINAL output node of each pipeline MUST be a generate_video node.\n"
                f'Video model: "{video_model}".\n'
                f'PRIMARY IMAGE MODEL: "{image_model}" — use this for ALL generate_image nodes '
                "(reference images, concept images, etc.).\n"
                "Check the model tiers table above for param compatibility before setting image_size."
            )

        brief_section = f"""## The brief

{genome.brief}

Goal: {genome.goal}
Target audience: {genome.target_audience}
Platform: {genome.platform}"""

        genome_section = f"""## Content Genome dimensions

{dimensions_text}"""

        final_section = f"""## Final artifact type: {artifact_type.upper()}

{artifact_instruction}

Design {count} distinct creative pipeline hooks. Each hook should:
1. Pick a unique combination of genome dimension values
2. Design a multi-step DAG with 4-7 nodes that produces the final {artifact_type}
3. Use generate_text "prompt writer" nodes upstream to craft detailed, art-directed prompts
4. Choose the right image model tier for each node's purpose
5. Write every prompt as a rich narrative with composition, lighting, mood, and camera language
6. Use branching where it makes creative sense
"""

        # Select medium-specific architect prompt
        medium_prompt = _IMAGE_ARCHITECT_PROMPT if artifact_type == ArtifactType.IMAGE else _VIDEO_ARCHITECT_PROMPT
        system_prompt = f"{_GRAPH_ARCHITECT_BASE_PROMPT}\n\n{medium_prompt}"

        # Build prompt with creative directive inserted between genome and final sections
        prompt_parts = [system_prompt, brief_section, genome_section]
        if assets_section:
            prompt_parts.append(assets_section)
        if creative_directive_text:
            prompt_parts.append(creative_directive_text)
        prompt_parts.append(final_section)
        prompt = "\n\n".join(prompt_parts)

        response = await self._ai.generate_text(
            prompt=prompt,
            params={
                "temperature": 0.6,
                "output_mode": "json",
            },
        )

        logger.debug("Graph Architect LLM response: %s", response[:500])
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError) as exc:
            logger.error("Failed to parse Graph Architect JSON: %s\nRaw: %s", exc, response)
            raise ValueError(f"AI returned invalid JSON for graph designs: {exc}") from exc

        if isinstance(data, dict):
            for key in ("hooks", "variations", "specs", "results", "graphs", "pipelines"):
                if key in data and isinstance(data[key], list):
                    data = data[key]
                    break
            else:
                raise ValueError(
                    f"Expected a JSON object with 'hooks' key, got: {list(data.keys())}"
                )

        if not isinstance(data, list):
            raise ValueError(f"Expected a JSON array of hooks, got {type(data).__name__}")

        return data

    def _build_graph_from_steps(self, steps: List[Dict], graph_name: str) -> Graph:
        """Compile a list of step specs into a real Graph with nodes and edges."""
        graph = Graph(id=generate_id(), name=graph_name)
        role_to_node_id: Dict[str, str] = {}

        # Validate and filter steps
        valid_steps = []
        for step in steps:
            node_type_str = step.get("type", "")
            if node_type_str not in _VALID_NODE_TYPES:
                logger.warning("Unknown node type '%s' for role '%s', skipping", node_type_str, step.get("role"))
                continue
            valid_steps.append(step)

        # Compute topological layers for auto-positioning
        layers = self._compute_layers(valid_steps)

        for step in valid_steps:
            role = step["role"]
            node_id = generate_id()
            role_to_node_id[role] = node_id

            layer = layers.get(role, 0)
            layer_roles = [s["role"] for s in valid_steps if layers.get(s["role"], 0) == layer]
            y_index = layer_roles.index(role)

            position = Position(
                x=_X_START + layer * _X_SPACING,
                y=_Y_START + y_index * _Y_SPACING,
            )

            params = dict(step.get("params", {}))
            if step.get("prompt"):
                params["prompt"] = step["prompt"]
            # Graph Architect already writes expert prompts; skip enrichment
            params["enrich"] = False

            node = Node(
                id=node_id,
                type=NodeType(step["type"]),
                label=step.get("label", role),
                params=params,
                position=position,
            )
            graph.add_node(node)

        # Wire edges based on depends_on
        for step in valid_steps:
            to_role = step["role"]
            to_node_id = role_to_node_id.get(to_role)
            if not to_node_id:
                continue

            to_node = graph.get_node(to_node_id)
            if not to_node or not to_node.input_ports:
                continue

            to_port = to_node.input_ports[0]  # always "in"

            for dep_role in step.get("depends_on", []):
                from_node_id = role_to_node_id.get(dep_role)
                if not from_node_id:
                    logger.warning("depends_on role '%s' not found, skipping edge", dep_role)
                    continue

                from_node = graph.get_node(from_node_id)
                if not from_node or not from_node.output_ports:
                    continue

                from_port = from_node.output_ports[0]

                edge = Edge.from_ports(
                    from_node_id=from_node_id,
                    from_port_id=from_port.id,
                    to_node_id=to_node_id,
                    to_port_id=to_port.id,
                )
                graph.edges.append(edge)

        return graph

    @staticmethod
    def _compute_layers(steps: List[Dict]) -> Dict[str, int]:
        """Assign each step to a topological layer for auto-positioning."""
        role_deps: Dict[str, List[str]] = {}
        for step in steps:
            role_deps[step["role"]] = step.get("depends_on", [])

        layers: Dict[str, int] = {}

        def get_layer(role: str, visited: set | None = None) -> int:
            if role in layers:
                return layers[role]
            if visited is None:
                visited = set()
            if role in visited:
                return 0  # cycle guard
            visited.add(role)
            deps = role_deps.get(role, [])
            if not deps:
                layers[role] = 0
                return 0
            max_dep = max(get_layer(d, visited) for d in deps if d in role_deps)
            layers[role] = max_dep + 1
            return layers[role]

        for step in steps:
            get_layer(step["role"])

        return layers
