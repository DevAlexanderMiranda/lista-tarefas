// Elementos DOM
const usersList = document.getElementById("users-list");
const addUserBtn = document.getElementById("add-user-btn");
const userModal = document.getElementById("user-modal");
const modalTitle = document.getElementById("modal-title");
const closeModalBtn = document.getElementById("close-modal");
const cancelBtn = document.getElementById("cancel-btn");
const userForm = document.getElementById("user-form");
const userIdInput = document.getElementById("user-id");
const userNameInput = document.getElementById("user-name");
const userEmailInput = document.getElementById("user-email");
const userPasswordInput = document.getElementById("user-password");
const userRoleInput = document.getElementById("user-role");
const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmOkBtn = document.getElementById("confirm-ok");
const confirmCancelBtn = document.getElementById("confirm-cancel");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const logoutBtn = document.getElementById("logout-btn");
const userNameDisplay = document.getElementById("user-name-display");

// Variáveis DOM para o modal de senha do administrador
const adminPasswordModal = document.getElementById("admin-password-modal");
const adminPasswordInput = document.getElementById("admin-password-input");
const adminPasswordConfirm = document.getElementById("admin-password-confirm");
const adminPasswordCancel = document.getElementById("admin-password-cancel");

// Variáveis globais
let users = [];
let editingUser = null;
let currentTheme = localStorage.getItem("theme") || "light";

// Elementos DOM para a notificação de sucesso
const successNotification = document.getElementById("success-notification");
const successMessage = document.getElementById("success-message");

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // Verificar se o usuário é administrador
    if (user.role !== "admin") {
      alert("Você não tem permissão para acessar esta página.");
      window.location.href = "dashboard.html";
      return;
    }

    // Armazenar o email do admin para reutilização
    localStorage.setItem("adminEmail", user.email);

    // Mostrar nome do usuário
    if (userNameDisplay) {
      userNameDisplay.textContent = user.name;
    }

    // Carregar usuários do Firestore
    await loadUsers();

    // Configurar event listeners
    setupEventListeners();

    // Aplicar tema
    applyTheme();

    // Iniciar verificação periódica de autenticação
    startAuthCheck();
  } catch (error) {
    console.error("Erro ao inicializar página de administração:", error);
    alert(
      "Erro ao carregar dados. Por favor, recarregue a página ou entre em contato com o suporte."
    );
  }
});

// Função para carregar usuários
async function loadUsers() {
  try {
    // Carregar usuários do Firestore
    users = await loadAllUsers();
    renderUsers();
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    alert("Erro ao carregar usuários. Por favor, tente novamente.");
  }
}

// Função para salvar usuários
// Não é mais necessária pois usamos funções específicas para cada operação

// Função para mostrar notificação de sucesso
function showSuccess(message, duration = 4000) {
  if (!successNotification || !successMessage) {
    console.error("Elementos de notificação de sucesso não encontrados");
    return;
  }

  // Definir a mensagem
  successMessage.textContent = message;

  // Mostrar a notificação
  successNotification.classList.add("show");

  // Esconder após o tempo determinado
  setTimeout(() => {
    successNotification.classList.remove("show");
  }, duration);
}

