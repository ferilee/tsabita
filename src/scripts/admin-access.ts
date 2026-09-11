export {};

const modal = document.querySelector<HTMLDialogElement>('[data-admin-modal]');
const openButton = document.querySelector<HTMLButtonElement>('[data-admin-modal-open]');
const closeButton = document.querySelector<HTMLButtonElement>('[data-admin-modal-close]');
const loginForm = document.querySelector<HTMLFormElement>('[data-public-login-form]');
const loginStatus = document.querySelector<HTMLElement>('[data-public-login-status]');

if (modal && openButton && closeButton && loginForm) {
  openButton.addEventListener('click', () => {
    if (loginStatus) loginStatus.textContent = '';
    modal.showModal();
  });

  closeButton.addEventListener('click', () => modal.close());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = new FormData(loginForm).get('token')?.toString().trim() ?? '';
    const submitButton = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Memeriksa…';
    }

    try {
      const response = await fetch('/api/admin/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Token admin tidak valid.');
      localStorage.setItem('admin-token', token);
      window.location.assign('/admin');
    } catch (error) {
      if (loginStatus) loginStatus.textContent = error instanceof Error ? error.message : 'Terjadi kesalahan.';
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Masuk <span>↗</span>';
      }
    }
  });
}
