<script lang="ts">
  import axios from "axios"
  import { onMount } from "svelte"
  import LoadingSpinner from "#lib/components/LoadingSpinner.svelte"
  import { prettyPrintDate } from "#lib/helpers/pretty-date.js"
  import { sleep } from "#lib/helpers/sleep.js"
  import type { LogEntry, LogStudent, LogUser } from "#lib/server/elevdok-api/user-logs.js"
  import type { PageData } from "./$types"

  type Props = {
    data: PageData
  }

  /** A log entry as returned by the API, with the MongoDB id serialized */
  type LogElement = LogEntry & {
    _id: string
  }

  let { data }: Props = $props()

  let errorMessage: unknown = $state("")
  let searchValue
  let loading = $state(false)

  let initialStudentSearch = $state(false)
  let studentSearchName = $state("")
  let selectedStudent: LogStudent | null = $state(null)
  let students: LogStudent[] | null = $state([])
  let studentErrorMessage: unknown = $state("")

  let initialUserSearch = $state(false)
  let userSearchName = $state("")
  let selectedUser: LogUser | null = $state(null)
  let users: LogUser[] | null = $state([])
  let userErrorMessage: unknown = $state("")

  let documentNumber = $state("")
  let selectedDocumentNumber: string | null = $state(null)
  let documentNumberErrorMessage = $state("")

  let logElements: LogElement[] = $state([])

  const getLogStudents = async (event: Event) => {
    event.preventDefault()
    students = null
    try {
      const { data } = await axios.get(studentSearchName ? `/api/admin/logstudents?search_name=${studentSearchName}` : "/api/admin/logstudents")
      students = data
    } catch (error) {
      studentErrorMessage = (axios.isAxiosError(error) && error.response?.data) || String(error)
      students = []
    }
    initialStudentSearch = true
  }

  const getLogUsers = async (event: Event) => {
    event.preventDefault()
    users = null
    try {
      const { data } = await axios.get(userSearchName ? `/api/admin/logusers?search_name=${userSearchName}` : "/api/admin/logusers")
      users = data
    } catch (error) {
      userErrorMessage = (axios.isAxiosError(error) && error.response?.data) || String(error)
      users = []
    }
    initialUserSearch = true
  }

  const setDocumentNumber = async (event: Event) => {
    event.preventDefault()
    try {
      const documentNumberParts = documentNumber.split("/")
      if (documentNumberParts.length !== 2) {
        throw new Error("Dokumentnummeret må være på formatet 24/12345-3")
      }
      const secondParts = (documentNumberParts[1] ?? "").split("-")
      if (secondParts.length !== 2) {
        throw new Error("Dokumentnummeret må være på formatet 24/12345-2")
      }
      selectedDocumentNumber = documentNumber.trim()
    } catch (error) {
      documentNumberErrorMessage = String(error)
    }
  }

  const getLogElements = async () => {
    errorMessage = ""
    loading = true
    try {
      let url = "/api/admin/logentries"
      let addedQuery = false
      if (selectedStudent) {
        url += `?student_number=${selectedStudent.elevnummer}`
        addedQuery = true
      }
      if (selectedUser) {
        url += `${addedQuery ? "&" : "?"}user_principal_id=${selectedUser.principalId}`
        addedQuery = true
      }
      if (selectedDocumentNumber) {
        url += `${addedQuery ? "&" : "?"}document_number=${selectedDocumentNumber}`
        addedQuery = true
      }
      const { data } = await axios.get(url)
      logElements = data
    } catch (error) {
      errorMessage = (axios.isAxiosError(error) && error.response?.data) || String(error)
      logElements = []
    }
    loading = false
  }

  onMount(async () => {
    await getLogElements()
  })
</script>

