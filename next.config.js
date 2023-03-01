/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.tuk.dev",
        port: "",
        pathname: "/assets/webapp/**",
      },
      {
        protocol: "https",
        hostname: "tuk-cdn.s3.amazonaws.com",
        port: "",
        pathname: "/assets/components/**",
      },
    ],
  },
};

module.exports = nextConfig;
