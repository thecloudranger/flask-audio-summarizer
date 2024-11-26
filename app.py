from flask import Flask, render_template, request, jsonify, send_file
import boto3
import sounddevice as sd
import numpy as np
import wave
import tempfile
import os
from datetime import datetime
from botocore.exceptions import ClientError
import threading
import queue
import json

app = Flask(__name__)


# Initialize AWS client
def init_aws_client():
    return boto3.client("s3")


def get_s3_presigned_url(bucket, key, expiration=3600):
    """Generate a presigned URL for the S3 object"""
    s3_client = init_aws_client()
    try:
        response = s3_client.generate_presigned_url(
            "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expiration
        )
    except ClientError as e:
        return None
    return response


def list_s3_files(bucket, prefix, file_extension=None):
    """List files in S3 bucket with given prefix and optional file extension filter"""
    s3_client = init_aws_client()
    try:
        response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        if "Contents" in response:
            files = [item["Key"] for item in response["Contents"]]
            if file_extension:
                files = [f for f in files if f.lower().endswith(file_extension.lower())]
            return files
        return []
    except ClientError:
        return []


def read_text_file(bucket, key):
    """Read text file content from S3"""
    s3_client = init_aws_client()
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read().decode("utf-8")
    except ClientError:
        return None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/list_files", methods=["POST"])
def list_files():
    data = request.get_json()
    bucket = data.get("bucket")

    if not bucket:
        return jsonify({"error": "No bucket specified"}), 400

    audio_files = list_s3_files(bucket, "source/")
    transcripts = list_s3_files(bucket, "transcription/", ".txt")
    summaries = list_s3_files(bucket, "processed/")

    return jsonify(
        {
            "audio_files": [os.path.basename(f) for f in audio_files if f != "source/"],
            "transcripts": [
                os.path.basename(f) for f in transcripts if f != "transcription/"
            ],
            "summaries": [os.path.basename(f) for f in summaries if f != "processed/"],
        }
    )


@app.route("/get_content", methods=["POST"])
def get_content():
    data = request.get_json()
    bucket = data.get("bucket")
    file_type = data.get("type")
    filename = data.get("filename")

    if not all([bucket, file_type, filename]):
        return jsonify({"error": "Missing parameters"}), 400

    if file_type == "audio":
        url = get_s3_presigned_url(bucket, f"source/{filename}")
        return jsonify({"url": url})
    elif file_type in ["transcript", "summary"]:
        prefix = "transcription/" if file_type == "transcript" else "processed/"
        content = read_text_file(bucket, f"{prefix}{filename}")
        return jsonify({"content": content})

    return jsonify({"error": "Invalid file type"}), 400


@app.route("/start_recording", methods=["POST"])
def start_recording():
    data = request.get_json()
    bucket = data.get("bucket")
    duration = int(data.get("duration", 60))

    if not bucket:
        return jsonify({"error": "No bucket specified"}), 400

    try:
        recording = sd.rec(
            int(duration * 44100), samplerate=44100, channels=1, dtype="int16"
        )
        sd.wait()

        # Save to temporary WAV file
        temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        with wave.open(temp_wav.name, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(44100)
            wf.writeframes(recording.tobytes())

        # Upload to S3
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"source/recording_{timestamp}.wav"
        s3_client = init_aws_client()
        s3_client.upload_file(temp_wav.name, bucket, s3_key)

        # Clean up
        os.unlink(temp_wav.name)

        return jsonify({"success": True, "filename": f"recording_{timestamp}.wav"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
