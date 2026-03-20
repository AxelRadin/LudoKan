from enum import StrEnum


class TicketPermission(StrEnum):
    CHANGE_STATUS = "ticket.change_status"
    CHANGE_DATA = "ticket.change_data"


TICKET_NOT_FOUND_MESSAGE = "Ticket not found."
