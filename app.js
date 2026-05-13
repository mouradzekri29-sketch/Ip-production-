const state = {
  data: null,
  filter: 'all'
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const pageLoader = $('#pageLoader');
const heroMedia = $('#heroMedia');
const lightbox = $('#lightbox');
const lightboxContent = $('#lightboxContent');
const lightboxClose = $('#lightboxClose');
const formStatus = $('#formStatus');
const cursor = document.querySelector('.cursor-glow');

function iconFor(platform = '') {
  const map = {
    instagram: '◎',
    facebook: 'f',
    email: '@',
    whatsapp: '✆',
    tiktok: '♪',
    youtube: '▶'
  };
  return map[platform.toLowerCase()] || '•';
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'IP';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value || '';
}

function buildHeroMedia(items = []) {
  heroMedia.innerHTML = '';
  const featured = items.filter((item) => item.featured && (item.file_path || item.external_url));

  if (featured.length === 0) {
    const fallback = document.createElement('div');
    fallback.className = 'hero-media-fallback';
    heroMedia.appendChild(fallback);
    return;
  }

  const firstVideo = featured.find((item) => item.media_type === 'video' && item.file_path);
  if (firstVideo) {
    const video = document.createElement('video');
    video.src = firstVideo.file_path;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    heroMedia.appendChild(video);
    return;
  }

  const slides = featured.slice(0, 4).map((item, index) => {
    const source = item.file_path || item.external_url;
    const slide = document.createElement('div');
    slide.style.position = 'absolute';
    slide.style.inset = '0';
    slide.style.backgroundImage = `url('${source}')`;
    slide.style.backgroundSize = 'cover';
    slide.style.backgroundPosition = 'center';
    slide.style.opacity = index === 0 ? '0.45' : '0';
    slide.style.transition = 'opacity 1.2s ease';
    slide.dataset.index = index;
    heroMedia.appendChild(slide);
    return slide;
  });

  if (!slides.length) {
    const fallback = document.createElement('div');
    fallback.className = 'hero-media-fallback';
    heroMedia.appendChild(fallback);
    return;
  }

  let active = 0;
  setInterval(() => {
    slides[active].style.opacity = '0';
    active = (active + 1) % slides.length;
    slides[active].style.opacity = '0.45';
  }, 4200);
}

function renderAbout(section) {
  setText('aboutTitle', section?.title || 'Creative studio for elite visual production');
  setText('aboutSubtitle', section?.subtitle || 'Photography, videography, editing, and social media storytelling.');
  setText('aboutBody', section?.body || 'IP Production creates cinematic visuals with a premium, modern luxury direction.');

  const stats = section?.extra?.stats || [];
  $('#aboutStats').innerHTML = stats
    .map(
      (item) => `
        <div class="about-stat reveal">
          <div class="about-stat-icon">✦</div>
          <span>${escapeHtml(item)}</span>
        </div>
      `
    )
    .join('');
}

function createPortfolioCard(item) {
  const card = document.createElement('article');
  card.className = 'portfolio-card glass reveal';
  card.dataset.category = item.category_slug || 'uncategorized';

  const mediaSource = item.file_path || item.external_url;
  const isEmbeddableVideo = item.media_type === 'video' && item.file_path;
  const placeholder = !mediaSource;

  if (!placeholder) {
    if (isEmbeddableVideo) {
      card.innerHTML = `
        <video src="${mediaSource}" muted loop playsinline></video>
        <div class="portfolio-card-overlay">
          <div class="portfolio-card-info">
            <span>${escapeHtml(item.category_name)}</span>
            <h4>${escapeHtml(item.title)}</h4>
          </div>
        </div>
      `;
      const video = card.querySelector('video');
      card.addEventListener('mouseenter', () => video.play().catch(() => {}));
      card.addEventListener('mouseleave', () => video.pause());
    } else {
      card.innerHTML = `
        <img src="${mediaSource}" alt="${escapeHtml(item.title)}" loading="lazy" />
        <div class="portfolio-card-overlay">
          <div class="portfolio-card-info">
            <span>${escapeHtml(item.category_name)}</span>
            <h4>${escapeHtml(item.title)}</h4>
          </div>
        </div>
      `;
    }
  } else {
    const height = [260, 320, 380][item.id % 3];
    card.innerHTML = `
      <div class="portfolio-placeholder" style="min-height:${height}px;background:
      radial-gradient(circle at top right, rgba(201,168,76,.16), transparent 35%),
      linear-gradient(145deg, rgba(255,255,255,.04), rgba(201,168,76,.05));">
        <div class="portfolio-placeholder-icon">${item.media_type === 'video' ? '▶' : '✦'}</div>
      </div>
      <div class="portfolio-card-overlay" style="opacity:1;">
        <div class="portfolio-card-info">
          <span>${escapeHtml(item.category_name)}</span>
          <h4>${escapeHtml(item.title)}</h4>
        </div>
      </div>
    `;
  }

  card.addEventListener('click', () => openLightbox(item));
  return card;
}

function openLightbox(item) {
  lightboxContent.innerHTML = '';
  const source = item.file_path || item.external_url;
  if (!source) return;

  if (item.media_type === 'video') {
    const video = document.createElement('video');
    video.src = source;
    video.controls = true;
    video.autoplay = true;
    lightboxContent.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = source;
    img.alt = item.title || 'Portfolio image';
    lightboxContent.appendChild(img);
  }

  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxContent.innerHTML = '';
}

function renderFilters(categories) {
  const container = $('#categoryFilters');
  const filters = [{ name: 'All', slug: 'all' }, ...categories];
  container.innerHTML = filters
    .map(
      (category) => `
        <button class="filter-btn ${state.filter === category.slug ? 'active' : ''}" data-filter="${category.slug}">
          ${escapeHtml(category.name)}
        </button>
      `
    )
    .join('');

  $$('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      renderFilters(categories);
      renderPortfolio(state.data.portfolio);
    });
  });
}

