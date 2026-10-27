<script lang="ts">
  import axios from "axios"
  import { onMount } from "svelte"
  import LoadingSpinner from "#lib/components/LoadingSpinner.svelte"
  import { prettyPrintDate } from "#lib/helpers/pretty-date.js"
  import type { SchoolAccess } from "#lib/server/elevdok-api/leder-access.js"
  import type { PageData } from "./$types"

  type Props = {
    data: PageData
  }

  let { data }: Props = $props()

  let errorMessage: unknown = $state("")
  let searchValue
  let loading = $state(false)

  let schoolAccess: SchoolAccess[] = $state([])

  const getLeaderAccess = async () => {
    errorMessage = ""
    loading = true
    try {
      const { data } = await axios.get(`/api/admin/getleaderaccess`)
      schoolAccess = data
    } catch (error) {
      console.log(axios.isAxiosError(error) ? error.response?.data : error)
      errorMessage = (axios.isAxiosError(error) && error.response?.data) || String(error)
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
      <p>{JSON.stringify(errorMessage)}</p>
    </div>
  {/if}
{:else}
  Du har ikke tilgang på denne siden
{/if}

<style>

</style>