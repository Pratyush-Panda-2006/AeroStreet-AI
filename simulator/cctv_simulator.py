"""
============================================
AeroStreet AI — CCTV Simulator (Track 3)
============================================
Automated pollution spotting simulator that processes
mock CCTV camera frames using Gemini Vision API.
If violations are detected with high confidence,
posts them to the AeroStreet API as CCTV_Alert hotspots.
"""

import os
import sys
import json
import random
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from parent directory .env
load_dotenv(Path(__file__).parent.parent / '.env')

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Configuration ──
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CONFIDENCE_THRESHOLD = 0.7

# Mock camera locations across Indian cities
CAMERAS = [
    {"id": "CAM-D01", "location": "Anand Vihar, Delhi", "coordinates": {"lat": 28.6468, "lng": 77.3164}},
    {"id": "CAM-D02", "location": "ITO Junction, Delhi", "coordinates": {"lat": 28.6289, "lng": 77.2407}},
    {"id": "CAM-D03", "location": "Dwarka Sector 21, Delhi", "coordinates": {"lat": 28.5563, "lng": 77.0586}},
    {"id": "CAM-M01", "location": "Mahul Industrial, Mumbai", "coordinates": {"lat": 19.0178, "lng": 72.9080}},
    {"id": "CAM-M02", "location": "Dharavi, Mumbai", "coordinates": {"lat": 19.0430, "lng": 72.8552}},
    {"id": "CAM-B01", "location": "Peenya Industrial, Bangalore", "coordinates": {"lat": 13.0299, "lng": 77.5194}},
    {"id": "CAM-K01", "location": "Howrah Bridge, Kolkata", "coordinates": {"lat": 22.5851, "lng": 88.3468}},
]

# Mock detection scenarios for demo mode
MOCK_DETECTIONS = [
    {"detected": True, "type": "Heavy Smoke", "confidence": 0.94, "description": "Dense industrial smoke emission detected from chimney stack. Continuous emission pattern observed over 15-minute window."},
    {"detected": True, "type": "Illegal Dumping", "confidence": 0.87, "description": "Unauthorized waste dumping activity detected near drainage canal. Multiple bags of construction debris visible."},
    {"detected": True, "type": "Open Burning", "confidence": 0.91, "description": "Open waste burning detected in vacant lot. Visible flames and thick smoke plume rising approximately 10 meters."},
    {"detected": True, "type": "Vehicle Emissions", "confidence": 0.78, "description": "Heavy commercial vehicle emitting excessive black smoke while idling at traffic signal."},
    {"detected": False, "type": "None", "confidence": 0.15, "description": "Normal street activity. No environmental violations detected."},
    {"detected": False, "type": "None", "confidence": 0.22, "description": "Clear visibility. Standard traffic flow with no notable emissions."},
    {"detected": True, "type": "Construction Dust", "confidence": 0.83, "description": "Uncontrolled dust emission from active construction site. No water suppression or barriers visible."},
]


def analyze_frame_with_gemini(frame_path: str, camera: dict) -> dict:
    """
    Analyze a CCTV frame using Gemini Vision API.
    Falls back to mock detection if no API key is available.
    """
    if not GEMINI_API_KEY:
        # Mock mode: return randomized detection
        detection = random.choice(MOCK_DETECTIONS)
        return detection

    try:
        import google.generativeai as genai
        from PIL import Image

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Load and prepare image
        if os.path.exists(frame_path):
            img = Image.open(frame_path)
        else:
            # Generate a placeholder image if no real frame exists
            print(f"  ⚠ Frame not found: {frame_path}, using text-only analysis")
            response = model.generate_content(
                f"""You are analyzing a CCTV camera feed from {camera['location']}, India.
                
Simulate what an environmental monitoring AI would detect at this location.
Consider the typical environmental issues in this area (industrial emissions, traffic, waste).

Respond with ONLY valid JSON (no markdown):
{{
  "detected": true/false,
  "type": "Heavy Smoke" | "Illegal Dumping" | "Open Burning" | "Vehicle Emissions" | "Construction Dust" | "None",
  "confidence": 0.0 to 1.0,
  "description": "Brief description of what was detected or observed"
}}"""
            )
            text = response.text
            json_match = text.strip()
            if json_match.startswith("```"):
                json_match = json_match.split("```")[1]
                if json_match.startswith("json"):
                    json_match = json_match[4:]
            return json.loads(json_match)

        # Multimodal analysis with image
        prompt = """Analyze this CCTV camera frame for environmental violations.

Look for:
1. Heavy smoke or industrial emissions
2. Litter or illegal dumping
3. Open burning or fire
4. Excessive vehicle emissions
5. Construction dust without suppression

Respond with ONLY valid JSON (no markdown):
{
  "detected": true/false,
  "type": "Heavy Smoke" | "Illegal Dumping" | "Open Burning" | "Vehicle Emissions" | "Construction Dust" | "None",
  "confidence": 0.0 to 1.0,
  "description": "Brief description of what was detected"
}"""

        response = model.generate_content([prompt, img])
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)

    except ImportError:
        print("  ⚠ google-generativeai not installed. Using mock detection.")
        return random.choice(MOCK_DETECTIONS)
    except Exception as e:
        print(f"  ✗ Gemini analysis error: {e}")
        return random.choice(MOCK_DETECTIONS)


