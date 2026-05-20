use crate::domain::entities::{User, UserPublic};
use crate::domain::ports::UserRepository;
use crate::infrastructure::auth::{generate_token, hash_password, verify_password};
use std::sync::Arc;
use uuid::Uuid;

pub struct AuthService {
    user_repository: Arc<dyn UserRepository>,
}

impl AuthService {
    pub fn new(user_repository: Arc<dyn UserRepository>) -> Self {
        Self { user_repository }
    }

    fn generate_temp_password() -> String {
        let uid = Uuid::new_v4().simple().to_string();
        format!("Sia{}!", &uid[..8])
    }

    pub async fn register(
        &self,
        name: String,
        username: String,
        role: String,
    ) -> Result<(Uuid, String, String, String), String> {
        if let Ok(Some(_)) = self.user_repository.find_by_username(&username).await {
            return Err("Usuário já registrado".to_string());
        }

        let temp_password = Self::generate_temp_password();
        let hashed = hash_password(&temp_password)?;

        let user = User {
            id: Uuid::nil(),
            name,
            username,
            role,
            password_hash: hashed,
            must_change_password: true,
            created_at: String::new(),
        };

        let created = self.user_repository.create(user).await?;
        Ok((created.id, created.name, created.role, temp_password))
    }

    pub async fn register_admin(
        &self,
        name: String,
        username: String,
        password: String,
        role: String,
    ) -> Result<(Uuid, String, String, String), String> {
        if let Ok(Some(_)) = self.user_repository.find_by_username(&username).await {
            return Err("Usuário já registrado".to_string());
        }
        let hashed = hash_password(&password)?;
        let user = User {
            id: Uuid::nil(),
            name,
            username,
            role,
            password_hash: hashed,
            must_change_password: false,
            created_at: String::new(),
        };
        let created = self.user_repository.create(user).await?;
        let token = generate_token(&created.id.to_string(), &created.username, &created.role)?;
        Ok((created.id, token, created.name, created.role))
    }

    pub async fn login(
        &self,
        username: &str,
        password: &str,
    ) -> Result<(Uuid, String, String, String, String, bool), String> {
        let user = self
            .user_repository
            .find_by_username(username)
            .await?
            .ok_or_else(|| "Usuário não encontrado".to_string())?;

        if !verify_password(password, &user.password_hash)? {
            return Err("Senha incorreta".to_string());
        }

        let token = generate_token(&user.id.to_string(), &user.username, &user.role)?;
        Ok((
            user.id,
            token,
            user.name,
            user.role,
            user.username,
            user.must_change_password,
        ))
    }

    // valida senha atual antes de trocar; limpa must_change_password
    pub async fn change_password(
        &self,
        user_id: Uuid,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), String> {
        let user = self
            .user_repository
            .find_by_id(user_id)
            .await?
            .ok_or_else(|| "Usuário não encontrado".to_string())?;

        if !verify_password(current_password, &user.password_hash)? {
            return Err("Senha atual incorreta".to_string());
        }
        if new_password.len() < 6 {
            return Err("Nova senha deve ter pelo menos 6 caracteres".to_string());
        }

        let new_hash = hash_password(new_password)?;
        self.user_repository
            .update_password(user_id, &new_hash)
            .await?;
        self.user_repository
            .set_must_change_password(user_id, false)
            .await
    }

    // primeiro acesso: troca sem senha atual, só válida enquanto must_change_password = true
    pub async fn set_initial_password(
        &self,
        user_id: Uuid,
        new_password: &str,
    ) -> Result<(), String> {
        let user = self
            .user_repository
            .find_by_id(user_id)
            .await?
            .ok_or_else(|| "Usuário não encontrado".to_string())?;

        if !user.must_change_password {
            return Err("Operação não permitida".to_string());
        }
        if new_password.len() < 6 {
            return Err("Senha deve ter pelo menos 6 caracteres".to_string());
        }

        let new_hash = hash_password(new_password)?;
        self.user_repository
            .update_password(user_id, &new_hash)
            .await?;
        self.user_repository
            .set_must_change_password(user_id, false)
            .await
    }

