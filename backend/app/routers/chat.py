"""
AI Chat API endpoints
Provides conversational interface for market analysis and investment advice
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import get_settings
from .. import auth
from ..services.chat_service import ChatService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["AI Chat"])

settings = get_settings()

# Store chat services per user (in production, use Redis or database)
_chat_services = {}


def get_chat_service(user_id: str) -> ChatService:
    """Get or create chat service for user"""
    if user_id not in _chat_services:
        if not settings.anthropic_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Chat service not configured"
            )
        _chat_services[user_id] = ChatService(settings.anthropic_api_key)
    return _chat_services[user_id]


# ============== Schemas ==============

class ChatMessage(BaseModel):
    """Chat message in history"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request for chat endpoint"""
    message: str
    symbol: Optional[str] = None
    include_portfolio: bool = False


class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    response: str
    sources: dict
    conversation_id: Optional[str] = None


class SuggestedQuestion(BaseModel):
    """Suggested chat question"""
    question: str
    category: str  # "portfolio", "market", "prediction", etc.


# ============== Endpoints ==============

@router.post("/", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(auth.get_current_user_id)
):
    """
    Send a message to the AI chatbot

    - **message**: User's question or comment
    - **symbol**: Optional asset symbol for context
    - **include_portfolio**: Include portfolio data in context
    """
    try:
        user_id = str(current_user_id)
        chat_service = get_chat_service(user_id)

        # Prepare context data
        market_context = None
        portfolio = None

        if request.symbol:
            # In production, fetch real market data
            market_context = {
                "symbol": request.symbol,
                "data_sources": ["market_data"]
            }

        if request.include_portfolio:
            # In production, fetch user's portfolio from database
            portfolio = {
                "total_value": 0,
                "return_percent": 0
            }

        # Get response from chat service
        response, sources = chat_service.chat_with_context(
            user_message=request.message,
            symbol=request.symbol,
            portfolio=portfolio,
            market_context=market_context
        )

        return ChatResponse(
            response=response,
            sources=sources,
            conversation_id=user_id
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )


@router.get("/history", response_model=List[ChatMessage])
async def get_chat_history(
    current_user_id: int = Depends(auth.get_current_user_id)
):
    """
    Get conversation history

    Returns last 10 user-assistant message pairs
    """
    try:
        user_id = str(current_user_id)
        chat_service = get_chat_service(user_id)
        history = chat_service.get_history()

        return [
            ChatMessage(role=msg["role"], content=msg["content"])
            for msg in history
        ]

    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch chat history"
        )


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    current_user_id: int = Depends(auth.get_current_user_id)
):
    """
    Clear conversation history

    This resets the chat context for the user
    """
    try:
        user_id = str(current_user_id)
        chat_service = get_chat_service(user_id)
        chat_service.clear_history()

    except Exception as e:
        logger.error(f"Error clearing chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear chat history"
        )


@router.get("/suggested-questions", response_model=List[SuggestedQuestion])
async def get_suggested_questions(
    category: Optional[str] = None,
    current_user_id: int = Depends(auth.get_current_user_id)
):
    """
    Get suggested chat questions

    Useful for first-time users or to jumpstart conversation

    - **category**: Optional filter (portfolio, market, prediction, risk, tax)
    """
    suggestions = [
        SuggestedQuestion(
            question="What's the best investment opportunity right now?",
            category="market"
        ),
        SuggestedQuestion(
            question="Should I buy Bitcoin at this price?",
            category="prediction"
        ),
        SuggestedQuestion(
            question="How should I rebalance my portfolio?",
            category="portfolio"
        ),
        SuggestedQuestion(
            question="What's your analysis of the current market sentiment?",
            category="market"
        ),
        SuggestedQuestion(
            question="Which assets are most correlated in my portfolio?",
            category="portfolio"
        ),
        SuggestedQuestion(
            question="What are the biggest risks I should be aware of?",
            category="risk"
        ),
        SuggestedQuestion(
            question="How do I optimize for tax efficiency?",
            category="tax"
        ),
        SuggestedQuestion(
            question="Can you explain why this prediction was made?",
            category="prediction"
        ),
    ]

    if category:
        suggestions = [s for s in suggestions if s.category == category]

    return suggestions
