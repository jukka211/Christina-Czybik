// Christina's e-mail address, and the link every "E-Mail" on the site uses:
// it opens the visitor's mail app with a subject and the start of a message
// already filled in.
export const EMAIL = 'request@christinaczybik.com'

const SUBJECT = 'Anfrage'
const BODY = 'Hallo,\n\nich würde Sie gern für folgendes Projekt anfragen:\n\n'

export const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`
