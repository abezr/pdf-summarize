const form = document.getElementById('upload-form');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary-box');
const submitBtn = document.getElementById('submit-btn');
const USER_ID = 'demo'; // optional header used by the API

const setStatus = (text) => {
  statusEl.textContent = text;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollForCompletion(
  documentId,
  delayMs = 2000,
  maxWaitMs = 10 * 60 * 1000 // 10 minutes
) {
  const start = Date.now();
  while (true) {
    const res = await fetch(`/api/documents/${documentId}`, {
      headers: { 'x-user-id': USER_ID },
    });
    const json = await res.json();
    if (json?.data?.document?.status === 'completed') {
      return json.data.document;
    }
    if (json?.data?.document?.status === 'failed') {
      throw new Error('Processing failed');
    }
    if (Date.now() - start > maxWaitMs) {
      throw new Error('Processing timed out');
    }
    await sleep(delayMs);
  }
}

async function uploadAndSummarize(file) {
  setStatus('Uploading PDF…');
  const formData = new FormData();
  formData.append('pdf', file);

  const uploadRes = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: { 'x-user-id': USER_ID },
    body: formData,
  });

  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || !uploadJson?.data?.document?.id) {
    throw new Error(uploadJson?.error?.message || 'Upload failed');
  }

  const documentId = uploadJson.data.document.id;
  setStatus('Processing PDF (building graph)…');
  await pollForCompletion(documentId);

  setStatus('Generating summary…');
  const summarizeRes = await fetch(`/api/documents/${documentId}/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
    },
    body: JSON.stringify({
      type: 'executive',
      provider: 'auto',
      style: 'formal',
    }),
  });

  const summarizeJson = await summarizeRes.json();
  if (!summarizeRes.ok || !summarizeJson?.data?.summary) {
    throw new Error(
      summarizeJson?.error?.message || 'Summarization failed'
    );
  }

  return summarizeJson.data.summary;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fileInput = document.getElementById('pdf-file');
  const file = fileInput.files?.[0];
  if (!file) {
    setStatus('Please choose a PDF first.');
    return;
  }

  submitBtn.disabled = true;
  summaryEl.value = '';

  try {
    const summary = await uploadAndSummarize(file);
    summaryEl.value = summary;
    setStatus('Done.');
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
  }
});
