type EdgeFunctionError = {
  message?: string;
  context?: unknown;
};

export async function getEdgeFunctionErrorMessage(
  error: EdgeFunctionError,
  fallback: string
): Promise<string> {
  const context = error.context as { clone?: () => Response; json?: () => Promise<unknown> } | undefined;

  if (context?.json) {
    try {
      const responseBody = await (context.clone ? context.clone() : context).json();
      if (responseBody && typeof responseBody === 'object') {
        const body = responseBody as Record<string, unknown>;
        const details = [body.error, body.message, body.details]
          .filter((value): value is string => typeof value === 'string' && value.length > 0);
        if (details.length > 0) return details.join(': ');
      }
    } catch {
      // The response may have no JSON body or may already have been consumed.
    }
  }

  return error.message || fallback;
}