import type { PortableTextBlock } from 'next-sanity'

// The site's texts that aren't a project's or a category's: the Info panel
// and the homepage's footer (Info & Kontakt), and the Impressum &
// Datenschutz page. Each is one document in the Studio, with a fixed ID
// (see structure.ts), and starts out as the texts below, which the site
// had before they were in the Studio: the Studio fills them in as the
// document's starting values (schemaTypes/site-info.ts and legal.ts), and
// the site shows them until the document has been published (fetch.ts).

export const SITE_INFO_ID = 'siteInfo'
export const LEGAL_ID = 'legal'

// Text with paragraphs, line breaks and links, and in the Datenschutz
// bullet lists too, as Sanity stores it (Portable Text).
export type RichText = PortableTextBlock[]

export type SiteInfo = {
  info: string | null
  phone: string | null
  email: string | null
  instagram: string | null
  clients: string[] | null
  bio: RichText | null
  footerInfo: string | null
}

// The Datenschutz: its sections, each a heading and its text.
export type Legal = {
  impressum: RichText | null
  datenschutz: { _type?: 'section'; _key: string; title: string | null; body: RichText | null }[] | null
}

// --- Building the texts below -------------------------------------------------

type Part = string | { text: string; href: string }
type BlockSpec = { parts: Part[]; bullet: boolean }

// A paragraph, or a bullet point, of text ('\n' a line break) and links.
const p = (...parts: Part[]): BlockSpec => ({ parts, bullet: false })
const li = (...parts: Part[]): BlockSpec => ({ parts, bullet: true })
const link = (text: string, href: string) => ({ text, href })

// Portable Text from them. Every block, span and link has a key of its own
// (Sanity wants one on everything in a list); keyPrefix keeps a field's
// keys apart from another's.
function richText(keyPrefix: string, specs: BlockSpec[]): RichText {
  return specs.map((spec, blockIndex) => {
    const markDefs: { _type: 'link'; _key: string; href: string }[] = []
    const children = spec.parts.map((part, partIndex) => {
      if (typeof part === 'string') return { _type: 'span', _key: `s${partIndex}`, text: part, marks: [] }
      markDefs.push({ _type: 'link', _key: `l${partIndex}`, href: part.href })
      return { _type: 'span', _key: `s${partIndex}`, text: part.text, marks: [`l${partIndex}`] }
    })
    return {
      _type: 'block',
      _key: `${keyPrefix}${blockIndex}`,
      style: 'normal',
      markDefs,
      children,
      ...(spec.bullet ? { listItem: 'bullet', level: 1 } : {}),
    }
  })
}

// --- The texts ------------------------------------------------------------------

export const DEFAULT_SITE_INFO: SiteInfo = {
  info: 'Christina Czybik\nPHOTOGRAPHER and Photo Editor',
  phone: '0049 (0) 1724040642',
  email: 'request@christinaczybik.com',
  instagram: 'christinaczybik',
  clients: [
    'Bundespresseamt',
    'Deutscher Bundestag',
    'Bundeskanzleramt',
    'BMWK/BMWE',
    'AA,\u00a0BMWSB',
    'BMI',
    'BMBF/BMFTR',
    'DSEE',
    'BGHM',
    'Landesvertretung NRW',
    'SPD',
    'VBKI',
    'Steinway&Sons',
    'Schwarzkopf',
    'ADC',
    'Hamburger Hochbahn',
    'Hermes',
    'Cargill',
    'Zeppelin',
    'Wild auf Wild',
    'Edel Books',
    'Hirschen Group',
    'Vagedes & Schmid',
    'familie redlich',
    'neues handeln',
    'Filmfest München',
  ],
  bio: richText('bio', [
    p('Ich bin freiberufliche Fotografin aus Hamburg mit 25 Jahren Erfahrung in den Bereichen Politik, Event, Reportage und Zeitgeschehen. Meine Schwerpunkte sind die dokumentarische Fotografie, Pressefotografie, Eventdokumentationen für Unternehmen und Verbände sowie die politische Kommunikation.\nAls leitende Fotoredakteurin bei großen Pressebildagenturen in Hamburg und Los Angeles verantwortete ich die Durchführung von Fotoshootings, die Koordination von Fotografenteams und das Management von Bildrechten.\nIch bin Gesellschafterin und Geschäftsführerin der im Januar 2026 gegründeten Czybik & Schmid Media UG (haftungsbeschränkt) und halte als Rahmenvertragspartnerin beim Bund Veranstaltungen für Ministerien und Bundesbehörden fotografisch fest. Bei der Begleitung von Ministerinnen und Ministern auf Auslandsreisen, Pressereisen oder Veranstaltungen erfasse ich die Nuancen des Geschehens und stelle komplexe Themen insbesondere für Social Media visuell dar.'),
    p('Ich lege großen Wert darauf, eine verlässliche Quelle zu sein und Geschehnisse auf journalistischen Grundlagen wiederzugeben. Besonders in sozialen Medien sehe ich eine Chance, Inhalte schnell und direkt an ein breites Publikum zu transportieren.\nNeben meiner Arbeit auf dem politischen Parkett und im PR Segment von Veranstaltungen widme ich mich regelmäßig freien Fotoprojekten, die mich oft an ungewöhnliche Orte führen. Sie bieten Raum für langfristige, persönliche Dokumentationen, die die leisen, unbeachteten Details des Alltags ins Zentrum rücken.'),
  ]),
  footerInfo: 'Christina Czybik\nPHOTOGRAPHER & Photo Editor\nHamburg / Bundesweit',
}

