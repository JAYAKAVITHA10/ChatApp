import React, { useState, useEffect, useRef } from "react";
import { Send, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAi = new GoogleGenerativeAI("AIzaSyCRuITZ1xdFLg88b7tE3SBAocobigicU7A");
const model = genAi.getGenerativeModel({ model: "gemini-1.5-pro" });

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messageEndRef = useRef(null);
  const chatSessionRef = useRef(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    if (!chatSessionRef.current) {
      startNewChatSession();
    }
  }, [messages]);

  const startNewChatSession = () => {
    chatSessionRef.current = model.startChat({
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
      history: [],
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    startNewChatSession();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setInput("");
    setIsTyping(true);

    try {
      let fullResponse = "";
      const result = await chatSessionRef.current.sendMessageStream(input);

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "", isGenerating: true },
      ]);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;

        if (chunkText.includes("image_url")) {
          const imageUrl = chunkText.split("image_url:")[1].trim();
          fullResponse += `<img src="${imageUrl}" alt="AI generated" />`;
        }

        setMessages((prev) => [
          ...prev.slice(0, -1),
          { sender: "ai", text: fullResponse, isGenerating: true },
        ]);
      }
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { sender: "ai", text: fullResponse, isGenerating: false },
      ]);
      setIsTyping(false);
    } catch (error) {
      console.error(error);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, there was an error.",
          isGenerating: false,
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-200">
      <header className="bg-blue-400 text-white p-4 flex justify-between items-center">
        <h1 className="text-4xl font-bold text-blue-800 text-center">
          Chat AI
        </h1>
        <button
          onClick={handleNewChat}
          className="p-2 rounded-full bg-white text-blue-500 hover:bg-gray-300"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="flex-grow overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.sender === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-2 mr-10 rounded-lg ${
                message.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 text-black"
              }`}
            >
              {message.sender === "user" ? (
                message.text
              ) : (
                <ReactMarkdown
                  className={`prose max-w-none ${
                    message.isGenerating ? "typing-animation" : ""
                  }`}
                  children={message.text || "Thinking..."}
                  skipHtml={true}
                />
              )}
              {message.text.includes("<img") && (
                <img
                  src={message.text.split('src="')[1].split('"')[0]}
                  alt="AI generated"
                  className="max-w-full mt-2"
                />
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="text-left">
            <div className="inline-block p-2 mr-10 rounded-lg bg-gray-300">
              Typing...
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white">
        <div className="flex items-center">
          <input
            type="text"
            className="flex-1 p-2 rounded-l-lg focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a Message..."
          />
          <button className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none">
            <Send size={24} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatApp;
