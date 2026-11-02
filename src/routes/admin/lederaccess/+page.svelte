<script lang="ts">
  import { onMount } from "svelte"
  import LoadingSpinner from "#lib/components/LoadingSpinner.svelte"
  import { requestApi } from "#lib/request-api.js"
  import type { SchoolAccess } from "#lib/server/elevdok-api/leder-access.js"

  let errorMessage = $state("")
  let isLoading = $state(false)

  let schoolAccess: SchoolAccess[] = $state([])

  const getLeaderAccess = async () => {
    errorMessage = ""
    isLoading = true
    const result = await requestApi<SchoolAccess[]>("/api/admin/getleaderaccess")
    if (result.ok) {
      schoolAccess = result.value
    } else {
      errorMessage = result.message
    }
    isLoading = false
  }

  onMount(async () => {
    await getLeaderAccess()
  })
</script>

<h2>Administrator</h2>
<h3>Se oversikt over ledertilganger</h3>

<p>
  Tilgang for ledere / rådgivere styres av tilgangsgrupper i EntraID. Servicedesk kan legge til brukere i gruppe A-TILGANG-ELEVDOK-LEDER-{"{SKOLEKORTNAVN}"}.
</p>

{#if isLoading}
  <LoadingSpinner />
{:else}
  {#each schoolAccess as school}
    <h3>{school.schoolName}</h3>
    {#each school.leaders as leader}
      <div>{leader.displayName} ({leader.principalName})</div>
    {/each}
  {/each}
{/if}

{#if errorMessage}
  <div>
    <p>Det skjedde en feil</p>
    <p>{errorMessage}</p>
  </div>
{/if}

<style>
</style>