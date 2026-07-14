// Global Application State
const state = {
    activeTab: 'dashboard',
    tables: [],
    activeTable: null,
    inventoryState: {
        activeTable: null,
        columns: [],
        rows: [],
        mappedCols: {
            material: '',
            model: '',
            qty: 'row_count',
            mac: '',
            serial: ''
        },
        selectedMaterial: null,
        chartInstance: null,
        filters: {
            search: '',
            qtyFilterStr: '',
            sortCol: 'id',
            sortOrder: 'asc'
        }
    },
    tableData: {
        columns: [],
        column_types: {},
        rows: [],
        pagination: {
            page: 1,
            per_page: 25,
            total_rows: 0,
            total_pages: 1
        }
    },
    // Filters for active table view
    filters: {
        page: 1,
        per_page: 25,
        search: '',
        sort_by: '',
        sort_order: 'asc',
        col_filters: {}, // Added for column-specific filtering
        rel_filter: null // Store selected relationship filter
    },
    selectedRowIds: [], // Store selected row IDs for bulk actions
    exportFormat: null, // Store active export format during column selection
    // Temp data during file upload
    uploadData: {
        file_key: null,
        file_ext: null,
        suggested_table_name: null,
        sheets: [],
        current_sheet: '',
        columns: [], // {name, type}
        preview_rows: []
    }
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTheme();
    initNavigation();
    initTableViewerEvents();
    initImportEvents();
    initTableCreatorEvents();
    initRelationsEvents();

    // Load initial data
    loadDashboardData();
    loadTablesList();
});

// Real-time clock on Topbar
function initClock() {
    const clockEl = document.getElementById('current-time');
    const updateTime = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('tr-TR');
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// Dark/Light Theme Manager
function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Retrieve saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i><span>Aydınlık Mod</span>';
    } else {
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i><span>Karanlık Mod</span>';
    }

    themeBtn.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.replace('dark-theme', 'light-theme');
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i><span>Aydınlık Mod</span>';
            localStorage.setItem('theme', 'light');
            showToast('Aydınlık mod aktif edildi.');
        } else {
            body.classList.replace('light-theme', 'dark-theme');
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i><span>Karanlık Mod</span>';
            localStorage.setItem('theme', 'dark');
            showToast('Karanlık mod aktif edildi.');
        }
    });
}

// Navigation Tab Controller
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Handle initial hash routing
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const validTabs = ['dashboard', 'tables', 'import', 'create-table', 'relations', 'inventory'];
        if (validTabs.includes(hash)) {
            switchTab(hash);
        }
    }
}

function switchTab(tabId) {
    state.activeTab = tabId;
    window.location.hash = tabId;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update active view panel
    document.querySelectorAll('.tab-view').forEach(view => {
        if (view.id === `view-${tabId}`) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    // Header page titles updating dynamically
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    if (tabId === 'dashboard') {
        pageTitle.textContent = 'Yönetim Paneli';
        pageSubtitle.textContent = 'Veritabanı istatistikleri ve genel durum';
        loadDashboardData();
    } else if (tabId === 'tables') {
        pageTitle.textContent = 'Tablolarım';
        pageSubtitle.textContent = 'Verileri listeleme, filtreleme, arama ve düzenleme';
        loadTablesList();
    } else if (tabId === 'import') {
        pageTitle.textContent = 'Excel / CSV Veri Yükleme Portalı';
        pageSubtitle.textContent = 'Verilerinizi yükleyin, düzenleyin ve veritabanına aktarın';
    } else if (tabId === 'create-table') {
        pageTitle.textContent = 'Manuel Tablo Tasarımcısı';
        pageSubtitle.textContent = 'Veritabanı sütunlarını tanımlayıp yeni tablo oluşturun';
    } else if (tabId === 'relations') {
        pageTitle.textContent = 'Tablo İlişkileri Tasarımcısı';
        pageSubtitle.textContent = 'Tabloları yan yana getirip aralarında otomatik silme ve güncelleme ilişkileri kurun';
        loadRelationsData();
    } else if (tabId === 'inventory') {
        pageTitle.textContent = 'Envanter ve Cihaz Analiz Paneli';
        pageSubtitle.textContent = 'Sarf malzemelerinizi ve cihaz durumlarınızı grafiksel olarak inceleyin';
        loadInventoryTab();
    }
}

// ==========================================================================
// UTILITIES (TOASTS AND LOADERS)
// ==========================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

let loaderTimeout;

function showLoader(text = 'İşlem yapılıyor, lütfen bekleyin...') {
    clearTimeout(loaderTimeout);
    loaderTimeout = setTimeout(() => {
        const loader = document.getElementById('app-loader');
        const loaderText = document.getElementById('loader-text');
        loaderText.textContent = text;
        loader.classList.remove('hidden');
    }, 250); // Prevent flashing on fast operations (250ms delay)
}

function hideLoader() {
    clearTimeout(loaderTimeout);
    const loader = document.getElementById('app-loader');
    loader.classList.add('hidden');
}

// Custom Fetch Wrapper
async function apiCall(url, options = {}) {
    const silent = options.silentError || false;
    const fetchOptions = { ...options };
    delete fetchOptions.silentError;
    try {
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Bilinmeyen sunucu hatası.');
        }
        return data;
    } catch (err) {
        if (!silent) {
            showToast(err.message, 'error');
        }
        throw err;
    }
}

// ==========================================================================
// VIEW 1: DASHBOARD VIEW LOGIC
// ==========================================================================
async function loadDashboardData() {
    try {
        const data = await apiCall('/api/tables');
        const tables = data.tables;

        // Update stats counters
        document.getElementById('stat-tables-count').textContent = tables.length;

        let totalRows = 0;
        tables.forEach(t => totalRows += t.rowCount);
        document.getElementById('stat-rows-count').textContent = totalRows;

        // Update son eklenen tablolar list
        const tbody = document.querySelector('#recent-tables-list tbody');
        tbody.innerHTML = '';

        if (tables.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Henüz tablo bulunmamaktadır.</td></tr>`;
            return;
        }

        // Show up to 5 tables sorted by some criteria or list order
        const recent = tables.slice(-5).reverse();
        recent.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.name}</strong></td>
                <td>${t.columns.length} Sütun</td>
                <td><span class="badge">${t.rowCount} satır</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewSpecificTable('${t.name}')">
                        <i class="fa-solid fa-eye"></i> İncele
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Dashboard data load error:', err);
    }
}

function viewSpecificTable(tableName) {
    switchTab('tables');
    // We wait briefly for the tab view layout to render
    setTimeout(() => {
        selectTable(tableName);
    }, 100);
}

// ==========================================================================
// VIEW 2: MY TABLES VIEW LOGIC (CRUD & DATAGRID)
// ==========================================================================
async function loadTablesList(selectTableName = null) {
    try {
        const data = await apiCall('/api/tables');
        state.tables = data.tables;

        const listContainer = document.getElementById('tables-list-items');
        listContainer.innerHTML = '';

        if (state.tables.length === 0) {
            listContainer.innerHTML = `<li class="text-muted text-center p-3">Tablo bulunamadı.</li>`;
            return;
        }

        state.tables.forEach(t => {
            const li = document.createElement('li');
            li.className = `table-list-item ${state.activeTable === t.name ? 'active' : ''}`;
            li.setAttribute('data-name', t.name);
            li.innerHTML = `
                <span class="table-name-txt"><i class="fa-solid fa-table mr-2"></i> ${t.name}</span>
                <span class="table-list-item-meta">${t.rowCount}</span>
            `;

            li.addEventListener('click', () => {
                selectTable(t.name);
            });
            listContainer.appendChild(li);
        });

        // Auto-select table if requested, or if activeTable is still set, or do not select
        if (selectTableName) {
            selectTable(selectTableName);
        } else if (state.activeTable && state.tables.some(t => t.name === state.activeTable)) {
            selectTable(state.activeTable);
        }
    } catch (err) {
        console.error('Tables list load error:', err);
    }
}

function selectTable(tableName) {
    state.activeTable = tableName;

    // Reset filters
    state.filters.page = 1;
    state.filters.search = '';
    state.filters.sort_by = '';
    state.filters.sort_order = 'asc';
    state.filters.col_filters = {}; // Reset column filters
    state.filters.rel_filter = null; // Reset relation filter
    state.selectedRowIds = []; // Clear selected rows

    document.getElementById('table-search-input').value = '';

    // Reset and hide relation filter dropdown
    const relFilterSelect = document.getElementById('relation-filter-select');
    if (relFilterSelect) {
        relFilterSelect.value = '';
    }
    const relFilterWrapper = document.getElementById('relation-filter-wrapper');
    if (relFilterWrapper) {
        relFilterWrapper.classList.add('hidden');
    }

    // Highlight list item
    document.querySelectorAll('.table-list-item').forEach(item => {
        if (item.getAttribute('data-name') === tableName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Show Table content container
    document.getElementById('table-viewer-empty').classList.add('hidden');
    document.getElementById('table-viewer-content').classList.remove('hidden');

    document.getElementById('active-table-title').textContent = tableName;

    // Fetch and render data
    fetchTableData();
    // Populate relation filters dropdown
    updateRelationFiltersDropdown();
}

async function fetchTableData() {
    if (!state.activeTable) return;

    showLoader('Veriler yükleniyor...');
    try {
        const queryParams = new URLSearchParams({
            page: state.filters.page,
            per_page: state.filters.per_page,
            search: state.filters.search,
            sort_by: state.filters.sort_by,
            sort_order: state.filters.sort_order
        });

        // Append column-specific filters
        if (state.filters.col_filters) {
            for (const [col, val] of Object.entries(state.filters.col_filters)) {
                if (val) {
                    queryParams.append(`filter_${col}`, val);
                }
            }
        }

        // Append relation filter
        if (state.filters.rel_filter) {
            queryParams.append('rel_filter_type', state.filters.rel_filter.type);
            queryParams.append('rel_filter_table', state.filters.rel_filter.table);
            queryParams.append('rel_filter_col', state.filters.rel_filter.col);
            queryParams.append('rel_filter_other_col', state.filters.rel_filter.other_col);
        }

        const data = await apiCall(`/api/tables/${state.activeTable}?${queryParams}`);

        state.tableData.columns = data.columns;
        state.tableData.column_types = data.column_types;
        state.tableData.rows = data.rows;
        state.tableData.pagination = data.pagination;

        // Update badge row count
        document.getElementById('active-table-badge').textContent = `${data.pagination.total_rows} Satır`;

        renderDataGrid();
        renderPagination();
    } catch (err) {
        console.error('Fetch table data error:', err);
    } finally {
        hideLoader();
    }
}

// Render data table grid dynamically
function renderDataGrid() {
    const table = document.getElementById('data-grid');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    const cols = state.tableData.columns;
    const rows = state.tableData.rows;

    if (cols.length === 0) return;

    // 1. Create Header row
    const headerTr = document.createElement('tr');

    // Checkbox Header Column
    const checkboxTh = document.createElement('th');
    checkboxTh.style.width = '40px';
    checkboxTh.style.cursor = 'default';
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'select-all-rows';
    const allChecked = rows.length > 0 && rows.every(r => state.selectedRowIds.includes(r._rowid_));
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.addEventListener('change', async (e) => {
        const checked = e.target.checked;
        if (checked) {
            showLoader('Tüm satırlar seçiliyor...');
            try {
                const queryParams = new URLSearchParams({
                    search: state.filters.search
                });
                if (state.filters.col_filters) {
                    for (const [col, val] of Object.entries(state.filters.col_filters)) {
                        if (val) {
                            queryParams.append(`filter_${col}`, val);
                        }
                    }
                }
                if (state.filters.rel_filter) {
                    queryParams.append('rel_filter_type', state.filters.rel_filter.type);
                    queryParams.append('rel_filter_table', state.filters.rel_filter.table);
                    queryParams.append('rel_filter_col', state.filters.rel_filter.col);
                    queryParams.append('rel_filter_other_col', state.filters.rel_filter.other_col);
                }
                const data = await apiCall(`/api/tables/${state.activeTable}/rowids?${queryParams}`);
                state.selectedRowIds = data.rowids;
                updateRowCheckboxesState();
            } catch (err) {
                console.error('Select all rowids error:', err);
                selectAllCheckbox.checked = false;
            } finally {
                hideLoader();
            }
        } else {
            state.selectedRowIds = [];
            updateRowCheckboxesState();
        }
    });
    checkboxTh.appendChild(selectAllCheckbox);
    headerTr.appendChild(checkboxTh);

    // Column filter row
    const filterTr = document.createElement('tr');
    filterTr.className = 'filter-row';
    const emptyFilterTh = document.createElement('th');
    filterTr.appendChild(emptyFilterTh);

    cols.forEach(col => {
        const th = document.createElement('th');
        th.setAttribute('data-col', col);

        // Render sorting indicator
        let sortIcon = '<i class="fa-solid fa-sort th-sort-icon"></i>';
        if (state.filters.sort_by === col) {
            sortIcon = state.filters.sort_order === 'asc'
                ? '<i class="fa-solid fa-sort-up th-sort-icon" style="color: var(--accent-primary)"></i>'
                : '<i class="fa-solid fa-sort-down th-sort-icon" style="color: var(--accent-primary)"></i>';
        }

        th.innerHTML = `${col} ${sortIcon}`;

        th.addEventListener('click', () => {
            if (state.filters.sort_by === col) {
                state.filters.sort_order = state.filters.sort_order === 'asc' ? 'desc' : 'asc';
            } else {
                state.filters.sort_by = col;
                state.filters.sort_order = 'asc';
            }
            fetchTableData();
        });

        headerTr.appendChild(th);

        // Sütun filtre girdi kutusu
        const filterTh = document.createElement('th');
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.className = 'column-filter-input';
        filterInput.placeholder = `${col} ara...`;
        filterInput.value = state.filters.col_filters[col] || '';
        filterInput.setAttribute('data-col', col);

        filterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                state.filters.col_filters[col] = e.target.value;
                state.filters.page = 1; // Reset page on filter change
                fetchTableData();
            }
        });

        filterTh.appendChild(filterInput);
        filterTr.appendChild(filterTh);
    });

    // Actions Header column
    const actionsTh = document.createElement('th');
    actionsTh.textContent = 'İşlemler';
    actionsTh.style.cursor = 'default';
    actionsTh.style.width = '100px';
    headerTr.appendChild(actionsTh);
    thead.appendChild(headerTr);

    const emptyActionsTh = document.createElement('th');
    filterTr.appendChild(emptyActionsTh);
    thead.appendChild(filterTr);

    // 2. Create Data rows
    if (rows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${cols.length + 2}" class="text-center text-muted">Arama kriterlerine uygun veri bulunamadı.</td>`;
        tbody.appendChild(tr);
        updateBulkActionsBar();
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');

        // Checkbox cell
        const tdCheckbox = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-select-checkbox';
        checkbox.setAttribute('data-rowid', row._rowid_);
        checkbox.checked = state.selectedRowIds.includes(row._rowid_);
        checkbox.addEventListener('change', (e) => {
            const rowid = parseInt(e.target.getAttribute('data-rowid'));
            const idx = state.selectedRowIds.indexOf(rowid);
            if (e.target.checked) {
                if (idx === -1) state.selectedRowIds.push(rowid);
            } else {
                if (idx !== -1) state.selectedRowIds.splice(idx, 1);
            }

            const allBoxes = document.querySelectorAll('.row-select-checkbox');
            const selectAll = document.getElementById('select-all-rows');
            if (selectAll) {
                selectAll.checked = Array.from(allBoxes).every(cb => cb.checked);
            }
            updateBulkActionsBar();
        });
        tdCheckbox.appendChild(checkbox);
        tr.appendChild(tdCheckbox);

        cols.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col] !== null ? row[col] : '';
            tr.appendChild(td);
        });

        // Actions cell (Edit / Delete)
        const actionsTd = document.createElement('td');
        actionsTd.className = 'actions-cell';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon btn-edit-row';
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.title = 'Düzenle';
        editBtn.addEventListener('click', () => openRowModal('edit', row));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon btn-delete-row';
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        deleteBtn.title = 'Sil';
        deleteBtn.addEventListener('click', () => deleteRowConfirm(row._rowid_));

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
    });

    // Update the UI controls based on selection
    updateBulkActionsBar();
}

