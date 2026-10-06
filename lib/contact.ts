// The links the site makes of the contact details typed into the Studio's
// "Info & Kontakt" (the Info panel and the homepage's footer, see
// components/ContactLines.tsx), and of e-mail links in its texts.

const SUBJECT = 'Anfrage'
const BODY = 'Hallo,\n\nich würde Sie gern für folgendes Projekt anfragen:\n\n'

// Opens the visitor's mail app with a subject and the start of a message
// already filled in.
export function getMailtoHref(email: string) {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`
}

// A phone number as it's shown ("0049 (0) 1724040642") as a link to call
// it ("tel:+491724040642"): the (0) left out, a leading 00 written as +,
// and nothing but the digits otherwise.
export function getTelHref(phone: string) {
  const number = phone.replace(/\(0\)/g, '').replace(/[^\d+]/g, '')
  return `tel:${number.replace(/^00/, '+')}`
}

// An Instagram name, typed with or without its @, or even as the profile's
// address.
export function getInstagramHandle(value: string) {
  return value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
}

export function getInstagramHref(handle: string) {
  return `https://www.instagram.com/${handle}/`
}
