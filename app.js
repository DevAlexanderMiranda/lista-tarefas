// Elementos DOM
const tasksList = document.getElementById('tasks-list');
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const modalTitle = document.getElementById('modal-title');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskDescriptionInput = document.getElementById('task-description');
const taskStartDateInput = document.getElementById('task-start-date');
const taskEndDateInput = document.getElementById('task-end-date');
const subtasksContainer = document.getElementById('subtasks-container');
const addSubtaskBtn = document.getElementById('add-subtask-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok');
const confirmCancelBtn = document.getElementById('confirm-cancel');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const viewSubtasksBtn = document.getElementById('view-subtasks-btn');
const subtasksView = document.getElementById('subtasks-view');
const closeSubtasksViewBtn = document.getElementById('close-subtasks-view');
const allSubtasksContainer = document.getElementById('all-subtasks-container');


let tasks = [];
let editingTask = null;
let draggedTask = null;
let draggedIndex = null;
let subtaskToDelete = null;
let currentTheme = localStorage.getItem('theme') || 'light';


document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
    setupEventListeners();
    checkDeadlineAlerts();
    applyTheme();
});


function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}


function addTask(task) {
    tasks.push({
        id: Date.now().toString(),
        title: task.title,
        description: task.description,
        startDate: task.startDate,
        endDate: task.endDate,
        subtasks: task.subtasks || [],
        status: task.status || 'in-progress',
        completed: task.status === 'completed',
        createdAt: new Date().toISOString()
    });
    saveTasks();
    renderTasks();
    checkDeadlineAlerts(); 
}

function updateTask(taskId, updatedTask) {
    const index = tasks.findIndex(task => task.id === taskId);
    if (index !== -1) {
        tasks[index] = {
            ...tasks[index],
            title: updatedTask.title,
            description: updatedTask.description,
            startDate: updatedTask.startDate,
            endDate: updatedTask.endDate,
            subtasks: updatedTask.subtasks,
            status: updatedTask.status,
            completed: updatedTask.status === 'completed'
        };
        saveTasks();
        renderTasks();
        checkDeadlineAlerts(); // Atualizar alertas ao modificar tarefa
    }
}

function deleteTask(taskId) {
    const task = tasks.find(task => task.id === taskId);
    if (!task) return;
    
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks();
    renderTasks();
    checkDeadlineAlerts();
}

// Verifica o status do prazo
function checkDeadlineStatus(endDate, isCompleted = false) {
    if (!endDate) return null;
    
    // Se a tarefa estiver concluída, mudar o estilo mas não alertar
    if (isCompleted) {
        const end = new Date(endDate + 'T23:59:59');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return 'completed-late'; // Tarefa concluída com prazo vencido
        } else {
            return 'completed-on-time'; // Tarefa concluída dentro do prazo
        }
    }
    
    // Para tarefas não concluídas, manter o comportamento original
    const end = new Date(endDate + 'T23:59:59'); // Define para o final do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Define para o início do dia
    
    // Calcular a diferença em dias
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return 'late'; // Atrasado
    } else if (diffDays <= 1) {
        return 'red'; // Alerta (menos de 2 dias)
    } else if (diffDays <= 3) {
        return 'yellow'; // Atenção (menos de 3 dias)
    } else {
        return 'green'; // Normal (mais de 5 dias)
    }
}

// Calcula o progresso das subtarefas (excluindo as com status "sem resposta")
function calculateProgress(subtasks) {
    if (!subtasks || subtasks.length === 0) return 0;
    
    // Filtrar subtarefas, excluindo as com status "sem resposta"
    const validSubtasks = subtasks.filter(subtask => subtask.status !== 'no-response');
    
    if (validSubtasks.length === 0) return 0;
    
    const completed = validSubtasks.filter(subtask => subtask.completed).length;
    const partial = validSubtasks.filter(subtask => subtask.status === 'partial').length;
    
    // Calcular progresso considerando subtarefas parciais como 0.5
    const progressValue = (completed + (partial * 0.5)) / validSubtasks.length;
    return Math.round(progressValue * 100);
}

// Formata a exibição do prazo com indicador de status
function formatDeadlineWithStatus(endDate, isCompleted = false) {
    if (!endDate) return '';
    
    const status = checkDeadlineStatus(endDate, isCompleted);
    const dateStr = formatDate(endDate);
    
    if (!status) return dateStr;
    
    return `<span class="status-indicator ${status}"></span> ${dateStr}`;
}

// Formata a data no formato local
function formatDate(dateString) {
    if (!dateString) return '';
    
    // Criar nova data no timezone local (sem ajustes de UTC)
    const dateParts = dateString.split('-');
    if (dateParts.length !== 3) return '';
    
    // Criando uma data como yyyy/mm/dd para evitar problemas de timezone
    // Importante: mês em JavaScript é baseado em zero (janeiro = 0)
    const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    return date.toLocaleDateString('pt-BR');
}