function renderPagination() {
    const pg = state.tableData.pagination;
    const info = document.getElementById('pagination-info');
    const buttonsContainer = document.getElementById('pagination-buttons');

    buttonsContainer.innerHTML = '';

    if (pg.total_rows === 0) {
        info.textContent = 'Gösterilecek kayıt yok';
        return;
    }

    const startIdx = (pg.page - 1) * pg.per_page + 1;
    const endIdx = Math.min(pg.page * pg.per_page, pg.total_rows);
    info.textContent = `Gösterilen: ${startIdx} - ${endIdx} / Toplam: ${pg.total_rows}`;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.disabled = pg.page === 1;
    prevBtn.addEventListener('click', () => {
        state.filters.page = pg.page - 1;
        fetchTableData();
    });
    buttonsContainer.appendChild(prevBtn);

    // Page Numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pg.page - 2);
    let endPage = Math.min(pg.total_pages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${pg.page === i ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            state.filters.page = i;
            fetchTableData();
        });
        buttonsContainer.appendChild(btn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.disabled = pg.page === pg.total_pages;
    nextBtn.addEventListener('click', () => {
        state.filters.page = pg.page + 1;
        fetchTableData();
    });
    buttonsContainer.appendChild(nextBtn);
}

// Setup Event listeners for searching/pagination sizes
function initTableViewerEvents() {
    // 1. Search on Enter keydown
    const searchInput = document.getElementById('table-search-input');
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            state.filters.search = e.target.value;
            state.filters.page = 1; // reset page on search
            fetchTableData();
        }
    });

    // 2. Pagination Page Size Select
    const sizeSelect = document.getElementById('page-size-select');
    sizeSelect.addEventListener('change', (e) => {
        state.filters.per_page = parseInt(e.target.value);
        state.filters.page = 1;
        fetchTableData();
    });

    // 2b. Relation Filter Select
    const relFilterSelect = document.getElementById('relation-filter-select');
    if (relFilterSelect) {
        relFilterSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                state.filters.rel_filter = JSON.parse(val);
            } else {
                state.filters.rel_filter = null;
            }
            state.filters.page = 1; // Reset page on filter change
            state.selectedRowIds = []; // Reset selected rowids on filter change
            fetchTableData();
        });
    }

    // 3. Dropdown Trigger
    const dropdown = document.querySelector('.dropdown-trigger');

    // 4. Delete Table Action
    document.getElementById('btn-delete-table').addEventListener('click', () => {
        if (!state.activeTable) return;

        const verify = confirm(`"${state.activeTable}" tablosunu ve içindeki TÜM verileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`);
        if (verify) {
            deleteTableExecute(state.activeTable);
        }
    });

    // 5. Add Row Action
    document.getElementById('btn-add-row').addEventListener('click', () => {
        openRowModal('add');
    });

    // 6. Bulk Actions Bar events
    document.getElementById('btn-bulk-clear').addEventListener('click', () => {
        state.selectedRowIds = [];
        updateRowCheckboxesState();
    });

    document.getElementById('btn-bulk-delete').addEventListener('click', () => {
        if (state.selectedRowIds.length === 0) return;
        const count = state.selectedRowIds.length;
        if (confirm(`Seçilen ${count} satırı kalıcı olarak silmek istediğinizden emin misiniz?`)) {
            executeBulkDelete();
        }
    });

    document.getElementById('btn-bulk-update').addEventListener('click', () => {
        if (state.selectedRowIds.length === 0) return;

        const col = document.getElementById('bulk-update-col').value;
        const val = document.getElementById('bulk-update-val').value;

        if (!col) {
            showToast('Lütfen güncellenecek sütunu seçin.', 'error');
            return;
        }

        const count = state.selectedRowIds.length;
        if (confirm(`Seçili ${count} satırın "${col}" sütununu "${val}" olarak güncellemek istediğinize emin misiniz?`)) {
            executeBulkUpdate(col, val);
        }
    });

    // Modal buttons
    document.getElementById('btn-close-row-modal').addEventListener('click', closeRowModal);
    document.getElementById('btn-cancel-row').addEventListener('click', closeRowModal);

    // Modal Form submit
    document.getElementById('row-edit-form').addEventListener('submit', handleRowSave);

    // Export Modal buttons
    const btnCloseExportModal = document.getElementById('btn-close-export-modal');
    if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);

    const btnCancelExport = document.getElementById('btn-cancel-export');
    if (btnCancelExport) btnCancelExport.addEventListener('click', closeExportModal);

    const btnConfirmExport = document.getElementById('btn-confirm-export');
    if (btnConfirmExport) btnConfirmExport.addEventListener('click', confirmExportDownload);

    const btnExportSelectAll = document.getElementById('btn-export-select-all');
    if (btnExportSelectAll) {
        btnExportSelectAll.addEventListener('click', () => {
            document.querySelectorAll('#export-columns-list input[type="checkbox"]').forEach(cb => cb.checked = true);
        });
    }

    const btnExportSelectNone = document.getElementById('btn-export-select-none');
    if (btnExportSelectNone) {
        btnExportSelectNone.addEventListener('click', () => {
            document.querySelectorAll('#export-columns-list input[type="checkbox"]').forEach(cb => cb.checked = false);
        });
    }
}

// Delete Table Call
async function deleteTableExecute(tableName) {
    showLoader('Tablo siliniyor...');
    try {
        await apiCall(`/api/tables/${tableName}`, {
            method: 'DELETE'
        });
        showToast(`"${tableName}" tablosu başarıyla silindi.`);
        state.activeTable = null;

        // Hide content panel
        document.getElementById('table-viewer-content').classList.add('hidden');
        document.getElementById('table-viewer-empty').classList.remove('hidden');

        loadTablesList();
    } catch (err) {
        console.error('Delete table error:', err);
    } finally {
        hideLoader();
    }
}

// Row Delete confirmation
async function deleteRowConfirm(rowid) {
    if (!state.activeTable) return;

    const verify = confirm("Bu satırı silmek istediğinize emin misiniz?");
    if (verify) {
        showLoader('Satır siliniyor...');
        try {
            await apiCall(`/api/tables/${state.activeTable}/row/${rowid}`, {
                method: 'DELETE'
            });
            showToast('Satır başarıyla silindi.');
            fetchTableData();
        } catch (err) {
            console.error('Delete row error:', err);
        } finally {
            hideLoader();
        }
    }
}

