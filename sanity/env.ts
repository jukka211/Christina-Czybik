// The Sanity project the site and the Studio read from: set in .env.local,
// and in the Vercel project's environment variables (see README.md).
export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
)

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export const apiVersion = '2026-09-01'

function assertValue<T>(value: T | undefined, name: string): T {
  if (!value) throw new Error(`Missing environment variable ${name}, see README.md`)
  return value
}
