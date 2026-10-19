import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from pinecone import Pinecone, ServerlessSpec
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Récupérer les clés API
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENV", "gcp-starter")  # valeur par défaut si non définie

print(f"🔑 Clé API Pinecone chargée: {'Oui' if PINECONE_API_KEY else 'Non'}")
print(f"🌍 Environnement Pinecone: {PINECONE_ENV}")

# -------------------------
# Initialize Pinecone
# -------------------------
pc = Pinecone(api_key=PINECONE_API_KEY)

index_name = "insurance"

# Vérifier si l'index existe, sinon le créer
if index_name not in pc.list_indexes().names():
    print(f"Création de l'index {index_name}...")
    pc.create_index(
        name=index_name,
        dimension=384,  # Dimension pour "thenlper/gte-small" est 384
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"  # Changez selon votre région
        )
    )
else:
    print(f"✅ Index {index_name} existe déjà")

# Use SAME embedding model you used in notebook
embedding_model = HuggingFaceEmbeddings(
    model_name="thenlper/gte-small"
)

# Connexion à l'index existant
index = pc.Index(index_name)

# Créer le vectorstore avec LangChain
vectorstore = PineconeVectorStore(
    index=index,
    embedding=embedding_model,
    text_key="text",
    namespace="ns1"
)

print("✅ Connexion à Pinecone réussie!")

# -------------------------
# Load YOUR LLM
# -------------------------
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

print(f"📦 Chargement du modèle {model_name}...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float32,
    low_cpu_mem_usage=True,
    device_map="auto"
)
model.eval()
# Ajouter un token de padding si nécessaire
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

print("✅ Modèle chargé avec succès!")

# -------------------------
# Your RAG Pipeline
# -------------------------
def RAG_Solution(query: str, temperature: float = 0.2):
    try:
        # Gestion des salutations plus robuste
        clean_query = query.lower().strip()
        greetings = ["hi", "hello", "bonjour", "salut", "hey", "bonsoir", "hii", "helo"]
        
        if any(clean_query == g or clean_query.startswith(g + " ") for g in greetings) and len(clean_query) < 15:
            return "Hello! I'm AssurBot, your AI insurance advisor. I can help you find the perfect coverage bundle based on your profile — age, family size, budget, lifestyle, and risk preferences. Just tell me about yourself and I'll match you with the best plan!"
    
        print(f"🔍 Recherche pour: {query}")
        
        # 1️⃣ Retrieve
        docs = vectorstore.similarity_search(query, k=3)
        context = "\n".join([doc.page_content for doc in docs])
        
        print(f"📚 Contexte trouvé: {len(docs)} documents")

        # 2️⃣ Prompt
        prompt = f"""You are a helpful AI insurance advisor.
Your role is to help clients find the best Purchased Coverage Bundle (classes 0–9) based on their demographic and behavioral profile , if you were asked out of these themes just say , i am not allowed to answer non related insurance questions.

Available bundles:
- Bundle 0 (BH-001): Basic Health — $89/mo, $250K coverage, essential medical
- Bundle 1 (HDV-002): Health + Dental + Vision — $154/mo, $400K coverage
- Bundle 2 (FC-003): Family Comprehensive — $298/mo, $800K coverage
- Bundle 3 (PHL-004): Premium Health & Life — $421/mo, $2M coverage
- Bundle 4 (AL-005): Auto Liability Basic — $67/mo, $100K coverage
- Bundle 5 (AC-006): Auto Comprehensive — $189/mo, $500K coverage
- Bundle 6 (HS-007): Home Standard — $112/mo, $350K coverage
- Bundle 7 (HP-008): Home Premium — $234/mo, $1.2M coverage
- Bundle 8 (RB-009): Renter's Basic — $29/mo, $25K coverage
- Bundle 9 (RP-010): Renter's Premium — $79/mo, $80K coverage

Rules:
1. When a user describes their profile (age, income, family, lifestyle, needs), recommend the BEST matching bundle with reasoning.
2. Always mention the bundle number (0–9) and name in your recommendation.
3. Use the context provided to support your answer with data patterns.
4. If the user asks general insurance questions, answer helpfully using the context.
5. If the question is not related to insurance, say: "I can only help with insurance-related questions."
6. Answer in the same language the user uses.
7. Keep answers concise, structured, and actionable.
8. End with: 'For personalized insurance advice, please consult a licensed insurance professional.'

Context:
{context}

Question:
{query}

Answer:"""

        # 3️⃣ Generate
        inputs = tokenizer(prompt, return_tensors="pt", padding=True, truncation=True)
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}


        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=300,
                temperature=temperature,
                do_sample=temperature > 0,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id
            )

        # 4️⃣ Decode
        full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        answer = full_response.split("Answer:")[-1].strip()

        print(f"✅ Réponse générée")
        return answer
    
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return f"Erreur dans le pipeline RAG: {str(e)}"
