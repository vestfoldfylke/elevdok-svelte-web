export const prettyPrintDate = (date: string | number | Date, includeTime = false): string => {
  if (includeTime) {
    return new Date(date).toLocaleDateString("nb-NO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
  } else {
    return new Date(date).toLocaleDateString("nb-NO", { day: "2-digit", month: "long", year: "numeric" })
  }
}