// Funções de renderização
function renderTasks() {
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma tarefa adicionada ainda.</p>
                <p>Clique em "Nova Tarefa" para começar.</p>
            </div>
        `;
        return;
    }
    
    tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksList.appendChild(taskElement);
    });
}

function createTaskElement(task) {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.dataset.id = task.id;
    
    // Calcula progresso das subtarefas usando a função calculateProgress
    const progress = calculateProgress(task.subtasks);
    
    // Adiciona atributo de progresso ao card
    taskCard.dataset.progress = progress;
    
    // Verificar se todas as subtarefas estão concluídas
    const allSubtasksCompleted = task.subtasks.length > 0 && progress === 100;
    
    // Se todas as subtarefas estiverem concluídas, considerar a tarefa como concluída
    // para fins de exibição do prazo, mesmo que seu status não seja "completed"
    const deadlineStatus = checkDeadlineStatus(task.endDate, task.completed || allSubtasksCompleted);
    const taskStatus = task.status || 'in-progress';
    
    // Determinar texto do status
    let statusText = 'Em andamento';
    if (taskStatus === 'completed') {
        statusText = 'Concluído';
    } else if (taskStatus === 'partial') {
        statusText = 'Parcialmente Concluído';
    }
    
    taskCard.innerHTML = `
        <div class="task-header">
            <h3 class="task-title">${task.title}</h3>
            <div class="task-actions">
                <button class="task-action-btn edit" title="Editar">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="task-action-btn delete" title="Excluir">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>
        <div class="task-info">
            <div class="task-dates">
                ${task.startDate ? `
                <div class="task-date">
                    <span class="material-symbols-outlined">calendar_today</span>
                    <span>Início: ${formatDate(task.startDate)}</span>
                </div>
                ` : ''}
                ${task.endDate ? `
                <div class="task-date ${deadlineStatus ? `status-${deadlineStatus}` : ''}">
                    <span class="material-symbols-outlined">event</span>
                    <span>Término: ${formatDeadlineWithStatus(task.endDate, task.completed)}</span>
                </div>
                ` : ''}
            </div>
            <div class="task-status-badge ${taskStatus}">${statusText}</div>
        </div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        
        ${task.subtasks.length > 0 ? `
        <div class="task-progress">
            <div class="progress-header">
                <span class="progress-title">Progresso</span>
                <span class="progress-percent">${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-value" style="width: ${progress}%"></div>
            </div>
            <div class="subtasks-list">
                ${task.subtasks.slice(0, 3).map(subtask => {
                    const subtaskStatus = checkDeadlineStatus(subtask.endDate, subtask.completed);
                    const isNoResponse = subtask.status === 'no-response';
                    const communicationType = subtask.communicationType || 'enviado';
                    
                    let statusClass = subtask.status || 'in-progress';
                    let statusDisabled = isNoResponse;
                    
                    return `
                    <div class="subtask-item" data-status="${statusClass}">
                        <input type="checkbox" class="subtask-check" ${subtask.completed ? 'checked' : ''} ${statusDisabled ? 'disabled' : ''} data-subtask-id="${subtask.id}">
                        <span class="subtask-title">
                            ${subtask.title}
                            <span class="subtask-collapsed-badge ${communicationType}">${communicationType}</span>
                            ${subtask.status === 'partial' ? '<span class="subtask-collapsed-badge partial">Parcial</span>' : ''}
                        </span>
                        ${subtask.endDate && !isNoResponse ? `
                        <span class="subtask-dates ${subtaskStatus ? `status-${subtaskStatus}` : ''}">
                            Prazo: ${formatDeadlineWithStatus(subtask.endDate, subtask.completed)}
                        </span>
                        ` : ''}
                    </div>
                    `;
                }).join('')}
                ${task.subtasks.length > 3 ? `<div class="more-subtasks">+${task.subtasks.length - 3} mais...</div>` : ''}
            </div>
        </div>
        ` : ''}
    `;
    
    // Adicionar event listeners
    const editBtn = taskCard.querySelector('.edit');
    const deleteBtn = taskCard.querySelector('.delete');
    
    editBtn.addEventListener('click', () => openEditTaskModal(task));
    deleteBtn.addEventListener('click', () => {
        showConfirmModal(`Tem certeza que deseja excluir a tarefa "${task.title}"?`, () => {
            deleteTask(task.id);
        });
    });
    
    // Adicionar eventos para subtarefas
    const subtaskChecks = taskCard.querySelectorAll('.subtask-check');
    subtaskChecks.forEach(check => {
        check.addEventListener('change', (e) => {
            const subtaskId = e.target.dataset.subtaskId;
            toggleSubtaskComplete(task.id, subtaskId);
        });
    });
    
    // Eventos de arrastar e soltar
    taskCard.addEventListener('dragstart', () => {
        draggedTask = task;
        draggedIndex = tasks.indexOf(task);
        setTimeout(() => taskCard.classList.add('dragging'), 0);
    });
    
    taskCard.addEventListener('dragend', () => {
        taskCard.classList.remove('dragging');
        draggedTask = null;
        draggedIndex = null;
    });
    
    return taskCard;
}

function renderSubtasksInModal(subtasks = []) {
    subtasksContainer.innerHTML = '';
    
    subtasks.forEach((subtask, index) => {
        createCollapsedSubtaskElement(subtask);
    });
}

// Criar elemento de subtarefa colapsada
function createCollapsedSubtaskElement(subtask) {
    const subtaskElement = document.createElement('div');
    subtaskElement.className = 'subtask-collapsed';
    subtaskElement.dataset.id = subtask.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
    
    // Definir o tipo de comunicação (recebido/enviado/sem resposta)
    const communicationType = subtask.communicationType || 'enviado';
    const status = subtask.status || 'in-progress';
    
    subtaskElement.innerHTML = `
        <div class="subtask-collapsed-title">
            ${subtask.title}
            <span class="subtask-collapsed-badge ${communicationType}">${communicationType}</span>
            ${status === 'no-response' ? '<span class="subtask-collapsed-badge no-response">Sem resposta</span>' : ''}
        </div>
        <div class="subtask-collapsed-actions">
            <button type="button" class="expand-btn" title="Expandir">
                <span class="material-symbols-outlined">expand_more</span>
            </button>
            <button type="button" class="remove-btn" title="Remover">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;
    
    // Adicionar event listeners
    const expandBtn = subtaskElement.querySelector('.expand-btn');
    const removeBtn = subtaskElement.querySelector('.remove-btn');
    
    expandBtn.addEventListener('click', () => {
        // Minimizar todas as outras subtarefas expandidas
        const expandedItems = subtasksContainer.querySelectorAll('.subtask-item-edit');
        expandedItems.forEach(item => {
            // Converter o item expandido para colapsado
            const subtaskId = item.dataset.id;
            const titleInput = item.querySelector('.subtask-title-input');
            const title = titleInput ? titleInput.value : '';
            const statusSelect = item.querySelector('.subtask-status');
            const status = statusSelect ? statusSelect.value : 'false';
            const commTypeSelect = item.querySelector('.subtask-communication-type');
            const commType = commTypeSelect ? commTypeSelect.value : 'enviado';
            
            // Criar subtarefa temporária para gerar o elemento colapsado
            const tempSubtask = {
                id: subtaskId,
                title: title,
                status: status === 'no-response' ? 'no-response' : (status === 'true' ? 'completed' : 'in-progress'),
                communicationType: commType
            };
            
            // Obter os demais dados da subtarefa dos inputs
            if (editingTask) {
                const originalSubtask = editingTask.subtasks.find(s => s.id === subtaskId);
                if (originalSubtask) {
                    tempSubtask.startDate = item.querySelector('.subtask-start-date').value || originalSubtask.startDate;
                    tempSubtask.endDate = item.querySelector('.subtask-end-date').value || originalSubtask.endDate;
                    tempSubtask.description = item.querySelector('.subtask-description').value || originalSubtask.description;
                }
            }
            
            const collapsedElement = createCollapsedSubtaskElementFromData(tempSubtask);
            item.parentNode.replaceChild(collapsedElement, item);
        });
        
        expandSubtask(subtaskElement, subtask);
    });
    
    removeBtn.addEventListener('click', () => {
        subtaskToDelete = subtaskElement;
        showConfirmModal(`Tem certeza que deseja excluir a subtarefa "${subtask.title}"?`, () => {
            subtaskElement.remove();
        });
    });
    
    subtasksContainer.appendChild(subtaskElement);
    return subtaskElement;
}

