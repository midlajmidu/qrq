from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.core.security import hash_password, verify_password
from app.db.deps import get_db
from app.models.organization import Organization
from app.models.user import User

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────

class OrganizationSettingsResponse(BaseModel):
    name: str
    slug: str
    email: str
    address: Optional[str] = None
    phone_number: Optional[str] = None

    model_config = {"from_attributes": True}

class OrganizationSettingsUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=1000)
    phone_number: Optional[str] = Field(None, max_length=30)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class SuccessResponse(BaseModel):
    message: str

# ── Endpoints ──────────────────────────────────────────────────────

@router.get("/settings", response_model=OrganizationSettingsResponse)
async def get_organization_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the clinic settings for the currently authenticated admin's organization."""
    if not current_user.org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User does not belong to an organization")
    
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    return OrganizationSettingsResponse(
        name=org.name,
        slug=org.slug,
        email=current_user.email,
        address=org.address,
        phone_number=org.phone_number
    )

@router.put("/settings", response_model=OrganizationSettingsResponse)
async def update_organization_settings(
    data: OrganizationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update the clinic settings. Accessible by admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization admins can update settings")
        
    if not current_user.org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User does not belong to an organization")
        
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id).with_for_update())
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org.name = data.name
    org.address = data.address
    org.phone_number = data.phone_number
    
    await db.flush()

    return OrganizationSettingsResponse(
        name=org.name,
        slug=org.slug,
        email=current_user.email,
        address=org.address,
        phone_number=org.phone_number
    )

@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Change the admin's own password."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    result = await db.execute(select(User).where(User.id == current_user.id).with_for_update())
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    from datetime import datetime, timezone
    user.password_changed_at = datetime.now(timezone.utc)
    await db.flush()

    return SuccessResponse(message="Password changed successfully")
