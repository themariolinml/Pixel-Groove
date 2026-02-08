# Pixel-Groove — Product Strategy

## Vision

Pixel-Groove is a graph-based AI media generation canvas that evolves into a **closed-loop content optimization engine**. We don't just generate content — we publish, measure, learn, and generate better.

```
Generate → Publish → Measure → Learn → Generate Better
```

The feedback loop is the moat. After months of running content through Pixel-Groove, the system knows what works for each brand, audience, and platform. Switching means starting from zero.

---

## Strategic Moats (Ranked by Defensibility)

### 1. Proprietary Data Flywheel (Primary Moat)

Every publish-measure cycle creates a training example:

```
{content_params, platform, audience} → {CTR, views, conversions}
```

Over time this builds a **content genome** — a structured mapping between content attributes and performance that no competitor can replicate without the same loop running for months.

**Reference companies**: EvenUp ($2B valuation, 200K+ cases = proprietary data), Persado ($100M+ revenue, banks pay $1M+/year for learned language patterns), Smartly.io ($200M+ revenue, audience-specific creative optimization).

### 2. Workflow System of Record

Pixel-Groove becomes where AI creative projects live — not just where they're generated. Versioning, asset libraries, performance history, and team collaboration create migration pain after 3+ months.

**Reference companies**: Notion ($600M ARR, 50%+ pay for AI), Canva ($3.5B revenue, 95% of Fortune 500), Glean ($200M ARR, doubles every 9 months).

### 3. Orchestration Layer

The graph-based workflow system is inherently multi-model and multi-step. Complex workflows become institutional knowledge. Shareable graphs create community network effects.

**Reference companies**: Clay ($3.1B valuation, orchestrates 150+ data providers), Replit ($250M ARR, full-stack environment).

---

## The Closed-Loop Architecture

### New Node Types

| Node Type | Purpose | Platform APIs |
|-----------|---------|---------------|
| **Publish Node** | Push generated content to ad platforms | Google Ads, Meta Ads, TikTok Ads |
| **Metrics Node** | Pull performance data back into the graph | Platform reporting APIs |
| **Optimizer Node** | Analyze metrics + content params, suggest improvements | Internal ML + LLM reasoning |
| **A/B Test Node** | Generate N variants, publish all, compare, pick winner | Platform experiments APIs |

### Graph Flow Example

```
[Text: Ad Copy] → [Image: Visual] → [Publish: Google Ads Performance Max]
                                              ↓
                                     [Metrics: CTR, Conversions, View Rate]
                                              ↓
                                     [Optimizer: "High-contrast + question CTA = 3x CTR"]
                                              ↓
                                     [Text: Refined Copy] → [Image: Optimized Visual] → ...
```

### The Content Genome

Structured mapping between content attributes and performance, accumulated per user/brand:

```json
{
  "visual_style": "high_contrast_minimal",
  "text_tone": "urgent",
  "cta_type": "question",
  "color_dominant": "blue",
  "duration_seconds": 15,
  "platform": "google_ads",
  "channel": "youtube",
  "audience_segment": "18-24_tech",
  "ctr": 0.042,
  "view_completion": 0.78,
  "cost_per_conversion": 3.20
}
```

After thousands of records, the system predicts creative performance before publishing.

---

## Platform Integration Plan

### Phase 1: Google Ads (Performance Max)

**Why first**: Best asset-level data (API v23, Jan 2026), multi-surface (YouTube + Display + Search + Gmail + Discover), built-in A/B experiments.

**Available metrics** (per individual creative asset):
- `metrics.ctr` — Click-through rate
- `metrics.impressions` — Impression count
- `metrics.clicks` — Click count
- `metrics.conversions` — Conversion count
- `metrics.cost_per_conversion` — Cost efficiency
- `metrics.video_view_rate` — Video view rate
- Video quartile views (25%, 50%, 75%, 100% completion)
- `asset_group_asset.performance_label` — Asset ranking vs peers
- Channel-level breakdowns (Search vs Display vs YouTube vs Gmail)