    pub async fn list_users(&self) -> Result<Vec<UserPublic>, String> {
        self.user_repository.find_all_public().await
    }

    pub async fn update_name(&self, user_id: Uuid, name: String) -> Result<(), String> {
        if name.trim().is_empty() {
            return Err("Nome não pode ser vazio".to_string());
        }
        self.user_repository
            .update_name(user_id, name.trim().to_string())
            .await
    }

    pub async fn delete_user(&self, id: Uuid) -> Result<(), String> {
        self.user_repository.delete_user(id).await
    }

    pub async fn update_role(&self, id: Uuid, role: String) -> Result<(), String> {
        self.user_repository.update_role(id, role).await
    }

    // redefine senha de outro usuário e força troca no próximo login
    pub async fn admin_reset_password(
        &self,
        target_id: Uuid,
        new_password: &str,
    ) -> Result<(), String> {
        if new_password.len() < 6 {
            return Err("Senha deve ter pelo menos 6 caracteres".to_string());
        }
        let new_hash = hash_password(new_password)?;
        self.user_repository
            .update_password(target_id, &new_hash)
            .await?;
        self.user_repository
            .set_must_change_password(target_id, true)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::User;
    use crate::domain::ports::UserRepository;
    use async_trait::async_trait;
    use std::sync::Mutex;

    fn init_jwt() {
        // SAFETY: test-only, single-threaded setup before any async work starts.
        unsafe {
            std::env::set_var("JWT_SECRET", "test-secret-auth-use-case");
        }
    }

    struct MockUserRepo {
        users: Mutex<Vec<User>>,
    }
    impl MockUserRepo {
        fn new() -> Self {
            Self {
                users: Mutex::new(vec![]),
            }
        }
    }

    #[async_trait]
    impl UserRepository for MockUserRepo {
        async fn create(&self, mut user: User) -> Result<User, String> {
            user.id = Uuid::new_v4();
            user.created_at = "2024-01-01".to_string();
            self.users.lock().unwrap().push(user.clone());
            Ok(user)
        }
        async fn find_by_username(&self, username: &str) -> Result<Option<User>, String> {
            Ok(self
                .users
                .lock()
                .unwrap()
                .iter()
                .find(|u| u.username == username)
                .cloned())
        }
        async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, String> {
            Ok(self
                .users
                .lock()
                .unwrap()
                .iter()
                .find(|u| u.id == id)
                .cloned())
        }
        async fn find_all(&self) -> Result<Vec<User>, String> {
            Ok(self.users.lock().unwrap().clone())
        }
        async fn find_all_public(&self) -> Result<Vec<UserPublic>, String> {
            Ok(self
                .users
                .lock()
                .unwrap()
                .iter()
                .map(|u| UserPublic {
                    id: u.id,
                    name: u.name.clone(),
                    username: u.username.clone(),
                    role: u.role.clone(),
                    must_change_password: u.must_change_password,
                    created_at: u.created_at.clone(),
                })
                .collect())
        }
        async fn update_password(&self, id: Uuid, new_hash: &str) -> Result<(), String> {
            let mut users = self.users.lock().unwrap();
            match users.iter_mut().find(|u| u.id == id) {
                Some(u) => {
                    u.password_hash = new_hash.to_string();
                    Ok(())
                }
                None => Err("Usuário não encontrado".to_string()),
            }
        }
        async fn set_must_change_password(&self, id: Uuid, value: bool) -> Result<(), String> {
            let mut users = self.users.lock().unwrap();
            match users.iter_mut().find(|u| u.id == id) {
                Some(u) => {
                    u.must_change_password = value;
                    Ok(())
                }
                None => Err("Usuário não encontrado".to_string()),
            }
        }
        async fn update_name(&self, id: Uuid, name: String) -> Result<(), String> {
            let mut users = self.users.lock().unwrap();
            match users.iter_mut().find(|u| u.id == id) {
                Some(u) => {
                    u.name = name;
                    Ok(())
                }
                None => Err("Usuário não encontrado".to_string()),
            }
        }
        async fn delete_user(&self, id: Uuid) -> Result<(), String> {
            let mut users = self.users.lock().unwrap();
            let before = users.len();
            users.retain(|u| u.id != id);
            if users.len() < before {
                Ok(())
            } else {
                Err(format!("Usuário {} não encontrado", id))
            }
        }
        async fn update_role(&self, id: Uuid, role: String) -> Result<(), String> {
            let mut users = self.users.lock().unwrap();
            match users.iter_mut().find(|u| u.id == id) {
                Some(u) => {
                    u.role = role;
                    Ok(())
                }
                None => Err("Usuário não encontrado".to_string()),
            }
        }
    }

    #[tokio::test]
    async fn register_generates_temp_password_and_must_change() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        let (id, name, role, temp_pw) = svc
            .register(
                "Test".to_string(),
                "user_test".to_string(),
                "Funcionario".to_string(),
            )
            .await
            .unwrap();
        assert!(!id.is_nil());
        assert_eq!(name, "Test");
        assert_eq!(role, "Funcionario");
        assert!(!temp_pw.is_empty());

        let (_, _, _, _, _, must_change) = svc.login("user_test", &temp_pw).await.unwrap();
        assert!(must_change);
    }

