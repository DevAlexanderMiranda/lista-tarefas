// Elementos DOM
const tasksList = document.getElementById("tasks-list");
const addTaskBtn = document.getElementById("add-task-btn");
const taskModal = document.getElementById("task-modal");
const modalTitle = document.getElementById("modal-title");
const closeModalBtn = document.getElementById("close-modal");
const cancelBtn = document.getElementById("cancel-btn");
const taskForm = document.getElementById("task-form");
const taskIdInput = document.getElementById("task-id");
const taskTitleInput = document.getElementById("task-title");
const taskDescriptionInput = document.getElementById("task-description");
const taskResponsibleInput = document.getElementById("task-responsible");
const taskStartDateInput = document.getElementById("task-start-date");
const taskEndDateInput = document.getElementById("task-end-date");
const subtasksContainer = document.getElementById("subtasks-container");
const addSubtaskBtn = document.getElementById("add-subtask-btn");
const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmOkBtn = document.getElementById("confirm-ok");
const confirmCancelBtn = document.getElementById("confirm-cancel");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const viewSubtasksBtn = document.getElementById("view-subtasks-btn");
const subtasksView = document.getElementById("subtasks-view");
const closeSubtasksViewBtn = document.getElementById("close-subtasks-view");
const allSubtasksContainer = document.getElementById("all-subtasks-container");

let tasks = [];
let editingTask = null;
let subtaskToDelete = null;
let currentTheme = localStorage.getItem("theme") || "light";
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Inicializando aplicação...");

    // Verificar se o Firebase está inicializado
    if (!firebase || !firebase.app) {
      throw new Error("Firebase não está inicializado corretamente");
    }

    // Verificar autenticação
    await new Promise((resolve, reject) => {
      const unsubscribe = firebase.auth().onAuthStateChanged(
        (user) => {
          unsubscribe();
          if (user) {
            console.log("Usuário autenticado:", user.email);
            resolve(user);
          } else {
            console.log("Usuário não autenticado, redirecionando para login");
            window.location.href = "index.html";
            reject(new Error("Usuário não autenticado"));
          }
        },
        (error) => {
          reject(error);
        }
      );
    });

    // Verificar documento do usuário
    const user = firebase.auth().currentUser;
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      console.warn("Usuário autenticado mas sem documento no Firestore");
      console.log("Criando documento do usuário automaticamente...");

      // Criar documento do usuário automaticamente
      try {
        await db
          .collection("users")
          .doc(user.uid)
          .set({
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
            role: "reader", // Usuário comum por padrão
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        console.log("Documento do usuário criado com sucesso.");

        // Buscar novamente o documento recém-criado
        const newUserDoc = await db.collection("users").doc(user.uid).get();
        if (newUserDoc.exists) {
          const userData = newUserDoc.data();
          currentUser = {
            id: user.uid,
            email: user.email,
            name: userData.name || user.displayName || user.email,
            role: userData.role || "reader",
          };
          console.log("Usuário carregado após criação:", currentUser);
        } else {
          throw new Error("Falha ao verificar o documento criado");
        }
      } catch (error) {
        console.error("Erro ao criar documento do usuário:", error);
        alert(
          "Erro ao configurar seu usuário. Por favor, recarregue a página ou entre em contato com o suporte."
        );
        return;
      }
    } else {
      // Obter dados do usuário
      const userData = userDoc.data();
      currentUser = {
        id: user.uid,
        email: user.email,
        name: userData.name || user.displayName || user.email,
        role: userData.role || "reader",
      };

      console.log("Usuário carregado:", currentUser);
    }

    // Carregar tarefas e configurar a interface
    await loadTasks();
    renderTasks();
    setupEventListeners();
    checkDeadlineAlerts();
    applyTheme();

    // Mostrar informações do usuário na interface
    const userWelcome = document.createElement("div");
    userWelcome.className = "user-welcome";
    userWelcome.innerHTML = `${currentUser.name}`;

    const headerRight = document.querySelector(".header-right");
    if (headerRight) {
      headerRight.appendChild(userWelcome);
    }

    // Mostrar botão de administração apenas para usuários admin
    const adminBtn = document.getElementById("admin-btn");
    if (adminBtn) {
      // Garantir que o botão só seja visível para administradores
      if (currentUser.role === "admin") {
        adminBtn.style.display = "flex";
      } else {
        adminBtn.style.display = "none";
      }
    }

    console.log("Aplicação inicializada com sucesso");

    // Esconder a tela de carregamento após tudo estar pronto
    if (typeof hideLoading === "function") {
      hideLoading(true);
    }
  } catch (error) {
    console.error("Erro ao inicializar aplicação:", error);
    alert(
      "Erro ao carregar a aplicação. Por favor, recarregue a página ou entre em contato com o suporte."
    );

    // Esconder a tela de carregamento em caso de erro
    if (typeof hideLoading === "function") {
      hideLoading(false);
    }
  }
});

async function loadTasks() {
  try {
    tasks = [];

    // Primeiro tente a consulta ordenada
    try {
      const snapshot = await db
        .collection("tasks")
        .where("userId", "==", currentUser.id)
        .orderBy("createdAt", "desc")
        .get();

      snapshot.forEach((doc) => {
        const taskData = doc.data();
        tasks.push({
          id: doc.id,
          title: taskData.title || "",
          description: taskData.description || "",
          responsible: taskData.responsible || "",
          startDate: taskData.startDate || "",
          endDate: taskData.endDate || "",
          subtasks: taskData.subtasks || [],
          status: taskData.status || "in-progress",
          completed: taskData.status === "completed",
          createdAt: taskData.createdAt
            ? typeof taskData.createdAt.toDate === "function"
              ? taskData.createdAt.toDate().toISOString()
              : taskData.createdAt
            : new Date().toISOString(),
        });
      });

      console.log(`Carregadas ${tasks.length} tarefas com ordenação`);
    } catch (orderError) {
      console.warn("Erro ao carregar tarefas ordenadas:", orderError);

      // Se falhar, tente sem ordenação
      const snapshotNoOrder = await db
        .collection("tasks")
        .where("userId", "==", currentUser.id)
        .get();

      snapshotNoOrder.forEach((doc) => {
        const taskData = doc.data();
        tasks.push({
          id: doc.id,
          title: taskData.title || "",
          description: taskData.description || "",
          responsible: taskData.responsible || "",
          startDate: taskData.startDate || "",
          endDate: taskData.endDate || "",
          subtasks: taskData.subtasks || [],
          status: taskData.status || "in-progress",
          completed: taskData.status === "completed",
          createdAt: taskData.createdAt
            ? typeof taskData.createdAt.toDate === "function"
              ? taskData.createdAt.toDate().toISOString()
              : taskData.createdAt
            : new Date().toISOString(),
        });
      });

      // Ordenar manualmente
      tasks.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Ordem decrescente
      });

      console.log(`Carregadas ${tasks.length} tarefas sem ordenação`);
    }
  } catch (error) {
    console.error("Erro ao carregar tarefas:", error);
    // Fallback para localStorage se o Firestore falhar
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      tasks = JSON.parse(savedTasks);
    }
  }
}

async function saveTasks() {
  try {
    // Não precisamos salvar todas as tarefas, pois o Firestore
    // gerencia cada documento individualmente
  } catch (error) {
    console.error("Erro ao salvar tarefas:", error);
    // Fallback para localStorage se o Firestore falhar
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }
}

