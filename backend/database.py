import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Correction: utilisez le même nom que dans votre .env
DATABASE_URL = os.getenv("DATABASE_URL")  # ← CORRECT

# Vérifions que la variable est bien chargée
if DATABASE_URL is None:
    print("ERREUR: DATABASE_URL n'est pas définie dans le fichier .env")
    print("Utilisation de la valeur par défaut...")
    DATABASE_URL = "mysql+pymysql://root:lahmerkun1234@localhost:3306/application"

print(f"Connexion à la base de données: {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
