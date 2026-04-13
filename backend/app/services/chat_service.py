"""
AI Chat Service for QuantumLedger
Provides intelligent conversational interface using Claude API with contextual market data
"""
import logging
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
from anthropic import Anthropic
import json

logger = logging.getLogger(__name__)


class ChatService:
    """Service for AI-powered chat with market context"""

    def __init__(self, api_key: str):
        """Initialize chat service with Anthropic client"""
        self.client = Anthropic(api_key=api_key)
        self.conversation_history = []
        self.max_history = 10
        self.system_prompt = """You are QuantumLedger AI, an expert financial advisor for cryptocurrency and stock investments.
You provide:
- Clear, actionable investment advice
- Real-time market analysis and predictions
- Portfolio recommendations
- Risk assessments and opportunities
- Answers to financial questions

Always:
- Be specific and data-driven
- Ask clarifying questions if needed
- Explain your reasoning
- Acknowledge limitations and risks
- Consider the user's context (portfolio, risk tolerance, etc.)

Format complex information clearly. Keep responses concise but comprehensive.
When analyzing markets, consider sentiment, technical indicators, and macroeconomic factors."""

    def chat_with_context(
        self,
        user_message: str,
        symbol: Optional[str] = None,
        portfolio: Optional[Dict] = None,
        market_context: Optional[Dict] = None
    ) -> Tuple[str, Dict]:
        """
        Send message with optional market context

        Args:
            user_message: User's question or statement
            symbol: Optional asset symbol for context
            portfolio: Optional portfolio data
            market_context: Optional market data and sentiment

        Returns:
            Tuple of (response_text, sources_used)
        """
        try:
            # Build context message if data provided
            context_message = self._build_context_message(
                symbol=symbol,
                portfolio=portfolio,
                market_context=market_context
            )

            # Prepare messages for API
            messages = self.conversation_history.copy()

            # Add context if available
            if context_message:
                messages.append({
                    "role": "user",
                    "content": f"{context_message}\n\nUser question: {user_message}"
                })
            else:
                messages.append({
                    "role": "user",
                    "content": user_message
                })

            # Call Claude API
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=self.system_prompt,
                messages=messages
            )

            assistant_message = response.content[0].text

            # Update conversation history
            self._add_to_history("user", user_message)
            self._add_to_history("assistant", assistant_message)

            # Extract sources used
            sources = self._extract_sources(symbol, market_context)

            return assistant_message, sources

        except Exception as e:
            logger.error(f"Error in chat_with_context: {e}")
            raise

    def get_prediction_explanation(
        self,
        symbol: str,
        prediction_data: Optional[Dict] = None
    ) -> str:
        """
        Get AI explanation for price prediction

        Args:
            symbol: Asset symbol
            prediction_data: Prediction details (direction, confidence, reasons)

        Returns:
            Explanation text
        """
        try:
            context = f"Asset: {symbol}"
            if prediction_data:
                context += f"\nPrediction: {prediction_data.get('direction', 'unclear')}"
                context += f"\nConfidence: {prediction_data.get('confidence', 'N/A')}%"
                if prediction_data.get('reasons'):
                    context += f"\nKey factors: {', '.join(prediction_data['reasons'])}"

            prompt = f"""
Explain why this asset might move in the predicted direction. Be specific about:
1. Technical factors (chart patterns, indicators)
2. Fundamental factors (news, earnings, sentiment)
3. Market factors (correlation, macro trends)
4. Risk factors to consider

Asset prediction context:
{context}

Provide a concise but insightful explanation suitable for investors.
"""

            messages = [{"role": "user", "content": prompt}]

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=512,
                system=self.system_prompt,
                messages=messages
            )

            return response.content[0].text

        except Exception as e:
            logger.error(f"Error in get_prediction_explanation: {e}")
            raise

    def get_portfolio_recommendations(self, portfolio_data: Dict) -> Tuple[str, List[Dict]]:
        """
        Get AI recommendations for portfolio optimization

        Args:
            portfolio_data: Portfolio with holdings and metrics

        Returns:
            Tuple of (recommendation_text, suggested_actions)
        """
        try:
            # Prepare portfolio context
            holdings_str = "Holdings:\n"
            if portfolio_data.get('holdings'):
                for holding in portfolio_data['holdings'][:5]:  # Top 5
                    holdings_str += f"- {holding.get('symbol')}: {holding.get('quantity')} units @ ${holding.get('avg_cost')}\n"

            metrics_str = f"""
Portfolio Metrics:
- Total Value: ${portfolio_data.get('total_value', 'N/A')}
- Total Gain/Loss: ${portfolio_data.get('total_gain_loss', 'N/A')}
- Return %: {portfolio_data.get('return_percent', 'N/A')}%
- Risk Score: {portfolio_data.get('risk_score', 'N/A')}
- Diversification: {portfolio_data.get('diversification', 'low')}/high
"""

            prompt = f"""
Analyze this portfolio and provide specific recommendations:

{holdings_str}
{metrics_str}

Provide:
1. Overall portfolio assessment
2. Specific recommendations (buy/sell/hold)
3. Diversification suggestions
4. Risk management advice
5. Timeline and priorities

Be actionable and specific. Consider tax implications if relevant.
"""

            messages = [{"role": "user", "content": prompt}]

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=768,
                system=self.system_prompt,
                messages=messages
            )

            recommendation = response.content[0].text

            # Extract suggested actions
            suggested_actions = self._extract_suggested_actions(recommendation)

            return recommendation, suggested_actions

        except Exception as e:
            logger.error(f"Error in get_portfolio_recommendations: {e}")
            raise

    def get_opportunity_analysis(self, top_symbols: List[Dict]) -> Dict:
        """
        Analyze investment opportunities

        Args:
            top_symbols: List of top opportunities with data

        Returns:
            Analysis with scores and explanations
        """
        try:
            opportunities_str = ""
            for i, opp in enumerate(top_symbols[:5], 1):
                opportunities_str += f"{i}. {opp.get('symbol')}: Score {opp.get('score')}/100\n"
                if opp.get('reason'):
                    opportunities_str += f"   Reason: {opp['reason']}\n"

            prompt = f"""
Analyze these investment opportunities and rank them:

{opportunities_str}

Provide:
1. Rank order with justification
2. Best use case for each (aggressive/conservative/hedge)
3. Ideal entry points
4. Risk/reward profiles
5. Suggested position sizing

Format as JSON with structure:
{{
  "ranked": [
    {{
      "rank": 1,
      "symbol": "...",
      "score": 0-100,
      "explanation": "...",
      "risk_level": "low/medium/high",
      "suggested_allocation": "...%"
    }}
  ],
  "overall_market_outlook": "..."
}}
"""

            messages = [{"role": "user", "content": prompt}]

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=self.system_prompt,
                messages=messages
            )

            response_text = response.content[0].text

            # Try to parse JSON from response
            try:
                # Find JSON in response
                import re
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    analysis = json.loads(json_match.group())
                    return analysis
            except:
                pass

            # Fallback to text response
            return {
                "analysis": response_text,
                "ranked": [],
                "overall_market_outlook": "See analysis above"
            }

        except Exception as e:
            logger.error(f"Error in get_opportunity_analysis: {e}")
            raise

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []

    def get_history(self) -> List[Dict]:
        """Get conversation history"""
        return self.conversation_history.copy()

    # ============== Private Methods ==============

    def _add_to_history(self, role: str, content: str):
        """Add message to conversation history, maintaining max_history limit"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })

        # Keep only last N messages
        if len(self.conversation_history) > self.max_history * 2:
            self.conversation_history = self.conversation_history[-self.max_history * 2:]

    def _build_context_message(
        self,
        symbol: Optional[str] = None,
        portfolio: Optional[Dict] = None,
        market_context: Optional[Dict] = None
    ) -> str:
        """Build rich context message for API"""
        context_parts = []

        if symbol:
            context_parts.append(f"[Asset Context: {symbol}]")
            if market_context:
                if market_context.get('price'):
                    context_parts.append(f"Current Price: ${market_context['price']}")
                if market_context.get('change_percent'):
                    context_parts.append(f"24h Change: {market_context['change_percent']:.2f}%")
                if market_context.get('sentiment'):
                    context_parts.append(f"Sentiment: {market_context['sentiment']}")
                if market_context.get('prediction'):
                    context_parts.append(f"AI Prediction: {market_context['prediction']}")

        if portfolio:
            context_parts.append(f"[Portfolio Context]")
            context_parts.append(f"Total Value: ${portfolio.get('total_value', 'N/A')}")
            context_parts.append(f"Return: {portfolio.get('return_percent', 'N/A')}%")
            if portfolio.get('risk_level'):
                context_parts.append(f"Risk Level: {portfolio['risk_level']}")

        return "\n".join(context_parts) if context_parts else ""

    def _extract_sources(
        self,
        symbol: Optional[str] = None,
        market_context: Optional[Dict] = None
    ) -> Dict:
        """Extract sources used in analysis"""
        sources = {
            "data_sources": [],
            "timestamp": datetime.now().isoformat()
        }

        if symbol:
            sources["data_sources"].append("Market price data")

        if market_context:
            if market_context.get('sentiment'):
                sources["data_sources"].append("Sentiment analysis")
            if market_context.get('prediction'):
                sources["data_sources"].append("ML predictions")
            if market_context.get('macro_data'):
                sources["data_sources"].append("Macroeconomic data")

        return sources

    def _extract_suggested_actions(self, recommendation: str) -> List[Dict]:
        """Extract actionable items from recommendation"""
        actions = []

        # Look for numbered items or bullet points
        import re
        lines = recommendation.split('\n')

        for line in lines:
            # Match patterns like "1. Buy..." or "- Sell..."
            if re.match(r'^[\d\-\*]\.\s+(Buy|Sell|Hold|Increase|Reduce)', line, re.I):
                actions.append({
                    "action": line.strip(),
                    "priority": "medium"
                })

        return actions[:5]  # Return top 5 actions