async function addTask(task) {
  try {
    // Garantir que os campos obrigatórios existam
    if (!task.title) {
      throw new Error("O título da tarefa é obrigatório");
    }

    // Criar objeto de tarefa com valores padrão para campos opcionais
    const newTaskData = {
      userId: currentUser.id,
      title: task.title,
      description: task.description || "",
      responsible: task.responsible || "",
      startDate: task.startDate || new Date().toISOString().split("T")[0],
      endDate: task.endDate || "",
      subtasks: task.subtasks || [],
      status: task.status || "in-progress",
      completed: task.status === "completed",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Adicionar ao Firestore
    const newTaskRef = await db.collection("tasks").add(newTaskData);
    console.log("Tarefa criada com ID:", newTaskRef.id);

    // Adicionar à lista local com ID do documento
    const localTaskData = {
      ...newTaskData,
      id: newTaskRef.id,
      createdAt: new Date().toISOString(), // Usar data local para exibição imediata
    };

    tasks.unshift(localTaskData);
    renderTasks();
    checkDeadlineAlerts();
  } catch (error) {
    console.error("Erro ao adicionar tarefa:", error);
    alert("Erro ao adicionar tarefa. Por favor, tente novamente.");
  }
}

async function updateTask(taskId, updatedTask) {
  try {
    // Garantir que os campos obrigatórios existam
    if (updatedTask.hasOwnProperty("title") && !updatedTask.title) {
      throw new Error("O título da tarefa é obrigatório");
    }

    // Obter a tarefa atual para preservar campos não alterados
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error("Tarefa não encontrada");
    }

    const currentTask = tasks[taskIndex];

    // Criar objeto de atualização com valores padrão para campos opcionais
    // e preservando valores originais para campos não incluídos
    const taskUpdateData = {
      ...currentTask,
      // Atualizar apenas os campos fornecidos
      ...(updatedTask.title !== undefined && { title: updatedTask.title }),
      ...(updatedTask.description !== undefined && {
        description: updatedTask.description || "",
      }),
      ...(updatedTask.responsible !== undefined && {
        responsible: updatedTask.responsible || currentTask.responsible || "",
      }),
      ...(updatedTask.startDate !== undefined && {
        startDate: updatedTask.startDate || "",
      }),
      ...(updatedTask.endDate !== undefined && {
        endDate: updatedTask.endDate || "",
      }),
      ...(updatedTask.subtasks !== undefined && {
        subtasks: updatedTask.subtasks || [],
      }),
      ...(updatedTask.status !== undefined && {
        status: updatedTask.status || "in-progress",
      }),
      ...(updatedTask.completed !== undefined && {
        completed: updatedTask.completed,
      }),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Se apenas estamos atualizando as subtarefas, usamos update com o campo específico
    if (
      Object.keys(updatedTask).length === 1 &&
      updatedTask.subtasks !== undefined
    ) {
      await db.collection("tasks").doc(taskId).update({
        subtasks: updatedTask.subtasks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Atualização completa da tarefa
      await db.collection("tasks").doc(taskId).update(taskUpdateData);
    }

    console.log("Tarefa atualizada:", taskId);

    // Atualizar na lista local
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...taskUpdateData,
      updatedAt: new Date().toISOString(), // Usar data local para exibição imediata
    };
    renderTasks();
    checkDeadlineAlerts();
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    throw error; // Re-throw para que o error seja tratado no caller
  }
}

async function deleteTask(taskId) {
  try {
    // Encontrar o botão de excluir e adicionar loading
    const deleteBtn = document.querySelector(
      `.task-card[data-id="${taskId}"] .delete`
    );
    if (deleteBtn) {
      const originalContent = deleteBtn.innerHTML;
      deleteBtn.innerHTML =
        '<span class="material-symbols-outlined loading-spin">sync</span>';
      deleteBtn.disabled = true;
      deleteBtn.classList.add("loading");
    }

    // Verificar se a tarefa existe antes de tentar excluir
    const taskRef = db.collection("tasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      console.warn("Tentativa de excluir uma tarefa que não existe:", taskId);
      // Remover da lista local de qualquer forma
      tasks = tasks.filter((task) => task.id !== taskId);
      renderTasks();
      return;
    }

    // Verificar se o usuário tem permissão (é o proprietário da tarefa)
    const taskData = taskDoc.data();
    if (taskData.userId !== currentUser.id) {
      throw new Error("Você não tem permissão para excluir esta tarefa.");
    }

    // Excluir do Firestore
    await taskRef.delete();
    console.log("Tarefa excluída:", taskId);

    // Remover da lista local
    tasks = tasks.filter((task) => task.id !== taskId);
    renderTasks();
    checkDeadlineAlerts();
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    alert(`Erro ao excluir tarefa: ${error.message}`);

    // Restaurar o botão em caso de erro
    const deleteBtn = document.querySelector(
      `.task-card[data-id="${taskId}"] .delete`
    );
    if (deleteBtn) {
      deleteBtn.innerHTML =
        '<span class="material-symbols-outlined">delete</span>';
      deleteBtn.disabled = false;
      deleteBtn.classList.remove("loading");
    }
  }
}

// Verifica o status do prazo
function checkDeadlineStatus(endDate, isCompleted = false) {
  if (!endDate) return null;

  // Se a tarefa estiver concluída, mudar o estilo mas não alertar
  if (isCompleted) {
    const end = new Date(endDate + "T23:59:59");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "completed-late"; // Tarefa concluída com prazo vencido
    } else {
      return "completed-on-time"; // Tarefa concluída dentro do prazo
    }
  }

  // Para tarefas não concluídas, manter o comportamento original
  const end = new Date(endDate + "T23:59:59"); // Define para o final do dia
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Define para o início do dia

  // Calcular a diferença em dias
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "late"; // Atrasado
  } else if (diffDays <= 1) {
    return "red"; // Alerta (menos de 2 dias)
  } else if (diffDays <= 3) {
    return "yellow"; // Atenção (menos de 3 dias)
  } else {
    return "green"; // Normal (mais de 5 dias)
  }
}

// Calcula o progresso das subtarefas (excluindo as com status "sem resposta")
function calculateProgress(subtasks) {
  if (!subtasks || subtasks.length === 0) return 0;

  // Filtrar subtarefas, excluindo as com status "sem resposta"
  const validSubtasks = subtasks.filter(
    (subtask) => subtask.status !== "no-response"
  );

  if (validSubtasks.length === 0) return 0;

  const completed = validSubtasks.filter((subtask) => subtask.completed).length;
  const partial = validSubtasks.filter(
    (subtask) => subtask.status === "partial"
  ).length;

  // Calcular progresso considerando subtarefas parciais como 0.5
  const progressValue = (completed + partial * 0.5) / validSubtasks.length;
  return Math.round(progressValue * 100);
}

// Formata a exibição do prazo com indicador de status
function formatDeadlineWithStatus(endDate, isCompleted = false) {
  if (!endDate) return "";

  const status = checkDeadlineStatus(endDate, isCompleted);
  const dateStr = formatDate(endDate);

  if (!status) return dateStr;

  return `<span class="status-indicator ${status}"></span> ${dateStr}`;
}

// Formata a data no formato local
function formatDate(dateString) {
  if (!dateString) return "";

  // Criar nova data no timezone local (sem ajustes de UTC)
  const dateParts = dateString.split("-");
  if (dateParts.length !== 3) return "";

  // Criando uma data como yyyy/mm/dd para evitar problemas de timezone
  // Importante: mês em JavaScript é baseado em zero (janeiro = 0)
  const date = new Date(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[2])
  );

  return date.toLocaleDateString("pt-BR");
}

// Funções de renderização
function renderTasks() {
  tasksList.innerHTML = "";

  const taskFilter = document.getElementById("task-filter");
  const filterValue = taskFilter ? taskFilter.value.toLowerCase().trim() : "";

  // Filtrar tarefas com base no texto de filtro
  const filteredTasks = filterValue
    ? tasks.filter((task) => task.title.toLowerCase().includes(filterValue))
    : tasks;

  if (filteredTasks.length === 0) {
    tasksList.innerHTML = `
            <div class="empty-state">
                ${
                  filterValue
                    ? `<p>Nenhuma tarefa encontrada com o filtro "${filterValue}".</p>
                     <p>Tente outro termo ou <button id="clear-filter" class="btn secondary">limpar filtro</button></p>`
                    : `<p>Nenhuma tarefa adicionada ainda.</p>
                     <p>Clique em "Nova Tarefa" para começar.</p>`
                }
            </div>
        `;

    // Adicionar listener para o botão de limpar filtro se existir
    const clearFilterBtn = document.getElementById("clear-filter");
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener("click", () => {
        taskFilter.value = "";
        renderTasks();
      });
    }

    return;
  }

  // Criar fragmento para melhor performance
  const fragment = document.createDocumentFragment();

  // Adicionar tarefas filtradas com animação
  filteredTasks.forEach((task, index) => {
    const taskElement = createTaskElement(task);

    // Adicionar classe para animação com delay baseado no índice
    if (filterValue) {
      taskElement.classList.add("filtered-in");
      taskElement.style.animationDelay = `${index * 0.05}s`;
    }

    fragment.appendChild(taskElement);
  });

  // Adicionar todas as tarefas de uma vez
  tasksList.appendChild(fragment);
}

