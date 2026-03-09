"""
app/models/session.py
Session model — groups queues for a specific date within an organization.

Design:
  - session_date (date, not datetime) represents the day the session is for
  - org_id + session_date is unique — only one session per date per org
  - title is optional descriptive label (e.g. "Morning Clinic")
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Session(Base):
    __tablename__ = "sessions"

    __table_args__ = (
        UniqueConstraint("org_id", "session_date", name="uq_session_org_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=True, default="")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────
    queues: Mapped[list["Queue"]] = relationship(
        "Queue", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} date={self.session_date} org={self.org_id}>"
