from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional

import models
import schemas



def _generate_ticket_id(db: Session) -> str:
    """Generate the next sequential ticket id, e.g. TKT-001, TKT-002 ..."""
    last_ticket = db.query(models.Ticket).order_by(models.Ticket.id.desc()).first()
    next_num = (last_ticket.id + 1) if last_ticket else 1
    return f"TKT-{next_num:03d}"


def create_ticket(db: Session, ticket: schemas.TicketCreate) -> models.Ticket:
    db_ticket = models.Ticket(
        ticket_id=_generate_ticket_id(db),
        customer_name=ticket.customer_name,
        customer_email=ticket.customer_email,
        subject=ticket.subject,
        description=ticket.description,
        status="Open",
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


def get_tickets(db: Session, search: Optional[str] = None, status: Optional[str] = None):
    query = db.query(models.Ticket)

    if status:
        query = query.filter(models.Ticket.status == status)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.Ticket.customer_name.ilike(like),
                models.Ticket.customer_email.ilike(like),
                models.Ticket.ticket_id.ilike(like),
                models.Ticket.subject.ilike(like),
                models.Ticket.description.ilike(like),
            )
        )

    return query.order_by(models.Ticket.created_at.desc()).all()


def get_ticket_by_ticket_id(db: Session, ticket_id: str) -> Optional[models.Ticket]:
    # Eager-load notes so `/api/tickets/{ticket_id}` consistently returns `notes`
    # for Pydantic serialization.
    return (
        db.query(models.Ticket)
        .options(joinedload(models.Ticket.notes))
        .filter(models.Ticket.ticket_id == ticket_id)
        .first()
    )



def update_ticket(db: Session, ticket_id: str, update: schemas.TicketUpdate) -> Optional[models.Ticket]:
    db_ticket = get_ticket_by_ticket_id(db, ticket_id)
    if not db_ticket:
        return None

    if update.status:
        db_ticket.status = update.status

    if update.note:
        db_note = models.Note(ticket_id=db_ticket.id, note_text=update.note)
        db.add(db_note)

    db.commit()
    db.refresh(db_ticket)
    return db_ticket
