from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from TTS.api import TTS


import flask
import openai
import os
import tempfile
import whisper

load_dotenv()
app = flask.Flask(__name__)
CORS(app)

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL")
openai.api_key = OPENAI_API_KEY

POST_ONLY_ERROR = "This endpoint only processes POST requests"

# --------------------------------------------------------------------------- #
# ----------------------------- API Endpoints ------------------------------- #
# --------------------------------------------------------------------------- #

@app.route("/chat", methods=["POST"])
def chat():
    if request.method == "POST":
        data = request.get_json()
        messages = data["messages"]
        temperature = data["temperature"]
        frequency_penalty = data["frequency_penalty"]
        presence_penalty = data["presence_penalty"]
        max_tokens = data["max_tokens"]
        response = openai.ChatCompletion.create(
            model=OPENAI_CHAT_MODEL, messages=messages, temperature=temperature, frequency_penalty=frequency_penalty, presence_penalty=presence_penalty, max_tokens=max_tokens
        )
        return response
    else:
        return POST_ONLY_ERROR

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if request.method == "POST":
        language = request.form["language"]
        model = request.form["model_size"]

        # there are no english models for large
        if model != "large" and language == "english":
            model = model + ".en"
        audio_model = whisper.load_model(model)

        temp_dir = tempfile.mkdtemp()
        save_path = os.path.join(temp_dir, "temp.wav")

        wav_file = request.files["audio_data"]
        wav_file.save(save_path)

        if language == "english":
            result = audio_model.transcribe(save_path, language="english")
        else:
            result = audio_model.transcribe(save_path)

        return result["text"]
    else:
        return "This endpoint only processes POST wav blob"

