const state = {
  auth: null,
  content: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const toast = $('#toast');

function showToast(message, error = false) {
  toast.textContent = message;
  toast.style.borderColor = error ? 'rgba(255,111,120,.34)' : 'rgba(201,168,76,.24)';
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function switchTab(tab) {
  $$('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  $$('.dashboard-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tab));
}

function setValue(formId, field, value) {
  const form = document.getElementById(formId);
  if (!form) return;
  const input = form.querySelector(`[name="${field}"]`);
  if (input) input.value = value ?? '';
}

function renderStats() {
  const counts = state.content.counts || {};
  const stats = [
    ['Media Items', counts.media || 0],
    ['Messages', counts.messages || 0],
    ['Categories', counts.categories || 0],
    ['Testimonials', counts.testimonials || 0]
  ];

  $('#statsGrid').innerHTML = stats
    .map(
      ([label, value]) => `
        <article class="stat-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </article>
      `
    )
    .join('');
}

function fillSectionForms() {
  const hero = state.content.sections.hero || {};
  setValue('heroForm', 'title', hero.title);
  setValue('heroForm', 'subtitle', hero.subtitle);
  setValue('heroForm', 'body', hero.body);
  setValue('heroForm', 'button_primary_label', hero.button_primary_label);
  setValue('heroForm', 'button_primary_link', hero.button_primary_link);
  setValue('heroForm', 'button_secondary_label', hero.button_secondary_label);
  setValue('heroForm', 'button_secondary_link', hero.button_secondary_link);
  setValue('heroForm', 'eyebrow', hero.extra?.eyebrow || 'IP Production');

  const about = state.content.sections.about || {};
  setValue('aboutForm', 'title', about.title);
  setValue('aboutForm', 'subtitle', about.subtitle);
  setValue('aboutForm', 'body', about.body);
  setValue('aboutForm', 'stats', (about.extra?.stats || []).join('\n'));

  const contact = state.content.sections.contact || {};
  setValue('contactSectionForm', 'title', contact.title);
  setValue('contactSectionForm', 'subtitle', contact.subtitle);
  setValue('contactSectionForm', 'body', contact.body);
  setValue('contactSectionForm', 'email', contact.extra?.email || '');

  setValue('accountForm', 'email', state.auth?.email || '');
}

function populateCategorySelect() {
  const select = $('#mediaCategorySelect');
  const options = ['<option value="">No category</option>']
    .concat(
      state.content.categories.map(
        (category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`
      )
    )
    .join('');
  select.innerHTML = options;
}

function renderCategories() {
  $('#categoryList').innerHTML = state.content.categories
    .map(
      (category) => `
        <div class="item-card">
          <strong>${escapeHtml(category.name)}</strong>
          <p>Slug: ${escapeHtml(category.slug)}</p>
          <div class="item-actions">
            <button class="small-btn" data-action="edit-category" data-id="${category.id}">Edit</button>
            <button class="small-btn danger" data-action="delete-category" data-id="${category.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
}

function renderSkills() {
  $('#skillList').innerHTML = state.content.skills
    .map(
      (skill) => `
        <div class="item-card">
          <strong>${escapeHtml(skill.name)}</strong>
          <p>Level: ${skill.level}%</p>
          <div class="item-actions">
            <button class="small-btn" data-action="edit-skill" data-id="${skill.id}">Edit</button>
            <button class="small-btn danger" data-action="delete-skill" data-id="${skill.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
}

function renderServices() {
  $('#serviceList').innerHTML = state.content.services
    .map(
      (service) => `
        <div class="item-card">
          <strong>${escapeHtml(service.title)}</strong>
          <p>${escapeHtml(service.description)}</p>
          <div class="item-actions">
            <button class="small-btn" data-action="edit-service" data-id="${service.id}">Edit</button>
            <button class="small-btn danger" data-action="delete-service" data-id="${service.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
}

function renderTestimonials() {
  $('#testimonialList').innerHTML = state.content.testimonials
    .map(
      (item) => `
        <div class="item-card">
          <strong>${escapeHtml(item.client_name)} <span class="status-badge">${escapeHtml(item.role || 'Client')}</span></strong>
          <p>${escapeHtml(item.quote)}</p>
          <div class="item-actions">
            <button class="small-btn" data-action="edit-testimonial" data-id="${item.id}">Edit</button>
            <button class="small-btn danger" data-action="delete-testimonial" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
}

function renderSocials() {
  $('#socialList').innerHTML = state.content.socials
    .map(
      (item) => `
        <div class="item-card">
          <strong>${escapeHtml(item.platform)}</strong>
          <p>${escapeHtml(item.url)}</p>
          <div class="item-actions">
            <button class="small-btn" data-action="edit-social" data-id="${item.id}">Edit</button>
            <button class="small-btn danger" data-action="delete-social" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
}

function mediaPreview(item) {
  const source = item.file_path || item.external_url;
  if (!source) {
    return `<div class="media-placeholder">${item.media_type === 'video' ? 'Video' : 'Image'}</div>`;
  }
  if (item.media_type === 'video' && item.file_path) {
    return `<video src="${source}" controls muted></video>`;
  }
  return `<img src="${source}" alt="${escapeHtml(item.title)}" />`;
}

function renderMedia() {
  $('#mediaGrid').innerHTML = state.content.portfolio
    .map(
      (item) => `
        <article class="media-card">
          ${mediaPreview(item)}
          <div class="media-meta">
            <div class="meta-row">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="badge">${escapeHtml(item.category_name || 'Uncategorized')}</span>
            </div>
            <p class="muted-copy">${escapeHtml(item.description || 'No description')}</p>
            <div class="meta-row">
              <span class="status-badge">${item.media_type}</span>
              <span class="status-badge">${item.featured ? 'featured' : 'standard'}</span>
            </div>
            <div class="item-actions">
              <button class="small-btn" data-action="edit-media" data-id="${item.id}">Edit</button>
              <button class="small-btn danger" data-action="delete-media" data-id="${item.id}">Delete</button>
            </div>
          </div>
        </article>
      `
    )
    .join('');
}

function renderMessages() {
  $('#messageList').innerHTML = state.content.messages.length
    ? state.content.messages
        .map(
          (message) => `
            <article class="item-card">
              <div class="meta-row">
                <strong>${escapeHtml(message.name)}</strong>
                <span class="status-badge">${escapeHtml(message.status)}</span>
              </div>
              <p>Email: ${escapeHtml(message.email || '-')}</p>
              <p>Phone: ${escapeHtml(message.phone || '-')}</p>
              <p>Project: ${escapeHtml(message.project_type || '-')}</p>
              <p>${escapeHtml(message.message)}</p>
              <div class="item-actions">
                <button class="small-btn" data-action="message-status" data-status="read" data-id="${message.id}">Mark read</button>
                <button class="small-btn" data-action="message-status" data-status="archived" data-id="${message.id}">Archive</button>
                <button class="small-btn danger" data-action="delete-message" data-id="${message.id}">Delete</button>
              </div>
            </article>
          `
        )
        .join('')
    : '<div class="item-card"><p>No messages yet.</p></div>';
}

function renderAll() {
  $('#adminIdentity').textContent = state.auth?.email || 'Owner';
  renderStats();
  fillSectionForms();
  populateCategorySelect();
  renderCategories();
  renderSkills();
  renderServices();
  renderTestimonials();
  renderSocials();
  renderMedia();
  renderMessages();
}

async function loadContent() {
  state.content = await request('/api/admin/content');
  renderAll();
}

async function ensureAuth() {
  const auth = await request('/api/auth/me');
  if (!auth.authenticated) {
    window.location.href = '/admin/login';
    return false;
  }
  state.auth = auth;
  return true;
}

function resetForm(formId) {
  document.getElementById(formId).reset();
  const idField = document.querySelector(`#${formId} [name="id"]`);
  if (idField) idField.value = '';
}

function fillMediaForm(item) {
  const form = document.getElementById('mediaForm');
  form.querySelector('[name="id"]').value = item.id;
  form.querySelector('[name="title"]').value = item.title || '';
  form.querySelector('[name="media_type"]').value = item.media_type || 'image';
  form.querySelector('[name="category_id"]').value = item.category_id || '';
  form.querySelector('[name="featured"]').value = item.featured ? '1' : '0';
  form.querySelector('[name="description"]').value = item.description || '';
  form.querySelector('[name="external_url"]').value = item.external_url || '';
  switchTab('media');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fillSimpleForm(formId, item) {
  const form = document.getElementById(formId);
  form.querySelector('[name="id"]').value = item.id;
  Object.entries(item).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = value ?? '';
  });
}

function hookTabs() {
  $$('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  $$('.quick-tab').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.target));
  });
}

function hookResets() {
  $('#mediaFormReset').addEventListener('click', () => resetForm('mediaForm'));
  $('#categoryFormReset').addEventListener('click', () => resetForm('categoryForm'));
  $('#skillFormReset').addEventListener('click', () => resetForm('skillForm'));
  $('#serviceFormReset').addEventListener('click', () => resetForm('serviceForm'));
  $('#testimonialFormReset').addEventListener('click', () => resetForm('testimonialForm'));
  $('#socialFormReset').addEventListener('click', () => resetForm('socialForm'));
}

function hookSectionForms() {
  $('#heroForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request('/api/admin/sections/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        subtitle: form.get('subtitle'),
        body: form.get('body'),
        button_primary_label: form.get('button_primary_label'),
        button_primary_link: form.get('button_primary_link'),
        button_secondary_label: form.get('button_secondary_label'),
        button_secondary_link: form.get('button_secondary_link'),
        extra: { eyebrow: form.get('eyebrow') }
      })
    });
    showToast('Hero section saved');
    await loadContent();
  });

  $('#aboutForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request('/api/admin/sections/about', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        subtitle: form.get('subtitle'),
        body: form.get('body'),
        extra: {
          stats: String(form.get('stats') || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        }
      })
    });
    showToast('About section saved');
    await loadContent();
  });

  $('#contactSectionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request('/api/admin/sections/contact', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        subtitle: form.get('subtitle'),
        body: form.get('body'),
        extra: { email: form.get('email') }
      })
    });
    showToast('Contact section saved');
    await loadContent();
  });
}

