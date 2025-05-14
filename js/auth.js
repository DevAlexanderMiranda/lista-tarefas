// Funções de autenticação e controle de acesso com Firebase

// Verificar se o usuário está autenticado
function checkAuth() {
  return new Promise((resolve, reject) => {
    // Verificar autenticação usando Firebase
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Buscar informações adicionais do usuário no Firestore
        db.collection("users")
          .doc(user.uid)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const userData = doc.data();
              // Combinar dados do auth com dados do Firestore
              const userInfo = {
                id: user.uid,
                email: user.email,
                name: userData.name || user.displayName || user.email,
                role: userData.role || "reader", // Default para leitor se não existir
              };
              resolve(userInfo);
            } else {
              console.warn(
                "Usuário autenticado mas sem dados no Firestore - Criando documento automático"
              );
              // Criar um documento para o usuário no Firestore automaticamente
              const userData = {
                name: user.displayName || user.email,
                email: user.email,
                role: "reader", // Default para leitor
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              };

              // Salvar dados no Firestore
              db.collection("users")
                .doc(user.uid)
                .set(userData)
                .then(() => {
                  console.log("Documento de usuário criado com sucesso");
                  resolve({
                    id: user.uid,
                    email: user.email,
                    name: userData.name,
                    role: userData.role,
                  });
                })
                .catch((error) => {
                  console.error("Erro ao criar documento de usuário:", error);
                  resolve({
                    id: user.uid,
                    email: user.email,
                    name: user.displayName || user.email,
                    role: "reader",
                  });
                });
            }
          })
          .catch((error) => {
            console.error("Erro ao buscar dados do usuário:", error);
            reject(error);
          });
      } else {
        // Redirecionar para a página de login se não estiver autenticado
        window.location.href = "index.html";
        resolve(null);
      }
    });
  });
}

// Verificar se o usuário tem permissão para acessar a página
async function checkPermission(requiredRole) {
  try {
    const user = await checkAuth();
    if (!user) return false;

    // Verificar se o usuário tem a role necessária
    if (requiredRole === "admin" && user.role !== "admin") {
      alert("Você não tem permissão para acessar esta página.");
      window.location.href = "dashboard.html";
      return false;
    }

    if (
      requiredRole === "editor" &&
      user.role !== "admin" &&
      user.role !== "editor"
    ) {
      alert("Você não tem permissão para editar.");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return false;
  }
}

// Fazer login
async function login(email, password) {
  try {
    // Autenticar usando Firebase
    const userCredential = await auth.signInWithEmailAndPassword(
      email,
      password
    );
    const user = userCredential.user;

    // Buscar informações adicionais do usuário no Firestore
    const doc = await db.collection("users").doc(user.uid).get();

    if (doc.exists) {
      const userData = doc.data();
      // Combinar dados do auth com dados do Firestore
      return {
        id: user.uid,
        email: user.email,
        name: userData.name || user.displayName || user.email,
        role: userData.role || "reader",
      };
    } else {
      console.warn(
        "Usuário autenticado mas sem dados no Firestore - Criando documento automático"
      );
      // Criar um documento para o usuário no Firestore automaticamente
      const userData = {
        name: user.displayName || user.email,
        email: user.email,
        role: "reader", // Default para leitor
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Salvar dados no Firestore
      try {
        await db.collection("users").doc(user.uid).set(userData);
        console.log("Documento de usuário criado com sucesso durante login");

        return {
          id: user.uid,
          email: user.email,
          name: userData.name,
          role: userData.role,
        };
      } catch (docError) {
        console.error(
          "Erro ao criar documento de usuário durante login:",
          docError
        );
        return {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email,
          role: "reader", // Default para leitor
        };
      }
    }
  } catch (error) {
    console.error("Erro no login:", error);
    return null;
  }
}

// Fazer logout
async function logout() {
  try {
    // Obter o usuário atual para log
    const currentUser = await getCurrentUser();
    console.log(
      "Fazendo logout do usuário:",
      currentUser ? currentUser.email : "desconhecido"
    );

    // Limpar qualquer dado de sessão armazenado localmente
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    localStorage.removeItem("adminEmail");
    sessionStorage.removeItem("adminPassword");

    // Outras limpezas possíveis
    localStorage.removeItem("theme");
    localStorage.removeItem("lastView");
    sessionStorage.clear(); // Limpar tudo da sessão

    // Desconectar do Firebase Auth
    await auth.signOut();
    console.log("Logout realizado com sucesso");

    // Adicionar um pequeno atraso antes de redirecionar para garantir que o logout seja completado
    setTimeout(() => {
      // Força a página a recarregar completamente sem usar cache
      const logoutTimestamp = new Date().getTime();
      window.location.href = "index.html?logout=" + logoutTimestamp;
    }, 300);
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    alert("Erro ao fazer logout. Tente novamente.");

    // Mesmo com erro, tenta redirecionar para a página de login
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  }
}

// Obter usuário atual
async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Buscar informações adicionais do usuário no Firestore
        db.collection("users")
          .doc(user.uid)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const userData = doc.data();
              // Combinar dados do auth com dados do Firestore
              const userInfo = {
                id: user.uid,
                email: user.email,
                name: userData.name || user.displayName || user.email,
                role: userData.role || "reader",
              };
              resolve(userInfo);
            } else {
              resolve({
                id: user.uid,
                email: user.email,
                name: user.displayName || user.email,
                role: "reader",
              });
            }
          })
          .catch((error) => {
            console.error("Erro ao buscar dados do usuário:", error);
            reject(error);
          });
      } else {
        resolve(null);
      }
    });
  });
}