// Criar elemento de subtarefa colapsada a partir de dados
function createCollapsedSubtaskElementFromData(subtask) {
    const element = document.createElement('div');
    element.className = 'subtask-collapsed';
    element.dataset.id = subtask.id;
    
    const communicationType = subtask.communicationType || 'enviado';
    const status = subtask.status || 'in-progress';
    
    element.innerHTML = `
        <div class="subtask-collapsed-title">
            ${subtask.title}
            <span class="subtask-collapsed-badge ${communicationType}">${communicationType}</span>
            ${status === 'no-response' ? '<span class="subtask-collapsed-badge no-response">Sem resposta</span>' : ''}
            ${status === 'partial' ? '<span class="subtask-collapsed-badge partial">Parcial</span>' : ''}
        </div>
        <div class="subtask-collapsed-actions">
            <button type="button" class="expand-btn" title="Expandir">
                <span class="material-symbols-outlined">expand_more</span>
            </button>
            <button type="button" class="remove-btn" title="Remover">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;
    
    // Adicionar event listeners
    const expandBtn = element.querySelector('.expand-btn');
    const removeBtn = element.querySelector('.remove-btn');
    
    expandBtn.addEventListener('click', () => {
        // Minimizar todas as outras subtarefas expandidas
        const expandedItems = subtasksContainer.querySelectorAll('.subtask-item-edit');
        expandedItems.forEach(item => {
            const tempSubtask = collectSubtaskDataFromExpandedItem(item);
            const collapsedElement = createCollapsedSubtaskElementFromData(tempSubtask);
            item.parentNode.replaceChild(collapsedElement, item);
        });
        
        expandSubtask(element, subtask);
    });
    
    removeBtn.addEventListener('click', () => {
        subtaskToDelete = element;
        showConfirmModal(`Tem certeza que deseja excluir esta subtarefa?`, () => {
            element.remove();
        });
    });
    
    return element;
}

// Expandir uma subtarefa
function expandSubtask(element, subtask) {
    const expanded = document.createElement('div');
    expanded.className = 'subtask-item-edit';
    expanded.dataset.id = element.dataset.id;
    
    expanded.innerHTML = `
        <div class="subtask-content">
            <div class="form-group required-field">
                <label>Título</label>
                <input type="text" class="subtask-title-input" value="${subtask.title || ''}" required>
            </div>
            <div class="form-row">
                <div class="form-group required-field">
                    <label>Data de Início</label>
                    <input type="date" class="subtask-start-date" value="${subtask.startDate || ''}" required>
                </div>
                <div class="form-group required-field">
                    <label>Prazo</label>
                    <input type="date" class="subtask-end-date" value="${subtask.endDate || ''}" required>
                </div>
            </div>
            <div class="form-group required-field">
                <label>Descrição</label>
                <textarea class="subtask-description" rows="2" required>${subtask.description || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group required-field">
                    <label>Status</label>
                    <select class="subtask-status" required>
                        <option value="false" ${!subtask.completed && subtask.status !== 'no-response' && subtask.status !== 'partial' ? 'selected' : ''}>Em andamento</option>
                        <option value="true" ${subtask.completed ? 'selected' : ''}>Concluído</option>
                        <option value="no-response" ${subtask.status === 'no-response' ? 'selected' : ''}>Sem resposta</option>
                        <option value="partial" ${subtask.status === 'partial' ? 'selected' : ''}>Parcialmente Concluído</option>
                    </select>
                </div>
                <div class="form-group required-field">
                    <label>Tipo de Comunicação</label>
                    <select class="subtask-communication-type" required>
                        <option value="enviado" ${(subtask.communicationType || 'enviado') === 'enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="recebido" ${(subtask.communicationType || '') === 'recebido' ? 'selected' : ''}>Recebido</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="subtask-actions">
            <button type="button" class="minimize-btn" title="Minimizar">
                <span class="material-symbols-outlined">expand_less</span>
            </button>
            <button type="button" class="remove-btn" title="Remover">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;
    
    const minimizeBtn = expanded.querySelector('.minimize-btn');
    const removeBtn = expanded.querySelector('.remove-btn');
    
    minimizeBtn.addEventListener('click', () => {
        const tempSubtask = collectSubtaskDataFromExpandedItem(expanded);
        const collapsedElement = createCollapsedSubtaskElementFromData(tempSubtask);
        expanded.parentNode.replaceChild(collapsedElement, expanded);
    });
    
    removeBtn.addEventListener('click', () => {
        subtaskToDelete = expanded;
        const title = expanded.querySelector('.subtask-title-input').value;
        showConfirmModal(`Tem certeza que deseja excluir a subtarefa "${title}"?`, () => {
            expanded.remove();
        });
    });
    
    // Substituir o elemento colapsado pelo expandido
    element.parentNode.replaceChild(expanded, element);
    
    // Focar no primeiro campo
    expanded.querySelector('.subtask-title-input').focus();
}

// Coletar dados de uma subtarefa expandida
function collectSubtaskDataFromExpandedItem(item) {
    const titleInput = item.querySelector('.subtask-title-input');
    const startDateInput = item.querySelector('.subtask-start-date');
    const endDateInput = item.querySelector('.subtask-end-date');
    const descriptionInput = item.querySelector('.subtask-description');
    const statusSelect = item.querySelector('.subtask-status');
    const commTypeSelect = item.querySelector('.subtask-communication-type');
    
    return {
        id: item.dataset.id,
        title: titleInput ? titleInput.value : '',
        startDate: startDateInput ? startDateInput.value : '',
        endDate: endDateInput ? endDateInput.value : '',
        description: descriptionInput ? descriptionInput.value : '',
        status: statusSelect ? 
            (statusSelect.value === 'no-response' ? 'no-response' : 
             (statusSelect.value === 'true' ? 'completed' : 'in-progress')) : 'in-progress',
        completed: statusSelect ? statusSelect.value === 'true' : false,
        communicationType: commTypeSelect ? commTypeSelect.value : 'enviado'
    };
}

function getSubtasksFromModal() {
    const subtaskItems = subtasksContainer.querySelectorAll('.subtask-item-edit, .subtask-collapsed');
    const subtasks = [];
    
    subtaskItems.forEach(item => {
        // Verificar se é um item colapsado ou expandido
        const isCollapsed = item.classList.contains('subtask-collapsed');
        
        // Obter os dados dependendo do tipo de item
        if (isCollapsed) {
            // Manter os dados existentes para itens colapsados
            const id = item.dataset.id;
            const title = item.querySelector('.subtask-collapsed-title').textContent.trim().split('\n')[0].trim();
            
            // Encontrar a subtarefa original pelos dados salvos
            const originalSubtask = editingTask ? 
                editingTask.subtasks.find(s => s.id === id) : 
                { startDate: '', endDate: '', description: '', completed: false, status: 'in-progress', communicationType: 'enviado' };
            
            if (originalSubtask) {
                subtasks.push({
                    id: id,
                    title: title,
                    startDate: originalSubtask.startDate,
                    endDate: originalSubtask.endDate,
                    description: originalSubtask.description,
                    completed: originalSubtask.completed,
                    status: originalSubtask.status,
                    communicationType: originalSubtask.communicationType
                });
            }
        } else {
            // Obter dados de itens expandidos
            const titleInput = item.querySelector('.subtask-title-input');
            const startDateInput = item.querySelector('.subtask-start-date');
            const endDateInput = item.querySelector('.subtask-end-date');
            const descriptionInput = item.querySelector('.subtask-description');
            const statusSelect = item.querySelector('.subtask-status');
            const communicationTypeSelect = item.querySelector('.subtask-communication-type');
            
            // Verificar se todos os campos obrigatórios foram preenchidos
            if (titleInput.value.trim() && startDateInput.value && endDateInput.value && descriptionInput.value.trim()) {
                const status = statusSelect.value;
                const communicationType = communicationTypeSelect.value;
                
                // Determinar o status real com base na seleção
                let realStatus;
                let isCompleted = false;
                
                if (status === 'true') {
                    realStatus = 'completed';
                    isCompleted = true;
                } else if (status === 'no-response') {
                    realStatus = 'no-response';
                    isCompleted = false;
                } else if (status === 'partial') {
                    realStatus = 'partial';
                    isCompleted = false;
                } else {
                    realStatus = 'in-progress';
                    isCompleted = false;
                }
                
                subtasks.push({
                    id: item.dataset.id,
                    title: titleInput.value.trim(),
                    startDate: startDateInput.value,
                    endDate: endDateInput.value,
                    description: descriptionInput.value.trim(),
                    completed: isCompleted,
                    status: realStatus,
                    communicationType: communicationType
                });
            }
        }
    });
    
    return subtasks;
}

// Manipulação do modal
function openAddTaskModal() {
    modalTitle.textContent = 'Nova Tarefa';
    taskForm.reset();
    taskIdInput.value = '';
    subtasksContainer.innerHTML = '';
    editingTask = null;
    taskModal.classList.add('open');
}

function openEditTaskModal(task) {
    modalTitle.textContent = 'Editar Tarefa';
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescriptionInput.value = task.description || '';
    taskStartDateInput.value = task.startDate || '';
    taskEndDateInput.value = task.endDate || '';
    
    
    const taskStatusSelect = document.getElementById('task-status');
    if (taskStatusSelect) {
        taskStatusSelect.value = task.status === 'completed' ? 'true' : 
                               (task.status === 'partial' ? 'partial' : 'false');
    }
    
    renderSubtasksInModal(task.subtasks);
    
    editingTask = task;
    taskModal.classList.add('open');
}

function closeModal() {
    const modalContent = taskModal.querySelector('.modal-content');
    

    modalContent.style.animation = 'none';
    modalContent.offsetHeight; // Forçar reflow
    modalContent.style.animation = 'fadeOut 0.3s ease forwards';
    
    
    taskModal.style.animation = 'fadeOut 0.3s ease forwards';
    
    setTimeout(() => {
        taskModal.classList.remove('open');
        modalContent.style.animation = '';
        taskModal.style.animation = '';
        
        // Remover a classe de edição de subtarefa se estiver presente
        document.body.classList.remove('editing-subtask');
    }, 300);
}

// Manipulação de subtarefas
function addNewSubtask() {
    const subtaskId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    
    // Minimizar todas as subtarefas expandidas
    const expandedItems = subtasksContainer.querySelectorAll('.subtask-item-edit');
    expandedItems.forEach(item => {
        const tempSubtask = collectSubtaskDataFromExpandedItem(item);
        const collapsedElement = createCollapsedSubtaskElementFromData(tempSubtask);
        item.parentNode.replaceChild(collapsedElement, item);
    });
    
    // Criar nova subtarefa expandida
    const subtaskElement = document.createElement('div');
    subtaskElement.className = 'subtask-item-edit';
    subtaskElement.dataset.id = subtaskId;
    
    subtaskElement.innerHTML = `
        <div class="subtask-content">
            <div class="form-group required-field">
                <label>Título</label>
                <input type="text" class="subtask-title-input" required>
            </div>
            <div class="form-row">
                <div class="form-group required-field">
                    <label>Data de Início</label>
                    <input type="date" class="subtask-start-date" required>
                </div>
                <div class="form-group required-field">
                    <label>Prazo</label>
                    <input type="date" class="subtask-end-date" required>
                </div>
            </div>
            <div class="form-group required-field">
                <label>Descrição</label>
                <textarea class="subtask-description" rows="2" required></textarea>
            </div>
            <div class="form-row">
                <div class="form-group required-field">
                    <label>Status</label>
                    <select class="subtask-status" required>
                        <option value="false" selected>Em andamento</option>
                        <option value="true">Concluído</option>
                        <option value="no-response">Sem resposta</option>
                        <option value="partial">Parcialmente Concluído</option>
                    </select>
                </div>
                <div class="form-group required-field">
                    <label>Tipo de Comunicação</label>
                    <select class="subtask-communication-type" required>
                        <option value="enviado" selected>Enviado</option>
                        <option value="recebido">Recebido</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="subtask-actions">
            <button type="button" class="minimize-btn" title="Minimizar">
                <span class="material-symbols-outlined">expand_less</span>
            </button>
            <button type="button" class="remove-btn" title="Remover">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;
    
    const minimizeBtn = subtaskElement.querySelector('.minimize-btn');
    const removeBtn = subtaskElement.querySelector('.remove-btn');
    
    minimizeBtn.addEventListener('click', () => {
        const tempSubtask = collectSubtaskDataFromExpandedItem(subtaskElement);
        if (tempSubtask.title.trim()) {
            const collapsedElement = createCollapsedSubtaskElementFromData(tempSubtask);
            subtaskElement.parentNode.replaceChild(collapsedElement, subtaskElement);
        } else {
            subtaskElement.remove();
        }
    });
    
    removeBtn.addEventListener('click', () => {
        subtaskToDelete = subtaskElement;
        showConfirmModal("Tem certeza que deseja excluir esta subtarefa?", () => {
            subtaskElement.remove();
        });
    });
    
    subtasksContainer.appendChild(subtaskElement);
    
    // Focar no campo de título da nova subtarefa
    subtaskElement.querySelector('.subtask-title-input').focus();
    
    // Se estiver editando uma tarefa, mudar seu status para "em andamento"
    if (editingTask && editingTask.status === 'completed') {
        // Mudar o status no formulário
        const taskStatusSelect = document.getElementById('task-status');
        if (taskStatusSelect) {
            taskStatusSelect.value = 'false'; // Em andamento
        }
    }
}

function toggleSubtaskComplete(taskId, subtaskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const subtaskIndex = tasks[taskIndex].subtasks.findIndex(subtask => subtask.id === subtaskId);
    if (subtaskIndex === -1) return;
    
    // Não alterar status se for "Sem resposta"
    if (tasks[taskIndex].subtasks[subtaskIndex].status === 'no-response') return;
    
    // Salvar o progresso antigo para animação
    const oldProgress = calculateProgress(tasks[taskIndex].subtasks);
    
    // Atualizar o status da subtarefa
    tasks[taskIndex].subtasks[subtaskIndex].completed = !tasks[taskIndex].subtasks[subtaskIndex].completed;
    tasks[taskIndex].subtasks[subtaskIndex].status = tasks[taskIndex].subtasks[subtaskIndex].completed ? 'completed' : 'in-progress';
    
    // Verificar se todas as subtarefas estão concluídas e atualizar o status da tarefa
    updateTaskStatusBasedOnSubtasks(taskIndex);
    
    // Calcular o novo progresso
    const newProgress = calculateProgress(tasks[taskIndex].subtasks);
    
    // Salvar mudanças e renderizar
    saveTasks();
    
    // Aplicar animação ao progresso
    const taskCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
    if (taskCard) {
        const progressValue = taskCard.querySelector('.progress-value');
        const progressPercent = taskCard.querySelector('.progress-percent');
        
        // Atualizar o atributo data-progress para controlar os estilos
        taskCard.dataset.progress = newProgress;
        
        // Verificar se todas as subtarefas estão concluídas
        const allSubtasksCompleted = tasks[taskIndex].subtasks.length > 0 && newProgress === 100;
        
        // Atualizar a exibição do prazo com base no novo status
        if (tasks[taskIndex].endDate) {
            const taskDateElement = taskCard.querySelector('.task-date:last-child');
            if (taskDateElement) {
                // Atualizar classe de status com base na conclusão das subtarefas
                const deadlineStatus = checkDeadlineStatus(tasks[taskIndex].endDate, tasks[taskIndex].completed || allSubtasksCompleted);
                
                // Remover classes de status antigas
                taskDateElement.classList.remove('status-red', 'status-yellow', 'status-green', 'status-late', 'status-completed-late', 'status-completed-on-time');
                
                // Adicionar nova classe de status
                if (deadlineStatus) {
                    taskDateElement.classList.add(`status-${deadlineStatus}`);
                }
                
                // Atualizar o conteúdo com o novo status
                const formattedDeadline = formatDeadlineWithStatus(tasks[taskIndex].endDate, tasks[taskIndex].completed || allSubtasksCompleted);
                const deadlineSpan = taskDateElement.querySelector('span:last-child');
                if (deadlineSpan) {
                    deadlineSpan.innerHTML = formattedDeadline;
                }
            }
        }
        
        if (progressValue && progressPercent) {
            // Animar a barra de progresso
            progressValue.style.transition = 'width 0.5s ease-in-out';
            progressValue.style.width = `${oldProgress}%`;
            
            // Animar o texto do percentual
            progressPercent.classList.add('progress-updating');
            progressPercent.textContent = `${oldProgress}%`;
            
            // Aguardar um pequeno delay para iniciar a animação
            setTimeout(() => {
                progressValue.style.width = `${newProgress}%`;
                
                // Animar o número do percentual
                let currentPercent = oldProgress;
                const diff = newProgress - oldProgress;
                const step = diff > 0 ? 1 : -1;
                const interval = Math.abs(Math.floor(300 / diff)) || 30; // 300ms total para a animação do número
                
                if (diff !== 0) {
                    const counter = setInterval(() => {
                        currentPercent += step;
                        progressPercent.textContent = `${currentPercent}%`;
                        
                        if ((step > 0 && currentPercent >= newProgress) || 
                            (step < 0 && currentPercent <= newProgress)) {
                            clearInterval(counter);
                            progressPercent.textContent = `${newProgress}%`;
                            progressPercent.classList.remove('progress-updating');
                        }
                    }, interval);
                }
            }, 50);
            
            // Atualizar status e badge no card
            const statusBadge = taskCard.querySelector('.task-status-badge');
            if (statusBadge) {
                const task = tasks[taskIndex];
                statusBadge.className = `task-status-badge ${task.status}`;
                
                let statusText = 'Em andamento';
                if (task.status === 'completed') {
                    statusText = 'Concluído';
                } else if (task.status === 'partial') {
                    statusText = 'Parcialmente Concluído';
                }
                
                statusBadge.textContent = statusText;
            }
            
            // Atualizar alertas
            checkDeadlineAlerts();
            
            return; // Evitar renderização completa para não interromper a animação
        }
    }
    
    renderTasks();
    checkDeadlineAlerts();
}

// Atualiza o status da tarefa com base no status das suas subtarefas
function updateTaskStatusBasedOnSubtasks(taskIndex) {
    const task = tasks[taskIndex];
    
    // Se não houver subtarefas, não alterar o status
    if (!task.subtasks || task.subtasks.length === 0) return;
    
    // Filtrar subtarefas válidas (excluindo as com status "sem resposta")
    const validSubtasks = task.subtasks.filter(subtask => subtask.status !== 'no-response');
    
    if (validSubtasks.length === 0) return;
    
    const completedCount = validSubtasks.filter(subtask => subtask.completed).length;
    const partialCount = validSubtasks.filter(subtask => subtask.status === 'partial').length;
    
    // Se todas as subtarefas estiverem concluídas
    if (completedCount === validSubtasks.length) {
        task.status = 'completed';
        task.completed = true;
    }
    // Se algumas subtarefas estiverem concluídas ou em status parcial
    else if (completedCount > 0 || partialCount > 0) {
        task.status = 'partial';
        task.completed = false;
    }
    // Se nenhuma subtarefa estiver concluída
    else {
        task.status = 'in-progress';
        task.completed = false;
    }
}

// Função de arrastar e soltar
function handleDragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(tasksList, e.clientY);
    const draggable = document.querySelector('.dragging');
    
    if (afterElement == null) {
        tasksList.appendChild(draggable);
    } else {
        tasksList.insertBefore(draggable, afterElement);
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderTasksAfterDrag() {
    const taskElements = tasksList.querySelectorAll('.task-card');
    const newTasksOrder = [];
    
    taskElements.forEach(element => {
        const taskId = element.getAttribute('data-id');
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            newTasksOrder.push(task);
        }
    });
    
    tasks = newTasksOrder;
    saveTasks();
}

// Verifica se há tarefas com prazos próximos e exibe alertas
function checkDeadlineAlerts() {
    // Limpar alertas antigos
    const oldAlerts = document.querySelectorAll('.deadline-alert');
    oldAlerts.forEach(alert => alert.remove());
    
    // Verificar tarefas
    let hasAlerts = false;
    const alertsContainer = document.createElement('div');
    alertsContainer.className = 'alerts-container';
    
    tasks.forEach(task => {
        // Não alertar para tarefas concluídas
        if (task.completed) return;
        
        // Verificar se todas as subtarefas estão concluídas
        const progress = calculateProgress(task.subtasks);
        const allSubtasksCompleted = task.subtasks.length > 0 && progress === 100;
        
        // Se todas as subtarefas estiverem concluídas, não mostrar alerta
        if (allSubtasksCompleted) return;
        
        // Verificar prazo da tarefa principal
        const taskStatus = checkDeadlineStatus(task.endDate);
        if (taskStatus === 'red' || taskStatus === 'yellow') {
            hasAlerts = true;
            const alertElement = createDeadlineAlert(task, taskStatus);
            alertsContainer.appendChild(alertElement);
        }
        
        // Verificar prazos das subtarefas
        task.subtasks.forEach(subtask => {
            if (subtask.completed) return; // Não alertar para tarefas concluídas
            
            const subtaskStatus = checkDeadlineStatus(subtask.endDate);
            if (subtaskStatus === 'red' || subtaskStatus === 'yellow') {
                hasAlerts = true;
                const alertElement = createDeadlineAlert(subtask, subtaskStatus, task.title);
                alertsContainer.appendChild(alertElement);
            }
        });
    });
    
    // Adicionar alertas ao DOM se houver
    if (hasAlerts) {
        const container = document.querySelector('.container');
        container.insertBefore(alertsContainer, container.querySelector('main'));
    }
}

// Cria um elemento de alerta para prazos próximos
function createDeadlineAlert(item, status, parentTitle = null) {
    const alertElement = document.createElement('div');
    alertElement.className = `deadline-alert status-${status}`;
    
    const daysLeft = getDaysLeft(item.endDate);
    const statusText = status === 'red' ? 'Crítico' : 'Atenção';
    const itemType = parentTitle ? 'Subtarefa' : 'Tarefa';
    const parentInfo = parentTitle ? ` (em "${parentTitle}")` : '';
    
    let messageText;
    if (daysLeft < 0) {
        messageText = 'venceu há ' + Math.abs(daysLeft) + ` ${Math.abs(daysLeft) === 1 ? 'dia' : 'dias'}!`;
    } else if (daysLeft === 0) {
        messageText = 'vence hoje!';
    } else {
        messageText = `vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
    }
    
    alertElement.innerHTML = `
        <span class="material-symbols-outlined">
            ${status === 'red' ? 'priority_high' : 'warning'}
        </span>
        <div>
            <strong>${statusText}:</strong> ${itemType} "${item.title}"${parentInfo} 
            ${messageText}
        </div>
    `;
    
    return alertElement;
}

// Calcula quantos dias faltam para o prazo
function getDaysLeft(endDate) {
    if (!endDate) return null;
    
    const end = new Date(endDate + 'T23:59:59'); // Define para o final do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Define para o início do dia
    
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Modal de confirmação
function showConfirmModal(message, onConfirm) {
    confirmMessage.textContent = message;
    confirmModal.classList.add('open');
    
    // Atualizar os event listeners
    const confirmHandler = () => {
        // Adicionar animação de fechamento
        const modalContent = confirmModal.querySelector('.confirm-modal-content');
        modalContent.style.animation = 'fadeOut 0.2s ease forwards';
        confirmModal.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            onConfirm();
            confirmModal.classList.remove('open');
            modalContent.style.animation = '';
            confirmModal.style.animation = '';
            cleanupConfirmListeners();
        }, 250);
    };
    
    const cancelHandler = () => {
        // Adicionar animação de fechamento
        const modalContent = confirmModal.querySelector('.confirm-modal-content');
        modalContent.style.animation = 'fadeOut 0.2s ease forwards';
        confirmModal.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            confirmModal.classList.remove('open');
            modalContent.style.animation = '';
            confirmModal.style.animation = '';
            cleanupConfirmListeners();
        }, 250);
    };
    
    const cleanupConfirmListeners = () => {
        confirmOkBtn.removeEventListener('click', confirmHandler);
        confirmCancelBtn.removeEventListener('click', cancelHandler);
    };
    
    confirmOkBtn.addEventListener('click', confirmHandler);
    confirmCancelBtn.addEventListener('click', cancelHandler);
}

