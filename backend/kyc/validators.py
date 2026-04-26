"""
File upload validators for KYC documents.
"""
from django.core.exceptions import ValidationError


ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def validate_document_file(file):
    """
    Validate that a file:
    1. Has an allowed extension (.pdf, .jpg, .jpeg, .png)
    2. Does not exceed 5 MB
    """
    import os

    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file type '{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    if file.size > MAX_FILE_SIZE:
        raise ValidationError(
            f"File size {file.size / (1024 * 1024):.2f} MB exceeds the 5 MB limit."
        )

    return file
