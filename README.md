# Ronald Kipkemboi's Portfolio Website

This is a personal portfolio website featuring AI-powered chat and voice-over capabilities.

## Features

- **AI Chat Assistant**: Powered by OpenAI's GPT-3.5 Turbo
- **Voice Over**: Text-to-speech using ElevenLabs API
- **Responsive Design**: Mobile-friendly interface
- **Projects Showcase**: Display of development projects
- **Skills & Resume**: Professional background information

## Setup

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Add your API keys to `.env.local`:
   - `ELEVENLABS_API_KEY`: Get from [ElevenLabs Settings](https://elevenlabs.io/app/settings/api-keys)
   - `OPENAI_API_KEY`: Get from [OpenAI API Keys](https://platform.openai.com/api-keys)
4. Deploy to Vercel or run locally

### Vercel Deployment

1. Import the repository to Vercel
2. Add the following environment variables in Vercel project settings:
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID` (optional, defaults to aCo0MjC9VdNNVf8S6sq3)
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGINS` (optional, comma-separated list of allowed origins for CORS)

## Troubleshooting

### Voice Over Not Working

If you see "Voice over unavailable" or errors in the console:

1. **Check API Key**: Ensure `ELEVENLABS_API_KEY` is set in Vercel environment variables
2. **Verify API Key**: Log in to [ElevenLabs](https://elevenlabs.io) and verify your API key is valid
3. **Check Logs**: View Vercel function logs for detailed error messages
4. **API Key Format**: ElevenLabs API keys should be at least 20 characters long

Common error messages in logs:
- `Invalid ElevenLabs API key`: Your API key is expired or invalid - regenerate it in ElevenLabs settings
- `ElevenLabs API key is not configured`: Add the environment variable in Vercel
- `ElevenLabs API key appears to be invalid (too short)`: Check that you copied the complete API key

### Chat Not Working

If the chat feature isn't responding:

1. **Check OpenAI API Key**: Ensure `OPENAI_API_KEY` is set in Vercel environment variables
2. **Verify API Key**: Check your OpenAI API key at [OpenAI Platform](https://platform.openai.com/api-keys)
3. **Check Usage**: Ensure you have available credits in your OpenAI account

## API Endpoints

- `POST /api/chat`: Chat with the AI assistant
- `POST /api/voice`: Generate voice-over audio using ElevenLabs

## License

© 2024 Ronald Kipkemboi. All rights reserved.
