export {};

interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface AdminMessage { id: number; name: string; email: string; message: string; status: string; }
interface AdminPost { id: number; title: string; category: string; status: string; featured: boolean; [key: string]: unknown; }
interface AdminProject { id: number; title: string; category: string; year: number; [key: string]: unknown; }
interface AboutImage { imageUrl: string | null; mimeType: string | null; updatedAt: string | null; }

const loginPanel = document.querySelector<HTMLElement>('[data-login-panel]');
const dashboard = document.querySelector<HTMLElement>('[data-dashboard]');
const loginForm = document.querySelector<HTMLFormElement>('[data-login-form]');
const loginStatus = document.querySelector<HTMLElement>('[data-login-status]');
const postForm = document.querySelector<HTMLFormElement>('[data-post-form]');
const projectForm = document.querySelector<HTMLFormElement>('[data-project-form]');
const aboutForm = document.querySelector<HTMLFormElement>('[data-about-form]');
const aboutImage = document.querySelector<HTMLImageElement>('[data-about-image]');
const aboutPlaceholder = document.querySelector<HTMLElement>('[data-about-placeholder]');
const postBody = postForm?.elements.namedItem('body');
const postStatusField = postForm?.elements.namedItem('status');
const postCategoryField = postForm?.elements.namedItem('category');
const customCategoryField = postForm?.querySelector<HTMLElement>('[data-custom-category-field]');
const customCategoryInput = postForm?.elements.namedItem('customCategory');
let token = localStorage.getItem('admin-token') ?? '';
let editingPublishedAt: string | null = null;

const api = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Permintaan gagal.');
  return result as T;
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Terjadi kesalahan.';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (character: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
const setFormValue = (form: HTMLFormElement, name: string, value: unknown) => {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) field.value = String(value ?? '');
};
const setLoggedIn = (loggedIn: boolean) => { if (loginPanel && dashboard) { loginPanel.hidden = loggedIn; dashboard.hidden = !loggedIn; } };
const estimateReadingTime = (body: string) => `${Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 200))} menit`;
const formatPublishedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date);
};
const syncPostCategory = () => {
  if (!(postCategoryField instanceof HTMLSelectElement) || !(customCategoryInput instanceof HTMLInputElement)) return;
  const custom = postCategoryField.value === '__custom__';
  if (customCategoryField) customCategoryField.hidden = !custom;
  customCategoryInput.required = custom;
  if (!custom) customCategoryInput.value = '';
};
const updateAboutPreview = (info: AboutImage) => {
  if (!aboutImage || !aboutPlaceholder) return;
  if (info.imageUrl) {
    aboutImage.src = info.imageUrl;
    aboutImage.hidden = false;
    aboutPlaceholder.hidden = true;
  } else {
    aboutImage.hidden = true;
    aboutPlaceholder.hidden = false;
  }
};
const updatePostMeta = () => {
  const body = postBody instanceof HTMLTextAreaElement ? postBody.value : '';
  const status = postStatusField instanceof HTMLSelectElement ? postStatusField.value : 'draft';
  const readingTime = document.querySelector<HTMLElement>('[data-reading-time]');
  const publishedAt = document.querySelector<HTMLElement>('[data-published-at]');
  if (readingTime) readingTime.textContent = estimateReadingTime(body);
  if (publishedAt) {
    const formattedDate = editingPublishedAt ? formatPublishedAt(editingPublishedAt) : null;
    publishedAt.textContent = status === 'published'
      ? formattedDate ?? 'Dibuat saat disimpan'
      : status === 'draft' ? 'Diisi saat Published' : formattedDate ?? 'Belum tersedia';
  }
};

const renderMessage = (item: AdminMessage, withActions = true) => `<div class="list-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.email)}</small><p>${escapeHtml(item.message)}</p></div>${withActions ? `<button class="status-button ${escapeHtml(item.status)}" data-message-id="${item.id}" data-message-status="${escapeHtml(item.status)}">${escapeHtml(item.status)}</button>` : `<small class="message-status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</small>`}</div>`;
const renderPost = (item: AdminPost, withActions = true) => `<div class="list-item"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.status)}</small></div>${withActions ? `<div class="list-actions"><button class="icon-button" data-edit-post="${item.id}">Edit</button><button class="icon-button danger" data-delete-post="${item.id}">Hapus</button></div>` : ''}</div>`;
const renderProject = (item: AdminProject, withActions = true) => `<div class="list-item"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)} · ${item.year}</small></div>${withActions ? `<div class="list-actions"><button class="icon-button" data-edit-project="${item.id}">Edit</button><button class="icon-button danger" data-delete-project="${item.id}">Hapus</button></div>` : ''}</div>`;

