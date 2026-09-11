export {};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

if (!reducedMotion) {
  document.querySelectorAll<HTMLElement>('.home-about, .featured-section, .journal-section, .home-cta, .page-intro, .section, .detail-header, .about-grid, .contact-grid, .admin-overview, .admin-page-grid, .admin-card').forEach((element) => {
    element.dataset.reveal = '';
  });
  document.body.classList.add('motion-ready');

  const revealItems = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach((element) => observer.observe(element));
  } else {
    revealItems.forEach((element) => element.classList.add('is-visible'));
  }
}

if (!reducedMotion && finePointer) {
  document.querySelectorAll<HTMLElement>('.button, .outline-button, .nav-contact').forEach((element) => {
    element.dataset.magnetic = '';
    element.addEventListener('pointermove', (event) => {
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left - bounds.width / 2) * 0.18;
      const y = (event.clientY - bounds.top - bounds.height / 2) * 0.18;
      element.style.transform = `translate(${x}px, ${y}px)`;
    });
    element.addEventListener('pointerleave', () => {
      element.style.transform = '';
    });
  });

  document.querySelectorAll<HTMLElement>('.project-card, .admin-stat').forEach((element) => {
    element.dataset.tilt = '';
    element.addEventListener('pointermove', (event) => {
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      element.style.transform = `perspective(750px) rotateX(${y * -7}deg) rotateY(${x * 7}deg) translateY(-4px)`;
    });
    element.addEventListener('pointerleave', () => {
      element.style.transform = '';
    });
  });
}
