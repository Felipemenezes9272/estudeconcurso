/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    // O service worker precisa ser sempre revalidado para que as atualizações cheguem.
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
