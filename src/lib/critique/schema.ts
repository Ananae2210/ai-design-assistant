import { z } from "zod";

export const CATEGORIES = ["accessibility", "hierarchy", "layout", "consistency", "copy", "interaction"] as const;
export const SEVERITIES = ["critical", "major", "minor"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Severity = (typeof SEVERITIES)[number];

/** What Claude must return. Enforced by structured outputs, then parsed again by Zod. */
export const IssueSchema = z.object({
  title: z.string().describe("Short name for the problem, under 10 words"),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  wcag: z
    .string()
    .nullable()
    .describe("WCAG 2.2 success criterion number such as 1.4.3, or null when no criterion applies"),
  location: z.string().describe("Where on the screen, in words a designer would use"),
  problem: z.string().describe("What is wrong and who it affects"),
  fix: z.string().describe("A concrete change the designer can make"),
});

export const CritiqueSchema = z.object({
  summary: z.string().describe("Two or three sentences on the screen's overall quality"),
  strengths: z.array(z.string()).describe("Up to three things the design does well"),
  issues: z.array(IssueSchema).describe("At most 12 issues, most severe first"),
});

export type Issue = z.infer<typeof IssueSchema>;
export type Critique = z.infer<typeof CritiqueSchema>;

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

/** Base64 length of a ~3 MB image: well above a 1568px JPEG, below hosting body limits. */
export const MAX_IMAGE_BASE64 = 4_000_000;

/** What the browser sends to /api/critique. */
export const CritiqueRequestSchema = z.object({
  image: z.object({
    mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    data: z.string().min(1).max(MAX_IMAGE_BASE64),
  }),
  context: z.string().trim().max(500).default(""),
  findings: z
    .array(
      z.object({
        fg: hex,
        bg: hex,
        ratio: z.number().min(1).max(21),
        verdict: z.enum(["pass", "large-only", "fail"]),
      }),
    )
    .max(30)
    .default([]),
});

export type CritiqueRequest = z.infer<typeof CritiqueRequestSchema>;