**Capabilities via API**:
- Upload images via `AssetService`
- Create responsive display ads
- Create Performance Max campaigns
- Run asset A/B tests (experiments framework)
- Pull asset-level performance with channel breakdowns

**Known limitations**:
- Cannot create standalone Video campaigns (use Performance Max instead)
- Assets cannot be edited after upload (create new each iteration)
- Metrics delayed ~3 hours
- Requires developer token + OAuth (approval process)
- Minimum $3-5/day for statistically meaningful data

### Phase 2: Meta Ads

**Why second**: Cheaper testing ($0.70-$1.92 avg CPC vs Google's $5.26), simpler video upload, strong for visual content. Cross-platform data makes the content genome more valuable.

**Key advantage**: Better video ad creation flow — direct upload + publish. Average ROAS 6:1.

### Phase 3: Additional Platforms

- TikTok Ads — Short-form video optimization
- YouTube (organic via YouTube Data API) — Non-paid content performance
- LinkedIn Ads — B2B content optimization
- X/Twitter Ads — Real-time content testing

---

## Revenue Model

| Tier | What They Get | Price Signal |
|------|---------------|-------------|
| **Creator** | Generate + manual export | $29/mo |
| **Pro** | + Publish nodes + metrics dashboard + A/B testing | $99/mo |
| **Growth** | + Auto-optimization + performance predictions + content genome | $299/mo |
| **Agency** | + Multi-brand + white-label + API + team collaboration | $999/mo |

The Growth tier is where the moat lives — that's where the feedback loop compounds.

**Outcome-based pricing opportunity**: Charge a percentage of ad spend improvement or flat fee per optimization cycle, similar to Intercom Fin's $0.99/resolution model.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Example | Lesson |
|--------------|---------|--------|
| **Thin wrapper** | Jasper AI ($120M → $35M ARR, -70%) | Just wrapping API calls with no data accumulation |
| **Go wide too early** | Trying all platforms at once | Each platform API is a major engineering investment |
| **Feature over moat** | Shipping features without switching costs | 90-92% of AI wrappers fail in year one |
| **Margin death spiral** | 20-30% gross margins from API costs | Must maintain 60%+ margins to survive |

---

## Success Metrics

### Product-Market Fit Signals
- After 3 months, customers have 100+ generated assets stored
- 30% of users use the publish-measure loop weekly
- Net revenue retention >120% (expansion from Creator → Pro → Growth)
- Monthly churn <5%

### Moat Strength Tests
1. If OpenAI ships a creative tool tomorrow, are we dead? → No, they don't have the publish-measure-learn loop.
2. After 6 months of usage, how hard is it to switch? → Very hard. Content genome + performance history + workflows are locked in.
3. Does the product improve with usage? → Yes. Every cycle makes predictions more accurate for that specific brand/audience.

---

## Implementation Roadmap

### Now: Core Generation Canvas
- Graph-based multi-model workflow engine
- Text, image, video, audio generation nodes
- Stale/dirty propagation for reactive regeneration
- Structured output for downstream node consumption

### Next: Publish + Measure Loop
- Google Ads Performance Max integration (Publish + Metrics nodes)
- Asset-level performance tracking
- Basic A/B test node (generate 2 variants, compare)
- Content genome data collection (store all generation params + outcomes)

### Later: Optimization Intelligence
- Meta Ads integration (cross-platform data)
- Optimizer node (LLM-powered creative suggestions from performance data)
- Performance prediction before publishing
- Auto-optimization workflows (generate → test → pick winner → scale)

### Future: Platform + Marketplace
- Workflow marketplace (shareable graph templates)
- Team collaboration (shared projects, approvals)
- Vertical specialization (gaming assets, marketing agencies, music production)
- Brand kits + style presets with learned performance data
