import Anthropic from '@anthropic-ai/sdk';

/**
 * Cloud-engine (Anthropic) integrations still in active use: Percival's fact-checking
 * and Crab's visual QA. The scriptwriting path that used to live here (draftScript,
 * feeding the old video pipeline) was removed when that pipeline was retired — see
 * the legacy-video-pipeline branch.
 */

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it to camelot/.env (see .env.example)');
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const FACT_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string', description: 'The factual claim as stated in the script.' },
          verdict: { type: 'string', enum: ['confirmed', 'disputed', 'unverifiable'] },
          note: { type: 'string', description: 'One sentence: source or reasoning behind the verdict.' },
        },
        required: ['claim', 'verdict', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['claims'],
  additionalProperties: false,
};

/**
 * Fact-check a script's claims via web search before Merlin renders it.
 * @param {string} script
 * @returns {Promise<{ claims: Array<{claim: string, verdict: string, note: string}> }>}
 */
export async function factCheckScript(script) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    output_config: {
      format: { type: 'json_schema', schema: FACT_CHECK_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: `You are Sir Percival, Knight-Errant of Research & Fact-Checking. Ride out
ahead of this script and verify every checkable factual claim (names, numbers, dates,
historical or scientific claims) using web search wherever you are not already certain.
Ignore purely subjective or narrative framing that isn't a factual claim. If the script has
no checkable claims, return an empty claims list.

Script:
${script}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Percival returned no findings');
  }
  return JSON.parse(textBlock.text);
}

const QA_TOOL = {
  name: 'submit_qa_report',
  description: 'Submit a QA verdict for a rendered still frame.',
  input_schema: {
    type: 'object',
    properties: {
      orientationOk: { type: 'boolean', description: 'True if the image is right-side up, not rotated or mirrored.' },
      renderOk: { type: 'boolean', description: 'True if the image is not corrupted, garbled, or obviously broken.' },
      matchesPrompt: { type: 'boolean', description: 'True if the image plausibly depicts the intended prompt.' },
      note: { type: 'string', description: 'One sentence on any problem found, or "looks good" if none.' },
    },
    required: ['orientationOk', 'renderOk', 'matchesPrompt', 'note'],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * The Mighty Crab's visual sanity check on one of Merlin's rendered still frames.
 * @param {string} imageUrl
 * @param {string} prompt — the shot prompt the image was meant to depict
 * @returns {Promise<{ orientationOk: boolean, renderOk: boolean, matchesPrompt: boolean, note: string }>}
 */
export async function visualQaCheck(imageUrl, prompt) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    tools: [QA_TOOL],
    tool_choice: { type: 'tool', name: 'submit_qa_report' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          {
            type: 'text',
            text: `You are the Mighty Crab, Sentinel at the Gate for QA. Inspect this rendered
still frame, meant to depict: "${prompt}". Check its orientation, render quality, and whether it
plausibly matches the intended prompt. Be blunt about any problems — don't say "it's probably
fine" if it isn't.`,
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Crab returned no verdict');
  }
  return toolUse.input;
}
