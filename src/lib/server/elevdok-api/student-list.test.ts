import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { FintGruppeElev } from "#lib/server/fintfolk-api/types.ts"
import type { ElevKlasse, MiniSchool } from "./get-user-data.ts"
import { buildStudentList, type StudentMembership } from "./student-list.ts"

const mordor: MiniSchool = { kortkortnavn: "MRD", skolenummer: "12345", kortnavn: "OF-MRD", navn: "Mordor videregående skole" }
const hobbiton: MiniSchool = { kortkortnavn: "HOB", skolenummer: "12346", kortnavn: "OF-HOB", navn: "Hobbittun videregående skole" }
const basisgruppe: ElevKlasse = { navn: "2BU", type: "basisgruppe", systemId: "1472079", fag: [] }
const kroppsoving: ElevKlasse = { navn: "2PI/KRO1018", type: "undervisningsgruppe", systemId: "12041923", fag: [{ systemId: { identifikatorverdi: "KRO1018" } }] }
const iopGruppe: ElevKlasse = { navn: "1ALA/IOP4000/1", type: "undervisningsgruppe", systemId: "120419277", fag: [{ systemId: { identifikatorverdi: "IOP4000" } }] }

const noMaskNoIop = { shouldMaskSsn: false, isIopEnabled: false }

const createElev = (overrides: Partial<FintGruppeElev> = {}): FintGruppeElev => ({
  navn: "Frodo Baggins",
  fornavn: "Frodo",
  etternavn: "Baggins",
  feidenavn: "fro12345@fylke.no",
  elevnummer: "1234568",
  fodselsnummer: "12345678911",
  ...overrides
})

const membership = (school: MiniSchool, klasse: ElevKlasse | null, elevOverrides: Partial<FintGruppeElev> = {}): StudentMembership => ({ elev: createElev(elevOverrides), school, klasse })

describe("buildStudentList", () => {
  it("gives a student met once the school and the class", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe)], noMaskNoIop)

    assert.deepEqual(students[0]?.skoler, [{ ...mordor, kontaktlarer: false, klasser: [basisgruppe] }])
  })

  it("collects the classes of a student at the same school", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe), membership(mordor, kroppsoving)], noMaskNoIop)

    assert.deepEqual(students[0]?.skoler[0]?.klasser, [basisgruppe, kroppsoving])
  })

  it("adds a class only once", () => {
    const { students } = buildStudentList([membership(mordor, kroppsoving), membership(mordor, kroppsoving)], noMaskNoIop)

    assert.deepEqual(students[0]?.skoler[0]?.klasser, [kroppsoving])
  })

  it("gives a student met at two schools one entry with both schools, in the order they were met", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe), membership(hobbiton, kroppsoving)], noMaskNoIop)

    assert.equal(students.length, 1)
    assert.deepEqual(
      students[0]?.skoler.map((school) => school.skolenummer),
      ["12345", "12346"]
    )
  })

  it("gives a school without classes for a membership without a class", () => {
    const { students } = buildStudentList([membership(mordor, null), membership(mordor, null)], noMaskNoIop)

    assert.deepEqual(students[0]?.skoler, [{ ...mordor, kontaktlarer: false, klasser: [] }])
  })

  it("marks a school as kontaktlarer when any membership at that school is", () => {
    const { students } = buildStudentList([membership(mordor, kroppsoving), membership(mordor, basisgruppe, { kontaktlarer: true })], noMaskNoIop)

    assert.equal(students[0]?.skoler[0]?.kontaktlarer, true)
  })

  it("marks kontaktlarer only on the school where the membership is", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe, { kontaktlarer: true }), membership(hobbiton, kroppsoving)], noMaskNoIop)

    assert.deepEqual(
      students[0]?.skoler.map((school) => school.kontaktlarer),
      [true, false]
    )
  })

  it("leaves out students without feidenavn and reports their elevnummer", () => {
    const { students, skippedElevnummer } = buildStudentList([membership(mordor, basisgruppe), membership(mordor, basisgruppe, { feidenavn: null, elevnummer: "9999999" })], noMaskNoIop)

    assert.deepEqual(
      students.map((student) => student.elevnummer),
      ["1234568"]
    )
    assert.deepEqual(skippedElevnummer, ["9999999"])
  })

  it("masks all but the first six digits of the ssn when asked", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe)], { shouldMaskSsn: true, isIopEnabled: false })

    assert.equal(students[0]?.fodselsnummer, "123456*****")
  })

  it("keeps the full ssn when not asked to mask it", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe)], noMaskNoIop)

    assert.equal(students[0]?.fodselsnummer, "12345678911")
  })

  it("removes kontaktlarer from the student, since it belongs to each school", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe, { kontaktlarer: true })], noMaskNoIop)

    assert.equal("kontaktlarer" in (students[0] ?? {}), false)
  })

  it("marks only the schools with an IOP course when IOP is enabled", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe), membership(hobbiton, iopGruppe)], { shouldMaskSsn: false, isIopEnabled: true })

    assert.deepEqual(
      students[0]?.skoler.map((school) => school.iop),
      [false, true]
    )
  })

  it("does not mark schools with iop when IOP is disabled", () => {
    const { students } = buildStudentList([membership(hobbiton, iopGruppe)], noMaskNoIop)

    assert.equal("iop" in (students[0]?.skoler[0] ?? {}), false)
  })

  it("adds feidenavnPrefix as the feidenavn before @", () => {
    const { students } = buildStudentList([membership(mordor, basisgruppe)], noMaskNoIop)

    assert.equal(students[0]?.feidenavnPrefix, "fro12345")
  })

  it("sorts students by name", () => {
    const memberships = [
      membership(mordor, basisgruppe, { navn: "Sarumann Sauronsen", elevnummer: "3" }),
      membership(mordor, basisgruppe, { navn: "Elev Elevesen", elevnummer: "1" }),
      membership(mordor, basisgruppe, { navn: "Gollum Smeagol", elevnummer: "2" })
    ]

    const { students } = buildStudentList(memberships, noMaskNoIop)

    assert.deepEqual(
      students.map((student) => student.navn),
      ["Elev Elevesen", "Gollum Smeagol", "Sarumann Sauronsen"]
    )
  })
})
