import logging
import uuid

from app.models.user import User


logger = logging.getLogger(__name__)


class DevelopmentOTPDelivery:
    """Replaceable development-only delivery adapter; it never sends real messages."""

    @staticmethod
    def deliver(user: User, challenge_id: uuid.UUID, otp: str) -> None:
        logger.warning(
            "[DEVELOPMENT ONLY] OTP generated for challenge=%s otp=%s",
            challenge_id,
            otp,
        )


otp_delivery = DevelopmentOTPDelivery()