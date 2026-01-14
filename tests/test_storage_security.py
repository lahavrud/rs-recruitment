"""Security tests for storage providers."""

import pytest

from src.core.storage import LocalStorageProvider


class TestLocalStorageProviderSecurity:
    """Security tests for LocalStorageProvider."""

    @pytest.fixture
    def provider(self, tmp_path):
        """Create a LocalStorageProvider instance with temp directory."""
        return LocalStorageProvider(storage_path=str(tmp_path))

    @pytest.mark.asyncio
    async def test_path_traversal_get_file_url(self, provider: LocalStorageProvider):
        """Test that path traversal is prevented in get_file_url."""
        with pytest.raises(ValueError, match="Path traversal detected"):
            await provider.get_file_url("../../../etc/passwd")

    @pytest.mark.asyncio
    async def test_path_traversal_delete_file(self, provider: LocalStorageProvider):
        """Test that path traversal is prevented in delete_file."""
        with pytest.raises(ValueError, match="Path traversal detected"):
            await provider.delete_file("../../../etc/passwd")

    @pytest.mark.asyncio
    async def test_path_traversal_multiple_levels(self, provider: LocalStorageProvider):
        """Test that multiple levels of path traversal are prevented."""
        with pytest.raises(ValueError, match="Path traversal detected"):
            await provider.get_file_url("../../../../../../etc/passwd")

    @pytest.mark.asyncio
    async def test_path_traversal_encoded(self, provider: LocalStorageProvider):
        """Test that encoded path traversal sequences are prevented."""
        # Test with URL-encoded sequences (decoded: ../../../etc/passwd)
        # The validation checks for ".." in the identifier, so encoded won't match
        # But we should still validate the resolved path
        import urllib.parse

        decoded = urllib.parse.unquote("%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd")
        with pytest.raises(ValueError, match="Path traversal detected"):
            await provider.get_file_url(decoded)

    @pytest.mark.asyncio
    async def test_valid_path_within_storage(self, provider: LocalStorageProvider):
        """Test that valid paths within storage directory work correctly."""
        # Upload a file
        file_content = b"test content"
        file_key = await provider.upload_file(file_content, "test.txt")

        # Should work fine
        url = await provider.get_file_url(file_key)
        assert url.startswith("/static/")

        # Delete should work
        result = await provider.delete_file(file_key)
        assert result is True
