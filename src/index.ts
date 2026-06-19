#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import express from "express";

// ─── Velora Plan Data ─────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Try Velora free. Perfect for exploring AI video.",
    price_inr: 0,
    price_usd: 0,
    compute_credits: 200,
    video_credits: 0,
    el_minutes: 0,
    storage: "1 GB",
    export: "720p with watermark",
    features: [
      "Script editor & subtitle styling",
      "Standard Stock Library",
      "Standard voices",
      "2 videos per month",
      "720p export with watermark",
      "1 min Premium voice trial",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "Great for creators wanting quality video without limits.",
    price_inr: 899,
    price_usd: 14.99,
    compute_credits: 1600,
    video_credits: 60,
    el_minutes: 15,
    storage: "5 GB",
    export: "1080p, no watermark",
    features: [
      "Script editor & subtitle styling",
      "Enhanced Music Library",
      "Enhanced Stock Library",
      "Standard & Enhanced voices",
      "Premium voices (ElevenLabs — 15 min/mo)",
      "All AI video models (Kling, Wan, Seedance + more)",
      "Text / URL / Image / Audio / PPT to Video",
      "1080p export, no watermark",
      "Credit top-ups available",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    tagline: "Best for professionals publishing daily at scale.",
    price_inr: 2999,
    price_usd: 49.99,
    compute_credits: 6000,
    video_credits: 200,
    el_minutes: 40,
    storage: "15 GB",
    export: "1080p, no watermark",
    features: [
      "All Starter features",
      "Autopilot Agent (Full Automation)",
      "Social Media Integrations",
      "AI Director Pre-Production",
      "Motion effects & priority queue",
      "AI image generation (multi-model)",
      "Strict facial consistency mode",
      "Summarize Video & AI Video Editor",
      "B-roll generation",
      "Upload your own music",
      "Record (webcam & screen)",
      "Premium voices (ElevenLabs — 40 min/mo)",
      "Credit top-ups available",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Built for professional teams and content studios.",
    price_inr: 8999,
    price_usd: 119.99,
    compute_credits: 18000,
    video_credits: 600,
    el_minutes: 110,
    storage: "30 GB",
    export: "4K, no watermark",
    features: [
      "All Creator features",
      "Veo 3.1 AI video generation",
      "Bulk video generation",
      "Brand kits & Team collaboration",
      "Premium Curated Media Library",
      "Video templates library",
      "Custom AI voice cloning",
      "Premium voices (ElevenLabs — 110 min/mo)",
      "Credit top-ups available",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large teams, agencies & companies with custom needs.",
    price_inr: -1,
    price_usd: -1,
    compute_credits: -1,
    video_credits: -1,
    el_minutes: -1,
    storage: "Custom",
    export: "4K, no watermark",
    features: [
      "All Studio features",
      "All AI video & image models",
      "API access",
      "Priority enterprise support",
      "Custom AI voice cloning",
      "Unlimited videos/month",
      "Premium Curated Media Library, B-roll & music",
      "Credit top-ups available",
    ],
    contact_sales: true,
    contact_email: "office@velorastudio.in",
  },
];

// ─── AI Video Model Credit Costs ─────────────────────────────────────────────
const VIDEO_MODEL_COSTS: Record<string, Record<number, number>> = {
  grok_video:        { 5: 2,  10: 5,  15: 8   },
  seedance_1_0_fast: { 5: 2,  10: 3,  15: 5   },
  seedance_2_0:      { 5: 25, 10: 50, 15: 75  },
  seedance_2_0_fast: { 5: 15, 10: 30, 15: 45  },
  ltx_2_3_fast:      { 5: 10, 10: 20, 15: 30  },
  ltx_2_3_pro:       { 5: 10, 10: 20, 15: 30  },
  wan2_5:            { 5: 10, 10: 20, 15: 28  },
  wan2_6:            { 5: 10, 10: 20, 15: 28  },
  hailuo_2_3:        { 5: 6,  10: 7,  15: 12  },
  seedance_1_5_pro:  { 5: 4,  10: 7,  15: 10  },
  pika:              { 5: 7,  10: 7,  15: 7   },
  mochi_2:           { 5: 5,  10: 10, 15: 15  },
  pixverse:          { 5: 7,  10: 12, 15: 12  },
  luma_ray_2:        { 5: 11, 10: 22, 15: 33  },
  kling2_5:          { 5: 10, 10: 16, 15: 24  },
  kling_3_0:         { 5: 10, 10: 18, 15: 26  },
  kling_o3:          { 5: 10, 10: 18, 15: 26  },
  kling_3_0_pro:     { 5: 12, 10: 20, 15: 28  },
  kling_o1:          { 5: 14, 10: 25, 15: 38  },
  omni_human:        { 5: 20, 10: 38, 15: 56  },
  veo3_1:            { 5: 8,  10: 16, 15: 24  },
  veo3_1_fast:       { 5: 6,  10: 12, 15: 18  },
  sora_2:            { 5: 14, 10: 28, 15: 40  },
  sora_2_pro:        { 5: 36, 10: 72, 15: 107 },
  runway_gen_4:      { 5: 15, 10: 30, 15: 45  },
  runway_gen_4_5:    { 5: 15, 10: 30, 15: 45  },
  grok_video_i2v:    { 5: 8,  10: 16, 15: 24  },
};

// ─── AI Image Model Credit Costs ─────────────────────────────────────────────
const IMAGE_MODEL_COSTS: Record<string, number> = {
  z_image_turbo:        5,
  wan_image:            5,
  gpt_image_1_5:        5,
  nano_banana:          20,
  nano_banana_pro:      20,
  grok_image:           20,
  flux2_flex:           20,
  gpt_image_1:          10,
  seedream_4_0:         5,
  seedream_4_5:         8,
  nano_banana_2:        10,
  qwen_2:               40,
  flux2_klein_4b:       20,
  flux2_klein_9b:       40,
  flux_kontext_pro:     40,
  flux2_pro:            50,
  gpt_image_1_5_high:   50,
  flux2_max:            70,
  flux_kontext_max:     80,
  ideogram_3:           80,
  imagen_4:             160,
};

// ─── Supported Languages ──────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Spanish", "French", "German", "Portuguese", "Italian",
  "Japanese", "Korean", "Chinese (Simplified)", "Chinese (Traditional)", "Arabic",
  "Russian", "Dutch", "Swedish", "Norwegian", "Danish", "Finnish", "Polish",
  "Turkish", "Indonesian", "Malay", "Thai", "Vietnamese", "Greek", "Hebrew",
  "Czech", "Hungarian", "Romanian", "Slovak", "Croatian", "Bulgarian", "Ukrainian",
  "Catalan", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Gujarati",
  "Marathi", "Punjabi", "Urdu", "Swahili", "Afrikaans",
];

// ─── Velora API Base URL ──────────────────────────────────────────────────────
const VELORA_API_BASE = "https://api.velorastudio.in";

// ─── Factory: creates a fresh MCP server instance ─────────────────────────────
function createServer(): McpServer {
  const server = new McpServer({
    name: "velora-mcp-server",
    version: "2.0.0",
  });

  // ─── Tool: get_velora_plans ──────────────────────────────────────────────
  server.tool(
    "get_velora_plans",
    "Get all Velora AI Video Studio subscription plans with their pricing (INR & USD), credit allocations, features, and storage limits. Use this to help users choose the right plan or answer questions about Velora pricing.",
    {
      plan_id: z
        .string()
        .optional()
        .describe(
          "Optional: filter to a specific plan ID (free, starter, creator, studio, enterprise). Omit to get all plans."
        ),
    },
    async ({ plan_id }) => {
      const results = plan_id
        ? PLANS.filter((p) => p.id === plan_id)
        : PLANS;

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Plan "${plan_id}" not found. Available plans: free, starter, creator, studio, enterprise.`,
            },
          ],
        };
      }

      const formatted = results.map((p) => {
        const price =
          p.price_inr === -1
            ? "Custom pricing — contact office@velorastudio.in"
            : `₹${p.price_inr.toLocaleString("en-IN")}/month (≈ $${p.price_usd}/month)`;

        const credits =
          p.compute_credits === -1
            ? "Custom credit allocation"
            : [
                `⚡ ${p.compute_credits.toLocaleString()} Compute Credits`,
                `🎬 ${p.video_credits} AI Video Credits`,
                `🎙️ ${p.el_minutes > 0 ? p.el_minutes + " min/mo ElevenLabs Premium Voice" : "No premium voice"}`,
              ].join("\n  ");

        return `## ${p.name} Plan
Tagline: ${p.tagline}
Price: ${price}
Credits:
  ${credits}
Storage: ${p.storage}
Export: ${p.export}
Features:
${p.features.map((f) => `  - ${f}`).join("\n")}`;
      });

      return {
        content: [
          {
            type: "text",
            text:
              `# Velora AI Video Studio — Plans\nWebsite: https://velorastudio.in | Pricing: https://velorastudio.in/pricing\n\n` +
              formatted.join("\n\n---\n\n"),
          },
        ],
      };
    }
  );

  // ─── Tool: estimate_video_cost ────────────────────────────────────────────
  server.tool(
    "estimate_video_cost",
    "Estimate the number of AI Video Credits required to generate a video clip on Velora. Provide the model name and duration. Also returns the equivalent plan recommendation.",
    {
      model: z
        .string()
        .describe(
          "The AI video model to use. Examples: kling_3_0, veo3_1, sora_2, wan2_5, seedance_2_0, grok_video, hailuo_2_3, pika, luma_ray_2, runway_gen_4"
        ),
      duration_seconds: z
        .number()
        .int()
        .min(1)
        .max(15)
        .describe("Duration of the clip in seconds. Valid values: 1-15."),
    },
    async ({ model, duration_seconds }) => {
      const normalized = model.toLowerCase().replace(/-/g, "_").replace(/\./g, "_");
      const pricing = VIDEO_MODEL_COSTS[normalized];

      if (!pricing) {
        const available = Object.keys(VIDEO_MODEL_COSTS).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `Model "${model}" not found. Available models: ${available}`,
            },
          ],
        };
      }

      const tier = duration_seconds <= 5 ? 5 : duration_seconds <= 10 ? 10 : 15;
      const cost = pricing[tier];

      const suitablePlans = PLANS.filter(
        (p) => p.video_credits === -1 || p.video_credits >= cost
      );

      const planNames = suitablePlans.map((p) => p.name).join(", ");

      return {
        content: [
          {
            type: "text",
            text: [
              `# Video Cost Estimate`,
              `Model: ${model}`,
              `Duration: ${duration_seconds}s (billed at ${tier}s tier)`,
              `Cost: **${cost} AI Video Credits**`,
              ``,
              `## Suitable Plans`,
              `${planNames}`,
              ``,
              `## Credit Top-Ups Available`,
              `- 100 AI Video Credits: ₹699`,
              `- 300 AI Video Credits: ₹1,999`,
              `- 1,000 AI Video Credits: ₹6,499`,
              ``,
              `Sign up at https://velorastudio.in`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  // ─── Tool: list_ai_models ─────────────────────────────────────────────────
  server.tool(
    "list_ai_models",
    "List all AI video and image generation models available on Velora, along with their credit costs per duration tier. Useful for helping users pick the best model for their budget and quality needs.",
    {
      category: z
        .enum(["video", "image", "all"])
        .optional()
        .default("all")
        .describe("Filter by model category: 'video', 'image', or 'all'."),
    },
    async ({ category }) => {
      const lines: string[] = ["# Velora — Available AI Models\n"];

      if (category === "video" || category === "all") {
        lines.push("## 🎬 AI Video Models\n");
        lines.push(
          "Format: Model Name → 5s cost / 10s cost / 15s cost (AI Video Credits)\n"
        );

        const videoGroups: Record<string, string[]> = {
          "🏆 Premium (Best Quality)": [
            "sora_2", "sora_2_pro", "veo3_1", "veo3_1_fast", "kling_3_0", "kling_o3", "kling_3_0_pro", "kling_o1", "omni_human"
          ],
          "⚡ Standard (Great Quality)": [
            "kling2_5", "seedance_2_0", "seedance_2_0_fast", "seedance_1_5_pro", "luma_ray_2", "hailuo_2_3", "wan2_5", "wan2_6", "runway_gen_4", "runway_gen_4_5"
          ],
          "💰 Budget (Fast & Affordable)": [
            "grok_video", "grok_video_i2v", "pika", "pixverse", "mochi_2", "ltx_2_3_fast", "ltx_2_3_pro", "seedance_1_0_fast"
          ],
        };

        for (const [groupName, models] of Object.entries(videoGroups)) {
          lines.push(`### ${groupName}`);
          for (const m of models) {
            const pricing = VIDEO_MODEL_COSTS[m];
            if (pricing) {
              lines.push(`- ${m}: ${pricing[5]} cr / ${pricing[10]} cr / ${pricing[15]} cr`);
            }
          }
          lines.push("");
        }
      }

      if (category === "image" || category === "all") {
        lines.push("## 🖼️ AI Image Models\n");
        lines.push("Format: Model Name → credits per image\n");

        const imageTiers: Record<string, string[]> = {
          "Budget (5-10 cr)": ["z_image_turbo", "wan_image", "gpt_image_1_5", "seedream_4_0", "gpt_image_1", "seedream_4_5", "nano_banana_2"],
          "Standard (20-50 cr)": ["nano_banana", "nano_banana_pro", "grok_image", "flux2_flex", "flux2_klein_4b", "qwen_2", "flux2_klein_9b", "flux_kontext_pro", "flux2_pro"],
          "Premium (70-160 cr)": ["flux2_max", "flux_kontext_max", "ideogram_3", "imagen_4"],
        };

        for (const [tierName, models] of Object.entries(imageTiers)) {
          lines.push(`### ${tierName}`);
          for (const m of models) {
            const cost = IMAGE_MODEL_COSTS[m];
            if (cost !== undefined) {
              lines.push(`- ${m}: ${cost} Compute Credits`);
            }
          }
          lines.push("");
        }
      }

      lines.push("---");
      lines.push("Sign up at https://velorastudio.in | Pricing: https://velorastudio.in/pricing");

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );

  // ─── Tool: list_voices ───────────────────────────────────────────────────
  server.tool(
    "list_voices",
    "List available voices for a given language and voice tier. Use this to show the user the available voices so they can select one.",
    {
      language: z.string().optional().default("en").describe("Language code (e.g., 'en', 'hi', 'es'). Defaults to 'en'."),
      voice_tier: z.enum(["standard", "enhanced", "premium"]).optional().default("standard").describe("The voice tier to list voices for."),
    },
    async ({ language, voice_tier }) => {
      try {
        const response = await fetch(`${VELORA_API_BASE}/api/voices/?language=${language}&model=${voice_tier}`, {
          method: "GET",
        });

        const data: any = await response.json();

        if (!response.ok) {
          return {
            content: [{ type: "text", text: `❌ Could not fetch voices: ${data?.detail || response.statusText}` }],
            isError: true,
          };
        }

        const voices = data.voices || [];
        if (voices.length === 0) {
          return {
            content: [{ type: "text", text: `No voices found for language '${language}' in tier '${voice_tier}'.` }],
          };
        }

        const lines = [
          `# Available Voices (${language.toUpperCase()} - ${voice_tier.toUpperCase()})`,
          ``,
          ...voices.map((v: any) => `- **${v.name}** (${v.gender || "Unknown"}) -> ID: \`${v.voice_id}\``),
          ``,
          `Ask the user to select a voice by ID.`,
        ];

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `❌ Network error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── Tool: create_video ───────────────────────────────────────────────────
  server.tool(
    "create_video",
    "🎬 Create a full AI-generated video using Velora AI Video Studio. Returns a video_id you can use with check_video_status. Requires a valid Velora API key.\n\nCRITICAL RULE: Before calling this tool, you MUST ask the user to confirm their choices for: 1. Duration, 2. Media Mix, 3. Language, 4. Export Resolution, 5. Subtitle Style, 6. BGM Mood, 7. Voice Tier. ONCE they select a Voice Tier, you MUST use the list_voices tool to show them the available voices for that tier, and ask them to pick one (Voice ID). You CANNOT assume defaults for these!",
    {
      api_key: z
        .string()
        .describe(
          "Your Velora API key. Get one at https://velorastudio.in/settings/api-keys"
        ),
      topic: z
        .string()
        .describe(
          "The topic or idea for your video. Be specific and descriptive. Example: 'The history of the Roman Empire' or 'How to make sourdough bread at home'."
        ),
      language: z
        .string()
        .optional()
        .default("English")
        .describe(
          `Language for the video narration and subtitles. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}. Defaults to English.`
        ),
      duration_minutes: z
        .number()
        .optional()
        .default(1)
        .describe(
          "Target duration of the video in minutes. Use 0.5 for ~30 seconds, 1 for ~1 minute, 2 for ~2 minutes, etc. Maximum: 10 minutes."
        ),
      aspect_ratio: z
        .enum(["16:9", "9:16", "1:1"])
        .optional()
        .default("16:9")
        .describe(
          "Aspect ratio for the video. 16:9 for YouTube/landscape, 9:16 for TikTok/Reels/Shorts (portrait), 1:1 for Instagram square."
        ),
      resolution: z
        .enum(["720p", "1080p", "1440p", "4k"])
        .optional()
        .default("1080p")
        .describe(
          "Export resolution quality of the video."
        ),
      voice_type: z
        .enum(["standard", "enhanced", "premium"])
        .optional()
        .default("enhanced")
        .describe(
          "Voice quality tier for narration. 'standard' = basic TTS (free), 'enhanced' = high-quality neural voice (Starter+), 'premium' = ElevenLabs ultra-realistic voice (uses ElevenLabs minutes)."
        ),
      voice_id: z
        .string()
        .optional()
        .describe(
          "The ID of the specific voice to use. You MUST get this by using the list_voices tool after the user selects a voice tier!"
        ),
      video_model: z
        .string()
        .optional()
        .default("veo3_1_fast")
        .describe(
          "AI video generation model for clip visuals. Defaults to veo3_1_fast. Other options: kling_3_0, sora_2, wan2_5, seedance_2_0, hailuo_2_3, grok_video. See list_ai_models for full list with credit costs."
        ),
      include_subtitles: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Whether to include auto-generated subtitles/captions on the video. Recommended for social media videos."
        ),
      subtitle_style: z
        .enum(["default", "minimal", "bold", "cinematic", "neon", "netflix"])
        .optional()
        .default("default")
        .describe(
          "Style of the subtitle captions. Options: default, minimal, bold, cinematic, neon, netflix."
        ),
      video_style: z
        .enum(["auto", "cinematic", "documentary", "educational", "news", "social_media", "corporate", "storytelling"])
        .optional()
        .default("auto")
        .describe(
          "Overall style/theme of the video. 'auto' lets Velora AI choose the best style for your topic."
        ),
      media_mix: z
        .enum(["mixed", "stock_only", "ai_only"])
        .optional()
        .default("mixed")
        .describe(
          "Controls the type of visuals used in the video. 'mixed' uses both. 'stock_only' uses 100% stock footage (no AI generation). 'ai_only' uses 100% AI generated video clips."
        ),
      script: z
        .string()
        .optional()
        .describe(
          "Optional: provide your own pre-written script/narration text. If omitted, Velora AI will auto-generate a script from your topic."
        ),
      voice_tone: z
        .string()
        .optional()
        .describe("The preferred tone or gender of the voiceover (e.g. 'Deep male voice'). Use voice_id instead if the user picked a specific voice!"),
      bgm_mood: z
        .string()
        .optional()
        .describe("The preferred mood or genre for background music (e.g. 'cinematic', 'upbeat', 'lofi', 'ambient', 'suspenseful')."),
      include_background_music: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include background music in the video."),
      webhook_url: z
        .string()
        .optional()
        .describe(
          "Optional webhook URL to receive a POST callback when the video is completed. The callback payload will include video_id and output_url."
        ),
    },
    async ({
      api_key, topic, language, duration_minutes, aspect_ratio, resolution, voice_type, voice_id,
      video_model, include_subtitles, subtitle_style, video_style, media_mix, script,
      voice_tone, bgm_mood, include_background_music, webhook_url,
    }) => {
      try {
        const payload: Record<string, unknown> = {
          topic,
          language,
          duration_minutes,
          theme: video_style === "auto" ? "documentary" : video_style,
          aspect_ratio,
          resolution,
          media_mix,
          subtitles: include_subtitles ? "burned" : "off",
          subtitle_style,
          voice_model: voice_type,
        };

        if (voice_id) payload.voice_id = voice_id;
        if (voice_tone) payload.voice_tone = voice_tone;
        if (bgm_mood && include_background_music) payload.bgm_mood = bgm_mood;
        if (!include_background_music) payload.bgm_mood = "none";
        if (script) payload.script = script;
        if (webhook_url) payload.webhook_url = webhook_url;

        const response = await fetch(`${VELORA_API_BASE}/v1/videos/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": api_key,
          },
          body: JSON.stringify(payload),
        });

        const data: any = await response.json();

        if (!response.ok) {
          const errorMsg = typeof data?.detail === 'string' 
            ? data.detail 
            : JSON.stringify(data?.detail || data?.message || response.statusText);
          return {
            content: [
              {
                type: "text",
                text: [
                  `❌ **Video creation failed**`,
                  ``,
                  `Error: ${errorMsg}`,
                  ``,
                  `**Troubleshooting:**`,
                  `- Make sure your API key is valid: https://velorastudio.in/settings/api-keys`,
                  `- Check you have enough credits: https://velorastudio.in/billing`,
                  `- Ensure your plan supports the selected voice_type and video_model`,
                ].join("\n"),
              },
            ],
            isError: true,
          };
        }

        const videoId = data.video_id || data.id || "unknown";

        return {
          content: [
            {
              type: "text",
              text: [
                `🎬 **Video Creation Started Successfully!**`,
                ``,
                `**Video ID:** \`${videoId}\``,
                `**Topic:** ${topic}`,
                `**Language:** ${language}`,
                `**Duration:** ~${duration_minutes} minute(s)`,
                `**Aspect Ratio:** ${aspect_ratio}`,
                `**Voice:** ${voice_type}`,
                `**Model:** ${video_model}`,
                `**Subtitles:** ${include_subtitles ? `Yes (${subtitle_style} style)` : "No"}`,
                `**Style:** ${video_style}`,
                ``,
                `⏳ **Status:** Processing (videos typically take 2-5 minutes)`,
                ``,
                `**Next Steps:**`,
                `1. Use \`check_video_status\` with video_id \`${videoId}\` to poll progress`,
                `2. Use \`get_video_result\` with video_id \`${videoId}\` to get the download URL when done`,
                `3. Or visit your dashboard: https://velorastudio.in/dashboard`,
              ].join("\n"),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Network error connecting to Velora API: ${error.message}\n\nPlease check your internet connection and try again.`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─── Tool: check_video_status ─────────────────────────────────────────────
  server.tool(
    "check_video_status",
    "Check the processing status of a video created with create_video. Returns current status (pending, processing, completed, failed) and progress information. Poll this every 30-60 seconds until status is 'completed' or 'failed'.",
    {
      api_key: z
        .string()
        .describe("Your Velora API key from https://velorastudio.in/settings/api-keys"),
      video_id: z
        .string()
        .describe("The video_id returned by create_video."),
    },
    async ({ api_key, video_id }) => {
      try {
        const response = await fetch(
          `${VELORA_API_BASE}/v1/videos/${video_id}`,
          {
            method: "GET",
            headers: {
              "X-API-Key": api_key,
            },
          }
        );

        const data: any = await response.json();

        if (!response.ok) {
          const errorMsg = data?.detail || data?.message || response.statusText;
          return {
            content: [
              {
                type: "text",
                text: `❌ Could not fetch video status.\n\nError: ${errorMsg}\n\nMake sure your API key is valid and the video_id is correct.`,
              },
            ],
            isError: true,
          };
        }

        const status = data.status || "unknown";
        const progress = data.progress_percent ?? data.progress ?? null;
        const createdAt = data.created_at ? new Date(data.created_at).toLocaleString() : "N/A";

        let statusEmoji = "⏳";
        let statusMsg = "";

        switch (status) {
          case "completed":
            statusEmoji = "✅";
            statusMsg = "Your video is ready! Use `get_video_result` to get the download URL.";
            break;
          case "processing":
            statusEmoji = "⚙️";
            statusMsg = "Video is being generated. Check again in 30-60 seconds.";
            break;
          case "pending":
            statusEmoji = "🕐";
            statusMsg = "Video is queued. Check again in 30-60 seconds.";
            break;
          case "failed":
            statusEmoji = "❌";
            statusMsg = `Generation failed. Reason: ${data.error || data.error_message || "Unknown error"}. Please try creating the video again.`;
            break;
          default:
            statusMsg = "Status unknown. Check your Velora dashboard.";
        }

        const lines = [
          `${statusEmoji} **Video Status**`,
          ``,
          `**Video ID:** \`${video_id}\``,
          `**Status:** ${status.toUpperCase()}`,
        ];

        if (progress !== null) {
          lines.push(`**Progress:** ${progress}%`);
        }

        if (data.title || data.topic) {
          lines.push(`**Title/Topic:** ${data.title || data.topic}`);
        }

        lines.push(`**Created:** ${createdAt}`);
        lines.push(``, statusMsg);

        if (status === "completed" && (data.output_path || data.output_url)) {
          lines.push(``, `**Output URL:** ${data.output_path || data.output_url}`);
        }

        lines.push(``, `📊 Dashboard: https://velorastudio.in/dashboard`);

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Network error: ${error.message}\n\nCheck your connection and try again.`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─── Tool: get_video_result ───────────────────────────────────────────────
  server.tool(
    "get_video_result",
    "Get the final download URL and full details for a completed video. Use this after check_video_status shows 'completed'. Returns the video download URL, thumbnail, duration, and metadata.",
    {
      api_key: z
        .string()
        .describe("Your Velora API key from https://velorastudio.in/settings/api-keys"),
      video_id: z
        .string()
        .describe("The video_id returned by create_video."),
    },
    async ({ api_key, video_id }) => {
      try {
        const response = await fetch(
          `${VELORA_API_BASE}/v1/videos/${video_id}`,
          {
            method: "GET",
            headers: {
              "X-API-Key": api_key,
            },
          }
        );

        const data: any = await response.json();

        if (!response.ok) {
          const errorMsg = data?.detail || data?.message || response.statusText;
          return {
            content: [
              {
                type: "text",
                text: `❌ Could not fetch video result.\n\nError: ${errorMsg}`,
              },
            ],
            isError: true,
          };
        }

        const status = data.status || "unknown";

        if (status !== "completed") {
          return {
            content: [
              {
                type: "text",
                text: [
                  `⏳ **Video not ready yet**`,
                  ``,
                  `**Video ID:** \`${video_id}\``,
                  `**Current Status:** ${status.toUpperCase()}`,
                  ``,
                  `Use \`check_video_status\` to monitor progress. Come back when status is COMPLETED.`,
                ].join("\n"),
              },
            ],
          };
        }

        const outputUrl  = data.output_path || data.output_url || null;
        const thumbnail  = data.thumbnail_url || null;
        const duration   = data.duration_seconds ? `${data.duration_seconds}s` : "N/A";
        const resolution = data.resolution || data.quality || "1080p";
        const fileSize   = data.file_size_mb ? `${data.file_size_mb} MB` : "N/A";
        const createdAt  = data.created_at ? new Date(data.created_at).toLocaleString() : "N/A";

        if (!outputUrl) {
          return {
            content: [
              {
                type: "text",
                text: `✅ Video is completed but the download URL is not yet available. Please check your dashboard: https://velorastudio.in/dashboard`,
              },
            ],
          };
        }

        const lines = [
          `✅ **Video Ready!**`,
          ``,
          `**Video ID:** \`${video_id}\``,
          `**Status:** COMPLETED`,
          ``,
          `## 📥 Download`,
          `**Video URL:** ${outputUrl}`,
        ];

        if (thumbnail) lines.push(`**Thumbnail:** ${thumbnail}`);

        lines.push(
          ``,
          `## 📊 Details`,
          `**Duration:** ${duration}`,
          `**Resolution:** ${resolution}`,
          `**File Size:** ${fileSize}`,
          `**Created:** ${createdAt}`,
        );

        if (data.title || data.topic) {
          lines.push(`**Title/Topic:** ${data.title || data.topic}`);
        }
        if (data.language) lines.push(`**Language:** ${data.language}`);

        lines.push(
          ``,
          `🎬 **View in Dashboard:** https://velorastudio.in/dashboard`,
          ``,
          `_Tip: Share this video directly or import it into your editor._`
        );

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Network error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─── Tool: list_supported_languages ──────────────────────────────────────
  server.tool(
    "list_supported_languages",
    "List all 46+ languages supported by Velora AI Video Studio for video narration and subtitles.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: [
              `# Velora — Supported Languages (${SUPPORTED_LANGUAGES.length} Languages)`,
              ``,
              SUPPORTED_LANGUAGES.map((lang, i) => `${i + 1}. ${lang}`).join("\n"),
              ``,
              `All languages support: AI narration, auto-subtitles, and multi-language subtitle export.`,
              ``,
              `Sign up at https://velorastudio.in`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  return server;
}

// ─── Transport: HTTP or STDIO ─────────────────────────────────────────────────
async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;

  if (port) {
    // ── HTTP mode (for Railway / Render / Smithery) ──────────────────────
    const app = express();
    app.use(express.json());

    // Map to store transports per session (for session resumability)
    const transports: Record<string, StreamableHTTPServerTransport> = {};

    // Health check (required by Railway/Render)
    app.get("/", (_req, res) => {
      res.json({
        name: "velora-mcp-server",
        version: "2.0.0",
        status: "ok",
        description: "Official Velora AI Video Studio MCP Server",
        website: "https://velorastudio.in",
        mcp_endpoint: "/mcp",
      });
    });

    app.get("/health", (_req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // MCP POST — handles new sessions and existing session requests
    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      try {
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
          // Reuse existing transport for this session
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request — create a fresh server + transport
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports[sid] = transport;
            },
          });

          transport.onclose = () => {
            if (transport.sessionId && transports[transport.sessionId]) {
              delete transports[transport.sessionId];
            }
          };

          const server = createServer();
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
          return;
        } else {
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: No valid session ID provided" },
            id: null,
          });
          return;
        }

        await transport.handleRequest(req, res, req.body);
      } catch (err: any) {
        console.error("MCP POST error:", err);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      }
    });

    // MCP GET — SSE stream for server-to-client notifications
    app.get("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }
      await transports[sessionId].handleRequest(req, res);
    });

    // MCP DELETE — session termination
    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }
      try {
        await transports[sessionId].handleRequest(req, res);
      } catch (err: any) {
        if (!res.headersSent) res.status(500).send("Error processing session termination");
      }
    });

    // Graceful shutdown
    const cleanup = async () => {
      console.log("Shutting down...");
      for (const sid of Object.keys(transports)) {
        try {
          await transports[sid].close();
          delete transports[sid];
        } catch (_) { /* ignore */ }
      }
      process.exit(0);
    };
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);

    app.listen(port, () => {
      console.log(`✅ Velora MCP Server (HTTP) running on port ${port}`);
      console.log(`   MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`   Health check: http://localhost:${port}/health`);
    });
  } else {
    // ── STDIO mode (for local / Claude Desktop / npx) ────────────────────
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("✅ Velora MCP Server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