const loadDashboard = async () => {
  const [messages, posts, projects, about] = await Promise.all([
    api<AdminMessage[]>('/api/admin/messages'), api<AdminPost[]>('/api/admin/posts'), api<AdminProject[]>('/api/admin/projects'), api<AboutImage>('/api/admin/about')
  ]);
  updateAboutPreview(about);
  const setText = (selector: string, value: string | number) => { const element = document.querySelector<HTMLElement>(selector); if (element) element.textContent = String(value); };
  const setHtml = (selector: string, value: string) => { const element = document.querySelector<HTMLElement>(selector); if (element) element.innerHTML = value; };
  setText('[data-message-count]', messages.length); setText('[data-post-count]', posts.length); setText('[data-project-count]', projects.length);
  setText('[data-unread-count]', messages.filter((item) => item.status === 'new').length);
  setText('[data-draft-count]', posts.filter((item) => item.status === 'draft').length);
  setText('[data-published-count]', posts.filter((item) => item.status === 'published').length);
  setHtml('[data-messages-list]', messages.length ? messages.map((item) => renderMessage(item)).join('') : '<p class="empty">Belum ada pesan.</p>');
  setHtml('[data-posts-list]', posts.length ? posts.map((item) => renderPost(item)).join('') : '<p class="empty">Belum ada tulisan di database.</p>');
  setHtml('[data-projects-list]', projects.length ? projects.map((item) => renderProject(item)).join('') : '<p class="empty">Belum ada karya di database.</p>');
  setHtml('[data-latest-posts]', posts.length ? posts.slice(0, 5).map((item) => renderPost(item, false)).join('') : '<p class="empty">Belum ada tulisan di database.</p>');
  setHtml('[data-latest-projects]', projects.length ? projects.slice(0, 5).map((item) => renderProject(item, false)).join('') : '<p class="empty">Belum ada karya di database.</p>');
  setHtml('[data-recent-messages]', messages.length ? messages.slice(0, 3).map((item) => renderMessage(item, false)).join('') : '<p class="empty">Belum ada pesan.</p>');
  return { messages, posts, projects };
};

const resetForm = (form: HTMLFormElement | null, titleSelector: string, title: string) => { if (!form) return; form.reset(); setFormValue(form, 'id', ''); const heading = document.querySelector<HTMLElement>(titleSelector); if (heading) heading.textContent = title; if (form === postForm) { editingPublishedAt = null; syncPostCategory(); updatePostMeta(); } };
const fillForm = (form: HTMLFormElement | null, titleSelector: string, item: Record<string, unknown>) => {
  if (!form) return;
  Object.keys(item).forEach((key) => setFormValue(form, key, item[key]));
  if (form === postForm && postCategoryField instanceof HTMLSelectElement && customCategoryInput instanceof HTMLInputElement) {
    const category = String(item.category ?? '');
    const knownCategory = Array.from(postCategoryField.options).some((option) => option.value === category);
    if (!knownCategory) {
      postCategoryField.value = '__custom__';
      customCategoryInput.value = category;
    }
    syncPostCategory();
  }
  const featured = form.elements.namedItem('featured'); if (featured instanceof HTMLInputElement) featured.checked = Boolean(item.featured);
  setFormValue(form, 'id', item.id); const heading = document.querySelector<HTMLElement>(titleSelector); if (heading) heading.textContent = `Edit: ${item.title}`;
  if (form === postForm) { editingPublishedAt = item.publishedAt?.toString() || null; updatePostMeta(); }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

if (postBody instanceof HTMLTextAreaElement) postBody.addEventListener('input', updatePostMeta);
if (postStatusField instanceof HTMLSelectElement) postStatusField.addEventListener('change', updatePostMeta);
if (postCategoryField instanceof HTMLSelectElement) postCategoryField.addEventListener('change', syncPostCategory);
syncPostCategory();
updatePostMeta();

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault(); token = new FormData(loginForm).get('token')?.toString() ?? '';
  try { await api<AdminMessage[]>('/api/admin/messages'); localStorage.setItem('admin-token', token); setLoggedIn(true); await loadDashboard(); }
  catch (error) { if (loginStatus) loginStatus.textContent = errorMessage(error); setLoggedIn(false); }
});

