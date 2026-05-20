use crate::infrastructure::auth::{Claims, validate_token};
use axum::{
    RequestPartsExt,
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};

pub struct AuthUser(pub Claims);

impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Token ausente ou inválido"))?;

        let claims = validate_token(bearer.token())
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Token expirado ou inválido"))?;

        Ok(AuthUser(claims))
    }
}

macro_rules! role_extractor {
    ($name:ident, $role:literal) => {
        pub struct $name(pub Claims);

        impl<S: Send + Sync> FromRequestParts<S> for $name {
            type Rejection = (StatusCode, &'static str);

            async fn from_request_parts(
                parts: &mut Parts,
                state: &S,
            ) -> Result<Self, Self::Rejection> {
                let AuthUser(claims) = AuthUser::from_request_parts(parts, state).await?;
                if claims.role != $role {
                    return Err((StatusCode::FORBIDDEN, "Acesso negado"));
                }
                Ok(Self(claims))
            }
        }
    };
}

role_extractor!(DiretorUser, "Diretor");
role_extractor!(CoordenadorUser, "Coordenador");
role_extractor!(TecnicoUser, "Tecnico");
role_extractor!(GerenteUser, "Gerente");
role_extractor!(FuncionarioUser, "Funcionario");
role_extractor!(AdminUser, "Admin");