function renderPortfolio(items = []) {
  const grid = $('#portfolioGrid');
  grid.innerHTML = '';
  const filtered = state.filter === 'all'
    ? items
    : items.filter((item) => (item.category_slug || 'uncategorized') === state.filter);

  if (!filtered.length) {
    grid.innerHTML = '<div class="portfolio-empty">No media in this category yet. Use the admin dashboard to upload content.</div>';
    observeReveal();
    return;
  }

  filtered.forEach((item) => grid.appendChild(createPortfolioCard(item)));
  observeReveal();
}

function renderSkills(skills = []) {
  $('#skillsGrid').innerHTML = skills
    .map(
      (skill) => `
        <article class="skill-card reveal">
          <div class="skill-name">
            <span>${escapeHtml(skill.name)}</span>
            <small class="skill-pct">${skill.level}%</small>
          </div>
          <div class="skill-bar">
            <div class="skill-fill" data-width="${skill.level}"></div>
          </div>
        </article>
      `
    )
    .join('');
  observeReveal();
  setTimeout(() => {
    $$('.skill-fill').forEach((bar) => {
      bar.style.width = `${bar.dataset.width}%`;
    });
  }, 120);
}

function renderServices(items = []) {
  $('#servicesGrid').innerHTML = items
    .map(
      (service, index) => `
        <article class="service-card reveal">
          <div class="service-num">0${index + 1}</div>
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description)}</p>
        </article>
      `
    )
    .join('');
  observeReveal();
}

function renderTestimonials(items = []) {
  $('#testimonialGrid').innerHTML = items
    .map(
      (testimonial) => `
        <article class="testimonial-card reveal">
          <p class="testimonial-quote">${escapeHtml(testimonial.quote)}</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar">${initials(testimonial.client_name)}</div>
            <div class="testimonial-meta">
              <strong>${escapeHtml(testimonial.client_name)}</strong>
              <span>${escapeHtml(testimonial.role || 'Client')}</span>
            </div>
          </div>
        </article>
      `
    )
    .join('');
  observeReveal();
}

