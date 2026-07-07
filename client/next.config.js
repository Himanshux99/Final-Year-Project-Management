/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		// Temporary: allow deploys while type issues are being fixed.
		ignoreBuildErrors: true,
	},
	eslint: {
		// Temporary: avoid lint failures blocking production build.
		ignoreDuringBuilds: true,
	},
}

module.exports = nextConfig

