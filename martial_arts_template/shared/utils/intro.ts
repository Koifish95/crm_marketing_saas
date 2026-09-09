export const BOOKING_HORIZON_DAYS = 14

export const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const

export const KIDS_AGE_BANDS = [
  { key: 'ninjas', label: 'Ninjas (ages 4–7)', min: 4, max: 7 },
  { key: 'samurai', label: 'Samurai (ages 8–11)', min: 8, max: 11 },
  { key: 'future-champs', label: 'Future Champs (ages 12–16)', min: 12, max: 16 },
] as const

export const INTRO_EXCEPTION_KINDS = ['CLOSE_DATE', 'CLOSE_RULE', 'OPEN_SLOT'] as const

export type IntroExceptionKind = typeof INTRO_EXCEPTION_KINDS[number]

export function kidsBandForAge(age: number) {
  return KIDS_AGE_BANDS.find(band => age >= band.min && age <= band.max) ?? null
}

export function slotMatchesAge(age: number | null | undefined, ageMin: number | null | undefined, ageMax: number | null | undefined) {
  if (age == null) {
    return ageMin == null && ageMax == null
  }
  if (ageMin != null && age < ageMin) {
    return false
  }
  if (ageMax != null && age > ageMax) {
    return false
  }
  return true
}