// Open Edit/Add Modal
function openRowModal(mode, rowData = null) {
    const modal = document.getElementById('row-modal');
    const title = document.getElementById('modal-row-title');
    const fieldsContainer = document.getElementById('row-modal-fields');

    fieldsContainer.innerHTML = '';

    if (mode === 'add') {
        title.textContent = 'Yeni Satır Ekle';
        modal.setAttribute('data-mode', 'add');
        modal.removeAttribute('data-rowid');
    } else {
        title.textContent = 'Satır Düzenle';
        modal.setAttribute('data-mode', 'edit');
        modal.setAttribute('data-rowid', rowData._rowid_);
    }

    const cols = state.tableData.columns;
    const types = state.tableData.column_types;

    cols.forEach(col => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = `${col} (${types[col] || 'TEXT'})`;

        let input;
        const colType = (types[col] || 'TEXT').toUpperCase();

        if (colType === 'INTEGER' || colType === 'REAL' || colType === 'NUMERIC' || colType === 'FLOAT' || colType === 'DOUBLE') {
            input = document.createElement('input');
            input.type = 'number';
            if (colType === 'REAL' || colType === 'FLOAT' || colType === 'DOUBLE') input.step = 'any';
            input.className = 'form-control';
            if (mode === 'edit' && rowData) {
                input.value = rowData[col] !== null ? rowData[col] : '';
            }
        } else if (colType === 'DATE') {
            input = document.createElement('input');
            input.type = 'date';
            input.className = 'form-control';
            if (mode === 'edit' && rowData && rowData[col]) {
                input.value = String(rowData[col]).substring(0, 10);
            }
        } else if (colType === 'DATETIME') {
            input = document.createElement('input');
            input.type = 'datetime-local';
            input.className = 'form-control';
            if (mode === 'edit' && rowData && rowData[col]) {
                input.value = String(rowData[col]).replace(' ', 'T').substring(0, 16);
            }
        } else if (colType === 'BOOLEAN') {
            input = document.createElement('select');
            input.className = 'form-control';
            input.innerHTML = `
                <option value="True">True</option>
                <option value="False">False</option>
            `;
            if (mode === 'edit' && rowData) {
                const dbVal = String(rowData[col]).toLowerCase();
                input.value = (dbVal === 'true' || dbVal === '1') ? 'True' : 'False';
            }
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            if (mode === 'edit' && rowData) {
                input.value = rowData[col] !== null ? rowData[col] : '';
            }
        }

        input.name = col;
        input.id = `input-field-${col}`;

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        fieldsContainer.appendChild(formGroup);
    });

    modal.classList.add('active');
}

function closeRowModal() {
    const modal = document.getElementById('row-modal');
    modal.classList.remove('active');
    document.getElementById('row-edit-form').reset();
}