function createTaskElement(task) {
  const taskCard = document.createElement("div");
  taskCard.className = "task-card";
  taskCard.dataset.id = task.id;

  // Calcula progresso das subtarefas usando a função calculateProgress
  const progress = calculateProgress(task.subtasks);

  // Adiciona atributo de progresso ao card
  taskCard.dataset.progress = progress;

  // Verificar se todas as subtarefas estão concluídas
  const allSubtasksCompleted = task.subtasks.length > 0 && progress === 100;

  // Se todas as subtarefas estiverem concluídas, considerar a tarefa como concluída
  // para fins de exibição do prazo, mesmo que seu status não seja "completed"
  const deadlineStatus = checkDeadlineStatus(
    task.endDate,
    task.completed || allSubtasksCompleted
  );
  const taskStatus = task.status || "in-progress";

  // Determinar texto do status
  let statusText = "Em andamento";
  if (taskStatus === "completed") {
    statusText = "Concluído";
  } else if (taskStatus === "partial") {
    statusText = "Parcialmente Concluído";
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
                ${
                  task.startDate
                    ? `
                <div class="task-date">
                    <span class="material-symbols-outlined">calendar_today</span>
                    <span>Início: ${formatDate(task.startDate)}</span>
                </div>
                `
                    : ""
                }
                ${
                  task.endDate
                    ? `
                <div class="task-date ${
                  deadlineStatus ? `status-${deadlineStatus}` : ""
                }">
                    <span class="material-symbols-outlined">event</span>
                    <span>Término: ${formatDeadlineWithStatus(
                      task.endDate,
                      task.completed
                    )}</span>
                </div>
                `
                    : ""
                }
            </div>
            <div class="task-status-badge ${taskStatus}">${statusText}</div>
        </div>
        ${
          task.description
            ? `<div class="task-description">${task.description}</div>`
            : ""
        }
        ${
          task.responsible
            ? `<div class="task-responsible"><strong>Responsável:</strong> ${task.responsible}</div>`
            : ""
        }
        
        ${
          task.subtasks.length > 0
            ? `
        <div class="task-progress">
            <div class="progress-header">
                <span class="progress-title">Progresso</span>
                <span class="progress-percent">${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-value" style="width: ${progress}%"></div>
            </div>
            <div class="subtasks-list">
                ${task.subtasks
                  .slice(0, 3)
                  .map((subtask) => {
                    const subtaskStatus = checkDeadlineStatus(
                      subtask.endDate,
                      subtask.completed
                    );
                    const isNoResponse = subtask.status === "no-response";
                    const communicationType =
                      subtask.communicationType || "enviado";

                    let statusClass = subtask.status || "in-progress";
                    let statusDisabled = isNoResponse;

                    return `
                    <div class="subtask-item" data-status="${statusClass}">
                        <input type="checkbox" class="subtask-check" ${
                          subtask.completed ? "checked" : ""
                        } ${
                      statusDisabled ? "disabled" : ""
                    } data-subtask-id="${subtask.id}">
                        <div class="subtask-content">
                            <span class="subtask-title">
                                ${subtask.title}
                                <span class="subtask-collapsed-badge ${communicationType}">${communicationType}</span>
                                ${
                                  subtask.status === "partial"
                                    ? '<span class="subtask-collapsed-badge partial">Parcial</span>'
                                    : ""
                                }
                            </span>
                            ${
                              subtask.description
                                ? `<div class="subtask-description">Descrição: ${subtask.description}</div>`
                                : ""
                            }
                        </div>
                        ${
                          subtask.endDate && !isNoResponse
                            ? `
                        <span class="subtask-dates ${
                          subtaskStatus ? `status-${subtaskStatus}` : ""
                        }">
                            Prazo: ${formatDeadlineWithStatus(
                              subtask.endDate,
                              subtask.completed
                            )}
                        </span>
                        `
                            : ""
                        }
                    </div>
                    `;
                  })
                  .join("")}
                ${
                  task.subtasks.length > 3
                    ? `<div class="more-subtasks">+${
                        task.subtasks.length - 3
                      } mais...</div>`
                    : ""
                }
            </div>
        </div>
        `
            : ""
        }
    `;

  // Adicionar event listeners
  const editBtn = taskCard.querySelector(".edit");
  const deleteBtn = taskCard.querySelector(".delete");

  editBtn.addEventListener("click", () => openEditTaskModal(task));
  deleteBtn.addEventListener("click", () => {
    showConfirmModal(
      `Tem certeza que deseja excluir a tarefa "${task.title}"?`,
      () => {
        deleteTask(task.id);
      }
    );
  });

  // Adicionar eventos para subtarefas
  const subtaskChecks = taskCard.querySelectorAll(".subtask-check");
  subtaskChecks.forEach((check) => {
    check.addEventListener("change", (e) => {
      const subtaskId = e.target.dataset.subtaskId;
      toggleSubtaskComplete(task.id, subtaskId);
    });
  });

  return taskCard;
}

function renderSubtasksInModal(subtasks = []) {
  subtasksContainer.innerHTML = "";

  subtasks.forEach((subtask, index) => {
    createCollapsedSubtaskElement(subtask);
  });
}

// Criar elemento de subtarefa colapsada
function createCollapsedSubtaskElement(subtask) {
  const subtaskElement = document.createElement("div");
  subtaskElement.className = "subtask-collapsed";
  subtaskElement.dataset.id =
    subtask.id ||
    Date.now().toString() + Math.random().toString(36).substr(2, 5);

  // Definir o tipo de comunicação (recebido/enviado/sem resposta)
  const communicationType = subtask.communicationType || "enviado";
  const status = subtask.status || "in-progress";

  subtaskElement.innerHTML = `
        <div class="subtask-collapsed-title">
            ${subtask.title}
            <span class="subtask-collapsed-badge ${communicationType}">${communicationType}</span>
            ${
              status === "no-response"
                ? '<span class="subtask-collapsed-badge no-response">Sem resposta</span>'
                : ""
            }
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
  const expandBtn = subtaskElement.querySelector(".expand-btn");
  const removeBtn = subtaskElement.querySelector(".remove-btn");

  expandBtn.addEventListener("click", () => {
    // Minimizar todas as outras subtarefas expandidas
    const expandedItems =
      subtasksContainer.querySelectorAll(".subtask-item-edit");
    expandedItems.forEach((item) => {
      // Converter o item expandido para colapsado
      const subtaskId = item.dataset.id;
      const titleInput = item.querySelector(".subtask-title-input");
      const title = titleInput ? titleInput.value : "";
      const statusSelect = item.querySelector(".subtask-status");
      const status = statusSelect ? statusSelect.value : "false";
      const commTypeSelect = item.querySelector(".subtask-communication-type");
      const commType = commTypeSelect ? commTypeSelect.value : "enviado";

      // Criar subtarefa temporária para gerar o elemento colapsado
      const tempSubtask = {
        id: subtaskId,
        title: title,
        status:
          status === "no-response"
            ? "no-response"
            : status === "true"
            ? "completed"
            : "in-progress",
        communicationType: commType,
      };

      // Obter os demais dados da subtarefa dos inputs
      if (editingTask) {
        const originalSubtask = editingTask.subtasks.find(
          (s) => s.id === subtaskId
        );
        if (originalSubtask) {
          tempSubtask.startDate =
            item.querySelector(".subtask-start-date").value ||
            originalSubtask.startDate;
          tempSubtask.endDate =
            item.querySelector(".subtask-end-date").value ||
            originalSubtask.endDate;
          tempSubtask.description =
            item.querySelector(".subtask-description").value ||
            originalSubtask.description;
        }
      }

      const collapsedElement =
        createCollapsedSubtaskElementFromData(tempSubtask);
      item.parentNode.replaceChild(collapsedElement, item);
    });

    expandSubtask(subtaskElement, subtask);
  });

  removeBtn.addEventListener("click", () => {
    subtaskToDelete = subtaskElement;
    showConfirmModal(
      `Tem certeza que deseja excluir a subtarefa "${subtask.title}"?`,
      () => {
        subtaskElement.remove();

        // Se estiver editando uma tarefa, salvar automaticamente após excluir
        if (editingTask && editingTask.id) {
          const updatedSubtasks = getSubtasksFromModal();
          saveSubtaskChanges(editingTask.id, updatedSubtasks);
        }
      }
    );
  });

  subtasksContainer.appendChild(subtaskElement);
  return subtaskElement;
}

// Criar elemento de subtarefa colapsada a partir de dados
function createCollapsedSubtaskElementFromData(subtask) {
  const element = document.createElement("div");
  element.className = "subtask-collapsed";
  element.dataset.id = subtask.id;

  const communicationType = subtask.communicationType || "enviado";
  const status = subtask.status || "in-progress";

  element.innerHTML = `
        <div class="subtask-collapsed-title">
            ${subtask.title}
            <span class="subtask-collapsed-badge ${communicationType}">${communicationType}</span>
            ${
              status === "no-response"
                ? '<span class="subtask-collapsed-badge no-response">Sem resposta</span>'
                : ""
            }
            ${
              status === "partial"
                ? '<span class="subtask-collapsed-badge partial">Parcial</span>'
                : ""
            }
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
  const expandBtn = element.querySelector(".expand-btn");
  const removeBtn = element.querySelector(".remove-btn");

  expandBtn.addEventListener("click", () => {
    // Minimizar todas as outras subtarefas expandidas
    const expandedItems =
      subtasksContainer.querySelectorAll(".subtask-item-edit");
    expandedItems.forEach((item) => {
      const tempSubtask = collectSubtaskDataFromExpandedItem(item);
      const collapsedElement =
        createCollapsedSubtaskElementFromData(tempSubtask);
      item.parentNode.replaceChild(collapsedElement, item);
    });

    expandSubtask(element, subtask);
  });

  removeBtn.addEventListener("click", () => {
    subtaskToDelete = element;
    showConfirmModal(`Tem certeza que deseja excluir esta subtarefa?`, () => {
      // Adicionar animação de loading ao botão de excluir
      const originalContent = removeBtn.innerHTML;
      removeBtn.innerHTML =
        '<span class="material-symbols-outlined loading-spin">sync</span>';
      removeBtn.disabled = true;
      removeBtn.classList.add("loading");

      // Remover elemento e salvar alterações
      setTimeout(() => {
        element.remove();

        // Se estiver editando uma tarefa, salvar automaticamente após excluir
        if (editingTask && editingTask.id) {
          const updatedSubtasks = getSubtasksFromModal();
          saveSubtaskChanges(editingTask.id, updatedSubtasks);
        }
      }, 300);
    });
  });

  return element;
}

// Expandir uma subtarefa
function expandSubtask(element, subtask) {
  const expanded = document.createElement("div");
  expanded.className = "subtask-item-edit";
  expanded.dataset.id = element.dataset.id;

  expanded.innerHTML = `
        <div class="subtask-content">
            <div class="form-group required-field">
                <label>Título</label>
                <input type="text" class="subtask-title-input" value="${
                  subtask.title || ""
                }" required>
            </div>
            <div class="form-row">
                <div class="form-group required-field">
                    <label>Data de Início</label>
                    <input type="date" class="subtask-start-date" value="${
                      subtask.startDate || ""
                    }" required>
                </div>
                <div class="form-group required-field">
                    <label>Prazo</label>
                    <input type="date" class="subtask-end-date" value="${
                      subtask.endDate || ""
                    }" required>
                </div>
            </div>
            <div class="form-group required-field">
                <label>Descrição</label>
                <textarea class="subtask-description" rows="2" required>${
                  subtask.description || ""
                }</textarea>
            </div>
            <div class="form-row">
                <div class="form-group required-field">
                    <label>Status</label>
                    <select class="subtask-status" required>
                        <option value="false" ${
                          !subtask.completed &&
                          subtask.status !== "no-response" &&
                          subtask.status !== "partial"
                            ? "selected"
                            : ""
                        }>Em andamento</option>
                        <option value="true" ${
                          subtask.completed ? "selected" : ""
                        }>Concluído</option>
                        <option value="no-response" ${
                          subtask.status === "no-response" ? "selected" : ""
                        }>Sem resposta</option>
                        <option value="partial" ${
                          subtask.status === "partial" ? "selected" : ""
                        }>Parcialmente Concluído</option>
                    </select>
                </div>
                <div class="form-group required-field">
                    <label>Tipo de Comunicação</label>
                    <select class="subtask-communication-type" required>
                        <option value="enviado" ${
                          (subtask.communicationType || "enviado") === "enviado"
                            ? "selected"
                            : ""
                        }>Enviado</option>
                        <option value="recebido" ${
                          (subtask.communicationType || "") === "recebido"
                            ? "selected"
                            : ""
                        }>Recebido</option>
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

  const minimizeBtn = expanded.querySelector(".minimize-btn");
  const removeBtn = expanded.querySelector(".remove-btn");

  // Adicionar validação de datas
  const startDateInput = expanded.querySelector(".subtask-start-date");
  const endDateInput = expanded.querySelector(".subtask-end-date");

  endDateInput.addEventListener("change", () => {
    if (startDateInput.value && endDateInput.value) {
      const startDate = new Date(startDateInput.value);
      const endDate = new Date(endDateInput.value);

      if (endDate < startDate) {
        alert("A data de término não pode ser anterior à data de início.");
        endDateInput.value = startDateInput.value;
      }
    }
  });

  // Adicionar event listeners para campos que atualizam automaticamente
  const inputs = expanded.querySelectorAll("input, textarea, select");
  inputs.forEach((input) => {
    input.addEventListener("change", async () => {
      if (editingTask && editingTask.id) {
        try {
          // Coletar todos os dados atualizados das subtarefas
          const updatedSubtasks = getSubtasksFromModal();

          // Não mostrar mais o indicador de salvamento
          // showSaveIndicator('Salvando alterações...', '');

          // Salvar as alterações sem mostrar erro se houver falha
          await saveSubtaskChanges(editingTask.id, updatedSubtasks).catch(
            (error) => {
              console.error("Erro ao atualizar subtarefa:", error);
              // Não exibir alerta de erro, apenas log
            }
          );

          // Não mostrar mais indicador de sucesso
          // showSaveIndicator('Subtarefa atualizada com sucesso!', 'success');
        } catch (error) {
          console.error("Erro ao atualizar subtarefa:", error);
          // Não exibir alerta de erro, apenas log
        }
      }
    });
  });

  minimizeBtn.addEventListener("click", () => {
    const tempSubtask = collectSubtaskDataFromExpandedItem(expanded);

    // Adicionar classe de animação de colapso
    expanded.classList.add("collapsing");

    // Aguardar a animação terminar antes de substituir
    setTimeout(() => {
      const collapsedElement =
        createCollapsedSubtaskElementFromData(tempSubtask);
      expanded.parentNode.replaceChild(collapsedElement, expanded);
    }, 280); // Ligeiramente menor que a duração da animação
  });

  removeBtn.addEventListener("click", () => {
    subtaskToDelete = expanded;
    const title = expanded.querySelector(".subtask-title-input").value;
    showConfirmModal(
      `Tem certeza que deseja excluir a subtarefa "${title}"?`,
      () => {
        // Adicionar animação de loading ao botão de excluir
        const originalContent = removeBtn.innerHTML;
        removeBtn.innerHTML =
          '<span class="material-symbols-outlined loading-spin">sync</span>';
        removeBtn.disabled = true;
        removeBtn.classList.add("loading");

        // Adicionar classe de animação de colapso
        expanded.classList.add("collapsing");

        // Remover elemento e salvar alterações depois que a animação terminar
        setTimeout(() => {
          expanded.remove();

          // Se estiver editando uma tarefa, salvar automaticamente após excluir
          if (editingTask && editingTask.id) {
            const updatedSubtasks = getSubtasksFromModal();
            saveSubtaskChanges(editingTask.id, updatedSubtasks);
          }
        }, 280);
      }
    );
  });

  // Substituir o elemento colapsado pelo expandido
  element.parentNode.replaceChild(expanded, element);

  // Focar no primeiro campo
  expanded.querySelector(".subtask-title-input").focus();
}

