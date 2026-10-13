import os
import sys
from dotenv import load_dotenv

load_dotenv("c:/Users/Asus/Desktop/attendance approval/backend/.env")

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase_bucket = os.getenv("SUPABASE_BUCKET")

print(f"URL: '{supabase_url}'")
print(f"KEY: '{supabase_key[:10]}...' if key else None")
print(f"BUCKET: '{supabase_bucket}'")

try:
    from supabase import create_client
    supabase = create_client(supabase_url, supabase_key)
    res = supabase.storage.list_buckets()
    print("Buckets:", res)
except Exception as e:
    print("Error:", type(e), e)
