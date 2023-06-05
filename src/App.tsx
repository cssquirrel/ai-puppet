import React, { useEffect, useState } from "react";
import "./App.css";
// @ts-ignore
import { ReactMic } from "react-mic";

import { chat, transcribe, OpenAiChatCompletionMessage } from "./library/api";

function App() {
  const [chatHistory, setChatHistory] = useState<OpenAiChatCompletionMessage[]>(
    []
  );
  const [haveRequestedStop, setHaveRequestedStop] = useState(false);
  const [isMouthOpen, setIsMouthOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [newestBlob, setNewestBlob] = useState<Blob | null>(null);
  const [tick, setTick] = useState(0);
  const [timeToOpenMouth, setTimeToOpenMouth] = useState(0);
  const [transcribedText, setTranscribedText] = useState("");
  const name = "Data";
  let recordingTimer: any;

  useEffect(() => {
    setTimeout(() => {
      updateTick();
    }, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => {
      updateTick();
    }, 40);
    toggleIsMouthOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    /** PITA workaround to the fact that the onStop handler for ReactMic does
     * not update its reference, so can't directly call React functions in it
     * that aren't stale.
     **/
    if (newestBlob) {
      handleBlobUpdate(newestBlob); // nosonar
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestBlob]);

  const handleActivateClick = () => {
    setIsRecording(true);
    setHaveRequestedStop(false);
    startRecordingTimer();
  };

  const getAvatarImg = () => {
    return isMouthOpen
      ? "avatar/talk.png"
      : isThinking
      ? "avatar/think.png"
      : "avatar/default.png";
  };

  const handleBlobUpdate = async (blob: Blob) => {
    await transcribeRecording(blob).then(async (text) => {
      if (wasNameSpoken(text) && !isThinking) {
        await thinkUpResponse(text);
      }
    });
  };

  const handleMicData = (recordedBlob: any) => {
    // Not used at the moment.
  };

  /**
   *  This function is called periodically to trigger
   *  blob acquisition and transcription.
   * */
  const handleMicStop = (recordedBlob: any) => {
    setNewestBlob(recordedBlob.blob as Blob);
  };

  const startRecordingTimer = () => {
    recordingTimer = setTimeout(() => {
      setIsRecording(false);
    }, 2000);
  };

  const talk = async (message: OpenAiChatCompletionMessage) => {
    setIsSpeaking(true);
    const synthesis: SpeechSynthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.voice = synthesis.getVoices()[0];
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    synthesis.speak(utterance);
  };

  const toggleIsMouthOpen = () => {
    if (isSpeaking) {
      if (Date.now() >= timeToOpenMouth) {
        setIsMouthOpen(!isMouthOpen);
        setTimeToOpenMouth(Date.now() + 200);
      }
    } else {
      setIsMouthOpen(false);
    }
  };

  const thinkUpResponse = async (text: string) => {
    setIsThinking(true);
    setTranscribedText("");
    const userMessage: OpenAiChatCompletionMessage = {
      role: "user",
      content: text,
    };
    setChatHistory([...chatHistory, userMessage]);
    let messages: OpenAiChatCompletionMessage[] = [
      {
        role: "system",
        content:
          "You are Mr. Data, the android and ops officer of the USS Enterprise.",
      },
      {
        role: "user",
        content:
          "Behave as if you are Mr. Data, the android and ops officer of the USS Enterprise.",
      },
    ];
    messages = [...messages, ...chatHistory.slice(-4), userMessage];
    const response = await chat(messages);
    const { message } = response;
    setChatHistory([...chatHistory, userMessage, message]);
    setIsThinking(false);
    await talk(message);
  };

  const transcribeRecording = async (blob: Blob): Promise<string> => {
    if (!haveRequestedStop) {
      setIsRecording(true);
    }
    const transcription = await transcribe(blob);
    setTranscribedText(transcribedText + transcription);
    if (!haveRequestedStop) {
      startRecordingTimer();
    }
    return transcribedText + transcription;
  };

  const updateTick = () => {
    let newTick = tick + 1;
    if (newTick > 30) {
      newTick = 0;
    }
    setTick(newTick);
  };

  const wasNameSpoken = (text: string) => {
    const lowerCase = text.toLowerCase();
    const punctuationRegex = /[.,;:?!]/g;
    const withoutPunc = lowerCase.replace(punctuationRegex, " ");
    const words = withoutPunc.split(" ");
    for (const word of words) {
      if (word === name.toLowerCase()) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="App">
      <div className="row">
        <div className="avatar">
          <div className="mic-wrapper">
            <ReactMic
              record={isRecording}
              className="sound-wave"
              onStop={(rb: any) => {
                handleMicStop(rb);
              }}
              onData={handleMicData}
              strokeColor="#a9983d"
              backgroundColor="#000000"
            />
          </div>
          <img src={getAvatarImg()} alt="avatar" />
        </div>
        <div className="log-wrapper">
          <button
            type="button"
            onClick={handleActivateClick}
            disabled={isRecording}
          >
            {isRecording ? "Activated" : "Activate"}
          </button>
          <h4>Transcription</h4>
          <div className="transcription">{transcribedText}</div>
          <h4>Chat Log</h4>
          <ul className="log">
            {chatHistory.map((message, index) => {
              const key = message.role + index;
              return (
                <li
                  key={key}
                  className={`log-message row mb-2 ${
                    message.role === "user" ? "text-user" : "text-bot"
                  }`}
                >
                  <b>{message.role === "user" ? "You:" : `${name}: `}</b>
                  <span>{message.content}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