// Função para adicionar um usuário
async function addUser(user) {
  try {
    // Log para depuração
    console.log("Tentando criar usuário com dados:", user);

    // Validar dados antes de prosseguir
    if (!user.name) {
      console.error("Nome do usuário não fornecido");
      throw new Error("O nome do usuário é obrigatório");
    }

    if (typeof user.name !== "string") {
      console.error("Nome do usuário não é uma string:", typeof user.name);
      throw new Error("O nome do usuário deve ser uma string");
    }

    if (!user.name.trim()) {
      console.error("Nome do usuário está vazio ou só contém espaços");
      throw new Error("O nome do usuário não pode estar vazio");
    }

    if (!user.email || !user.email.trim()) {
      throw new Error("O email do usuário é obrigatório");
    }

    if (!user.password || !user.password.trim()) {
      throw new Error("A senha do usuário é obrigatória");
    }

    // Mostrar indicador de loading
    const submitBtn = userForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<span class="material-symbols-outlined loading-spin">sync</span> Salvando...';
    submitBtn.disabled = true;

    // Armazenar os dados de usuário para uso após a confirmação da senha
    const pendingUserData = user;

    // Verificar se já temos email do admin armazenado e confirmar
    const adminEmail = localStorage.getItem("adminEmail");
    if (!adminEmail) {
      // Se não temos o email do admin, obter novamente o usuário atual
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.email) {
        localStorage.setItem("adminEmail", currentUser.email);
        console.log("Email do admin atualizado:", currentUser.email);
      }
    }

    // Mostrar o modal de senha de administrador
    showAdminPasswordModal(
      async (adminPassword) => {
        // Esta função será chamada quando o usuário confirmar a senha
        try {
          // Armazenar temporariamente a senha (será removida após a criação do usuário)
          sessionStorage.setItem("adminPassword", adminPassword);

          // Criar usuário no Firebase usando a função do auth.js
          const newUser = await createUser({
            name: pendingUserData.name.trim(),
            email: pendingUserData.email.trim(),
            password: pendingUserData.password,
            role: pendingUserData.role || "reader",
          });

          // Verificar novamente se ainda estamos como admin
          const currentUser = await getCurrentUser();
          if (!currentUser || currentUser.role !== "admin") {
            console.error(
              "Não estamos mais logados como admin após criar usuário"
            );
            // Tentar reautenticar mais uma vez
            try {
              await auth.signInWithEmailAndPassword(
                localStorage.getItem("adminEmail"),
                sessionStorage.getItem("adminPassword")
              );
              console.log("Reautenticação secundária concluída");
            } catch (reAuthError) {
              console.error("Falha na reautenticação secundária:", reAuthError);
              alert(
                "Você foi desconectado. Por favor, faça login novamente como administrador."
              );
              window.location.href = "index.html";
              return;
            }
          }

          // Limpar a senha da sessão após a criação
          sessionStorage.removeItem("adminPassword");

          // Adicionar na lista local para atualizar a UI
          users.push(newUser);

          // Mostrar mensagem de sucesso
          showSuccess(`Usuário "${newUser.name}" criado com sucesso!`);

          // Renderizar usuários
          renderUsers();

          // Restaurar botão
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
        } catch (error) {
          console.error("Erro ao criar usuário:", error);
          alert(`Erro ao criar usuário: ${error.message}`);

          // Limpar a senha da sessão em caso de erro
          sessionStorage.removeItem("adminPassword");

          // Restaurar botão em caso de erro
          submitBtn.innerHTML = "Salvar";
          submitBtn.disabled = false;
        }
      },
      () => {
        // Função chamada se o usuário cancelar

        // Restaurar botão
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    alert(`Erro ao criar usuário: ${error.message}`);

    // Restaurar botão em caso de erro
    const submitBtn = userForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = "Salvar";
      submitBtn.disabled = false;
    }
  }
}