    #[tokio::test]
    async fn set_initial_password_resets_flag() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        let (id, _, _, _) = svc
            .register(
                "U".to_string(),
                "user_u".to_string(),
                "Funcionario".to_string(),
            )
            .await
            .unwrap();

        svc.set_initial_password(id, "nova_senha_123")
            .await
            .unwrap();

        let (_, _, _, _, _, must_change) = svc.login("user_u", "nova_senha_123").await.unwrap();
        assert!(!must_change);
    }

    #[tokio::test]
    async fn set_initial_password_blocked_when_not_required() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        let (id, _, _, _) = svc
            .register(
                "U".to_string(),
                "user_u".to_string(),
                "Funcionario".to_string(),
            )
            .await
            .unwrap();

        svc.set_initial_password(id, "nova_123").await.unwrap();
        assert!(svc.set_initial_password(id, "outra_senha").await.is_err());
    }

    #[tokio::test]
    async fn login_wrong_password_fails() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        svc.register(
            "U".to_string(),
            "user_u".to_string(),
            "Funcionario".to_string(),
        )
        .await
        .unwrap();
        assert!(svc.login("user_u", "errada").await.is_err());
    }

    #[tokio::test]
    async fn login_unknown_username_fails() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        assert!(svc.login("user_inexistente", "pw").await.is_err());
    }

    #[tokio::test]
    async fn duplicate_username_registration_is_rejected() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        svc.register(
            "U1".to_string(),
            "user_dup".to_string(),
            "Funcionario".to_string(),
        )
        .await
        .unwrap();
        let result = svc
            .register(
                "U2".to_string(),
                "user_dup".to_string(),
                "Funcionario".to_string(),
            )
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn change_password_resets_must_change_flag() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        let (id, _, _, temp_pw) = svc
            .register(
                "U".to_string(),
                "user_u".to_string(),
                "Funcionario".to_string(),
            )
            .await
            .unwrap();

        svc.change_password(id, &temp_pw, "nova_senha_ok")
            .await
            .unwrap();
        let (_, _, _, _, _, must_change) = svc.login("user_u", "nova_senha_ok").await.unwrap();
        assert!(!must_change);
    }

    #[tokio::test]
    async fn list_users_returns_public_info() {
        init_jwt();
        let svc = AuthService::new(Arc::new(MockUserRepo::new()));
        svc.register(
            "A".to_string(),
            "user_a".to_string(),
            "Funcionario".to_string(),
        )
        .await
        .unwrap();
        svc.register("B".to_string(), "user_b".to_string(), "Gerente".to_string())
            .await
            .unwrap();
        let users = svc.list_users().await.unwrap();
        assert_eq!(users.len(), 2);
        assert!(users.iter().all(|u| u.must_change_password));
    }
}