// Coletar dados de uma subtarefa expandida
function collectSubtaskDataFromExpandedItem(item) {
  const titleInput = item.querySelector(".subtask-title-input");
  const startDateInput = item.querySelector(".subtask-start-date");
  const endDateInput = item.querySelector(".subtask-end-date");
  const descriptionInput = item.querySelector(".subtask-description");
  const statusSelect = item.querySelector(".subtask-status");
  const commTypeSelect = item.querySelector(".subtask-communication-type");

  return {
    id: item.dataset.id,
    title: titleInput ? titleInput.value : "",
    startDate: startDateInput ? startDateInput.value : "",
    endDate: endDateInput ? endDateInput.value : "",
    description: descriptionInput ? descriptionInput.value : "",
    status: statusSelect
      ? statusSelect.value === "no-response"
        ? "no-response"
        : statusSelect.value === "true"
        ? "completed"
        : "in-progress"
      : "in-progress",
    completed: statusSelect ? statusSelect.value === "true" : false,
    communicationType: commTypeSelect ? commTypeSelect.value : "enviado",
  };
}

function getSubtasksFromModal() {
  const subtaskItems = subtasksContainer.querySelectorAll(
    ".subtask-item-edit, .subtask-collapsed"
  );
  const subtasks = [];

  subtaskItems.forEach((item) => {
    // Verificar se é um item colapsado ou expandido
    const isCollapsed = item.classList.contains("subtask-collapsed");

    // Obter os dados dependendo do tipo de item
    if (isCollapsed) {
      // Manter os dados existentes para itens colapsados
      const id = item.dataset.id;
      const title = item
        .querySelector(".subtask-collapsed-title")
        .textContent.trim()
        .split("\n")[0]
        .trim();

      // Encontrar a subtarefa original pelos dados salvos
      const originalSubtask = editingTask
        ? editingTask.subtasks.find((s) => s.id === id)
        : {
            startDate: "",
            endDate: "",
            description: "",
            completed: false,
            status: "in-progress",
            communicationType: "enviado",
          };

      if (originalSubtask) {
        subtasks.push({
          id: id,
          title: title,
          startDate: originalSubtask.startDate,
          endDate: originalSubtask.endDate,
          description: originalSubtask.description,
          completed: originalSubtask.completed,
          status: originalSubtask.status,
          communicationType: originalSubtask.communicationType,
        });
      }
    } else {
      // Obter dados de itens expandidos
      const titleInput = item.querySelector(".subtask-title-input");
      const startDateInput = item.querySelector(".subtask-start-date");
      const endDateInput = item.querySelector(".subtask-end-date");
      const descriptionInput = item.querySelector(".subtask-description");
      const statusSelect = item.querySelector(".subtask-status");
      const communicationTypeSelect = item.querySelector(
        ".subtask-communication-type"
      );

      // Verificar se todos os campos obrigatórios foram preenchidos
      if (
        titleInput.value.trim() &&
        startDateInput.value &&
        endDateInput.value &&
        descriptionInput.value.trim()
      ) {
        const status = statusSelect.value;
        const communicationType = communicationTypeSelect.value;

        // Determinar o status real com base na seleção
        let realStatus;
        let isCompleted = false;

        if (status === "true") {
          realStatus = "completed";
          isCompleted = true;
        } else if (status === "no-response") {
          realStatus = "no-response";
          isCompleted = false;
        } else if (status === "partial") {
          realStatus = "partial";
          isCompleted = false;
        } else {
          realStatus = "in-progress";
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
          communicationType: communicationType,
        });
      }
    }
  });

  return subtasks;
}

