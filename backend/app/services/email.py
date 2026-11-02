"""Amazon SES client for sending transactional emails.

Uses the standard AWS credential provider chain – no static access keys.
In EKS, credentials are obtained automatically through EKS Pod Identity.
In local development, the developer's configured AWS profile/credentials are used.

If SES is not configured (no sender email), the service raises EmailSendError
so that callers can treat email as a hard dependency where required.
"""

import logging
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


class EmailSendError(Exception):
    """Raised when an email cannot be sent via Amazon SES."""

    pass


def _build_ses_client():
    """Create a boto3 SES v2 client using the configured region."""
    return boto3.client(
        "sesv2",
        region_name=settings.aws_region,
        config=BotoConfig(
            retries={"mode": "standard", "max_attempts": 3},
        ),
    )


# Module-level client – boto3 clients are thread-safe and should be reused.
_ses_client = _build_ses_client()


class EmailService:
    """Service for sending transactional emails via Amazon SES."""

    def __init__(self) -> None:
        self._client = _ses_client
        self._sender = settings.ses_sender_email
        self._frontend_url = settings.frontend_url

    @property
    def is_configured(self) -> bool:
        """Return True if SES sender email is configured."""
        return bool(self._sender)

    async def send_verification_email(
        self, *, to_email: str, username: str, token: str
    ) -> None:
        """Send a verification email containing the verification token.

        Args:
            to_email: Recipient email address.
            username: The registered username (for personalisation).
            token: The verification token (URL-safe string).
        """
        verification_link = f"{self._frontend_url}/verify-email?token={token}"
        subject = "Verify your email address"
        body_html = _render_verification_email(
            username=username, link=verification_link
        )

        await self._send(to=to_email, subject=subject, body_html=body_html)

    async def send_password_reset_email(
        self, *, to_email: str, username: str, token: str
    ) -> None:
        """Send a password reset email containing the reset token.

        Args:
            to_email: Recipient email address.
            username: The registered username (for personalisation).
            token: The password-reset token (URL-safe string).
        """
        reset_link = f"{self._frontend_url}/reset-password?token={token}"
        subject = "Reset your password"
        body_html = _render_password_reset_email(username=username, link=reset_link)

        await self._send(to=to_email, subject=subject, body_html=body_html)

    async def _send(self, *, to: str, subject: str, body_html: str) -> None:
        """Send an email via SES, or log it if SES is not configured.

        Args:
            to: Recipient email address.
            subject: Email subject line.
            body_html: HTML body of the email.
        Raises:
            EmailSendError: if SES is configured but the send fails.
        """
        if not self.is_configured:
            logger.error(
                "SES sender email not configured – cannot send email to %s",
                to,
            )
            raise EmailSendError("SES sender email not configured (SES_SENDER_EMAIL)")

        try:
            self._client.send_email(
                FromEmailAddress=self._sender,
                Destination={"ToAddresses": [to]},
                Content={
                    "Simple": {
                        "Subject": {"Data": subject, "Charset": "UTF-8"},
                        "Body": {"Html": {"Data": body_html, "Charset": "UTF-8"}},
                    },
                },
            )
            logger.info("Email sent to %s: subject=%r", to, subject)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "Unknown")
            logger.error(
                "Failed to send email to %s (code=%s): %s",
                to,
                error_code,
                exc,
            )
            raise EmailSendError(
                f"Failed to send email to {to} (code={error_code})"
            ) from exc


# ── health-check helper ────────────────────────────────────────────────────


def check_ses_connection() -> dict:
    """Verify SES connectivity.

    Returns a dict with keys:
        connected  – bool
        region     – str
        error      – str | None
    """
    result = {
        "connected": False,
        "region": settings.aws_region,
        "sender": settings.ses_sender_email or "(not configured)",
        "error": None,
    }

    if not settings.ses_sender_email:
        result["error"] = "SES sender email not configured (SES_SENDER_EMAIL)"
        return result

    try:
        # getSendQuota is a lightweight check – doesn't send anything
        _ses_client.get_send_quota()
        result["connected"] = True
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "Unknown")
        result["error"] = (
            f"SES error ({error_code}): "
            f"{exc.response.get('Error', {}).get('Message', str(exc))}"
        )
    except Exception as exc:
        result["error"] = f"SES unreachable: {exc}"

    return result


# ── email templates (inline for simplicity) ────────────────────────────────


def _render_verification_email(*, username: str, link: str) -> str:
    return f"""\
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Welcome, {username}!</h2>
  <p>Thank you for creating an account. Please verify your email address by
     clicking the button below:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{link}"
       style="background-color: #4F46E5; color: white; padding: 12px 32px;
              text-decoration: none; border-radius: 6px; font-size: 16px;">
       Verify Email
    </a>
  </p>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #4F46E5;">{link}</p>
  <p>This link will expire in 24 hours.</p>
  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
  <p style="color: #6B7280; font-size: 12px;">
    If you did not create this account, you can safely ignore this email.
  </p>
</body>
</html>"""


def _render_password_reset_email(*, username: str, link: str) -> str:
    return f"""\
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Password Reset</h2>
  <p>Hi {username},</p>
  <p>We received a request to reset your password. Click the button below to
     set a new password:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{link}"
       style="background-color: #4F46E5; color: white; padding: 12px 32px;
              text-decoration: none; border-radius: 6px; font-size: 16px;">
       Reset Password
    </a>
  </p>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #4F46E5;">{link}</p>
  <p>This link will expire in 30 minutes.</p>
  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
  <p style="color: #6B7280; font-size: 12px;">
    If you did not request a password reset, you can safely ignore this email.
  </p>
</body>
</html>"""
