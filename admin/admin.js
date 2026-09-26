document.addEventListener('DOMContentLoaded', function() {
    const apiBase = '../backend/';
    const loginPanel = document.getElementById('loginPanel');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const inquiryRows = document.getElementById('inquiryRows');
    const inquiryDialog = document.getElementById('inquiryDialog');
    const inquiryEditor = document.getElementById('inquiryEditor');
    const loginMessage = document.getElementById('loginMessage');
    const dashboardMessage = document.getElementById('dashboardMessage');
    const editorMessage = document.getElementById('editorMessage');
    const emptyState = document.getElementById('emptyState');
    const logoutButton = document.getElementById('logoutButton');
    let csrfToken = '';
    let inquiries = [];

    const divisionLabels = {
        construction: 'Construction & Real Estate',
        trading: 'Commodity Trading',
        industrial: 'Industrial Products & Hardware Supply',
        general: 'General Inquiry'
    };

    const statusLabels = {
        new: 'New',
        in_progress: 'In progress',
        responded: 'Responded',
        closed: 'Closed'
    };

    async function request(path, options) {
        const settings = options || {};
        const headers = { Accept: 'application/json' };
        if (settings.body !== undefined) headers['Content-Type'] = 'application/json';
        if (settings.csrf !== false && csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const response = await fetch(apiBase + path, {
            method: settings.method || 'GET',
            credentials: 'same-origin',
            headers: headers,
            body: settings.body === undefined ? undefined : JSON.stringify(settings.body)
        });

        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error('The server returned an unreadable response.');
        }

        if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
        return result;
    }

    function showMessage(element, message, kind) {
        element.textContent = message || '';
        if (kind) element.dataset.kind = kind;
        else delete element.dataset.kind;
    }

    function showLogin(message) {
        loginPanel.hidden = false;
        dashboard.hidden = true;
        logoutButton.hidden = true;
        if (message) showMessage(loginMessage, message, 'error');
    }

    async function showDashboard() {
        loginPanel.hidden = true;
        dashboard.hidden = false;
        logoutButton.hidden = false;
        await loadInquiries();
    }

    function setCount(id, value) {
        document.getElementById(id).textContent = String(value);
    }

    function updateSummary() {
        setCount('totalCount', inquiries.length);
        setCount('newCount', inquiries.filter(function(item) { return item.status === 'new'; }).length);
        setCount('progressCount', inquiries.filter(function(item) { return item.status === 'in_progress'; }).length);
        setCount('respondedCount', inquiries.filter(function(item) { return item.status === 'responded'; }).length);
        setCount('closedCount', inquiries.filter(function(item) { return item.status === 'closed'; }).length);
    }

    function makeTextCell(text, className) {
        const cell = document.createElement('td');
        const span = document.createElement('span');
        span.textContent = text;
        if (className) span.className = className;
        cell.appendChild(span);
        return cell;
    }

    function formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
    }

    function filteredInquiries() {
        const query = document.getElementById('searchInput').value.trim().toLowerCase();
        const status = document.getElementById('statusFilter').value;

        return inquiries.filter(function(item) {
            const matchesStatus = status === 'all' || item.status === status;
            const searchable = [item.name, item.email, item.phone, item.division, item.message].join(' ').toLowerCase();
            return matchesStatus && (!query || searchable.includes(query));
        });
    }

    function renderRows() {
        inquiryRows.replaceChildren();
        const visibleInquiries = filteredInquiries();

        visibleInquiries.forEach(function(item) {
            const row = document.createElement('tr');

            const contact = document.createElement('td');
            const name = document.createElement('span');
            name.className = 'contact-name';
            name.textContent = item.name;
            const email = document.createElement('span');
            email.className = 'contact-detail';
            email.textContent = item.email;
            const phone = document.createElement('span');
            phone.className = 'contact-detail';
            phone.textContent = item.phone || 'No phone provided';
            contact.append(name, email, phone);
            row.appendChild(contact);

            row.appendChild(makeTextCell(divisionLabels[item.division] || item.division));
            row.appendChild(makeTextCell(item.message, 'message-preview'));
            row.appendChild(makeTextCell(formatDate(item.created_at)));

            const statusCell = document.createElement('td');
            const status = document.createElement('span');
            status.className = 'status-badge';
            status.dataset.status = item.status;
            status.textContent = statusLabels[item.status] || item.status;
            statusCell.appendChild(status);
            row.appendChild(statusCell);

            const actions = document.createElement('td');
            const actionGroup = document.createElement('div');
            actionGroup.className = 'row-actions';
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', function() { openEditor(item); });
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', function() { deleteInquiry(item); });
            actionGroup.append(editButton, deleteButton);
            actions.appendChild(actionGroup);
            row.appendChild(actions);
            inquiryRows.appendChild(row);
        });

        emptyState.hidden = visibleInquiries.length > 0;
    }

    async function loadInquiries() {
        showMessage(dashboardMessage, 'Loading inquiries...');
        try {
            const result = await request('inquiries.php');
            inquiries = result.inquiries;
            updateSummary();
            renderRows();
            showMessage(dashboardMessage, inquiries.length + ' inquiries loaded.', 'success');
        } catch (error) {
            if (/sign-in is required/i.test(error.message)) {
                showLogin('Your session expired. Sign in again.');
                return;
            }
            showMessage(dashboardMessage, error.message, 'error');
        }
    }

    function openEditor(item) {
        inquiryEditor.reset();
        showMessage(editorMessage, '');
        const isEditing = Boolean(item);
        inquiryEditor.elements.id.value = isEditing ? item.id : '';
        inquiryEditor.elements.name.value = isEditing ? item.name : '';
        inquiryEditor.elements.email.value = isEditing ? item.email : '';
        inquiryEditor.elements.phone.value = isEditing ? item.phone : '';
        inquiryEditor.elements.division.value = isEditing ? item.division : 'construction';
        inquiryEditor.elements.message.value = isEditing ? item.message : '';
        inquiryEditor.elements.status.value = isEditing ? item.status : 'new';
        document.getElementById('editorHeading').textContent = isEditing ? 'Edit inquiry' : 'New inquiry';
        document.getElementById('statusField').hidden = !isEditing;
        document.getElementById('saveInquiryButton').textContent = isEditing ? 'Save changes' : 'Create inquiry';
        inquiryDialog.showModal();
        inquiryEditor.elements.name.focus();
    }

    async function deleteInquiry(item) {
        if (!window.confirm('Delete the inquiry from ' + item.name + '? This cannot be undone.')) return;

        try {
            await request('inquiries.php', {
                method: 'DELETE',
                body: { id: item.id }
            });
            showMessage(dashboardMessage, 'Inquiry deleted.', 'success');
            await loadInquiries();
        } catch (error) {
            showMessage(dashboardMessage, error.message, 'error');
        }
    }

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (!loginForm.reportValidity()) return;
        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;
        showMessage(loginMessage, 'Signing in...');

        try {
            const result = await request('auth.php', {
                method: 'POST',
                csrf: false,
                body: {
                    action: 'login',
                    username: loginForm.elements.username.value,
                    password: loginForm.elements.password.value
                }
            });
            csrfToken = result.csrfToken;
            loginForm.reset();
            await showDashboard();
        } catch (error) {
            showMessage(loginMessage, error.message, 'error');
        } finally {
            button.disabled = false;
        }
    });

    inquiryEditor.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (!inquiryEditor.reportValidity()) return;
        const formData = new FormData(inquiryEditor);
        const id = formData.get('id');
        const body = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            division: formData.get('division'),
            message: formData.get('message'),
            status: formData.get('status')
        };
        const saveButton = document.getElementById('saveInquiryButton');
        saveButton.disabled = true;
        showMessage(editorMessage, 'Saving...');

        try {
            if (id) {
                body.id = Number(id);
                await request('inquiries.php', { method: 'PATCH', body: body });
                showMessage(dashboardMessage, 'Inquiry updated.', 'success');
            } else {
                body.action = 'create';
                await request('inquiries.php', { method: 'POST', body: body });
                showMessage(dashboardMessage, 'Inquiry created.', 'success');
            }
            inquiryDialog.close();
            await loadInquiries();
        } catch (error) {
            showMessage(editorMessage, error.message, 'error');
        } finally {
            saveButton.disabled = false;
        }
    });

    document.getElementById('newInquiryButton').addEventListener('click', function() { openEditor(null); });
    document.getElementById('refreshButton').addEventListener('click', loadInquiries);
    document.getElementById('searchInput').addEventListener('input', renderRows);
    document.getElementById('statusFilter').addEventListener('change', renderRows);
    document.getElementById('closeDialogButton').addEventListener('click', function() { inquiryDialog.close(); });
    document.getElementById('cancelDialogButton').addEventListener('click', function() { inquiryDialog.close(); });

    logoutButton.addEventListener('click', async function() {
        logoutButton.disabled = true;
        try {
            await request('auth.php', { method: 'POST', body: { action: 'logout' } });
            csrfToken = '';
            inquiries = [];
            showLogin('You have signed out.');
        } catch (error) {
            showMessage(dashboardMessage, error.message, 'error');
        } finally {
            logoutButton.disabled = false;
        }
    });

    document.getElementById('statusFilter').value = 'all';
    request('auth.php')
        .then(function(result) {
            csrfToken = result.csrfToken;
            return result.authenticated ? showDashboard() : showLogin();
        })
        .catch(function(error) {
            showLogin(error.message);
        });
});