// Manipulação do modal
function openAddTaskModal() {
  modalTitle.textContent = "Nova Tarefa";
  taskForm.reset();
  taskIdInput.value = "";
  subtasksContainer.innerHTML = "";
  editingTask = null;
  taskModal.classList.add("open");
}

function openEditTaskModal(task) {
  modalTitle.textContent = "Editar Tarefa";
  taskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskDescriptionInput.value = task.description || "";
  taskResponsibleInput.value = task.responsible || "";
  taskStartDateInput.value = task.startDate || "";
  taskEndDateInput.value = task.endDate || "";

  const taskStatusSelect = document.getElementById("task-status");
  if (taskStatusSelect) {
    taskStatusSelect.value =
      task.status === "completed"
        ? "true"
        : task.status === "partial"
        ? "partial"
        : "false";
  }

  renderSubtasksInModal(task.subtasks);

  editingTask = task;
  taskModal.classList.add("open");
}

function closeModal() {
  const modalContent = taskModal.querySelector(".modal-content");

  // Reset the submit button to its original state
  const submitBtn = taskForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = "Salvar";
    submitBtn.disabled = false;
  }

  modalContent.style.animation = "none";
  modalContent.offsetHeight; // Forçar reflow
  modalContent.style.animation = "fadeOut 0.3s ease forwards";

  taskModal.style.animation = "fadeOut 0.3s ease forwards";

  setTimeout(() => {
    taskModal.classList.remove("open");
    modalContent.style.animation = "";
    taskModal.style.animation = "";

    // Remover a classe de edição de subtarefa se estiver presente
    document.body.classList.remove("editing-subtask");
  }, 300);
}

// Manipulação de subtarefas
function addNewSubtask() {
  const subtaskId =
    Date.now().toString() + Math.random().toString(36).substr(2, 5);

  // Minimizar todas as subtarefas expandidas
  const expandedItems =
    subtasksContainer.querySelectorAll(".subtask-item-edit");
  expandedItems.forEach((item) => {
    // Adicionar classe de animação de colapso
    item.classList.add("collapsing");

    // Aguardar a animação terminar antes de substituir
    setTimeout(() => {
      const tempSubtask = collectSubtaskDataFromExpandedItem(item);
      const collapsedElement =
        createCollapsedSubtaskElementFromData(tempSubtask);
      if (item.parentNode) {
        item.parentNode.replaceChild(collapsedElement, item);
      }
    }, 280);
  });

  // Esperar um curto período para garantir que as animações de colapso já começaram
  setTimeout(() => {
    // Criar nova subtarefa expandida
    const subtaskElement = document.createElement("div");
    subtaskElement.className = "subtask-item-edit";
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

    const minimizeBtn = subtaskElement.querySelector(".minimize-btn");
    const removeBtn = subtaskElement.querySelector(".remove-btn");

    // Adicionar validação de datas
    const startDateInput = subtaskElement.querySelector(".subtask-start-date");
    const endDateInput = subtaskElement.querySelector(".subtask-end-date");

    endDateInput.addEventListener("change", () => {
      if (startDateInput.value && endDateInput.value) {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);

        if (endDate < startDate) {
          alert("A data de término não pode ser anterior à data de início.");
          endDateInput.value = startDateInput.value;
        }
      }
    });

    minimizeBtn.addEventListener("click", () => {
      const tempSubtask = collectSubtaskDataFromExpandedItem(subtaskElement);

      // Adicionar classe de animação de colapso
      subtaskElement.classList.add("collapsing");

      // Aguardar a animação terminar antes de substituir
      setTimeout(() => {
        if (tempSubtask.title.trim()) {
          const collapsedElement =
            createCollapsedSubtaskElementFromData(tempSubtask);
          subtaskElement.parentNode.replaceChild(
            collapsedElement,
            subtaskElement
          );
        } else {
          subtaskElement.remove();
        }
      }, 280);
    });

    removeBtn.addEventListener("click", () => {
      subtaskToDelete = subtaskElement;
      showConfirmModal("Tem certeza que deseja excluir esta subtarefa?", () => {
        // Adicionar animação de colapso antes de remover
        subtaskElement.classList.add("collapsing");
        setTimeout(() => {
          subtaskElement.remove();
        }, 280);
      });
    });

    subtasksContainer.appendChild(subtaskElement);

    // Focar no campo de título da nova subtarefa
    subtaskElement.querySelector(".subtask-title-input").focus();

    // Se estiver editando uma tarefa, mudar seu status para "em andamento"
    if (editingTask && editingTask.status === "completed") {
      // Mudar o status no formulário
      const taskStatusSelect = document.getElementById("task-status");
      if (taskStatusSelect) {
        taskStatusSelect.value = "false"; // Em andamento
      }
    }
  }, 100); // Pequeno atraso para permitir que as animações de colapso comecem primeiro
}

