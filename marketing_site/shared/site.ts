export const companyName = 'Strategic Insights Consulting'
export const platformName = 'Nuxxion'
export const productName = 'Nuxxion Martial Arts'

export const companyLine = 'Nuxxion is developed and operated by Strategic Insights Consulting.'

export const nav = [
  { label: 'Product', to: '/product' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'About', to: '/about' },
] as const

export const workflow = [
  { title: 'Inquiry', text: 'Someone asks about training. Staff can enter the household, or the family can request a trial online when that page is turned on.' },
  { title: 'Household', text: 'The contact and each prospective member stay together. A guardian can hold more than one person, and an adult can be their own contact.' },
  { title: 'Trial', text: 'Each intro is its own scheduled attempt, tied to one person and one program.' },
  { title: 'Confirmation', text: 'A follow-up call is the work of confirming that the intro is still happening.' },
  { title: 'Attendance', text: 'Staff record attended, no-show, or cancelled. The household does not collapse into one person’s result.' },
  { title: 'Follow-up', text: 'Open calls show who still needs attention: confirmation, event follow-up, or a manual callback.' },
  { title: 'Joined or lost', text: 'Each person is marked joined or lost. Joined is a staff decision. Membership billing stays in the academy’s existing system.' },
] as const

export const outcomes = [
  {
    eyebrow: 'Follow-up',
    title: 'Know what needs attention',
    text: 'The dashboard and follow-up list show which households still need a call, which intros are coming up, and which people have already joined or been lost.',
    image: '/product/follow-up.png',
    alt: 'Nuxxion Martial Arts follow-up list showing open confirmation and conversion calls.',
  },
  {
    eyebrow: 'Households',
    title: 'Keep the family with the inquiry',
    text: 'A lead is a household, not a single name in a spreadsheet. Each prospective member has a program, a trial history, and their own joined or lost outcome.',
    image: '/product/household.png',
    alt: 'Nuxxion Martial Arts household workspace with a guardian and prospective members.',
  },
  {
    eyebrow: 'Attribution',
    title: 'See what produces members',
    text: 'Campaigns, sources, and reports stay on the inquiry. Staff can see which effort produced the trial and which people joined, without treating that number as cash collected.',
    image: '/product/reports.png',
    alt: 'Nuxxion Martial Arts report showing acquisition results by source.',
  },
] as const

export const heroImage = {
  src: '/product/dashboard.png',
  alt: 'Nuxxion Martial Arts dashboard with household and follow-up counts.',
}

export const faqs = [
  {
    question: 'Does Nuxxion replace my gym-management software?',
    answer: 'No. Nuxxion Martial Arts is the acquisition workflow in front of the system you already use for billing, waivers, and day-to-day member operations.',
  },
  {
    question: 'Can families schedule trials online?',
    answer: 'Yes, when you turn on the public trial page. A family picks an available intro. That submission creates a new household. It does not silently merge with an existing one.',
  },
  {
    question: 'Can several family members stay under one household?',
    answer: 'Yes. The household holds the contact. Each prospective member is a separate person with a program, trial history, and their own joined or lost result.',
  },
  {
    question: 'Can I see where inquiries came from?',
    answer: 'Yes. Campaigns, events, and sources can be recorded on the household. Reports show which of those efforts produced trials and joins.',
  },
  {
    question: 'Does Nuxxion send texts or email?',
    answer: 'No. It does not send SMS, email, or WhatsApp. Staff make the confirmation and conversion calls themselves and record the outcome in the follow-up list.',
  },
  {
    question: 'What happens when someone joins?',
    answer: 'Staff mark that person joined and record the membership rate you choose to track. Nuxxion does not charge a card or create a membership. Billing continues in your existing system.',
  },
  {
    question: 'Is one academy’s data mixed with another’s?',
    answer: 'No. Each academy environment has its own database and files. Staff at one academy cannot open another academy’s records.',
  },
  {
    question: 'How do I get started?',
    answer: 'Request a demo. We review the academy and contact you to arrange a walkthrough. There is no self-service signup on this site.',
  },
] as const

export const pages = [
  { path: '/', title: 'Nuxxion Martial Arts', description: 'Turn more martial arts inquiries into members. Nuxxion Martial Arts is the acquisition CRM for trials, follow-up, and conversion.' },
  { path: '/product', title: 'Product', description: 'Nuxxion Martial Arts keeps inquiries, trials, follow-up, and joins in one operating workflow for martial arts academies.' },
  { path: '/how-it-works', title: 'How it works', description: 'From inquiry to trial, confirmation, attendance, follow-up, and joined or lost. The martial arts acquisition workflow in Nuxxion.' },
  { path: '/about', title: 'About', description: 'Nuxxion is software for practical acquisition work. Nuxxion Martial Arts is developed and operated by Strategic Insights Consulting.' },
  { path: '/demo', title: 'Request a demo', description: 'Request a walkthrough of Nuxxion Martial Arts. We will contact you to arrange it.' },
  { path: '/privacy', title: 'Privacy', description: 'Draft privacy notice for the Nuxxion marketing site and demo request form.' },
  { path: '/terms', title: 'Terms', description: 'Draft terms for the Nuxxion marketing site. Requesting a demo is not a customer agreement.' },
] as const
