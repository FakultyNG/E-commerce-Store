/* ==========================================================================
   WigsbyAmah — Admin Categories CRUD logic
   ========================================================================== */

let __adminCategories = [];

function renderCategoriesTable() {
  const body = document.getElementById('categoriesBody');
  const sorted = [...__adminCategories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (!sorted.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="5">No categories yet. Click "New Category" to add one.</td></tr>';
    return;
  }

  body.innerHTML = sorted.map(c => `
    <tr>
      <td>${c.sort_order || 0}</td>
      <td><i class="fa-solid ${c.icon || 'fa-shirt'}" style="font-size:16px;"></i></td>
      <td style="font-weight:700;">${escapeHtml(c.name)}</td>
      <td>${c.status === 'inactive' ? '<span class="pill pill-gray">Inactive</span>' : '<span class="pill pill-indigo">Active</span>'}</td>
      <td>
        <button class="btn btn-outline btn-sm" data-edit="${c.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" data-delete="${c.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openCategoryModal(btn.getAttribute('data-edit'))));
  body.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteCategory(btn.getAttribute('data-delete'))));
}

function setCategoryIcon(icon) {
  document.getElementById('categoryIconInput').value = icon || '';
  document.getElementById('categoryIconPreview').className = 'fa-solid ' + (icon || 'fa-shirt');
}

function openCategoryModal(id) {
  const form = document.getElementById('categoryForm');
  form.reset();
  if (id) {
    const c = __adminCategories.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modalTitle').textContent = 'Edit Category';
    form.id.value = c.id;
    form.name.value = c.name || '';
    setCategoryIcon(c.icon || '');
    form.sort_order.value = c.sort_order || 0;
    form.status.value = c.status || 'active';
  } else {
    document.getElementById('modalTitle').textContent = 'New Category';
    form.id.value = '';
    setCategoryIcon('');
    form.sort_order.value = __adminCategories.length;
    form.status.value = 'active';
  }
  document.getElementById('categoryModal').classList.add('show');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('show');
}

async function deleteCategory(id) {
  const c = __adminCategories.find(x => x.id === id);
  if (!confirm(`Delete category "${c ? c.name : ''}"? Products already tagged with this category name will keep showing, but it will disappear from the homepage/shop filters.`)) return;
  try {
    await API.remove('categories', id);
    __adminCategories = __adminCategories.filter(x => x.id !== id);
    renderCategoriesTable();
    showAdminToast('Category deleted');
  } catch (e) {
    console.error(e);
    showAdminToast('Failed to delete category', 'fa-triangle-exclamation');
  }
}

async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const saveBtn = document.getElementById('saveCategoryBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const fd = new FormData(form);
  const id = fd.get('id');
  const payload = {
    name: fd.get('name'),
    icon: fd.get('icon') || '',
    sort_order: Number(fd.get('sort_order')) || 0,
    status: fd.get('status'),
    image_url: ''
  };

  try {
    if (id) {
      await API.update('categories', id, payload);
      const idx = __adminCategories.findIndex(x => x.id === id);
      if (idx > -1) __adminCategories[idx] = { ...__adminCategories[idx], ...payload };
      showAdminToast('Category updated');
    } else {
      payload.id = 'cat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const created = await API.create('categories', payload);
      __adminCategories.push(created);
      showAdminToast('Category created');
    }
    closeCategoryModal();
    renderCategoriesTable();
  } catch (err) {
    console.error(err);
    showAdminToast('Failed to save category', 'fa-triangle-exclamation');
  }
  saveBtn.disabled = false;
  saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Category';
}

document.addEventListener('DOMContentLoaded', async () => {
  initAdminLayout('categories', 'Categories');

  try {
    __adminCategories = await API.listAll('categories');
    renderCategoriesTable();
  } catch (e) {
    console.error(e);
    document.getElementById('categoriesBody').innerHTML = '<tr class="empty-row"><td colspan="5" style="color:var(--danger);">Failed to load categories.</td></tr>';
  }

  document.getElementById('newCategoryBtn').addEventListener('click', () => openCategoryModal(null));
  document.getElementById('closeModalBtn').addEventListener('click', closeCategoryModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeCategoryModal);
  document.getElementById('categoryForm').addEventListener('submit', handleCategoryFormSubmit);
  document.getElementById('categoryModal').addEventListener('click', (e) => {
    if (e.target.id === 'categoryModal') closeCategoryModal();
  });
  wireIconPicker(document.getElementById('categoryIconPickerBtn'), document.getElementById('categoryIconInput'), document.getElementById('categoryIconPreview'));
});
