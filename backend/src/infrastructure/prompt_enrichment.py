from ..domain.models.graph import NodeType
from ..domain.ports import AIGenerationPort, PromptEnrichmentPort

# ---------------------------------------------------------------------------
# Few-shot examples — aligned with PROMPT_GUIDES.md 7-element structure
# ---------------------------------------------------------------------------

FEW_SHOT_EXAMPLES = {
    NodeType.GENERATE_IMAGE: [
        {
            "naive": "sunset over mountains",
            "expert": "A vast mountain range silhouetted against a blazing sunset sky, the jagged peaks cutting into layers of deep orange, magenta, and violet. Shot from an elevated vantage point with a 70-200mm telephoto lens at f/8, compressing the depth between foreground pine ridges and distant snow-capped summits. Warm golden-hour light floods from the left, casting long dramatic shadows across the rocky faces and making the snow glow amber. The color palette is rich and saturated — deep indigo shadows, molten gold highlights, and dusky rose in the mid-tones. Visible atmospheric haze between mountain layers creates natural depth separation. Ultra-realistic landscape photography, 4K, HDR, National Geographic quality, shot on medium format digital."
        },
        {
            "naive": "product photo of watch",
            "expert": "A luxury mechanical wristwatch resting on a slab of dark emperador marble, the polished steel case and sapphire crystal catching precise highlights. Shot from a 30-degree elevated angle on a 100mm macro lens at f/11, with tack-sharp detail across the dial indices and brushed bracelet links. Three-point studio lighting: key light at 45 degrees from the left emphasizing the watch face and creating specular reflections on the polished bezel, fill light softening the bracelet shadows, rim light from behind separating the case from the dark marble surface. Color palette: deep charcoal, warm silver, and subtle blue accents from the dial. The marble surface shows natural veining and a soft reflection of the watch beneath. Ultra-realistic commercial product photography, 4K, HDR, Hodinkee editorial quality."
        },
        {
            "naive": "woman in summer dress",
            "expert": "A young woman in a flowing linen sundress stands barefoot on a weathered wooden dock extending into a turquoise lake at golden hour. Shot from a slightly low angle on a 50mm f/1.8 lens, placing her against a sky gradient of peach, lavender, and soft gold. Warm backlight from the setting sun creates a luminous halo around her loose auburn hair and soft rim light along the dress fabric. Her expression is serene, eyes closed, face tilted slightly upward. Color palette: warm honey, soft sage, dusty rose, and natural linen. The dock planks show weathered grain texture, and gentle ripples catch golden light reflections. Editorial lifestyle photography, 4K, golden hour, Free People brand aesthetic, shot on Canon R5."
        },
    ],
    NodeType.GENERATE_VIDEO: [
        {
            "naive": "person walking down street",
            "expert": "A woman in a tailored camel coat walks purposefully down a rain-slicked cobblestone street at dusk. The camera tracks alongside her at shoulder height on a gimbal, matching her pace in a smooth lateral dolly. Warm tungsten light from shopfronts spills across the wet stones, creating golden bokeh reflections in the shallow depth of field from a 35mm lens at f/2.8. She glances at the camera with a confident half-smile. \"Sometimes you just know,\" she says softly in a warm, assured voice. A gentle ambient piano melody plays underneath, mixed with the soft rhythm of her heels on stone and distant city hum. Cinematic color grade with teal shadows and warm highlights, 24fps filmic look, Apple commercial aesthetic."
        },
        {
            "naive": "car commercial",
            "expert": "Opening wide on a matte black sports car parked alone on wet asphalt reflecting scattered city lights at twilight. A slow crane shot descends from 15 feet, revealing the sculpted hood lines and aggressive LED headlight signature. The camera transitions to a low-angle dolly at bumper height, gliding past the front grille as the headlights flare to life with a satisfying electrical hum. \"Built for the ones who don't follow,\" a deep, resonant male narrator intones. Dramatic side lighting with cool blue key light and warm amber edge lighting defines every body panel curve. Subtle fog swirls around the wheels. A deep electronic bass pulse builds underneath — cinematic, minimal, powerful. Shot on anamorphic lens, deep blacks, rich metallic reflections, luxury automotive commercial quality."
        },
        {
            "naive": "unboxing a phone",
            "expert": "Opening on a minimalist white surface with a matte black box centered in frame, soft diffused top-down lighting creating gentle shadows. A slow overhead crane descends as two hands with clean manicure enter frame and lift the lid with deliberate precision. The camera cuts to a 45-degree angle close-up as the phone rises from the box, its glass back catching a sweeping specular highlight. \"Technology that disappears into your life,\" a calm, confident female narrator says. The phone rotates slowly, suspended by fingertips, revealing the edge-to-edge display illuminating with a subtle gradient animation. Soft ambient electronic tones with a gentle bass pulse, the satisfying click of the box lid, and a subtle glass-on-skin sound effect. Apple product reveal aesthetic, shallow DOF, warm neutral color grade, 24fps filmic look."
        },
    ],
    NodeType.GENERATE_MUSIC: [
        {
            "naive": "epic music",
            "expert": "Epic orchestral composition at 85 BPM in D minor, opening with low string ostinato and distant brass swells building tension, layered with martial snare patterns and timpani rolls at 0:30, full orchestral crescendo at 1:00 with soaring French horn melody over string section, choir enters at 1:30 with sustained vowels adding human emotional depth, dynamic build with layered percussion (taiko drums, orchestral bass drum, cymbals), arrangement creates wide stereo field with strings panned wide, brass centered, choir slightly back in mix for depth, powerful climax at 2:00 with all elements in fortissimo, gradual decrescendo outro with solo piano reflective motif over sustained string pad"
        },
        {
            "naive": "chill background music",
            "expert": "Ambient downtempo electronic composition at 80 BPM in A minor, foundation of warm analog synth pad with slow filter modulation creating breathing texture, minimal rhythm with soft kick drum and brushed hi-hats providing gentle pulse without dominating, melodic elements from Rhodes electric piano with subtle chorus effect playing arpeggiated chords, atmospheric layer of reversed reverb swells and vinyl crackle texture for organic warmth, bass line from sub synth playing whole notes for harmonic grounding, arrangement leaves negative space for relaxation, mix emphasizes low-mids and highs with scooped midrange, stereo width created through panned ambient elements while keeping bass and kick centered, dynamics stay consistent for background listening without sudden changes"
        },
    ],
    NodeType.TRANSFORM_IMAGE: [
        {
            "naive": "make it warmer",
            "expert": "Transform this image to have a warm golden-hour color grade with amber highlights and deep ochre shadows. Shift the overall color temperature to approximately 6500K equivalent. Increase saturation of warm tones (reds, oranges, yellows) by subtle amounts while slightly desaturating cool blues. Add a gentle warm lens flare from the upper-left corner. Maintain the original composition, subject, and focus. The result should evoke late-afternoon Mediterranean light, editorial warmth, soft and inviting."
        },
        {
            "naive": "remove background",
            "expert": "Isolate the main subject from the background and place on a clean, pure white (#FFFFFF) studio backdrop. Maintain perfect edge detail including fine hair strands, translucent fabric edges, and subtle shadow contact points. Add a soft, natural-looking drop shadow beneath the subject (approximately 15% opacity, 2-pixel gaussian blur) to ground it on the white surface. Preserve the original lighting on the subject. Clean studio product photography isolation, e-commerce ready."
        },
    ],
}

