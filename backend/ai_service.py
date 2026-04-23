"""
AI Service for Investment Advisory using OpenAI
"""
import os
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AI_ENABLED = bool(OPENAI_API_KEY)


class InvestmentAdvisor:
    """Investment advisor powered by OpenAI for natural language analysis."""
    
    def __init__(self):
        self.api_key = OPENAI_API_KEY
        self.enabled = AI_ENABLED
        if self.enabled:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
            except ImportError:
                logger.warning("OpenAI package not installed. Install with: pip install openai")
                self.enabled = False
    
    async def enhance_response(
        self,
        question: str,
        base_response: str,
        portfolio_context: Optional[Dict[str, Any]] = None,
        stock_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Enhance a base response with OpenAI to make it more natural and personalized.
        
        Args:
            question: The user's question
            base_response: The baseline response (from rule-based system)
            portfolio_context: User's portfolio data
            stock_context: Stock-specific data
            
        Returns:
            Enhanced response text
        """
        if not self.enabled:
            return base_response
        
        try:
            # Build system prompt with context
            system_parts = [
                "You are a knowledgeable investment advisor with expertise in stock market analysis.",
                "Provide concise, actionable advice in a friendly tone.",
                "Always be honest about limitations and recommend diversification.",
                "Use emojis sparingly but effectively.",
            ]
            
            if portfolio_context:
                holdings_info = " ".join([
                    f"{h.get('symbol')}: {h.get('shares')} shares @ ${h.get('cost_basis', 0):.2f}"
                    for h in portfolio_context.get("holdings", [])
                ])
                if holdings_info:
                    system_parts.append(f"User's portfolio: {holdings_info}")
            
            system_prompt = " ".join(system_parts)
            
            # Build context for the enhancement request
            context_parts = [f"User asked: {question}"]
            if stock_context:
                context_parts.append(f"Stock: {stock_context.get('symbol', 'N/A')} @ ${stock_context.get('price', 'N/A')}")
            
            user_message = f"""
Given this base response:
{base_response}

Enhance it to be more engaging, personalized, and helpful. Keep it under 300 words.
Keep the structure but improve the tone and add any relevant insights.

Context: {" | ".join(context_parts)}
"""
            
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=400,
                timeout=10
            )
            
            enhanced = response.choices[0].message.content.strip()
            logger.info(f"Enhanced response for: {question[:50]}")
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing response with OpenAI: {str(e)}")
            return base_response
    
    async def analyze_question(self, question: str) -> Dict[str, Any]:
        """
        Use OpenAI to understand the user's question and intent.
        
        Returns classification and extracted entities.
        """
        if not self.enabled:
            return {"intent": "general", "symbols": [], "question_type": "unknown"}
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": """Analyze a stock market question and return JSON with:
- intent: "buy_sell_advice", "portfolio_review", "comparison", "sentiment", "general", "unknown"
- symbols: list of stock symbols mentioned (e.g. ["AAPL", "MSFT"])
- question_type: "analysis", "questions", "recommendation", "education"

Return valid JSON only, no other text."""
                    },
                    {"role": "user", "content": question}
                ],
                temperature=0.3,
                max_tokens=200,
                timeout=10
            )
            
            import json
            result_text = response.choices[0].message.content.strip()
            result = json.loads(result_text)
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing question: {str(e)}")
            return {"intent": "general", "symbols": [], "question_type": "unknown"}
    
    async def generate_personalized_advice(
        self,
        portfolio: Dict[str, Any],
        question: str
    ) -> str:
        """
        Generate personalized investment advice based on user's portfolio.
        """
        if not self.enabled:
            return ""
        
        try:
            holdings = portfolio.get("holdings", [])
            total_value = portfolio.get("total_value", 0)
            total_cost = portfolio.get("total_cost", 0)
            
            holdings_text = "\n".join([
                f"- {h.get('symbol')}: {h.get('shares')} shares, ${h.get('market_value', 0):.2f} value, {h.get('gain_pct', 0):.1f}% return"
                for h in holdings
            ])
            
            prompt = f"""
User's portfolio:
Total value: ${total_value:,.2f}
Total invested: ${total_cost:,.2f}
Return: {((total_value - total_cost) / total_cost * 100) if total_cost else 0:.1f}%

Holdings:
{holdings_text}

Question: {question}

Provide 2-3 actionable suggestions considering their portfolio composition, risk profile, and diversification.
"""
            
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert investment advisor. Provide personalized advice based on the user's portfolio."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300,
                timeout=10
            )
            
            advice = response.choices[0].message.content.strip()
            return advice
            
        except Exception as e:
            logger.error(f"Error generating advice: {str(e)}")
            return ""


# Global instance
advisor = InvestmentAdvisor()
