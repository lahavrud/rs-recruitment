"""Unit tests for custom exception classes."""

import pytest

from src.services.exceptions import (
    AuthError,
    EmailAlreadyExistsError,
    InactiveUserError,
    InvalidCredentialsError,
)


class TestExceptionHierarchy:
    """Tests for exception inheritance hierarchy."""

    def test_email_already_exists_error_inherits_from_auth_error(self):
        """Test that EmailAlreadyExistsError inherits from AuthError."""
        assert issubclass(EmailAlreadyExistsError, AuthError)
        assert issubclass(EmailAlreadyExistsError, Exception)

    def test_invalid_credentials_error_inherits_from_auth_error(self):
        """Test that InvalidCredentialsError inherits from AuthError."""
        assert issubclass(InvalidCredentialsError, AuthError)
        assert issubclass(InvalidCredentialsError, Exception)

    def test_inactive_user_error_inherits_from_auth_error(self):
        """Test that InactiveUserError inherits from AuthError."""
        assert issubclass(InactiveUserError, AuthError)
        assert issubclass(InactiveUserError, Exception)

    def test_auth_error_inherits_from_exception(self):
        """Test that AuthError inherits from Exception."""
        assert issubclass(AuthError, Exception)

    def test_exception_inheritance_chain(self):
        """Test that exception inheritance chain is correct."""
        # EmailAlreadyExistsError -> AuthError -> Exception
        assert EmailAlreadyExistsError.__bases__ == (AuthError,)
        assert AuthError.__bases__ == (Exception,)

        # InvalidCredentialsError -> AuthError -> Exception
        assert InvalidCredentialsError.__bases__ == (AuthError,)

        # InactiveUserError -> AuthError -> Exception
        assert InactiveUserError.__bases__ == (AuthError,)


class TestEmailAlreadyExistsError:
    """Tests for EmailAlreadyExistsError exception."""

    def test_email_already_exists_error_message_includes_email(self):
        """Test that exception message includes email."""
        email = "test@example.com"
        error = EmailAlreadyExistsError(email)

        assert email in str(error)
        assert "already registered" in str(error).lower()

    def test_email_already_exists_error_email_attribute(self):
        """Test that email attribute is set correctly."""
        email = "user@example.com"
        error = EmailAlreadyExistsError(email)

        assert error.email == email

    def test_email_already_exists_error_can_be_raised_and_caught(self):
        """Test that exception can be raised and caught."""
        email = "test@example.com"

        with pytest.raises(EmailAlreadyExistsError) as exc_info:
            raise EmailAlreadyExistsError(email)

        assert exc_info.value.email == email
        assert email in str(exc_info.value)

    def test_email_already_exists_error_can_be_caught_as_auth_error(self):
        """Test that exception can be caught as AuthError."""
        email = "test@example.com"

        with pytest.raises(AuthError):
            raise EmailAlreadyExistsError(email)


class TestInvalidCredentialsError:
    """Tests for InvalidCredentialsError exception."""

    def test_invalid_credentials_error_message(self):
        """Test that exception message is appropriate."""
        error = InvalidCredentialsError()

        # Should have a message (inherited from Exception)
        assert str(error) is not None

    def test_invalid_credentials_error_can_be_raised_and_caught(self):
        """Test that exception can be raised and caught."""
        with pytest.raises(InvalidCredentialsError) as exc_info:
            raise InvalidCredentialsError()

        assert isinstance(exc_info.value, InvalidCredentialsError)

    def test_invalid_credentials_error_can_be_caught_as_auth_error(self):
        """Test that exception can be caught as AuthError."""
        with pytest.raises(AuthError):
            raise InvalidCredentialsError()


class TestInactiveUserError:
    """Tests for InactiveUserError exception."""

    def test_inactive_user_error_message(self):
        """Test that exception message is appropriate."""
        error = InactiveUserError()

        # Should have a message (inherited from Exception)
        assert str(error) is not None

    def test_inactive_user_error_can_be_raised_and_caught(self):
        """Test that exception can be raised and caught."""
        with pytest.raises(InactiveUserError) as exc_info:
            raise InactiveUserError()

        assert isinstance(exc_info.value, InactiveUserError)

    def test_inactive_user_error_can_be_caught_as_auth_error(self):
        """Test that exception can be caught as AuthError."""
        with pytest.raises(AuthError):
            raise InactiveUserError()


class TestExceptionMessageFormatting:
    """Tests for exception message formatting."""

    def test_exception_messages_are_user_friendly(self):
        """Test that exception messages are user-friendly."""
        # EmailAlreadyExistsError should have clear message
        email_error = EmailAlreadyExistsError("user@example.com")
        assert "user@example.com" in str(email_error)
        error_msg = str(email_error).lower()
        assert "already" in error_msg or "registered" in error_msg

        # Other errors should have messages
        invalid_creds_error = InvalidCredentialsError()
        assert len(str(invalid_creds_error)) > 0

        inactive_user_error = InactiveUserError()
        assert len(str(inactive_user_error)) > 0

    def test_exception_messages_include_relevant_context(self):
        """Test that exception messages include relevant context."""
        # EmailAlreadyExistsError includes email
        email = "context@example.com"
        error = EmailAlreadyExistsError(email)
        message = str(error)

        assert email in message
        # Message should be informative
        assert len(message) > len(email)