export const DEFAULT_LEGAL: Legal = {
  impressum: richText('impressum', [
    p('Angaben gemäß § 5 TMG:'),
    p('Christina Czybik\nFotojournalistin und Fotoredakteurin\nOchsenweberstraße 19\n22419 Hamburg'),
    p('Kontakt:\nTelefon: ', link('+491724040642', 'tel:+491724040642'), '\nE-Mail: ', link('request@christinaczybik.com', 'mailto:request@christinaczybik.com')),
    p('Umsatzsteuer-ID gemäß §27 a Umsatzsteuergesetz: DE297486546'),
    p('Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:\nChristina Czybik'),
  ]),
  datenschutz: [
    {
      _type: 'section',
      _key: 'section0',
      title: 'Datenverarbeitungen bei Nutzung dieser Webseiten',
      body: richText(`section0-`, [
        p('Datenverarbeitungen bei Nutzung dieser Webseiten'),
        p('Wir verarbeiten Ihre personenbezogenen Daten folgendermaßen:'),
        p('Technische Bereitstellung der Webseiten'),
        p('Um Ihnen die Webseiten technisch bereitstellen zu können, erfasst unser Webserver bei jedem Aufruf automatisiert Informationen von Ihrem Browser. Dazu gehören vor allem diese Angaben:'),
        li('IP-Adresse'),
        li('aufgerufene Dateien'),
        li('Datum und Uhrzeit des Zugriffs'),
        li('Adresse der Herkunfts-Webseite (Referrer)'),
        li('Speicherung von und Zugriff auf Cookies'),
        li('Aktivierung von Javascript'),
        li('Browsertyp und Browserversion'),
        li('verwendetes Betriebssystem'),
        li('Bildschirmauflösung'),
        p('Wir müssen Ihre IP-Adresse zumindest vorübergehend verarbeiten, damit unsere Webseiten-Inhalte an Ihren Browser ausgeliefert werden können.'),
        p('Diese Daten werden getrennt von anderen Daten, die Sie unter Umständen an uns übermitteln, gespeichert und nicht mit Daten aus anderen Quellen zusammengeführt.'),
        p('Grundlage für die Datenverarbeitung ist Art. 6 Abs. 1 Buchst. f DSGVO, der die Verarbeitung von Daten auf Grund berechtigter Interessen gestattet. In diesem Fall besteht ein berechtigtes Interesse an einem sicheren und störungsfreien Betrieb des Webservers. Um diesen sicherzustellen, muss die Administration über Serverlogfiles Angriffe und Fehlfunktionen des Systems erkennen und nachvollziehen können. Um Angriffsmuster erkennen zu können, werden Zugriffe auf den Server gespeichert. Die Daten werden nach 7 Tagen gelöscht. Die Daten stehen aus technischen Gründen dem Hosting-Dienstleister zur Verfügung, der uns gegenüber jedoch weisungsgebunden und vertraglich verpflichtet ist.'),
      ]),
    },
    {
      _type: 'section',
      _key: 'section1',
      title: 'Kontaktformular',
      body: richText(`section1-`, [
        p('Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Formular zur Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns verarbeitet.\nPflichtfelder sind entsprechend gekennzeichnet. Das Ausfüllen von Pflichtfeldern ist notwendig, damit wir Ihre Anfragen beantworten und verarbeiten können. Im Übrigen sind Ihre Angaben freiwillig.\nDie Verarbeitung der in das Kontaktformular eingegebenen Daten erfolgt auf Grundlage Ihrer Einwilligung. Sie können diese Einwilligung jederzeit widerrufen. Ein Widerruf gilt nur für die Zukunft. Sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist, erfolgt die Datenverarbeitung auf Grundlage von Art. 6 Abs. 1 Buchst. b DSGVO. In den übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 Buchst. f DSGVO).\nAn Dritte geben wir Ihre Daten nicht ohne Ihre Einwilligung oder ohne eine andere zulässige Rechtsgrundlage weiter. Es ist nicht auszuschließen, dass unsere technischen Dienstleister Einblick erhalten können; sie sind jedoch zur Verschwiegenheit verpflichtet.\nDie von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z.B. nach abgeschlossener Bearbeitung Ihrer Anfrage). Zwingende gesetzliche Bestimmungen – insbesondere Aufbewahrungsfristen – bleiben unberührt.'),
      ]),
    },
    {
      _type: 'section',
      _key: 'section2',
      title: 'Ihre Rechte',
      body: richText(`section2-`, [
        li('nach Art. 15 DSGVO Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu verlangen. Insbesondere können Sie Auskunft über die Verarbeitungszwecke, die Kategorie der personenbezogenen Daten, die Kategorien von Empfängern, gegenüber denen Ihre Daten offengelegt wurden oder werden, die geplante Speicherdauer, das Bestehen eines Rechts auf Berichtigung, Löschung, Einschränkung der Verarbeitung oder Widerspruch, das Bestehen eines Beschwerderechts, die Herkunft Ihrer Daten, sofern diese nicht bei uns erhoben wurden, sowie über das Bestehen einer automatisierten Entscheidungsfindung einschließlich Profiling und gegebenenfalls aussagekräftiger Informationen zu deren Einzelheiten verlangen;'),
        li('nach Art. 16 DSGVO unverzüglich die Berichtigung unrichtiger oder die Vervollständigung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen;'),
        li('nach Art. 17 DSGVO die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen, soweit nicht die Verarbeitung zur Ausübung des Rechts auf freie Meinungsäußerung und Information, zur Erfüllung einer rechtlichen Verpflichtung, aus Gründen des öffentlichen Interesses oder zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen erforderlich ist;'),
        li('nach Art. 18 DSGVO die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen, soweit die Richtigkeit der Daten von Ihnen bestritten wird, die Verarbeitung unrechtmäßig ist, Sie aber deren Löschung ablehnen und wir die Daten nicht mehr benötigen, Sie diese jedoch zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen benötigen oder Sie gemäß Art. 21 DSGVO Widerspruch gegen die Verarbeitung eingelegt haben;'),
        li('nach Art. 20 DSGVO Ihre personenbezogenen Daten, die Sie uns bereitgestellt haben, in einem strukturierten, gängigen und maschinenlesebaren Format zu erhalten oder die Übermittlung an einen anderen Verantwortlichen zu verlangen;'),
        li('nach Art. 21 DSGVO Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten einzulegen, sofern dafür Gründe vorliegen, die sich aus Ihrer besonderen Situation ergeben, sowie Widerspruch gegen Direktwerbung einzulegen;'),
        li('nach Art. 7 Abs. 3 DSGVO eine einmal erteilte Einwilligung jederzeit gegenüber uns zu widerrufen. Dies hat zur Folge, dass wir die Datenverarbeitung, die auf dieser Einwilligung beruhte, für die Zukunft nicht mehr fortführen dürfen;'),
        li('nach Art. 77 DSGVO sich bei einer Aufsichtsbehörde zu beschweren. In der Regel können Sie sich hierfür an die Aufsichtsbehörde Ihres üblichen Aufenthaltsortes oder unseres Unternehmenssitzes wenden.'),
      ]),
    },
  ],
}
