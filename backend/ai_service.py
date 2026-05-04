"""
AI Service for Investment Advisory
Supports both local Ollama and OpenAI cloud providers
"""
import os
import logging
import requests
import time
from typing import Optional, Dict, Any, Tuple
from dotenv import load_dotenv
from abc import ABC, abstractmethod

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama").lower()  # "ollama" or "openai"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Track efficiency metrics
metrics = {
    "total_requests": 0,
    "total_latency_ms": 0,
    "total_tokens": 0,
    "provider": AI_PROVIDER,
}


class BaseAdvisor(ABC):
    """Base class for AI advisors."""
    
    def __init__(self):
        self.enabled = False
        self.provider = "base"
        self.model = "unknown"
    
    @abstractmethod
    async def enhance_response(
        self,
        question: str,
        base_response: str,
        portfolio_context: Optional[Dict[str, Any]] = None,
        stock_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Enhance response and return (text, metrics).
        """
        pass


class OllamaAdvisor(BaseAdvisor):
    """Local Ollama advisor (free, runs locally)."""
    
    def __init__(self):
        super().__init__()
        self.provider = "ollama"
        self.model = OLLAMA_MODEL
        self.url = OLLAMA_URL
        
        # Test connection
        try:
            response = requests.get(f"{self.url}/api/tags", timeout=2)
            self.enabled = response.status_code == 200
            if self.enabled:
                logger.info(f"✅ Ollama enabled: {self.model} on {self.url}")
            else:
                logger.warning("Ollama returned non-200 status")
        except requests.ConnectionError:
            logger.warning(
                f"⚠️  Ollama not running. Start it with: ollama serve\n"
                f"   Download model with: ollama pull {self.model}"
            )
            self.enabled = False
        except Exception as e:
            logger.warning(f"Ollama connection error: {str(e)}")
            self.enabled = False
    
    async def enhance_response(
        self,
        question: str,
        base_response: str,
        portfolio_context: Optional[Dict[str, Any]] = None,
        stock_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """Enhance response using Ollama."""
        if not self.enabled:
            return base_response, {"error": "Ollama not available"}
        
        try:
            start_time = time.time()
            
            system_prompt = (
                "You are a knowledgeable investment advisor with expertise in "
                "stock market analysis. Provide concise, actionable advice in "
                "a friendly tone. Be honest about limitations."
            )
            
            user_message = f"""Given this base response:
{base_response}

Enhance it to be more engaging and helpful. Keep it under 300 words.
Question: {question}"""
            
            # Call Ollama local API
            response = requests.post(
                f"{self.url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": f"{system_prompt}\n\nUser: {user_message}",
                    "stream": False,
                    "temperature": 0.7,
                },
                timeout=30
            )
            
            elapsed_ms = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                enhanced = data.get("response", base_response).strip()
                
                metrics_out = {
                    "provider": "ollama",
                    "model": self.model,
                    "latency_ms": round(elapsed_ms),
                    "tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
                    "cost": 0,  # Free!
                }
                
                # Update global metrics
                metrics["total_requests"] += 1
                metrics["total_latency_ms"] += elapsed_ms
                
                logger.info(
                    f"Ollama response: {elapsed_ms:.0f}ms, "
                    f"{metrics_out['tokens']} tokens"
                )
                return enhanced, metrics_out
            else:
                logger.error(f"Ollama error: {response.status_code}")
                return base_response, {"error": "Ollama request failed"}
                
        except requests.Timeout:
            logger.error(f"Ollama timeout after 30s")
            return base_response, {"error": "Ollama timeout"}
        except Exception as e:
            logger.error(f"Ollama error: {str(e)}")
            return base_response, {"error": str(e)}


class OpenAIAdvisor(BaseAdvisor):
    """Cloud-based OpenAI advisor."""
    
    def __init__(self):
        super().__init__()
        self.provider = "openai"
        self.model = "gpt-4-turbo-preview"
        self.api_key = OPENAI_API_KEY
        
        if self.api_key:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
                self.enabled = True
                logger.info("✅ OpenAI enabled (GPT-4 Turbo)")
            except ImportError:
                logger.warning("OpenAI package not installed")
                self.enabled = False
    
    async def enhance_response(
        self,
        question: str,
        base_response: str,
        portfolio_context: Optional[Dict[str, Any]] = None,
        stock_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """Enhance response using OpenAI."""
        if not self.enabled:
            return base_response, {"error": "OpenAI not available"}
        
        try:
            start_time = time.time()
            
            system_prompt = (
                "You are a knowledgeable investment advisor with expertise in "
                "stock market analysis. Provide concise, actionable advice in "
                "a friendly tone. Always be honest about limitations."
            )
            
            user_message = f"""Given this base response:
{base_response}

Enhance it to be more engaging and helpful. Keep it under 300 words.
Question: {question}"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=400,
                timeout=10
            )
            
            elapsed_ms = (time.time() - start_time) * 1000
            enhanced = response.choices[0].message.content.strip()
            
            # Estimate cost: GPT-4 Turbo ~$0.01 per 1K input + $0.03 per 1K output tokens
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            total_tokens = input_tokens + output_tokens
            cost_cents = (input_tokens * 0.01 + output_tokens * 0.03) / 1000
            
            metrics_out = {
                "provider": "openai",
                "model": self.model,
                "latency_ms": round(elapsed_ms),
                "tokens": total_tokens,
                "cost": round(cost_cents, 4),
            }
            
            # Update global metrics
            metrics["total_requests"] += 1
            metrics["total_latency_ms"] += elapsed_ms
            metrics["total_tokens"] += total_tokens
            
            logger.info(
                f"OpenAI response: {elapsed_ms:.0f}ms, "
                f"{total_tokens} tokens, ${cost_cents:.4f}"
            )
            return enhanced, metrics_out
            
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            return base_response, {"error": str(e)}


def _initialize_advisor() -> BaseAdvisor:
    """Initialize the appropriate advisor based on configuration."""
    if AI_PROVIDER == "openai":
        advisor = OpenAIAdvisor()
        if advisor.enabled:
            return advisor
        # Fallback to Ollama if OpenAI not available
        logger.warning("OpenAI not available, trying Ollama...")
    
    # Try Ollama
    advisor = OllamaAdvisor()
    if advisor.enabled:
        return advisor
    
    # Neither available - return disabled advisor
    logger.warning("⚠️  No AI provider available!")
    logger.info("To use Ollama:")
    logger.info("  1. Install: brew install ollama")
    logger.info("  2. Download model: ollama pull mistral")
    logger.info("  3. Run: ollama serve")
    logger.info("")
    logger.info("To use OpenAI:")
    logger.info("  1. Set OPENAI_API_KEY in .env")
    logger.info("  2. Set AI_PROVIDER=openai in .env")
    
    return OllamaAdvisor()  # Return disabled instance


# Global advisor instance - automatically selects best available provider
advisor = _initialize_advisor()


# Efficiency metrics endpoint
def get_efficiency_report() -> Dict[str, Any]:
    """Get efficiency metrics for testing."""
    avg_latency = (
        metrics["total_latency_ms"] / metrics["total_requests"]
        if metrics["total_requests"] > 0
        else 0
    )
    
    return {
        "provider": advisor.provider,
        "model": advisor.model,
        "enabled": advisor.enabled,
        "total_requests": metrics["total_requests"],
        "avg_latency_ms": round(avg_latency, 2),
        "total_tokens": metrics["total_tokens"],
        "estimated_cost": metrics.get("total_cost", 0),
    }
