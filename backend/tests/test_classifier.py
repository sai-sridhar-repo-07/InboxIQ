"""
Unit tests for the AI email classifier.

Uses unittest.mock to patch OpenAI API calls so tests run without
a live API key and execute deterministically.
"""
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
    "priority": 9,
    "category": "enterprise_client",
    "summary": "Client requires signed contract renewal by Friday EOD.",
    "confidence_score": 0.95,
    "action_items": ["Review and sign contract documents", "Reply to confirm receipt"],
    "draft_reply": (
        "Hi Sarah, thank you for the reminder. "
        "I will have the signed documents back to you by Thursday EOD."
    ),
}


def _make_mock_openai_response(content: dict) -> MagicMock:
    """Build a mock that mimics openai ChatCompletion response structure."""
    import json

    mock_message = MagicMock()
    mock_message.content = json.dumps(content)

    mock_choice = MagicMock()
    mock_choice.message = mock_message

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestClassifyEmailReturnsValidStructure:
    """classify_email should return a dict with all required fields."""

    @patch("services.ai_classifier.openai_client")
    def test_classify_email_returns_valid_structure(self, mock_openai):
        """Mocked OpenAI returns a well-formed response; classifier parses it correctly."""
        mock_openai.chat.completions.create = MagicMock(
            return_value=_make_mock_openai_response(VALID_CLASSIFIER_RESPONSE)
        )

        # Import here so the patch is already active when the module loads
        try:
            from services.ai_classifier import classify_email

            result = classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            )

            assert isinstance(result, dict), "Result must be a dict"
            assert "priority" in result, "Result must contain 'priority'"
            assert "category" in result, "Result must contain 'category'"
            assert "summary" in result, "Result must contain 'summary'"
            assert "confidence_score" in result, "Result must contain 'confidence_score'"
            assert "action_items" in result, "Result must contain 'action_items'"
        except ImportError:
            pytest.skip("services.ai_classifier not yet implemented — skipping")


class TestClassifyEmailHandlesError:
    """classify_email should handle OpenAI failures gracefully."""

    @patch("services.ai_classifier.openai_client")
    def test_classify_email_handles_openai_error(self, mock_openai):
        """When OpenAI raises an exception, classifier returns safe fallback values."""
        mock_openai.chat.completions.create = MagicMock(
            side_effect=Exception("OpenAI API rate limit exceeded")
        )

        try:
            from services.ai_classifier import classify_email

            result = classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            )

            # Should not raise; must return a dict with at minimum a priority field
            assert isinstance(result, dict), "Fallback result must be a dict"
            assert "priority" in result, "Fallback result must contain 'priority'"
        except ImportError:
            pytest.skip("services.ai_classifier not yet implemented — skipping")

    @patch("services.ai_classifier.openai_client")
    def test_classify_email_handles_malformed_json(self, mock_openai):
        """When OpenAI returns malformed JSON, classifier returns safe fallback."""
        bad_response = MagicMock()
        bad_response.choices = [MagicMock()]
        bad_response.choices[0].message.content = "This is not valid JSON }{{"
        mock_openai.chat.completions.create = MagicMock(return_value=bad_response)

        try:
            from services.ai_classifier import classify_email

            result = classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            )

            assert isinstance(result, dict), "Fallback result must be a dict"
        except ImportError:
            pytest.skip("services.ai_classifier not yet implemented — skipping")


class TestPriorityScoreBounded:
    """Priority score must always be an integer between 1 and 10 inclusive."""

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
    @patch("services.ai_classifier.openai_client")
    def test_priority_score_bounded(self, mock_openai, raw_priority, description):
        """Priority returned by classifier must fall within [1, 10]."""
        payload = {**VALID_CLASSIFIER_RESPONSE, "priority": raw_priority}
        mock_openai.chat.completions.create = MagicMock(
            return_value=_make_mock_openai_response(payload)
        )

        try:
            from services.ai_classifier import classify_email

            result = classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            )

            priority = result.get("priority", 5)
            assert 1 <= priority <= 10, (
                f"Priority {priority} out of bounds [1,10] for case: {description}"
            )
        except ImportError:
            pytest.skip("services.ai_classifier not yet implemented — skipping")


class TestConfidenceScoreBounded:
    """Confidence score must always be a float between 0.0 and 1.0 inclusive."""

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
    @patch("services.ai_classifier.openai_client")
    def test_confidence_score_bounded(self, mock_openai, raw_confidence, description):
        """Confidence returned by classifier must fall within [0.0, 1.0]."""
        payload = {**VALID_CLASSIFIER_RESPONSE, "confidence_score": raw_confidence}
        mock_openai.chat.completions.create = MagicMock(
            return_value=_make_mock_openai_response(payload)
        )

        try:
            from services.ai_classifier import classify_email

            result = classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            )

            confidence = result.get("confidence_score", 0.5)
            assert 0.0 <= confidence <= 1.0, (
                f"Confidence {confidence} out of bounds [0,1] for case: {description}"
            )
        except ImportError:
            pytest.skip("services.ai_classifier not yet implemented — skipping")

    @patch("services.ai_classifier.openai_client")
    def test_confidence_score_is_float(self, mock_openai):
        """Confidence score must be a numeric type (int or float)."""
        mock_openai.chat.completions.create = MagicMock(
            return_value=_make_mock_openai_response(VALID_CLASSIFIER_RESPONSE)
        )

        try:
            from services.ai_classifier import classify_email

            result = classify_email(
                subject=SAMPLE_EMAIL["subject"],
                body=SAMPLE_EMAIL["body"],
                sender=SAMPLE_EMAIL["sender"],
            )

            confidence = result.get("confidence_score")
            assert isinstance(confidence, (int, float)), (
                f"Confidence score must be numeric, got {type(confidence)}"
            )
        except ImportError:
            pytest.skip("services.ai_classifier not yet implemented — skipping")
