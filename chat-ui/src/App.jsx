import { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("1");
  const [joined, setJoined] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const ws = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8080/rooms")
      .then((res) => res.json())
      .then((rooms) => setRooms(rooms || []));
  }, []);

const createRoom = async () => {
  if (!newRoomName) return;

  const newRoom = {
    id: Date.now().toString(),
    name: newRoomName,
  };

  await fetch("http://127.0.0.1:8080/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newRoom),
  });

  setRooms((prev) => [...prev, newRoom]);
  setNewRoomName("");
};

// ---------- LOAD MORE MESSAGES (PAGINATION) ----------
const loadMoreMessages = async () => {
  if (loading || !hasMore) return;
  setLoading(true);

  try {
    const res = await fetch(
      `http://localhost:8080/rooms/${roomId}/messages?limit=20&offset=${offset}`
    );
    const data = await res.json();
    const newMessages = data.messages || [];

    if (newMessages.length === 0) {
      setHasMore(false);
    } else {
      setMessages((prev) => [...newMessages, ...prev]);
      setOffset((prev) => prev + 20);
    }
  } catch (error) {
    console.error("Error loading messages:", error);
  }
  setLoading(false);
};



  // ---------- JOIN CHAT ----------
  const joinChat = async () => {
    try {
      // fetch old messages
      const res = await fetch(
        `http://localhost:8080/rooms/${roomId}/messages?limit=20&offset=0`
      );
      const data = await res.json();
      setMessages(data.messages || []);
      setOffset(20);
      setHasMore(data.total > 20);

      // connect websocket
      ws.current = new WebSocket("ws://localhost:8080/ws");

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      };

      setJoined(true);
    } catch (error) {
      console.error("Error joining chat:", error);
    }
  };

  // ---------- SEND MESSAGE ----------
  const sendMessage = async () => {
    if (!message.trim() && !file) return;

    let fileUrl = "";
    let fileName = "";

    // Upload file if present
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://localhost:8080/upload", {
          method: "POST",
          body: formData,
        });
        const fileData = await res.json();
        fileUrl = fileData.url;
        fileName = fileData.fileName;
      } catch (error) {
        console.error("Error uploading file:", error);
        return;
      }
    }

    const msg = {
      roomId,
      username,
      text: message,
      fileUrl,
      fileName,
      timestamp: new Date().toISOString(),
      emojis: {},
    };

    ws.current.send(JSON.stringify(msg));
    setMessage("");
    setFile(null);
  };

  // ---------- DELETE MESSAGE ----------
  const deleteMsg = async (msgId) => {
    try {
      await fetch(
        `http://localhost:8080/rooms/${roomId}/messages/${msgId}`,
        { method: "DELETE" }
      );
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // ---------- ADD EMOJI REACTION ----------
  const addEmojiReaction = async (msgId, emoji) => {
    try {
      await fetch(`http://localhost:8080/messages/${msgId}/emoji`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, username }),
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) {
            if (!m.emojis) m.emojis = {};
            if (!m.emojis[emoji]) m.emojis[emoji] = [];
            if (!m.emojis[emoji].includes(username)) {
              m.emojis[emoji] = [...m.emojis[emoji], username];
            }
          }
          return m;
        })
      );
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Error adding emoji:", error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ---------- LOGIN SCREEN ----------
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm space-y-4">
          <h2 className="text-3xl font-bold text-center text-gray-800">
            GoChat
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Join a conversation
          </p>

          <input
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinChat()}
          />

          <button
            onClick={joinChat}
            disabled={!username}
            className="bg-blue-600 text-white w-full py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  // ---------- CHAT UI ----------
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[85vh]">
        {/* HEADER */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-2xl">
          <h1 className="text-xl font-bold">
            {rooms.find((r) => r.id === roomId)?.name || "General"}
          </h1>
          <p className="text-sm opacity-90">Logged in as {username}</p>
        </div>

        {/* MESSAGES SECTION */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        >
          {hasMore && messages.length > 0 && (
            <div className="flex justify-center py-3">
              <button
                onClick={loadMoreMessages}
                disabled={loading}
                className="text-blue-600 text-sm hover:underline disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load older messages"}
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">
              No messages yet. Start the conversation!
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.username === username ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-2xl shadow text-sm relative group ${
                  m.username === username
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {/* Timestamp */}
                <div
                  className={`text-xs ${
                    m.username === username
                      ? "opacity-70"
                      : "text-gray-600 opacity-70"
                  }`}
                >
                  {formatTime(m.timestamp)}
                </div>

                {/* Username */}
                <div className="font-bold text-xs mb-1">{m.username}</div>

                {/* File Attachment */}
                {m.fileUrl && (
                  <div className="mb-2 p-2 bg-gray-100 rounded">
                    <a
                      href={`http://localhost:8080${m.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs break-all"
                    >
                      📎 {m.fileName}
                    </a>
                  </div>
                )}

                {/* Message Text */}
                <div>{m.text}</div>

                {/* Emoji Reactions */}
                {m.emojis && Object.keys(m.emojis).length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {Object.entries(m.emojis).map(([emoji, users]) => (
                      <span
                        key={emoji}
                        className="bg-gray-300 bg-opacity-50 px-2 py-1 rounded text-xs cursor-pointer hover:bg-opacity-70 transition"
                        title={users.join(", ")}
                      >
                        {emoji} {users.length}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons (show on hover) */}
                {m.username === username && (
                  <div className="absolute -top-8 right-0 gap-1 hidden group-hover:flex bg-gray-800 rounded p-1">
                    <button
                      onClick={() => deleteMsg(m.id)}
                      className="text-red-400 hover:text-red-600 text-sm px-2 py-1"
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  </div>
                )}

                {/* Emoji Picker Button */}
                <div className="absolute -top-8 left-0 gap-1 hidden group-hover:flex bg-gray-800 rounded p-1">
                  <button
                    onClick={() =>
                      setSelectedMsgId(
                        selectedMsgId === m.id ? null : m.id
                      )
                    }
                    className="text-yellow-400 hover:text-yellow-600 text-sm px-2 py-1"
                    title="Add emoji reaction"
                  >
                    😊
                  </button>
                </div>

                {/* Emoji Picker Dropdown */}
                {selectedMsgId === m.id && (
                  <div className="absolute top-full left-0 z-50 mt-2">
                    <EmojiPicker
                      onEmojiClick={(emojiObj) =>
                        addEmojiReaction(m.id, emojiObj.emoji)
                      }
                      height={300}
                      width={320}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CREATE ROOM SECTION */}
        <div className="p-3 border-t bg-gray-100">
          <div className="flex gap-2 mb-3">
            <input
              className="border border-gray-300 p-2 rounded flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Room name..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
            />
            <button
              onClick={createRoom}
              className="bg-purple-600 text-white px-4 rounded hover:bg-purple-700 font-semibold text-sm"
            >
              Create Room
            </button>
          </div>

          {/* ROOM SELECTOR */}
          <div className="mb-3">
            <select
              className="border border-gray-300 p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setMessages([]);
                setOffset(0);
                setHasMore(true);
              }}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MESSAGE INPUT */}
        <div className="p-3 border-t bg-white rounded-b-2xl">
          <div className="flex gap-2 mb-2">
            <input
              className="border border-gray-300 flex-1 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            {/* FILE UPLOAD */}
            <label className="bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 cursor-pointer font-semibold text-sm">
              📎
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            {/* EMOJI BUTTON */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-yellow-500 text-white px-4 py-3 rounded-lg hover:bg-yellow-600 font-semibold text-sm"
            >
              😊
            </button>

            <button
              onClick={sendMessage}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold text-sm"
            >
              Send
            </button>
          </div>

          {/* Display selected file */}
          {file && (
            <div className="text-sm text-gray-600 flex justify-between items-center">
              📁 {file.name}
              <button
                onClick={() => setFile(null)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Inline Emoji Picker */}
          {showEmojiPicker && (
            <div className="mt-3 flex justify-center">
              <EmojiPicker
                onEmojiClick={(emojiObj) => {
                  setMessage(message + emojiObj.emoji);
                  setShowEmojiPicker(false);
                }}
                height={300}
                width={320}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default App;
