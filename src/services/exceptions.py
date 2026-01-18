"""Custom domain exceptions for service layer."""


class AuthError(Exception):
    """Base exception for authentication-related errors."""

    pass


class EmailAlreadyExistsError(AuthError):
    """Raised when attempting to register with an email that already exists."""

    def __init__(self, email: str) -> None:
        self.email = email
        super().__init__(f"Email {email} is already registered")


class InvalidCredentialsError(AuthError):
    """Raised when login credentials are invalid."""

    pass


class InactiveUserError(AuthError):
    """Raised when attempting to authenticate an inactive user."""

    pass


class CompanyNotFoundError(Exception):
    """Raised when a company user is not found."""

    pass


class CompanyNotPendingError(Exception):
    """Raised when attempting to approve/reject a company that is not pending."""

    pass
