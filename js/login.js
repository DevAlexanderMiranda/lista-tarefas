// Elementos DOM
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");
const passwordToggle = document.getElementById("password-toggle");
const loginBtn = loginForm.querySelector('button[type="submit"]');
const loginBtnText = loginBtn.querySelector(".login-btn-text");
const loginBtnLoader = loginBtn.querySelector(".login-btn-loader");

document.addEventListener("DOMContentLoaded", () => {
  // Verificar se estamos vindo de um logout (pela URL)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("logout")) {
    console.log("Sessão anterior encerrada.");
    // Garantir que o usuário está deslogado
    auth.signOut().catch((error) => {
      console.error("Erro ao finalizar sessão anterior:", error);
    });
  }

  // Configurar event listeners
  setupEventListeners();

  // Verificar se já está logado
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Se estamos na página de login mas já estamos logados,
      // pode ser porque o logout não foi completo
      // Verificar se estamos explicitamente vindo de um logout
      if (!urlParams.has("logout")) {
        console.log("Usuário ainda logado, redirecionando para dashboard...");
        showBtnLoading("Redirecionando...");
        window.location.href = "dashboard.html";
      } else {
        // Se temos um usuário mas estamos vindo de um logout
        // vamos fazer logout novamente para garantir
        auth.signOut().catch((error) => {
          console.error("Erro ao finalizar sessão após logout:", error);
        });
      }
    }
  });
});

function setupEventListeners() {
  // Formulário de login
  loginForm.addEventListener("submit", handleLogin);

  // Toggle de visualização da senha
  if (passwordToggle) {
    passwordToggle.addEventListener("click", togglePasswordVisibility);
  }
}

// Função para alternar visibilidade da senha
function togglePasswordVisibility() {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  // Alternar ícone
  const icon = passwordToggle.querySelector(".material-symbols-outlined");
  if (icon) {
    icon.textContent = type === "password" ? "visibility" : "visibility_off";
  }
}

// Função para mostrar loader no botão
function showBtnLoading(message = "Autenticando...") {
  loginBtn.disabled = true;
  loginBtnText.style.display = "none";
  loginBtnLoader.style.display = "flex";

  const loaderText = loginBtnLoader.querySelector("span:last-child");
  if (loaderText && message) {
    loaderText.textContent = message;
  }
}

// Função para esconder loader no botão
function hideBtnLoading() {
  loginBtn.disabled = false;
  loginBtnText.style.display = "block";
  loginBtnLoader.style.display = "none";
}

// Função para redirecionar para o dashboard
function redirectToDashboard() {
  setTimeout(() => {
    window.location.href = "dashboard.html?login=" + new Date().getTime();
  }, 1500);
}

// Função para lidar com o login
async function handleLogin(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Limpar mensagem de erro anterior
  loginError.textContent = "";

  // Validação básica
  if (!email || !password) {
    showError("Por favor, preencha todos os campos.");
    return;
  }

  // Mostrar mensagem de processamento e loader
  showBtnLoading();

  try {
    // Usar a função login do auth.js em vez de duplicar a lógica
    const user = await login(email, password);

    if (user) {
      // Login bem-sucedido
      showSuccess("Login bem-sucedido! Redirecionando...");

      // Manter o loader de carregamento e redirecionar
      showBtnLoading("Redirecionando...");

      // Redirecionar para o dashboard
      redirectToDashboard();
    } else {
      throw new Error("Falha na autenticação");
    }
  } catch (error) {
    console.error("Erro de login:", error);

    // Esconder loader do botão
    hideBtnLoading();

    // Tratar diferentes tipos de erro
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      showError("Email ou senha incorretos.");
    } else if (error.code === "auth/too-many-requests") {
      showError("Muitas tentativas de login. Tente novamente mais tarde.");
    } else {
      showError("Erro ao fazer login. Tente novamente.");
    }
  }
}

// Função para mostrar mensagem de erro
function showError(message) {
  loginError.textContent = message;
  loginError.style.color = "var(--danger-color)";
  loginError.style.animation = "none";
  loginError.offsetHeight; // Forçar reflow
  loginError.style.animation = "fadeIn 0.3s ease";
}

// Função para mostrar mensagem de sucesso
function showSuccess(message) {
  loginError.textContent = message;
  loginError.style.color = "var(--success-color)";
  loginError.style.animation = "none";
  loginError.offsetHeight; // Forçar reflow
  loginError.style.animation = "fadeIn 0.3s ease";
}