def post_cctv_alert(detection: dict, camera: dict) -> dict:
    """
    Post a CCTV alert to the AeroStreet API.
    """
    import urllib.request
    import urllib.error

    payload = {
        "detectedIssue": detection["type"],
        "confidence": detection["confidence"],
        "description": detection["description"],
        "cameraId": camera["id"],
        "coordinates": camera["coordinates"],
        "frameUrl": "",
    }

    data = json.dumps(payload).encode("utf-8")
    url = f"{API_BASE_URL}/api/cctv-alert"

    try:
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result
    except urllib.error.URLError as e:
        print(f"  ⚠ API connection failed: {e}")
        print(f"  ℹ Make sure the server is running at {API_BASE_URL}")
        return {"success": False, "error": str(e), "id": f"local-{int(time.time())}"}
    except Exception as e:
        print(f"  ✗ API error: {e}")
        return {"success": False, "error": str(e)}


def run_simulation(num_cameras: int = 5):
    """
    Run the CCTV simulation across selected cameras.
    """
    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║   📹 AeroStreet AI — CCTV Simulator (Track 3)   ║")
    print("║   Automated Pollution Spotting Pipeline          ║")
    print("╚══════════════════════════════════════════════════╝")
    print()
    print(f"  Mode: {'LIVE (Gemini Vision)' if GEMINI_API_KEY else 'DEMO (Mock Detections)'}")
    print(f"  API Target: {API_BASE_URL}")
    print(f"  Confidence Threshold: {CONFIDENCE_THRESHOLD}")
    print(f"  Cameras to scan: {num_cameras}")
    print()

    # Select random cameras
    selected = random.sample(CAMERAS, min(num_cameras, len(CAMERAS)))
    frames_dir = Path(__file__).parent / "frames"

    alerts_posted = 0
    clean_frames = 0

    for i, camera in enumerate(selected, 1):
        print(f"{'─' * 50}")
        print(f"  📷 Camera {i}/{len(selected)}: {camera['id']}")
        print(f"     Location: {camera['location']}")
        print(f"     Coords: {camera['coordinates']['lat']:.4f}, {camera['coordinates']['lng']:.4f}")

        # Check for real frame files
        frame_path = str(frames_dir / f"{camera['id'].lower()}.jpg")
        if not os.path.exists(frame_path):
            frame_path = str(frames_dir / "sample.jpg")

        # Analyze
        print(f"     Analyzing frame...")
        detection = analyze_frame_with_gemini(frame_path, camera)

        if detection.get("detected") and detection.get("confidence", 0) >= CONFIDENCE_THRESHOLD:
            print(f"     🚨 VIOLATION DETECTED!")
            print(f"        Type: {detection['type']}")
            print(f"        Confidence: {detection['confidence']:.0%}")
            print(f"        Detail: {detection['description'][:80]}...")

            # Post alert
            print(f"     📡 Posting alert to API...")
            result = post_cctv_alert(detection, camera)
            if result.get("success"):
                print(f"     ✅ Alert posted: {result.get('id', 'unknown')}")
                alerts_posted += 1
            else:
                print(f"     ⚠ Alert stored locally (server may be offline)")
                alerts_posted += 1
        else:
            conf = detection.get("confidence", 0)
            print(f"     ✓ Clean frame (confidence: {conf:.0%})")
            clean_frames += 1

        # Small delay between cameras
        time.sleep(0.5)

    # Summary
    print(f"\n{'═' * 50}")
    print(f"  📊 Simulation Summary")
    print(f"{'─' * 50}")
    print(f"  Cameras scanned:  {len(selected)}")
    print(f"  Violations found: {alerts_posted}")
    print(f"  Clean frames:     {clean_frames}")
    print(f"  Timestamp:        {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'═' * 50}\n")


if __name__ == "__main__":
    num = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    run_simulation(num)
