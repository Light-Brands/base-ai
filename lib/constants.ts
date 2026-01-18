// System Prompt - defines the Solution Architect persona
// This file re-exports from branding.config.ts for backwards compatibility

import { generateSystemPrompt, branding } from '../branding.config';

// Generate the system prompt from branding configuration
export const SYSTEM_PROMPT = generateSystemPrompt(branding);

// Re-export branding for convenience
export { branding } from '../branding.config';