async function handleRowSave(e) {
    e.preventDefault();
    const modal = document.getElementById('row-modal');
    const mode = modal.getAttribute('data-mode');

    const formData = {};
    const inputs = modal.querySelectorAll('.form-control');
    inputs.forEach(input => {
        const val = input.value.trim();
        // Convert to number if numeric and not empty
        if (input.type === 'number' && val !== '') {
            formData[input.name] = Number(val);
        } else {
            formData[input.name] = val === '' ? null : val;
        }
    });

    showLoader('Veri kaydediliyor...');
    try {
        if (mode === 'add') {
            await apiCall(`/api/tables/${state.activeTable}/row`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            showToast('Yeni satır başarıyla eklendi.');
        } else {
            const rowid = modal.getAttribute('data-rowid');
            await apiCall(`/api/tables/${state.activeTable}/row/${rowid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            showToast('Kayıt başarıyla güncellendi.');
        }

        closeRowModal();
        fetchTableData();
    } catch (err) {
        console.error('Row save error:', err);
    } finally {
        hideLoader();
    }
}

// ==========================================================================
// VIEW 3: IMPORT EXCEL/CSV VIEW LOGIC
// ==========================================================================
function initImportEvents() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // Drag & drop handlers
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Back button in config screen
    document.getElementById('btn-import-back').addEventListener('click', () => {
        document.getElementById('import-step-configure').classList.add('hidden');
        document.getElementById('import-step-upload').classList.remove('hidden');
        document.getElementById('file-input').value = ''; // reset file input
    });

    // Import Mode Radio change: append/new table options toggle
    const importRadios = document.querySelectorAll('input[name="import-mode"]');
    importRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const targetWrapper = document.getElementById('target-table-wrapper');
            const tableNameGroup = document.getElementById('import-table-name').closest('.form-group');

            if (e.target.value === 'append') {
                targetWrapper.classList.remove('hidden');
                tableNameGroup.classList.add('hidden');
                // populate existing tables selector
                populateTargetTablesSelector();
                renderSchemaMapping(true); // render append columns mapping
            } else {
                targetWrapper.classList.add('hidden');
                tableNameGroup.classList.remove('hidden');
                renderSchemaMapping(false); // render custom types config
            }
        });
    });

    // Excel sheet name change
    document.getElementById('import-sheet-name').addEventListener('change', (e) => {
        handleSheetChange(e.target.value);
    });

    // Execute Import Button
    document.getElementById('btn-execute-import').addEventListener('click', executeImport);
}

// Upload file to parse endpoint
async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    showLoader('Dosya yükleniyor ve çözümleniyor...');
    try {
        const data = await apiCall('/api/parse-file', {
            method: 'POST',
            body: formData
        });

        // Cache data
        state.uploadData.file_key = data.file_key;
        state.uploadData.file_ext = data.file_ext;
        state.uploadData.suggested_table_name = data.suggested_table_name;
        state.uploadData.sheets = data.sheets;
        state.uploadData.current_sheet = data.sheets.length > 0 ? data.sheets[0] : '';
        state.uploadData.columns = data.columns;
        state.uploadData.preview_rows = data.preview_rows;

        // Configure UI panels
        document.getElementById('import-table-name').value = data.suggested_table_name;

        // Sheet select display
        const sheetWrapper = document.getElementById('sheet-select-wrapper');
        const sheetSelect = document.getElementById('import-sheet-name');
        sheetSelect.innerHTML = '';

        if (data.sheets && data.sheets.length > 1) {
            sheetWrapper.classList.remove('hidden');
            data.sheets.forEach(sh => {
                const opt = document.createElement('option');
                opt.value = sh;
                opt.textContent = sh;
                sheetSelect.appendChild(opt);
            });
        } else {
            sheetWrapper.classList.add('hidden');
        }

        // Default Import Mode: new
        document.querySelector('input[name="import-mode"][value="new"]').checked = true;
        document.getElementById('target-table-wrapper').classList.add('hidden');
        document.getElementById('import-table-name').closest('.form-group').classList.remove('hidden');

        // Render mapping schema and preview
        renderSchemaMapping(false);
        renderImportPreview();

        // Switch steps
        document.getElementById('import-step-upload').classList.add('hidden');
        document.getElementById('import-step-configure').classList.remove('hidden');

        showToast('Dosya başarıyla çözümlendi.');
    } catch (err) {
        console.error('File upload & parse error:', err);
    } finally {
        hideLoader();
    }
}

// When user switches excel sheet, we fetch details of the new sheet.
// We will call a helper endpoint, but since we haven't implemented it yet on backend, 
// let's create a placeholder or we can implement the backend preview-sheet API.
// We'll write the API helper dynamically, which is easy.
async function handleSheetChange(sheetName) {
    state.uploadData.current_sheet = sheetName;
    showLoader('Çalışma sayfası yükleniyor...');
    try {
        const queryParams = new URLSearchParams({
            file_key: state.uploadData.file_key,
            file_ext: state.uploadData.file_ext,
            sheet_name: sheetName
        });

        // Let's implement `/api/preview-sheet` or fallback to sending the metadata on backend
        // We'll request a parse update
        const response = await fetch(`/api/preview-sheet?${queryParams}`);
        const data = await response.json();

        if (data.success) {
            state.uploadData.columns = data.columns;
            state.uploadData.preview_rows = data.preview_rows;

            const isAppend = document.querySelector('input[name="import-mode"]:checked').value === 'append';
            renderSchemaMapping(isAppend);
            renderImportPreview();
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        showToast(`Sayfa yüklenemedi: ${err.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Helper to populate target tables in append selector
function populateTargetTablesSelector() {
    const select = document.getElementById('import-target-table');
    select.innerHTML = '';

    if (state.tables.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Mevcut tablo bulunmuyor.';
        select.appendChild(opt);
        return;
    }

    state.tables.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name;
        opt.textContent = `${t.name} (${t.rowCount} satır)`;
        select.appendChild(opt);
    });

    // Redraw schema mapping when active target table changes
    select.onchange = () => {
        renderSchemaMapping(true);
    };
}

// Render column list with type selectors (new) or mapping selectors (append)
function renderSchemaMapping(isAppend = false) {
    const container = document.getElementById('schema-mapping-container');
    container.innerHTML = '';

    const fileCols = state.uploadData.columns;

    if (isAppend) {
        // Appending to an existing table
        const targetTableName = document.getElementById('import-target-table').value;
        const targetTable = state.tables.find(t => t.name === targetTableName);

        if (!targetTable) {
            container.innerHTML = `<p class="text-muted text-center p-3">Hedef tablo seçiniz.</p>`;
            return;
        }

        fileCols.forEach(col => {
            const row = document.createElement('div');
            row.className = 'schema-row';

            // Map logic: find a db column that matches the file column name closely (case-insensitive)
            let matchedDbCol = '';
            const dbCols = targetTable.columns;

            const exactMatch = dbCols.find(d => d.name.toLowerCase() === col.name.toLowerCase());
            if (exactMatch) {
                matchedDbCol = exactMatch.name;
            } else {
                // Try fuzzy prefix
                const prefixMatch = dbCols.find(d => d.name.toLowerCase().includes(col.name.toLowerCase()) || col.name.toLowerCase().includes(d.name.toLowerCase()));
                if (prefixMatch) matchedDbCol = prefixMatch.name;
            }

            let selectOptions = `<option value="">-- Dahil Etme (İptal) --</option>`;
            dbCols.forEach(d => {
                const selected = d.name === matchedDbCol ? 'selected' : '';
                selectOptions += `<option value="${d.name}" ${selected}>${d.name} (${d.type})</option>`;
            });

            row.innerHTML = `
                <div class="file-col-name" title="${col.name}">${col.name}</div>
                <i class="fa-solid fa-arrow-right schema-arrow-icon"></i>
                <select class="form-control form-control-sm col-mapping-selector" data-file-col="${col.name}">
                    ${selectOptions}
                </select>
            `;
            container.appendChild(row);
        });
    } else {
        // Creating a new table
        fileCols.forEach(col => {
            const row = document.createElement('div');
            row.className = 'schema-row';

            const types = ['TEXT', 'INTEGER', 'REAL', 'FLOAT', 'DATE', 'DATETIME', 'BOOLEAN'];
            let selectOptions = '';
            types.forEach(t => {
                const selected = col.type === t ? 'selected' : '';
                selectOptions += `<option value="${t}" ${selected}>${t}</option>`;
            });

            row.innerHTML = `
                <input type="text" class="form-control form-control-sm import-col-name-input" value="${col.name}" placeholder="Sütun Adı">
                <i class="fa-solid fa-gears schema-arrow-icon"></i>
                <select class="form-control form-control-sm import-col-type-select" data-original-name="${col.name}">
                    ${selectOptions}
                </select>
            `;
            container.appendChild(row);
        });
    }
}

// Render dynamic preview of Excel/CSV data
function renderImportPreview() {
    const table = document.getElementById('import-preview-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    const fileCols = state.uploadData.columns;
    const previewRows = state.uploadData.preview_rows;

    if (fileCols.length === 0) return;

    // Header
    const headerTr = document.createElement('tr');
    fileCols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.name;
        headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);

    // Rows
    if (previewRows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${fileCols.length}" class="text-center text-muted">Önizleme verisi yok.</td>`;
        tbody.appendChild(tr);
        return;
    }

    previewRows.forEach(row => {
        const tr = document.createElement('tr');
        fileCols.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col.name] !== undefined ? row[col.name] : '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// Run the import command to backend
async function executeImport() {
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    const sheetName = state.uploadData.current_sheet;

    const bodyData = {
        file_key: state.uploadData.file_key,
        file_ext: state.uploadData.file_ext,
        sheet_name: sheetName,
        import_mode: mode
    };

    if (mode === 'new') {
        const tableName = document.getElementById('import-table-name').value.trim();
        if (!tableName) {
            showToast('Oluşturulacak tablo adını giriniz.', 'error');
            return;
        }
        bodyData.table_name = tableName;

        // Grab custom types setup
        const colDefinitions = [];
        const rows = document.querySelectorAll('#schema-mapping-container .schema-row');
        let hasError = false;

        rows.forEach(r => {
            const nameInput = r.querySelector('.import-col-name-input');
            const typeSelect = r.querySelector('.import-col-type-select');

            const colName = nameInput.value.trim();
            if (!colName) {
                hasError = true;
                return;
            }
            colDefinitions.push({
                name: colName,
                type: typeSelect.value
            });
        });

        if (hasError || colDefinitions.length === 0) {
            showToast('Lütfen tüm sütun adlarını geçerli doldurun.', 'error');
            return;
        }

        bodyData.columns = colDefinitions;

    } else {
        // append mode
        const targetTable = document.getElementById('import-target-table').value;
        if (!targetTable) {
            showToast('Hedef bir tablo seçmeniz gerekiyor.', 'error');
            return;
        }
        bodyData.table_name = targetTable;

        // Grab mapping mappings
        const mapping = {};
        const selectors = document.querySelectorAll('.col-mapping-selector');
        selectors.forEach(sel => {
            const fileCol = sel.getAttribute('data-file-col');
            const dbCol = sel.value;
            if (dbCol) {
                mapping[fileCol] = dbCol;
            }
        });

        if (Object.keys(mapping).length === 0) {
            showToast('En az bir sütunu eşleştirmeniz gerekmektedir.', 'error');
            return;
        }
        bodyData.column_mapping = mapping;
    }

    showLoader('Veriler SQLite veritabanına aktarılıyor...');
    try {
        const data = await apiCall('/api/import-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        showToast(data.message);

        // Reset import screen upload step
        document.getElementById('import-step-configure').classList.add('hidden');
        document.getElementById('import-step-upload').classList.remove('hidden');
        document.getElementById('file-input').value = '';

        // Reload list and switch view
        state.activeTable = bodyData.table_name;
        await loadTablesList(bodyData.table_name);
        switchTab('tables');
    } catch (err) {
        console.error('Execute import error:', err);
    } finally {
        hideLoader();
    }
}

// ==========================================================================
// VIEW 4: CREATE TABLE MANUALLY VIEW LOGIC
// ==========================================================================
function initTableCreatorEvents() {
    const addColBtn = document.getElementById('btn-add-column-def');
    const colsList = document.getElementById('column-defs-list');

    // Add column row button
    addColBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'column-def-row';
        row.innerHTML = `
            <div class="form-group col-name">
                <input type="text" class="form-control col-name-input" placeholder="Sütun Adı" required>
            </div>
            <div class="form-group col-type">
                <select class="form-control col-type-select">
                    <option value="TEXT" selected>Metin (TEXT)</option>
                    <option value="INTEGER">Sayı (INTEGER)</option>
                    <option value="REAL">Ondalıklı Sayı (REAL)</option>
                    <option value="FLOAT">Ondalıklı Sayı (FLOAT)</option>
                    <option value="DATE">Tarih (DATE)</option>
                    <option value="DATETIME">Tarih & Saat (DATETIME)</option>
                    <option value="BOOLEAN">Doğru/Yanlış (BOOLEAN)</option>
                </select>
            </div>
            <button type="button" class="btn-delete-col" title="Sütunu Sil">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        // Wire delete row action
        row.querySelector('.btn-delete-col').onclick = () => {
            row.remove();
        };

        colsList.appendChild(row);
    });

    // Wire submission of manual form
    const form = document.getElementById('manual-table-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tableName = document.getElementById('manual-table-name').value.trim();
        if (!tableName) return;

        const columns = [];
        const rows = document.querySelectorAll('#column-defs-list .column-def-row');

        rows.forEach(r => {
            const nameInput = r.querySelector('.col-name-input');
            const typeSelect = r.querySelector('.col-type-select');

            columns.push({
                name: nameInput.value.trim(),
                type: typeSelect.value
            });
        });

        if (columns.length === 0) {
            showToast('En az bir sütun eklemelisiniz.', 'error');
            return;
        }

        showLoader('Tablo oluşturuluyor...');
        try {
            const data = await apiCall('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_name: tableName,
                    columns: columns
                })
            });

            showToast(data.message);
            form.reset();

            // Reload and switch
            state.activeTable = tableName;
            await loadTablesList(tableName);
            switchTab('tables');
        } catch (err) {
            console.error('Create table manually error:', err);
        } finally {
            hideLoader();
        }
    });
}

// Bulk actions helper functions
function updateRowCheckboxesState() {
    const checkboxes = document.querySelectorAll('.row-select-checkbox');
    checkboxes.forEach(cb => {
        const rowid = parseInt(cb.getAttribute('data-rowid'));
        cb.checked = state.selectedRowIds.includes(rowid);
    });

    const selectAll = document.getElementById('select-all-rows');
    if (selectAll) {
        const rows = state.tableData.rows;
        selectAll.checked = rows.length > 0 && rows.every(r => state.selectedRowIds.includes(r._rowid_));
    }

    updateBulkActionsBar();
}

function updateBulkActionsBar() {
    const bar = document.getElementById('bulk-actions-bar');
    const countSpan = document.getElementById('bulk-selected-count');
    const updateColSelect = document.getElementById('bulk-update-col');

    if (state.selectedRowIds.length > 0) {
        countSpan.textContent = state.selectedRowIds.length;

        // Populate update columns dropdown dynamically
        const currentVal = updateColSelect.value;
        updateColSelect.innerHTML = '';
        state.tableData.columns.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col;
            opt.textContent = col;
            updateColSelect.appendChild(opt);
        });
        if (currentVal && state.tableData.columns.includes(currentVal)) {
            updateColSelect.value = currentVal;
        }

        bar.classList.remove('hidden');
    } else {
        bar.classList.add('hidden');
    }
}

async function executeBulkDelete() {
    showLoader('Toplu silme işlemi yapılıyor...');
    try {
        await apiCall(`/api/tables/${state.activeTable}/rows/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowids: state.selectedRowIds })
        });
        showToast('Seçilen satırlar başarıyla silindi.');
        state.selectedRowIds = [];
        fetchTableData();
    } catch (err) {
        console.error('Bulk delete error:', err);
    } finally {
        hideLoader();
    }
}

async function executeBulkUpdate(column, value) {
    showLoader('Toplu güncelleme işlemi yapılıyor...');
    try {
        await apiCall(`/api/tables/${state.activeTable}/rows/bulk-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rowids: state.selectedRowIds,
                column: column,
                value: value
            })
        });
        showToast('Seçilen satırlar başarıyla güncellendi.');
        document.getElementById('bulk-update-val').value = '';
        state.selectedRowIds = [];
        fetchTableData();
    } catch (err) {
        console.error('Bulk update error:', err);
    } finally {
        hideLoader();
    }
}

// Rebuild and update the relation filter dropdown options
async function updateRelationFiltersDropdown() {
    const wrapper = document.getElementById('relation-filter-wrapper');
    const select = document.getElementById('relation-filter-select');

    if (!state.activeTable || !wrapper || !select) {
        if (wrapper) wrapper.classList.add('hidden');
        return;
    }

    try {
        const data = await apiCall('/api/relations');
        const relations = data.relations;

        // Find relations involving active table
        const activeRelations = relations.filter(r => r.child_table === state.activeTable || r.parent_table === state.activeTable);

        if (activeRelations.length === 0) {
            wrapper.classList.add('hidden');
            state.filters.rel_filter = null;
            select.innerHTML = '<option value="">Tüm Kayıtlar</option>';
            return;
        }

        select.innerHTML = '<option value="">Tüm Kayıtlar</option>';

        activeRelations.forEach(r => {
            if (r.child_table === state.activeTable) {
                // Active table is the child table. E.g. T.child_column -> parent_table.parent_column
                // Matched Option
                const optMatch = document.createElement('option');
                optMatch.value = JSON.stringify({
                    type: 'matched',
                    table: r.parent_table,
                    col: r.child_column,
                    other_col: r.parent_column
                });
                optMatch.textContent = `Eşleşen: [${r.child_column} -> ${r.parent_table}.${r.parent_column}]`;
                select.appendChild(optMatch);

                // Unmatched Option
                const optUnmatch = document.createElement('option');
                optUnmatch.value = JSON.stringify({
                    type: 'unmatched',
                    table: r.parent_table,
                    col: r.child_column,
                    other_col: r.parent_column
                });
                optUnmatch.textContent = `Eşleşmeyen: [${r.child_column} -> ${r.parent_table}.${r.parent_column}]`;
                select.appendChild(optUnmatch);
            } else {
                // Active table is the parent table. E.g. child_table.child_column -> T.parent_column
                // Matched Option
                const optMatch = document.createElement('option');
                optMatch.value = JSON.stringify({
                    type: 'matched',
                    table: r.child_table,
                    col: r.parent_column,
                    other_col: r.child_column
                });
                optMatch.textContent = `Eşleşen: [${r.parent_column} <- ${r.child_table}.${r.child_column}]`;
                select.appendChild(optMatch);

                // Unmatched Option
                const optUnmatch = document.createElement('option');
                optUnmatch.value = JSON.stringify({
                    type: 'unmatched',
                    table: r.child_table,
                    col: r.parent_column,
                    other_col: r.child_column
                });
                optUnmatch.textContent = `Eşleşmeyen: [${r.parent_column} <- ${r.child_table}.${r.child_column}]`;
                select.appendChild(optUnmatch);
            }
        });

        // Restore value if still valid
        if (state.filters.rel_filter) {
            const currentStr = JSON.stringify(state.filters.rel_filter);
            const exists = Array.from(select.options).some(opt => opt.value === currentStr);
            if (exists) {
                select.value = currentStr;
            } else {
                state.filters.rel_filter = null;
                select.value = '';
            }
        } else {
            select.value = '';
        }

        wrapper.classList.remove('hidden');
    } catch (err) {
        console.error('Update relation filters error:', err);
        wrapper.classList.add('hidden');
    }
}

// ==========================================================================
// VIEW 5: TABLE RELATIONSHIPS VIEW LOGIC
// ==========================================================================
const relationsState = {
    parentTable: null,
    childTable: null,
    parentColumn: null,
    childColumn: null,
    tablesData: {} // Cache table columns details
};

function initRelationsEvents() {
    // Dropdown selections
    document.getElementById('relation-table-a').addEventListener('change', (e) => {
        selectRelationTable('a', e.target.value);
    });

    document.getElementById('relation-table-b').addEventListener('change', (e) => {
        selectRelationTable('b', e.target.value);
    });

    // Create Relation Button
    document.getElementById('btn-create-relation').addEventListener('click', () => {
        createRelation();
    });

    // Swap Tables Button
    const btnSwap = document.getElementById('btn-swap-relation-tables');
    if (btnSwap) {
        btnSwap.addEventListener('click', swapRelationTables);
    }

    // Relation Type Select
    const typeSelect = document.getElementById('relation-type-select');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const actionGroups = document.querySelectorAll('.relation-on-actions-group');
            if (e.target.value === 'logical') {
                actionGroups.forEach(g => g.classList.add('hidden'));
            } else {
                actionGroups.forEach(g => g.classList.remove('hidden'));
            }
        });
    }
}

function swapRelationTables() {
    const selectA = document.getElementById('relation-table-a');
    const selectB = document.getElementById('relation-table-b');

    const valA = selectA.value;
    const valB = selectB.value;

    if (!valA && !valB) return;

    selectA.value = valB;
    selectB.value = valA;

    if (valB) {
        selectRelationTable('a', valB);
    } else {
        resetRelationTableSelection('a');
    }

    if (valA) {
        selectRelationTable('b', valA);
    } else {
        resetRelationTableSelection('b');
    }
}

async function loadRelationsData() {
    showLoader('İlişki verileri yükleniyor...');
    try {
        // 1. Fetch tables list to populate dropdowns
        const tablesRes = await apiCall('/api/tables');
        const tables = tablesRes.tables;

        const selectA = document.getElementById('relation-table-a');
        const selectB = document.getElementById('relation-table-b');

        // Save current selections
        const prevA = selectA.value;
        const prevB = selectB.value;

        // Reset selections
        selectA.innerHTML = '<option value="" disabled selected>Tablo Seçin...</option>';
        selectB.innerHTML = '<option value="" disabled selected>Tablo Seçin...</option>';

        tables.forEach(t => {
            const optA = document.createElement('option');
            optA.value = t.name;
            optA.textContent = t.name;
            selectA.appendChild(optA);

            const optB = document.createElement('option');
            optB.value = t.name;
            optB.textContent = t.name;
            selectB.appendChild(optB);
        });

        // Restore selections if valid
        if (prevA && tables.some(t => t.name === prevA)) {
            selectA.value = prevA;
        } else {
            resetRelationTableSelection('a');
        }

        if (prevB && tables.some(t => t.name === prevB)) {
            selectB.value = prevB;
        } else {
            resetRelationTableSelection('b');
        }

        // 2. Fetch existing relations
        const relsRes = await apiCall('/api/relations');
        renderRelationsList(relsRes.relations);

    } catch (err) {
        console.error('Relations loading error:', err);
    } finally {
        hideLoader();
    }
}

function resetRelationTableSelection(role) {
    if (role === 'a') {
        relationsState.parentTable = null;
        relationsState.parentColumn = null;
        document.getElementById('relation-table-a-title').textContent = 'Ana Tablo Seçilmedi';
        document.getElementById('relation-table-a-cols').innerHTML = '<div class="text-muted text-center p-4">Lütfen bir ana tablo seçin.</div>';
    } else {
        relationsState.childTable = null;
        relationsState.childColumn = null;
        document.getElementById('relation-table-b-title').textContent = 'İlişkili Tablo Seçilmedi';
        document.getElementById('relation-table-b-cols').innerHTML = '<div class="text-muted text-center p-4">Lütfen bir ilişkili tablo seçin.</div>';
    }

    const sugContainer = document.getElementById('relation-suggestions-container');
    if (sugContainer) sugContainer.classList.add('hidden');
    const sugList = document.getElementById('relation-suggestions-list');
    if (sugList) sugList.innerHTML = '';

    updateConnectionInfo();
}

async function selectRelationTable(role, tableName) {
    showLoader('Tablo sütunları yükleniyor...');
    try {
        const queryParams = new URLSearchParams({ page: 1, per_page: 1 });
        const res = await apiCall(`/api/tables/${tableName}?${queryParams}`);

        // Cache table columns & types
        relationsState.tablesData[tableName] = {
            columns: res.columns,
            column_types: res.column_types
        };

        // Fetch relations to check for FK and PK decorations
        const relsRes = await apiCall('/api/relations');
        const relations = relsRes.relations;

        if (role === 'a') {
            relationsState.parentTable = tableName;
            relationsState.parentColumn = null; // reset selection

            document.getElementById('relation-table-a-title').innerHTML = `<i class="fa-solid fa-table text-purple"></i> ${tableName}`;
            renderColumnsList('a', tableName, relations);
        } else {
            relationsState.childTable = tableName;
            relationsState.childColumn = null; // reset selection

            document.getElementById('relation-table-b-title').innerHTML = `<i class="fa-solid fa-table text-blue"></i> ${tableName}`;
            renderColumnsList('b', tableName, relations);
        }

        updateConnectionInfo();

        // Trigger auto-analysis if both tables are selected
        if (relationsState.parentTable && relationsState.childTable) {
            analyzeAndSuggestRelations(relationsState.parentTable, relationsState.childTable);
        }
    } catch (err) {
        console.error('Select relation table error:', err);
    } finally {
        hideLoader();
    }
}

function renderColumnsList(role, tableName, relations) {
    const listContainer = document.getElementById(role === 'a' ? 'relation-table-a-cols' : 'relation-table-b-cols');
    listContainer.innerHTML = '';

    const tableInfo = relationsState.tablesData[tableName];
    if (!tableInfo) return;

    tableInfo.columns.forEach(col => {
        const colType = tableInfo.column_types[col] || 'TEXT';

        const relAssociated = relations.find(r => r.parent_table === tableName && r.parent_column === col);
        const isParentInRels = !!relAssociated;
        const isLogicalParent = relAssociated && relAssociated.is_logical;
        const isChildInRels = relations.some(r => r.child_table === tableName && r.child_column === col);

        const item = document.createElement('div');
        item.className = 'column-item';
        item.setAttribute('data-col', col);

        let badgesHtml = '';
        if (isParentInRels) {
            if (isLogicalParent) {
                badgesHtml += ' <span class="badge-logical">Sanal</span>';
            } else {
                badgesHtml += ' <span class="badge-pk">PK/UNI</span>';
            }
        }
        if (isChildInRels) {
            badgesHtml += ' <span class="badge-fk">FK</span>';
        }

        item.innerHTML = `
            <span class="column-item-name">
                <i class="fa-solid fa-columns text-muted text-xs" style="flex-shrink: 0;"></i>
                <span class="col-name-text">${col}</span>
                <span style="display: inline-flex; gap: 4px; flex-shrink: 0; align-items: center;">${badgesHtml}</span>
            </span>
            <span class="column-item-type" style="flex-shrink: 0; margin-left: 8px;">${colType}</span>
        `;

        item.addEventListener('click', () => {
            const siblingItems = listContainer.querySelectorAll('.column-item');
            siblingItems.forEach(i => i.classList.remove('selected'));

            item.classList.add('selected');

            if (role === 'a') {
                relationsState.parentColumn = col;
            } else {
                relationsState.childColumn = col;
            }

            updateConnectionInfo();
        });

        listContainer.appendChild(item);
    });
}

function updateConnectionInfo() {
    const statusBox = document.querySelector('.connect-selection-status');
    const optionsBox = document.getElementById('relation-actions-options');
    const createBtn = document.getElementById('btn-create-relation');

    const pTable = relationsState.parentTable;
    const pCol = relationsState.parentColumn;
    const cTable = relationsState.childTable;
    const cCol = relationsState.childColumn;

    if (pTable && cTable) {
        if (pCol && cCol) {
            statusBox.innerHTML = `
                <div class="alert alert-info py-2" style="background: rgba(99, 102, 241, 0.05); border: 1px solid var(--border-color); border-radius: 8px;">
                    <p class="font-semibold text-indigo mb-1" style="color: var(--accent-primary)">İlişki Tanımı Hazır:</p>
                    <p style="font-size: 0.95rem;">
                        <strong>${cTable}.${cCol}</strong> <i class="fa-solid fa-arrow-right-long text-xs px-1"></i> <strong>${pTable}.${pCol}</strong>
                    </p>
                </div>
            `;
            optionsBox.classList.remove('hidden');
            createBtn.classList.remove('hidden');
        } else {
            statusBox.innerHTML = `
                <p class="text-muted">
                    Tablolar seçildi. Şimdi sol tablodan bir anahtar (Parent) sütun ve sağ tablodan bir yabancı anahtar (Child) sütun seçin.
                </p>
            `;
            optionsBox.classList.add('hidden');
            createBtn.classList.add('hidden');

            const typeSelect = document.getElementById('relation-type-select');
            if (typeSelect) {
                typeSelect.value = 'logical';
                document.querySelectorAll('.relation-on-actions-group').forEach(g => g.classList.add('hidden'));
            }
        }
    } else {
        statusBox.innerHTML = `
            <p class="text-muted">
                Bağlantı kurmak için sol taraftan Ana Tablo (Parent) ve sağ taraftan İlişkili Tablo (Child) seçin, ardından bağlanacak sütunlara tıklayın.
            </p>
        `;
        optionsBox.classList.add('hidden');
        createBtn.classList.add('hidden');

        const typeSelect = document.getElementById('relation-type-select');
        if (typeSelect) {
            typeSelect.value = 'logical';
            document.querySelectorAll('.relation-on-actions-group').forEach(g => g.classList.add('hidden'));
        }
    }
}

async function createRelation() {
    const pTable = relationsState.parentTable;
    const pCol = relationsState.parentColumn;
    const cTable = relationsState.childTable;
    const cCol = relationsState.childColumn;
    const onUpdate = document.getElementById('relation-on-update').value;
    const onDelete = document.getElementById('relation-on-delete').value;

    if (!pTable || !pCol || !cTable || !cCol) {
        showToast('Lütfen tüm seçimleri tamamlayın.', 'error');
        return;
    }

    if (pTable === cTable) {
        showToast('Bir tablo kendisiyle bu arayüzden ilişkilendirilemez.', 'error');
        return;
    }

    const isLogical = document.getElementById('relation-type-select').value === 'logical';

    showLoader('Tablo ilişkisi oluşturuluyor...');
    try {
        const res = await apiCall('/api/relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parent_table: pTable,
                parent_column: pCol,
                child_table: cTable,
                child_column: cCol,
                on_update: onUpdate,
                on_delete: onDelete,
                is_logical: isLogical
            }),
            silentError: true
        });

        showToast(res.message);
        await loadRelationsData();

        if (pTable) selectRelationTable('a', pTable);
        if (cTable) selectRelationTable('b', cTable);

    } catch (err) {
        console.error('Relation creation error:', err);
        const errMsg = err.message || 'İlişki kurulurken bir hata oluştu.';
        showToast(errMsg, 'error');
    } finally {
        hideLoader();
    }
}

function renderRelationsList(relations) {
    const tbody = document.querySelector('#relations-list-table tbody');
    tbody.innerHTML = '';

    if (relations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Henüz tanımlı ilişki bulunmamaktadır.</td></tr>';
        return;
    }

    relations.forEach(r => {
        let directionIcon, parentBadgeClass, childBadgeClass;

        if (r.is_logical) {
            directionIcon = '<i class="fa-solid fa-circle-nodes text-warning" title="Sanal İlişki (Veritabanı kısıtı yoktur)"></i>';
            parentBadgeClass = 'badge-logical';
            childBadgeClass = 'badge-fk';
        } else {
            directionIcon = '<i class="fa-solid fa-link text-indigo" title="Fiziksel SQL İlişkisi"></i>';
            parentBadgeClass = 'badge-pk';
            childBadgeClass = 'badge-fk';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.parent_table}</strong></td>
            <td><span class="badge ${parentBadgeClass}">${r.parent_column}${r.is_logical ? ' (Sanal)' : ''}</span></td>
            <td class="text-center">${directionIcon}</td>
            <td><strong>${r.child_table}</strong></td>
            <td><span class="badge ${childBadgeClass}">${r.child_column}</span></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteRelation('${r.child_table}', '${r.child_column}', '${r.parent_table}', '${r.parent_column}', ${r.is_logical})">
                    <i class="fa-solid fa-link-slash"></i> İlişkiyi Kaldır
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteRelation(childTable, childColumn, parentTable, parentColumn, isLogical = false) {
    if (!confirm(`'${childTable}.${childColumn}' -> '${parentTable}.${parentColumn}' arasındaki ilişkiyi kaldırmak istediğinize emin misiniz?`)) {
        return;
    }

    showLoader('Tablo ilişkisi kaldırılıyor...');
    try {
        const res = await apiCall('/api/relations', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parent_table: parentTable,
                parent_column: parentColumn,
                child_table: childTable,
                child_column: childColumn,
                is_logical: isLogical
            })
        });

        showToast(res.message);
        await loadRelationsData();

        if (relationsState.parentTable) selectRelationTable('a', relationsState.parentTable);
        if (relationsState.childTable) selectRelationTable('b', relationsState.childTable);

    } catch (err) {
        console.error('Relation deletion error:', err);
    } finally {
        hideLoader();
    }
}

async function analyzeAndSuggestRelations(parentTable, childTable) {
    const suggestionsContainer = document.getElementById('relation-suggestions-container');
    const suggestionsList = document.getElementById('relation-suggestions-list');

    if (!suggestionsContainer || !suggestionsList) return;

    suggestionsContainer.classList.add('hidden');
    suggestionsList.innerHTML = '';

    if (!parentTable || !childTable) return;

    try {
        const res = await apiCall('/api/relations/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table_a: parentTable,
                table_b: childTable
            })
        });

        const suggestions = res.suggestions || [];
        if (suggestions.length === 0) {
            suggestionsList.innerHTML = '<p class="text-xs text-muted" style="font-size: 0.75rem;">Eşleşen sütun veya değer bulunamadı.</p>';
            suggestionsContainer.classList.remove('hidden');
            return;
        }

        suggestions.forEach(s => {
            const card = document.createElement('div');
            card.className = 'suggestion-card';

            card.innerHTML = `
                <div class="suggestion-info">
                    <div><strong>${s.child_column}</strong> <i class="fa-solid fa-arrow-right text-xs" style="font-size: 0.65rem;"></i> <strong>${s.parent_column}</strong></div>
                    <div class="suggestion-meta">Değer Eşleşmesi: %${s.overlap_percent} (${s.matching_values_count}/${s.total_child_values_count})</div>
                </div>
                <button class="btn-auto-match" onclick="autoSelectAndMatch('${s.parent_column}', '${s.child_column}')">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Seç
                </button>
            `;
            suggestionsList.appendChild(card);
        });

        suggestionsContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Relations analysis error:', err);
    }
}

function autoSelectAndMatch(parentCol, childCol) {
    // 1. Find column item for parentCol in Table A and select it
    const listA = document.getElementById('relation-table-a-cols');
    if (listA) {
        const itemA = listA.querySelector(`.column-item[data-col="${parentCol}"]`);
        if (itemA) {
            listA.querySelectorAll('.column-item').forEach(i => i.classList.remove('selected'));
            itemA.classList.add('selected');
            relationsState.parentColumn = parentCol;
        }
    }

    // 2. Find column item for childCol in Table B and select it
    const listB = document.getElementById('relation-table-b-cols');
    if (listB) {
        const itemB = listB.querySelector(`.column-item[data-col="${childCol}"]`);
        if (itemB) {
            listB.querySelectorAll('.column-item').forEach(i => i.classList.remove('selected'));
            itemB.classList.add('selected');
            relationsState.childColumn = childCol;
        }
    }

    // 3. Update UI connection info
    updateConnectionInfo();

    // 4. Show a toast
    showToast('Önerilen sütunlar seçildi. İlişkiyi Tanımla butonuna basabilirsiniz.');
}

// Opens column selection modal for exporting
function exportTable(format) {
    if (!state.activeTable) return;

    state.exportFormat = format;

    const container = document.getElementById('export-columns-list');
    if (!container) return;
    container.innerHTML = '';

    const columns = state.tableData.columns;
    if (columns.length === 0) {
        showToast('Aktarılacak sütun bulunamadı.', 'error');
        return;
    }

    columns.forEach(col => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" name="export_col" value="${col}" checked>
            <span>${col}</span>
        `;
        container.appendChild(label);
    });

    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    state.exportFormat = null;
}

function confirmExportDownload() {
    if (!state.activeTable || !state.exportFormat) return;

    // Collect selected columns
    const checkedCheckboxes = document.querySelectorAll('#export-columns-list input[name="export_col"]:checked');
    if (checkedCheckboxes.length === 0) {
        showToast('Lütfen en az bir sütun seçin.', 'error');
        return;
    }

    const selectedCols = Array.from(checkedCheckboxes).map(cb => cb.value);

    // Build query parameters
    const searchInput = document.getElementById('table-search-input');
    const searchVal = searchInput ? searchInput.value.trim() : '';

    const queryParams = new URLSearchParams({
        format: state.exportFormat,
        search: searchVal,
        sort_by: state.filters.sort_by || '',
        sort_order: state.filters.sort_order || 'asc',
        columns: selectedCols.join(',')
    });

    // Gather all current values from column filter inputs directly from the DOM
    document.querySelectorAll('.column-filter-input').forEach(input => {
        const col = input.getAttribute('data-col');
        const val = input.value.trim();
        if (col && val) {
            queryParams.append(`filter_${col}`, val);
        }
    });

    // Append relation filter if active
    const relFilterSelect = document.getElementById('relation-filter-select');
    if (relFilterSelect && relFilterSelect.value) {
        try {
            const relFilter = JSON.parse(relFilterSelect.value);
            queryParams.append('rel_filter_type', relFilter.type);
            queryParams.append('rel_filter_table', relFilter.table);
            queryParams.append('rel_filter_col', relFilter.col);
            queryParams.append('rel_filter_other_col', relFilter.other_col);
        } catch (e) {
            console.error('Error parsing relation filter:', e);
        }
    }

    // Close modal
    closeExportModal();

    // Trigger download
    window.location.href = `/api/tables/${state.activeTable}/export?${queryParams.toString()}`;
}

// Expose globally for inline html onclicks
window.deleteRelation = deleteRelation;
window.initRelationsEvents = initRelationsEvents;
window.loadRelationsData = loadRelationsData;
window.selectRelationTable = selectRelationTable;
window.createRelation = createRelation;
window.autoSelectAndMatch = autoSelectAndMatch;
window.exportTable = exportTable;
window.closeExportModal = closeExportModal;
window.confirmExportDownload = confirmExportDownload;
window.swapRelationTables = swapRelationTables;

// ==========================================================================
// INVENTORY ANALYTICS DASHBOARD IMPLEMENTATION
// ==========================================================================
async function loadInventoryTab() {
    const select = document.getElementById('inv-select-table');
    if (!select) return;

    // Clear list
    select.innerHTML = '<option value="" disabled selected>Tablo Seçin...</option>';

    // Fetch tables
    try {
        const data = await apiCall('/api/tables');
        state.tables = data.tables || [];

        state.tables.forEach(tableObj => {
            const tableName = tableObj.name;
            const opt = document.createElement('option');
            opt.value = tableName;
            opt.textContent = tableName;
            select.appendChild(opt);
        });

        // Auto-select first table matching inventory or devices keyword
        let autoSelectTable = "";
        const keywords = ['sarf', 'envanter', 'inventory', 'device', 'cihaz', 'equipment', 'malzeme'];
        for (const tObj of state.tables) {
            const t = tObj.name;
            if (keywords.some(k => t.toLowerCase().includes(k))) {
                autoSelectTable = t;
                break;
            }
        }

        if (autoSelectTable) {
            select.value = autoSelectTable;
            loadInventoryTableData(autoSelectTable);
        }
    } catch (err) {
        console.error('Error loading tables for inventory:', err);
    }

    // Bind listeners once
    if (!select.dataset.listenerBound) {
        select.dataset.listenerBound = 'true';

        select.addEventListener('change', (e) => {
            loadInventoryTableData(e.target.value);
        });

        // Mapping dropdowns change events
        ['inv-col-material', 'inv-col-model', 'inv-col-qty', 'inv-col-mac', 'inv-col-serial'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    const key = id.replace('inv-col-', '');
                    state.inventoryState.mappedCols[key] = e.target.value;
                    // Reset selection when mappings change to avoid index mismatch
                    state.inventoryState.selectedMaterial = null;
                    document.getElementById('btn-inv-clear-filter').style.display = 'none';
                    calculateAndRenderInventory();
                });
            }
        });

        // Clear filter button click
        const btnClear = document.getElementById('btn-inv-clear-filter');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                state.inventoryState.selectedMaterial = null;
                btnClear.style.display = 'none';

                // Remove active class from all rows in distribution table
                document.querySelectorAll('#inv-materials-tbody tr').forEach(r => r.classList.remove('active-row-highlight'));

                renderInventoryDevicesTable();
            });
        }

        // Modal close buttons
        const btnCloseModal1 = document.getElementById('btn-close-dev-modal');
        if (btnCloseModal1) {
            btnCloseModal1.addEventListener('click', closeDeviceDetailModal);
        }
        const btnCloseModal2 = document.getElementById('btn-close-dev-modal-btn');
        if (btnCloseModal2) {
            btnCloseModal2.addEventListener('click', closeDeviceDetailModal);
        }

        // Save Mapping button click
        const btnSaveMapping = document.getElementById('btn-save-inv-mapping');
        if (btnSaveMapping) {
            btnSaveMapping.addEventListener('click', async () => {
                const tableName = state.inventoryState.activeTable;
                if (!tableName) {
                    showToast('Lütfen önce bir tablo seçin.', 'error');
                    return;
                }

                const mapped = state.inventoryState.mappedCols;
                if (!mapped.material) {
                    showToast('Malzeme Adı sütununu seçmelisiniz.', 'error');
                    return;
                }

                showLoader('Eşleştirme kaydediliyor...');
                try {
                    const res = await apiCall('/api/inventory/mapping', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            table_name: tableName,
                            material: mapped.material,
                            model: mapped.model,
                            qty: mapped.qty,
                            mac: mapped.mac,
                            serial: mapped.serial
                        })
                    });

                    if (res && res.success) {
                        showToast(res.message || 'Eşleştirme kaydedildi.');
                        const btnDelMapping = document.getElementById('btn-delete-inv-mapping');
                        if (btnDelMapping) btnDelMapping.classList.remove('hidden');
                    } else {
                        showToast(res.error || 'Kaydederken bir hata oluştu.', 'error');
                    }
                } catch (err) {
                    console.error('Error saving mapping:', err);
                    showToast('Kaydederken bir hata oluştu.', 'error');
                } finally {
                    hideLoader();
                }
            });
        }

        // Delete Mapping button click
        const btnDeleteMapping = document.getElementById('btn-delete-inv-mapping');
        if (btnDeleteMapping) {
            btnDeleteMapping.addEventListener('click', async () => {
                const tableName = state.inventoryState.activeTable;
                if (!tableName) return;

                showLoader('Eşleştirme siliniyor...');
                try {
                    const res = await apiCall(`/api/inventory/mapping/${tableName}`, {
                        method: 'DELETE'
                    });
                    if (res && res.success) {
                        showToast(res.message || 'Eşleştirme silindi.');
                        btnDeleteMapping.classList.add('hidden');

                        // Recalculate auto-guess
                        guessInventoryColumns(state.inventoryState.columns);
                        calculateAndRenderInventory();
                    } else {
                        showToast(res.error || 'Silerken bir hata oluştu.', 'error');
                    }
                } catch (err) {
                    console.error('Error deleting mapping:', err);
                    showToast('Silerken bir hata oluştu.', 'error');
                } finally {
                    hideLoader();
                }
            });
        }

        // Search & Filter listeners for detailed list
        const detSearchInput = document.getElementById('inv-details-search');
        if (detSearchInput) {
            detSearchInput.addEventListener('input', (e) => {
                state.inventoryState.filters.search = e.target.value;
                renderInventoryDevicesTable();
            });
        }

        const detQtyInput = document.getElementById('inv-details-qty-filter');
        if (detQtyInput) {
            detQtyInput.addEventListener('input', (e) => {
                state.inventoryState.filters.qtyFilterStr = e.target.value;
                renderInventoryDevicesTable();
            });
        }

        // Header click sort listeners
        const headersRow = document.getElementById('inv-details-headers');
        if (headersRow) {
            headersRow.querySelectorAll('th[data-sort]').forEach(th => {
                th.addEventListener('click', () => {
                    const col = th.getAttribute('data-sort');
                    const currentOrder = state.inventoryState.filters.sortOrder;
                    const currentCol = state.inventoryState.filters.sortCol;
                    
                    let newOrder = 'asc';
                    if (currentCol === col) {
                        newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                    }
                    
                    state.inventoryState.filters.sortCol = col;
                    state.inventoryState.filters.sortOrder = newOrder;
                    
                    // Update header icons
                    headersRow.querySelectorAll('th[data-sort] i').forEach(icon => {
                        icon.className = 'fa-solid fa-sort text-muted ms-1';
                    });
                    const activeIcon = th.querySelector('i');
                    if (activeIcon) {
                        activeIcon.className = `fa-solid fa-sort-${newOrder === 'asc' ? 'up' : 'down'} ms-1`;
                    }
                    
                    renderInventoryDevicesTable();
                });
            });
        }
    }
}