// Função para mostrar o modal de senha do administrador
function showAdminPasswordModal(onConfirm, onCancel) {
  // Limpar campo de senha
  adminPasswordInput.value = "";

  // Mostrar modal
  adminPasswordModal.classList.add("open");

  // Foco no campo de senha
  setTimeout(() => adminPasswordInput.focus(), 100);

  // Função para confirmar
  const confirmHandler = () => {
    // Obter a senha
    const password = adminPasswordInput.value;

    if (!password || !password.trim()) {
      alert("Por favor, digite sua senha de administrador.");
      return;
    }

    // Adicionar animação de fechamento
    const modalContent = adminPasswordModal.querySelector(
      ".confirm-modal-content"
    );
    modalContent.style.animation = "fadeOut 0.2s ease forwards";
    adminPasswordModal.style.animation = "fadeOut 0.3s ease forwards";

    setTimeout(() => {
      // Fechar modal
      adminPasswordModal.classList.remove("open");
      modalContent.style.animation = "";
      adminPasswordModal.style.animation = "";

      // Limpar event listeners
      cleanup();

      // Chamar callback com a senha
      onConfirm(password);
    }, 250);
  };

  // Função para cancelar
  const cancelHandler = () => {
    // Adicionar animação de fechamento
    const modalContent = adminPasswordModal.querySelector(
      ".confirm-modal-content"
    );
    modalContent.style.animation = "fadeOut 0.2s ease forwards";
    adminPasswordModal.style.animation = "fadeOut 0.3s ease forwards";

    setTimeout(() => {
      // Fechar modal
      adminPasswordModal.classList.remove("open");
      modalContent.style.animation = "";
      adminPasswordModal.style.animation = "";

      // Limpar event listeners
      cleanup();

      // Chamar callback de cancelamento
      if (onCancel) onCancel();
    }, 250);
  };

  // Função para limpar event listeners
  const cleanup = () => {
    adminPasswordConfirm.removeEventListener("click", confirmHandler);
    adminPasswordCancel.removeEventListener("click", cancelHandler);
    adminPasswordInput.removeEventListener("keydown", keyHandler);
  };

  // Handler para tecla Enter
  const keyHandler = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmHandler();
    }
  };

  // Adicionar event listeners
  adminPasswordConfirm.addEventListener("click", confirmHandler);
  adminPasswordCancel.addEventListener("click", cancelHandler);
  adminPasswordInput.addEventListener("keydown", keyHandler);
}

// Função para atualizar um usuário
async function updateUserData(userId, updatedUser) {
  try {
    // Mostrar indicador de loading
    const submitBtn = userForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<span class="material-symbols-outlined loading-spin">sync</span> Salvando...';
    submitBtn.disabled = true;

    // Atualizar usuário no Firebase usando a função do auth.js
    await updateUser(userId, {
      name: updatedUser.name,
      email: updatedUser.email,
      password: updatedUser.password,
      role: updatedUser.role,
    });

    // Atualizar na lista local
    const index = users.findIndex((user) => user.id === userId);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      };
    }

    // Mostrar mensagem de sucesso
    showSuccess(`Usuário "${updatedUser.name}" atualizado com sucesso!`);

    // Renderizar usuários
    renderUsers();

    // Restaurar botão
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    alert(`Erro ao atualizar usuário: ${error.message}`);

    // Restaurar botão em caso de erro
    const submitBtn = userForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = "Salvar";
      submitBtn.disabled = false;
    }
  }
}

// Função para excluir um usuário
async function deleteUserData(userId) {
  try {
    // Encontrar o usuário para mostrar o nome na mensagem de sucesso
    const userToDelete = users.find((user) => user.id === userId);
    const userName = userToDelete ? userToDelete.name : "Usuário";

    // Mostrar loading no botão ou no card
    const deleteBtn = document.querySelector(
      `.user-card .delete[data-id="${userId}"]`
    );
    if (deleteBtn) {
      const originalContent = deleteBtn.innerHTML;
      deleteBtn.innerHTML =
        '<span class="material-symbols-outlined loading-spin">sync</span>';
      deleteBtn.disabled = true;
    }

    // Excluir usuário no Firebase usando a função do auth.js
    await deleteUser(userId);

    // Remover da lista local
    users = users.filter((user) => user.id !== userId);

    // Renderizar usuários
    renderUsers();

    // Mostrar mensagem de sucesso
    showSuccess(`Usuário "${userName}" excluído com sucesso!`);
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    alert(`Erro ao excluir usuário: ${error.message}`);

    // Restaurar botão em caso de erro
    const deleteBtn = document.querySelector(
      `.user-card .delete[data-id="${userId}"]`
    );
    if (deleteBtn) {
      deleteBtn.innerHTML =
        '<span class="material-symbols-outlined">delete</span>';
      deleteBtn.disabled = false;
    }
  }
}

