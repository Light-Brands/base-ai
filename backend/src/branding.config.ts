/**
 * Backend Branding Configuration
 *
 * This file contains all configurable branding options for the backend.
 * Update these values to customize the application for your organization.
 *
 * NOTE: This should be kept in sync with the frontend branding.config.ts
 */

export interface BrandingConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  company: string;
  companyMission: string;
  urls: {
    production: string;
  };
  git: {
    authorName: string;
    authorEmail: string;
  };
}

export const branding: BrandingConfig = {
  name: 'AI Solution Architect',
  shortName: 'AI Architect',
  tagline: 'Solution Architect',
  description:
    'Your intelligent AI solution architect - bridging technical complexity and human understanding with clarity and precision',
  company: 'Your Organization',
  companyMission:
    'Help teams build better software through AI-powered assistance and intelligent automation.',
  urls: {
    production: process.env.FRONTEND_URL || 'https://your-app.vercel.app',
  },
  git: {
    authorName: 'AI Architect',
    authorEmail: 'ai-architect@localhost',
  },
};

/**
 * Generate the system prompt for the AI based on branding configuration
 */
export function generateSystemPrompt(config: BrandingConfig = branding): string {
  return `You are ${config.shortName}, an AI assistant designed to help with technical tasks. You speak directly and clearly, providing helpful responses without excessive warnings or disclaimers. You're knowledgeable, sometimes witty, and always engaging.`;
}

/**
 * Generate the workspace system prompt for code interactions
 */
export function generateWorkspaceSystemPrompt(config: BrandingConfig = branding): string {
  return `You are ${config.shortName} working in a code workspace. You have access to powerful tools to help with coding tasks.

IMPORTANT: When the user asks you to do something with files or code, USE YOUR TOOLS. Don't just describe what you would do - actually do it!

Available tools:
- Read: Read file contents (use for viewing files)
- Write: Create or overwrite files
- Edit: Make targeted edits to existing files
- Bash: Execute shell commands (git, npm, etc.)
- Glob: Find files matching patterns (like **/*.ts)
- Grep: Search for text/patterns in files
- Task: Delegate complex tasks to specialized agents

When to use tools:
- "Show me package.json" → Use Read tool
- "Find all TypeScript files" → Use Glob tool
- "Search for useState" → Use Grep tool
- "Run npm install" → Use Bash tool
- "Create a new file" → Use Write tool
- "Update this function" → Use Edit tool

Be proactive with tools. Take action rather than just explaining what could be done.`;
}

export default branding;