async function loadInventoryTableData(tableName) {
    if (!tableName) return;
    showLoader('Tablo analiz ediliyor...');
    state.inventoryState.activeTable = tableName;
    state.inventoryState.selectedMaterial = null;

    // Reset filters
    state.inventoryState.filters = {
        search: '',
        qtyFilterStr: '',
        sortCol: 'id',
        sortOrder: 'asc'
    };
    
    const detSearchInput = document.getElementById('inv-details-search');
    if (detSearchInput) detSearchInput.value = '';
    
    const detQtyInput = document.getElementById('inv-details-qty-filter');
    if (detQtyInput) detQtyInput.value = '';
    
    // Reset header icons
    const headersRow = document.getElementById('inv-details-headers');
    if (headersRow) {
        headersRow.querySelectorAll('th[data-sort] i').forEach(icon => {
            const th = icon.closest('th');
            if (th && th.getAttribute('data-sort') === 'id') {
                icon.className = 'fa-solid fa-sort-up ms-1';
            } else {
                icon.className = 'fa-solid fa-sort text-muted ms-1';
            }
        });
    }

    // Hide clear filter button
    const btnClear = document.getElementById('btn-inv-clear-filter');
    if (btnClear) btnClear.style.display = 'none';

    try {
        const data = await apiCall(`/api/tables/${tableName}/all`);
        state.inventoryState.columns = data.columns || [];
        state.inventoryState.rows = data.rows || [];

        // Populate mappings dropdowns
        populateInventoryMappingSelects(data.columns);

        // Check if there is a saved mapping
        let hasSavedMapping = false;
        try {
            const mapRes = await apiCall(`/api/inventory/mapping/${tableName}`);
            if (mapRes && mapRes.success && mapRes.mapping) {
                const mapping = mapRes.mapping;
                const colExists = (col) => data.columns.includes(col);

                const matVal = colExists(mapping.material) ? mapping.material : '';
                const modelVal = colExists(mapping.model) ? mapping.model : '';
                const qtyVal = (mapping.qty === 'row_count' || colExists(mapping.qty)) ? mapping.qty : 'row_count';
                const macVal = colExists(mapping.mac) ? mapping.mac : '';
                const serialVal = colExists(mapping.serial) ? mapping.serial : '';

                // Update dropdown values
                document.getElementById('inv-col-material').value = matVal;
                document.getElementById('inv-col-model').value = modelVal;
                document.getElementById('inv-col-qty').value = qtyVal;
                document.getElementById('inv-col-mac').value = macVal;
                document.getElementById('inv-col-serial').value = serialVal;

                // Update State
                state.inventoryState.mappedCols.material = matVal;
                state.inventoryState.mappedCols.model = modelVal;
                state.inventoryState.mappedCols.qty = qtyVal;
                state.inventoryState.mappedCols.mac = macVal;
                state.inventoryState.mappedCols.serial = serialVal;

                hasSavedMapping = true;
            }
        } catch (mapErr) {
            console.error('Error fetching inventory mapping:', mapErr);
        }

        const btnDelMapping = document.getElementById('btn-delete-inv-mapping');
        if (hasSavedMapping) {
            // Show delete button
            if (btnDelMapping) btnDelMapping.classList.remove('hidden');
        } else {
            // Guess column mappings (default)
            guessInventoryColumns(data.columns);

            // Hide delete button
            if (btnDelMapping) btnDelMapping.classList.add('hidden');
        }

        // Render dashboard
        document.getElementById('inv-empty-state').classList.add('hidden');
        document.getElementById('inventory-dashboard').classList.remove('hidden');

        calculateAndRenderInventory();
    } catch (err) {
        console.error('Error loading inventory table data:', err);
        showToast('Analiz verileri yüklenirken bir hata oluştu.', 'error');
    } finally {
        hideLoader();
    }
}

