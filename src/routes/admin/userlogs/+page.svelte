<script lang="ts">
  import { onMount } from "svelte"
  import LoadingSpinner from "#lib/components/LoadingSpinner.svelte"
  import { prettyPrintDate } from "#lib/helpers/pretty-date.js"
  import { requestApi } from "#lib/request-api.js"
  import type { LogEntry, LogStudent, LogUser } from "#lib/server/elevdok-api/user-logs.js"

  /** A log entry as returned by the API, with the MongoDB id serialized */
  type LogElement = LogEntry & {
    _id: string
  }

  let errorMessage = $state("")
  let isLoading = $state(false)

  let hasSearchedStudents = $state(false)
  let studentSearchName = $state("")
  let selectedStudent: LogStudent | null = $state(null)
  let students: LogStudent[] | null = $state([])
  let studentErrorMessage = $state("")

  let hasSearchedUsers = $state(false)
  let userSearchName = $state("")
  let selectedUser: LogUser | null = $state(null)
  let users: LogUser[] | null = $state([])
  let userErrorMessage = $state("")

  let documentNumber = $state("")
  let selectedDocumentNumber: string | null = $state(null)
  let documentNumberErrorMessage = $state("")

  let logElements: LogElement[] = $state([])

  const getLogStudents = async (event: Event) => {
    event.preventDefault()
    studentErrorMessage = ""
    students = null
    const result = await requestApi<LogStudent[]>(`/api/admin/logstudents?${new URLSearchParams({ search_name: studentSearchName })}`)
    if (result.ok) {
      students = result.value
    } else {
      studentErrorMessage = result.message
      students = []
    }
    hasSearchedStudents = true
  }

  const getLogUsers = async (event: Event) => {
    event.preventDefault()
    userErrorMessage = ""
    users = null
    const result = await requestApi<LogUser[]>(`/api/admin/logusers?${new URLSearchParams({ search_name: userSearchName })}`)
    if (result.ok) {
      users = result.value
    } else {
      userErrorMessage = result.message
      users = []
    }
    hasSearchedUsers = true
  }

  const applyDocumentNumberFilter = async (event: Event) => {
    event.preventDefault()
    documentNumberErrorMessage = ""
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
    isLoading = true

    const filter = new URLSearchParams()
    if (selectedStudent) {
      filter.set("student_number", selectedStudent.elevnummer)
    }
    if (selectedUser) {
      filter.set("user_principal_id", selectedUser.principalId)
    }
    if (selectedDocumentNumber) {
      filter.set("document_number", selectedDocumentNumber)
    }

    const result = await requestApi<LogElement[]>(`/api/admin/logentries?${filter}`)
    if (result.ok) {
      logElements = result.value
    } else {
      errorMessage = result.message
      logElements = []
    }
    isLoading = false
  }

  onMount(async () => {
    await getLogElements()
  })
</script>

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
      <p>{studentErrorMessage}</p>
    </div>
  {:else if !students}
    <LoadingSpinner />
  {:else if Array.isArray(students)}
    {#if students.length === 0}
      {#if hasSearchedStudents}
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
      <p>{userErrorMessage}</p>
    </div>
  {:else if !users}
    <LoadingSpinner />
  {:else if Array.isArray(users)}
    {#if users.length === 0}
      {#if hasSearchedUsers}
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
      <button onclick={applyDocumentNumberFilter}><span class="material-symbols-outlined">add_circle</span> Legg til i filter</button>
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
{#if isLoading}
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
    <p>{errorMessage}</p>
  </div>
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