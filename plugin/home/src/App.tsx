import { FiSearch } from "react-icons/fi";
import { useEffect, useState } from "react";
import { GenerateTheme } from "deweb-pages/src/hooks/GenerateTheme";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [port, setPort] = useState("");

  // On mount, get the port from the API by hitting /port
  useEffect(() => {
    const url = window.location.href.endsWith("/")
      ? window.location.href
      : `${window.location.href}/`;

    fetch(`${url}port`)
      .then((res) => res.text())
      .then((port) => setPort(port));
  }, []);

  // Redirect the user to the requested website.
  // If the user is on `station.massa`..., we redirect to localhost:{port}
  // Otherwise, we redirect to {searchQuery}.{host} (very likely dev mode)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const { host } = new URL(window.location.href);
    if (host === "station.massa") {
      // We have to force http because the plugin has a random localhost address and port
      const redirectUrl = `http://${searchQuery}.localhost:${port}`;
      window.location.href = redirectUrl;
    } else {
      const redirectUrl = `//${searchQuery}.${host}`;
      window.location.href = redirectUrl;
    }
  };

  const theme = GenerateTheme();

  return (
    <div
      className={`${theme} bg-primary text-secondary flex flex-col items-center justify-center min-h-screen text-center gap-8`}
    >
      <h1 className="paragraph-lg text-6xl max-w-2xl">Search on DeWeb</h1>
      <form
        onSubmit={handleSearch}
        className="flex items-center overflow-hidden w-1/3 bg-secondary"
      >
        <FiSearch className="text-primary ml-3 text-2xl" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 text-primary w-full bg-secondary outline-none placeholder-primary"
          placeholder="Enter domain"
        />
        <span className="mr-3 text-primary">.massa</span>
      </form>
    </div>
  );
}