function populateInventoryMappingSelects(columns) {
    const materialSelect = document.getElementById('inv-col-material');
    const modelSelect = document.getElementById('inv-col-model');
    const qtySelect = document.getElementById('inv-col-qty');
    const macSelect = document.getElementById('inv-col-mac');
    const serialSelect = document.getElementById('inv-col-serial');

    materialSelect.innerHTML = '<option value="" disabled selected>Seçiniz...</option>';
    if (modelSelect) modelSelect.innerHTML = '<option value="">(İsteğe Bağlı) Seçiniz...</option>';
    qtySelect.innerHTML = '<option value="row_count">Her satır 1 adet (Satır Sayısı)</option>';
    macSelect.innerHTML = '<option value="">(İsteğe Bağlı) Seçiniz...</option>';
    serialSelect.innerHTML = '<option value="">(İsteğe Bağlı) Seçiniz...</option>';

    columns.forEach(col => {
        // Material Name Options
        const optMat = document.createElement('option');
        optMat.value = col;
        optMat.textContent = col;
        materialSelect.appendChild(optMat);

        // Model Options
        if (modelSelect) {
            const optMod = document.createElement('option');
            optMod.value = col;
            optMod.textContent = col;
            modelSelect.appendChild(optMod);
        }

        // Qty Options
        const optQty = document.createElement('option');
        optQty.value = col;
        optQty.textContent = col;
        qtySelect.appendChild(optQty);

        // MAC Options
        const optMac = document.createElement('option');
        optMac.value = col;
        optMac.textContent = col;
        macSelect.appendChild(optMac);

        // Serial Options
        const optSer = document.createElement('option');
        optSer.value = col;
        optSer.textContent = col;
        serialSelect.appendChild(optSer);
    });
}