function toggleSubtaskComplete(taskId, subtaskId) {
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) return;

  const subtaskIndex = tasks[taskIndex].subtasks.findIndex(
    (subtask) => subtask.id === subtaskId
  );
  if (subtaskIndex === -1) return;

  // Não alterar status se for "Sem resposta"
  if (tasks[taskIndex].subtasks[subtaskIndex].status === "no-response") return;

  // Salvar o progresso antigo para animação
  const oldProgress = calculateProgress(tasks[taskIndex].subtasks);

  // Atualizar o status da subtarefa
  tasks[taskIndex].subtasks[subtaskIndex].completed =
    !tasks[taskIndex].subtasks[subtaskIndex].completed;
  tasks[taskIndex].subtasks[subtaskIndex].status = tasks[taskIndex].subtasks[
    subtaskIndex
  ].completed
    ? "completed"
    : "in-progress";

  // Verificar se todas as subtarefas estão concluídas e atualizar o status da tarefa
  updateTaskStatusBasedOnSubtasks(taskIndex);

  // Calcular o novo progresso
  const newProgress = calculateProgress(tasks[taskIndex].subtasks);

  // Salvar mudanças para o Firestore
  updateTask(taskId, {
    subtasks: tasks[taskIndex].subtasks,
    status: tasks[taskIndex].status,
    completed: tasks[taskIndex].completed,
  });

  // Se a visualização de subtarefas estiver aberta, atualizar tudo
  if (!subtasksView.classList.contains("hidden")) {
    renderAllSubtasks();
  }

  // Aplicar animação ao progresso
  const taskCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
  if (taskCard) {
    const progressValue = taskCard.querySelector(".progress-value");
    const progressPercent = taskCard.querySelector(".progress-percent");

    // Atualizar o atributo data-progress para controlar os estilos
    taskCard.dataset.progress = newProgress;

    // Verificar se todas as subtarefas estão concluídas
    const allSubtasksCompleted =
      tasks[taskIndex].subtasks.length > 0 && newProgress === 100;

    // Atualizar a exibição do prazo com base no novo status
    if (tasks[taskIndex].endDate) {
      const taskDateElement = taskCard.querySelector(".task-date:last-child");
      if (taskDateElement) {
        // Atualizar classe de status com base na conclusão das subtarefas
        const deadlineStatus = checkDeadlineStatus(
          tasks[taskIndex].endDate,
          tasks[taskIndex].completed || allSubtasksCompleted
        );

        // Remover classes de status antigas
        taskDateElement.classList.remove(
          "status-red",
          "status-yellow",
          "status-green",
          "status-late",
          "status-completed-late",
          "status-completed-on-time"
        );

        // Adicionar nova classe de status
        if (deadlineStatus) {
          taskDateElement.classList.add(`status-${deadlineStatus}`);
        }

        // Atualizar o conteúdo com o novo status
        const formattedDeadline = formatDeadlineWithStatus(
          tasks[taskIndex].endDate,
          tasks[taskIndex].completed || allSubtasksCompleted
        );
        const deadlineSpan = taskDateElement.querySelector("span:last-child");
        if (deadlineSpan) {
          deadlineSpan.innerHTML = `Término: ${formattedDeadline}`;
        }
      }
    }

    if (progressValue && progressPercent) {
      // Garantir que a transição esteja definida antes de alterar o valor
      progressValue.style.transition = "width 0.8s ease-in-out";

      // Atualizar imediatamente o texto do percentual para o novo valor
      progressPercent.textContent = `${newProgress}%`;
      progressPercent.classList.add("progress-updating");

      // Aplicar a nova largura para iniciar a animação
      progressValue.style.width = `${newProgress}%`;

      // Remover a classe de animação após a transição terminar
      setTimeout(() => {
        progressPercent.classList.remove("progress-updating");
      }, 800);

      // Atualizar status e badge no card
      const statusBadge = taskCard.querySelector(".task-status-badge");
      if (statusBadge) {
        const task = tasks[taskIndex];
        statusBadge.className = `task-status-badge ${task.status}`;

        let statusText = "Em andamento";
        if (task.status === "completed") {
          statusText = "Concluído";
        } else if (task.status === "partial") {
          statusText = "Parcialmente Concluído";
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
  const validSubtasks = task.subtasks.filter(
    (subtask) => subtask.status !== "no-response"
  );

  if (validSubtasks.length === 0) return;

  const completedCount = validSubtasks.filter(
    (subtask) => subtask.completed
  ).length;
  const partialCount = validSubtasks.filter(
    (subtask) => subtask.status === "partial"
  ).length;

  // Se todas as subtarefas estiverem concluídas
  if (completedCount === validSubtasks.length) {
    task.status = "completed";
    task.completed = true;
  }
  // Se algumas subtarefas estiverem concluídas ou em status parcial
  else if (completedCount > 0 || partialCount > 0) {
    task.status = "partial";
    task.completed = false;
  }
  // Se nenhuma subtarefa estiver concluída
  else {
    task.status = "in-progress";
    task.completed = false;
  }
}

// Verifica se há tarefas com prazos próximos e exibe alertas
function checkDeadlineAlerts() {
  // Limpar alertas antigos
  const oldAlerts = document.querySelectorAll(".deadline-alert");
  oldAlerts.forEach((alert) => alert.remove());

  // Verificar tarefas
  let hasAlerts = false;
  const alertsContainer = document.createElement("div");
  alertsContainer.className = "alerts-container";

  tasks.forEach((task) => {
    // Não alertar para tarefas concluídas
    if (task.completed) return;

    // Verificar se todas as subtarefas estão concluídas
    const progress = calculateProgress(task.subtasks);
    const allSubtasksCompleted = task.subtasks.length > 0 && progress === 100;

    // Se todas as subtarefas estiverem concluídas, não mostrar alerta
    if (allSubtasksCompleted) return;

    // Verificar prazo da tarefa principal
    const taskStatus = checkDeadlineStatus(task.endDate);
    if (taskStatus === "red" || taskStatus === "yellow") {
      hasAlerts = true;
      const alertElement = createDeadlineAlert(task, taskStatus);
      alertsContainer.appendChild(alertElement);
    }

    // Verificar prazos das subtarefas
    task.subtasks.forEach((subtask) => {
      if (subtask.completed) return; // Não alertar para tarefas concluídas

      const subtaskStatus = checkDeadlineStatus(subtask.endDate);
      if (subtaskStatus === "red" || subtaskStatus === "yellow") {
        hasAlerts = true;
        const alertElement = createDeadlineAlert(
          subtask,
          subtaskStatus,
          task.title
        );
        alertsContainer.appendChild(alertElement);
      }
    });
  });

  // Adicionar alertas ao DOM se houver
  if (hasAlerts) {
    const container = document.querySelector(".container");
    container.insertBefore(alertsContainer, container.querySelector("main"));
  }
}

// Cria um elemento de alerta para prazos próximos
function createDeadlineAlert(item, status, parentTitle = null) {
  const alertElement = document.createElement("div");
  alertElement.className = `deadline-alert status-${status}`;

  const daysLeft = getDaysLeft(item.endDate);
  const statusText = status === "red" ? "Crítico" : "Atenção";
  const itemType = parentTitle ? "Subtarefa" : "Tarefa";
  const parentInfo = parentTitle ? ` (em "${parentTitle}")` : "";

  let messageText;
  if (daysLeft < 0) {
    messageText =
      "venceu há " +
      Math.abs(daysLeft) +
      ` ${Math.abs(daysLeft) === 1 ? "dia" : "dias"}!`;
  } else if (daysLeft === 0) {
    messageText = "vence hoje!";
  } else {
    messageText = `vence em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`;
  }

  alertElement.innerHTML = `
        <span class="material-symbols-outlined">
            ${status === "red" ? "priority_high" : "warning"}
        </span>
        <div>
            <strong>${statusText}:</strong> ${itemType} "${
    item.title
  }"${parentInfo} 
            ${messageText}
        </div>
    `;

  return alertElement;
}

// Calcula quantos dias faltam para o prazo
function getDaysLeft(endDate) {
  if (!endDate) return null;

  const end = new Date(endDate + "T23:59:59"); // Define para o final do dia
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Define para o início do dia

  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Modal de confirmação
function showConfirmModal(message, onConfirm) {
  confirmMessage.textContent = message;
  confirmModal.classList.add("open");

  // Atualizar os event listeners
  const confirmHandler = () => {
    // Adicionar animação de fechamento
    const modalContent = confirmModal.querySelector(".confirm-modal-content");
    modalContent.style.animation = "fadeOut 0.2s ease forwards";
    confirmModal.style.animation = "fadeOut 0.3s ease forwards";

    setTimeout(() => {
      onConfirm();
      confirmModal.classList.remove("open");
      modalContent.style.animation = "";
      confirmModal.style.animation = "";
      cleanupConfirmListeners();
    }, 250);
  };

  const cancelHandler = () => {
    // Adicionar animação de fechamento
    const modalContent = confirmModal.querySelector(".confirm-modal-content");
    modalContent.style.animation = "fadeOut 0.2s ease forwards";
    confirmModal.style.animation = "fadeOut 0.3s ease forwards";

    setTimeout(() => {
      confirmModal.classList.remove("open");
      modalContent.style.animation = "";
      confirmModal.style.animation = "";
      cleanupConfirmListeners();
    }, 250);
  };

  const cleanupConfirmListeners = () => {
    confirmOkBtn.removeEventListener("click", confirmHandler);
    confirmCancelBtn.removeEventListener("click", cancelHandler);
  };

  confirmOkBtn.addEventListener("click", confirmHandler);
  confirmCancelBtn.addEventListener("click", cancelHandler);
}

// Funções de visualização de subtarefas
function renderAllSubtasks() {
  // Verificar se a visualização está escondida ou em processo de fechamento
  if (
    subtasksView.classList.contains("hidden") ||
    subtasksView.dataset.isClosing === "true"
  ) {
    return;
  }

  // Limpar container
  allSubtasksContainer.innerHTML = "";

  let allSubtasks = [];

  // Obter o elemento de filtro de tarefa pai
  const parentTaskFilter = document.getElementById("parent-task-filter");

  // Se é a primeira vez que estamos renderizando, configurar as opções do filtro
  if (parentTaskFilter.options.length <= 1) {
    // Limpar e adicionar a opção padrão
    parentTaskFilter.innerHTML = `<option value="">Todas as tarefas</option>`;

    // Adicionar cada tarefa como uma opção no filtro
    tasks.forEach((task) => {
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = task.title;
      parentTaskFilter.appendChild(option);
    });
  }

  // Coletar todas as subtarefas de todas as tarefas
  tasks.forEach((task) => {
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((subtask) => {
        allSubtasks.push({
          ...subtask,
          parentTaskId: task.id,
          parentTaskTitle: task.title,
        });
      });
    }
  });

  // Remover duplicatas de subtarefas usando o ID
  allSubtasks = removeDuplicateSubtasks(allSubtasks);

  // Filtrar as subtarefas
  let filteredSubtasks = allSubtasks;

  // Aplicar filtro de tarefa pai
  const selectedTaskId = parentTaskFilter.value;
  if (selectedTaskId) {
    filteredSubtasks = filteredSubtasks.filter(
      (subtask) => subtask.parentTaskId === selectedTaskId
    );
  }

  // Aplicar filtro de título
  const titleFilter = document
    .getElementById("subtask-title-filter")
    .value.toLowerCase()
    .trim();
  if (titleFilter) {
    filteredSubtasks = filteredSubtasks.filter((subtask) =>
      subtask.title.toLowerCase().includes(titleFilter)
    );
  }

  // Aplicar filtro de descrição/objeto
  const descriptionFilter = document
    .getElementById("subtask-description-filter")
    .value.toLowerCase()
    .trim();
  if (descriptionFilter) {
    filteredSubtasks = filteredSubtasks.filter(
      (subtask) =>
        subtask.description &&
        subtask.description.toLowerCase().includes(descriptionFilter)
    );
  }

  // Aplicar filtro de status
  const statusFilter = document.getElementById("status-filter").value;
  if (statusFilter) {
    filteredSubtasks = filteredSubtasks.filter(
      (subtask) => subtask.status === statusFilter
    );
  }

  // Aplicar filtro de tipo de comunicação
  const commTypeFilter = document.getElementById("comm-type-filter").value;
  if (commTypeFilter) {
    filteredSubtasks = filteredSubtasks.filter(
      (subtask) => subtask.communicationType === commTypeFilter
    );
  }

  // Atualizar contador
  document.getElementById("filtered-count").textContent =
    filteredSubtasks.length;

  // Ordenar por data de término (as mais próximas primeiro)
  filteredSubtasks.sort((a, b) => {
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate) - new Date(b.endDate);
  });

  // Verificar novamente se a visualização não foi fechada durante o processamento
  if (subtasksView.classList.contains("hidden")) {
    return;
  }

  // Criar um fragmento de documento para melhorar performance
  const fragment = document.createDocumentFragment();

  // Renderizar cada subtarefa
  filteredSubtasks.forEach((subtask) => {
    const subtaskElement = createAllSubtaskElement(subtask);
    fragment.appendChild(subtaskElement);
  });

  // Se não houver subtarefas, mostrar mensagem
  if (filteredSubtasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML =
      "<p>Nenhuma subtarefa encontrada com os filtros selecionados.</p>";
    fragment.appendChild(emptyState);
  }

  // Anexar todos os elementos de uma vez
  allSubtasksContainer.appendChild(fragment);
}

function createAllSubtaskElement(subtask) {
  const element = document.createElement("div");
  element.className = `all-subtask-item ${subtask.status || "in-progress"}`;
  element.dataset.taskId = subtask.parentTaskId;
  element.dataset.subtaskId = subtask.id;

  const startDate = subtask.startDate
    ? formatDate(subtask.startDate)
    : "Não definido";
  const endDate = subtask.endDate
    ? formatDate(subtask.endDate)
    : "Não definido";
  const deadlineStatus = checkDeadlineStatus(
    subtask.endDate,
    subtask.completed
  );

  // Determinar texto do status
  let statusText = "Em andamento";
  if (subtask.status === "completed") {
    statusText = "Concluído";
  } else if (subtask.status === "partial") {
    statusText = "Parcialmente Concluído";
  } else if (subtask.status === "no-response") {
    statusText = "Sem resposta";
  }

  // Adicionar checkbox para marcar como concluído
  const isDisabled = subtask.status === "no-response";

  element.innerHTML = `
        <div class="all-subtask-header">
            <div style="display: flex; align-items: center;">
                <input type="checkbox" class="subtask-check" ${
                  subtask.completed ? "checked" : ""
                } ${isDisabled ? "disabled" : ""}>
                <span class="all-subtask-title">${subtask.title}</span>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="all-subtask-parent">${
                  subtask.parentTaskTitle
                }</span>
                <div class="all-subtask-actions">
                    <button class="all-subtask-action-btn edit" title="Editar Subtarefa">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="all-subtask-action-btn delete" title="Excluir Subtarefa">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="all-subtask-details">
            <div class="all-subtask-date">
                <span class="material-symbols-outlined">calendar_today</span>
                <span>Início: ${startDate}</span>
            </div>
            <div class="all-subtask-status ${subtask.status}">
                <span class="material-symbols-outlined">
                    ${
                      subtask.status === "completed"
                        ? "check_circle"
                        : subtask.status === "partial"
                        ? "incomplete_circle"
                        : subtask.status === "no-response"
                        ? "help"
                        : "pending"
                    }
                </span>
                <span>${statusText}</span>
            </div>
            <div class="all-subtask-date ${
              deadlineStatus ? `status-${deadlineStatus}` : ""
            }">
                <span class="material-symbols-outlined">event</span>
                <span>Término: ${endDate}</span>
            </div>
            <div class="all-subtask-comm-type ${
              subtask.communicationType || "enviado"
            }">
                <span class="material-symbols-outlined">
                    ${
                      subtask.communicationType === "recebido"
                        ? "call_received"
                        : "call_made"
                    }
                </span>
                <span>${
                  subtask.communicationType === "recebido"
                    ? "Recebido"
                    : "Enviado"
                }</span>
            </div>
        </div>
        ${
          subtask.description
            ? `
        <div class="all-subtask-description">
            <div class="all-subtask-description-title">Descrição:</div>
            <div class="all-subtask-description-content">${subtask.description}</div>
        </div>
        `
            : ""
        }
    `;

  // Adicionar event listener para o checkbox
  const checkbox = element.querySelector(".subtask-check");
  if (checkbox && !isDisabled) {
    checkbox.addEventListener("change", () => {
      const taskId = subtask.parentTaskId;
      const subtaskId = subtask.id;
      toggleSubtaskComplete(taskId, subtaskId);

      // Atualizar o elemento visual imediatamente
      if (checkbox.checked) {
        element.classList.add("completed");
        element.classList.remove("in-progress", "partial");
      } else {
        element.classList.add("in-progress");
        element.classList.remove("completed", "partial");
      }
    });
  }

  // Adicionar event listeners para os botões de editar e excluir
  const editButton = element.querySelector(".all-subtask-action-btn.edit");
  const deleteButton = element.querySelector(".all-subtask-action-btn.delete");

  editButton.addEventListener("click", async (e) => {
    e.stopPropagation();

    // Encontrar a tarefa pai
    const taskId = subtask.parentTaskId;
    const task = tasks.find((t) => t.id === taskId);

    if (task) {
      // Abrir o modal de edição da tarefa
      openEditTaskModal(task);

      // Esperar um pouco para garantir que o modal esteja aberto e os subtasks renderizados
      setTimeout(() => {
        // Encontrar o elemento da subtarefa no modal e expandir
        const subtaskElements = document.querySelectorAll(".subtask-collapsed");
        subtaskElements.forEach((subtaskElem) => {
          // Verificar se é a subtarefa correta usando o ID armazenado como data attribute
          if (subtaskElem.dataset.id === subtask.id) {
            // Simular click para expandir
            const expandBtn = subtaskElem.querySelector(".expand-btn");
            if (expandBtn) {
              expandBtn.click();
            }
          }
        });
      }, 300);
    }
  });

  deleteButton.addEventListener("click", (e) => {
    e.stopPropagation();

    showConfirmModal(
      "Tem certeza que deseja excluir esta subtarefa?",
      async () => {
        try {
          const taskId = subtask.parentTaskId;
          const task = tasks.find((t) => t.id === taskId);

          if (task) {
            // Remover a subtarefa da lista de subtarefas
            const updatedSubtasks = task.subtasks.filter(
              (s) => s.id !== subtask.id
            );

            // Remover o elemento da UI imediatamente
            element.classList.add("fade-out");
            setTimeout(() => {
              if (element.parentNode) {
                element.parentNode.removeChild(element);
              }
            }, 300);

            // Atualizar a tarefa no Firestore
            try {
              await updateTask(taskId, { subtasks: updatedSubtasks });

              // Recarregar tarefas e rerenderizar
              await loadTasks();
              renderTasks();

              // Mostrar mensagem de sucesso
              // showSaveIndicator('Subtarefa excluída com sucesso!', 'success');
            } catch (error) {
              console.error("Erro ao excluir subtarefa:", error);
              // Não mostrar erro ao usuário, apenas registrar no console
              // showSaveIndicator('Erro ao excluir subtarefa. Por favor, tente novamente.', 'error');
            }
          }
        } catch (error) {
          console.error("Erro ao processar exclusão:", error);
          // Não mostrar mais este indicador
          // showSaveIndicator('Erro ao processar exclusão. Por favor, tente novamente.', 'error');
        }
      }
    );
  });

  return element;
}

// Função para remover subtarefas duplicadas, mantendo apenas a mais recente
function removeDuplicateSubtasks(subtasks) {
  const uniqueSubtasks = {};

  // Para cada subtarefa, armazenar apenas a última versão baseada no ID
  subtasks.forEach((subtask) => {
    uniqueSubtasks[subtask.id] = subtask;
  });

  // Converter o objeto de volta para array
  return Object.values(uniqueSubtasks);
}

// Configuração de event listeners
function setupEventListeners() {
  // Botão para adicionar nova tarefa
  addTaskBtn.addEventListener("click", openAddTaskModal);

  // Botões do modal
  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // Fechar modal com ESC ou clicando fora
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && taskModal.classList.contains("open")) {
      closeModal();
    }
  });

  // Clicar fora do modal para fechar
  taskModal.addEventListener("click", (e) => {
    // Verificar se o clique foi fora do conteúdo do modal
    if (e.target === taskModal) {
      closeModal();
    }
  });

  // Formulário de tarefa
  taskForm.addEventListener("submit", handleTaskFormSubmit);

  // Botão para adicionar subtarefa
  addSubtaskBtn.addEventListener("click", addNewSubtask);

  // Botão para alternar entre temas claro/escuro
  themeToggleBtn.addEventListener("click", toggleTheme);

  // Botão para acessar área administrativa
  const adminBtn = document.getElementById("admin-btn");
  if (adminBtn) {
    adminBtn.addEventListener("click", () => {
      window.location.href = "admin.html";
    });
  }

  // Botão para visualizar subtarefas
  viewSubtasksBtn.addEventListener("click", () => {
    // Flag para rastrear se estamos em processo de abertura ou fechamento
    subtasksView.dataset.isClosing = "false";

    // Limpar os filtros e o container antes de abrir
    document.getElementById("parent-task-filter").value = "";
    document.getElementById("subtask-title-filter").value = "";
    document.getElementById("subtask-description-filter").value = "";
    document.getElementById("status-filter").value = "";
    document.getElementById("comm-type-filter").value = "";
    allSubtasksContainer.innerHTML = "";

    // Esconder a lista de tarefas
    const tasksContainer = document.getElementById("tasks-list");
    tasksContainer.classList.add("hidden");

    // Remover a classe hidden e depois animar
    subtasksView.classList.remove("hidden");

    // Parar qualquer animação existente
    subtasksView.style.animation = "none";

    // Forçar reflow para resetar a animação
    subtasksView.offsetHeight;

    // Adicionar animação de entrada
    subtasksView.style.animation = "fadeIn 0.3s ease forwards";

    // Renderizar subtarefas depois que a animação começar
    setTimeout(() => {
      if (subtasksView.dataset.isClosing === "false") {
        renderAllSubtasks();
      }
    }, 50);
  });

  // Botão para fechar visualização de subtarefas
  closeSubtasksViewBtn.addEventListener("click", () => {
    // Marcar que estamos no processo de fechamento
    subtasksView.dataset.isClosing = "true";

    // Adicionar animação de saída
    subtasksView.style.animation = "fadeOut 0.3s ease forwards";

    // Esperar a animação terminar antes de esconder completamente
    setTimeout(() => {
      // Adicionar classe hidden
      subtasksView.classList.add("hidden");

      // Mostrar novamente a lista de tarefas
      const tasksContainer = document.getElementById("tasks-list");
      tasksContainer.classList.remove("hidden");

      // Limpar tudo
      document.getElementById("parent-task-filter").value = "";
      document.getElementById("subtask-title-filter").value = "";
      document.getElementById("subtask-description-filter").value = "";
      document.getElementById("status-filter").value = "";
      document.getElementById("comm-type-filter").value = "";
      allSubtasksContainer.innerHTML = "";

      // Remover a animação
      subtasksView.style.animation = "none";
    }, 300);
  });

  // Filtros de subtarefas
  const filterInputs = document.querySelectorAll(
    "#subtask-title-filter, #subtask-description-filter"
  );
  const filterSelects = document.querySelectorAll(
    "#parent-task-filter, #status-filter, #comm-type-filter"
  );

  filterInputs.forEach((input) => {
    input.addEventListener(
      "input",
      debounce(() => {
        if (
          !subtasksView.classList.contains("hidden") &&
          !subtasksView.style.animation.includes("fadeOut")
        ) {
          renderAllSubtasks();
        }
      }, 300)
    );
  });

  filterSelects.forEach((select) => {
    select.addEventListener("change", () => {
      if (
        !subtasksView.classList.contains("hidden") &&
        !subtasksView.style.animation.includes("fadeOut")
      ) {
        renderAllSubtasks();
      }
    });
  });

  // Filtro de tarefas
  const taskFilter = document.getElementById("task-filter");
  if (taskFilter) {
    taskFilter.addEventListener(
      "input",
      debounce(() => {
        renderTasks();
      }, 300)
    );
  }

  // Botão de logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await firebase.auth().signOut();
        window.location.href = "index.html";
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
      }
    });
  }
}