# ---------------------------------------------------------------------------
# 7-element checklist injected into enrichment meta-prompts
# ---------------------------------------------------------------------------

_IMAGE_CHECKLIST = """\
Your enriched prompt MUST include ALL 7 elements as a narrative paragraph:
1. Subject & action (who/what, expression, gesture)
2. Setting & environment (specific location)
3. Composition & camera (shot type, lens, angle)
4. Lighting (direction, quality, color temperature)
5. Color palette & mood (dominant colors, emotional tone)
6. Texture & materials (surface qualities)
7. Style & quality keywords (photography style, resolution, reference)"""

_VIDEO_CHECKLIST = """\
Your enriched prompt MUST be a mini film script with:
1. Opening frame (scene, subject, camera position)
2. Camera movement (dolly, tracking, crane, pan — be specific)
3. Action & pacing (beat-by-beat over 4-8 seconds)
4. Dialogue/voiceover in quotes with voice direction
5. Sound design (music mood, ambient sounds, SFX)
6. Lighting & atmosphere
7. Style reference (cinematic, filmic, brand aesthetic)"""


class NoOpPromptEnricher(PromptEnrichmentPort):
    async def enrich(self, prompt: str, node_type: NodeType) -> str:
        return prompt


class HybridPromptEnricher(PromptEnrichmentPort):
    def __init__(self, ai: AIGenerationPort):
        self._ai = ai

    async def enrich(self, prompt: str, node_type: NodeType) -> str:
        checklist = self._get_checklist(node_type)
        examples = FEW_SHOT_EXAMPLES.get(node_type, [])

        examples_text = ""
        if examples:
            examples_text = "Examples:\n\n" + "\n\n".join(
                f"Naive: {ex['naive']}\nExpert: {ex['expert']}"
                for ex in examples
            ) + "\n\n"

        meta_prompt = f"""Transform this prompt into a detailed, art-directed prompt for {node_type.value} generation.
Write as a single rich narrative paragraph — NOT a keyword list.

{checklist}

{examples_text}Output ONLY the enriched prompt. No explanations, no labels, no prefixes.

Original prompt: {prompt}

Enriched prompt:"""

        enriched = await self._ai.generate_text(
            prompt=meta_prompt,
            params={"temperature": 0.4}
        )
        return enriched.strip()

    def _get_checklist(self, node_type: NodeType) -> str:
        if node_type == NodeType.GENERATE_VIDEO:
            return _VIDEO_CHECKLIST
        if node_type in (NodeType.GENERATE_IMAGE, NodeType.TRANSFORM_IMAGE):
            return _IMAGE_CHECKLIST
        return ""
