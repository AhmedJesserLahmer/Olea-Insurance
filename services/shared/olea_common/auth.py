from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from olea_common.database import SessionLocal
from olea_common.models import User

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set. Define it in your .env file.")

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


@dataclass(frozen=True)
class TokenUser:
    id: int
    email: str


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def create_access_token(subject: str, user_id: Optional[int] = None, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": subject, "exp": expire}
    if user_id is not None:
        to_encode["uid"] = user_id
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _decode(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise _credentials_exception() from exc
    if payload.get("sub") is None:
        raise _credentials_exception()
    return payload


def get_token_user(token: str = Depends(oauth2_scheme)) -> TokenUser:
    """Stateless check for services without access to the users table."""
    payload = _decode(token)
    if not isinstance(payload.get("uid"), int):
        # Tokens issued before the uid claim existed: the client must sign in again
        raise _credentials_exception()
    return TokenUser(id=payload["uid"], email=payload["sub"])


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = _credentials_exception()
    email = _decode(token)["sub"]

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user