// Função para alternar entre temas claro/escuro
function toggleTheme() {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme();
  localStorage.setItem("theme", currentTheme);
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);

  // Atualizar ícone do botão de tema
  const themeIcon = themeToggleBtn.querySelector(".material-symbols-outlined");
  if (themeIcon) {
    themeIcon.textContent =
      currentTheme === "dark" ? "light_mode" : "dark_mode";
  }
}

// Manipulação do formulário de tarefa
function handleTaskFormSubmit(e) {
  e.preventDefault();

  // Validar campos obrigatórios
  if (!taskTitleInput.value.trim()) {
    alert("Por favor, preencha o título da tarefa.");
    taskTitleInput.focus();
    return;
  }

  // Validar que a data de término não seja anterior à data de início
  if (taskStartDateInput.value && taskEndDateInput.value) {
    const startDate = new Date(taskStartDateInput.value);
    const endDate = new Date(taskEndDateInput.value);

    if (endDate < startDate) {
      alert("A data de término não pode ser anterior à data de início.");
      taskEndDateInput.focus();
      return;
    }
  }

  // Mostrar indicador de loading no botão de salvar
  const submitBtn = taskForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined loading-spin">sync</span> Salvando...';
  submitBtn.disabled = true;

  // Coletar dados do formulário
  const taskData = {
    title: taskTitleInput.value.trim(),
    description: taskDescriptionInput.value.trim(),
    responsible: taskResponsibleInput.value.trim(),
    startDate: taskStartDateInput.value,
    endDate: taskEndDateInput.value,
    status:
      document.getElementById("task-status").value === "true"
        ? "completed"
        : document.getElementById("task-status").value === "partial"
        ? "partial"
        : "in-progress",
    completed: document.getElementById("task-status").value === "true",
    subtasks: getSubtasksFromModal(),
  };

  // Verificar se é uma edição ou nova tarefa
  const taskId = taskIdInput.value;

  const saveTask = async () => {
    try {
      if (taskId) {
        // Editar tarefa existente
        await updateTask(taskId, taskData);
      } else {
        // Adicionar nova tarefa
        await addTask(taskData);
      }
      // Fechar o modal
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
      alert("Erro ao salvar tarefa: " + error.message);
      // Restaurar botão em caso de erro
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  };

  saveTask();
}

// Função de debounce para otimizar eventos de input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Função para salvar alterações em subtarefas
async function saveSubtaskChanges(taskId, updatedSubtasks) {
  try {
    // Encontrar a tarefa no array local
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) return;

    // Backup das subtarefas antigas para caso de erro
    const oldSubtasks = [...tasks[taskIndex].subtasks];

    // Remover possíveis duplicatas antes de atualizar
    const uniqueSubtasks = removeDuplicateSubtasks(updatedSubtasks);

    // Atualizar subtarefas localmente
    tasks[taskIndex].subtasks = uniqueSubtasks;

    try {
      // Atualizar no Firestore
      await db.collection("tasks").doc(taskId).update({
        subtasks: uniqueSubtasks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Subtarefas atualizadas com sucesso");

      // Recarregar tarefas para garantir que todas as listas estejam atualizadas
      // Comentando a linha abaixo para evitar que os dados sejam recarregados e possivelmente causem duplicações
      // await loadTasks();

      // Atualizar UI
      renderTasks();

      // Se a visualização de subtarefas estiver aberta, atualizar tudo
      if (!subtasksView.classList.contains("hidden")) {
        allSubtasksContainer.innerHTML = "";
        renderAllSubtasks();
      }

      return true;
    } catch (error) {
      console.error("Erro ao salvar alterações nas subtarefas:", error);

      // Reverter alterações locais em caso de erro
      tasks[taskIndex].subtasks = oldSubtasks;
      throw error;
    }
  } catch (error) {
    console.error("Erro ao processar subtarefas:", error);
    throw error;
  }
}
