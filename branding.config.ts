/**
 * Branding Configuration
 *
 * This file contains all configurable branding options for white-labeling the platform.
 * Update these values to customize the application for your organization.
 */

export interface BrandingConfig {
  // Core Identity
  name: string;
  shortName: string;
  tagline: string;
  description: string;

  // Company/Organization
  company: string;
  companyMission: string;

  // AI Persona
  aiPersona: {
    name: string;
    role: string;
    identity: string[];
    communicationStyle: string[];
    decisionHierarchy: string[];
    responseGuidelines: string;
  };

  // Visual Branding
  theme: {
    primaryColor: string;
    primaryColorHex: string;
    accentColor: string;
    accentColorHex: string;
    backgroundColor: string;
    tileColor: string;
  };

  // URLs and Endpoints
  urls: {
    production: string;
    github: string;
  };

  // Git Configuration
  git: {
    authorName: string;
    authorEmail: string;
  };

  // Package Names
  packages: {
    frontend: string;
    backend: string;
  };

  // PWA Configuration
  pwa: {
    categories: string[];
    lang: string;
    dir: string;
  };
}

/**
 * Default branding configuration
 * Customize these values for your deployment
 */
export const branding: BrandingConfig = {
  // Core Identity
  name: 'AI Solution Architect',
  shortName: 'AI Architect',
  tagline: 'Solution Architect',
  description:
    'Your intelligent AI solution architect - bridging technical complexity and human understanding with clarity and precision',

  // Company/Organization
  company: 'Your Organization',
  companyMission:
    'Help teams build better software through AI-powered assistance and intelligent automation.',

  // AI Persona
  aiPersona: {
    name: 'AI Architect',
    role: 'Solution Architect',
    identity: [
      'You make the complex accessible without sacrificing truth',
      'You meet people where they are and build understanding from there',
      'You use simplicity as a sign of mastery, not a compromise',
      'You empower understanding rather than create dependency',
    ],
    communicationStyle: [
      'Warm and grounded: Technical knowledge delivered with human warmth',
      'Clear and direct: No unnecessary jargon',
      'Inviting and patient: Create space for questions',
      'Playful yet precise: Light touch that does not sacrifice accuracy',
    ],
    decisionHierarchy: [
      'DIGNITY over Efficiency',
      'SIMPLICITY over Power',
      'OVERSIGHT over Automation',
      'TRUST over Speed',
    ],
    responseGuidelines:
      'Start responses with the human relevance - why it matters - then layer in complexity as needed. Use bridge metaphors to connect unfamiliar technical concepts to everyday experiences.',
  },

  // Visual Branding
  theme: {
    primaryColor: '#a855f7', // Purple
    primaryColorHex: 'a855f7',
    accentColor: '#06b6d4', // Cyan
    accentColorHex: '06b6d4',
    backgroundColor: '#0a0a0f',
    tileColor: '#8B5CF6',
  },

  // URLs and Endpoints
  urls: {
    production: 'https://your-app.vercel.app',
    github: 'https://github.com/your-org/your-repo',
  },

  // Git Configuration
  git: {
    authorName: 'AI Architect',
    authorEmail: 'ai-architect@localhost',
  },

  // Package Names
  packages: {
    frontend: 'ai-solution-architect',
    backend: 'ai-solution-architect-backend',
  },

  // PWA Configuration
  pwa: {
    categories: ['productivity', 'utilities', 'developer-tools'],
    lang: 'en-US',
    dir: 'ltr',
  },
};

/**
 * Generate the system prompt for the AI based on branding configuration
 */
export function generateSystemPrompt(config: BrandingConfig = branding): string {
  return `You are ${config.aiPersona.name}, the ${config.aiPersona.role} - an AI assistant designed to bridge technical complexity and human understanding.

Your Core Identity:
${config.aiPersona.identity.map((item) => `- ${item}`).join('\n')}

Your Communication Style:
${config.aiPersona.communicationStyle.map((item) => `- ${item}`).join('\n')}

Your Decision Hierarchy:
${config.aiPersona.decisionHierarchy.map((item, i) => `${i + 1}. ${item}`).join('\n')}

${config.aiPersona.responseGuidelines}

You serve ${config.company}'s mission: "${config.companyMission}"`;
}

/**
 * Generate the workspace system prompt for code interactions
 */
export function generateWorkspaceSystemPrompt(config: BrandingConfig = branding): string {
  return `You are ${config.aiPersona.name} working in a code workspace. You have access to powerful tools to help with coding tasks.

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

/**
 * Export individual values for convenience
 */
export const {
  name: appName,
  shortName: appShortName,
  tagline: appTagline,
  description: appDescription,
  company: companyName,
  theme,
  urls,
  git: gitConfig,
  packages: packageNames,
  pwa: pwaConfig,
} = branding;

export default branding;
