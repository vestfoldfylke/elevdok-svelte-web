// The package ships without types. Only the parts this app uses are declared.
declare module "vtfk-schools-info" {
  type SchoolInfo = {
    schoolNumber: string
    fullName: string
    shortName: string | null
  }

  type SchoolInfoFilter = {
    schoolNumber?: string
  }

  export default function vtfkSchoolsInfo(filter?: SchoolInfoFilter): SchoolInfo[]
}