{#if data.user.hasAdminRole}
  <h2>Administrator</h2>
  <h3>Se og søk i brukerlogger</h3>

  <h3>Filter</h3>
  <p>Du kan bruke et filter, eller en kombinasjon av flere</p>

  <!--Elevsøk-->
  {#if !selectedStudent}
    <div><strong>Velg en elev</strong></div>
    <form>
      <div class="button-input">
        <input bind:value={studentSearchName} id="studentSearch" type="text" placeholder="Søk etter elevens navn" />
        <button onclick={getLogStudents}><span class="material-symbols-outlined">search</span> Søk</button>
      </div>
    </form>
    {#if studentErrorMessage}
      <div class="error">
        <p>Det skjedde en feil 😩</p>
        <p>{JSON.stringify(studentErrorMessage)}</p>
      </div>
    {:else if !students}
      <LoadingSpinner />
    {:else if Array.isArray(students)}
      {#if students.length === 0}
        {#if initialStudentSearch}
          <div><i>Ingen elever funnet med navn {studentSearchName}</i></div>
        {/if}
      {:else}
        <div class="searchResult">
          {#each students as student}
            <button class="link" onclick={() => selectedStudent = student}><span class="material-symbols-outlined">person</span>{student.name} ({student.feidenavn})</button>
          {/each}
        </div>
      {/if}
    {:else}
      <div>What</div>
    {/if}
  {:else}
    <div><strong>Valgt elev</strong></div>
    <div class="searchResult">
      <button class="link" onclick={() => selectedStudent = null}><span class="material-symbols-outlined">close</span>{selectedStudent.name} ({selectedStudent.feidenavn})</button>
    </div>
  {/if}
  
  <!--Ansatte søk-->
  {#if !selectedUser}
    <div><strong>Velg en ansatt</strong></div>
    <form>
      <div class="button-input">
        <input bind:value={userSearchName} id="userSearch" type="text" placeholder="Søk etter ansattes navn" />
        <button onclick={getLogUsers}><span class="material-symbols-outlined">search</span> Søk</button>
      </div>
    </form>
    <!-- Hvis jeg bruker en await - og bare bytter en variabel awaiten er avhengig av, så slipper jeg alle state variablene?-->
    {#if userErrorMessage}
      <div class="error">
        <p>Det skjedde en feil 😩</p>
        <p>{JSON.stringify(userErrorMessage)}</p>
      </div>
    {:else if !users}
      <LoadingSpinner />
    {:else if Array.isArray(users)}
      {#if users.length === 0}
        {#if initialUserSearch}
          <div><i>Ingen ansatte funnet med navn {userSearchName}</i></div>
        {/if}
      {:else}
        <div class="searchResult">
          {#each users as user}
            <button class="link" onclick={() => selectedUser = user}><span class="material-symbols-outlined">person</span>{user.name} ({user.principalName})</button>
          {/each}
        </div>
      {/if}
    {:else}
      <div>What</div>
    {/if}
  {:else}
    <div><strong>Valgt ansatt</strong></div>
    <div class="searchResult">
      <button class="link" onclick={() => selectedUser = null}><span class="material-symbols-outlined">close</span>{selectedUser.name} ({selectedUser.principalName})</button>
    </div>
  {/if}

    <!--Dokumentnummer filter-->
    {#if !selectedDocumentNumber}
    <div><strong>Arkiv-dokumentnummer</strong></div>
    <form>
      <div class="button-input">
        <input bind:value={documentNumber} id="documentNumber" type="text" placeholder="eks. 24/12345-2" />
        <button onclick={setDocumentNumber}><span class="material-symbols-outlined">add_circle</span> Legg til i filter</button>
      </div>
    </form>
    {#if documentNumberErrorMessage}
      <div class="error">
        <p>{JSON.stringify(documentNumberErrorMessage)}</p>
      </div>
    {/if}
  {:else}
    <div><strong>Valgt dokumentnummer</strong></div>
    <div class="searchResult">
      <button class="link" onclick={() => selectedDocumentNumber = null}><span class="material-symbols-outlined">close</span>{selectedDocumentNumber}</button>
    </div>
  {/if}
  <br>
  <button class="filled" onclick={() => getLogElements()}>Søk i logger med valgt filter</button>
  <br />
  <div><strong>Logger</strong></div>
  {#if loading}
    <LoadingSpinner />
  {:else}
    <i>Viser {logElements.length} logg-elementer</i>
    {#each logElements as logElement}
      <div class="logElement">
        <div><strong>Logg-id</strong>: {logElement._id}</div>
        <div><strong>Dato</strong>: {prettyPrintDate(logElement.timestamp, true)}</div>
        <div><strong>Bruker</strong>: {logElement.user.name} ({logElement.user.principalName}) ({logElement.user.principalId}) ({logElement.user.role})</div>
        {#if logElement.user.impersonating}
          <div><strong>ADMIN logget inn som</strong>: {logElement.user.impersonating.target}</div>
        {/if}
        <div><strong>Elev</strong>: {logElement.student.name} ({logElement.student.feidenavn})</div>
        <div><strong>Tilgangstype</strong>: {logElement.accessType}</div>
        <div><strong>Handling</strong>: {logElement.action}</div>
        {#if logElement.file}
          <div><strong>Fil</strong>: {logElement.file.title} - {logElement.file.documentNumber} - ({logElement.file.sourceId})</div>
        {/if}
      </div>
    {/each}
  {/if}
  {#if errorMessage}
    <div class="error">
      <p>Det har skjedd en feil 😩</p>
      <p>{JSON.stringify(errorMessage)}</p>
    </div>
  {/if}
{:else}
  Du har ikke tilgang på denne siden
{/if}

<style>
  .logElement {
    padding: 1rem 1rem;
  }
  .logElement:nth-child(even) {
		background-color: var(--primary-color-10);
	}
  .searchResult {
    padding: 1rem;
  }
  .error {
    color: var(--error-color);
  }
</style>