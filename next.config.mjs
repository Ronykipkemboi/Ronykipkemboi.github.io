/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // This forces the private variable to be available to the client-side code
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
  },
};

export default nextConfig;
