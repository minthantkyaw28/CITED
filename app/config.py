import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Kimchi gateway (OpenAI-compatible). Per sponsor docs:
    #   base_url = https://llm.kimchi.dev/openai/v1
    #   api key from CASTAI_API_KEY (legacy KIMCHI_API_KEY also accepted)
    KIMCHI_BASE_URL: str = os.getenv("KIMCHI_BASE_URL", "https://llm.kimchi.dev/openai/v1")
    KIMCHI_API_KEY: str = os.getenv("CASTAI_API_KEY", "") or os.getenv("KIMCHI_API_KEY", "")

    NEO4J_URI: str = os.getenv("NEO4J_URI", "")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "")

    # Default model per sponsor docs.
    KIMCHI_FAST_MODEL: str = os.getenv("KIMCHI_FAST_MODEL", "kimi-k2.5")
    KIMCHI_EXTRACT_MODEL: str = os.getenv("KIMCHI_EXTRACT_MODEL", "kimi-k2.5")
    KIMCHI_RECOMMEND_MODEL: str = os.getenv(
        "KIMCHI_RECOMMEND_MODEL",
        os.getenv("KIMCHI_EXTRACT_MODEL", "kimi-k2.5"),
    )

    QUERY_PLAN_MAX: int = int(os.getenv("QUERY_PLAN_MAX", "12"))
    QUERY_FANOUT_CONCURRENCY: int = int(os.getenv("QUERY_FANOUT_CONCURRENCY", "20"))


settings = Settings()
# chore: note 2026-08-03T20:45:56
