// A photo as the site uses it: its Sanity CDN URL and its width / height.
export type Photo = {
  url: string
  aspect: number | null
}

// Sanity's image CDN scales and converts a photo on request, from parameters
// on its URL (https://www.sanity.io/docs/image-urls). auto=format serves
// AVIF or WebP to browsers that take them.
export function sanityImageUrl(url: string, params: Record<string, string | number>) {
  const query = new URLSearchParams({ auto: 'format' })
  Object.entries(params).forEach(([key, value]) => query.set(key, String(value)))
  return `${url}?${query}`
}