function guessInventoryColumns(columns) {
    const matSelect = document.getElementById('inv-col-material');
    const modelSelect = document.getElementById('inv-col-model');
    const qtySelect = document.getElementById('inv-col-qty');
    const macSelect = document.getElementById('inv-col-mac');
    const serSelect = document.getElementById('inv-col-serial');

    let guessedMat = '';
    let guessedModel = '';
    let guessedQty = 'row_count';
    let guessedMac = '';
    let guessedSer = '';

    // Guess Material: look for keywords
    const matKeywords = ['malzeme', 'ürün', 'urun', 'ad', 'name', 'cihaz_adi', 'cihaz', 'tanim', 'description'];
    for (const col of columns) {
        const lower = col.toLowerCase();
        if (matKeywords.some(k => lower === k || lower.includes(k))) {
            guessedMat = col;
            break;
        }
    }
    // Default to first user column if no guess
    if (!guessedMat && columns.length > 0) {
        guessedMat = columns[0];
    }

    // Guess Model
    const modelKeywords = ['model', 'type', 'tip', 'kategori', 'category', 'marka', 'brand'];
    for (const col of columns) {
        const lower = col.toLowerCase();
        if (modelKeywords.some(k => lower === k || lower.includes(k))) {
            guessedModel = col;
            break;
        }
    }

    // Guess Qty
    const qtyKeywords = ['adet', 'miktar', 'sayi', 'count', 'quantity', 'qty', 'tutar'];
    for (const col of columns) {
        const lower = col.toLowerCase();
        if (qtyKeywords.some(k => lower === k || lower.includes(k))) {
            guessedQty = col;
            break;
        }
    }

    // Guess MAC
    const macKeywords = ['mac', 'mac_adresi', 'mac_address', 'fiziksel_adres', 'ethernet'];
    for (const col of columns) {
        const lower = col.toLowerCase();
        if (macKeywords.some(k => lower === k || lower.includes(k))) {
            guessedMac = col;
            break;
        }
    }

    // Guess Serial
    const serKeywords = ['seri', 'serial', 'sn', 'seri_no', 'serial_no', 'barkod', 'barcode', 'sicil'];
    for (const col of columns) {
        const lower = col.toLowerCase();
        if (serKeywords.some(k => lower === k || lower.includes(k))) {
            guessedSer = col;
            break;
        }
    }

    // Update Select values
    if (matSelect) matSelect.value = guessedMat;
    if (modelSelect) modelSelect.value = guessedModel;
    if (qtySelect) qtySelect.value = guessedQty;
    if (macSelect) macSelect.value = guessedMac;
    if (serSelect) serSelect.value = guessedSer;

    // Update State
    state.inventoryState.mappedCols.material = guessedMat;
    state.inventoryState.mappedCols.model = guessedModel;
    state.inventoryState.mappedCols.qty = guessedQty;
    state.inventoryState.mappedCols.mac = guessedMac;
    state.inventoryState.mappedCols.serial = guessedSer;
    state.inventoryState.mappedCols.serial = guessedSer;
}

function calculateAndRenderInventory() {
    const rows = state.inventoryState.rows;
    const mapped = state.inventoryState.mappedCols;

    if (!mapped.material) return;

    let totalQty = 0;
    let macCount = 0;
    let serialCount = 0;
    const groups = {};

    rows.forEach(row => {
        // Material Name
        const matVal = String(row[mapped.material] || 'Tanımlanmamış').trim();

        // Quantity
        let qty = 1;
        if (mapped.qty !== 'row_count') {
            const parsed = parseFloat(row[mapped.qty]);
            qty = isNaN(parsed) ? 1 : parsed;
        }

        totalQty += qty;
        groups[matVal] = (groups[matVal] || 0) + qty;

        // MAC status
        if (mapped.mac && row[mapped.mac] !== null && String(row[mapped.mac]).trim() !== '') {
            macCount += qty;
        }

        // Serial status
        if (mapped.serial && row[mapped.serial] !== null && String(row[mapped.serial]).trim() !== '') {
            serialCount += qty;
        }
    });

    const uniqueTypesCount = Object.keys(groups).length;

    // Calculate percentages
    const macRatio = totalQty > 0 ? Math.round((macCount / totalQty) * 100) : 0;
    const serialRatio = totalQty > 0 ? Math.round((serialCount / totalQty) * 100) : 0;

    // Update stats cards
    document.getElementById('inv-stat-total').textContent = totalQty.toLocaleString();
    document.getElementById('inv-stat-types').textContent = uniqueTypesCount.toLocaleString();
    document.getElementById('inv-stat-mac-ratio').textContent = `${macRatio}%`;
    document.getElementById('inv-stat-serial-ratio').textContent = `${serialRatio}%`;

    // Sort groups based on quantity descending (default "Çoktan Aza" for left list)
    const sortedGroups = Object.entries(groups).sort((a, b) => b[1] - a[1]);

    // Keep all groups in state
    state.inventoryState.filteredGroups = sortedGroups;

    // Render distribution table
    renderDistributionTable(sortedGroups, totalQty);

    // Render Chart.js Graph
    renderInventoryChart(sortedGroups);

    // Render Details List
    renderInventoryDevicesTable();
}

function renderDistributionTable(sortedGroups, totalQty) {
    const tbody = document.getElementById('inv-materials-tbody');
    tbody.innerHTML = '';

    if (sortedGroups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Veri bulunamadı.</td></tr>';
        return;
    }

    sortedGroups.forEach(([name, count], index) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';

        const pct = totalQty > 0 ? ((count / totalQty) * 100).toFixed(1) : '0.0';

        tr.innerHTML = `
            <td class="text-center font-semibold text-secondary" style="width: 50px;">${index + 1}</td>
            <td class="font-medium" style="text-align: left;">${name}</td>
            <td class="font-semibold" style="text-align: right; width: 100px;">${count.toLocaleString()}</td>
            <td class="text-muted" style="text-align: right; width: 100px;">%${pct}</td>
        `;

        // Interactive row filtering
        tr.addEventListener('click', () => {
            // Toggle filter
            if (state.inventoryState.selectedMaterial === name) {
                state.inventoryState.selectedMaterial = null;
                tr.classList.remove('active-row-highlight');
                document.getElementById('btn-inv-clear-filter').style.display = 'none';
            } else {
                state.inventoryState.selectedMaterial = name;
                // Highlight row
                document.querySelectorAll('#inv-materials-tbody tr').forEach(r => r.classList.remove('active-row-highlight'));
                tr.classList.add('active-row-highlight');
                document.getElementById('btn-inv-clear-filter').style.display = 'inline-block';
            }
            renderInventoryDevicesTable();
        });

        tbody.appendChild(tr);
    });
}

