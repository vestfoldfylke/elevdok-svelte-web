import type { User } from "#lib/server/authentication.js"

// See https://svelte.dev/docs/kit/types#app
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      /** Set by the handle hook for every request */
      user: User
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}
