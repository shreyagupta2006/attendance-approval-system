import os
import uuid
import logging
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

logger = logging.getLogger("storage")
logger.setLevel(logging.INFO)

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png"
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


MIME_TO_EXT_AND_CANONICAL = {
    "application/pdf": (".pdf", "application/pdf"),
    "image/jpeg": (".jpg", "image/jpeg"),
    "image/jpg": (".jpg", "image/jpeg"),
    "image/png": (".png", "image/png"),
}

EXT_TO_MIME_AND_CANONICAL = {
    ".pdf": (".pdf", "application/pdf"),
    ".jpg": (".jpg", "image/jpeg"),
    ".jpeg": (".jpg", "image/jpeg"),
    ".png": (".png", "image/png"),
}


def get_normalized_supabase_url() -> Optional[str]:
    """Returns normalized Supabase URL ensuring proper domain format."""
    from dotenv import load_dotenv
    load_dotenv(override=True)
    url = os.getenv("SUPABASE_URL") or settings.SUPABASE_URL
    if not url or "mock" in url.lower():
        return None
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = f"https://{url}"
    # Handle missing dot before supabase.co if present
    if "supabase.co" in url and ".supabase.co" not in url:
        url = url.replace("supabase.co", ".supabase.co")
    return url


def validate_file(file: UploadFile) -> Tuple[str, str]:
    """
    Validates file MIME type and extension.
    Returns (normalized_content_type, file_extension).
    """
    content_type = (file.content_type or "").lower().strip()
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if content_type in MIME_TO_EXT_AND_CANONICAL:
        norm_ext, norm_mime = MIME_TO_EXT_AND_CANONICAL[content_type]
        return norm_mime, norm_ext

    if ext in EXT_TO_MIME_AND_CANONICAL:
        norm_ext, norm_mime = EXT_TO_MIME_AND_CANONICAL[ext]
        return norm_mime, norm_ext

    logger.warning(f"[FILE VALIDATION FAILURE] Unsupported file format. Content-type: '{content_type}', Filename: '{filename}'")
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported file format '{content_type or ext}'. Only PDF, JPG, JPEG, and PNG files are permitted."
    )


