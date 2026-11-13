#!/usr/bin/env python3
"""
E-RISE Platform - Resend Email Test & Verification Script
Target email: erise.club@hns-re2sd.dz
"""

import os
import sys
import json
import urllib.request
import urllib.error

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
TARGET_EMAIL = "erise.club@hns-re2sd.dz"

def send_test_email(api_key: str, to_email: str):
    print(f"[*] Preparing E-RISE confirmation email for: {to_email}")
    
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "from": "E-RISE Platform <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "E-RISE Meeting Platform - Account Confirmation & Verification",
        "html": f"""
        <div style="font-family: Arial, sans-serif; background-color: #0B1320; color: #FFFFFF; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #00838F;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #00838F; margin: 0; font-size: 28px;">E-RISE PLATFORM</h1>
                <p style="color: #94A3B8; font-size: 14px; margin-top: 4px;">Hybrid Discord & Google Meet Broadcasting</p>
            </div>
            <div style="background-color: #142238; padding: 25px; border-radius: 8px; border: 1px solid rgba(0, 131, 143, 0.3);">
                <h3 style="color: #FFFFFF; margin-top: 0;">Welcome, E-RISE Member!</h3>
                <p style="color: #CBD5E1; line-height: 1.6;">Your account has been verified. You can now host live broadcasting sessions, invite up to 10 participants, configure custom room caps, and use Discord-style presence.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://e-rise-platform.web.app" style="background-color: #00838F; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open E-RISE Stage</a>
                </div>
            </div>
            <div style="text-align: center; margin-top: 25px; color: #64748B; font-size: 12px;">
                &copy; E-RISE Platform. All channels encrypted with DTLS-SRTP.
            </div>
        </div>
        """
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            print(f"[+] Success! Email sent. Response:\n{res_body}")
            return True
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        print(f"[-] HTTP Error {e.code}: {err}")
        return False
    except Exception as e:
        print(f"[-] Error: {e}")
        return False

if __name__ == "__main__":
    key = RESEND_API_KEY
    if not key:
        print("[!] Warning: RESEND_API_KEY environment variable is not set.")
        print("    Usage: RESEND_API_KEY='re_...' python deploy/test-resend.py [optional-email]")
        sys.exit(1)

    target = sys.argv[1] if len(sys.argv) > 1 else TARGET_EMAIL
    send_test_email(key, target)
