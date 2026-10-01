import { api, downloadB64, fileToB64 } from "../services/api.js";

export async function uploadFor(parentType, parentId, type, file) {
  const data = await fileToB64(file);
  return api("/api/documents", {
    method: "POST",
    body: JSON.stringify({ parentType, parentId, type, fileName: file.name, mime: file.type, data }),
  });
}

export async function downloadDoc(id) {
  const f = await api("/api/documents/" + id + "/file");
  downloadB64(f.fileName, f.mime, f.data);
}

export async function onFile(e, handler) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const data = await fileToB64(file);
  await handler(file, data);
  e.target.value = "";
}
