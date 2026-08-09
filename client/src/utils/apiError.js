// Turns an Axios/network failure into a message that is safe to show a user.
// The Express errorHandler returns { message }, so prefer that when present.
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const serverMessage = error.response?.data?.message;
  if (serverMessage) return serverMessage;

  // No response at all usually means the API is not running / unreachable.
  if (error.request && !error.response) {
    return 'Cannot reach the server. Check that the backend is running and try again.';
  }

  return error.message || fallback;
}
