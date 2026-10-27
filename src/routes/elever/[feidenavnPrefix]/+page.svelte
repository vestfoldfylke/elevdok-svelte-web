<script lang="ts">
  import Document from "#lib/components/Document.svelte"
  import LoadingSpinner from "#lib/components/LoadingSpinner.svelte"
  import Pagination from "#lib/components/Pagination.svelte"
  import type { StudentDocument } from "#lib/server/elevdok-api/get-student-documents.js"
  import { goto } from "$app/navigation"
  import { page } from "$app/state"
  import type { PageData } from "./$types"

  type Props = {
    data: PageData
  }

  let { data }: Props = $props()

  const student = $derived((data.students ?? []).find((teacherStudent) => teacherStudent.feidenavnPrefix === page.params.feidenavnPrefix))

  let isArchiveWarningVisible = $state(true)
  let documentsPerPage = 10
  let currentPage = $state(0) // zero-indexed
  let searchValue = $state("")

  const nextPage = () => {
    currentPage++
  }

  const previousPage = () => {
    currentPage--
  }

  const gotoPage = (pageNumber: number) => {
    currentPage = pageNumber
  }

  const matchesSearch = (document: StudentDocument, searchValue: string): boolean => {
    const normalizedSearch = searchValue.toLowerCase()
    return document.title.toLowerCase().startsWith(normalizedSearch) || document.documentNumber.toLowerCase().startsWith(normalizedSearch) || document.title.toLowerCase().includes(normalizedSearch)
  }

  const originalDocuments = $derived(data.studentDocuments.documents)
  const documents = $derived(originalDocuments.filter((document) => matchesSearch(document, searchValue)))
</script>

<h2>Elevens dokumenter</h2>

<div>
  {#if data.studentDocuments.errors.length > 0 && isArchiveWarningVisible}
    <div class="error-box">
      <div style="display:flex;justify-content:space-between;">
        <h4>Det skjedde en feil under hentingen av elevens dokumenter 😩</h4>
        <button class="link" onclick={() => {isArchiveWarningVisible = false}}>Lukk</button>
      </div>
      <div>
        {#each data.studentDocuments.errors as error}
          <p>• Feil: {error}</p>
        {/each}
      </div>
    </div>
    <br />
  {/if}

  <div class="icon-input" style="width: 16rem;">
    <span class="material-symbols-outlined">search</span>
    <input type="text" bind:value={searchValue} oninput={() => { currentPage = 0 }} placeholder="Søk etter tittel eller dokumentnummer" />
  </div>

  {#if originalDocuments.length === 0}
    <br />
    Fant ingen dokumenter for eleven 🤷‍♂️
  {:else if documents.length === 0}
    <br />
    Fant ingen dokumenter med søket
  {:else}
    {#each documents.slice(currentPage * documentsPerPage, (currentPage * documentsPerPage) + documentsPerPage) as document, index}
      <Document {document} currentIndex={index} open={false} />
    {/each}

    <Pagination {currentPage} elementName={'dokumenter'} elementsPerPage={documentsPerPage} maxPageNumbers={11} {gotoPage} {nextPage} {previousPage} numberOfElements={documents.length} />
  {/if}    
</div>
