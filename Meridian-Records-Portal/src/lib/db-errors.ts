// Friendly, generic messages for database errors (no internals shown to users).

export interface ActionResult {
  ok?: boolean;
  error?: string;
  message?: string;
}

export function friendlyDbError(code: string | undefined): string {
  switch (code) {
    case '42501':
      return 'Your role is not allowed to do this.';
    case '23514':
      return 'This order has changed since the page was loaded. Refresh the list and try again.';
    case '23505':
      return 'This was already saved. Refresh the page.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
