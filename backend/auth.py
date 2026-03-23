import secrets
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_api_key():
    return secrets.token_hex(16)

def verify_api_key(api_key: str, db: Session):
    user = db.query(User).filter(User.api_key == api_key).first()
    print("Checking API key:", api_key)
    print("User found:", user)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return user