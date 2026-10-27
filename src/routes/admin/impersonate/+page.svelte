<script lang="ts">
  import LoadingSpinner from "#lib/components/LoadingSpinner.svelte"
  import { requestApi } from "#lib/request-api.js"
  import type { Impersonation } from "#lib/server/authentication.js"
  import { refreshAll } from "$app/navigation"
  import type { PageData } from "./$types"

  type Props = {
    data: PageData
  }

  let { data }: Props = $props()

  let impersonationTarget: string | undefined = $state()
  let errorMessage = $state("")
  let isLoading = $state(false)

  const setImpersonation = async (type: Impersonation["type"]) => {
    if (!impersonationTarget) {
      errorMessage = "Du må skrive et gyldig brukernavn / epost"
      return
    }
    errorMessage = ""
    isLoading = true
    const result = await requestApi("/api/admin/setimpersonation", { method: "POST", body: { target: impersonationTarget, type } })
    if (result.ok) {
      await refreshAll()
    } else {
      errorMessage = result.message
    }
    isLoading = false
  }

  const deleteImpersonation = async () => {
    errorMessage = ""
    isLoading = true
    const result = await requestApi("/api/admin/deleteimpersonation", { method: "DELETE" })
    if (result.ok) {
      await refreshAll()
    } else {
      errorMessage = result.message
    }
    isLoading = false
  }
</script>

{#if data.user.hasAdminRole}
  <h2>Administrator</h2>
  <h3>Logg inn som en annen bruker for feilsøking</h3>
  <p>Merk at dette logges</p>
  <br>
  {#if isLoading}
    <LoadingSpinner />
  {:else}
    {#if data.user.impersonating}
      Du er logget inn som <strong>{data.user.impersonating.target}</strong> med rollen <strong>{data.user.impersonating.type}</strong>
      <button class="filled" onclick={deleteImpersonation}><span class="material-symbols-outlined">cancel</span>Fjern innloggingen som {data.user.impersonating.target}</button>
      <br>  
    {/if}

    <div class="label-input">
      <label for="impersonationTarget">Brukernavnet til den du vil logge inn som (må være korrekt)</label>
      <input bind:value={impersonationTarget} id="impersonationTarget" type="email" placeholder="f. eks per.son@fylke.no" />
    </div>
    <br>
    <div class="actionButtons">
      <button onclick={() => setImpersonation('larer')}>Logg in som lærer</button>
      <button onclick={() => setImpersonation('leder')}>Logg in som leder / rådgiver</button>
    </div>
    {#if errorMessage}
      <div class="error">
        <p>Det skjedde en feil :(</p>
        <p>{errorMessage}</p>
      </div>
    {/if}
  {/if}
{:else}
  Du har ikke tilgang på denne siden
{/if}

<style>
  .actionButtons {
    display: flex;
    gap: 1rem;
  }
  .error {
    color: var(--error-color);
  }
</style>