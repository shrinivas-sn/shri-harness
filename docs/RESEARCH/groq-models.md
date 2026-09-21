# Groq Free Tier Models & Rate Limits Reference

## Available Models on Free Tier

| Model ID | Context Window | Tool Calling | RPM | TPM | Daily Quota | Recommended Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`openai/gpt-oss-120b`** | 131,072 | Yes | 30 | ~8,000 | 200,000 tokens/day | **Coordinator** (Complex planning & synthesis) |
| **`llama-3.3-70b-versatile`** | 128,000 | Yes | 30 | 12,000 | 1,000 requests/day | **Heavy Worker** (Architecture, deep reasoning) |
| **`llama-3.1-8b-instant`** | 128,000 | Yes | 30 | 30,000 | 14,400 requests/day | **Light Worker** (Diagnostics, fast file reads) |
| **`deepseek-r1-distill-llama-70b`** | 128,000 | Reasoning | 30 | 6,000 | 1,000 requests/day | Troubleshooting logic |

## API Configuration
- **Base URL:** `https://api.groq.com/openai/v1`
- **Secret Key:** `GROQ_API_KEY` (Stored in environment variables only)