// Função para renderizar usuários
function renderUsers() {
  usersList.innerHTML = "";

  if (users.length === 0) {
    usersList.innerHTML = `
            <div class="empty-state">
                <p>Nenhum usuário encontrado.</p>
                <p>Clique em "Novo Usuário" para adicionar.</p>
            </div>
        `;
    return;
  }

  users.forEach((user) => {
    const userElement = createUserElement(user);
    usersList.appendChild(userElement);
  });
}

// Função para criar elemento de usuário
function createUserElement(user) {
  const userCard = document.createElement("div");
  userCard.className = "user-card";

  // Traduzir role para português
  let roleText;
  switch (user.role) {
    case "admin":
      roleText = "Administrador";
      break;
    case "editor":
      roleText = "Editor";
      break;
    case "reader":
      roleText = "Leitor";
      break;
    default:
      roleText = user.role;
  }

  userCard.innerHTML = `
        <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-email">${user.email}</div>
            <span class="user-role ${user.role}">${roleText}</span>
        </div>
        <div class="user-actions">
            <button class="task-action-btn edit" title="Editar">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="task-action-btn delete" title="Excluir">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;

  // Adicionar event listeners
  const editBtn = userCard.querySelector(".edit");
  const deleteBtn = userCard.querySelector(".delete");

  editBtn.addEventListener("click", () => openEditUserModal(user));
  deleteBtn.addEventListener("click", () => {
    showConfirmModal(
      `Tem certeza que deseja excluir o usuário "${user.name}"?`,
      () => {
        deleteUserData(user.id);
      }
    );
  });

  return userCard;
}

// Manipulação do modal
function openAddUserModal() {
  modalTitle.textContent = "Novo Usuário";
  userForm.reset();

  // Usar document.getElementById para garantir que estamos acessando os elementos corretos
  const idInput = document.getElementById("user-id");
  if (idInput) idInput.value = "";

  editingUser = null;
  userModal.classList.add("open");

  // Adicionar botão para mostrar/ocultar senha
  addPasswordToggle();
}

function openEditUserModal(user) {
  modalTitle.textContent = "Editar Usuário";

  // Usar document.getElementById para garantir que estamos acessando os elementos corretos
  const idInput = document.getElementById("user-id");
  const nameInput = document.getElementById("user-name");
  const emailInput = document.getElementById("user-email");
  const passwordInput = document.getElementById("user-password");
  const roleInput = document.getElementById("user-role");

  if (idInput) idInput.value = user.id;
  if (nameInput) nameInput.value = user.name;
  if (emailInput) emailInput.value = user.email;
  if (passwordInput) passwordInput.value = ""; // Não exibimos a senha atual
  if (roleInput) roleInput.value = user.role;

  editingUser = user;
  userModal.classList.add("open");

  // Adicionar botão para mostrar/ocultar senha
  addPasswordToggle();
}

function closeModal() {
  const modalContent = userModal.querySelector(".modal-content");

  modalContent.style.animation = "none";
  modalContent.offsetHeight; // Forçar reflow
  modalContent.style.animation = "fadeOut 0.3s ease forwards";

  userModal.style.animation = "fadeOut 0.3s ease forwards";

  setTimeout(() => {
    userModal.classList.remove("open");
    modalContent.style.animation = "";
    userModal.style.animation = "";

    // Remover o botão de toggle de senha
    const passwordToggle = document.querySelector(".password-toggle");
    if (passwordToggle) {
      passwordToggle.remove();
    }
  }, 300);
}

// Adicionar botão para mostrar/ocultar senha
function addPasswordToggle() {
  // Remover botão existente, se houver
  const existingToggle = document.querySelector(".password-toggle");
  if (existingToggle) {
    existingToggle.remove();
  }

  const passwordField = document.getElementById("user-password");
  const parentElement = passwordField.parentElement;

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "password-toggle";
  toggleButton.innerHTML =
    '<span class="material-symbols-outlined">visibility</span>';

  toggleButton.addEventListener("click", () => {
    if (passwordField.type === "password") {
      passwordField.type = "text";
      toggleButton.innerHTML =
        '<span class="material-symbols-outlined">visibility_off</span>';
    } else {
      passwordField.type = "password";
      toggleButton.innerHTML =
        '<span class="material-symbols-outlined">visibility</span>';
    }
  });

  parentElement.appendChild(toggleButton);
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

// Event listeners
function setupEventListeners() {
  // Botões do modal
  addUserBtn.addEventListener("click", openAddUserModal);
  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // Botão de voltar para o dashboard
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // Limpar intervalo de verificação antes de navegar
      if (window.adminAuthCheckInterval) {
        clearInterval(window.adminAuthCheckInterval);
      }
      window.location.href = "dashboard.html";
    });
  }

  // Botão de logout
  logoutBtn.addEventListener("click", () => {
    showConfirmModal("Tem certeza que deseja sair?", () => {
      // Limpar intervalo de verificação antes de fazer logout
      if (window.adminAuthCheckInterval) {
        clearInterval(window.adminAuthCheckInterval);
      }
      logout();
    });
  });

  // Limpar intervalo ao fechar a página
  window.addEventListener("beforeunload", () => {
    if (window.adminAuthCheckInterval) {
      clearInterval(window.adminAuthCheckInterval);
    }
  });

  // Form submit
  userForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Verificar se todos os campos obrigatórios estão preenchidos
    const requiredFields = userForm.querySelectorAll("[required]");
    let allValid = true;

    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        allValid = false;
        field.classList.add("invalid");
      } else {
        field.classList.remove("invalid");
      }
    });

    if (!allValid) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Obter o ID diretamente do formulário
    const userId = document.getElementById("user-id").value;

    // Obter os valores diretamente dos campos no momento do envio
    // para evitar problemas com referências
    const formNameInput = document.getElementById("user-name");
    const formEmailInput = document.getElementById("user-email");
    const formPasswordInput = document.getElementById("user-password");
    const formRoleInput = document.getElementById("user-role");

    // Verificar se todos os campos foram encontrados
    if (
      !formNameInput ||
      !formEmailInput ||
      !formPasswordInput ||
      !formRoleInput
    ) {
      console.error("Alguns campos do formulário não foram encontrados:", {
        name: !!formNameInput,
        email: !!formEmailInput,
        password: !!formPasswordInput,
        role: !!formRoleInput,
      });
      alert(
        "Erro ao ler os dados do formulário. Por favor, recarregue a página."
      );
      return;
    }

    // Verificar os valores para depuração
    console.log("Valores do formulário:", {
      name: formNameInput.value,
      email: formEmailInput.value,
      password: formPasswordInput.value,
      role: formRoleInput.value,
    });

    const user = {
      name: formNameInput.value,
      email: formEmailInput.value,
      password: formPasswordInput.value,
      role: formRoleInput.value,
    };

    if (userId) {
      updateUserData(userId, user);
    } else {
      addUser(user);
    }

    closeModal();
  });

  // Botão para alternar entre temas claro/escuro
  themeToggleBtn.addEventListener("click", toggleTheme);

  // Fechar modal com Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (userModal.classList.contains("open")) {
        closeModal();
      }
      if (confirmModal.classList.contains("open")) {
        confirmCancelBtn.click();
      }
    }
  });
}

// Verificação periódica de autenticação
function startAuthCheck() {
  // Verificar a cada 30 segundos se ainda estamos logados como admin
  const authCheckInterval = setInterval(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error("Usuário não está mais autenticado");
        clearInterval(authCheckInterval);
        alert("Sua sessão expirou. Por favor, faça login novamente.");
        window.location.href = "index.html";
        return;
      }

      if (user.role !== "admin") {
        console.error("Usuário não é mais administrador");
        clearInterval(authCheckInterval);
        alert(
          "Você não tem mais permissão de administrador. Redirecionando para o dashboard."
        );
        window.location.href = "dashboard.html";
        return;
      }

      // Tudo OK, usuário ainda é admin
    } catch (error) {
      console.error("Erro ao verificar autenticação periódica:", error);
    }
  }, 30000); // 30 segundos

  // Armazenar o interval para limpar se necessário
  window.adminAuthCheckInterval = authCheckInterval;
}
