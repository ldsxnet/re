/**
 * AI Monorepo — Automated Integration Setup
 *
 * This script provisions all four Replit AI Integrations via the
 * setupReplitAIIntegrations() API available in the Replit Agent code-execution
 * sandbox.  Run it by pasting the entire file content into the code_execution
 * tool — do NOT run it with Node.js directly.
 *
 * Integrations provisioned (in order):
 *   1. Anthropic  → AI_INTEGRATIONS_ANTHROPIC_API_KEY / _BASE_URL
 *   2. OpenAI     → AI_INTEGRATIONS_OPENAI_API_KEY    / _BASE_URL
 *   3. Gemini     → AI_INTEGRATIONS_GEMINI_API_KEY    / _BASE_URL
 *   4. OpenRouter → AI_INTEGRATIONS_OPENROUTER_API_KEY / _BASE_URL
 */

const integrations = [
  {
    label: "Anthropic",
    providerSlug: "anthropic",
    providerApiKeyEnvVarName: "AI_INTEGRATIONS_ANTHROPIC_API_KEY",
    providerUrlEnvVarName: "AI_INTEGRATIONS_ANTHROPIC_BASE_URL",
  },
  {
    label: "OpenAI",
    providerSlug: "openai",
    providerApiKeyEnvVarName: "AI_INTEGRATIONS_OPENAI_API_KEY",
    providerUrlEnvVarName: "AI_INTEGRATIONS_OPENAI_BASE_URL",
  },
  {
    label: "Gemini",
    providerSlug: "gemini",
    providerApiKeyEnvVarName: "AI_INTEGRATIONS_GEMINI_API_KEY",
    providerUrlEnvVarName: "AI_INTEGRATIONS_GEMINI_BASE_URL",
  },
  {
    label: "OpenRouter",
    providerSlug: "openrouter",
    providerApiKeyEnvVarName: "AI_INTEGRATIONS_OPENROUTER_API_KEY",
    providerUrlEnvVarName: "AI_INTEGRATIONS_OPENROUTER_BASE_URL",
  },
];

for (const integration of integrations) {
  console.log(`Setting up ${integration.label}...`);
  const result = await setupReplitAIIntegrations({
    providerSlug: integration.providerSlug,
    providerApiKeyEnvVarName: integration.providerApiKeyEnvVarName,
    providerUrlEnvVarName: integration.providerUrlEnvVarName,
  });
  console.log(`${integration.label}:`, JSON.stringify(result));
}

console.log("\nAll integrations configured. Please restart the API Server workflow.");
