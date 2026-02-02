import { useState, useEffect, useRef } from "react";

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("1");
  const [joined, setJoined] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  


  const ws = useRef(null);
  useEffect(() => {
  fetch("http://127.0.0.1:8080/rooms")
    .then((res) => res.json())
    .then(setRooms);
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



  // ---------- JOIN CHAT ----------
  const joinChat = async () => {
    // fetch old messages
    const res = await fetch(`http://localhost:8080/rooms/${roomId}/messages`);
    const history = await res.json();
    setMessages(history || []);
;

    // connect websocket
    ws.current = new WebSocket("ws://localhost:8080/ws");

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    setJoined(true);
  };

  // ---------- SEND MESSAGE ----------
  const sendMessage = () => {
    const msg = {
      roomId,
      username,
      text: message,
    };

    ws.current.send(JSON.stringify(msg));
    setMessage("");
  };

  // ---------- LOGIN SCREEN ----------
  if (!joined) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center p-6">

      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm space-y-4">

        <h2 className="text-xl font-bold text-center">Join Chat</h2>

        <input
          className="border p-2 w-full rounded"
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          onClick={joinChat}
          className="bg-blue-600 text-white w-full py-2 rounded-lg hover:bg-blue-700"
        >
          Join
        </button>

      </div>

    </div>
  );
}

  // ---------- CHAT UI ----------
 return (
  <div className="min-h-screen bg-gray-100 flex justify-center p-6">
    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg flex flex-col h-[80vh]">

      {/* HEADER */}
      <div className="p-4 border-b font-semibold">
        Room: {rooms.find(r => r.id === roomId)?.name}
      </div>

      {/* ✅ MESSAGES SECTION */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {(messages || []).map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.username === username ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-2xl shadow text-sm ${
                m.username === username
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              <div className="text-xs opacity-70">{m.time}</div>
              <b>{m.username}</b>: {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE ROOM */}
      <div className="p-3 border-t flex gap-2">
        <input
          className="border p-2 rounded flex-1"
          placeholder="New room name..."
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
        <button
          onClick={createRoom}
          className="bg-blue-600 text-white px-3 rounded"
        >
          Create
        </button>
      </div>

      {/* MESSAGE INPUT */}
      <div className="p-3 border-t flex gap-2">
        <input
          className="border flex-1 p-2 rounded"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <select
          className="border p-2 rounded"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <button
          onClick={sendMessage}
          className="bg-green-600 text-white px-4 rounded"
        >
          Send
        </button>
      </div>

    </div>
  </div>
);

}

export default App;
