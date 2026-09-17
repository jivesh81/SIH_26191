"""
SMS Provider Abstraction for Aapda Setu.

Defines the interface for SMS providers and implements Mock and Twilio providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional


@dataclass
class SMSSendResult:
    """Result of an SMS send operation."""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    status: str = "queued"  # queued, sent, delivered, failed


class SMSProvider(ABC):
    """Abstract base class for SMS providers."""

    @abstractmethod
    def send_sms(
        self,
        to_number: str,
        from_number: str,
        body: str,
    ) -> SMSSendResult:
        """
        Send a single SMS message.

        Args:
            to_number: Destination phone number (E.164 format preferred)
            from_number: Sender phone number (must be verified with provider)
            body: Message content

        Returns:
            SMSSendResult with success status and provider message ID
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name for logging."""
        pass


class MockSMSProvider(SMSProvider):
    """Mock SMS provider for demo/testing - always succeeds."""

    def send_sms(
        self,
        to_number: str,
        from_number: str,
        body: str,
    ) -> SMSSendResult:
        import uuid
        return SMSSendResult(
            success=True,
            message_id=f"mock_{uuid.uuid4().hex[:8]}",
            status="sent",
        )

    def get_provider_name(self) -> str:
        return "mock"


class TwilioSMSProvider(SMSProvider):
    """Twilio SMS provider implementation."""

    def __init__(
        self,
        account_sid: str,
        auth_token: str,
        from_number: str,
    ):
        if not account_sid or not auth_token or not from_number:
            raise ValueError(
                "TwilioSMSProvider requires account_sid, auth_token, and from_number"
            )
        self._account_sid = account_sid
        self._auth_token = auth_token
        self._from_number = from_number
        self._client = None

    def _get_client(self):
        """Lazy-initialize Twilio client."""
        if self._client is None:
            from twilio.rest import Client
            self._client = Client(self._account_sid, self._auth_token)
        return self._client

    def send_sms(
        self,
        to_number: str,
        from_number: str,
        body: str,
    ) -> SMSSendResult:
        try:
            client = self._get_client()

            # Use the configured from_number, not the parameter (for security)
            message = client.messages.create(
                body=body,
                from_=self._from_number,
                to=to_number,
            )

            # Twilio statuses: queued, sending, sent, failed, delivered, undelivered
            status = message.status
            return SMSSendResult(
                success=status not in ("failed", "undelivered"),
                message_id=message.sid,
                status=status,
            )

        except Exception as e:
            # Never expose credentials in error messages
            error_msg = str(e)
            if self._auth_token in error_msg:
                error_msg = error_msg.replace(self._auth_token, "[REDACTED]")
            if self._account_sid in error_msg:
                error_msg = error_msg.replace(self._account_sid, "[REDACTED]")

            return SMSSendResult(
                success=False,
                error=f"Twilio send failed: {error_msg}",
                status="failed",
            )

    def get_provider_name(self) -> str:
        return "twilio"


def create_sms_provider() -> SMSProvider:
    """
    Factory function to create the appropriate SMS provider based on configuration.

    Reads from app.core.config.settings.
    """
    from app.core.config import settings

    provider_name = settings.SMS_PROVIDER.lower()

    if provider_name == "twilio":
        # Validate required credentials
        if not settings.SMS_TWILIO_ACCOUNT_SID:
            raise ValueError(
                "SMS_PROVIDER=twilio but SMS_TWILIO_ACCOUNT_SID is not configured"
            )
        if not settings.SMS_TWILIO_AUTH_TOKEN:
            raise ValueError(
                "SMS_PROVIDER=twilio but SMS_TWILIO_AUTH_TOKEN is not configured"
            )
        if not settings.SMS_TWILIO_FROM_NUMBER:
            raise ValueError(
                "SMS_PROVIDER=twilio but SMS_TWILIO_FROM_NUMBER is not configured"
            )

        return TwilioSMSProvider(
            account_sid=settings.SMS_TWILIO_ACCOUNT_SID,
            auth_token=settings.SMS_TWILIO_AUTH_TOKEN,
            from_number=settings.SMS_TWILIO_FROM_NUMBER,
        )

    # Default to mock for any other value (including "mock")
    return MockSMSProvider()