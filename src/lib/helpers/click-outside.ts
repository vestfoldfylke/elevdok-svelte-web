import type { ActionReturn } from "svelte/action"

type ClickOutsideAttributes = {
  onclick_outside?: (event: CustomEvent) => void
}

/** Dispatch event on click outside of node */
export function clickOutside(node: HTMLElement): ActionReturn<undefined, ClickOutsideAttributes> {
  const handleClick = (event: MouseEvent) => {
    if (node && !node.contains(event.target as Node | null) && !event.defaultPrevented) {
      node.dispatchEvent(new CustomEvent("click_outside"))
    }
  }

  document.addEventListener("click", handleClick, true)

  return {
    destroy() {
      document.removeEventListener("click", handleClick, true)
    }
  }
}
