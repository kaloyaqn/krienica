/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com', // Google user photos
      'platform-lookaside.fbsbx.com', // Facebook user photos
      'avatars.githubusercontent.com', // GitHub user photos
      'www.gravatar.com' // Gravatar fallback
    ],
  },
}

module.exports = nextConfig 