// Funções de visualização de subtarefas
function renderAllSubtasks() {
    allSubtasksContainer.innerHTML = '';
    
    // Não é mais necessário alterar o display diretamente aqui
    // pois o código de animação já cuida disso
    
    let allSubtasks = [];
    
    // Obter o elemento de filtro de tarefa pai
    const parentTaskFilter = document.getElementById('parent-task-filter');
    
    // Se é a primeira vez que estamos renderizando, configurar as opções do filtro
    if (parentTaskFilter.options.length <= 1) {
        // Limpar e adicionar a opção padrão
        parentTaskFilter.innerHTML = `<option value="">Todas as tarefas</option>`;
        
        // Adicionar cada tarefa como uma opção no filtro
        tasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.title;
            parentTaskFilter.appendChild(option);
        });
    }
    
    // Coletar todas as subtarefas de todas as tarefas
    tasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(subtask => {
                allSubtasks.push({
                    ...subtask,
                    parentTaskId: task.id,
                    parentTaskTitle: task.title
                });
            });
        }
    });
    
    // Filtrar as subtarefas
    let filteredSubtasks = allSubtasks;
    
    // Aplicar filtro de tarefa pai
    const selectedTaskId = parentTaskFilter.value;
    if (selectedTaskId) {
        console.log('Filtrando por tarefa ID:', selectedTaskId);
        filteredSubtasks = filteredSubtasks.filter(subtask => 
            subtask.parentTaskId === selectedTaskId
        );
    }
    
    // Aplicar filtro de título
    const titleFilter = document.getElementById('subtask-title-filter').value.toLowerCase().trim();
    if (titleFilter) {
        filteredSubtasks = filteredSubtasks.filter(subtask => 
            subtask.title.toLowerCase().includes(titleFilter)
        );
    }
    
    // Aplicar filtro de descrição/objeto
    const descriptionFilter = document.getElementById('subtask-description-filter').value.toLowerCase().trim();
    if (descriptionFilter) {
        filteredSubtasks = filteredSubtasks.filter(subtask => 
            subtask.description && subtask.description.toLowerCase().includes(descriptionFilter)
        );
    }
    
    // Aplicar filtro de status
    const statusFilter = document.getElementById('status-filter').value;
    if (statusFilter) {
        filteredSubtasks = filteredSubtasks.filter(subtask => 
            subtask.status === statusFilter
        );
    }
    
    // Aplicar filtro de tipo de comunicação
    const commTypeFilter = document.getElementById('comm-type-filter').value;
    if (commTypeFilter) {
        filteredSubtasks = filteredSubtasks.filter(subtask => 
            subtask.communicationType === commTypeFilter
        );
    }
    
    // Atualizar contador
    document.getElementById('filtered-count').textContent = filteredSubtasks.length;
    
    // Ordenar por data de término (as mais próximas primeiro)
    filteredSubtasks.sort((a, b) => {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate) - new Date(b.endDate);
    });
    
    // Renderizar cada subtarefa com atraso sequencial para animação
    filteredSubtasks.forEach(subtask => {
        const subtaskElement = createAllSubtaskElement(subtask);
        allSubtasksContainer.appendChild(subtaskElement);
    });
    
    if (filteredSubtasks.length === 0) {
        allSubtasksContainer.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma subtarefa encontrada com os filtros selecionados.</p>
            </div>
        `;
    }
}

function createAllSubtaskElement(subtask) {
    const element = document.createElement('div');
    element.className = `all-subtask-item ${subtask.status || 'in-progress'}`;
    
    const startDate = subtask.startDate ? formatDate(subtask.startDate) : 'Não definido';
    const endDate = subtask.endDate ? formatDate(subtask.endDate) : 'Não definido';
    const deadlineStatus = checkDeadlineStatus(subtask.endDate, subtask.completed);
    
    // Determinar texto do status
    let statusText = 'Em andamento';
    if (subtask.status === 'completed') {
        statusText = 'Concluído';
    } else if (subtask.status === 'partial') {
        statusText = 'Parcialmente Concluído';
    } else if (subtask.status === 'no-response') {
        statusText = 'Sem resposta';
    }
    
    element.innerHTML = `
        <div class="all-subtask-header">
            <span class="all-subtask-title">${subtask.title}</span>
            <span class="all-subtask-parent">${subtask.parentTaskTitle}</span>
        </div>
        <div class="all-subtask-details">
            <div class="all-subtask-date">
                <span class="material-symbols-outlined">calendar_today</span>
                <span>Início: ${startDate}</span>
            </div>
            <div class="all-subtask-date ${deadlineStatus ? `status-${deadlineStatus}` : ''}">
                <span class="material-symbols-outlined">event</span>
                <span>Término: ${endDate}</span>
            </div>
            <div class="all-subtask-badges">
                <span class="subtask-collapsed-badge ${subtask.status || 'in-progress'}">${statusText}</span>
                <span class="subtask-collapsed-badge ${subtask.communicationType || 'enviado'}">${subtask.communicationType || 'enviado'}</span>
            </div>
        </div>
        <div class="all-subtask-description">${subtask.description || ''}</div>
    `;
    
    // Adicionar evento de clique para editar a tarefa pai
    element.addEventListener('click', () => {
        const task = tasks.find(t => t.id === subtask.parentTaskId);
        if (task) {
            // Não esconder a visualização de subtarefas
            // Em vez disso, adicione uma classe para indicar que estamos no modo de edição
            document.body.classList.add('editing-subtask');
            
            // Abrir o modal de edição
            openEditTaskModal(task);
            
            // Expandir a subtarefa específica após um pequeno delay
            setTimeout(() => {
                const subtaskElement = subtasksContainer.querySelector(`[data-id="${subtask.id}"]`);
                if (subtaskElement && subtaskElement.querySelector('.expand-btn')) {
                    subtaskElement.querySelector('.expand-btn').click();
                }
            }, 100);
        }
    });
    
    return element;
}

// Função para alternar entre temas claro/escuro
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme();
    localStorage.setItem('theme', currentTheme);
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Atualizar ícone do botão de tema
    const themeIcon = themeToggleBtn.querySelector('.material-symbols-outlined');
    if (themeIcon) {
        themeIcon.textContent = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

// Event listeners
function setupEventListeners() {
    // Botões do modal
    addTaskBtn.addEventListener('click', openAddTaskModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Form submit
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Verificar se todos os campos obrigatórios estão preenchidos
        const requiredFields = taskForm.querySelectorAll('[required]');
        let allValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                allValid = false;
                field.classList.add('invalid');
            } else {
                field.classList.remove('invalid');
            }
        });
        
        if (!allValid) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        // Validar que a data final não é anterior à data inicial
        const startDate = new Date(taskStartDateInput.value);
        const endDate = new Date(taskEndDateInput.value);
        
        if (endDate < startDate) {
            alert('A data de término não pode ser anterior à data de início.');
            taskEndDateInput.classList.add('invalid');
            return;
        } else {
            taskEndDateInput.classList.remove('invalid');
        }
        
        // Validar subtarefas
        const subtasks = getSubtasksFromModal();
        let hasInvalidDates = false;
        
        for (const subtask of subtasks) {
            if (subtask.startDate && subtask.endDate) {
                const subtaskStartDate = new Date(subtask.startDate);
                const subtaskEndDate = new Date(subtask.endDate);
                
                if (subtaskEndDate < subtaskStartDate) {
                    hasInvalidDates = true;
                    break;
                }
            }
        }
        
        if (hasInvalidDates) {
            alert('Uma ou mais subtarefas possuem data de término anterior à data de início.');
            return;
        }
        
        const taskId = taskIdInput.value;
        const taskStatus = document.getElementById('task-status').value;
        
        // Determinar o status real da tarefa
        let realStatus;
        let isCompleted = false;
        
        if (taskStatus === 'true') {
            realStatus = 'completed';
            isCompleted = true;
        } else if (taskStatus === 'partial') {
            realStatus = 'partial';
            isCompleted = false;
        } else {
            realStatus = 'in-progress';
            isCompleted = false;
        }
        
        const task = {
            title: taskTitleInput.value,
            description: taskDescriptionInput.value,
            startDate: taskStartDateInput.value || null,
            endDate: taskEndDateInput.value || null,
            status: realStatus,
            completed: isCompleted,
            subtasks: subtasks
        };
        
        if (taskId) {
            updateTask(taskId, task);
        } else {
            addTask(task);
        }
        
        closeModal(); // Isso já vai remover a classe editing-subtask
        checkDeadlineAlerts(); // Atualizar alertas após adicionar/editar tarefa
    });
    
    // Subtarefas
    addSubtaskBtn.addEventListener('click', addNewSubtask);
    
    // Arrastar e soltar
    tasksList.addEventListener('dragover', handleDragOver);
    tasksList.addEventListener('drop', reorderTasksAfterDrag);
    
    // Fechar modal com Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (taskModal.classList.contains('open')) {
                closeModal();
            }
            if (!subtasksView.classList.contains('hidden')) {
                subtasksView.classList.add('hidden');
                // Mostrar as tarefas novamente
                document.getElementById('tasks-list').style.display = 'flex';
                // Garantir que o modo de edição de subtarefa seja removido
                document.body.classList.remove('editing-subtask');
            }
        }
    });
    
    // Adicionar validação de data para as subtarefas
    subtasksContainer.addEventListener('change', function(e) {
        const target = e.target;
        
        // Verificar se é um campo de data
        if (target.classList.contains('subtask-start-date') || target.classList.contains('subtask-end-date')) {
            const subtaskItem = target.closest('.subtask-item-edit');
            if (subtaskItem) {
                const startDate = subtaskItem.querySelector('.subtask-start-date').value;
                const endDate = subtaskItem.querySelector('.subtask-end-date').value;
                
                if (startDate && endDate) {
                    if (new Date(endDate) < new Date(startDate)) {
                        alert('A data de término da subtarefa não pode ser anterior à data de início.');
                        target.classList.add('invalid');
                    } else {
                        target.classList.remove('invalid');
                    }
                }
            }
        }
    });
    
    // Validação da data da tarefa principal
    taskEndDateInput.addEventListener('change', function() {
        if (taskStartDateInput.value && taskEndDateInput.value) {
            const startDate = new Date(taskStartDateInput.value);
            const endDate = new Date(taskEndDateInput.value);
            
            if (endDate < startDate) {
                alert('A data de término não pode ser anterior à data de início.');
                taskEndDateInput.classList.add('invalid');
            } else {
                taskEndDateInput.classList.remove('invalid');
            }
        }
    });
    
    // Botão para alternar entre temas claro/escuro
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Botão para visualizar todas as subtarefas
    viewSubtasksBtn.addEventListener('click', () => {
        if (subtasksView.classList.contains('hidden')) {
            // Mostrar a visualização de subtarefas
            subtasksView.classList.remove('hidden');
            renderAllSubtasks();
            
            // Esconder as tarefas com animação
            tasksList.classList.add('hidden');
        } else {
            // Esconder a visualização de subtarefas
            subtasksView.classList.add('hidden');
            
            // Mostrar as tarefas com animação
            setTimeout(() => {
                tasksList.classList.remove('hidden');
                tasksList.style.display = 'flex';
            }, 300);
        }
    });
    
    // Botão para fechar a visualização de subtarefas
    closeSubtasksViewBtn.addEventListener('click', () => {
        // Esconder a visualização de subtarefas
        subtasksView.classList.add('hidden');
        
        // Mostrar as tarefas com animação
        setTimeout(() => {
            tasksList.classList.remove('hidden');
            tasksList.style.display = 'flex';
        }, 300);
    });
    
    // Evento específico para o filtro de tarefas pai
    const parentTaskFilter = document.getElementById('parent-task-filter');
    if (parentTaskFilter) {
        parentTaskFilter.addEventListener('change', function() {
            console.log('Filtro de tarefa pai alterado para:', this.value);
            renderAllSubtasks();
        });
    }
    
    // Eventos para os demais filtros de subtarefas
    const filterElements = document.querySelectorAll('#subtask-title-filter, #subtask-description-filter, #status-filter, #comm-type-filter');
    filterElements.forEach(element => {
        element.addEventListener('change', renderAllSubtasks);
        if (element.type === 'text') {
            element.addEventListener('keyup', renderAllSubtasks);
        }
    });
} 