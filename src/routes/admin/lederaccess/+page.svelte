<script lang="ts">
  import { onMount } from "svelte"
  import LoadingSpinner from "#lib/components/LoadingSpinner.svelte"
  import { prettyPrintDate } from "#lib/helpers/pretty-date.js"
  import { requestApi } from "#lib/request-api.js"
  import type { SchoolAccess } from "#lib/server/elevdok-api/leder-access.js"
  import type { PageData } from "./$types"

  type Props = {
    data: PageData
  }

  let { data }: Props = $props()

  let errorMessage = $state("")
  let searchValue
  let loading = $state(false)

  let schoolAccess: SchoolAccess[] = $state([])

  const getLeaderAccess = async () => {
    errorMessage = ""
    loading = true
    const result = await requestApi<SchoolAccess[]>("/api/admin/getleaderaccess")
    if (result.ok) {
      schoolAccess = result.value
    } else {
      errorMessage = result.message
    }
    loading = false
  }

  onMount(async () => {
    await getLeaderAccess()
  })
</script>

{#if data.user.hasAdminRole}
  <h2>Administrator</h2>
  <h3>Se oversikt over ledertilganger</h3>

  <p>
    Tilgang for ledere / rådgivere styres av tilgangsgrupper i EntraID. Servicedesk kan legge til brukere i gruppe A-TILGANG-ELEVDOK-LEDER-{"{SKOLEKORTNAVN}"}.
  </p>
  {#if loading}
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
{:else}
  Du har ikke tilgang på denne siden
{/if}

<style>

</style>