function hookCrudForms() {
  $('#categoryForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (payload.id) {
      await request(`/api/admin/categories/${payload.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    } else {
      await request('/api/admin/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    }
    resetForm('categoryForm');
    showToast('Category saved');
    await loadContent();
  });

  $('#skillForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (payload.id) {
      await request(`/api/admin/skills/${payload.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    } else {
      await request('/api/admin/skills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    }
    resetForm('skillForm');
    showToast('Skill saved');
    await loadContent();
  });

  $('#serviceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (payload.id) {
      await request(`/api/admin/services/${payload.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    } else {
      await request('/api/admin/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    }
    resetForm('serviceForm');
    showToast('Service saved');
    await loadContent();
  });

  $('#testimonialForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (payload.id) {
      await request(`/api/admin/testimonials/${payload.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    } else {
      await request('/api/admin/testimonials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    }
    resetForm('testimonialForm');
    showToast('Testimonial saved');
    await loadContent();
  });

  $('#socialForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (payload.id) {
      await request(`/api/admin/socials/${payload.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    } else {
      await request('/api/admin/socials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    }
    resetForm('socialForm');
    showToast('Social link saved');
    await loadContent();
  });

  $('#mediaForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const id = data.get('id');
    const url = id ? `/api/admin/portfolio/${id}` : '/api/admin/portfolio';
    await request(url, { method: id ? 'PUT' : 'POST', body: data });
    resetForm('mediaForm');
    showToast('Media item saved');
    await loadContent();
  });

  $('#accountForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const data = await request('/api/admin/account', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    state.auth.email = data.email;
    $('#accountStatus').textContent = 'Admin account updated successfully.';
    event.currentTarget.querySelector('[name="currentPassword"]').value = '';
    event.currentTarget.querySelector('[name="newPassword"]').value = '';
    showToast('Account updated');
    await loadContent();
  });
}

function hookListActions() {
  document.body.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const { action, id, status } = button.dataset;
    try {
      if (action === 'edit-category') {
        fillSimpleForm('categoryForm', state.content.categories.find((item) => item.id === Number(id)));
        switchTab('categories');
      }
      if (action === 'delete-category') {
        await request(`/api/admin/categories/${id}`, { method: 'DELETE' });
        showToast('Category deleted');
        await loadContent();
      }

      if (action === 'edit-skill') {
        fillSimpleForm('skillForm', state.content.skills.find((item) => item.id === Number(id)));
        switchTab('skills');
      }
      if (action === 'delete-skill') {
        await request(`/api/admin/skills/${id}`, { method: 'DELETE' });
        showToast('Skill deleted');
        await loadContent();
      }

      if (action === 'edit-service') {
        fillSimpleForm('serviceForm', state.content.services.find((item) => item.id === Number(id)));
        switchTab('services');
      }
      if (action === 'delete-service') {
        await request(`/api/admin/services/${id}`, { method: 'DELETE' });
        showToast('Service deleted');
        await loadContent();
      }

      if (action === 'edit-testimonial') {
        fillSimpleForm('testimonialForm', state.content.testimonials.find((item) => item.id === Number(id)));
        switchTab('testimonials');
      }
      if (action === 'delete-testimonial') {
        await request(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
        showToast('Testimonial deleted');
        await loadContent();
      }

      if (action === 'edit-social') {
        fillSimpleForm('socialForm', state.content.socials.find((item) => item.id === Number(id)));
        switchTab('socials');
      }
      if (action === 'delete-social') {
        await request(`/api/admin/socials/${id}`, { method: 'DELETE' });
        showToast('Social link deleted');
        await loadContent();
      }

      if (action === 'edit-media') {
        fillMediaForm(state.content.portfolio.find((item) => item.id === Number(id)));
      }
      if (action === 'delete-media') {
        await request(`/api/admin/portfolio/${id}`, { method: 'DELETE' });
        showToast('Media deleted');
        await loadContent();
      }

      if (action === 'message-status') {
        await request(`/api/admin/messages/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
        });
        showToast('Message updated');
        await loadContent();
      }
      if (action === 'delete-message') {
        await request(`/api/admin/messages/${id}`, { method: 'DELETE' });
        showToast('Message deleted');
        await loadContent();
      }
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

function hookLogout() {
  $('#logoutBtn').addEventListener('click', async () => {
    await request('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });
}

window.addEventListener('load', async () => {
  try {
    const ok = await ensureAuth();
    if (!ok) return;
    hookTabs();
    hookResets();
    hookSectionForms();
    hookCrudForms();
    hookListActions();
    hookLogout();
    await loadContent();
  } catch (error) {
    showToast(error.message || 'Unable to load dashboard', true);
  }
});
