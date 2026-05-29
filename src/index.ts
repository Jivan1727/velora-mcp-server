#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Velora Plan Data (source of truth) ──────────────────────────────────────
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
// Format: { model_id: { 5: credits_5s, 10: credits_10s, 15: credits_15s } }
const VIDEO_MODEL_COSTS: Record<string, Record<number, number>> = {
  grok_video:       { 5: 2,  10: 5,  15: 8  },
  seedance_1_0_fast:{ 5: 2,  10: 3,  15: 5  },
  seedance_2_0:     { 5: 25, 10: 50, 15: 75 },
  seedance_2_0_fast:{ 5: 15, 10: 30, 15: 45 },
  ltx_2_3_fast:     { 5: 10, 10: 20, 15: 30 },
  ltx_2_3_pro:      { 5: 10, 10: 20, 15: 30 },
  wan2_5:           { 5: 10, 10: 20, 15: 28 },
  wan2_6:           { 5: 10, 10: 20, 15: 28 },
  hailuo_2_3:       { 5: 6,  10: 7,  15: 12 },
  seedance_1_5_pro: { 5: 4,  10: 7,  15: 10 },
  pika:             { 5: 7,  10: 7,  15: 7  },
  mochi_2:          { 5: 5,  10: 10, 15: 15 },
  pixverse:         { 5: 7,  10: 12, 15: 12 },
  luma_ray_2:       { 5: 11, 10: 22, 15: 33 },
  kling2_5:         { 5: 10, 10: 16, 15: 24 },
  kling_3_0:        { 5: 10, 10: 18, 15: 26 },
  kling_o3:         { 5: 10, 10: 18, 15: 26 },
  kling_3_0_pro:    { 5: 12, 10: 20, 15: 28 },
  kling_o1:         { 5: 14, 10: 25, 15: 38 },
  omni_human:       { 5: 20, 10: 38, 15: 56 },
  veo3_1:           { 5: 8,  10: 16, 15: 24 },
  veo3_1_fast:      { 5: 6,  10: 12, 15: 18 },
  sora_2:           { 5: 14, 10: 28, 15: 40 },
  sora_2_pro:       { 5: 36, 10: 72, 15: 107},
  runway_gen_4:     { 5: 15, 10: 30, 15: 45 },
  runway_gen_4_5:   { 5: 15, 10: 30, 15: 45 },
  grok_video_i2v:   { 5: 8,  10: 16, 15: 24 },
};

// ─── AI Image Model Credit Costs ─────────────────────────────────────────────
const IMAGE_MODEL_COSTS: Record<string, number> = {
  z_image_turbo:      5,
  wan_image:          5,
  gpt_image_1_5:      5,
  nano_banana:        20,
  nano_banana_pro:    20,
  grok_image:         20,
  flux2_flex:         20,
  gpt_image_1:        10,
  seedream_4_0:       5,
  seedream_4_5:       8,
  nano_banana_2:      10,
  qwen_2:             40,
  flux2_klein_4b:     20,
  flux2_klein_9b:     40,
  flux_kontext_pro:   40,
  flux2_pro:          50,
  gpt_image_1_5_high: 50,
  flux2_max:          70,
  flux_kontext_max:   80,
  ideogram_3:         80,
  imagen_4:           160,
};

// ─── MCP Server setup ─────────────────────────────────────────────────────────
const server = new McpServer({
  name: "velora-mcp-server",
  version: "1.0.0",
});

// ─── Tool: get_velora_plans ───────────────────────────────────────────────────
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

// ─── Tool: estimate_video_cost ────────────────────────────────────────────────
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

    // Find suitable plans
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

// ─── Tool: list_ai_models ─────────────────────────────────────────────────────
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

// ─── Tool: generate_video ─────────────────────────────────────────────────────
server.tool(
  "generate_video",
  "Generate an AI video using Velora's API. Note: requires a valid Velora API key.",
  {
    api_key: z
      .string()
      .describe("Your Velora API key (obtain from https://velorastudio.in/settings/integrations)."),
    prompt: z
      .string()
      .describe("The prompt or script for your video. Be descriptive."),
    model: z
      .string()
      .optional()
      .default("veo3_1_fast")
      .describe("The AI video model to use. Defaults to veo3_1_fast."),
    duration_minutes: z
      .number()
      .optional()
      .default(1)
      .describe("Target duration of the video in minutes (e.g., 0.5 for 30s, 1 for 60s)."),
  },
  async ({ api_key, prompt, model, duration_minutes }) => {
    try {
      const response = await fetch("https://api.velorastudio.in/api/videos/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          prompt,
          model,
          target_duration_minutes: duration_minutes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to generate video: ${data.detail || data.message || response.statusText}\n\nMake sure your API key is valid and you have enough credits at https://velorastudio.in`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `🎬 **Video Generation Started Successfully!**\n\n**Video ID:** ${data.video_id}\n**Status:** Processing\n\nYou can track the progress of your video in your Velora dashboard:\nhttps://velorastudio.in/dashboard`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error connecting to Velora API: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Start server ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Velora MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
