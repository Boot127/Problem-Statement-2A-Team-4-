// Hands an in-memory blob to the browser as a file save.
//
// Used by any download that cannot be a plain link: either the bytes are
// generated here on the client (CSV export), or the endpoint requires an
// Authorization header, which a link or window.open would not send.
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
