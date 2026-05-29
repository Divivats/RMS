"""
THOR Document Upload Helper — Called by C# backend.
Usage: python thor_upload.py <file_path> <api_key> <base_url>
Output: JSON to stdout
"""
import sys
import json
import requests

def upload(file_path, api_key, base_url):
    url = f"{base_url}/thor/doc/upload_document"
    try:
        with open(file_path, 'rb') as f:
            files = [('file', (file_path.split('\\')[-1].split('/')[-1], f, 'text/plain'))]
            headers = {'Authorization': api_key}
            response = requests.post(url, headers=headers, files=files)
            result = response.json()
            print(json.dumps({
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "job_id": result.get("result", {}).get("job_id", "") if isinstance(result.get("result"), dict) else "",
                "filename": result.get("result", {}).get("filename", "") if isinstance(result.get("result"), dict) else "",
                "error": result.get("result", "") if response.status_code != 200 else ""
            }))
    except Exception as e:
        print(json.dumps({"success": False, "status_code": 0, "job_id": "", "filename": "", "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "error": "Usage: python thor_upload.py <file_path> <api_key> <base_url>"}))
        sys.exit(1)
    upload(sys.argv[1], sys.argv[2], sys.argv[3])