class StorageService:
    _supabase_client = None
    _signed_url_cache = {}  # {storage_path: (signed_url_or_none, expire_timestamp)}

    @classmethod
    def get_supabase_client(cls):
        if cls._supabase_client is not None:
            return cls._supabase_client

        from dotenv import load_dotenv
        load_dotenv(override=True)
        url = get_normalized_supabase_url()
        key = os.getenv("SUPABASE_KEY") or settings.SUPABASE_KEY

        if not url:
            logger.error("[STORAGE CONFIG ERROR] SUPABASE_URL is missing or set to mock value.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase Storage configuration error: SUPABASE_URL is not configured."
            )
        if not key or "mock" in key.lower():
            logger.error("[STORAGE CONFIG ERROR] SUPABASE_KEY is missing or set to mock value.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase Storage configuration error: SUPABASE_KEY is not configured."
            )

        try:
            from supabase import create_client
            cls._supabase_client = create_client(url, key)
            return cls._supabase_client
        except Exception as e:
            logger.error(f"[STORAGE SDK ERROR] Failed to initialize Supabase client: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to initialize Supabase storage client: {str(e)}"
            )

    @staticmethod
    async def upload_document_binary(
        content: bytes,
        storage_path: str,
        content_type: str
    ) -> Tuple[str, int]:
        """
        Uploads file binary directly to private Supabase Storage bucket.
        Returns (storage_path, file_size_bytes).
        Raises HTTPException if upload fails with detailed diagnostic logging.
        """
        file_size = len(content)
        if file_size > MAX_FILE_SIZE_BYTES:
            logger.warning(f"[FILE VALIDATION ERROR] File size {file_size} bytes exceeds 10MB limit.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds 10MB limit (Uploaded size: {round(file_size / (1024*1024), 2)}MB)."
            )

        if file_size == 0:
            logger.warning("[FILE VALIDATION ERROR] Uploaded file binary is empty.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )

        from urllib.parse import urlparse
        supabase = StorageService.get_supabase_client()
        bucket_name = os.getenv("SUPABASE_BUCKET") or settings.SUPABASE_BUCKET
        url = get_normalized_supabase_url()
        key = os.getenv("SUPABASE_KEY") or settings.SUPABASE_KEY
        key_prefix = key[:10] + "..." if key else "None"
        hostname = urlparse(url).netloc if url else "Unknown"

        diagnostic_info = f"[SUPABASE DIAGNOSTIC] Upload Method: 'upload_document_binary' | Hostname: '{hostname}' | Bucket: '{bucket_name}' | Key Prefix: '{key_prefix}'"
        logger.info(diagnostic_info)
        print(diagnostic_info, flush=True)

        try:
            logger.info(f"[SUPABASE UPLOAD ATTEMPT] Bucket: '{bucket_name}', Path: '{storage_path}', Content-Type: '{content_type}', Size: {file_size} bytes")
            from starlette.concurrency import run_in_threadpool
            def _do_upload():
                supabase.storage.from_(bucket_name).upload(
                    path=storage_path,
                    file=content,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
            await run_in_threadpool(_do_upload)
            logger.info(f"[SUPABASE UPLOAD SUCCESS] Uploaded '{storage_path}' to bucket '{bucket_name}'.")
            return storage_path, file_size
        except Exception as e:
            err_msg = str(e)
            err_type = type(e).__name__

            if "403" in err_msg or "Unauthorized" in err_msg or "row-level security" in err_msg or "Permission" in err_msg:
                category = "PERMISSION / RLS POLICY ERROR (403)"
                detail_msg = f"Supabase Storage permission error: {err_msg}. Check bucket RLS policy or key permissions."
            elif "404" in err_msg or "not found" in err_msg.lower():
                category = "BUCKET NOT FOUND (404)"
                detail_msg = f"Supabase Storage bucket '{bucket_name}' not found: {err_msg}."
            elif "401" in err_msg or "Invalid API key" in err_msg or "jwt" in err_msg.lower():
                category = "AUTHENTICATION / KEY ERROR (401)"
                detail_msg = f"Supabase Storage authentication failed: Invalid SUPABASE_KEY."
            else:
                category = "SUPABASE API / UPLOAD ERROR"
                detail_msg = f"Supabase Storage upload error: {err_msg}"

            logger.error(f"[SUPABASE FAILURE LOG] Category: {category} | Exception: {err_type} | Details: {err_msg}")

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=detail_msg
            )

    @staticmethod
    async def upload_document(
        file: UploadFile,
        folder: str = "applications",
        sub_folder: Optional[str] = None
    ) -> Tuple[str, int, str]:
        """
        Validates file and uploads to Supabase Storage.
        Returns (storage_path, file_size_bytes, normalized_content_type).
        """
        content_type, ext = validate_file(file)
        content = await file.read()
        unique_filename = f"{uuid.uuid4()}{ext}"

        if sub_folder:
            storage_path = f"{folder}/{sub_folder}/{unique_filename}"
        else:
            storage_path = f"{folder}/{unique_filename}"

        storage_path, file_size = await StorageService.upload_document_binary(content, storage_path, content_type)
        return storage_path, file_size, content_type

    @classmethod
    def get_signed_url(cls, storage_path: str, expires_in_seconds: int = 3600) -> Optional[str]:
        """Returns signed URL for accessing document securely from private Supabase Storage bucket"""
        if not storage_path:
            return None

        import time
        now = time.time()

        if storage_path in cls._signed_url_cache:
            cached_url, expire_at = cls._signed_url_cache[storage_path]
            if now < expire_at:
                return cached_url

        try:
            supabase = cls.get_supabase_client()
            bucket_name = os.getenv("SUPABASE_BUCKET") or settings.SUPABASE_BUCKET
            res = supabase.storage.from_(bucket_name).create_signed_url(
                path=storage_path,
                expires_in=expires_in_seconds
            )
            signed_url = None
            if isinstance(res, dict):
                if "signedURL" in res:
                    signed_url = res["signedURL"]
                elif "signed_url" in res:
                    signed_url = res["signed_url"]
            elif hasattr(res, "signed_url"):
                signed_url = res.signed_url
            elif hasattr(res, "signedURL"):
                signed_url = res.signedURL

            ttl = 3000 if signed_url else 120
            cls._signed_url_cache[storage_path] = (signed_url, now + ttl)
            return signed_url
        except Exception as e:
            logger.warning(f"Could not generate signed URL for '{storage_path}': {e}")
            cls._signed_url_cache[storage_path] = (None, now + 120)

        return None

    @staticmethod
    def delete_document(storage_path: str) -> bool:
        """Deletes object from Supabase Storage (e.g. for rollback on DB failure)"""
        url = get_normalized_supabase_url()
        key = os.getenv("SUPABASE_KEY") or settings.SUPABASE_KEY
        bucket = os.getenv("SUPABASE_BUCKET") or settings.SUPABASE_BUCKET
        if url and key and "mock" not in key.lower():
            try:
                from supabase import create_client
                supabase = create_client(url, key)
                supabase.storage.from_(bucket).remove([storage_path])
                logger.info(f"[SUPABASE DELETE SUCCESS] Cleaned up path: '{storage_path}'")
                return True
            except Exception as e:
                logger.error(f"[SUPABASE DELETE ERROR] Failed to clean up path: '{storage_path}': {e}")
        return False