function renderSocials(items = []) {
  $('#socialGrid').innerHTML = items
    .map(
      (link) => `
        <a class="social-link reveal" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">
          <span class="social-icon">${iconFor(link.platform)}</span>
          <span>${escapeHtml(link.label || link.platform)}</span>
        </a>
      `
    )
    .join('');
  observeReveal();
}

function renderHero(section, portfolio) {
  const hero = section || {};
  setText('heroEyebrow', hero.extra?.eyebrow || 'IP Production');
  setText('heroTitle', hero.title || 'Visual Storytelling Through Cinematic Frames');
  setText('heroSubtitle', hero.subtitle || 'Premium photography, filmmaking, editing, and creative production.');
  setText('heroBody', hero.body || 'A dark luxury portfolio experience designed to feel immersive, artistic, and unmistakably premium.');

  const note = $('#heroBody');
  note.classList.toggle('visible', Boolean(hero.body));

  $('#heroPrimary').textContent = hero.button_primary_label || 'View Portfolio';
  $('#heroPrimary').setAttribute('href', hero.button_primary_link || '#portfolio');
  $('#heroSecondary').textContent = hero.button_secondary_label || 'Contact Us';
  $('#heroSecondary').setAttribute('href', hero.button_secondary_link || '#contact');

  buildHeroMedia(portfolio);
}

function renderContact(section) {
  const contact = section || {};
  setText('contactTitle', contact.title || "Let's build your next visual campaign");
  setText('contactSubtitle', contact.subtitle || 'Tell us about your project, launch, campaign, or content plan.');
  setText('contactBody', contact.body || 'Use the form, WhatsApp, or your preferred social platform.');
}

async function fetchSite() {
  const response = await fetch('/api/public/site');
  state.data = await response.json();

  renderHero(state.data.sections.hero, state.data.portfolio);
  renderAbout(state.data.sections.about);
  renderFilters(state.data.categories);
  renderPortfolio(state.data.portfolio);
  renderSkills(state.data.skills);
  renderServices(state.data.services);
  renderTestimonials(state.data.testimonials);
  renderContact(state.data.sections.contact);
  renderSocials(state.data.socials);
}

function observeReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  $$('.reveal:not(.visible)').forEach((node) => observer.observe(node));
}

function handleParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = Array.from({ length: Math.min(70, Math.floor(window.innerWidth / 20)) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.3
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(201,168,76,0.55)';

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener('resize', resize);
}

function handleCursor() {
  if (!cursor || window.innerWidth < 768) return;

  window.addEventListener('mousemove', (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });

  document.addEventListener('mouseover', (event) => {
    const target = event.target.closest('a, button, .portfolio-card');
    if (target) {
      cursor.style.width = '46px';
      cursor.style.height = '46px';
      cursor.style.background = 'rgba(201,168,76,0.08)';
    } else {
      cursor.style.width = '28px';
      cursor.style.height = '28px';
      cursor.style.background = 'transparent';
    }
  });
}

function handleHeader() {
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    header.style.background = window.scrollY > 20 ? 'rgba(10,10,14,.88)' : 'rgba(20,20,26,.55)';
    heroMedia.style.transform = `translateY(${window.scrollY * 0.12}px)`;
  });
}

function handleContactForm() {
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formStatus.textContent = 'Sending...';
    const payload = Object.fromEntries(new FormData(form).entries());

    const response = await fetch('/api/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      formStatus.textContent = data.error || 'Unable to send your message.';
      return;
    }

    form.reset();
    formStatus.textContent = 'Message sent successfully. The studio will receive it in the private dashboard.';
  });
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
});

window.addEventListener('load', async () => {
  handleParticles();
  handleCursor();
  handleHeader();
  handleContactForm();
  await fetchSite();
  observeReveal();
  setTimeout(() => pageLoader.classList.add('done'), 900);
});
