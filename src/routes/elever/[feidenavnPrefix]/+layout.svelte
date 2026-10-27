<script lang="ts">
  import type { Snippet } from "svelte"
  import { page } from "$app/state"
  import type { LayoutData } from "./$types"

  type Props = {
    data: LayoutData
    children?: Snippet
  }

  let { data, children }: Props = $props()

  const student = $derived((data.students ?? []).find((teacherStudent) => teacherStudent.feidenavnPrefix === page.params.feidenavnPrefix))
</script>

{#if !student}
  Du har ikke tilgang på denne eleven
{:else}
  <div class="studentBox">
    <div class="studentIcon">
      <span class="material-symbols-outlined">school</span>
    </div>

    <div class="studentInfo">
      {#if student.skoler.some(school => school.kontaktlarer)}
        <div title="Du er kontaktlærer for denne eleven" class="studentId"><strong>Kontaktlærer</strong></div>
      {:else if student.skoler.some(school => school.iop)}
        <div title="Du har IOP-tilgang for denne eleven" class="studentId"><strong>IOP</strong></div>
      {/if}
      <h1 class="studentTitle">{student.navn}</h1>
      <p class="subinfo">{student.feidenavnPrefix}</p>
      <div class="classes">
        {#each student.skoler as school}
          {#each school.klasser as group}
            <div>{school.kortkortnavn}:{group.navn}</div>
            <!--<a href="/klasser/{group.systemId}">{school.kortkortnavn}:{group.navn}</a>-->
          {/each}
        {/each}
      </div>
    </div>
  </div>

  <!-- A new page per student, so its page number, search and closed warnings do not carry over from the previous student -->
  {#key student.feidenavnPrefix}
    {@render children?.()}
  {/key}
{/if}

<style>
  .studentBox {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .studentIcon {
    width: 4rem;
    height: 4rem;
    padding: 1rem;
    border-radius: 100%;
    background-color: var(--primary-color-40);
  }

  .studentIcon span {
    font-size: 4rem;
  }

  .studentTitle {
    padding: 0rem;
    margin: 0rem;
  }

  .subinfo {
    padding: 0rem;
    margin: 0rem;
  }

  .classes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>