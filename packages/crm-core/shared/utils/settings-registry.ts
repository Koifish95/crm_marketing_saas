export type SettingsSection = {
  id: string
  to: string
  title: string
  description: string
  order: number
}

const sections = new Map<string, SettingsSection>()

export function registerSettingsSections(next: readonly SettingsSection[]) {
  for (const section of next) {
    sections.set(section.id, section)
  }
}

export function listSettingsSections() {
  return [...sections.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}
