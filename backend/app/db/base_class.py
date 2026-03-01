"""
app/db/base_class.py
Declarative bases for SQLAlchemy models.
"""
from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """Main business logic Base class."""
    @declared_attr.directive
    def __tablename__(cls) -> str:  # noqa: N805
        return cls.__name__.lower()


class AuditBase(DeclarativeBase):
    """Base for audit/operational tables — separate from business models."""
    pass
