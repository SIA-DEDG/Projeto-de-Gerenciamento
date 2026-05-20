use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub exp: usize,
}

pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| format!("Erro ao criar hash: {}", e))
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
    let parsed = PasswordHash::new(hash).map_err(|e| format!("Hash inválido: {}", e))?;
    match Argon2::default().verify_password(password.as_bytes(), &parsed) {
        Ok(_) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(format!("Erro ao verificar senha: {}", e)),
    }
}

fn secret_key() -> String {
    env::var("JWT_SECRET").expect("JWT_SECRET não definido no .env")
}

pub fn generate_token(user_id: &str, username: &str, role: &str) -> Result<String, String> {
    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(24))
        .expect("overflow no tempo")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret_key().as_bytes()),
    )
    .map_err(|e| format!("Erro ao gerar token: {}", e))
}

pub fn validate_token(token: &str) -> Result<Claims, String> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret_key().as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map(|d| d.claims)
    .map_err(|e| format!("Token inválido: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set_secret() {
        // SAFETY: test-only, single-threaded setup before any async work starts.
        unsafe {
            std::env::set_var("JWT_SECRET", "test-secret-key-for-unit-tests");
        }
    }

    #[test]
    fn hash_and_verify_correct_password() {
        let hash = hash_password("minha_senha").unwrap();
        assert!(verify_password("minha_senha", &hash).unwrap());
    }

    #[test]
    fn verify_wrong_password_returns_false() {
        let hash = hash_password("correta").unwrap();
        assert!(!verify_password("errada", &hash).unwrap());
    }

    #[test]
    fn generate_and_validate_token_roundtrip() {
        set_secret();
        let token = generate_token("uuid-123", "user_admin", "Admin").unwrap();
        let claims = validate_token(&token).unwrap();
        assert_eq!(claims.sub, "uuid-123");
        assert_eq!(claims.username, "user_admin");
        assert_eq!(claims.role, "Admin");
    }

    #[test]
    fn invalid_token_returns_error() {
        set_secret();
        assert!(validate_token("invalid.jwt.token").is_err());
    }

    #[test]
    fn tampered_token_returns_error() {
        set_secret();
        let token = generate_token("id", "user_test", "Admin").unwrap();
        let tampered = format!("{}x", token);
        assert!(validate_token(&tampered).is_err());
    }
}
