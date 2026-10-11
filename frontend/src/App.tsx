import { useEffect, useState } from "react";

function App() {
  const [apiStatus, setApiStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => res.json())
      .then((data) => setApiStatus(JSON.stringify(data)))
      .catch(() => setApiStatus("API unreachable"));
  }, []);

  return (
    <div className="container">
      <h1>E-Commerce Platform</h1>
      <p>Backend API status: <code>{apiStatus}</code></p>
    </div>
  );
}

export default App;