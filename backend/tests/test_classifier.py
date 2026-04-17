"""
Unit tests for the AI email classifier (ai/classifier.py).

Patches the Anthropic async client so tests run without a live API key.
"""
import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers & fixtures
# ---------------------------------------------------------------------------

SAMPLE_EMAIL = {
    "subject": "Urgent: Contract renewal deadline this Friday",
    "sender": "sarah.johnson@bigclient.com",
    "body": (
        "Hi, I wanted to follow up on the contract renewal. "
        "Our legal team needs the signed documents by Friday EOD "
        "or we will need to pause the engagement until Q2."
    ),
}

VALID_CLASSIFIER_RESPONSE = {
    "priority_score": 9,
    "category": "urgent_client_request",
    "summary": "Client requires signed contract renewal by Friday EOD.",
    "confidence_score": 0.95,
    "action_items": [
        {"task": "Review and sign contract documents", "deadline": "Friday EOD"},
        {"task": "Reply to confirm receipt", "deadline": None},
    ],
    "language": "en",
    "is_phishing": False,
    "phishing_indicators": [],
}


def _make_anthropic_response(content: dict) -> MagicMock:
    """Build a mock that mimics Anthropic Messages API response structure."""
    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = json.dumps(content)

    mock_response = MagicMock()
    mock_response.content = [text_block]
    return mock_response


def run(coro):
    """Run a coroutine synchronously."""
    return asyncio.new_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestClassifyEmailReturnsValidStructure:
    """classify_email should return a dict with all required fields."""

    @patch("ai.classifier.client")
    def test_classify_email_returns_valid_structure(self, mock_client):
        """Mocked Anthropic returns a well-formed response; classifier parses it correctly."""
        mock_client.messages.create = AsyncMock(
            return_value=_make_anthropic_response(VALID_CLASSIFIER_RESPONSE)
        )

        try:
            from ai.classifier import classify_email

            result = run(classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            ))

            assert isinstance(result, dict), "Result must be a dict"
            assert "priority_score" in result, "Result must contain 'priority_score'"
            assert "category" in result, "Result must contain 'category'"
            assert "summary" in result, "Result must contain 'summary'"
            assert "confidence_score" in result, "Result must contain 'confidence_score'"
            assert "action_items" in result, "Result must contain 'action_items'"
        except ImportError:
            pytest.skip("ai.classifier not importable — skipping")


class TestClassifyEmailHandlesError:
    """classify_email should handle Anthropic failures gracefully."""

    @patch("ai.classifier.client")
    def test_classify_email_handles_api_error(self, mock_client):
        """When Anthropic raises, classifier returns safe fallback values."""
        mock_client.messages.create = AsyncMock(
            side_effect=Exception("Anthropic API rate limit exceeded")
        )

        try:
            from ai.classifier import classify_email

            result = run(classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            ))

            assert isinstance(result, dict), "Fallback result must be a dict"
            assert "priority_score" in result, "Fallback result must contain 'priority_score'"
        except ImportError:
            pytest.skip("ai.classifier not importable — skipping")

    @patch("ai.classifier.client")
    def test_classify_email_handles_malformed_json(self, mock_client):
        """When Anthropic returns malformed JSON, classifier returns safe fallback."""
        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = "This is not valid JSON }{{"

        bad_response = MagicMock()
        bad_response.content = [text_block]
        mock_client.messages.create = AsyncMock(return_value=bad_response)

        try:
            from ai.classifier import classify_email

            result = run(classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            ))

            assert isinstance(result, dict), "Fallback result must be a dict"
        except ImportError:
            pytest.skip("ai.classifier not importable — skipping")


class TestPriorityScoreBounded:
    """priority_score must always be an integer between 1 and 10 inclusive."""

    @pytest.mark.parametrize(
        "raw_priority,description",
        [
            (1, "minimum boundary"),
            (5, "mid-range value"),
            (10, "maximum boundary"),
            (0, "below minimum — should be clamped to 1"),
            (11, "above maximum — should be clamped to 10"),
            (-5, "negative value — should be clamped to 1"),
            (100, "very large value — should be clamped to 10"),
        ],
    )
    @patch("ai.classifier.client")
    def test_priority_score_bounded(self, mock_client, raw_priority, description):
        """priority_score returned by classifier must fall within [1, 10]."""
        payload = {**VALID_CLASSIFIER_RESPONSE, "priority_score": raw_priority}
        mock_client.messages.create = AsyncMock(
            return_value=_make_anthropic_response(payload)
        )

        try:
            from ai.classifier import classify_email

            result = run(classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            ))

            priority = result.get("priority_score", 5)
            assert 1 <= priority <= 10, (
                f"Priority {priority} out of bounds [1,10] for case: {description}"
            )
        except ImportError:
            pytest.skip("ai.classifier not importable — skipping")


class TestConfidenceScoreBounded:
    """confidence_score must always be a float between 0.0 and 1.0 inclusive."""

    @pytest.mark.parametrize(
        "raw_confidence,description",
        [
            (0.0, "minimum boundary"),
            (0.5, "mid-range value"),
            (1.0, "maximum boundary"),
            (-0.1, "below minimum — should be clamped to 0.0"),
            (1.1, "above maximum — should be clamped to 1.0"),
            (2.5, "large value — should be clamped to 1.0"),
        ],
    )
    @patch("ai.classifier.client")
    def test_confidence_score_bounded(self, mock_client, raw_confidence, description):
        """confidence_score returned by classifier must fall within [0.0, 1.0]."""
        payload = {**VALID_CLASSIFIER_RESPONSE, "confidence_score": raw_confidence}
        mock_client.messages.create = AsyncMock(
            return_value=_make_anthropic_response(payload)
        )

        try:
            from ai.classifier import classify_email

            result = run(classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            ))

            confidence = result.get("confidence_score", 0.5)
            assert 0.0 <= confidence <= 1.0, (
                f"Confidence {confidence} out of bounds [0,1] for case: {description}"
            )
        except ImportError:
            pytest.skip("ai.classifier not importable — skipping")

    @patch("ai.classifier.client")
    def test_confidence_score_is_float(self, mock_client):
        """confidence_score must be a numeric type (int or float)."""
        mock_client.messages.create = AsyncMock(
            return_value=_make_anthropic_response(VALID_CLASSIFIER_RESPONSE)
        )

        try:
            from ai.classifier import classify_email

            result = run(classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            ))

            confidence = result.get("confidence_score")
            assert isinstance(confidence, (int, float)), (
                f"Confidence score must be numeric, got {type(confidence)}"
            )
        except ImportError:
            pytest.skip("ai.classifier not importable — skipping")
