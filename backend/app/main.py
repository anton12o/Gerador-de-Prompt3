import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("gerador-app")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend com IA para geração de vídeos afiliados de alta conversão para Shopee e TikTok Shop utilizando a lógica Tech Lemonade v3.0.",
    version="3.0.0"
)

# CORS Middleware restrito às origens do frontend local
cors_origins_raw = getattr(settings, "CORS_ORIGINS", os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"))
allow_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "message": f"{settings.PROJECT_NAME} está rodando com sucesso!",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Iniciando servidor em {settings.HOST}:{settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