document.querySelector('[data-logout]')?.addEventListener('click', () => { token = ''; localStorage.removeItem('admin-token'); setLoggedIn(false); });
document.querySelector('[data-reset-post]')?.addEventListener('click', () => resetForm(postForm, '[data-post-form-title]', 'Tulisan baru'));
document.querySelector('[data-reset-project]')?.addEventListener('click', () => resetForm(projectForm, '[data-project-form-title]', 'Karya baru'));
document.querySelector('[data-publish]')?.addEventListener('click', async (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  button.disabled = true;
  button.textContent = 'Publishing…';
  try { const result = await api<{ message: string }>('/api/admin/publish', { method: 'POST' }); button.textContent = result.message; }
  catch (error) { button.textContent = errorMessage(error); }
  finally { window.setTimeout(() => { button.textContent = 'Publish ke website'; button.disabled = false; }, 3500); }
});

postForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(new FormData(postForm));
  const featured = postForm.elements.namedItem('featured'); data.featured = featured instanceof HTMLInputElement && featured.checked;
  if (data.category === '__custom__') data.category = data.customCategory?.toString().trim() ?? '';
  delete data.customCategory;
  const id = data.id?.toString(); delete data.id; const status = document.querySelector<HTMLElement>('[data-post-status]');
  try { await api<AdminPost>(id ? `/api/admin/posts/${id}` : '/api/admin/posts', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }); if (status) status.textContent = 'Tulisan tersimpan.'; resetForm(postForm, '[data-post-form-title]', 'Tulisan baru'); await loadDashboard(); }
  catch (error) { if (status) status.textContent = errorMessage(error); }
});

projectForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data: Record<string, FormDataEntryValue | number> = Object.fromEntries(new FormData(projectForm)); data.year = Number(data.year);
  const id = data.id?.toString(); delete data.id; const status = document.querySelector<HTMLElement>('[data-project-status]');
  try { await api<AdminProject>(id ? `/api/admin/projects/${id}` : '/api/admin/projects', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }); if (status) status.textContent = 'Karya tersimpan.'; resetForm(projectForm, '[data-project-form-title]', 'Karya baru'); await loadDashboard(); }
  catch (error) { if (status) status.textContent = errorMessage(error); }
});

aboutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector<HTMLElement>('[data-about-status]');
  const file = aboutForm.elements.namedItem('image');
  if (!(file instanceof HTMLInputElement) || !file.files?.[0]) {
    if (status) status.textContent = 'Pilih gambar terlebih dahulu.';
    return;
  }
  try {
    const result = await api<AboutImage>('/api/admin/about/image', { method: 'POST', body: new FormData(aboutForm) });
    updateAboutPreview(result);
    aboutForm.reset();
    if (status) status.textContent = 'Foto profil berhasil diperbarui.';
  } catch (error) {
    if (status) status.textContent = errorMessage(error);
  }
});

document.addEventListener('click', async (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
  if (!target) return;
  try {
    if (target.dataset.messageId) { const nextStatus = target.dataset.messageStatus === 'new' ? 'read' : 'new'; await api(`/api/admin/messages/${target.dataset.messageId}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) }); await loadDashboard(); }
    if (target.dataset.editPost || target.dataset.editProject) { const type = target.dataset.editPost ? 'posts' : 'projects'; const entries = await api<Array<Record<string, unknown>>>(`/api/admin/${type}`); const item = entries.find((entry) => String(entry.id) === String(target.dataset.editPost ?? target.dataset.editProject)); if (item) fillForm(type === 'posts' ? postForm : projectForm, type === 'posts' ? '[data-post-form-title]' : '[data-project-form-title]', item); }
    if (target.dataset.deletePost || target.dataset.deleteProject) { const type = target.dataset.deletePost ? 'posts' : 'projects'; const id = target.dataset.deletePost ?? target.dataset.deleteProject; if (id && confirm('Hapus item ini?')) { await api(`/api/admin/${type}/${id}`, { method: 'DELETE' }); await loadDashboard(); } }
  } catch (error) { if (loginStatus) loginStatus.textContent = errorMessage(error); }
});

if (token) { setLoggedIn(true); loadDashboard().catch(() => { localStorage.removeItem('admin-token'); token = ''; setLoggedIn(false); }); }