// Criar um novo usuário
async function createUser(userData) {
  try {
    // Validar dados de entrada
    if (!userData.name || typeof userData.name !== "string") {
      throw new Error("Nome de usuário inválido ou não fornecido");
    }
    if (!userData.email || typeof userData.email !== "string") {
      throw new Error("Email inválido ou não fornecido");
    }
    if (!userData.password || typeof userData.password !== "string") {
      throw new Error("Senha inválida ou não fornecida");
    }

    // Armazenar o usuário atual antes de criar o novo
    const currentUser = await getCurrentUser();
    console.log(
      "Usuário atual antes de criar:",
      currentUser ? currentUser.email : "nenhum"
    );

    // Armazenar credenciais do administrador para reautenticação posterior
    const adminEmail = localStorage.getItem("adminEmail");
    const adminPassword = sessionStorage.getItem("adminPassword");

    if (!adminEmail || !adminPassword) {
      console.error(
        "Credenciais de administrador não encontradas para reautenticação"
      );
    }

    // Armazenar o UID do admin para depois verificar se ele ainda está logado
    const adminUid = currentUser ? currentUser.id : null;

    // Criar usuário sem fazer logout do atual
    // Método alternativo que não causa logout automático
    try {
      // Primeiro criar o documento no Firestore com um ID personalizado
      const userRef = db.collection("users").doc();
      const newUserId = userRef.id;

      // Criar usuário no Firebase Auth usando o método tradicional
      const userCredential = await auth.createUserWithEmailAndPassword(
        userData.email,
        userData.password
      );
      const user = userCredential.user;

      // Verificar se ainda estamos logados como admin
      const currentLoggedUser = auth.currentUser;
      if (currentLoggedUser && currentLoggedUser.uid !== adminUid) {
        console.log(
          "Usuário foi alterado para o novo criado, fazendo reautenticação..."
        );

        // Se saímos do admin, reautenticar
        await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
        console.log("Reautenticação como admin concluída com sucesso");
      }

      // Dados a serem salvos no Firestore
      const userDataToSave = {
        name: userData.name.trim(),
        email: userData.email.trim(),
        role: userData.role || "reader",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Atualizar Firestore com o ID correto do usuário criado
      await db.collection("users").doc(user.uid).set(userDataToSave);

      // Limpar senha temporária da sessão
      sessionStorage.removeItem("adminPassword");

      return {
        id: user.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role || "reader",
      };
    } catch (innerError) {
      console.error(
        "Erro ao criar usuário com método alternativo:",
        innerError
      );
      throw innerError;
    }
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    throw error;
  }
}

// Atualizar um usuário existente
async function updateUser(userId, userData) {
  try {
    // Atualizar informações no Firestore
    await db.collection("users").doc(userId).update({
      name: userData.name,
      role: userData.role,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Se a senha foi fornecida, atualizar a senha
    if (userData.password && userData.password.trim() !== "") {
      // Isso requer reautenticação do usuário, o que é complexo
      // Em uma implementação real, você precisaria de uma solução mais robusta
      console.warn("Atualização de senha não implementada nesta versão");
    }

    return {
      id: userId,
      email: userData.email,
      name: userData.name,
      role: userData.role,
    };
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    throw error;
  }
}

// Excluir um usuário
async function deleteUser(userId) {
  try {
    // Excluir do Firestore primeiro
    await db.collection("users").doc(userId).delete();

    // Excluir do Firebase Auth (isso requer funções do lado do servidor)
    // Em uma implementação real, você precisaria usar Firebase Functions
    console.warn("Exclusão de usuário do Auth não implementada nesta versão");

    return true;
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    throw error;
  }
}

// Carregar todos os usuários
async function loadAllUsers() {
  try {
    const snapshot = await db.collection("users").get();
    const users = [];

    snapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        email: doc.data().email,
        name: doc.data().name,
        role: doc.data().role,
      });
    });

    return users;
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    throw error;
  }
}

// Verificar se o usuário é administrador
async function isAdmin() {
  try {
    const user = await getCurrentUser();
    return user && user.role === "admin";
  } catch (error) {
    console.error("Erro ao verificar se é admin:", error);
    return false;
  }
}

// Verificar se o usuário é editor ou administrador
async function canEdit() {
  try {
    const user = await getCurrentUser();
    return user && (user.role === "admin" || user.role === "editor");
  } catch (error) {
    console.error("Erro ao verificar permissões de edição:", error);
    return false;
  }
}
