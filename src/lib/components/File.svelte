<script lang="ts">
  import { requestApi } from "#lib/request-api.js"
  import type { StudentDocument } from "#lib/server/elevdok-api/get-student-documents.js"
  import LoadingSpinner from "./LoadingSpinner.svelte"
  import PDFViewer from "./PDFViewer.svelte"

  type Props = {
    file: StudentDocument["files"][number]
    document: StudentDocument
  }

  let { file, document }: Props = $props()

  let displayFile = $state(false)
  let fileLoading = $state(false)
  let errorMessage = $state("")
  let base64Data: string | undefined = $state()

  const getFileData = async () => {
    errorMessage = ""
    fileLoading = true
    const studentFeidenavnPrefix = document.feidenavn.substring(0, document.feidenavn.indexOf("@"))
    const result = await requestApi<string>(`/api/students/${studentFeidenavnPrefix}/source/${document.source}/file/${file.id}`)
    fileLoading = false
    if (!result.ok) {
      errorMessage = `Det oppstod en feil ved henting av fil: ${result.message}`
      return
    }
    base64Data = result.value
    displayFile = true
  }
</script>

<div class="fileContainer">
  {#if fileLoading}
    <button class="link" disabled><LoadingSpinner width={"1.5"} />{file.title}</button>
  {:else}
    {#if !file.canView}
      <span class="material-symbols-outlined">block</span><button class="link" disabled>{file.title}</button><span>Du har ikke tilgang til filen</span>
    {:else if (!file.isAvailable)}
      <span class="material-symbols-outlined">block</span><button class="link" disabled>{file.title}</button><span>Kun tilgjengelig i arkiv</span>
    {:else}
      <span class="material-symbols-outlined">picture_as_pdf</span><button class="link" onclick={() => {getFileData()}}>{file.title}</button>
    {/if}
  {/if}
</div>

{#if errorMessage}
  <div class="error-box">
    <h4>En feil har oppstått 😩</h4>
    <p>{errorMessage}</p>
  </div>
{/if}

<PDFViewer title={file.title} showPdf={displayFile} {base64Data} closePdf={() => {displayFile = false}} />


<style>
  .fileContainer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>