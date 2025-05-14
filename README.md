# Sistema de Tarefas

Um aplicativo de gerenciamento de tarefas com autenticação e controle de acesso baseado em funções (RBAC) usando Firebase.

## Funcionalidades

- Autenticação de usuários com Firebase Authentication
- Controle de acesso baseado em funções (admin, editor, reader)
- Gerenciamento de tarefas e subtarefas
- Armazenamento de dados no Firebase Firestore
- Tema claro/escuro
- Interface responsiva

## Configuração do Firebase

Para usar este aplicativo, você precisa configurar o Firebase:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative a autenticação por email/senha em Authentication > Sign-in method
3. Crie um banco de dados Firestore em Database > Create database
4. Obtenha as credenciais do seu projeto em Project settings > General > Your apps > Web app
5. Atualize o arquivo `js/firebase-config.js` com suas credenciais:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

## Configuração inicial

1. Clone este repositório
2. Configure o Firebase conforme instruções acima
3. Abra o arquivo `login.html` em seu navegador
4. Para o primeiro acesso, você precisará criar um usuário administrador:
   - Use o Firebase Console para adicionar um usuário em Authentication
   - Crie um documento na coleção `users` com o ID igual ao UID do usuário criado
   - Adicione os campos: `name`, `role` (com valor "admin")

## Estrutura de funções (RBAC)

O sistema suporta três níveis de acesso:

- **Admin**: Acesso total ao sistema, incluindo gerenciamento de usuários
- **Editor**: Pode criar, editar e excluir tarefas
- **Reader**: Pode apenas visualizar tarefas (não pode criar, editar ou excluir)

## Estrutura do projeto

- `index.html`: Página principal do aplicativo
- `login.html`: Página de login
- `admin.html`: Página de administração (apenas para admins)
- `js/app.js`: Lógica principal do aplicativo
- `js/auth.js`: Funções de autenticação e controle de acesso
- `js/login.js`: Lógica da página de login
- `js/admin.js`: Lógica da página de administração
- `js/firebase-config.js`: Configuração do Firebase
- `css/styles.css`: Estilos principais
- `css/login.css`: Estilos da página de login
- `css/admin.css`: Estilos da página de administração

## Uso

1. Faça login com suas credenciais
2. Na página principal, você pode:
   - Criar novas tarefas (se tiver permissão)
   - Visualizar tarefas existentes
   - Editar ou excluir tarefas (se tiver permissão)
   - Gerenciar subtarefas
   - Alternar entre tema claro/escuro
3. Administradores podem acessar a página de administração para gerenciar usuários 