function renderInventoryChart(sortedGroups) {
    const ctx = document.getElementById('inv-chart');
    if (!ctx) return;

    // Destroy previous chart
    if (state.inventoryState.chartInstance) {
        state.inventoryState.chartInstance.destroy();
    }

    if (sortedGroups.length === 0) return;

    const totalQty = sortedGroups.reduce((sum, [_, count]) => sum + count, 0);
    const labels = [];
    const data = [];
    let othersSum = 0;

    sortedGroups.forEach(([name, count], idx) => {
        const pct = totalQty > 0 ? (count / totalQty) * 100 : 0;
        // Show if it is in the top 5 (at least first 5) OR represents >= 5% of the total
        if (idx < 5 || pct >= 5.0) {
            labels.push(name);
            data.push(count);
        } else {
            othersSum += count;
        }
    });

    if (othersSum > 0) {
        labels.push('Diğerleri');
        data.push(othersSum);
    }

    // Premium theme colors (curated palette matching glassmorphism)
    const backgroundColors = [
        'rgba(99, 102, 241, 0.75)',  // Indigo/Purple
        'rgba(16, 185, 129, 0.75)',  // Emerald Green
        'rgba(245, 158, 11, 0.75)',  // Amber Orange
        'rgba(239, 68, 68, 0.75)',   // Rose Red
        'rgba(59, 130, 246, 0.75)',  // Blue
        'rgba(168, 85, 247, 0.75)'   // Purple/Violet
    ];

    const borderColors = [
        'rgba(99, 102, 241, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(168, 85, 247, 1)'
    ];

    state.inventoryState.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1.5,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        padding: 10,
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const val = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${label}: ${val.toLocaleString()} (${pct}%)`;
                        }
                    }
                }
            },
            // Handle clicking chart slices to filter
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const firstPoints = activeElements[0];
                    const label = state.inventoryState.chartInstance.data.labels[firstPoints.index];

                    if (label === 'Diğerleri') {
                        state.inventoryState.selectedMaterial = null;
                        document.getElementById('btn-inv-clear-filter').style.display = 'none';
                        showToast('Diğerleri kategorisini detaylı filtrelemek için sol listeden seçim yapın.', 'info');
                    } else {
                        state.inventoryState.selectedMaterial = label;
                        document.getElementById('btn-inv-clear-filter').style.display = 'inline-block';

                        // Find matching row in list to highlight
                        document.querySelectorAll('#inv-materials-tbody tr').forEach(r => {
                            const cells = r.querySelectorAll('td');
                            if (cells.length > 1 && cells[1].textContent.trim() === label) {
                                r.classList.add('active-row-highlight');
                                r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            } else {
                                r.classList.remove('active-row-highlight');
                            }
                        });
                    }
                    renderInventoryDevicesTable();
                }
            }
        }
    });
}

function renderInventoryDevicesTable() {
    const tbody = document.getElementById('inv-devices-tbody');
    const title = document.getElementById('inv-details-title');

    tbody.innerHTML = '';

    const rows = state.inventoryState.rows;
    const mapped = state.inventoryState.mappedCols;
    const selected = state.inventoryState.selectedMaterial;

    if (!mapped.material) return;

    // 1. Filter rows by material first
    let filteredRows = [];
    if (selected) {
        filteredRows = rows.filter(r => String(r[mapped.material] || 'Tanımlanmamış').trim() === selected);
    } else {
        filteredRows = [...rows];
    }

    // 2. Apply Search Filter (on Material, Model, MAC, Serial)
    const searchVal = (state.inventoryState.filters.search || '').trim().toLowerCase();
    if (searchVal) {
        filteredRows = filteredRows.filter(row => {
            const mat = String(row[mapped.material] || '').toLowerCase();
            const model = mapped.model ? String(row[mapped.model] || '').toLowerCase() : '';
            const mac = mapped.mac ? String(row[mapped.mac] || '').toLowerCase() : '';
            const serial = mapped.serial ? String(row[mapped.serial] || '').toLowerCase() : '';
            return mat.includes(searchVal) || model.includes(searchVal) || mac.includes(searchVal) || serial.includes(searchVal);
        });
    }

    // 3. Apply Quantity Expression Filter (e.g. <20, >20, 20)
    const qtyFilterStr = (state.inventoryState.filters.qtyFilterStr || '').trim();
    if (qtyFilterStr) {
        const qtyMatch = qtyFilterStr.match(/^(<=|>=|<|>|=)?\s*([0-9.-]+)$/);
        if (qtyMatch) {
            const operator = qtyMatch[1] || '=';
            const value = parseFloat(qtyMatch[2]);
            if (!isNaN(value)) {
                filteredRows = filteredRows.filter(row => {
                    const qty = mapped.qty === 'row_count' ? 1 : parseFloat(row[mapped.qty]) || 0;
                    if (operator === '<') return qty < value;
                    if (operator === '>') return qty > value;
                    if (operator === '<=') return qty <= value;
                    if (operator === '>=') return qty >= value;
                    if (operator === '=') return qty === value;
                    return true;
                });
            }
        }
    }

    // 4. Apply Header Column Sorting
    const sortCol = state.inventoryState.filters.sortCol || 'id';
    const sortOrder = state.inventoryState.filters.sortOrder || 'asc';
    
    filteredRows.sort((a, b) => {
        let valA, valB;
        if (sortCol === 'id') {
            valA = a._rowid_ || 0;
            valB = b._rowid_ || 0;
        } else if (sortCol === 'qty') {
            valA = mapped.qty === 'row_count' ? 1 : parseFloat(a[mapped.qty]) || 0;
            valB = mapped.qty === 'row_count' ? 1 : parseFloat(b[mapped.qty]) || 0;
        } else {
            const colName = mapped[sortCol];
            valA = colName ? String(a[colName] || '').trim() : '';
            valB = colName ? String(b[colName] || '').trim() : '';
        }
        
        let compareResult = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            compareResult = valA - valB;
        } else {
            compareResult = String(valA).localeCompare(String(valB), 'tr');
        }
        
        return sortOrder === 'asc' ? compareResult : -compareResult;
    });

    // Update Title
    title.innerHTML = selected
        ? `<i class="fa-solid fa-laptop-code text-indigo"></i> Cihaz ve Sarf Malzeme Listesi: <span style="color: var(--accent-primary)">${selected}</span> (${filteredRows.length} Adet)`
        : `<i class="fa-solid fa-laptop-code text-indigo"></i> Cihaz ve Sarf Malzeme Detay Listesi (${filteredRows.length} Adet)`;

    if (filteredRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Kayıt bulunamadı.</td></tr>';
        return;
    }

    filteredRows.forEach((row, index) => {
        const tr = document.createElement('tr');

        const matVal = row[mapped.material] || 'Tanımlanmamış';
        const modelVal = mapped.model && row[mapped.model] !== null ? String(row[mapped.model]).trim() : '';
        const qtyVal = mapped.qty === 'row_count' ? 1 : parseFloat(row[mapped.qty]) || 0;
        const macVal = mapped.mac && row[mapped.mac] !== null ? String(row[mapped.mac]).trim() : '';
        const serVal = mapped.serial && row[mapped.serial] !== null ? String(row[mapped.serial]).trim() : '';

        const modelCell = modelVal ? `<span class="font-medium text-secondary">${modelVal}</span>` : '<span class="text-muted" style="font-size: 0.75rem;">Boş / Belirtilmemiş</span>';
        const qtyCell = `<span class="font-semibold text-secondary">${qtyVal.toLocaleString()}</span>`;
        const macCell = macVal ? `<code style="color: var(--accent-primary); font-size: 0.8rem;">${macVal}</code>` : '<span class="text-muted" style="font-size: 0.75rem;">Boş / Belirtilmemiş</span>';
        const serCell = serVal ? `<code style="color: var(--success); font-size: 0.8rem;">${serVal}</code>` : '<span class="text-muted" style="font-size: 0.75rem;">Boş / Belirtilmemiş</span>';

        tr.innerHTML = `
            <td class="text-center font-semibold text-secondary" style="width: 60px;">${row._rowid_ || (index + 1)}</td>
            <td class="font-medium" style="text-align: left;">${matVal}</td>
            <td class="font-medium" style="text-align: left;">${modelCell}</td>
            <td style="text-align: right; width: 90px;">${qtyCell}</td>
            <td style="text-align: left; width: 180px;">${serCell}</td>
            <td style="text-align: left; width: 180px;">${macCell}</td>
            <td style="text-align: center; width: 100px;">
                <button class="btn btn-secondary btn-xs btn-view-dev-details" style="padding: 3px 6px;">
                    <i class="fa-solid fa-circle-info"></i> Detay Kartı
                </button>
            </td>
        `;

        // Modal trigger on Detay button
        tr.querySelector('.btn-view-dev-details').addEventListener('click', () => {
            openDeviceDetailModal(row);
        });

        tbody.appendChild(tr);
    });
}

function openDeviceDetailModal(row) {
    const modal = document.getElementById('device-detail-modal');
    const container = document.getElementById('device-details-fields');
    if (!modal || !container) return;

    container.innerHTML = '';

    // Sort keys alphabetically but keep _rowid_ first if present
    const keys = Object.keys(row).sort((a, b) => {
        if (a === '_rowid_') return -1;
        if (b === '_rowid_') return 1;
        return a.localeCompare(b);
    });

    keys.forEach(key => {
        if (key === '_rowid_') return; // Skip internal rowid in visual fields

        const card = document.createElement('div');
        card.style.background = 'rgba(255, 255, 255, 0.02)';
        card.style.border = '1px solid var(--border-color)';
        card.style.borderRadius = '8px';
        card.style.padding = '8px 12px';
        card.style.textAlign = 'left';

        const keyLabel = document.createElement('div');
        keyLabel.style.fontSize = '0.7rem';
        keyLabel.style.color = 'var(--text-secondary)';
        keyLabel.style.textTransform = 'uppercase';
        keyLabel.style.fontWeight = '600';
        keyLabel.textContent = key.replace(/_/g, ' ');

        const valLabel = document.createElement('div');
        valLabel.style.fontSize = '0.85rem';
        valLabel.style.fontWeight = '500';
        valLabel.style.marginTop = '4px';
        valLabel.style.wordBreak = 'break-all';

        const rawVal = row[key];
        if (rawVal === null || String(rawVal).trim() === '') {
            valLabel.innerHTML = '<span class="text-muted" style="font-size: 0.8rem; font-style: italic;">Tanımsız</span>';
        } else {
            valLabel.textContent = rawVal;
        }

        card.appendChild(keyLabel);
        card.appendChild(valLabel);
        container.appendChild(card);
    });

    modal.classList.add('active');
}

function closeDeviceDetailModal() {
    const modal = document.getElementById('device-detail-modal');
    if (modal) modal.classList.remove('active');
}

window.loadInventoryTab = loadInventoryTab;
window.loadInventoryTableData = loadInventoryTableData;
window.calculateAndRenderInventory = calculateAndRenderInventory;
window.openDeviceDetailModal = openDeviceDetailModal;
window.closeDeviceDetailModal = closeDeviceDetailModal;
